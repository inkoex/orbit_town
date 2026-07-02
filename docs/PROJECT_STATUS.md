# 프로젝트 라이브 상태 (먼저 읽기)

> 다음 세션이 **가장 먼저 읽는** 문서. "지금 어디 / 다음 한 칸 / 열린 실타래."
> 설계·플랜 상세 → `docs/superpowers/specs/`, `docs/superpowers/plans/`.
> 전략/사용자 fact → `~/.claude` 메모리.
> 갱신 주기: 결정 나는 순간 + 세션 마무리.

## 지금 (2026-07-01)

- 브랜치: `feat/iso-vertical-slice`
- **UI 셸 리디자인 완료** (HEAD `41d067b`): 풀블리드 HUD 오버레이 — iso 지도가 전체 뷰포트를 채우고, 헤더·하단바·에이전트 패널이 반투명 유리(backdrop-blur)로 그 위에 떠 있음. CSS Grid 분할 제거(`d52aa3f`), 브라운→`ink` rename + Noto Sans KR 한글 폰트(`a9921e6`/`fee8f53`). **후속 수정들:** 넓은 모니터 1536px 캡 버그 수정(`.container` 제거, `944f45f`), `useElementSize`→**ResizeObserver**로 교체(창/레이아웃 변화에 자동 fit, `b883ef5`), 헤더-패널 충돌 수정(좁은 창, `6b5302d`), **하단 툴바 + 에이전트 만들기 버튼 + 패널 안내문까지 시안-온-글라스로 통일**(`10c8ea4`/`41d067b`). 롤백 태그 `pre-ui-shell-redesign`. 브라우저 검증(1200↔2200↔900 리사이즈, 좁은폭 헤더, 버튼 틴트) + tsc/147테스트/빌드 전부 그린.
  - **알려진 잔여 이슈(스코프 밖):** AgentCreator 아바타 프리뷰에 체크무늬(텍스처 로딩 문제로 보임, 기존부터 있던 듯). 대화 액션 버튼(Start conversation/Accept/Reject/Leave/닫기 X)은 아직 옛 `.button`+`bg-clay-700` 스타일(대화 참여 중에만 뜸) — 통일 원하면 나중에. 5색 에이전트 칩은 시안 단계 아이디어일 뿐 미연결. "슬라이딩 패널"은 고정 오픈(장식 핸들만).
  - **주의:** GStack Browser(= `browse --headed`, 내 자동화 브라우저)가 검증 때마다 실제 창으로 뜸 → 사용자 화면에 "낡은 창"으로 섞여 혼란 유발했음. 판단은 사용자 평소 Chrome에서. HMR 구조변경 후엔 하드 리로드 필요할 수 있음(ResizeObserver로 상당 부분 완화됨).
- **아바타 슬라이스 1+2 완료**: Kenney Mini 렌더 파이프라인 → 테마-aware Asset Contract → 게임 연결(슬라이스1 `01a78ae`). **슬라이스2(`7baa6c9`/`3430bb7`/`d687232`): 12종 전부 렌더(`iso-agent-1..12`, `avatar-choices.png` 참조) + `AVATAR_REGISTRY`/`isoCharacters` 등록 + 6명에 색 구분 캐스팅**(Nova흰/Orion회/Vega노랑/Lyra빨강/Atlas초록/Iris퍼플). **재시드 없이** `recastAvatars:recast`로 `playerDescriptions.character` 6행만 패치(reactive→즉시 반영, 월드 Frozen 유지, ~6 write). 클라우드 dev에 적용 완료(patched 6/6). 4방향 워크 정상, iso 3/4 뷰, 발밑 glow.
  - **yaw 방향 버그 수정**(`f9cafc6`): 첫 렌더는 `extract.sh`가 render.html yawOffset(-45)을 0으로 덮어써 아바타가 진행방향 대비 45° 틀어짐. YAW_OFFSET=-45로 12개 재렌더 + extract.sh 기본값 -45로 수정. (DIRS=(sw se ne nw) 기준 -45가 정답.)
  - **맵/HUD 후속 수정**: iso 기본 배율 fit(`c338eec`, 콘텐츠 중심+화면 채움+좌하단 여백 제거), 하늘 가로줄 제거(`1d48259`, 히트-렉트 alpha 엣지→hitArea).
  - **우주 배경(별필드) 폴리시**(`83c3e11`→`fc0d368`→`d782399`): 원래 CSS radial 점 4개(우연처럼 보임)를 → `.game-starfield`(`src/index.css`)에 별 ~190개(밝기/색 다양, 밝은 별 glow) + 성운 워시 4개 + **달(좌상단)·행성(좌하단)** 셰이딩 구체로. 화면 고정 CSS(투명 PIXI 캔버스 뒤에 painted), 비용 0. 원인은 코덱스가 Game.tsx 인라인 스타일에서 찾음(내가 index.css만 뒤져 놓침). 생성기: scratch `genstars4.mjs`(별/천체 수치 조정 지점). 검증은 실측 2560×1340 독립 렌더(PIXI 크래시로 인앱 스샷 불가).
- **대화 페이싱 튜닝** (`16154bb`): `convex/constants.ts` — 대화 빈도↓·메시지 텀↑·대화 길이↓. 배포됨.
- **LLM 복구**: OpenAI 잔고 0이던 게 원인(agents 동결) → $30 충전으로 정상. Convex 쿼터/write-conflict 아니었음.
- 모션 폴리시 완료 (`b9d27fa`).

## 다음 한 칸 (resume 시)

**🔑 큰 방향 결정 (2026-07-01, 먼저 읽기):** [대화 레이어 결정](design/2026-07-01-conversation-vs-work-layer.md) — 아바타 LLM 잡담은 AI Town의 코어지만 InKoEx엔 **전시/유휴 레이어일 뿐**. 결론: **잡담은 캔드/템플릿으로 (~$0), 진짜 "대화"=작업 협업은 실제 에이전트 채널에**, 화면은 실제 사건 시각화. 이게 비용 실타래(nano·쿨다운·Convex쿼터)의 **근본 레버** — "애초에 그 LLM 대화를 안 하는 것". 구현 체크리스트는 그 문서에. (Obsidian 사본도 있음)

**비용/인프라 현황:** 모델 nano 전환(env), 쿨다운 3분, **Convex Free plan 초과 → 월드 수동 Freeze로 출혈 정지 중**. 로컬 Convex+Ollama는 "GPU 이미 소유 시에만 무료" — 개인용(내 맥)=로컬 유리, VPS 서비스화=nano API가 오히려 쌈(GPU VPS 비쌈). 근데 위 대화-레이어 결정이 서면 이 비용 문제 자체가 크게 줄어듦.

**UI 셸 잔여(선택):** 체크무늬 아바타 프리뷰 원인 확인, 슬라이딩 패널 실제 여닫기, 5색 에이전트 칩 데이터 연결.

**슬라이스 2 완료** (위 "지금" 참조). 12종 렌더+등록+캐스팅+yaw수정 다 끝. 재시드 대신 `recastAvatars:recast`(playerDescriptions 6행 패치)로 클라우드 반영. **남은 선택지:**
- 캐스팅 조합 바꾸고 싶으면 `data/characters.ts` `isoDescriptions` + `convex/recastAvatars.ts` CAST 맵 수정 후 재실행(재렌더 불필요).
- 완전 무료화 원하면 로컬 Convex 이전(아래 열린 실타래) — 그때 정식 재시드.

## 열린 실타래 / 주의

- **LLM 비용 목표 = ₩10k/월·10 agents.** OpenAI($30 충전) + cadence 튜닝으로 당분간 OK. **완전 무료 엔드게임 = 로컬 Convex(`convex dev --local`) + 로컬 Ollama** — Ollama 이미 설치됨(`gemma4` 9.6GB 있음), **`nomic-embed-text` 임베딩 모델만 추가 pull 필요**. 클라우드 Convex는 로컬 Ollama에 못 닿으니 로컬 Convex 필수(= Convex 쿼터도 동시 해결). 별도 세션.
- **모델 티어링**(유휴=초저가/로컬, 작업=좋은 모델)이 비용 핵심 레버 — 사업 노트와 일치. `~/.claude` 메모리 `project-orbit-business-thesis`.
- Convex write-conflict(engines/worldStatus) = AI Town 단일-핫-문서 패턴, 지금 무해. 상용화 시 병목.
- 렌더 툴 `browse --headed` 필수. dev 서버 `npm run dev:frontend -- --port 5180`(NeoTrader 5173 점유).

## 최근 결정 (상세는 스펙)

- 아바타 = Kenney Mini(CC0, 12캐릭터) + 렌더 파이프라인 + 테마-aware Asset Contract. 스펙 `docs/superpowers/specs/2026-06-30-avatar-identity-design.md`.
- 세계관 = 코스메틱 축(비전; 이번 빌드는 스페이스 한정). `~/.claude` 메모리 `project-orbit-cosmetic-worldview-axis`.
