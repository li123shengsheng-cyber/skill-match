/**
 * skill-match — scoring engine.
 *
 * Each catalog entry earns points from the project signals it matches.
 * Every point is explained in the `reasons` list, so a recommendation
 * always says WHY it fits. Scores are capped at 100.
 */

'use strict';

const { CATALOG } = require('./catalog');

// Points per matched trigger, and the per-category cap.
const WEIGHTS = {
  dep: { points: 30, cap: 60 },
  framework: { points: 25, cap: 50 },
  language: { points: 12, cap: 36 },
  file: { points: 20, cap: 40 },
  pattern: { points: 15, cap: 30 },
  keyword: { points: 15, cap: 30 },
  script: { points: 10, cap: 20 },
  ci: { points: 20, cap: 20 },
  bin: { points: 25, cap: 25 },
  always: { points: 20, cap: 20 },
};

const MIN_SCORE = 30; // below this, a skill is not recommended
const DEFAULT_TOP = 10;

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

function fileMatchesTrigger(relPath, trigger) {
  const base = relPath.split('/').pop();
  return (
    relPath === trigger ||
    base === trigger ||
    relPath.startsWith(`${trigger}/`)
  );
}

function patternMatches(relPath, pattern) {
  return globToRegExp(pattern).test(relPath);
}

function labelLanguage(lang) {
  const labels = {
    javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
    go: 'Go', rust: 'Rust', java: 'Java', ruby: 'Ruby', php: 'PHP',
    csharp: 'C#', cpp: 'C/C++', swift: 'Swift', kotlin: 'Kotlin',
    web: 'HTML/CSS', shell: 'Shell', sql: 'SQL', vue: 'Vue SFC',
    svelte: 'Svelte', dart: 'Dart', lua: 'Lua', perl: 'Perl', r: 'R',
  };
  return labels[lang] || lang;
}

/**
 * Score one catalog entry against project signals.
 * Returns { score, reasons } — reasons are human-readable match notes.
 */
function scoreSkill(entry, signals) {
  const t = entry.triggers || {};
  const reasons = [];
  const earned = {};

  const add = (kind, points, reason) => {
    earned[kind] = (earned[kind] || 0) + points;
    reasons.push(reason);
  };

  // Dependencies (package.json / requirements / pyproject)
  if (Array.isArray(t.deps)) {
    const depSet = new Set(signals.deps.map((d) => d.toLowerCase()));
    for (const dep of t.deps) {
      if (depSet.has(dep.toLowerCase())) {
        add('dep', WEIGHTS.dep.points, `uses dep "${dep}"`);
      }
    }
  }

  // Frameworks
  if (Array.isArray(t.frameworks)) {
    const fwSet = new Set(signals.frameworks);
    for (const fw of t.frameworks) {
      if (fwSet.has(fw)) add('framework', WEIGHTS.framework.points, `framework: ${fw}`);
    }
  }

  // Languages
  if (Array.isArray(t.languages)) {
    for (const lang of t.languages) {
      if (signals.languages[lang] > 0) {
        add('language', WEIGHTS.language.points, `language: ${labelLanguage(lang)} (${signals.languages[lang]} files)`);
      }
    }
  }

  // Files / directories
  if (Array.isArray(t.files)) {
    for (const file of t.files) {
      if (signals.files.some((f) => fileMatchesTrigger(f, file))) {
        add('file', WEIGHTS.file.points, `has ${file}`);
      }
    }
  }

  // File patterns (globs)
  if (Array.isArray(t.patterns)) {
    for (const pattern of t.patterns) {
      const matches = signals.files.filter((f) => patternMatches(f, pattern));
      if (matches.length > 0) {
        add('pattern', WEIGHTS.pattern.points, `${matches.length} × ${pattern} file${matches.length > 1 ? 's' : ''}`);
      }
    }
  }

  // README / package metadata keywords
  if (Array.isArray(t.keywords)) {
    for (const kw of t.keywords) {
      if (signals.text && signals.text.includes(kw.toLowerCase())) {
        add('keyword', WEIGHTS.keyword.points, `mentions "${kw}"`);
      }
    }
  }

  // package.json scripts
  if (Array.isArray(t.scripts)) {
    const scriptSet = new Set(signals.scripts);
    for (const script of t.scripts) {
      if (scriptSet.has(script)) add('script', WEIGHTS.script.points, `script "${script}"`);
    }
  }

  // CI configured
  if (t.ci === true && signals.hasCI) {
    add('ci', WEIGHTS.ci.points, 'CI configured');
  }

  // CLI tool (package.json "bin")
  if (t.bin === true && signals.hasBin) {
    add('bin', WEIGHTS.bin.points, 'CLI tool (package.json "bin")');
  }

  // General-purpose pack: base score for any project with code
  if (t.always === true && signals.hasCode) {
    add('always', WEIGHTS.always.points, 'general-purpose pack for code projects');
  }

  let score = 0;
  for (const [kind, points] of Object.entries(earned)) {
    score += Math.min(points, WEIGHTS[kind].cap);
  }
  return { score: Math.min(score, 100), reasons };
}

/**
 * Rank all catalog entries for a project.
 * Returns [{ skill, score, reasons }] sorted by score desc, then name asc.
 * Only entries with score >= MIN_SCORE are returned (up to `top`).
 */
function matchSkills(signals, catalog = CATALOG, options = {}) {
  const top = Number.isInteger(options.top) && options.top > 0 ? options.top : DEFAULT_TOP;
  const ranked = [];
  for (const entry of catalog) {
    const { score, reasons } = scoreSkill(entry, signals);
    if (score >= MIN_SCORE) {
      ranked.push({ skill: entry, score, reasons });
    }
  }
  ranked.sort((a, b) => (b.score - a.score) || a.skill.name.localeCompare(b.skill.name));
  return ranked.slice(0, top);
}

module.exports = { matchSkills, scoreSkill, WEIGHTS, MIN_SCORE, DEFAULT_TOP };
