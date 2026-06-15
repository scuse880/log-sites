---
title: this
date: 2026-06-15
---

- 현재 웹 : npm workspaces 기반 monorepo 구조(또는 apps/packages 구조의 mini-monorepo)
    - 한 Git repo 안에 여러 Vite 앱을 apps 폴더에 두고, 공통 React/CSS 코드는 packages/shared로 빼서 npm workspace로 공유하는 구조


log-sites
├─ package.json              ← 루트 package.json
├─ package-lock.json         ← 전체 workspace 잠금 파일
├─ apps
│  ├─ learning-log
│  │  ├─ package.json        ← learning-log 앱의 package.json
│  │  ├─ src
│  │  └─ vite.config.ts
│  └─ workout-log
│     ├─ package.json        ← workout-log 앱의 package.json
│     ├─ src
│     └─ vite.config.ts
└─ packages
   └─ shared
      ├─ package.json        ← 공유 패키지의 package.json
      └─ src
         ├─ AppShell.tsx
         ├─ style.css
         └─ index.ts

- 질문 시
    - 내 프로젝트는 npm workspaces 기반 mini-monorepo야.
루트 아래에 apps/learning-log, apps/workout-log가 있고,
공통 코드는 packages/shared에 있어.
Cloudflare Pages에서는 같은 repo를 두 Pages 프로젝트로 나눠서 배포 중이야.
    - log-sites는 npm workspaces monorepo이고,
apps/learning-log, apps/workout-log가 있으며,
공통 코드는 packages/shared에 있어.