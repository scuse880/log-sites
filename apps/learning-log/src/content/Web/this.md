---
title: this
date: 2026-06-15
---

- 현재 웹 : npm workspaces 기반 monorepo 구조(또는 apps/packages 구조의 mini-monorepo)
    - 한 Git repo 안에 여러 Vite 앱을 apps 폴더에 두고, 공통 React/CSS 코드는 packages/shared로 빼서 npm workspace로 공유하는 구조


## log-sites 구조

```txt
log-sites/
├─ package.json
├─ package-lock.json
├─ apps/
│  ├─ learning-log/
│  │  ├─ package.json
│  │  ├─ src/
│  │  └─ vite.config.ts
│  └─ workout-log/
│     ├─ package.json
│     ├─ src/
│     └─ vite.config.ts
└─ packages/
   └─ shared/
      ├─ package.json
      └─ src/
         ├─ AppShell.tsx
         ├─ style.css
         └─ index.ts
```

| 위치 | 역할 |
|---|---|
| `package.json` | 루트 package.json. 전체 workspace와 공통 실행 명령을 관리 |
| `package-lock.json` | 전체 workspace의 의존성 버전을 고정하는 잠금 파일 |
| `apps/learning-log` | learning-log 웹사이트 앱 |
| `apps/workout-log` | workout-log 웹사이트 앱 |
| `apps/*/package.json` | 각 앱의 이름, scripts, dependencies 설정 |
| `packages/shared` | 여러 앱이 함께 쓰는 공통 코드 패키지 |
| `packages/shared/package.json` | 공유 패키지의 이름과 export 경로 설정 |
| `packages/shared/src/AppShell.tsx` | 공통 React 레이아웃 컴포넌트 |
| `packages/shared/src/style.css` | 공통 CSS |
| `packages/shared/src/index.ts` | 공유 패키지의 export 진입점 |

- 질문 시
    - 내 프로젝트는 npm workspaces 기반 mini-monorepo야.
루트 아래에 apps/learning-log, apps/workout-log가 있고,
공통 코드는 packages/shared에 있어.
Cloudflare Pages에서는 같은 repo를 두 Pages 프로젝트로 나눠서 배포 중이야.
    - log-sites는 npm workspaces monorepo이고,
apps/learning-log, apps/workout-log가 있으며,
공통 코드는 packages/shared에 있어.