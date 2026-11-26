# Example scan — a real run

Command: `skill-match scan /tmp/sample-react-app`
(a React + TypeScript + Vite app with Playwright, Tailwind, CI, a Dockerfile and one .mp4 file)

```

skill-match 扫描结果 / scan results — /tmp/sample-react-app
================================================================
项目信号 / project signals: 文件 9 files  ·  语言 languages: typescript 3  ·  框架 frameworks: playwright, react, tailwind  ·  依赖 deps: @playwright/test, react, react-dom, tailwindcss, typescript, vite  ·  CI: yes  ·  Dockerfile: yes  ·  tests: yes  ·  视频 video files: 1

推荐 10 个 skills / 10 recommended:

1. chrome-devtools-mcp  (85分)  [mcp]
   Chrome's official DevTools MCP server + skills: performance, LCP, memory leaks and accessibility debugging.
   https://github.com/ChromeDevTools/chrome-devtools-mcp
   匹配原因 / why: uses dep "react"； framework: react； mentions "performance"； mentions "frontend"

2. stitch-skills  (85分)  [skill]
   Agent skills for the Stitch MCP server: UI design workflows for coding agents.
   https://github.com/google-labs-code/stitch-skills
   匹配原因 / why: uses dep "react"； framework: react； mentions "ui"； mentions "design"； mentions "frontend"

3. mattpocock-skills  (62分)  [skill-pack]
   TypeScript-focused skills by Matt Pocock.
   https://github.com/mattpocock/skills
   匹配原因 / why: uses dep "typescript"； language: TypeScript (3 files)； has tsconfig.json

4. open-code-review  (60分)  [tool]
   Alibaba's open-source AI code review: deterministic pipeline x agent hybrid, higher F1 at ~1/9 the tokens.
   https://github.com/alibaba/open-code-review
   匹配原因 / why: has .github/workflows； script "lint"； script "test"； CI configured

5. autoclip  (45分)  [tool]
   Open-source AI video clipping desktop tool: one link, one-click short videos with subtitles, covers and copy for Douyin, Xiaohongshu, TikTok, Reels and Shorts.
   https://github.com/zhouxiaoka/autoclip
   匹配原因 / why: 1 × *.mp4 file； mentions "video"； mentions "clip"

6. ffmpeg-skill  (45分)  [skill]
   FFmpeg skill for video and audio processing: transcode, clip, extract, convert.
   https://github.com/kajisho5/ffmpeg-skill
   匹配原因 / why: 1 × *.mp4 file； mentions "video"； mentions "clip"

7. opensre  (40分)  [tool]
   Open-source agent for CI/CD reliability: when CI goes red it finds the cause and opens a fix PR.
   https://github.com/Tracer-Cloud/opensre
   匹配原因 / why: has .github/workflows； CI configured

8. claude-skills  (32分)  [skill-pack]
   415 production-grade agent skills in one collection.
   https://github.com/alirezarezvani/claude-skills
   匹配原因 / why: language: TypeScript (3 files)； general-purpose pack for code projects

9. ECC  (32分)  [skill-pack]
   Agent harness performance system: skills, instincts, memory, security and research-first development for Claude Code, Codex, Opencode and Cursor.
   https://github.com/affaan-m/ECC
   匹配原因 / why: language: TypeScript (3 files)； general-purpose pack for code projects

10. gstack  (32分)  [skill-pack]
   YC president Garry Tan's skill pack for building and shipping products with Claude Code.
   https://github.com/garrytan/gstack
   匹配原因 / why: language: TypeScript (3 files)； general-purpose pack for code projects

安装 / install them:
  skill-match add /tmp/sample-react-app --yes
安装前建议先用 skill-guard 安检（装 skill 前先安检）:
  https://github.com/li123shengsheng-cyber/skill-guard
```

Command: `skill-match add /tmp/sample-react-app --dry-run` (first 12 lines)

```

安装计划 / install plan — /tmp/sample-react-app
目标目录 / target: /tmp/sample-react-app/.claude/skills
================================================================
- chrome-devtools-mcp  (ChromeDevTools/chrome-devtools-mcp)
  https://github.com/ChromeDevTools/chrome-devtools-mcp
  -> /tmp/sample-react-app/.claude/skills/chrome-devtools-mcp
- stitch-skills  (google-labs-code/stitch-skills)
  https://github.com/google-labs-code/stitch-skills
  -> /tmp/sample-react-app/.claude/skills/stitch-skills
- mattpocock-skills  (mattpocock/skills)
  https://github.com/mattpocock/skills
```
