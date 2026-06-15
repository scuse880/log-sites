# log-sites

`learning-log`와 `workout-log`를 하나의 repo 안에서 관리하는 npm workspaces 템플릿입니다.

## 구조

```txt
log-sites
├─ apps
│  ├─ learning-log
│  └─ workout-log
└─ packages
   └─ shared
```

- `apps/learning-log/src/content`: learning-log 전용 Markdown
- `apps/workout-log/src/content`: workout-log 전용 Markdown
- `packages/shared/src`: 두 사이트가 공유하는 React 컴포넌트, Markdown 파서, CSS

## 설치

```powershell
npm install
```

## 실행

```powershell
npm run dev:learning
npm run dev:workout
```

## 빌드

```powershell
npm run build:learning
npm run build:workout
```

## 수정 위치

공통 화면 구조, 사이드바, Markdown 렌더링, CSS는 아래 파일에서 수정합니다.

```txt
packages/shared/src/AppShell.tsx
packages/shared/src/content.ts
packages/shared/src/style.css
```

각 사이트별 제목과 Markdown 로딩 경로는 아래 파일에서 수정합니다.

```txt
apps/learning-log/src/App.tsx
apps/workout-log/src/App.tsx
```
