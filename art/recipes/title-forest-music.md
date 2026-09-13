# 타이틀·숲·음악 제작 기록

2026-09-13. 타이틀의 상징·게임명과 숲 v5는 OpenAI의 내장 `image_gen.imagegen` 도구로 생성한 비트맵 이미지다. 정확한 하위 모델 버전은 도구 응답에 없어 기재하지 않는다. Blender나 외부 판매처의 에셋으로 만든 이미지라고 설명하지 않는다.

이 문서는 v1 타이틀·숲 v5·72초 음악을 적용하던 당시의 제작 기록이다. 현재 게임은 [보석 타이틀 v2](jeweled-title-v2.md), [숲 v6](ancient-forest-v6.md), [96초 음악 v2](ancient-forest-v2-music.md)를 사용한다. 이전 PNG 원본·악보·생성기는 제작 폴더에 유지하고, 미사용 WebP·WAV 출력은 현 에셋 폴더에서 정리해 [커밋 e355b1b](https://github.com/inininax/glintgrove/commit/e355b1b8ffa46d2047dcbd427fa20ebb37c5c6a0)에 보존한다. 아래 적용 경로와 명령은 당시 기록이며 현재 배포 목록을 뜻하지 않는다.

| 결과 | 보존 원본 | 실제 사용한 전체 프롬프트 | 해시·입력·출력 기록 |
|---|---|---|---|
| 비취 씨앗과 금빛 광선의 상징 | [symbol PNG](../source/gpt/ilyndrel-symbol-v1.png), 1254×1254 RGBA | [symbol prompt](ilyndrel-symbol-v1.prompt.txt) | [symbol JSON](ilyndrel-symbol-v1.json) |
| ILYNDREL 게임명 | [wordmark PNG](../source/gpt/ilyndrel-wordmark-v1.png), 2048×768 RGBA | [wordmark prompt](ilyndrel-wordmark-v1.prompt.txt) | [wordmark JSON](ilyndrel-wordmark-v1.json) |
| 깊고 어두운 먼 숲 | [forest v5 PNG](../source/gpt/forest-v5.png), 1536×1024 RGB | [forest v5 prompt](gpt-forest-v5.prompt.txt) | [forest v5 JSON](gpt-forest-v5.json) |

상징과 게임명은 참조 이미지 없이 텍스트로 새로 생성했다. 숲 v5는 [보존된 GPT 숲 v4](../source/gpt/forest-v4.png)를 편집 입력으로 사용해 청록·금빛과 물길을 유지하면서 먼 수관을 더 어둡게 하고 잔가지·미세한 하이라이트를 줄였다. v4는 [자체 Blender v3 숲](../source/procedural/forest-v3.png)을 색감과 분위기의 참조로 사용했다. 원본과 그 참조 체인을 보존하며 기존 버전을 덮어쓰지 않았다.

## 당시 게임에 적용한 파일

- `assets/site/ilyndrel-symbol.webp`, `assets/site/ilyndrel-wordmark.webp`: PNG의 원래 크기·투명도를 유지한 무손실 WebP. 게임명은 이미지이며 본문·버튼은 계속 설치된 시스템 글꼴로 표시한다.
- 숲은 `catalog.json`의 `forest.source`가 v5 원본을 가리키고, `tools/art/publish_art.py`가 해시 이름의 WebP와 게임 매니페스트를 만든다.
- 움직임은 `src/render/background.js`의 Canvas 빛·안개·수면·반딧불 코드다. 정지 이미지와 분리하며 움직임 설정과 운영체제의 동작 줄이기 설정을 따른다.

타이틀 WebP를 다시 내보내는 명령은 저장소 루트에서 실행한다. PNG에 그림을 덧그리지 않고 파일 형식만 변환한다. 새 디자인은 별도의 버전 PNG와 제작 기록으로 남긴다. 인코더 버전이 달라지면 무손실 픽셀이 같아도 파일 해시가 달라질 수 있으므로 출력의 새 해시와 변환 기록을 함께 저장한다.

```bash
.venv-art-build/bin/python - <<'PY'
from pathlib import Path
from PIL import Image
for name in ('symbol', 'wordmark'):
    source = Path(f'art/source/gpt/ilyndrel-{name}-v1.png')
    target = Path(f'assets/site/ilyndrel-{name}.webp')
    with Image.open(source) as image:
        image.save(target, format='WEBP', lossless=True, method=6)
PY
```

이 두 사이트 파일은 `publish_art.py`의 생성 대상이 아니다. 내보내기 후 각각의 JSON `runtimeExport` 경로·SHA256·바이트 수, 서비스 워커 캐시 버전과 필요시 파일명을 갱신한다. `node tools/record-visual-provenance.mjs`가 PNG·프롬프트·참조 체인과 최종 WebP 기록의 일치를 확인한다.

## 배경음악

**Forest Reverie**는 [악보 JSON](../source/audio/forest-reverie-v1.score.json)과 [Node 합성기](../../tools/audio/render-forest-music.mjs)로 만든 72초 연주곡이다. 수학적 파형, 직접 정한 음정·배치와 순환 잔향을 사용하며 외부 녹음·샘플·가사·보컬·음성을 넣지 않았다. 이미지 생성 도구나 AI 음악 서비스로 생성한 오디오가 아니다.

당시 배포 파일은 [forest-reverie-v1.wav 보존본](https://github.com/inininax/glintgrove/blob/e355b1b8ffa46d2047dcbd427fa20ebb37c5c6a0/assets/audio/forest-reverie-v1.wav)이며 PCM 24,000 Hz, 스테레오, 16비트다. 첫 실제 클릭·터치·키 입력으로 오디오가 활성화된 뒤 단일 Web Audio 버퍼를 반복한다. 타이틀·지도·플레이 화면 전환은 같은 음악 재생을 유지한다. 음소거·숨겨진 탭에서는 재생 위치를 보존해 멈춘다. 끝을 넘는 음과 잔향을 처음에 합산하므로 파일 반복 때 별도의 로딩이나 무음 구간이 필요하지 않다.

곡 구성·재생 정책·업데이트 명령·음량과 루프 경계 측정은 [음악 레시피](forest-reverie-v1-music.md)와 [음악 제작 기록](forest-reverie-v1-music.json)에 있다. `art/source/audio/`는 편집할 악보, `tools/audio/`는 합성 코드, `assets/audio/`는 사용자에게 제공할 결과물이다.

이 기록은 제작 방식과 파일 일치 여부를 설명한다. 생성 서비스·계정 계약·독점 저작권·전 세계 비침해를 입증하는 기록은 아니다. 실제 생성 이미지와 수학적 음악 합성의 제작 방식을 구분하고, 앞으로 외부 입력을 추가하면 해당 입력의 출처와 사용 조건도 새 버전 기록에 남긴다.
