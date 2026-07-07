# 가짜 workEvents 제너레이터 (M002 재생기) — 설계

날짜: 2026-07-07
상태: 설계 확정 (유저 승인), 구현 전
선행 결정: `docs/PROJECT_STATUS.md` 07-07 항목 (작업 레이어 첫 엔진 = Company OS, 가짜 제너레이터 선행), `docs/design/2026-07-03-paperclip-integration.md` §Phase A

## 목적

진짜 오케스트레이션 엔진(Company OS) 없이, **"회사의 하루가 빌보드 티커에 흐르는" 전시를 검증**한다.
부차 목적: 대본(이벤트 시퀀스) 형식을 확립한다 — 이 형식이 다음 슬라이스(아바타 연기 매핑)의 입력이 된다.

- 06-27 핵심 가설("텍스트보다 한 화면이 팀 상태를 잘 읽히나")의 첫 재료.
- 명시적 비목표: 진짜 에이전트 실행, SQLite, 아바타 이동/연기, 프론트 변경. **A안(가짜) 확정** — B안(진짜 최소 Company OS)은 이 전시가 설득력 있을 때 별도 슬라이스로.

## 무엇이 보이나 (수용 기준)

`node scripts/workevents/replay.mjs`를 켜면, ORBIT STATION 빌보드 티커에 아래 M002 대본이 4~5초 간격으로 한 줄씩 뜬다. 다 흐르면 5초 쉬고 처음부터 반복. 스크립트를 끄면 아무것도 돌지 않는다.

## 대본: M002 "Orbit Station 런칭 영상 제작·발행"

부서 배정: Atlas=운영(Operations), Nova=리서치(Research), Vega=마케팅/콘텐츠(Marketing). SYS = agentName 없음(티커가 자동으로 `SYS` 표기).

| # | delay(s) | agent | type | summary |
|---|---|---|---|---|
| 1 | 0 | Atlas | `run_started` | M002 시작 — "Orbit 런칭 영상 제작·발행" |
| 2 | 4 | Atlas | `task_assigned` | 작업 분해: 리서치 → 대본 → 렌더 → 발행 |
| 3 | 4 | Nova | `tool_call_started` | 타깃 시청자·핵심 메시지 조사 중… |
| 4 | 5 | Nova | `tool_call_finished` | "방향 있는 생산자" 앵글 3개 도출 |
| 5 | 4 | Nova | `agent_message` | 마케팅에 전달 — audience-brief.md |
| 6 | 4 | Vega | `tool_call_started` | /vg-story 로 대본 생성 중… |
| 7 | 5 | Vega | `artifact_created` | 대본+음성+자막 완성 — script.md, voice.mp3 |
| 8 | 4 | Vega | `tool_call_started` | Remotion 렌더링 중… |
| 9 | 5 | Vega | `artifact_created` | orbit-launch.mp4 렌더 완료 |
| 10 | 4 | (SYS) | `decision_recorded` | ⏸ 창업자 승인 대기: "유튜브 발행?" |
| 11 | 5 | Vega | `status_changed` | 승인됨 — 발행 완료 |
| 12 | 4 | Atlas | `run_finished` | M002 완료 |

선정 이유: InKoEx 실제 일감(Orbit 알리기)이자 videoGen 이식의 예고편(`/vg-story`, Remotion 줄) — 나중에 진짜 videoGen이 Vega 부서에 꽂히면 이 가짜 줄들이 실사건으로 치환된다. 승인 게이트(⏸)는 Company OS 거버넌스 규칙("외부 게시는 사람 승인")의 예고.

## 구성요소 (3개)

### 1. 대본 데이터 — `scripts/workevents/m002.json`
- `{ source: 'fake', runPrefix: 'm002', restSeconds: 5, script: [{ delay, agentName?, type, summary, payload? }, …] }` (위 표 그대로).
- JSON인 이유: 재생기(.mjs)와 jest 테스트(ts-jest ESM)가 모듈 시스템 충돌 없이 `fs`로 같은 파일을 읽는다.
- 대본은 데이터일 뿐 — 재생기·테스트가 공유하는 단일 원본.

### 2. 재생기 — `scripts/workevents/replay.mjs`
- Node 스크립트, 의존성은 기존 `convex` 패키지의 `ConvexHttpClient`만 (매 줄 `npx convex run`을 띄우면 줄당 1~2초 오버헤드 → 직접 클라이언트 호출).
- 배포 URL: `.env.local`의 `VITE_CONVEX_URL` 읽기 (dotenv 없이 파일 파싱 or `process.env` 폴백).
- 흐름: 시작 시 `workEvents:clearSource({source:'fake'})` → 대본 순회(각 줄 delay 대기 후 `workEvents:push`) → 끝나면 5초 대기 → 회차+1 하고 반복.
- 플래그: `--once`(1회 재생 후 종료). 기본은 루프. Ctrl+C로 종료.
- 멱등성: `externalId = \`${RUN_PREFIX}-r${회차}-s${step}\`` — 같은 회차 재실행 시 dedupe. clearSource가 선행되므로 회차 간 충돌 없음.
- 에러 처리: push 실패 시 1회 재시도, 그래도 실패면 콘솔 로그 남기고 다음 줄 진행 (데모가 한 줄 때문에 죽지 않게).
- envelope 채우기: `source:'fake'`, `sourceTimestamp: Date.now()`, `externalRunId: \`${RUN_PREFIX}-r${회차}\``.

### 3. 리셋 mutation — `convex/workEvents.ts`에 `clearSource` 추가
- `args: { source: v.string() }` — 해당 source의 행만 삭제 (다른 소스의 실데이터 보호).
- 인덱스 `sourceExternalId`의 prefix(`source`)로 조회, 반복 삭제. 반환 `{ deleted: number }`.
- push와 동일한 dev 공개 mutation 경고 주석 유지 (공유 배포 전 auth 필수).

## 건드리지 않는 것

- `workEventsContract.ts`(계약), `schema.ts`, `PixiGame.tsx` — 티커는 이미 `◢ ${agentName ?? 'SYS'} · ${summary}`로 그림. **프론트 변경 0줄.**
- AI Town 엔진 — 월드 Frozen 유지. 재생기는 push/clear만 하므로 엔진과 무관.

## 비용

push 12건/회차 + clearSource 12행/회차. 티커 구독(`list`, count 4)은 탭이 열려 있을 때만. Convex I/O 영향 무시 가능 — 스크립트를 끄면 0 (usage-guard 우회 문제와 구조적으로 무관).

## 검증

1. **jest** — `m002.mjs` 대본 전 항목이 계약을 지키는지: type이 어휘 9종에 속함, summary 비어있지 않음, delay ≥ 0, agentName이 있으면 iso 캐스트(Nova·Orion·Vega·Lyra·Atlas·Iris) 중 하나. (계약 어휘 목록은 테스트에서 `workEventsContract.ts`와 동기 — 하드코딩 복제 금지, validator에서 추출 가능한 형태로.)
2. **실전(브라우저 실증 원칙)** — 재생기 켜고 Playwright MCP 스크린샷으로 티커에 M002 줄이 순서대로 흐르는 것 확인. `--once` + `clearSource` 동작(이전 회차가 안 섞임)도 확인.

## 이후 (이 슬라이스 밖)

- ② 아바타 연기 매핑: 이 대본의 `{agentName, type}`이 안무가(choreographer)의 입력. Frozen-전시 안무 아키텍처(avatar-system-plan 부록 A) 참조.
- B안(진짜 최소 Company OS): 전시가 설득력 있으면 착수 — 그때 이 재생기의 자리에 SQLite events→push 어댑터가 들어온다.
