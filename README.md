# Learning Log

학습 Markdown 문서와 파일 자료실을 제공하는 독립 React + Vite 프로젝트입니다.
프로젝트 위치는 `C:\Users\abl24\Desktop\web(compilation)\learning-log`입니다.

## 실행

Node.js 24 환경에서 확인했습니다. 최초 실행 시 의존성과 로컬 자료실을 준비합니다.

```powershell
cd 'C:\Users\abl24\Desktop\web(compilation)\learning-log'
npm install
npm run setup:local
npm run dev
```

- 웹 화면: http://127.0.0.1:5173
- 로컬 API: http://127.0.0.1:8787 (웹 화면에서 `/api`로 연결)
- `npm run dev`는 웹 화면과 자료실 서버를 함께 시작합니다. 종료는 `Ctrl+C`입니다.
- `setup:local`은 `.dev.vars`에 무작위 관리자 비밀번호를 만들고 로컬 DB를 초기화합니다. 비밀번호는 해당 파일에서 확인합니다. 이미 존재하는 비밀번호는 보존합니다.
- 업로드 파일과 DB는 `.wrangler/state`에 저장되어 서버 재시작 후에도 유지됩니다. `.dev.vars`와 `.wrangler`는 Git에서 제외됩니다.
- 문서 화면만 작업할 때는 `npm run dev:web`을 사용합니다. 자료실을 사용하려면 별도로 `npm run dev:api`도 실행해야 합니다.

## 구조

```text
learning-log/
├─ src/
│  ├─ content/              학습 Markdown 문서
│  ├─ lib/                  검색, 폴더 메뉴, 문서 렌더링과 스타일
│  ├─ App.tsx
│  ├─ FilesPage.tsx         업로드·다운로드·관리자 화면
│  └─ files.css
├─ server/                  파일 API와 정리 작업, 로컬 개발 진입점
├─ functions/api/           Cloudflare Pages API 진입점
├─ migrations/              D1 데이터베이스 스키마
├─ public/_routes.json      Pages API 라우팅
├─ scripts/                 로컬 초기화·실행
├─ tests/                   검색·탐색·API 회귀 테스트
├─ wrangler.dev.jsonc       로컬 D1/R2 설정
├─ wrangler.example.jsonc   선택적으로 사용할 운영 Pages 설정 예제
└─ wrangler.cleanup.example.jsonc
```

문서는 `src/content` 아래에 `.md` 파일을 추가하면 됩니다. 하위 폴더가 왼쪽 메뉴에 그대로 반영됩니다. 예를 들어 기존 CSMaple 문서는 `src/content/CSMaple/학습연동_메이플_RPG_설계지도_v0.1.md`에 있습니다.

## 검색과 메뉴

- 파일명·제목·경로·본문을 검색하고 자동완성에서 최대 6개 문서를 확인할 수 있습니다.
- Enter 또는 검색 버튼으로 전체 검색 결과를 봅니다. 결과는 15개씩 표시됩니다.
- 한글 조합 입력, 다중 검색어, 검색어 강조를 지원합니다.
- 폴더를 접고 펼치거나 문서 메뉴 전체를 숨길 수 있습니다. 선택한 문서의 상위 폴더는 자동으로 펼쳐집니다.
- 문서와 검색 결과는 주소에 반영되어 새로고침, 직접 링크, 뒤로·앞으로 이동을 지원합니다.
- Markdown 표, 코드 강조, 수식 렌더링을 유지합니다.

## 파일 자료실

왼쪽 하단의 **파일 자료실**에서 사용합니다. 목록과 다운로드는 로그인 없이 가능하며 업로드·삭제·순서 변경은 관리자 로그인 후 사용할 수 있습니다.

- 파일 선택·드래그 업로드, 진행 상태와 취소
- 파일 다운로드, 선택 삭제, 드래그 또는 버튼으로 순서 변경
- 개별 파일 최대 100MB, 전체 5GB, 한국 시간 기준 하루 30개 업로드
- 관리자 세션 만료, CSRF 검사, 요청 제한, 중단된 업로드 정리

로컬에서는 `.dev.vars`의 `UPLOAD_SECRET`를 사용합니다. 개발 서버는 루프백 주소에서만 실행되고, 개발용 쿠키와 운영용 Secure 쿠키를 분리합니다.

## 검증

```powershell
npm run build
npm test
```

`build`는 프런트엔드·서버 TypeScript 검사 후 `dist`를 만듭니다. `npm test`는 검색·탐색 및 실제 로컬 D1/R2 기반 API 테스트를 실행합니다. API 테스트에는 100MB 업로드·다운로드 내용 일치 검증도 포함됩니다.

`npm run preview`는 빌드된 문서 화면을 확인하는 용도입니다. 이 명령만으로 자료실 API가 실행되지는 않습니다.

## 운영 자료실 연결

운영 환경은 Pages 대시보드에서 설정한 바인딩과 비밀값을 사용합니다.

| 항목 | 코드에서 사용하는 이름 | Cloudflare 설정 |
| --- | --- | --- |
| R2 저장소 | `MY_BUCKET` | 실제 버킷 `logsites-files`에 연결 |
| 관리자 비밀번호 | `UPLOAD_SECRET` | Pages의 암호화된 비밀값 사용 |
| D1 데이터베이스 | `DB` | 별도 생성·연결 필요, 권장 이름 `learning-log-files` |

`MY_BUCKET`은 바인딩 이름이며 실제 R2 버킷 이름은 `logsites-files`입니다. 코드에는 비밀번호 값을 넣지 않습니다. 로컬 `.dev.vars`의 비밀번호와 Pages의 운영 비밀번호는 별도로 관리합니다.

현재 운영 D1은 아직 생성하지 않았습니다. R2와 비밀번호만으로는 자료실이 동작하지 않습니다. D1에 파일 목록, 정렬 순서, 관리자 세션, 업로드 제한 정보를 저장하기 때문입니다.

1. D1 데이터베이스를 만들고 Pages의 D1 바인딩 이름을 `DB`로 연결합니다.
2. 운영 DB에 `migrations/0001_files.sql`을 적용합니다. 이미 만든 테이블이 있는 DB에 초기 스키마를 반복 실행하지 않습니다.
3. Pages의 R2 바인딩 `MY_BUCKET` → `logsites-files`와 비밀값 `UPLOAD_SECRET`이 배포할 환경에 설정되어 있는지 확인합니다.
4. Pages 빌드 루트는 저장소 루트(`.` 또는 빈 값), 빌드 명령은 `npm run build`, 출력 폴더는 `dist`로 설정합니다. 이전 `apps/learning-log` 경로는 사용하지 않습니다. 루트 `functions`도 포함해 재배포해야 자료실 API가 제공됩니다.
5. 중단된 업로드를 정리하려면 `wrangler.cleanup.example.jsonc`를 별도 설정으로 복사하고 실제 D1 ID와 동일한 R2 버킷을 연결해 정리 Worker를 배포합니다. 예제는 15분 주기입니다.

현재 저장소에는 자동 적용되는 운영 `wrangler.jsonc`를 두지 않습니다. 대시보드에 설정한 값을 임시 D1 ID로 덮어쓰지 않기 위한 구성입니다. 나중에 파일로 운영 설정을 관리하려면 `wrangler.example.jsonc`를 `wrangler.jsonc`로 복사하고 실제 Pages 프로젝트 이름과 D1 ID를 입력한 뒤 모든 바인딩을 확인합니다. [Cloudflare 설정 문서](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)에 따르면 배포용 Wrangler 파일을 사용하면 해당 파일이 설정의 기준이 됩니다.

기존 `kyohang-sites`의 운영 저장소 ID나 비밀번호는 복사하지 않았습니다.
