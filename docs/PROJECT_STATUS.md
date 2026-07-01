# 프로젝트 라이브 상태 (먼저 읽기)

> 다음 세션이 **가장 먼저 읽는** 문서. "지금 어디 / 다음 한 칸 / 열린 실타래."
> 설계·플랜 상세 → `docs/superpowers/specs/`, `docs/superpowers/plans/`.
> 전략/사용자 fact → `~/.claude` 메모리.
> 갱신 주기: 결정 나는 순간 + 세션 마무리.

## 지금 (2026-07-01)

- 브랜치: `feat/iso-vertical-slice`
- **UI 셸 리디자인 완료** (HEAD `d52aa3f`): 풀블리드 HUD 오버레이 — iso 지도가 전체 뷰포트를 채우고, 헤더·하단바·에이전트 패널이 반투명 유리(backdrop-blur)로 그 위에 떠 있음. `App.tsx`/`Game.tsx`의 CSS Grid 분할 제거(캔버스가 이제 진짜 전체 화면 측정). 브라운 색상 잔재 전부 정리(`brown`→`ink` rename, 값은 원래도 그래파이트였음), 한글 폰트 `Noto Sans KR`로 수정(전에는 전역 모노스페이스). 롤백 태그 `pre-ui-shell-redesign`. 브라우저 검증: 캔버스 `getBoundingClientRect`=전체 뷰포트, pointer-events 클릭 통과 확인, 콘솔 에러 0, tsc/147테스트/빌드 전부 그린.
  - **알려진 잔여 이슈(스코프 밖):** AgentCreator 아바타 프리뷰에 체크무늬(텍스처 로딩 문제로 보임, 기존부터 있던 듯) — 미확인. 5색 에이전트 칩은 시각 목업 단계에서 나온 아이디어일 뿐 아직 실제 데이터에 안 묶임. "슬라이딩 패널"은 지금 고정 오픈 상태(장식 핸들만, 실제 여닫기 기능 없음).
- **아바타 슬라이스 1 완료 (튜닝 전부 포함)** (`01a78ae`): Kenney Mini 렌더 파이프라인 → 테마-aware Asset Contract → 게임 연결. 6 에이전트 = `iso-agent`(같은 캐릭터). 4방향 워크 정상, iso 3/4 뷰, 크기=반칸(128×256), 발밑 glow 확대.
- **대화 페이싱 튜닝** (`16154bb`): `convex/constants.ts` — 대화 빈도↓·메시지 텀↑·대화 길이↓. 배포됨.
- **LLM 복구**: OpenAI 잔고 0이던 게 원인(agents 동결) → $30 충전으로 정상. Convex 쿼터/write-conflict 아니었음.
- 모션 폴리시 완료 (`b9d27fa`).

## 다음 한 칸 (resume 시)

**UI 셸 잔여(선택):** 체크무늬 아바타 프리뷰 원인 확인, 슬라이딩 패널 실제 여닫기 기능화(원하면), 5색 에이전트 칩을 실제 데이터에 연결(슬라이스 2와 자연스럽게 묶일 수 있음).

**다음 — 슬라이스 2 (6명 다른 아바타):**
- 캐릭터당 `./tools/avatar-render/extract.sh "<glb>" <avatarId>` (12종 중 6 선택)
- `AVATAR_REGISTRY` 등록 + `data/characters.ts` `isoDescriptions` 이름 분화(`iso-agent-1..6`) + **Convex 재시드**(쿼터 주의)
- UI 셸을 먼저 끝낸 이유: 순수 프론트엔드라 재시드/쿼터 리스크 0, 방향이 막 확정된 상태에서 바로 landing. 이제 이 리스크 하나만 남음.

## 열린 실타래 / 주의

- **LLM 비용 목표 = ₩10k/월·10 agents.** OpenAI($30 충전) + cadence 튜닝으로 당분간 OK. **완전 무료 엔드게임 = 로컬 Convex(`convex dev --local`) + 로컬 Ollama** — Ollama 이미 설치됨(`gemma4` 9.6GB 있음), **`nomic-embed-text` 임베딩 모델만 추가 pull 필요**. 클라우드 Convex는 로컬 Ollama에 못 닿으니 로컬 Convex 필수(= Convex 쿼터도 동시 해결). 별도 세션.
- **모델 티어링**(유휴=초저가/로컬, 작업=좋은 모델)이 비용 핵심 레버 — 사업 노트와 일치. `~/.claude` 메모리 `project-orbit-business-thesis`.
- Convex write-conflict(engines/worldStatus) = AI Town 단일-핫-문서 패턴, 지금 무해. 상용화 시 병목.
- 렌더 툴 `browse --headed` 필수. dev 서버 `npm run dev:frontend -- --port 5180`(NeoTrader 5173 점유).

## 최근 결정 (상세는 스펙)

- 아바타 = Kenney Mini(CC0, 12캐릭터) + 렌더 파이프라인 + 테마-aware Asset Contract. 스펙 `docs/superpowers/specs/2026-06-30-avatar-identity-design.md`.
- 세계관 = 코스메틱 축(비전; 이번 빌드는 스페이스 한정). `~/.claude` 메모리 `project-orbit-cosmetic-worldview-axis`.
