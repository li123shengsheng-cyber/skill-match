/**
 * skill-match — public API for tests and embedders.
 */

'use strict';

const { CATALOG, KNOWN_TRIGGER_KEYS } = require('./catalog');
const { scanProject } = require('./scanner');
const { matchSkills, scoreSkill, WEIGHTS, MIN_SCORE, DEFAULT_TOP } = require('./matcher');
const { defaultSkillsDir, isInside, planInstall, installSkills, confirmInstall } = require('./installer');
const { formatScan, jsonScan, formatList, jsonList, formatPlan, formatInstallResults } = require('./report');

module.exports = {
  CATALOG,
  KNOWN_TRIGGER_KEYS,
  scanProject,
  matchSkills,
  scoreSkill,
  WEIGHTS,
  MIN_SCORE,
  DEFAULT_TOP,
  defaultSkillsDir,
  isInside,
  planInstall,
  installSkills,
  confirmInstall,
  formatScan,
  jsonScan,
  formatList,
  jsonList,
  formatPlan,
  formatInstallResults,
};
