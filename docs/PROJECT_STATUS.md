# 프로젝트 라이브 상태 (먼저 읽기)

> 다음 세션이 **가장 먼저 읽는** 문서. "지금 어디 / 다음 한 칸 / 열린 실타래."
> 설계·플랜 상세 → `docs/superpowers/specs/`, `docs/superpowers/plans/`.
> 전략/사용자 fact → `~/.claude` 메모리.
> 갱신 주기: 결정 나는 순간 + 세션 마무리.

## 지금 (2026-07-05) — 아바타 생성 파이프라인 스킬화 + 감사

- 브랜치 `feat/iso-vertical-slice`. 커밋: `07a69d6`(코드리뷰 정확성 9건) → `297efd7`(orbit-avatar 스킬 초판+락된 베이스+형제 6종) → **이번 세션 감사·수정·리그포즈는 이 커밋에 담김.**
- **`orbit-avatar` 스킬 확립** (`.claude/skills/orbit-avatar/`): Codex `image_gen`(네이티브, API키 불필요)으로 온-모델 아바타를 찍어내는 **재현 절차.** 락된 베이스(`Bspec-1-transparent`, 머리 43%·w/h 0.58)에 앵커 → 가족 락(비율·콤팩트 실루엣·빈 바이저+시안 눈·크림 트림) 유지 → 역할·색·성별만 변주. **성별=실루엣 코딩(색 독립)**, 단색/멀티컬러 색 원칙, 앞+뒤 멀티뷰, 리그포즈. `scripts/verify-avatar.py`가 투명·그림자·비율을 **exit code로 게이트.**
- **파이프라인 감사 완료** (Codex + Fable 5 독립 교차, 실증 포함) → `verify-avatar.py` 재작성으로 진짜 버그 7개 전부 수정·재검증. 상세 = [avatar-pipeline-audit](design/2026-07-05-avatar-pipeline-audit.md). 핵심: 가드가 exit 0라 게이트 못 하던 것, 비-RGBA 비율 오측(크림 트림), 넓은 그림자 미검출, PNG 서브셋 미검증 등. **사용자가 감사 돌리자 한 판단이 옳았음** — 내가 넘긴 비율 오측이 실제 버그였음.
- **리그포즈 교훈** (스킬에 박힘): Tripo 오토리깅엔 **디스플레이 포즈(팔 내림) ≠ 입력.** 팔을 A포즈로 벌려 **겨드랑이 열기**(안 그러면 팔↔몸통 융합→팔 들면 몸통 딸려옴), 다리 벌리되 짧게, **손은 자연스럽게(벌린 손가락·뭉툭 nub 아님)**, Tripo 리그 모델은 **휴머노이드(Animals 아님)**. 좀비 리깅작업은 새 세션으로 우회.
- **Tripo 리깅 현재 서버 장애** (Discord 다수 컴플레인 확인 — 우리 문제 아님). 그래서 **Meshy.ai vs Tripo 꼼꼼 비교**(Codex+웹, 출처 有): 서류상 절대승자 없음, 우리 극단 치비를 **누가 깨끗이 리깅하느냐**로 갈리며 그건 **실측 A/B로만** 결정. Meshy=문서화된 API·애니 라이브러리·예측가능 크레딧(~38), Tripo=스타일라이즈드 HD·애니 라이브러리 보유(웹 일부 주장은 오류, 사용자 스크린샷이 반증). **A/B 재료 = 의사 리그포즈 앞+뒤**(Tripo 복구 시 or Meshy 지금).
- **🔑 구조적 통찰 + 채택 철학:** 텍스트→이미지는 확률적·비합성적이라 **비율이 목표를 중심으로 진동**(40.6%↔51% 실측), 프롬프트로 픽셀-정확 일관성 **불가**(가이드라인 다듬기 수익 체감). → **진짜 일관성은 3D 베이스 하나 확립 후 재사용**(헬멧·옷·색만 교체=같은 지오메트리=드리프트 불가) 레이어에 속함. 2D 리퍼런스는 **밴드 안(≈42–46%) 미세 변동을 "손맛"으로 수용**(가족감=공유 스타일·얼굴·팔레트, 픽셀-동일 아님), **마감·색만 브랜드로 고정.** 검증 게이트 = 매력의 밴드 지킴이.
- **에셋:** 캐논 베이스 앞/뒤 + 형제(engineer·comp-sci·teal·red·office-manager·female-rose·doctor). 매니저·의사 **리그포즈** 앞/뒤 검증 통과분 보관, 중간 삽질본은 정리.

## 지금 (2026-07-01)

- 브랜치: `feat/iso-vertical-slice`
- **UI 셸 리디자인 완료** (HEAD `41d067b`): 풀블리드 HUD 오버레이 — iso 지도가 전체 뷰포트를 채우고, 헤더·하단바·에이전트 패널이 반투명 유리(backdrop-blur)로 그 위에 떠 있음. CSS Grid 분할 제거(`d52aa3f`), 브라운→`ink` rename + Noto Sans KR 한글 폰트(`a9921e6`/`fee8f53`). **후속 수정들:** 넓은 모니터 1536px 캡 버그 수정(`.container` 제거, `944f45f`), `useElementSize`→**ResizeObserver**로 교체(창/레이아웃 변화에 자동 fit, `b883ef5`), 헤더-패널 충돌 수정(좁은 창, `6b5302d`), **하단 툴바 + 에이전트 만들기 버튼 + 패널 안내문까지 시안-온-글라스로 통일**(`10c8ea4`/`41d067b`). 롤백 태그 `pre-ui-shell-redesign`. 브라우저 검증(1200↔2200↔900 리사이즈, 좁은폭 헤더, 버튼 틴트) + tsc/147테스트/빌드 전부 그린.
  - **알려진 잔여 이슈(스코프 밖):** AgentCreator 아바타 프리뷰에 체크무늬(텍스처 로딩 문제로 보임, 기존부터 있던 듯). 대화 액션 버튼(Start conversation/Accept/Reject/Leave/닫기 X)은 아직 옛 `.button`+`bg-clay-700` 스타일(대화 참여 중에만 뜸) — 통일 원하면 나중에. 5색 에이전트 칩은 시안 단계 아이디어일 뿐 미연결. "슬라이딩 패널"은 고정 오픈(장식 핸들만).
  - **주의:** GStack Browser(= `browse --headed`, 내 자동화 브라우저)가 검증 때마다 실제 창으로 뜸 → 사용자 화면에 "낡은 창"으로 섞여 혼란 유발했음. 판단은 사용자 평소 Chrome에서. HMR 구조변경 후엔 하드 리로드 필요할 수 있음(ResizeObserver로 상당 부분 완화됨).
- **아바타 슬라이스 1+2 완료**: Kenney Mini 렌더 파이프라인 → 테마-aware Asset Contract → 게임 연결(슬라이스1 `01a78ae`). **슬라이스2(`7baa6c9`/`3430bb7`/`d687232`): 12종 전부 렌더(`iso-agent-1..12`, `avatar-choices.png` 참조) + `AVATAR_REGISTRY`/`isoCharacters` 등록 + 6명에 색 구분 캐스팅**(Nova흰/Orion회/Vega노랑/Lyra빨강/Atlas초록/Iris퍼플). **재시드 없이** `recastAvatars:recast`로 `playerDescriptions.character` 6행만 패치(reactive→즉시 반영, 월드 Frozen 유지, ~6 write). 클라우드 dev에 적용 완료(patched 6/6). 4방향 워크 정상, iso 3/4 뷰, 발밑 glow.
  - **yaw 방향 버그 수정**(`f9cafc6`): 첫 렌더는 `extract.sh`가 render.html yawOffset(-45)을 0으로 덮어써 아바타가 진행방향 대비 45° 틀어짐. YAW_OFFSET=-45로 12개 재렌더 + extract.sh 기본값 -45로 수정. (DIRS=(sw se ne nw) 기준 -45가 정답.)
  - **맵/HUD 후속 수정**: iso 기본 배율 fit(`c338eec`, 콘텐츠 중심+화면 채움+좌하단 여백 제거), 하늘 가로줄 제거(`1d48259`, 히트-렉트 alpha 엣지→hitArea).
  - **우주 배경(별필드) 폴리시**(`83c3e11`→`fc0d368`→`d782399`): 원래 CSS radial 점 4개(우연처럼 보임)를 → `.game-starfield`(`src/index.css`)에 별 ~190개(밝기/색 다양, 밝은 별 glow) + 성운 워시 4개 + **달(좌상단)·행성(좌하단)** 셰이딩 구체로. 화면 고정 CSS(투명 PIXI 캔버스 뒤에 painted), 비용 0. 원인은 코덱스가 Game.tsx 인라인 스타일에서 찾음(내가 index.css만 뒤져 놓침). 생성기: scratch `genstars4.mjs`(별/천체 수치 조정 지점). 검증은 실측 2560×1340 독립 렌더(PIXI 크래시로 인앱 스샷 불가).
- **Antigravity 레퍼런스 폴리시 4팩 완료 (2026-07-02, `549e534`→`12dcf3b`)**: 사용자가 원본 영감 이미지(Google Antigravity iso 데모)를 주고 "지금 단계 폴리시 총정리" 요청 → 4팩 전부 선택·구현.
  - **①생동감**(`549e534`): 아바타 **이름칩**(발밑) + **말풍선**(머리 위, 시안 이름 헤더+글로우 패널+꼬리). 우선순위 타이핑 `···` > 실제 대화 최신 메시지(참여 중일 때만 `listMessages` 구독, 백엔드 변경 0) > 유휴 활동 이모지. 페이드는 티커 기반(12s/3s), `VITE_ISO_BUBBLE_DEBUG`로 Frozen 상태 검증 가능. 순수 로직 `bubble.ts`+테스트.
  - **②구조감**(`bd248cf`): 플랫폼 **슬라브 압출 64px**(좌우 셰이딩 측면) + 아래 **부유 글로우 풀** + 전면-좌 측면 **엣지 명판**(빌보드 skew 기법). 바닥 대문자 라벨은 은은하게.
  - **③소품**(`3b636f9`): 글로잉 라운드 **테이블+스툴 4개**, EVENT에 **CLI 콘솔 블록**(`CLI >_` 터미널그린, 작업 레이어 예고) + 회전 **홀로 와이어프레임 큐브**(`holoCube.ts` 순수수학+테스트). 빌보드: **AGENTS ONLINE 실카운트** + 컬러 글리프 모자이크. 전부 procedural Graphics, sortableChildren에서 캐릭터와 정상 occlusion.
  - **④디테일**(`12dcf3b`): 달 **크레이터 4개**(calc 오프셋, 독립 렌더로 확인), 바닥 라벨 **줌 반응 페이드**(`ZoomFade`+`remapClamped` 테스트), PlayerDetails 대화 버튼 **hud-btn 글라스 통일**(브라운 JRPG 잔재 제거), AgentCreator **체커보드 프리뷰 원인 수정**(placeholder f1 시트 → iso 정면 idle PNG 13종, `getIsoAvatarPreviewUrl` 테스트).
  - 검증: tsc 클린, **jest 163**(+16 신규), vite build OK. **🔑 인앱 픽셀 검증 = Playwright MCP로 가능해짐**(`mcp__playwright__browser_navigate`+`take_screenshot` — gstack browse는 PIXI Stage에서 크래시하지만 Playwright Chromium은 정상 렌더). 이걸로 4팩 전부 + 말풍선(전용 포트에서 `VITE_ISO_BUBBLE_DEBUG=true`로 6개·한국어 줄바꿈까지) + 줌 페이드까지 **스크린샷으로 직접 확인 완료**. 사용자 눈검증은 하드리로드로 이중확인.
- **대화 페이싱 튜닝** (`16154bb`): `convex/constants.ts` — 대화 빈도↓·메시지 텀↑·대화 길이↓. 배포됨.
- **LLM 복구**: OpenAI 잔고 0이던 게 원인(agents 동결) → $30 충전으로 정상. Convex 쿼터/write-conflict 아니었음.
- 모션 폴리시 완료 (`b9d27fa`).

## 다음 한 칸 (resume 시)

**🔑 큰 방향 결정 (2026-07-01, 먼저 읽기):** [대화 레이어 결정](design/2026-07-01-conversation-vs-work-layer.md) — 아바타 LLM 잡담은 AI Town의 코어지만 InKoEx엔 **전시/유휴 레이어일 뿐**. 결론: **잡담은 캔드/템플릿으로 (~$0), 진짜 "대화"=작업 협업은 실제 에이전트 채널에**, 화면은 실제 사건 시각화. 이게 비용 실타래(nano·쿨다운·Convex쿼터)의 **근본 레버** — "애초에 그 LLM 대화를 안 하는 것". 구현 체크리스트는 그 문서에. (Obsidian 사본도 있음)

**🔑 Paperclip AI 연동 검토 (2026-07-03, 정독 권장):** [paperclip-integration](design/2026-07-03-paperclip-integration.md) — Paperclip(오픈소스 에이전트 조직도 오케스트레이터, activity 감사로그, 로컬 Node)이 **CrewAI로 지으려던 작업 레이어의 강력한 기성품 후보.** Claude 웹조사 + Codex 교차검증 결론: **전면교체 X → 중립 workEvents 계약 먼저(직접 emitter로 첫 슬라이스), Paperclip은 source adapter 하나로(폴링+커스텀어댑터, DB직접 금지).** 아웃바운드 웹훅 미지원(폴링), durable log ≠ workflow runtime(LangGraph 트리거 별도 유지), **Paperclip이 이미 관리 UI 보유 → Orbit 정체성=관리콘솔 아닌 "전시"로 날카롭게.** work-layer-stack의 CrewAI 결정은 이 검토로 재프레이밍됨.

**🔑 작업 레이어 스택 확정 (2026-07-02):** [work-layer-stack](design/2026-07-02-work-layer-stack.md) — **CrewAI 먼저(슬라이스 1~2, 최속 검증) → LangGraph는 계획된 이주**(트리거 4: 분기 표현 한계·HITL·체크포인트·에러 세분화 — 네오트라 트레이딩은 빨리 칠 것으로 예상). 오래가는 자산 = **프레임워크 중립 이벤트 계약**(`workEvents`→Convex→아바타), 어댑터만 교체. 철칙: 계약 먼저 정의 + crew에 분기 욱여넣지 않기. 다음 할 일 = 이벤트 계약 30분 설계 → 가짜 제너레이터 → CrewAI 교체.

**🔑 코어 첫 벽돌 (2026-07-06): 중립 workEvents 계약 가동.** `convex/workEventsContract.ts`(어휘 9종+봉투 검증기, 스키마·함수가 공유) + `workEvents` 테이블(글로벌 sequence, source+externalId 인덱스) + `push`(externalId 멱등 dedupe 실측 확인)/`list`(bounded). 표현 배선 = PixiGame이 `list` 구독 → **빌보드 티커에 실이벤트 표시** (`◢ NOVA · ORBIT 주간 리포트 분석 배정` 인앱 스크린샷 확인). **이음새로 진짜 신호가 처음 통과** — 06-27 가설 검증의 인프라 완성. 다음: 가짜 제너레이터(이벤트 시퀀스 재생) → 아바타 연기 매핑(티커 너머), 그다음 실소스(Claude Code 훅 등) 평가. push는 dev 공개 mutation(공유 배포 전 auth 필수, 파일 주석 참조).

**다음 한 칸 업데이트 (2026-07-05):** 아바타 생성은 **`orbit-avatar` 스킬로 재현 가능**해졌고(찍어내면 됨), 3D 라스트마일만 **Tripo 리깅 서버 복구 or Meshy A/B** 대기(재료=의사 리그포즈 앞+뒤). 아바타는 "언제든 뽑는" 상태라 **본선은 여전히 코어(이벤트 계약)**. 아래 07-03 항목이 그대로 다음 칸.

**다음 한 칸 (2026-07-03 마감 기준):** ① 강의 마무리 → **이벤트 계약 30분 설계 → 가짜 제너레이터 슬라이스** (본선. 이거면 "빈깡통" 탈출) ② 표정 오버레이 MVP(반나절, 순수 프론트 — 계획 §3 표 참조) ③ 로봇 발밑 원판 제거(Tripo Segment 1회). 파이프라인 후속: **자동 키 캘리브레이션 추가됨**(`8649ef9`, HEIGHT_SCALE=auto — 수동 노브는 YAW_OFFSET만 남음), 표정=오버레이/소품=베이크소켓 결정(`8b1b7a4`), 라이팅 규칙 교정(`d08beb8`, 하드 스펙큘러만 금지·확산광 유지).

**🔑 Phase 0b 스파이크 통과 (2026-07-03, `e39d825`→`a61f765`):** 이미지→Tripo(생성·리깅·걷기)→베이크→**게임 내 4방향 보행까지 end-to-end 성공.** 첫 Tripo 아바타 `robot-analyst`가 Lyra로 캐스팅돼 맵에 있음. 베이크 파이프라인이 모델-불문화됨(가시메시 정규화·root motion 제거·몸통뼈 x/z 센터링·WALK_LEN=한 보행주기·YAW_OFFSET 모델별). **시행착오 전체 기록 = 계획 문서 부록 C** (입력 이미지 규칙: 투명배경·무그림자·무반사·빈손 A포즈·4방향 키 동일 등). 남은 것: 발밑 원판 제거(Tripo Segment)·팔 스윙 프리셋. 실행 절차 = `tools/avatar-render/RUNBOOK.md`.

**🔑 아바타 시스템 계획 v2 확정 (2026-07-02):** [avatar-system-plan](design/2026-07-02-avatar-system-plan.md) — 4-AI 교차검증안(v1)을 프로젝트 접합 리뷰로 수정. 핵심: **D0 런타임 유지**(PixiJS+베이크, R3F는 트리거 3개 시), 규모 50/100, **Phase 1 게이트 = 작업 레이어 첫 슬라이스 선행**. **부록 A = Frozen-전시 안무 아키텍처**(Codex 교차검증 합의: worldState 구독/heartbeat 절단이 본질, 절대시간 슬롯 결정론, VisualAgent 분리, 검증=Frozen 30분 I/O 무증가). Phase 0a(IdleChoreographer MVP)가 그 검증 겸용. Obsidian 동기화됨. **팀 확장 = 한 세계·팀=섬 추가**, 세계관 교체는 코스메틱 축 별개.

**비용/인프라 현황:** 모델 nano 전환(env), 쿨다운 3분, **Convex Free plan 초과 → 월드 수동 Freeze로 출혈 정지 중**. 로컬 Convex+Ollama는 "GPU 이미 소유 시에만 무료" — 개인용(내 맥)=로컬 유리, VPS 서비스화=nano API가 오히려 쌈(GPU VPS 비쌈). 근데 위 대화-레이어 결정이 서면 이 비용 문제 자체가 크게 줄어듦.
- **⚠️ 7월 DB I/O 재초과 사후분석 (07-02)**: 7월 창 리셋 후 1.5일 만에 1.72GB/1GB. 원인 = **`CONVEX_USAGE_GUARD` env var 미설정으로 1시간 자동-Freeze 가드가 계속 꺼져 있었음**(main.ts:111이 env 게이트) + 07-01 저녁 아바타 확인차 unfreeze 후 ORBIT STATION 탭 상시 오픈(하트비트가 lastViewed 갱신→5분 idle-stop 미발동) → 엔진이 수 시간 연속 가동(스텝 1s마다 월드 doc read+write, 30s마다 풀 체크포인트 ≈ 시간당 수백 MB). 어제 폴리시(프론트 전용)·말풍선 구독(Frozen=0)·검증 로드는 무관. **조치: `CONVEX_USAGE_GUARD=true` 설정 완료** → 이제 unfreeze해도 최대 1h 후 자동 freeze. 이번 달은 I/O 이미 초과라 Freeze 유지가 기본, 구경은 짧게.

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
