/**
 * skill-match — installer.
 *
 * `add` writes ONLY into the project's own skill directory
 * (<project>/.claude/skills/<name> by default, or --target).
 * It prints the install plan first and refuses to proceed without
 * --yes (or an explicit interactive confirmation on a TTY).
 * Installs are plain `git clone --depth 1` of the skill's repo.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function defaultSkillsDir(projectDir) {
  return path.join(projectDir, '.claude', 'skills');
}

/** True when `dest` is inside `projectDir` (no escaping the project). */
function isInside(projectDir, dest) {
  const rel = path.relative(path.resolve(projectDir), path.resolve(dest));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Build the install plan from ranked recommendations.
 * Returns [{ name, repo, url, dest }].
 */
function planInstall(projectDir, recommendations, targetDir) {
  const skillsDir = targetDir ? path.resolve(targetDir) : defaultSkillsDir(projectDir);
  return recommendations.map(({ skill }) => ({
    name: skill.name,
    repo: skill.repo,
    url: skill.url,
    dest: path.join(skillsDir, skill.name),
  }));
}

/**
 * Install a plan. `execFn` is injectable for tests (defaults to git clone).
 * Returns [{ name, repo, dest, status, detail }] where status is
 * 'installed' | 'skipped' | 'failed'.
 * Throws when a destination escapes the project directory.
 */
function installSkills(projectDir, plan, options = {}) {
  const execFn = options.execFn || defaultClone;
  const results = [];
  for (const item of plan) {
    if (!isInside(projectDir, item.dest)) {
      throw new Error(`refusing to install outside the project: ${item.dest}`);
    }
    if (fs.existsSync(item.dest)) {
      results.push({ ...item, status: 'skipped', detail: 'already exists' });
      continue;
    }
    try {
      fs.mkdirSync(path.dirname(item.dest), { recursive: true });
      execFn(item.url, item.dest);
      results.push({ ...item, status: 'installed', detail: 'cloned' });
    } catch (err) {
      results.push({ ...item, status: 'failed', detail: err.message.split('\n')[0] });
    }
  }
  return results;
}

function defaultClone(url, dest) {
  execFileSync('git', ['clone', '--depth', '1', url, dest], {
    timeout: 120000,
    stdio: 'ignore',
  });
}

/** Ask "proceed? (y/N)" on a TTY. Resolves true only for y/yes. */
function confirmInstall() {
  return new Promise((resolve) => {
    const rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Install these skills? [y/N] ', (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

module.exports = {
  defaultSkillsDir,
  isInside,
  planInstall,
  installSkills,
  confirmInstall,
};
