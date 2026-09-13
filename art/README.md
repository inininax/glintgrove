# Ilyndrel 아트 작업실

현재 아트는 로컬 Blender 소품 21개와 새 Blender 배경 4개입니다. 공유 이미지와 글자 없는 소품 모음도 Blender에서 렌더합니다. 사이트·화면 아이콘은 자체 SVG 경로입니다. 외부 모델·텍스처·폰트 파일이나 이미지 생성 모델을 새 교체본에 사용하지 않습니다.

제작 경로와 남은 권리 확인 범위는 [재제작 기록](../docs/legal/remake-audit.md)에 정리합니다. 코드로 제작했다는 사실은 수작업 제작·독점 저작권·비침해 보증을 뜻하지 않습니다.

## 직접 편집할 원본

- `source/blender/grove-library-v1.blend`: 나무·버섯·꽃·부엉이와 광학 장치 등 21개 소품 장면.
- `source/procedural/nocturne-environments-v2.blend`: 숲·심연·정원·심장 배경과 공유 이미지의 5개 장면.
- `recipes/catalog.json`: 의미 ID와 원본, 이미지 중심·표시 크기 연결.

Blender에서 파일을 열고 상단 Scene 선택기로 장면을 선택하면 메시·재질·조명·카메라를 편집할 수 있습니다. 일반 편집은 원본을 저장한 다음 렌더만 합니다. 생성 스크립트의 `--replace`는 원본을 처음 형태로 다시 만들 때에만 사용합니다.

## 소품 편집 → 게임 적용

```bash
bash tools/art/render.sh
# 선택한 장면만 렌더
bash tools/art/render.sh --only tree.awake,tree.dormant
```

## 배경 편집 → 게임 적용

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background art/source/procedural/nocturne-environments-v2.blend --python-exit-code 1 --python tools/art/render_procedural_environments.py -- --samples 48
```

자세한 장면 구성·시드·원본 제작 명령은 [배경 제작 레시피](recipes/procedural-environments-v2.md)에 있습니다. `--background`는 창 없이 Blender를 실행하는 옵션이며, 원본 파일은 GUI에서 계속 편집할 수 있습니다.

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

`npm run dev`로 실행한 뒤 `/tools/art-preview.html`에서 소품을 비교하고, 게임의 작은 칸과 모바일 화면도 확인하세요. 누락된 이미지가 있어도 게임은 Canvas 기본 도형으로 계속 실행됩니다.

`retired/`는 이전 이미지 모델 배경·예전 화면 캡처·이전 출력의 로컬 보관함입니다. Git과 서비스 묶음에 포함하지 않습니다. 재제작 전 조사·프롬프트 문서는 이력 자료이며 현재 입력과 구분합니다.

Blender API 스크립트의 공개 배포 라이선스는 [한정된 스크립트 고지](../tools/art/LICENSES.md)에 있습니다. 해당 고지는 게임 이미지나 전체 게임의 라이선스를 일괄 지정하지 않습니다.
