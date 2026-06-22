# 설계: Convex 저장 안정화

**날짜:** 2026-06-23
**상태:** 검토 대기
**선행 작업:** 감성·시각 레이어 A, iso-ready UI redesign

---

## 1. 배경

현재 AI Town 엔진은 약 1초마다 전체 `worlds` 문서를 교체하고, 에이전트 예약 작업에 직렬화된 전체 맵을 전달한다. 실제 개발 배포에서 약 7시간 실행 후 Convex Database Storage가 1.33GB에 도달해 Free 플랜 한도 512MB를 초과했다.

이번 작업은 Convex를 제거하거나 게임 엔진을 재작성하지 않는다. 고빈도 화면 갱신 데이터와 복구용 영속 상태를 분리해, 현재 프로토타입을 Free 플랜에서 반복 개발할 수 있는 수준으로 저장 증가율을 낮춘다.

## 2. 목표

> 6개 AI 에이전트와 1개 사용자 캐릭터를 1시간 실행했을 때 Database Storage 증가량을 20MB 이하로 제한하면서, 화면 이동과 대화가 기존과 동일하게 동작한다.

목표는 다음 세 가지다.

1. 전체 world 상태 저장 빈도를 30초 단위 체크포인트로 낮춘다.
2. 화면 렌더링에 필요한 작은 상태만 1초 단위로 갱신한다.
3. 예약 작업과 입력 로그에서 불필요한 대형 payload와 장기 보존을 제거한다.

## 3. 범위

### 포함

- 전체 world 체크포인트와 실시간 렌더 스냅샷 분리
- 렌더 스냅샷 테이블 및 reactive query
- `agentDoSomething` 예약 인자에서 전체 map/player 배열 제거
- action 실행 시 `worldId`와 ID로 최신 상태 조회
- 처리 완료된 `inputs`의 짧은 보존 및 배치 삭제
- 개발 배포 연속 실행 안전장치와 사용량 측정 절차
- 기존 메시지·기억·대화 기능 회귀 테스트

### 제외

- 에이전트별 완전한 문서 분할
- 이벤트 소싱
- Convex 제거 또는 다른 DB로 이전
- 멀티테넌시
- 실제 아이소메트릭 렌더링
- 사용자 메시지와 장기 기억의 임의 삭제

## 4. 데이터 분류

### 4.1 복구용 영속 상태

`worlds`는 엔진 재시작에 필요한 권위 상태다. 플레이어, 에이전트, 대화, pathfinding, activity를 포함하되 렌더 보간용 `historicalLocations`는 포함하지 않는다.

- 저장 주기: 30초
- 중요한 구조 변경 시 즉시 저장: 플레이어 참가·퇴장, 에이전트 생성·삭제, 대화 생성·종료
- 장애 시 허용 손실: 최대 30초의 이동·활동 진행 상태

### 4.2 렌더 스냅샷

새 `worldRenderStates` 테이블은 화면에 필요한 최소 데이터만 보관한다. world마다 문서 하나만 유지한다.

```typescript
type WorldRenderState = {
  worldId: Id<'worlds'>;
  engineGeneration: number;
  simulationTime: number;
  players: Array<{
    playerId: string;
    position: { x: number; y: number };
    facing: { dx: number; dy: number };
    speed: number;
    activity?: { description: string; emoji?: string; until: number };
    historicalLocation?: ArrayBuffer;
  }>;
  typingPlayerIds: string[];
  thinkingPlayerIds: string[];
};
```

- 갱신 주기: 1초
- 최초 스냅샷은 `insert`, 이후에는 변경 필드만 `patch`
- `patch`도 Convex 문서 revision을 생성하므로 갱신 방식 자체를 저장량 해결책으로 간주하지 않음
- 저장량 제한의 핵심은 world당 문서 1개, 고정된 필드, map·대화·기억을 제외한 작은 payload 유지
- map, description, plan, identity, conversation transcript는 포함하지 않음
- 프론트엔드는 권위 world 데이터와 렌더 스냅샷을 결합
- 오래된 engine generation의 스냅샷은 무시

### 4.3 입력과 예약 작업

- `agentDoSomething` 인자에는 `worldId`, 작은 player/agent 상태, `operationId`만 전달
- map과 대화 후보 목록은 action이 실행될 때 internal query로 조회
- operation 완료 시 기존 `operationId` 검증을 유지해 오래된 결과를 거부
- 처리된 `inputs` 중 `engine.processedInputNumber` 이하인 문서만 1시간 후 배치 삭제
- `messages`, `memories`, `memoryEmbeddings`는 이번 작업에서 보존 정책을 바꾸지 않음

## 5. 런타임 흐름

```text
[30초 Action 루프]
  ├─ 16ms simulation tick (메모리)
  ├─ 1초마다 compact render state 저장
  ├─ 중요한 이벤트 발생 시 full checkpoint 저장
  └─ action 종료 시 full checkpoint 저장

[React/PixiJS]
  ├─ world 권위 상태 query
  ├─ worldRenderState reactive query
  └─ historicalLocation으로 화면 보간
```

체크포인트 저장에 실패하면 다음 action을 시작하지 않고 오류를 기록한다. 렌더 스냅샷 저장 실패는 한 번 재시도하고, 실패가 계속되면 전체 체크포인트를 저장한 뒤 엔진을 중지한다.

## 6. 개발 안전장치

- `CONVEX_USAGE_GUARD=true`인 개발 배포에서는 연속 60분 실행 후 world를 자동 freeze
- UI에 남은 개발 실행 시간을 표시하지 않음. 로그에만 정지 이유 기록
- 수동 unfreeze 시 새로운 60분 구간 시작
- production에서는 기본 비활성화
- 로컬 Convex 실행 절차를 README에 우선 경로로 기록

안전장치는 구조 최적화를 대신하지 않으며, 무인 브라우저 방치로 인한 재발만 방지한다.

## 7. 마이그레이션

1. 배포 전 현재 데이터를 export한다.
2. `worldRenderStates` 테이블을 추가한다.
3. 기존 `worlds.historicalLocations`는 optional로 유지해 구버전 데이터를 읽는다.
4. 첫 새 체크포인트부터 `historicalLocations`를 제거한다.
5. 프론트엔드가 새 render state를 사용한 뒤 구버전 fallback을 제거한다.

기존 사용자 메시지, 기억, 캐릭터 설명은 삭제하지 않는다.

## 8. 검증 기준

### 자동 검증

- 체크포인트 주기 테스트
- 중요한 이벤트의 즉시 체크포인트 테스트
- 렌더 스냅샷 validator 및 generation 무효화 테스트
- compact agent operation 인자 테스트
- 처리된 input vacuum 테스트
- 기존 Jest 전체 테스트, TypeScript, production build

### 통합 검증

1. 데이터 초기화 후 6개 에이전트와 사용자 1명으로 60분 실행
2. 이동·대화·기억·freeze/unfreeze 확인
3. 시작 전후 Convex Usage와 export 크기 기록
4. Database Storage 증가량 20MB 이하 확인
5. 정기 `saveWorld` 전체 체크포인트 호출이 시간당 120회를 넘지 않는지 확인하고, 이벤트 체크포인트는 별도 집계
6. map 객체가 scheduled function 인자에 포함되지 않는지 확인

## 9. 성공 및 중단 조건

다음 조건을 모두 충족해야 아이소 수직 조각 작업으로 넘어간다.

- 60분 저장 증가량 20MB 이하
- 사용자 이동과 AI 이동이 끊기지 않음
- 대화와 기억 기능 회귀 없음
- 브라우저 종료 후 5분 내 world 정지
- 개발 사용량 가드가 60분에 작동

저장 증가량이 20MB를 넘으면 아이소 작업을 시작하지 않고 테이블별 증가 원인을 다시 측정한다.
