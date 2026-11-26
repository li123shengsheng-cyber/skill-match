/**
 * Tests for skill-match CLI behavior and the installer.
 * Zero dependencies — node:test + node:assert.
 * Run: npm test
 */

'use strict';

const assert = require('node:assert');
const { describe, it, before, after } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin', 'skill-match.js');

const { planInstall, installSkills, isInside } = require('../src/installer');
const { CATALOG } = require('../src/catalog');

const tmpDirs = [];

function makeProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-match-cli-'));
  tmpDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    encoding: 'utf8',
    ...options,
  });
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
    dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
    devDependencies: { typescript: '^5.0.0', vite: '^6.0.0' },
  }),
  'tsconfig.json': '{}',
  'src/App.tsx': 'export default function App() { return null; }',
  '.github/workflows/ci.yml': 'name: CI\non: [push]\n',
  'README.md': '# My Frontend App\nA frontend UI design app focused on performance.\n',
};

describe('cli: list', () => {
  it('list prints catalog names', () => {
    const r = runCli(['list']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('superpowers'));
    assert.ok(r.stdout.includes('ffmpeg-skill'));
    assert.ok(r.stdout.includes('skill-guard'));
  });

  it('list --json parses and has >= 20 entries with urls', () => {
    const r = runCli(['list', '--json']);
    assert.strictEqual(r.status, 0, r.stderr);
    const data = JSON.parse(r.stdout);
    assert.ok(Array.isArray(data) && data.length >= 20);
    for (const e of data) {
      assert.ok(e.name && e.url && e.description);
      assert.ok(e.url.startsWith('https://github.com/'));
    }
  });
});

describe('cli: scan', () => {
  it('scan --json outputs parseable recommendations with score and reasons', () => {
    const dir = makeProject(REACT_PROJECT);
    const r = runCli(['scan', dir, '--json']);
    assert.strictEqual(r.status, 0, r.stderr);
    const data = JSON.parse(r.stdout);
    assert.strictEqual(data.project, dir);
    assert.ok(Array.isArray(data.recommendations) && data.recommendations.length > 0);
    for (const rec of data.recommendations) {
      assert.ok(typeof rec.score === 'number' && rec.score >= 30 && rec.score <= 100);
      assert.ok(Array.isArray(rec.reasons) && rec.reasons.length > 0);
      assert.ok(rec.url.startsWith('https://github.com/'));
    }
    assert.ok(data.recommendations.some((x) => x.name === 'stitch-skills'));
  });

  it('scan --top limits the number of recommendations', () => {
    const dir = makeProject(REACT_PROJECT);
    const r = runCli(['scan', dir, '--json', '--top', '2']);
    assert.strictEqual(r.status, 0, r.stderr);
    const data = JSON.parse(r.stdout);
    assert.strictEqual(data.recommendations.length, 2);
  });

  it('scan on a missing directory exits 1 with a clear message', () => {
    const r = runCli(['scan', '/definitely/not/a/real/dir-xyz']);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /directory not found/);
  });

  it('scan with no directory is a usage error (exit 2)', () => {
    const r = runCli(['scan']);
    assert.strictEqual(r.status, 2);
  });

  it('unknown command is a usage error (exit 2)', () => {
    const r = runCli(['frobnicate']);
    assert.strictEqual(r.status, 2);
  });

  it('--help exits 0 and mentions scan/add/list', () => {
    const r = runCli(['--help']);
    assert.strictEqual(r.status, 0);
    assert.ok(r.stdout.includes('scan'));
    assert.ok(r.stdout.includes('add'));
    assert.ok(r.stdout.includes('list'));
  });
});

describe('cli: add (safety)', () => {
  it('add without --yes in a non-TTY refuses and writes nothing', () => {
    const dir = makeProject(REACT_PROJECT);
    const r = runCli(['add', dir]);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /--yes/);
    assert.ok(!fs.existsSync(path.join(dir, '.claude')), 'must not create .claude without --yes');
  });

  it('add --dry-run prints the plan and writes nothing', () => {
    const dir = makeProject(REACT_PROJECT);
    const r = runCli(['add', dir, '--dry-run']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('install plan'));
    assert.ok(r.stdout.includes('.claude/skills'));
    assert.ok(r.stdout.includes('stitch-skills'));
    assert.ok(!fs.existsSync(path.join(dir, '.claude')), 'dry run must not write');
  });

  it('add --dry-run --target uses the given target directory', () => {
    const dir = makeProject(REACT_PROJECT);
    const target = path.join(dir, 'custom-skills');
    const r = runCli(['add', dir, '--dry-run', '--target', target]);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes(target));
    assert.ok(!fs.existsSync(target), 'dry run must not write');
  });
});

describe('installer', () => {
  it('planInstall puts every skill under the project skills dir', () => {
    const dir = makeProject(REACT_PROJECT);
    const recs = [{ skill: CATALOG[0] }, { skill: CATALOG[8] }];
    const plan = planInstall(dir, recs);
    assert.strictEqual(plan.length, 2);
    for (const item of plan) {
      assert.ok(isInside(dir, item.dest));
      assert.ok(item.dest.startsWith(path.join(dir, '.claude', 'skills')));
    }
  });

  it('isInside rejects paths outside the project', () => {
    const dir = makeProject(REACT_PROJECT);
    assert.strictEqual(isInside(dir, path.join(dir, '.claude', 'skills', 'x')), true);
    assert.strictEqual(isInside(dir, path.join(dir, '..', 'escape')), false);
    assert.strictEqual(isInside(dir, '/etc/passwd'), false);
  });

  it('installSkills clones a real local git repo into .claude/skills', () => {
    // Build a tiny local git repo to install from (no network needed).
    const repoDir = makeProject({
      'SKILL.md': '# test-skill\nA tiny test skill.\n',
      'scripts/run.sh': '#!/bin/sh\necho hi\n',
    });
    const env = {
      ...process.env,
      GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@test.com',
      GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@test.com',
    };
    execFileSync('git', ['init', '-q', repoDir], { env });
    execFileSync('git', ['-C', repoDir, 'add', '.'], { env });
    execFileSync('git', ['-C', repoDir, 'commit', '-qm', 'init'], { env });

    const projectDir = makeProject(REACT_PROJECT);
    const plan = [{
      name: 'test-skill',
      repo: 'local/test-skill',
      url: `file://${repoDir}`,
      dest: path.join(projectDir, '.claude', 'skills', 'test-skill'),
    }];
    const results = installSkills(projectDir, plan);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].status, 'installed', JSON.stringify(results));
    assert.ok(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'test-skill', 'SKILL.md')));

    // Second install of the same skill is skipped, not re-cloned.
    const again = installSkills(projectDir, plan);
    assert.strictEqual(again[0].status, 'skipped');
  });

  it('installSkills refuses a destination outside the project', () => {
    const projectDir = makeProject(REACT_PROJECT);
    const plan = [{
      name: 'evil',
      repo: 'x/y',
      url: 'https://github.com/x/y',
      dest: path.join(projectDir, '..', 'escape'),
    }];
    assert.throws(() => installSkills(projectDir, plan), /refusing to install outside the project/);
    assert.ok(!fs.existsSync(path.join(projectDir, '..', 'escape')));
  });

  it('installSkills records a failure instead of throwing when git fails', () => {
    const projectDir = makeProject(REACT_PROJECT);
    const plan = [{
      name: 'nope',
      repo: 'local/missing',
      url: 'file:///definitely/not/a/real/repo-xyz',
      dest: path.join(projectDir, '.claude', 'skills', 'nope'),
    }];
    const results = installSkills(projectDir, plan);
    assert.strictEqual(results[0].status, 'failed');
    assert.ok(results[0].detail.length > 0);
  });
});
