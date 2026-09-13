# 고대 숲 · 장치 · 사운드 제작 기록

사용자가 선호한 첫 GPT 숲(v4)을 기준으로, 중앙 문구의 대비와 신비로운 고대 숲의 분위기를 함께 개선했다. 기획자와 디자이너의 검토는 [게임 기획서](../../docs/design/ancient-forest-game-plan.md), [타이틀 디자인 기록](../../docs/design/ancient-forest-title-design.md)에 있다.

현재 버전의 테스트·실제 플레이·독립 검토 결과는 [검증 기록](../../docs/art/ancient-forest-verification.md)에 정리했다.

## 조사와 제작의 구분

외부 에셋은 자연의 재질·명암·깊이를 조사하는 자료로 확인했다. [Poly Haven의 Mossy Forest](https://polyhaven.com/a/mossy_forest)는 낮은 대비의 녹색 숲, 물길과 젖은 돌을 관찰하는 자료이고, [Forest Floor](https://polyhaven.com/a/forest_floor)는 낙엽·가지·지면의 크기 관계를 비교한 자료다. 두 페이지는 CC0 에셋으로 표시한다. 실제 제작에는 해당 HDRI, 텍스처, 메시 또는 스크린샷을 가져오지 않았다. 제품 검색에서 본 Fab 팩도 다운로드·모델 입력·게임 배포에 사용하지 않았다.

디자인 에이전트가 조사한 공식 게임 화면에서는 큰 전경 실루엣, 단순한 후경, 소수의 발광 초점이라는 일반적인 시각 원칙을 참고했다. 구체적인 캐릭터·문양·장면을 복제하지 않았으며, 외부 이미지를 GPT 입력으로 제공하지 않았다. 이번 생성 입력은 프로젝트에 보관된 이전 숲 PNG 하나뿐이다.

## GPT 숲 원본

- 도구: 내장 `image_gen.imagegen`, 이미지 편집 모드. 정확한 모델 버전은 도구가 반환하지 않았다.
- 입력: [forest-v4.png](../source/gpt/forest-v4.png).
- 출력: [forest-v6.png](../source/gpt/forest-v6.png), 1536×1024 PNG.
- [사용한 전체 프롬프트](gpt-forest-v6.prompt.txt), [입력·출력·프롬프트 해시](gpt-forest-v6.json).
- 청록·비취·금빛을 유지하고 중앙의 밝은 하늘을 닫았다. 거대한 수간, 어두운 원경, 낮은 안개와 하류의 작은 금빛으로 숲 안쪽으로 들어가는 깊이를 만들었다.
- 상징과 게임명 이미지는 이전 생성 원본을 유지한다. CSS가 투명 여백을 제외한 표시 창을 잡아 실제 글자와 상징의 간격을 줄인다. 이미지 픽셀을 새로 만들었다고 기록하지 않는다.
- `catalog.json`의 `forest` 의미 ID를 유지하고 `publish_art.py`가 버전 해시가 붙은 WebP를 만든다. Canvas의 안개·물빛·반딧불은 별도 실시간 효과이며 정지 이미지와 구분된다.
- 장이 바뀔 때 밝은 옛 Blender 배경으로 분위기가 끊기는 문제를 막기 위해 조각 아트 모드의 타이틀과 모든 장 배경은 `forest-v6`로 통일한다. 장별 안개·빛의 낮은 강도 색감 차이는 유지한다. 기존 세 배경의 원본·카탈로그 항목은 호환용 라이브러리에 보존하며 현재 기본 장면에서는 선택하지 않는다.

## Blender 석문 원본

가로 막대가 고정된 사다리 형태를 중앙 통로가 빈 석문으로 다시 모델링했다. 같은 색의 빛이 도달하면 게임 코드가 중앙 봉인을 없앤다. 이미지 자체에 닫힌 막대나 문짝을 굽지 않아 통과 상태와 그림이 일치한다.

- Blender 5.2.1 LTS를 `--background`로 실제 실행했다. GUI를 띄우지 않고 Python API로 메시·재질·조명·카메라를 만들고 Cycles로 렌더했다.
- [편집 가능한 새 원본](../source/blender/ancient-gates-v2.blend).
- [모델 생성 코드](../../tools/art/build_ancient_gates_v2.py), [렌더 코드](../../tools/art/render_library.py), [제작·출력 해시](ancient-gates-v2.json).
- 원본 PNG: `art/renders/sprites/gate-r-v2.png`, `gate-g-v2.png`, `gate-b-v2.png`.
- 가져온 모델·텍스처·폰트가 없으며, 숫자로 구성한 석재 형상과 절차적 재질·직접 배치한 조명만 사용한다.

기존 원본을 GUI에서 편집한 뒤에는 아래 렌더 명령만 실행한다. 생성 스크립트를 다시 돌리는 것은 원본 재제작이며, 기존 파일이 있으면 기본적으로 중단한다.

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background art/source/blender/ancient-gates-v2.blend --python-exit-code 1 --python tools/art/render_library.py -- --only gate.r,gate.g,gate.b
.venv-art-build/bin/python tools/art/publish_art.py
```

## 소리와 표시 코드

새 [96초 음악 레시피](ancient-forest-v2-music.md)는 코드와 악보로 직접 합성한 연주곡이다. GPT 음악 모델이나 외부 녹음·샘플·보컬·가사를 사용하지 않는다. v1 악보·생성기·WAV는 보존하고 v2만 현재 배포 목록에 포함한다.

`src/ui/colorMarks.js`가 수정·문·목표·안내의 마름모/잎/물방울을 공유한다. `src/ui/deviceGuide.js`는 무료 장치 설명, `src/render/beams.js`는 실제 연결 경로를 따라 나타나는 빛, `src/render/targetFx.js`는 목적지 접촉·도착 효과를 담당한다. 시뮬레이션과 저장 파일은 제작 에셋과 별개다.

## 갱신 확인

```bash
npm run check:assets
npm test
node tools/record-visual-provenance.mjs
npm run build
```

이미지와 음악의 새 버전을 만들면 원본·제작 기록·카탈로그 또는 로더·서비스 워커 캐시 버전을 함께 갱신한다. `dist/`는 현재 실행 파일만 포함하며, 이 명령들은 업로드하지 않는다. 파일 해시와 제작 기록의 일치는 독점 저작권, 계약상 권리 귀속 또는 전 세계 비침해에 대한 보증이 아니다.
