# Ilyndrel 아트 작업실

## 로컬 에셋 바로가기

저장소 루트에서 `npm run dev`를 실행한 뒤 [아트 스튜디오 열기](http://localhost:8000/tools/art-preview.html)를 누르세요. 배경·소품·로고·음악을 한곳에서 보고, 각 에셋의 상세 창에서 제작 원본과 기록을 바로 열 수 있습니다.

[배경](http://localhost:8000/tools/art-preview.html#background-section) · [소품과 장치](http://localhost:8000/tools/art-preview.html#sprite-section) · [로고·아이콘](http://localhost:8000/tools/art-preview.html#site-section) · [음악](http://localhost:8000/tools/art-preview.html#audio-section)

파일 목록은 [원본 폴더](http://localhost:8000/art/source/)와 [제작 기록 폴더](http://localhost:8000/art/recipes/)에서 확인하세요. 서버 실행 조건과 전체 링크는 [README의 로컬 바로가기](../README.md#로컬-바로가기), 검색·상세 보기 사용법은 [스튜디오 안내](../docs/art/art-studio.md)에 있습니다.

## 현재 에셋 구성

현재 아트는 로컬 Blender 소품 21개, Blender 배경 3개, GPT로 생성·편집한 숲 배경 1개와 보석 타이틀 게임명 이미지 1개입니다. 별도 타이틀 상징은 메인과 배포에서 제거하고 이전 원본으로 보존합니다. 숲 v6는 v4의 청록·금빛을 유지하면서 중앙을 어둡게 비우고 고대 나무와 희미한 신비로운 빛을 강조했습니다. 소품 중 문 3개는 새로운 빈 통로의 석문 v2로 교체했습니다. 조각 아트 모드의 타이틀과 모든 장은 같은 GPT 숲을 표시하며, 기존 Blender 배경 3개는 호환용 라이브러리에 보존합니다. 공유 이미지와 글자 없는 소품 모음은 Blender에서 렌더하고, 사이트·화면 아이콘은 자체 SVG 경로로 구성합니다. 배경음악은 별도 악보와 수학적 음원 합성 코드로 만든 96초 연주곡입니다. [고대 숲·장치·음악 제작 기록](recipes/ancient-forest-v6.md)과 [보석 타이틀 기록](recipes/jeweled-title-v2.md)은 각 제작 방식을 구분합니다.

제작 경로와 남은 권리 확인 범위는 [재제작 기록](../docs/legal/remake-audit.md)에 정리합니다. 코드로 제작했다는 사실은 수작업 제작·독점 저작권·비침해 보증을 뜻하지 않습니다.

## 직접 편집할 원본

- `source/blender/grove-library-v1.blend`: 기존 소품 라이브러리. 문을 제외한 18개 장면이 현재 연결되어 있습니다.
- `source/blender/ancient-gates-v2.blend`: 현재 문 3개. 중앙이 비어 있는 석문이며 게임에서 봉인을 별도 표시합니다.
- `source/gpt/forest-v6.png`: 현재 숲 배경의 생성 원본. 정확한 프롬프트와 참조·출력 해시는 `recipes/gpt-forest-v6.*`에 있습니다. 입력이었던 `forest-v4.png`와 그 제작 기록도 보존합니다. 3D 장면이 아닌 이미지 원본입니다.
- `source/gpt/ilyndrel-wordmark-v2.png`: 현재 보석 게임명. RGB 검정 매트를 CSS screen으로 합성합니다. 프롬프트·참조·내보내기는 `recipes/ilyndrel-wordmark-v2*.json`에 있습니다.
- `source/gpt/ilyndrel-symbol-v1.png`, `source/gpt/ilyndrel-wordmark-v1.png`: 이전 투명 타이틀 상징·게임명 원본을 보존합니다. 현재 배포에서 제외됩니다.
- `source/audio/ancient-forest-v2.score.json`: 음악의 음정·시각·음량·팬을 담은 악보. 합성기는 `../tools/audio/render-ancient-forest-music-v2.mjs`, 배포 결과는 `../assets/audio/ancient-forest-v2.wav`입니다.
- `source/procedural/nocturne-environments-v3.blend`: 현재 심연·정원·심장 배경과 보존된 이전 숲의 편집 원본. 물길·달빛·안개·역광을 별도 버전으로 개선한 장면입니다.
- `source/procedural/nocturne-environments-v2.blend`: 이전 배경 4개와 현재 공유 이미지의 보존 원본. v3 제작 과정에서 덮어쓰지 않습니다.
- `recipes/catalog.json`: 의미 ID와 원본, 이미지 중심·표시 크기 연결.

Blender에서 파일을 열고 상단 Scene 선택기로 장면을 선택하면 메시·재질·조명·카메라를 편집할 수 있습니다. 일반 편집은 원본을 저장한 다음 렌더만 합니다. 생성 스크립트의 `--replace`는 원본을 처음 형태로 다시 만들 때에만 사용합니다.

## 소품 편집 → 게임 적용

```bash
bash tools/art/render.sh
# 선택한 장면만 렌더
bash tools/art/render.sh --only tree.awake,tree.dormant
```

새 석문은 [v2 원본 렌더 명령](recipes/ancient-forest-v6.md)을 사용합니다. 기본 `render.sh`는 기존 라이브러리를 렌더하므로 새 석문 원본은 덮어쓰지 않습니다.

## Blender 배경 편집 → 게임 적용

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background art/source/procedural/nocturne-environments-v3.blend --python-exit-code 1 --python tools/art/render_procedural_environments_v3.py -- --samples 48
# 작은 검토 이미지만 생성하고 현재 게임 출력은 유지
/Applications/Blender.app/Contents/MacOS/Blender --background art/source/procedural/nocturne-environments-v3.blend --python-exit-code 1 --python tools/art/render_procedural_environments_v3.py -- --only forest --percent 50 --samples 18 --draft
```

자세한 장면 구성·시드·원본 제작 명령은 [Blender v3 레시피](recipes/procedural-environments-v3.md)와 [보존된 v2 제작 기록](recipes/procedural-environments-v2.md)에 있습니다. 현재 `forest` 카탈로그는 GPT v6를 사용하므로 위 명령으로 이전 숲을 렌더해도 게임의 숲 이미지가 바뀌지는 않습니다. `--background`는 창 없이 Blender를 실행하는 옵션이며, 원본 파일은 GUI에서 계속 편집할 수 있습니다. 공유 이미지를 편집할 때는 v2 파일의 `share` 장면을 고친 뒤 기존 렌더러에 `--only share`를 지정합니다.

## GPT 숲 배경 업데이트

[현재 제작 레시피](recipes/ancient-forest-v6.md)의 화면 구성과 전체 프롬프트를 참고합니다. 새 결과는 `source/gpt/forest-v7.png`처럼 별도 버전으로 저장하고, 실제 프롬프트·입력·출력 해시를 새 레시피에 기록합니다. `recipes/catalog.json`의 `forest.source`를 새 이미지로 바꾸고 출처 기록 도구에 새 레시피를 등록한 뒤 아래 내보내기 순서를 실행합니다. 기존 PNG와 참조 Blender 원본을 덮어쓰지 않습니다.

## 타이틀 이미지·음악 업데이트

게임명은 `source/gpt/`에 PNG 원본과 버전을 보존하고, 픽셀을 유지한 WebP를 `assets/site/`로 내보냅니다. 현재 v2는 알파가 없는 RGB 검정 매트이며 CSS screen 합성을 사용합니다. 사이트 이미지는 게임 카탈로그 밖에 있어 `publish_art.py`가 덮어쓰지 않습니다. PNG·프롬프트·WebP의 경로와 SHA256을 각각의 JSON 제작 기록에 반영하고 서비스 워커 버전도 갱신합니다. [현재 타이틀 제작 레시피](recipes/jeweled-title-v2.md)에 정확한 내보내기 명령이 있습니다.

음악은 `source/audio/ancient-forest-v2.score.json`을 편집한 뒤 저장소 루트에서 `node tools/audio/render-ancient-forest-music-v2.mjs`를 실행합니다. 합성기가 WAV와 해시·음량·루프 경계 기록을 함께 갱신합니다. 외부 녹음·샘플·보컬·가사는 사용하지 않으며 악보와 합성 코드는 배포 묶음에서 제외됩니다. [음악 레시피](recipes/ancient-forest-v2-music.md)에 반복 구조, 재생 정책과 버전 변경 절차가 있습니다.

## 이미지 내보내기와 검증

새로 복제한 작업 폴더에서는 프로젝트 최상위에서 이미지 변환용 환경을 한 번 준비합니다. Blender와 Python 3, Node.js가 설치되어 있어야 합니다.

```bash
python3 -m venv .venv-art-build
.venv-art-build/bin/python -m pip install -r tools/art/requirements.txt
```

원본을 편집·렌더한 다음에는 아래 순서로 적용합니다.

```bash
.venv-art-build/bin/python tools/art/publish_art.py
npm run check:assets
npm test
node tools/record-visual-provenance.mjs
npm run build
```

`publish_art.py`는 해시가 포함된 PNG/WebP와 매니페스트를 로컬 게임 폴더에 만들고, 공유 이미지 원본에서 경로·시간 메타데이터를 제거한 사이트용 PNG를 내보냅니다. 소품 렌더 원본은 Git에 포함할 `art/renders/sprites/`에 보관합니다. `npm run build`는 현재 게임 실행 파일만 `dist/`에 묶습니다. 두 명령 모두 실제 웹사이트에 업로드하지 않습니다.

`npm run dev`로 실행한 뒤 [아트 스튜디오](http://localhost:8000/tools/art-preview.html)에서 배경·소품·로고·음악을 확인하세요. 검색·종류 필터와 확대 상세 보기에서 배포 파일, 편집 원본과 제작 기록을 찾아볼 수 있습니다. [사용 안내](../docs/art/art-studio.md)에 관리 화면의 범위가 있습니다. 게임의 작은 칸과 모바일 화면도 함께 확인하세요. 누락된 이미지가 있어도 게임은 Canvas 기본 도형으로 계속 실행됩니다.

이전 이미지 모델 배경·예전 화면 캡처·이전 출력은 [작업 보관 폴더](history/2026-09-14-complete-work/README.md)에 Git으로 보존하며 서비스 묶음에서는 제외합니다. 재제작 전 조사·프롬프트 문서는 이력 자료이며 현재 입력과 구분합니다.

Blender API 스크립트의 공개 배포 라이선스는 [한정된 스크립트 고지](../tools/art/LICENSES.md)에 있습니다. 해당 고지는 게임 이미지나 전체 게임의 라이선스를 일괄 지정하지 않습니다.
