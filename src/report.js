/**
 * skill-match — report formatting (human text + JSON).
 * Bilingual like skill-guard: Chinese first, English second.
 */

'use strict';

function summarizeSignals(signals) {
  const langs = Object.entries(signals.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([lang, n]) => `${lang} ${n}`)
    .join(', ');
  const parts = [];
  parts.push(`文件 ${signals.totalFiles} files`);
  if (langs) parts.push(`语言 languages: ${langs}`);
  if (signals.frameworks.length) parts.push(`框架 frameworks: ${signals.frameworks.join(', ')}`);
  if (signals.deps.length) parts.push(`依赖 deps: ${signals.deps.slice(0, 12).join(', ')}${signals.deps.length > 12 ? ` (+${signals.deps.length - 12})` : ''}`);
  if (signals.hasCI) parts.push('CI: yes');
  if (signals.hasDockerfile) parts.push('Dockerfile: yes');
  if (signals.hasTests) parts.push('tests: yes');
  if (signals.hasBin) parts.push('CLI (bin): yes');
  if (signals.media.video) parts.push(`视频 video files: ${signals.media.video}`);
  if (signals.media.audio) parts.push(`音频 audio files: ${signals.media.audio}`);
  if (signals.packageManager) parts.push(`包管理器 package manager: ${signals.packageManager}`);
  return parts.join('  ·  ');
}

function formatScan(projectDir, signals, recommendations) {
  const lines = [];
  lines.push('');
  lines.push(`skill-match 扫描结果 / scan results — ${projectDir}`);
  lines.push('='.repeat(64));
  lines.push(`项目信号 / project signals: ${summarizeSignals(signals)}`);
  lines.push('');
  if (recommendations.length === 0) {
    lines.push('没有找到匹配的 skills / no matching skills found.');
    lines.push('这个项目没有代码文件，或没有 skill 能对上它的信号。');
    lines.push('Try `skill-match list` to browse the catalog.');
    return lines.join('\n');
  }
  lines.push(`推荐 ${recommendations.length} 个 skills / ${recommendations.length} recommended:`);
  lines.push('');
  recommendations.forEach((rec, i) => {
    const s = rec.skill;
    lines.push(`${i + 1}. ${s.name}  (${rec.score}分)  [${s.kind}]`);
    lines.push(`   ${s.description}`);
    lines.push(`   ${s.url}`);
    lines.push(`   匹配原因 / why: ${rec.reasons.join('； ')}`);
    lines.push('');
  });
  lines.push('安装 / install them:');
  lines.push(`  skill-match add ${projectDir} --yes`);
  lines.push('安装前建议先用 skill-guard 安检（装 skill 前先安检）:');
  lines.push('  https://github.com/li123shengsheng-cyber/skill-guard');
  return lines.join('\n');
}

function jsonScan(projectDir, signals, recommendations) {
  return JSON.stringify(
    {
      project: projectDir,
      signals: {
        totalFiles: signals.totalFiles,
        hasCode: signals.hasCode,
        languages: signals.languages,
        deps: signals.deps,
        scripts: signals.scripts,
        frameworks: signals.frameworks,
        media: signals.media,
        hasCI: signals.hasCI,
        hasTests: signals.hasTests,
        hasLint: signals.hasLint,
        hasBin: signals.hasBin,
        hasDockerfile: signals.hasDockerfile,
        hasSkillsDir: signals.hasSkillsDir,
        isMonorepo: signals.isMonorepo,
        packageManager: signals.packageManager,
      },
      recommendations: recommendations.map((rec) => ({
        name: rec.skill.name,
        repo: rec.skill.repo,
        url: rec.skill.url,
        kind: rec.skill.kind,
        description: rec.skill.description,
        score: rec.score,
        reasons: rec.reasons,
      })),
    },
    null,
    2,
  );
}

function formatList(catalog) {
  const lines = [];
  lines.push('');
  lines.push(`skill-match 内置目录 / built-in catalog — ${catalog.length} skills`);
  lines.push('='.repeat(64));
  lines.push('');
  for (const entry of catalog) {
    lines.push(`- ${entry.name}  [${entry.kind}]`);
    lines.push(`  ${entry.description}`);
    lines.push(`  ${entry.url}`);
  }
  lines.push('');
  lines.push('用法 / usage: skill-match scan <项目目录>  自动推荐最适合的 skills');
  return lines.join('\n');
}

function jsonList(catalog) {
  return JSON.stringify(
    catalog.map((entry) => ({
      name: entry.name,
      repo: entry.repo,
      url: entry.url,
      kind: entry.kind,
      description: entry.description,
    })),
    null,
    2,
  );
}

function formatPlan(projectDir, plan, skillsDir) {
  const lines = [];
  lines.push('');
  lines.push(`安装计划 / install plan — ${projectDir}`);
  lines.push(`目标目录 / target: ${skillsDir}`);
  lines.push('='.repeat(64));
  if (plan.length === 0) {
    lines.push('没有可安装的推荐 / nothing to install.');
    return lines.join('\n');
  }
  for (const item of plan) {
    lines.push(`- ${item.name}  (${item.repo})`);
    lines.push(`  ${item.url}`);
    lines.push(`  -> ${item.dest}`);
  }
  lines.push('');
  lines.push('只会写入上面这个目录，不会动项目其他文件。');
  lines.push('Only the target directory above is written; nothing else in the project is touched.');
  return lines.join('\n');
}

function formatInstallResults(results) {
  const lines = [];
  lines.push('');
  for (const r of results) {
    if (r.status === 'installed') lines.push(`[已安装 installed] ${r.name} -> ${r.dest}`);
    else if (r.status === 'skipped') lines.push(`[跳过 skipped] ${r.name} (${r.detail})`);
    else lines.push(`[失败 failed] ${r.name} — ${r.detail}`);
  }
  const ok = results.filter((r) => r.status === 'installed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  lines.push('');
  lines.push(`完成 / done: ${ok} 已安装 installed, ${skipped} 跳过 skipped, ${failed} 失败 failed.`);
  if (failed > 0) {
    lines.push('失败的可能是网络问题或 git 未安装；可稍后重试单个仓库：');
    lines.push('A failure is usually network or missing git; retry the repo manually:');
    for (const r of results.filter((x) => x.status === 'failed')) {
      lines.push(`  git clone --depth 1 ${r.url} ${r.dest}`);
    }
  }
  return lines.join('\n');
}

module.exports = {
  formatScan,
  jsonScan,
  formatList,
  jsonList,
  formatPlan,
  formatInstallResults,
  summarizeSignals,
};
