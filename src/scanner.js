/**
 * skill-match — project scanner.
 *
 * Read-only: walks a project directory and extracts the signals the
 * matcher needs (languages, dependencies, frameworks, config files,
 * media files, README keywords). Never writes anything.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MAX_FILES = 20000;
const MAX_READ_BYTES = 200 * 1024; // 200 KB cap per text file read

// Directories never descended into (except the whitelisted hidden ones).
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'vendor',
  '__pycache__', '.venv', 'venv', 'target', '.idea', '.turbo', '.cache',
  '.svn', '.hg', '.DS_Store', 'out', '.output', '.vercel', '.serverless',
]);

// Hidden directories we DO descend into (they hold signals).
const KEEP_HIDDEN_DIRS = new Set(['.github', '.claude', '.cursor', '.circleci']);

const EXT_TO_LANGUAGE = {
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript', '.jsx': 'javascript',
  '.ts': 'typescript', '.mts': 'typescript', '.cts': 'typescript', '.tsx': 'typescript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.h': 'cpp', '.hpp': 'cpp',
  '.swift': 'swift',
  '.kt': 'kotlin', '.kts': 'kotlin',
  '.html': 'web', '.css': 'web', '.scss': 'web', '.less': 'web',
  '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell',
  '.sql': 'sql',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.dart': 'dart',
  '.lua': 'lua',
  '.pl': 'perl',
  '.r': 'r',
};

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi']);
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.flac', '.ogg', '.m4a']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);

// npm / python package name -> framework id.
const DEP_TO_FRAMEWORK = {
  react: 'react',
  next: 'nextjs',
  vue: 'vue',
  nuxt: 'nuxt',
  svelte: 'svelte',
  '@angular/core': 'angular',
  express: 'express',
  fastify: 'fastify',
  '@nestjs/core': 'nestjs',
  electron: 'electron',
  'react-native': 'react-native',
  expo: 'expo',
  '@capacitor/core': 'capacitor',
  '@playwright/test': 'playwright',
  playwright: 'playwright',
  jest: 'jest',
  vitest: 'vitest',
  tailwindcss: 'tailwind',
  '@prisma/client': 'prisma',
  prisma: 'prisma',
  django: 'django',
  flask: 'flask',
  fastapi: 'fastapi',
  rails: 'rails',
  laravel: 'laravel',
  spring: 'spring',
  flutter: 'flutter',
  astro: 'astro',
  gatsby: 'gatsby',
  remix: 'remix',
  '@remix-run/node': 'remix',
};

function readTextCapped(file, maxBytes = MAX_READ_BYTES) {
  try {
    const stat = fs.statSync(file);
    if (stat.size > maxBytes) {
      const fd = fs.openSync(file, 'r');
      const buf = Buffer.alloc(maxBytes);
      fs.readSync(fd, buf, 0, maxBytes, 0);
      fs.closeSync(fd);
      return buf.toString('utf8');
    }
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function parsePackageJson(file) {
  const out = { deps: [], scripts: [], name: '', description: '', keywords: [], hasBin: false, workspaces: false };
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    const all = Object.assign({}, pkg.dependencies, pkg.devDependencies, pkg.peerDependencies);
    out.deps = Object.keys(all).map((d) => d.toLowerCase());
    out.scripts = pkg.scripts ? Object.keys(pkg.scripts) : [];
    out.name = typeof pkg.name === 'string' ? pkg.name : '';
    out.description = typeof pkg.description === 'string' ? pkg.description : '';
    out.keywords = Array.isArray(pkg.keywords) ? pkg.keywords.map(String) : [];
    out.hasBin = Boolean(pkg.bin);
    out.workspaces = Boolean(pkg.workspaces);
  } catch {
    // Unparseable package.json: treat as absent.
  }
  return out;
}

function parseRequirements(file) {
  const deps = [];
  const text = readTextCapped(file);
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^([A-Za-z0-9_.-]+)/);
    if (m && !line.trim().startsWith('#') && !line.trim().startsWith('-')) {
      deps.push(m[1].toLowerCase());
    }
  }
  return deps;
}

function parsePyproject(file) {
  const deps = [];
  const text = readTextCapped(file);
  const block = text.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
  if (block) {
    for (const m of block[1].matchAll(/["']([A-Za-z0-9_.-]+)/g)) {
      deps.push(m[1].toLowerCase());
    }
  }
  return deps;
}

/**
 * Scan a project directory. Returns the signals object.
 * Throws an Error with a plain message when the directory is unusable.
 */
function scanProject(dir) {
  const root = path.resolve(dir);
  let stat;
  try {
    stat = fs.statSync(root);
  } catch {
    throw new Error(`directory not found: ${dir}`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`not a directory: ${dir}`);
  }

  const languages = {};
  const files = []; // relative paths, capped
  const deps = new Set();
  const scripts = new Set();
  const media = { video: 0, audio: 0, image: 0 };
  let hasCode = false;
  let totalFiles = 0;
  let pkgMeta = { name: '', description: '', keywords: [] };
  let hasBin = false;
  let isMonorepo = false;
  let packageManager = null;
  let readmeText = '';

  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = path.relative(root, full).split(path.sep).join('/');
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.') && !KEEP_HIDDEN_DIRS.has(entry.name)) continue;
        queue.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      totalFiles += 1;
      if (totalFiles > MAX_FILES) continue;
      if (files.length < MAX_FILES) files.push(rel);

      const ext = path.extname(entry.name).toLowerCase();
      const lang = EXT_TO_LANGUAGE[ext];
      if (lang) {
        languages[lang] = (languages[lang] || 0) + 1;
        if (lang !== 'web') hasCode = true;
      }
      if (VIDEO_EXTS.has(ext)) media.video += 1;
      if (AUDIO_EXTS.has(ext)) media.audio += 1;
      if (IMAGE_EXTS.has(ext)) media.image += 1;
    }
  }

  const fileSet = new Set(files);
  const hasFile = (name) => {
    if (fileSet.has(name)) return true;
    for (const f of files) {
      if (path.posix.basename(f) === name) return true;
    }
    return false;
  };
  const hasDir = (name) => files.some((f) => f.startsWith(`${name}/`));

  // package.json
  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = parsePackageJson(pkgPath);
    pkg.deps.forEach((d) => deps.add(d));
    pkg.scripts.forEach((s) => scripts.add(s));
    pkgMeta = { name: pkg.name, description: pkg.description, keywords: pkg.keywords };
    hasBin = pkg.hasBin;
    isMonorepo = pkg.workspaces;
    if (hasFile('package-lock.json')) packageManager = 'npm';
    else if (hasFile('yarn.lock')) packageManager = 'yarn';
    else if (hasFile('pnpm-lock.yaml')) packageManager = 'pnpm';
    else if (hasFile('bun.lockb') || hasFile('bun.lock')) packageManager = 'bun';
  }

  // Python deps
  const reqPath = path.join(root, 'requirements.txt');
  if (fs.existsSync(reqPath)) parseRequirements(reqPath).forEach((d) => deps.add(d));
  const pyprojectPath = path.join(root, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) parsePyproject(pyprojectPath).forEach((d) => deps.add(d));

  // Monorepo markers
  if (hasFile('lerna.json') || hasFile('pnpm-workspace.yaml')) isMonorepo = true;

  // README text for keyword matching
  const readmeName = ['README.md', 'readme.md', 'README.txt', 'README'].find((n) => fs.existsSync(path.join(root, n)));
  if (readmeName) readmeText = readTextCapped(path.join(root, readmeName), 12000);

  // Frameworks from deps
  const frameworks = new Set();
  for (const dep of deps) {
    const fw = DEP_TO_FRAMEWORK[dep];
    if (fw) frameworks.add(fw);
  }

  // CI detection
  const hasCI =
    hasDir('.github/workflows') ||
    hasFile('.gitlab-ci.yml') ||
    hasFile('Jenkinsfile') ||
    hasDir('.circleci') ||
    hasFile('azure-pipelines.yml');

  // Tests detection
  const hasTests =
    scripts.has('test') ||
    files.some((f) => /(^|\/)(__tests__|tests?|test|spec)\//.test(f) || /\.test\.[a-z]+$/.test(f) || /\.spec\.[a-z]+$/.test(f));

  const hasLint =
    scripts.has('lint') ||
    hasFile('.eslintrc.json') || hasFile('.eslintrc.js') || hasFile('eslint.config.js') ||
    hasFile('.prettierrc') || hasFile('prettier.config.js');

  const hasDockerfile = hasFile('Dockerfile') || hasFile('docker-compose.yml') || hasFile('docker-compose.yaml');
  const hasSkillsDir = hasDir('.claude/skills') || fs.existsSync(path.join(root, '.claude', 'skills'));

  const text = [
    readmeText,
    pkgMeta.name,
    pkgMeta.description,
    pkgMeta.keywords.join(' '),
  ].join('\n').toLowerCase();

  return {
    root,
    totalFiles,
    hasCode,
    languages,
    deps: [...deps].sort(),
    scripts: [...scripts].sort(),
    frameworks: [...frameworks].sort(),
    files,
    media,
    hasCI,
    hasTests,
    hasLint,
    hasBin,
    hasDockerfile,
    hasSkillsDir,
    isMonorepo,
    packageManager,
    text,
  };
}

module.exports = { scanProject, EXT_TO_LANGUAGE, DEP_TO_FRAMEWORK };
