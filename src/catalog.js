/**
 * skill-match — built-in catalog of real, well-known agent skills.
 *
 * Every entry was verified against the GitHub API on 2026-11-26
 * (HTTP 200, real owner/repo, real description). Do not add an entry
 * without verifying the repo exists first.
 *
 * Trigger keys (all optional):
 *   languages  — language ids from the scanner (typescript, python, ...)
 *   frameworks — framework ids (react, nextjs, vue, django, ...)
 *   deps       — package names from package.json / requirements / pyproject
 *   files      — relative paths, basenames or directory prefixes
 *                (e.g. "Dockerfile", "CLAUDE.md", ".github/workflows")
 *   patterns   — globs matched against relative paths ("*.mp4", "*.svg")
 *   keywords   — substrings matched against README + package metadata
 *   scripts    — package.json script names ("test", "lint")
 *   ci         — true: project has CI config
 *   bin        — true: project is a CLI tool (package.json "bin")
 *   always     — true: general-purpose pack, base score for any code project
 */

'use strict';

const CATALOG = [
  {
    name: 'superpowers',
    repo: 'obra/superpowers',
    url: 'https://github.com/obra/superpowers',
    kind: 'skill-pack',
    description: 'Agentic skills framework & software development methodology that works with Claude Code.',
    triggers: {
      always: true,
      languages: ['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'ruby', 'php', 'csharp', 'cpp', 'swift', 'kotlin'],
    },
  },
  {
    name: 'Claude-BugHunter',
    repo: 'elementalsouls/Claude-BugHunter',
    url: 'https://github.com/elementalsouls/Claude-BugHunter',
    kind: 'skill-pack',
    description: 'Claude Code skill bundle for bug hunting and external red-team work: 85 skills, 16 slash commands, 681 disclosed-report patterns.',
    triggers: {
      keywords: ['security', 'vulnerability', 'vulnerabilities', 'bug bounty', 'pentest', 'red team', 'exploit', 'cve'],
      files: ['SECURITY.md'],
    },
  },
  {
    name: 'gstack',
    repo: 'garrytan/gstack',
    url: 'https://github.com/garrytan/gstack',
    kind: 'skill-pack',
    description: "YC president Garry Tan's skill pack for building and shipping products with Claude Code.",
    triggers: {
      always: true,
      languages: ['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'ruby', 'php', 'csharp', 'cpp', 'swift', 'kotlin'],
    },
  },
  {
    name: 'claude-skills',
    repo: 'alirezarezvani/claude-skills',
    url: 'https://github.com/alirezarezvani/claude-skills',
    kind: 'skill-pack',
    description: '415 production-grade agent skills in one collection.',
    triggers: {
      always: true,
      languages: ['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'ruby', 'php', 'csharp', 'cpp', 'swift', 'kotlin'],
    },
  },
  {
    name: 'ECC',
    repo: 'affaan-m/ECC',
    url: 'https://github.com/affaan-m/ECC',
    kind: 'skill-pack',
    description: 'Agent harness performance system: skills, instincts, memory, security and research-first development for Claude Code, Codex, Opencode and Cursor.',
    triggers: {
      always: true,
      languages: ['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'ruby', 'php', 'csharp', 'cpp', 'swift', 'kotlin'],
    },
  },
  {
    name: 'mattpocock-skills',
    repo: 'mattpocock/skills',
    url: 'https://github.com/mattpocock/skills',
    kind: 'skill-pack',
    description: 'TypeScript-focused skills by Matt Pocock.',
    triggers: {
      languages: ['typescript'],
      deps: ['typescript'],
      files: ['tsconfig.json'],
    },
  },
  {
    name: 'anthropics-skills',
    repo: 'anthropics/skills',
    url: 'https://github.com/anthropics/skills',
    kind: 'skill-pack',
    description: "Anthropic's official skills: document, spreadsheet, PDF and presentation workflows for Claude.",
    triggers: {
      keywords: ['document', 'spreadsheet', 'pdf', 'presentation', 'report', 'docx', 'xlsx', 'pptx'],
      patterns: ['*.docx', '*.xlsx', '*.pptx', '*.pdf'],
    },
  },
  {
    name: 'wshobson-agents',
    repo: 'wshobson/agents',
    url: 'https://github.com/wshobson/agents',
    kind: 'skill-pack',
    description: 'A large collection of Claude Code subagents and skills for planning, code review, testing and more.',
    triggers: {
      always: true,
      languages: ['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'ruby', 'php', 'csharp', 'cpp', 'swift', 'kotlin'],
    },
  },
  {
    name: 'ffmpeg-skill',
    repo: 'kajisho5/ffmpeg-skill',
    url: 'https://github.com/kajisho5/ffmpeg-skill',
    kind: 'skill',
    description: 'FFmpeg skill for video and audio processing: transcode, clip, extract, convert.',
    triggers: {
      deps: ['fluent-ffmpeg', 'ffmpeg', '@ffmpeg/ffmpeg', 'ffmpeg-static'],
      patterns: ['*.mp4', '*.mov', '*.mkv', '*.webm', '*.mp3', '*.wav', '*.flac'],
      keywords: ['ffmpeg', 'transcode', 'video', 'audio', 'clip'],
    },
  },
  {
    name: 'autoclip',
    repo: 'zhouxiaoka/autoclip',
    url: 'https://github.com/zhouxiaoka/autoclip',
    kind: 'tool',
    description: 'Open-source AI video clipping desktop tool: one link, one-click short videos with subtitles, covers and copy for Douyin, Xiaohongshu, TikTok, Reels and Shorts.',
    triggers: {
      patterns: ['*.mp4', '*.mov', '*.mkv', '*.webm'],
      keywords: ['video', 'short video', 'clip', 'tiktok', 'douyin', 'reels', 'podcast', 'interview', 'course', 'vlog'],
    },
  },
  {
    name: 'diagram-design',
    repo: 'cathrynlavery/diagram-design',
    url: 'https://github.com/cathrynlavery/diagram-design',
    kind: 'skill',
    description: 'Editorial diagram design for Claude Code and other agents: 52 diagram types as self-contained HTML + SVG.',
    triggers: {
      keywords: ['diagram', 'architecture', 'flowchart', 'system design', 'docs'],
      patterns: ['*.svg'],
    },
  },
  {
    name: 'last30days-skill',
    repo: 'mvanhorn/last30days-skill',
    url: 'https://github.com/mvanhorn/last30days-skill',
    kind: 'skill',
    description: 'Research any topic across Reddit, X, YouTube, Hacker News, Polymarket and the web, then synthesize a grounded summary.',
    triggers: {
      keywords: ['research', 'trend', 'trends', 'news', 'market research', 'competitor', 'sentiment'],
    },
  },
  {
    name: 'stitch-skills',
    repo: 'google-labs-code/stitch-skills',
    url: 'https://github.com/google-labs-code/stitch-skills',
    kind: 'skill',
    description: 'Agent skills for the Stitch MCP server: UI design workflows for coding agents.',
    triggers: {
      frameworks: ['react', 'vue', 'svelte', 'angular', 'nextjs'],
      deps: ['react', 'vue', 'svelte', '@angular/core', 'next'],
      keywords: ['ui', 'design', 'frontend', 'component', 'mockup'],
    },
  },
  {
    name: 'app-store-compliance',
    repo: 'mjmirza/app-store-compliance',
    url: 'https://github.com/mjmirza/app-store-compliance',
    kind: 'skill',
    description: 'Avoid App Store and Google Play rejections: 124 documented rejection patterns, privacy manifests, data safety checks and 114 tracked deadlines.',
    triggers: {
      deps: ['react-native', 'expo', '@capacitor/core', 'flutter'],
      files: ['Podfile', 'AndroidManifest.xml', 'app.json', 'pubspec.yaml'],
      keywords: ['app store', 'google play', 'ios', 'android', 'mobile app', 'privacy manifest'],
    },
  },
  {
    name: 'cursor-plugins',
    repo: 'cursor/plugins',
    url: 'https://github.com/cursor/plugins',
    kind: 'plugin',
    description: "Cursor's official plugin specification and ~90 official plugins (Ralph Loop, Thermos, Orchestrate, Gmail, Drive, Calendar...).",
    triggers: {
      keywords: ['cursor', 'plugin', 'plugins'],
      files: ['.cursor'],
      languages: ['javascript', 'typescript'],
    },
  },
  {
    name: 'open-code-review',
    repo: 'alibaba/open-code-review',
    url: 'https://github.com/alibaba/open-code-review',
    kind: 'tool',
    description: "Alibaba's open-source AI code review: deterministic pipeline x agent hybrid, higher F1 at ~1/9 the tokens.",
    triggers: {
      ci: true,
      files: ['.github/workflows', '.gitlab-ci.yml'],
      scripts: ['lint', 'test'],
      keywords: ['code review', 'review'],
    },
  },
  {
    name: 'chrome-devtools-mcp',
    repo: 'ChromeDevTools/chrome-devtools-mcp',
    url: 'https://github.com/ChromeDevTools/chrome-devtools-mcp',
    kind: 'mcp',
    description: "Chrome's official DevTools MCP server + skills: performance, LCP, memory leaks and accessibility debugging.",
    triggers: {
      frameworks: ['react', 'vue', 'nextjs', 'svelte', 'angular'],
      deps: ['react', 'next', 'vue'],
      keywords: ['performance', 'lcp', 'frontend', 'web performance', 'accessibility', 'a11y', 'debug'],
    },
  },
  {
    name: 'opensre',
    repo: 'Tracer-Cloud/opensre',
    url: 'https://github.com/Tracer-Cloud/opensre',
    kind: 'tool',
    description: 'Open-source agent for CI/CD reliability: when CI goes red it finds the cause and opens a fix PR.',
    triggers: {
      ci: true,
      files: ['.github/workflows', '.gitlab-ci.yml', 'Jenkinsfile', '.circleci'],
      keywords: ['ci', 'cd', 'pipeline', 'deploy', 'deployment'],
    },
  },
  {
    name: 'skill-finder',
    repo: 'ydmitry/skill-finder',
    url: 'https://github.com/ydmitry/skill-finder',
    kind: 'skill',
    description: 'A CLAUDE.md instruction that raised skill invocation from 2/58 to 47/58 — make installed skills actually get used.',
    triggers: {
      files: ['CLAUDE.md', '.claude'],
      keywords: ['skill', 'skills', 'agent'],
    },
  },
  {
    name: 'SkillSpector',
    repo: 'NVIDIA/SkillSpector',
    url: 'https://github.com/NVIDIA/SkillSpector',
    kind: 'tool',
    description: "NVIDIA's scanner for agent skills: find security issues in a skill before you trust it.",
    triggers: {
      files: ['CLAUDE.md', '.claude'],
      keywords: ['skill', 'skills', 'security'],
    },
  },
  {
    name: 'CLI-Anything',
    repo: 'HKUDS/CLI-Anything',
    url: 'https://github.com/HKUDS/CLI-Anything',
    kind: 'tool',
    description: 'Making all software agent-native: CLI-Hub for agent-ready command-line tools.',
    triggers: {
      bin: true,
      keywords: ['cli', 'command line', 'command-line'],
      files: ['bin'],
    },
  },
  {
    name: 'reanimate',
    repo: 'NiazMorshed2007/reanimate',
    url: 'https://github.com/NiazMorshed2007/reanimate',
    kind: 'skill',
    description: 'Rebuild motion frame by frame: extract an animation, redo it and compare the result.',
    triggers: {
      keywords: ['animation', 'motion', 'motion design', 'effect', 'effects'],
      patterns: ['*.mp4', '*.mov', '*.webm'],
    },
  },
  {
    name: 'skill-guard',
    repo: 'li123shengsheng-cyber/skill-guard',
    url: 'https://github.com/li123shengsheng-cyber/skill-guard',
    kind: 'tool',
    description: 'Scan an agent skill before you install it: 13 rules, 0–100 safety score, SAFE / CAUTION / DO NOT INSTALL.',
    triggers: {
      files: ['CLAUDE.md', '.claude'],
      keywords: ['skill', 'skills'],
    },
  },
  {
    name: 'security-audit-skill',
    repo: 'cloudflare/security-audit-skill',
    url: 'https://github.com/cloudflare/security-audit-skill',
    kind: 'skill',
    description: "Cloudflare's coding-agent skill for multi-phase security audits with independently verified, machine-readable findings.",
    triggers: {
      keywords: ['security', 'audit', 'vulnerability', 'vulnerabilities'],
      files: ['SECURITY.md'],
    },
  },
];

const KNOWN_TRIGGER_KEYS = [
  'languages',
  'frameworks',
  'deps',
  'files',
  'patterns',
  'keywords',
  'scripts',
  'ci',
  'bin',
  'always',
];

module.exports = { CATALOG, KNOWN_TRIGGER_KEYS };
