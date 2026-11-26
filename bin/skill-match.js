#!/usr/bin/env node
/**
 * skill-match CLI — scan a project and recommend the agent skills it needs.
 *
 *   skill-match scan <dir> [--json] [--top N]     analyze, print ranked recommendations
 *   skill-match add <dir> [--yes] [--top N] [--dry-run] [--target <dir>]
 *                                                  print the install plan, then install
 *   skill-match list [--json]                      show the built-in catalog
 *
 * Exit codes: 0 = done (scan found recommendations / install finished),
 *               1 = no recommendations / install refused or failed,
 *               2 = usage error.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { CATALOG } = require('../src/catalog');
const { scanProject } = require('../src/scanner');
const { matchSkills, DEFAULT_TOP } = require('../src/matcher');
const { defaultSkillsDir, planInstall, installSkills, confirmInstall } = require('../src/installer');
const { formatScan, jsonScan, formatList, jsonList, formatPlan, formatInstallResults } = require('../src/report');

const VERSION = '0.1.0';

function printHelp() {
  console.log(`
skill-match v${VERSION} — 扫描项目，自动推荐最适合的 agent skills
Scan a project and recommend the agent skills it actually needs.

用法 / Usage:
  skill-match scan <目录> [--json] [--top N]
      只分析，不安装。打印排名、分数和匹配原因。
      Analyze only. Prints ranked recommendations with score and reason.
      --json 输出 JSON；--top N 只取前 N 条（默认 ${DEFAULT_TOP}）。
      退出码 / exit code: 0 有推荐，1 没有匹配的 skill，2 用法错误。

  skill-match add <目录> [--yes] [--top N] [--dry-run] [--target <目录>]
      先打印安装计划，再把推荐的 skills 装进项目的 skills 目录
      （默认 <目录>/.claude/skills/）。
      Prints the install plan first, then installs into the project's
      skill directory (default <dir>/.claude/skills/).
      --yes 直接安装；不加则在终端里确认一次，非终端环境必须加 --yes。
      --dry-run 只打印计划，不安装。--target 改目标目录。

  skill-match list [--json]
      显示内置目录 / show the built-in catalog (${CATALOG.length} skills)。

  skill-match --help | --version

示例 / Examples:
  skill-match scan ./my-app
  skill-match scan ./my-app --json --top 5
  skill-match add ./my-app --yes
  skill-match add ./my-app --dry-run
  skill-match list
`);
}

function parseFlags(args) {
  const flags = { json: false, yes: false, dryRun: false, top: DEFAULT_TOP, target: null, positional: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--json') flags.json = true;
    else if (a === '--yes') flags.yes = true;
    else if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--top') {
      const n = parseInt(args[++i], 10);
      if (!Number.isInteger(n) || n <= 0) {
        console.error('error: --top 需要一个正整数 / --top needs a positive integer');
        process.exit(2);
      }
      flags.top = n;
    } else if (a === '--target') {
      flags.target = args[++i];
      if (!flags.target) {
        console.error('error: --target 需要一个目录 / --target needs a directory');
        process.exit(2);
      }
    } else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    } else if (a === '--version' || a === '-v') {
      console.log(`skill-match v${VERSION}`);
      process.exit(0);
    } else if (a.startsWith('-')) {
      console.error(`error: 未知选项 unknown option: ${a}`);
      printHelp();
      process.exit(2);
    } else {
      flags.positional.push(a);
    }
  }
  return flags;
}

function cmdScan(dir, flags) {
  let signals;
  try {
    signals = scanProject(dir);
  } catch (err) {
    console.error(`error: ${err.message}`);
    return 1;
  }
  const recommendations = matchSkills(signals, CATALOG, { top: flags.top });
  if (flags.json) {
    console.log(jsonScan(dir, signals, recommendations));
  } else {
    console.log(formatScan(dir, signals, recommendations));
  }
  return recommendations.length > 0 ? 0 : 1;
}

async function cmdAdd(dir, flags) {
  let signals;
  try {
    signals = scanProject(dir);
  } catch (err) {
    console.error(`error: ${err.message}`);
    return 1;
  }
  const recommendations = matchSkills(signals, CATALOG, { top: flags.top });
  const skillsDir = flags.target ? path.resolve(flags.target) : defaultSkillsDir(path.resolve(dir));
  const plan = planInstall(path.resolve(dir), recommendations, skillsDir);
  console.log(formatPlan(dir, plan, skillsDir));
  if (plan.length === 0) return 1;
  if (flags.dryRun) {
    console.log('只打印计划，未安装 / dry run — nothing installed.');
    return 0;
  }
  if (!flags.yes) {
    if (!process.stdin.isTTY) {
      console.error('error: 非终端环境下安装需要加 --yes / non-interactive install needs --yes');
      return 1;
    }
    const ok = await confirmInstall();
    if (!ok) {
      console.log('已取消 / cancelled — nothing installed.');
      return 1;
    }
  }
  const results = installSkills(path.resolve(dir), plan);
  console.log(formatInstallResults(results));
  const failed = results.filter((r) => r.status === 'failed').length;
  return failed > 0 ? 1 : 0;
}

function cmdList(flags) {
  if (flags.json) console.log(jsonList(CATALOG));
  else console.log(formatList(CATALOG));
  return 0;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    return 0;
  }
  if (args[0] === '--version' || args[0] === '-v') {
    console.log(`skill-match v${VERSION}`);
    return 0;
  }
  const cmd = args[0];
  const flags = parseFlags(args.slice(1));
  if (cmd === 'scan') {
    if (flags.positional.length !== 1) {
      console.error('error: scan 需要一个项目目录 / scan needs one project directory');
      printHelp();
      return 2;
    }
    return cmdScan(flags.positional[0], flags);
  }
  if (cmd === 'add') {
    if (flags.positional.length !== 1) {
      console.error('error: add 需要一个项目目录 / add needs one project directory');
      printHelp();
      return 2;
    }
    return cmdAdd(flags.positional[0], flags);
  }
  if (cmd === 'list') {
    if (flags.positional.length !== 0) {
      console.error('error: list 不需要参数 / list takes no arguments');
      printHelp();
      return 2;
    }
    return cmdList(flags);
  }
  console.error(`error: 未知命令 unknown command: ${cmd}`);
  printHelp();
  return 2;
}

main()
  .then((code) => { process.exitCode = code; })
  .catch((err) => {
    console.error(`error: ${err.message}`);
    process.exitCode = 1;
  });
