# 설계: 이소메트릭 수직 조각

**날짜:** 2026-06-23
**상태:** 검토 대기
**선행 조건:** Convex 저장 안정화 검증 통과

---

## 1. 목표

> 생성형 비트맵으로 만든 10×10 우주정거장 방에서 사용자 캐릭터와 AI 에이전트가 실제 게임 상태에 연결되어 이동하고, 오브젝트 앞뒤 관계가 자연스럽게 보이는 2.5D 수직 조각을 만든다.

이번 작업은 디버그 격자를 확장하는 것이 아니라 정상 게임 화면에 실제 아이소메트릭 렌더러를 연결한다.

## 2. 성공 화면

- 10×10 실내 우주정거장 방
- 64×32 다이아몬드 바닥 타일
- 북서·북동 벽, 출입구, 콘솔, 책상, 의자, 조명 소품
- 사용자 캐릭터 1명과 AI 에이전트 1명
- 클릭한 타일로 기존 pathfinding을 사용해 이동
- 캐릭터가 책상 뒤로 이동하면 책상에 가리고 앞으로 오면 보임
- 이동 중 방향과 간단한 보행 애니메이션 표시
- PlayerDetails와 에이전트 대화 패널 유지

## 3. 범위

### 포함

- 실제 아이소 맵 데이터와 렌더러
- 생성형 비트맵 임시 에셋 세트
- world 좌표와 screen 좌표를 분리하는 projection 인터페이스
- 클릭 역변환, 카메라 bounds, z-sort, object anchor
- 기존 Convex world, 이동, 충돌, 대화 연결
- 데스크톱과 모바일 뷰포트 검증

### 제외

- 전체 기존 64×48 맵 변환
- 복수 방과 층 이동
- 8방향 고품질 캐릭터 세트
- 캐릭터 커스터마이저
- 최종 상용 에셋 구매·변환 파이프라인
- 조명 셰이더, 그림자 시스템, 파티클
- 게임 로직의 아이소 좌표 전환

## 4. 좌표 아키텍처

게임 로직은 기존 타일 기반 world 좌표를 유지한다. 충돌, pathfinding, 대화 거리 계산은 변경하지 않는다. 화면 투영만 교체한다.

현재 `tileDim` 하나로 화면 크기까지 표현하는 방식을 다음 projection 계약으로 대체한다.

```typescript
type Point = { x: number; y: number };

type Projection = {
  worldToScreen(position: Point): Point;
  worldToScreenCenter(position: Point): Point;
  screenToWorld(position: Point): Point;
  viewportSize(mapWidth: number, mapHeight: number): {
    width: number;
    height: number;
  };
};
```

아이소 projection 설정:

```typescript
type IsoMetrics = {
  tileWidth: 64;
  tileHeight: 32;
  originX: number;
  originY: number;
};
```

`topDownProjection`과 `isoProjection`을 제공하고 `PixiGame`은 선택된 view mode의 projection만 소비한다. `ISO_DEBUG`는 진단용으로 유지하며 제품 view mode와 분리한다.

## 5. 맵과 충돌

새 10×10 맵은 backend world map과 renderer manifest를 분리한다.

### 게임 맵

- 크기: 10×10
- 이동 가능 바닥: 내부 8×8
- 외곽 벽과 가구 점유 타일은 collision layer에서 차단
- 사용자와 AI는 서로 다른 이동 가능 타일에서 시작
- 기존 pathfinding과 `moveTo` input을 그대로 사용

### 렌더 manifest

```typescript
type IsoMapObject = {
  id: string;
  asset: string;
  tile: { x: number; y: number };
  footprint: { width: number; height: number };
  anchor: { x: number; y: number };
  layer: 'floor' | 'wall' | 'object' | 'foreground';
  depthOffset: number;
};
```

바닥은 항상 먼저 그리고, 벽·가구·캐릭터는 발 또는 바닥 접점 기준으로 정렬한다.

```text
zIndex = floor((worldX + worldY) * 1000) + depthOffset
```

같은 대각선에서는 `worldY`, 객체 layer, 명시적 `depthOffset` 순서로 안정 정렬한다.

## 6. 임시 생성형 비트맵 에셋

에셋은 최종 상용 자산이 아니라 시각 방향과 기술 파이프라인을 검증하기 위한 교체 가능한 임시 세트다.

### 필수 에셋

- 바닥 타일 3종: 기본 금속, 패널, 경고 표시
- 벽 2종: 북서 벽, 북동 벽
- 코너와 출입구
- 콘솔, 책상, 의자 각 1종
- 사용자 우주복 캐릭터와 AI 우주복 캐릭터
- 캐릭터 방향: NE, NW, SE, SW 4방향
- 애니메이션: idle 1프레임, walk 4프레임, 방향별 동일 캔버스

### 규격

- PNG, 투명 배경
- 타일 기준 64×32
- 캐릭터 프레임 128×128
- 프레임당 발 접점 동일
- nearest-neighbor 확대가 아니라 원본 해상도로 표시
- 모든 에셋 경로와 생성 출처를 `data/assets/CREDITS.md`에 기록

에셋 생성 후 sprite sheet를 바로 사용하지 않는다. 먼저 개별 PNG와 anchor manifest로 정렬을 검증하고, 통과 후 atlas로 묶는다.

## 7. 컴포넌트 구조

```text
src/rendering/projection/
  Projection.ts
  topDownProjection.ts
  isoProjection.ts

src/components/isometric/
  IsoMap.tsx          맵·바닥·가구 렌더
  IsoMapObject.tsx    anchor와 depth 적용
  IsoCharacter.tsx    방향·보행 프레임 선택
  isoDepth.ts         안정 zIndex 계산

data/
  isoVerticalSlice.ts 게임 맵·렌더 manifest
```

`PixiGame`은 view mode를 선택하고 projection을 전달한다. `Player`는 게임 상태를 해석하고 top-down `Character` 또는 `IsoCharacter`를 선택한다. map component는 충돌 규칙을 만들지 않고 backend map의 결과만 표시한다.

## 8. 데이터 흐름

```text
[Convex world + worldRenderState]
  └─ world position, facing, speed
       └─ Projection.worldToScreenCenter
            └─ IsoCharacter foot anchor

[Pointer screen position]
  └─ viewport.toWorld
       └─ Projection.screenToWorld
            └─ floor + bounds 검사
                 └─ 기존 moveTo input
                      └─ 기존 pathfinding
```

맵 바깥이나 충돌 타일 클릭은 이동 input을 보내지 않는다. 드래그와 클릭 구분은 기존 10px 임계값을 유지한다.

## 9. view mode와 전환

- `VITE_VIEW_MODE=topdown|iso`, 기본값 `topdown`
- `WORLD_THEME=iso-slice`일 때만 iso 맵 초기화 허용
- view mode와 world theme가 맞지 않으면 시작 시 명확한 오류 표시
- `#iso-debug`는 좌표 진단 페이지로 계속 유지
- 기존 top-down 모드는 회귀 검증을 위해 삭제하지 않음

## 10. 검증

### 자동 테스트

- projection 순방향·역방향 property 테스트
- 64×32 origin과 viewport bounds 테스트
- screen 클릭의 tile floor·bounds 테스트
- zIndex 안정 정렬 테스트
- 4방향 orientation 매핑 테스트
- asset manifest의 파일·크기·anchor 검증
- 기존 Jest 전체 테스트, TypeScript, production build

### 브라우저 검증

- 데스크톱 1440×900
- 모바일 390×844
- 10개 이상의 타일 클릭 후 목적지 일치
- 사용자와 AI가 가구 앞·뒤를 각각 통과하며 가림 확인
- 이동 중 레이아웃 shift나 sprite 잘림 없음
- canvas가 비어 있지 않은지 픽셀 검사
- top-down 모드 복귀 확인

### 완료 기준

- 정상 앱 첫 화면에서 실제 아이소 방이 보임
- 디버그 원형 마커가 아니라 생성한 캐릭터가 보임
- 클릭 이동과 기존 pathfinding이 동작
- 가구와 캐릭터의 앞뒤 관계가 일관됨
- AI 대화와 PlayerDetails가 유지됨
- 데스크톱·모바일 스크린샷 승인

## 11. 후속 작업

수직 조각 승인 후에만 상용 3D 에셋 구매, Mixamo 애니메이션, Blender/PixelOver 변환 파이프라인을 별도 스펙으로 진행한다. 임시 생성형 비트맵은 최종 에셋과 동일한 manifest 및 anchor 계약을 사용해 교체 비용을 제한한다.
