> 교체 전 조사 스냅샷입니다. 현재 작업본의 교체 결과는 [재제작 기록](../../remake-audit.md)을 확인하세요. 아래 해시·파일 상태·화면 관찰은 당시 버전에 해당합니다.

# Glintgrove 코드 기반 시각 요소·SVG 출처 점검

검토일: 2026-09-13. 범위: 게임의 현재 HTML/CSS/JavaScript, 해당 파일의 Git HEAD와 작업 트리 차이, 이미지 생성 입력 기록, 공식 아이콘 저장소의 후보 SVG 23개. 기존 PNG/WebP 25개의 해시 검사는 이 문서의 범위가 아니다. 이 문서는 출처 조사 기록이며 상업 배포 승인·저작권 귀속 판단·비침해 보증이 아니다.

**검토한 후보 중 완전히 일치하는 외부 SVG 아이콘은 확인하지 못했다.** 되돌리기 아이콘의 단순 화살촉에는 공개 아이콘과 같은 두 선이 있다. 이 부분 일치를 복사 증거로 확대하지 않았으며, 검색에서 일치가 나오지 않았다는 이유로 독자적 제작을 인증하지도 않았다.

## 인라인 SVG와 파비콘

아래 8개는 화면에 표시하는 서로 다른 SVG 디자인이다. 잠금 SVG는 여러 레벨 버튼에 반복된다. 파비콘은 이 8개와 별도로 기록한다.

| 요소 | 현재 코드 위치 | 확인한 구성 |
|---|---|---|
| 숲 문양 | `index.html:30`, `.grove-sigil` | 잎·줄기·장식 곡선·작은 원, `viewBox="0 0 100 96"` |
| 시작 화살표 | `index.html:36`, `#btn-play` | 수평선과 두 선의 화살촉 |
| 힌트 전구 | `index.html:70`, `#btn-hint` | 전구 윤곽·받침·십자 선 |
| 되돌리기 | `index.html:71`, `#btn-undo` | 왼쪽 화살촉과 되돌아오는 곡선 |
| 재시작 | `index.html:72`, `#btn-reset` | 원호와 직각 화살촉 |
| 지도 | `index.html:73`, `#btn-exit` | 접힌 지도 형태의 다각형·구분선 |
| 튜토리얼 포인터 | `src/ui/ui.js:55` | 커서 형태의 닫힌 다각형 |
| 잠긴 레벨 | `src/ui/ui.js:141` | 둥근 사각형·자물쇠 고리 |
| 별도 파비콘 | `index.html:18` | data URL에 직접 담긴 SVG 원 하나 |

8개 화면 SVG는 검토 당시 Git HEAD `48820b6`에 없고 작업 트리에 추가되어 있었다. HEAD의 HUD 버튼은 이모지였으며, 튜토리얼 손가락·잠금도 이모지였다. 파비콘의 원은 HEAD에도 동일하게 존재했다. **Git 차이는 코드의 추가 여부만 보여 주며 작성자·외부 참조 여부·독자적 창작을 입증하지 않는다.**

별도 PWA 아이콘 `assets/icon.svg`와 공유 이미지 `assets/og.png`는 [에셋 명부](asset-register.json)의 기존 파일 항목에 있다. data URL 파비콘을 이 두 파일이나 새 게임 아트 25개와 혼동하지 않는다.

## 공개 아이콘 원본 대조

공식 저장소의 아래 SVG 23개를 직접 읽어 로컬 경로·선·다각형·원호 구성과 비교했다. 전체 아이콘 컬렉션이나 모든 과거 버전을 대조한 것은 아니다. 아래 링크의 브랜치는 이후 변경될 수 있으며, 결과는 검토일에 읽은 내용 기준이다.

| 공식 저장소 | 직접 확인한 후보 |
|---|---|
| [Lucide](https://github.com/lucide-icons/lucide/tree/main/icons) — 10개 | `lightbulb`, `undo`, `undo-2`, `rotate-ccw`, `map`, `mouse-pointer`, `mouse-pointer-2`, `lock`, `arrow-right`, `sprout` |
| [Feather](https://github.com/feathericons/feather/tree/main/icons) — 6개 | `corner-up-left`, `rotate-ccw`, `map`, `mouse-pointer`, `lock`, `arrow-right` |
| [Heroicons 24 outline](https://github.com/tailwindlabs/heroicons/tree/master/optimized/24/outline) — 7개 | `light-bulb`, `arrow-uturn-left`, `arrow-path`, `map`, `cursor-arrow-rays`, `lock-closed`, `arrow-long-right` |

독립적으로 다시 확인할 수 있는 부분 일치는 다음과 같다.

- 로컬 되돌리기 경로의 시작 `m9 4-5 5 5 5`는 `(9,4) → (4,9) → (9,14)`를 연결한다.
- [Lucide `undo-2.svg`](https://github.com/lucide-icons/lucide/blob/main/icons/undo-2.svg)의 화살촉과 [Feather `corner-up-left.svg`](https://github.com/feathericons/feather/blob/main/icons/corner-up-left.svg)의 polyline은 같은 두 선을 반대 순서로 연결한다.
- 로컬 되돌림 곡선은 위 두 아이콘의 나머지 부분과 다르다. [Heroicons `arrow-uturn-left.svg`](https://github.com/tailwindlabs/heroicons/blob/master/optimized/24/outline/arrow-uturn-left.svg)와도 비슷한 구성이나 시작점·수평 길이 등이 다르며 전체 경로는 일치하지 않는다.

두 선의 일반적인 화살촉은 이 비교의 구체적인 부분 대응이다. 그것만으로 어느 저장소에서 복사했는지, 저작권상 보호되는 표현을 이용했는지, 어떤 라이선스가 실제 로컬 코드에 적용되는지를 판단하지 않았다. 이 문서를 근거로 로컬 아이콘을 Lucide·Feather·Heroicons 사용물이라고 확정해 표시해서는 안 된다.

실제 해당 원본을 사용하거나 수정했다는 제작 경위가 확인되면 아래 공식 조건을 적용해야 한다.

| 공식 조건 | 확인한 내용 |
|---|---|
| [Lucide LICENSE](https://github.com/lucide-icons/lucide/blob/main/LICENSE) | ISC 조건과 명시된 Feather 파생 아이콘의 MIT 조건을 함께 담고 있다. 허용된 사용·복사·수정·배포에는 해당 저작권·허가 고지 보존 조건이 따른다. 모든 Lucide 아이콘을 하나의 MIT 라이선스로 단순화하지 않는다. |
| [Feather LICENSE](https://github.com/feathericons/feather/blob/main/LICENSE) | Cole Bemis의 MIT 조건. 사본 또는 상당 부분에 저작권·허가 고지를 포함한다. |
| [Heroicons LICENSE](https://github.com/tailwindlabs/heroicons/blob/master/LICENSE) | MIT 조건. 사본 또는 상당 부분에 저작권·허가 고지를 포함한다. |

이번 대조만으로 세 라이브러리의 고지가 모두 필수라고 결론 내릴 근거는 없다. 라이브러리 이름만 고지에 추가하는 일은 불명확한 제작 경위를 해결하거나 모든 권리를 확보하는 행위가 아니다.

## 25개 이미지 밖에서 표시되는 그래픽

| 화면 요소 | 코드 위치·구성 | 출처 판단 범위 |
|---|---|---|
| 워드마크·문구 | `index.html:32,75`, `css/style.css:43,112`. `GLINTGROVE`는 이미지가 아닌 실제 글자이며 시스템 폰트·자간·그림자로 표시한다. UI 문구는 `src/ui/strings.js`, 챕터·레벨 이름은 `src/data/levels.js`, `src/data/levels.generated.js`, `src/ui/strings.js:200`에 있다. | 게임 명칭은 HEAD에도 있었다. 이름·문구의 저작권 귀속, 기존 작품과의 관계, 상표 사용 가능성을 인증하지 않는다. |
| 레벨 지도 | `css/style.css:63–95`, `src/ui/ui.js:122–141`. 패널·숫자·진행률·별·잠금 SVG로 구성된다. | 별도의 지도 그림 파일을 사용하는 구조는 발견하지 못했다. 기존 레벨 데이터의 권리 문제는 별도다. |
| 보드·격자·모서리 장식 | `src/render/background.js:16`. 둥근 사각형·격자 선·점·모서리 곡선·그림자를 Canvas에서 그린다. | 로컬 도형 코드라는 사실과 그 코드의 독자적 작성은 별개다. |
| 바위·배경 대체 그림 | `src/render/background.js:74,123`. 이미지가 없으면 바위 다각형, 그라디언트·별·숲 실루엣 등을 그린다. | 에셋 실패 시에도 나타나는 시각 요소다. 일부는 기존 렌더러에 있던 코드다. |
| 게임 소품 대체 그림 | `src/render/entities.js:13,112,149,193,228,276,379,427,474,507`. 이미지가 없으면 발산원·거울·분할기·수정·문·포털·나무·꽃·버섯·올빼미를 원·사각형·다각형·타원·원호로 그린다. | 기존 코드의 제작 경위 확인 대상이다. 이미지 원본 25개만 점검해서는 이 경로를 포함할 수 없다. |
| 스프라이트 배치·변형 | `src/render/sprites.js:5–25`. 등록된 이미지를 칸 안으로 잘라 그리고, 기준점·크기·회전·불투명도·세로 위치를 적용한다. | 이 함수가 별도의 그림 파일을 생성하거나 외부 그림을 추가로 가져오지는 않는다. 아래 보조 표시와 함께 최종 화면을 구성한다. |
| 이미지 위·주변의 보조 표시 | `src/render/entities.js:17–30,75–108,233–243,294,324,338–367,370,568`. 발산원 방향 삼각형·중앙 빛, 회전하는 거울 면·분할기 갈림 기호, 켜진 문의 외곽선, 포털의 `I`/`II`, 색상의 `R`/`G`/`B`, 각성 시 후광·크기 변화·나무 흔들림·빛 점, 휴면 표식, 힌트 원 등을 추가한다. | 일부 문자는 기기 폰트로 그려진다. 이 표시와 애니메이션까지 전부 Blender 렌더 픽셀이라고 표현하면 부정확하다. |
| 광선·포털 연결선 | `src/render/beams.js:8,54,72`. 여러 폭의 선·대시·이동하는 점·곡선으로 구성된다. | 외부 VFX 이미지나 셰이더 패키지를 가져오는 호출은 발견하지 못했다. |
| 입자·반딧불·블룸 | `src/fx/particles.js:171`, `src/render/background.js:207`, `src/render/bloom.js`. 원·원호·타원·선·Canvas 합성으로 표시한다. | 입자 코드에는 기존 작업이 포함된다. 난수 함수 출처는 [고지 문서](../../THIRD_PARTY_NOTICES.md)에 별도로 기록되어 있다. |
| 승리 화면의 빛 효과 | `src/game/game.js:388–396`. 승리 후 화면 중앙을 기준으로 방사형 그라디언트를 화면 크기 사각형에 그리고, 시간에 따라 불투명도를 줄여 가산 합성한다. | 승리 모달의 CSS나 별 표시에 포함되지 않는 별도의 Canvas 레이어다. 코드 기반 효과이며 기존 작성 경위는 별도 확인 대상이다. |
| 렌더링 보조 코드 | `src/render/layout.js`, `src/render/gradientCache.js`, `src/render/renderer.js`. 칸 위치·화면 배치, 그라디언트 재사용, 배경·소품·효과의 그리기 순서를 정한다. | 별도 외부 아트 원본은 아니지만 최종 시각 표현을 구성하는 코드다. 작성 경위 확인 범위에서 제외하지 않는다. |
| 빛 테마 4종·색상 선택 | `src/core/skins.js:1–30`, `src/core/colors.js`. Classic·Ocean·Ember·Aurora의 색상 상수와 선택한 테마·기본값을 적용하는 코드다. | 외부 팔레트 패키지나 색상표 파일의 임포트는 없다. 기존 상수의 창작 경위까지 입증하지 않는다. |
| CSS 장식·설정·튜토리얼 | `css/style.css:31–38,117–160`. 그라디언트·테두리·그림자·별 애니메이션·스위치·튜토리얼 원을 구현한다. 선택 상자 등 일부는 브라우저의 기본 UI에 의존한다. | 코드 기반 구성이다. UI 전체의 독창성이나 라이선스 귀속을 확정하는 판단은 하지 않았다. |
| 글꼴·Unicode 기호·이모지 | CSS의 시스템 폰트, `src/services/tutorial.js`의 `◇`, `◈Ⓐ`, `◎`, 승리·지도 화면의 별, `src/services/achievements.js`의 이모지, `src/main.js`의 힌트·일일 퍼즐 이모지 등이 있다. | 글자 코드와 기기가 그리는 글리프는 구분한다. 외부 폰트·이모지 이미지 파일을 번들하지 않는다는 관찰로 모든 글리프의 상업 재사용 권리가 확인되지는 않는다. |

기존 `README.md:10,13`과 `CYCLES.md:127`에는 Tetris Effect를 분위기 참고 대상으로 언급한 기록이 있다. 검토한 렌더 소스에서 해당 게임의 파일을 불러오는 증거는 발견하지 못했다. 그 문구의 존재만으로 침해를 판단하지 않으며, 마케팅 문구는 현재 게임 자체의 특징을 설명하도록 정리하는 편이 명확하다.

## 외부 입력·URL 점검과 한계

검토한 현재 `index.html`, `src/`, `css/`에서 추가 원격 이미지, CSS 이미지 URL, 외부 SVG `use`/symbol 참조, 아이콘 패키지 임포트는 발견하지 못했다. 외부 주소 문자열 중 SVG의 XML namespace는 에셋 다운로드 주소가 아니다. Blob URL은 로컬 응답에서 읽은 이미지를 디코딩하거나 데이터를 내보내는 데 쓰인다. 이 관찰은 실제로 만들 최종 호스팅 패키지와 모든 네트워크 동작을 인증하는 것은 아니다.

[이미지 생성 입력 기록](../../art/recipes/imagegen-prompts.md)에 따르면 첫 `forest-v1.png`는 입력 이미지 없이 생성했고, 이후 `depths`, `garden`, `heart`는 그 첫 이미지만 참조했다. 기록된 프롬프트에는 특정 작가·프랜차이즈 이름이나 판매처 이미지 입력이 없다. C2PA만으로 모든 과거 입력, 정확한 서비스 모델, 비침해를 입증하지 않는다.

이번 검색은 모든 라이브러리·과거 버전·변형·다른 표현 방식의 경로를 포함하지 않는다. 미일치 검색 결과는 독자적 창작의 증명이 아니다. 기존 코드·문구·팔레트의 제작 경위, 기기 폰트·글리프의 사용 조건, 상표, 타 작품과의 실질적 유사성, 실제 배포물의 권리·고지는 여전히 별도의 판단 대상이다. 이 점검 중 생산 코드·아트 파일은 수정하지 않았다.
