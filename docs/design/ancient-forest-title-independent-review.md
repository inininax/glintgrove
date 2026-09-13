# 타이틀 디자인 독립 검토

2026-09-14 · 검토자: 게임 기획 에이전트 · 작성자: 별도 디자이너 에이전트

범위는 `index.html`의 타이틀 그룹과 `css/style.css`의 `.title-*`, 타이틀 베일, 설명·메뉴의 타이틀 관련 규칙이다. 검토자가 작성한 HUD와 장치 안내 CSS는 승인 범위에서 제외한다.

실제 캡처를 직접 확인했다.

- [ilyndrel-ancient-title-desktop-v2.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-ancient-title-desktop-v2.png) — 1440×900
- [ilyndrel-ancient-title-mobile-v2.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-ancient-title-mobile-v2.png) — 390×844
- [ilyndrel-ancient-title-short-v2.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-ancient-title-short-v2.png) — 614×427

세 화면에서 상징과 게임명이 한 그룹으로 읽히고, 기존의 과도한 간격이 사라졌다. 중앙의 어두운 영역 위에서 제목과 설명이 읽히며, 밝은 황금색 시작 버튼이 다음 행동을 분명하게 보여 준다. 설정은 바로 아래에 있고 이어하기·일일 챌린지는 더 낮은 시각적 우선순위로 남는다. 숲은 큰 고목이 입구를 감싸고 강한 빛이 여러 곳에서 경쟁하지 않아 요청한 어둡고 신비로운 분위기에 부합한다.

CSS도 확인했다. 이미지의 고유 높이가 제목 영역을 늘리지 않도록 비율 영역 안에 절대 배치했다. `object-fit: cover`가 제외하는 것은 글자 외부의 넓은 투명 여백이며, 캡처에서 위아래 획과 아래 장식이 유지된다. 상징은 장식 이미지이고 워드마크 대체 텍스트가 `h1`의 접근성 이름을 제공한다. 중앙 베일은 타이틀 범위에 한정되며 포인터를 가로채지 않는다. 낮은 창에서는 크기와 간격을 줄이고 화면 자체의 세로 스크롤을 허용해 메뉴 접근을 보존한다.

검토한 화면 크기와 코드 범위에서 수정이 필요한 차단 결함은 발견하지 않았다. UI·언어 테스트를 포함한 독립 실행 43개가 통과했다. 이 승인은 제공된 세 캡처와 코드 검토에 한정되며, 모든 브라우저·언어·화면 크기의 실측 검증을 의미하지 않는다.

## 게임 배경의 연속성

추가로 [ilyndrel-ancient-game-mobile-v2.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-ancient-game-mobile-v2.png)의 17번 퍼즐을 확인했다. 밝은 회색 안개와 평면적인 기존 Blender 나무가 새 타이틀의 고대 숲과 뚜렷하게 다르다. 이번 배포에서는 자체 생성 `forest-v6`를 모든 퍼즐 장의 공통 배경으로 사용하도록 권고했다. 기존 배경 원본은 삭제하지 않고 제작 자료로 보존한다. 새로운 세 장을 급히 만들기보다 검수한 한 장의 명암과 깊이를 유지하는 것이 이번 요청의 일관성에 맞는다. 퍼즐마다 다른 분위기는 낮은 강도의 대기 색으로 남길 수 있다. 이는 부모 에이전트가 통합할 기획 권고이며 본 검토자가 런타임 배경을 변경하지는 않았다.
