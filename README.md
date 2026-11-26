# skill-match

**Scan a project, get the agent skills it actually needs.**

`skill-match` reads a project directory — languages, frameworks, dependencies, config files, media files, README hints — and recommends the most suitable agent skills from a built-in catalog of 24 real, well-known skills, ranked by score with a reason for every match. It can also install the recommendations into the project's skill directory, with the install plan printed first and a confirmation gate.

It extends the trending [skill-finder](https://github.com/ydmitry/skill-finder) idea (a `CLAUDE.md` instruction that raised skill invocation from 2/58 to 47/58). skill-finder makes installed skills *invocable*; skill-match answers the question before that — **which skills does this project actually need?** — by analyzing the project instead of guessing.

- Node.js 18+, **zero runtime dependencies**
- Read-only scan; install writes only into the project's own skill directory
- Every recommendation carries its score and its reasons
- `npm test` — 37 tests, all passing

## Install

```bash
npm install -g skill-match
```

Until the package is published to npm, install from the repo:

```bash
git clone https://github.com/li123shengsheng-cyber/skill-match.git
cd skill-match
npm install -g .
```

## Usage

### `scan` — analyze only, never installs

```bash
skill-match scan ./my-app
skill-match scan ./my-app --json --top 5
```

Example (real run — see [examples/example-scan.md](examples/example-scan.md)):

```
skill-match 扫描结果 / scan results — /tmp/sample-react-app

项目信号 / project signals: 文件 9 files  ·  语言 languages: typescript 3  ·
框架 frameworks: playwright, react, tailwind  ·  依赖 deps: @playwright/test,
react, react-dom, tailwindcss, typescript, vite  ·  CI: yes  ·  Dockerfile: yes  ·
tests: yes  ·  视频 video files: 1

推荐 10 个 skills / 10 recommended:

1. chrome-devtools-mcp  (85分)  [mcp]
   Chrome's official DevTools MCP server + skills: performance, LCP, memory
   leaks and accessibility debugging.
   https://github.com/ChromeDevTools/chrome-devtools-mcp
   匹配原因 / why: uses dep "react"； framework: react； mentions "performance"；
   mentions "frontend"

2. stitch-skills  (85分)  [skill]
   Agent skills for the Stitch MCP server: UI design workflows for coding agents.
   https://github.com/google-labs-code/stitch-skills
   匹配原因 / why: uses dep "react"； framework: react； mentions "ui"；
   mentions "design"； mentions "frontend"
```

Exit codes: `0` recommendations found, `1` no matching skill, `2` usage error.

### `add` — print the plan, then install

```bash
skill-match add ./my-app --yes        # install the recommendations
skill-match add ./my-app --dry-run    # print the plan only, install nothing
skill-match add ./my-app --top 5 --yes
skill-match add ./my-app --target ./custom-skills --yes
```

`add` always prints the install plan first. It installs into `<project>/.claude/skills/<name>/` (or `--target`) by `git clone --depth 1` of each skill's repo. Without `--yes` it asks once on a terminal; in a non-interactive environment `--yes` is required. Skills that are already installed are skipped, not re-cloned.

Safety rules:

- `scan` is **read-only** — it never writes to the project.
- `add` writes **only** inside the project's skill directory; a destination outside the project is refused.
- A failed clone is reported per skill, never fatal to the whole run.

### `list` — browse the catalog

```bash
skill-match list
skill-match list --json
```

## How matching works

The scanner extracts these signals from the project:

| Signal | Examples |
| --- | --- |
| Languages | file extensions (`.ts` → TypeScript, `.py` → Python, …) |
| Dependencies | `package.json` deps/devDeps, `requirements.txt`, `pyproject.toml` |
| Frameworks | derived from deps (`react` → React, `next` → Next.js, `fastapi` → FastAPI, …) |
| Config files | `Dockerfile`, `tsconfig.json`, `.github/workflows`, `CLAUDE.md`, … |
| File patterns | `*.mp4`, `*.svg`, `*.test.*`, … |
| Keywords | README + package name/description/keywords |
| Scripts | `package.json` scripts (`test`, `lint`, …) |
| CI / CLI | CI config present, `package.json` has a `bin` field |

Each catalog entry lists the triggers it cares about. A match earns points:

| Trigger | Points | Cap |
| --- | --- | --- |
| dependency | 30 | 60 |
| framework | 25 | 50 |
| language | 12 | 36 |
| config file | 20 | 40 |
| file pattern | 15 | 30 |
| keyword | 15 | 30 |
| script | 10 | 20 |
| CI configured | 20 | 20 |
| CLI tool (`bin`) | 25 | 25 |
| general-purpose pack | 20 | 20 |

Scores are capped at 100. Only entries scoring **30 or more** are recommended, ranked highest first (`--top` defaults to 10). Every point is explained in the `reasons` list, so you can see exactly why a skill was suggested.

## Catalog (24 skills)

Every entry was verified against the GitHub API (real owner/repo). The catalog is curated from GitHub trending agent-skill projects.

| Skill | What it is | Source |
| --- | --- | --- |
| superpowers | Agentic skills framework & dev methodology | [obra/superpowers](https://github.com/obra/superpowers) |
| Claude-BugHunter | Bug hunting / red-team skill bundle (85 skills) | [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) |
| gstack | Garry Tan's skill pack | [garrytan/gstack](https://github.com/garrytan/gstack) |
| claude-skills | 415 production-grade skills | [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) |
| ECC | Agent harness: skills, memory, security, research-first dev | [affaan-m/ECC](https://github.com/affaan-m/ECC) |
| mattpocock-skills | TypeScript-focused skills | [mattpocock/skills](https://github.com/mattpocock/skills) |
| anthropics-skills | Anthropic's official skills (docs, sheets, PDF, slides) | [anthropics/skills](https://github.com/anthropics/skills) |
| wshobson-agents | Subagents & skills collection | [wshobson/agents](https://github.com/wshobson/agents) |
| ffmpeg-skill | FFmpeg video/audio processing | [kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) |
| autoclip | AI video clipping desktop tool (one link → short video) | [zhouxiaoka/autoclip](https://github.com/zhouxiaoka/autoclip) |
| diagram-design | Editorial diagram design, 52 diagram types | [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) |
| last30days-skill | Research any topic across Reddit/X/YouTube/HN/Polymarket | [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) |
| stitch-skills | Stitch MCP UI design skills | [google-labs-code/stitch-skills](https://github.com/google-labs-code/stitch-skills) |
| app-store-compliance | Avoid App Store / Google Play rejections | [mjmirza/app-store-compliance](https://github.com/mjmirza/app-store-compliance) |
| cursor-plugins | Cursor's official plugin spec + ~90 plugins | [cursor/plugins](https://github.com/cursor/plugins) |
| open-code-review | Alibaba's AI code review (deterministic × agent) | [alibaba/open-code-review](https://github.com/alibaba/open-code-review) |
| chrome-devtools-mcp | Chrome DevTools MCP: perf, LCP, a11y debugging | [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) |
| opensre | CI/CD reliability agent (CI red → cause + fix PR) | [Tracer-Cloud/opensre](https://github.com/Tracer-Cloud/opensre) |
| skill-finder | Make installed skills actually get used (2/58 → 47/58) | [ydmitry/skill-finder](https://github.com/ydmitry/skill-finder) |
| SkillSpector | NVIDIA's skill security scanner | [NVIDIA/SkillSpector](https://github.com/NVIDIA/SkillSpector) |
| CLI-Anything | Make all software agent-native (CLI-Hub) | [HKUDS/CLI-Anything](https://github.com/HKUDS/CLI-Anything) |
| reanimate | Rebuild motion frame by frame | [NiazMorshed2007/reanimate](https://github.com/NiazMorshed2007/reanimate) |
| skill-guard | Scan a skill before installing it (13 rules, 0–100 score) | [li123shengsheng-cyber/skill-guard](https://github.com/li123shengsheng-cyber/skill-guard) |
| security-audit-skill | Cloudflare's multi-phase security audit skill | [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) |

## Pairing with skill-guard

skill-match tells you **which** skills fit a project. Before installing a skill from an unfamiliar repo, scan it first with [skill-guard](https://github.com/li123shengsheng-cyber/skill-guard) — it checks 13 safety rules and gives a SAFE / CAUTION / DO NOT INSTALL verdict. skill-match prints this reminder after every scan.

## Development

```bash
npm test   # node:test, 37 tests, zero dependencies
```

## License

MIT — see [LICENSE](LICENSE).
