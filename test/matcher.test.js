/**
 * Tests for skill-match: catalog validity, scanner, matcher.
 * Zero dependencies — node:test + node:assert.
 * Run: npm test
 */

'use strict';

const assert = require('node:assert');
const { describe, it, before, after } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { CATALOG, KNOWN_TRIGGER_KEYS } = require('../src/catalog');
const { scanProject } = require('../src/scanner');
const { matchSkills, scoreSkill, MIN_SCORE } = require('../src/matcher');

const tmpDirs = [];

function makeProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-match-test-'));
  tmpDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

function snapshot(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else out.push(path.relative(dir, full));
    }
  };
  walk(dir);
  return out.sort();
}

after(() => {
  for (const d of tmpDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

const REACT_PROJECT = {
  'package.json': JSON.stringify({
    name: 'my-frontend-app',
    description: 'A frontend UI design app with performance in mind',
    scripts: { dev: 'vite', build: 'vite build', test: 'vitest', lint: 'eslint .' },
    dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0', next: '^15.0.0' },
    devDependencies: { typescript: '^5.0.0', vite: '^6.0.0', '@playwright/test': '^1.0.0', tailwindcss: '^4.0.0' },
  }),
  'tsconfig.json': '{}',
  'vite.config.ts': 'export default {}',
  'src/App.tsx': 'export default function App() { return null; }',
  'src/main.tsx': "import App from './App';",
  '.github/workflows/ci.yml': 'name: CI\non: [push]\n',
  Dockerfile: 'FROM node:20\n',
  'README.md': '# My Frontend App\nA frontend UI design app focused on performance.\n',
};

const VIDEO_PROJECT = {
  'package.json': JSON.stringify({
    name: 'clip-tool',
    description: 'A video clipping tool for tiktok short videos',
    scripts: { convert: 'node convert.js' },
    dependencies: { 'fluent-ffmpeg': '^2.1.0' },
  }),
  'clips/intro.mp4': 'fake-video-bytes',
  'clips/outro.mov': 'fake-video-bytes',
  'audio/theme.mp3': 'fake-audio-bytes',
  'README.md': '# Clip Tool\nVideo clipping for tiktok short videos.\n',
};

const PYTHON_PROJECT = {
  'pyproject.toml': '[project]\nname = "api-service"\ndependencies = ["fastapi", "uvicorn"]\n',
  'app/main.py': 'from fastapi import FastAPI\napp = FastAPI()\n',
  'app/models.py': 'class Item: pass\n',
  'README.md': '# API Service\nA fastapi service.\n',
};

const CLI_PROJECT = {
  'package.json': JSON.stringify({
    name: 'mytool',
    description: 'A command line tool for developers',
    bin: { mytool: './bin/mytool.js' },
    scripts: { test: 'node --test' },
  }),
  'bin/mytool.js': '#!/usr/bin/env node\nconsole.log("hi");\n',
  'README.md': '# mytool\nA command line tool.\n',
};

describe('catalog', () => {
  it('has at least 20 entries', () => {
    assert.ok(CATALOG.length >= 20, `catalog has ${CATALOG.length} entries`);
  });

  it('every entry has name, repo, url, description and triggers', () => {
    for (const entry of CATALOG) {
      assert.ok(typeof entry.name === 'string' && entry.name.length > 0, `missing name: ${JSON.stringify(entry)}`);
      assert.ok(typeof entry.repo === 'string' && entry.repo.includes('/'), `${entry.name}: bad repo`);
      assert.ok(typeof entry.url === 'string' && entry.url.length > 0, `${entry.name}: missing url`);
      assert.ok(typeof entry.description === 'string' && entry.description.length > 10, `${entry.name}: bad description`);
      assert.ok(entry.triggers && typeof entry.triggers === 'object', `${entry.name}: missing triggers`);
    }
  });

  it('every url is a real github.com owner/repo URL and unique', () => {
    const urls = new Set();
    const repos = new Set();
    for (const entry of CATALOG) {
      assert.match(entry.url, /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, `${entry.name}: bad url ${entry.url}`);
      assert.ok(!urls.has(entry.url), `duplicate url: ${entry.url}`);
      assert.ok(!repos.has(entry.repo), `duplicate repo: ${entry.repo}`);
      urls.add(entry.url);
      repos.add(entry.repo);
    }
  });

  it('no duplicate names', () => {
    const names = CATALOG.map((e) => e.name);
    assert.strictEqual(new Set(names).size, names.length);
  });

  it('every trigger key is known and trigger values are well-formed', () => {
    const listKeys = ['languages', 'frameworks', 'deps', 'files', 'patterns', 'keywords', 'scripts'];
    const boolKeys = ['ci', 'bin', 'always'];
    for (const entry of CATALOG) {
      assert.ok(Object.keys(entry.triggers).length > 0, `${entry.name}: no triggers`);
      for (const [key, value] of Object.entries(entry.triggers)) {
        assert.ok(KNOWN_TRIGGER_KEYS.includes(key), `${entry.name}: unknown trigger key ${key}`);
        if (listKeys.includes(key)) {
          assert.ok(Array.isArray(value) && value.length > 0, `${entry.name}: ${key} must be a non-empty array`);
          for (const v of value) assert.strictEqual(typeof v, 'string', `${entry.name}: ${key} must hold strings`);
        }
        if (boolKeys.includes(key)) {
          assert.strictEqual(typeof value, 'boolean', `${entry.name}: ${key} must be boolean`);
        }
      }
    }
  });
});

describe('scanner', () => {
  it('detects package.json deps, scripts and frameworks (React + TS)', () => {
    const dir = makeProject(REACT_PROJECT);
    const s = scanProject(dir);
    assert.ok(s.deps.includes('react'));
    assert.ok(s.deps.includes('typescript'));
    assert.ok(s.scripts.includes('test'));
    assert.ok(s.frameworks.includes('react'));
    assert.ok(s.frameworks.includes('nextjs'));
    assert.strictEqual(s.languages.typescript, 3); // App.tsx, main.tsx, vite.config.ts
    assert.strictEqual(s.hasBin, false);
    assert.strictEqual(s.hasCI, true);
    assert.strictEqual(s.hasDockerfile, true);
    assert.strictEqual(s.hasTests, true);
  });

  it('detects languages by extension mix', () => {
    const dir = makeProject({
      'a.py': 'x = 1\n', 'b.py': 'y = 2\n', 'c.py': 'z = 3\n',
      'd.js': 'console.log(1);\n', 'e.go': 'package main\n',
    });
    const s = scanProject(dir);
    assert.deepStrictEqual(s.languages, { python: 3, javascript: 1, go: 1 });
    assert.strictEqual(s.hasCode, true);
  });

  it('detects Dockerfile, CI and test files', () => {
    const dir = makeProject({
      Dockerfile: 'FROM node:20\n',
      '.github/workflows/test.yml': 'name: test\n',
      'src/foo.test.js': 'test("x", () => {});\n',
    });
    const s = scanProject(dir);
    assert.strictEqual(s.hasDockerfile, true);
    assert.strictEqual(s.hasCI, true);
    assert.strictEqual(s.hasTests, true);
  });

  it('detects media files and README keywords', () => {
    const dir = makeProject(VIDEO_PROJECT);
    const s = scanProject(dir);
    assert.strictEqual(s.media.video, 2);
    assert.strictEqual(s.media.audio, 1);
    assert.ok(s.text.includes('tiktok'));
    assert.ok(s.text.includes('video'));
  });

  it('scan is read-only and skips node_modules and .git', () => {
    const dir = makeProject({
      ...REACT_PROJECT,
      'node_modules/fake/index.js': 'module.exports = {};\n',
      '.git/config': '[core]\n',
    });
    const before = snapshot(dir);
    const s = scanProject(dir);
    const after = snapshot(dir);
    assert.deepStrictEqual(after, before);
    assert.ok(!s.files.some((f) => f.startsWith('node_modules/')));
    assert.ok(!s.files.some((f) => f.startsWith('.git/')));
  });

  it('throws a clear error for a missing directory', () => {
    assert.throws(() => scanProject('/definitely/not/a/real/dir-xyz'), /directory not found/);
  });

  it('throws a clear error for a file, not a directory', () => {
    const dir = makeProject({ 'a.js': '1;\n' });
    assert.throws(() => scanProject(path.join(dir, 'a.js')), /not a directory/);
  });
});

describe('matcher', () => {
  it('ranks frontend skills high for a React + TypeScript project', () => {
    const dir = makeProject(REACT_PROJECT);
    const recs = matchSkills(scanProject(dir));
    const names = recs.map((r) => r.skill.name);
    assert.ok(names.slice(0, 5).includes('stitch-skills'), `top 5: ${names.slice(0, 5)}`);
    assert.ok(names.slice(0, 5).includes('chrome-devtools-mcp'), `top 5: ${names.slice(0, 5)}`);
    assert.ok(names.includes('opensre'), 'CI project should recommend opensre');
    const stitch = recs.find((r) => r.skill.name === 'stitch-skills');
    assert.ok(stitch.reasons.some((r) => r.includes('react')), 'reason should mention react');
  });

  it('ranks ffmpeg-skill and autoclip at the top for a video project', () => {
    const dir = makeProject(VIDEO_PROJECT);
    const recs = matchSkills(scanProject(dir));
    assert.strictEqual(recs[0].skill.name, 'ffmpeg-skill');
    assert.ok(recs.slice(0, 3).some((r) => r.skill.name === 'autoclip'));
    assert.ok(recs[0].reasons.some((r) => r.includes('fluent-ffmpeg')));
  });

  it('ranks opensre above open-code-review for a CI project', () => {
    const dir = makeProject({
      'package.json': JSON.stringify({
        name: 'svc', scripts: { test: 'jest', lint: 'eslint .' },
        devDependencies: { jest: '^29.0.0' },
      }),
      '.github/workflows/ci.yml': 'name: CI\n',
      'README.md': '# Service\nDeploy pipeline.\n',
    });
    const recs = matchSkills(scanProject(dir));
    const names = recs.map((r) => r.skill.name);
    assert.ok(names.indexOf('opensre') < names.indexOf('open-code-review'));
  });

  it('does not recommend TypeScript-only skills for a Python project', () => {
    const dir = makeProject(PYTHON_PROJECT);
    const recs = matchSkills(scanProject(dir));
    const names = recs.map((r) => r.skill.name);
    assert.ok(!names.includes('mattpocock-skills'));
    assert.ok(!names.includes('ffmpeg-skill'));
    assert.ok(names.includes('superpowers'), 'general packs should still match a Python project');
  });

  it('recommends CLI-Anything for a CLI tool project', () => {
    const dir = makeProject(CLI_PROJECT);
    const recs = matchSkills(scanProject(dir));
    const names = recs.map((r) => r.skill.name);
    assert.ok(names.includes('CLI-Anything'));
    const cli = recs.find((r) => r.skill.name === 'CLI-Anything');
    assert.ok(cli.reasons.some((r) => r.includes('CLI tool')));
  });

  it('scores are 0–100, sorted desc, and every recommendation has reasons', () => {
    const dir = makeProject(REACT_PROJECT);
    const recs = matchSkills(scanProject(dir));
    assert.ok(recs.length > 0);
    for (let i = 0; i < recs.length; i++) {
      assert.ok(recs[i].score >= MIN_SCORE && recs[i].score <= 100);
      assert.ok(recs[i].reasons.length > 0);
      if (i > 0) assert.ok(recs[i - 1].score >= recs[i].score, 'must be sorted desc');
    }
  });

  it('returns nothing for an empty directory', () => {
    const dir = makeProject({});
    const recs = matchSkills(scanProject(dir));
    assert.strictEqual(recs.length, 0);
  });

  it('respects the top limit', () => {
    const dir = makeProject(REACT_PROJECT);
    const recs = matchSkills(scanProject(dir), CATALOG, { top: 2 });
    assert.strictEqual(recs.length, 2);
  });

  it('scoreSkill is deterministic', () => {
    const dir = makeProject(REACT_PROJECT);
    const signals = scanProject(dir);
    const entry = CATALOG.find((e) => e.name === 'stitch-skills');
    const a = scoreSkill(entry, signals);
    const b = scoreSkill(entry, signals);
    assert.deepStrictEqual(a, b);
  });
});
