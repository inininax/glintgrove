# 폴더 안내

```text
glintgrove/                      저장소 폴더명 (게임 표시명: Ilyndrel)
├── src/                          게임 실행 소스 코드 (.js)
│   ├── game/                     판 진행·완료 처리
│   ├── sim/                      빛 경로·퍼즐 풀이 계산
│   ├── render/                   Canvas 화면·배경 애니메이션·기본 도형 코드
│   ├── fx/                       음악 로딩·반복 재생·합성 효과음·입자 코드
│   ├── ui/                       화면 동작·문구·자체 SVG 기호 코드
│   ├── assets/                   이미지 로더 코드 (그림 파일 아님)
│   ├── data/                     현재 300개 퍼즐 데이터
│   ├── state/                    기기 내 진행·설정 저장
│   ├── services/                 레벨 생성·일일 도전·튜토리얼
│   └── core/, infra/             공통 함수·버전·로컬 진단
├── css/                          화면 스타일 소스
├── assets/                       브라우저에 제공하는 최종 이미지·음악
│   ├── game/
│   │   ├── manifest.json         현재 게임 이미지 목록
│   │   ├── sprites/              소품 PNG 21개
│   │   └── backgrounds/          배경 WebP 4개 (현재 공통 숲 + 보존 배경 3개)
│   ├── site/
│   │   ├── icon.svg              사이트·PWA 아이콘 원본
│   │   ├── share.png             링크 공유 미리보기
│   │   ├── ilyndrel-wordmark-v2.webp 현재 보석 타이틀 게임명 이미지
│   │   └── ilyndrel-{symbol,wordmark}.webp 이전 이미지 보존 (현재 배포 제외)
│   └── audio/
│       ├── ancient-forest-v2.wav  현재 96초 반복용 배경음악
│       └── forest-reverie-v1.wav  이전 음악 보존 (현재 배포 제외)
├── art/                          편집·재제작을 위한 아트 원본
│   ├── source/
│   │   ├── blender/              기존 소품 라이브러리 + 새 석문 v2 .blend
│   │   ├── gpt/                  GPT 원본 PNG (forest-v6·보석 게임명 v2, 이전 원본·중간 제작안 보존)
│   │   ├── audio/                편집 가능한 음악 악보 JSON
│   │   └── procedural/           배경·공유 장면 .blend 및 원본 PNG
│   │       ├── nocturne-environments-v3.blend   배경 3개 + 이전 숲 편집 원본
│   │       ├── *-v3.png          배경 3개 + 이전 숲의 렌더 원본
│   │       └── *-v2.*            이전 배경·부모 원본 및 현재 공유 이미지 보존
│   ├── renders/sprites/          소품 렌더 원본 PNG (Git에 보관)
│   ├── recipes/                  제작 명령·시드·매핑·프롬프트·출처/해시 기록
│   ├── previews/                 개발자가 검토하는 화면·소품 모음
│   ├── build/                    재생성 가능한 임시 파일 (Git 제외)
│   └── retired/                  교체 전 자료 보관함 (Git·배포 제외)
├── tools/                        로컬 제작·검사 도구 (서비스 배포 제외)
│   ├── art/                      Blender 생성·렌더·이미지 내보내기
│   │   ├── LICENSES.md            Blender API 스크립트만의 라이선스 범위
│   │   └── COPYING.GPL-3.0        해당 스크립트 라이선스 원문
│   ├── audio/                    악보를 PCM WAV로 만드는 수학적 음원 합성기
│   ├── art-preview.html          개발용 이미지 갤러리
│   ├── browser-e2e.html           개발용 브라우저 테스트 화면
│   ├── build-release.mjs          서비스 파일만 묶는 도구
│   └── record-visual-provenance.mjs 현재 제작 경로·파일 해시 기록
├── tests/                        회귀·동작 검사
├── _config.yml                   기존 GitHub Pages에서 제작·개발 파일 제외
├── docs/
│   ├── legal/                    현재 재제작 감사 + history/의 교체 전 기록
│   ├── design/                   기획자·디자이너의 설계·검토
│   └── art/                      제작 방향·검증 기록
└── dist/                         npm run build 결과 (Git 제외)
    └── ...                       일반 사용자에게 제공할 실행 파일만 포함
```

`src/assets/`는 파일을 읽는 JavaScript 코드이며, 실제 그림과 음악은 최상위 `assets/`에만 서비스용으로 배치합니다. `art/source/blender/`와 `art/source/procedural/`에는 Blender 원본, `art/source/gpt/`에는 이미지 생성 원본, `art/source/audio/`에는 음악 악보를 구분해 둡니다. 압축 전 소품 PNG는 `art/renders/sprites/`, 브라우저용 파일은 `assets/game/`입니다. 상징·게임명 WebP와 음악 WAV도 편집 원본과 분리되어 있습니다.

## 업데이트 순서

1. 소품은 `art/source/blender/`의 `.blend`를 편집·저장하고 `bash tools/art/render.sh`로 렌더합니다. Blender 배경은 `art/source/procedural/` 원본을 편집해 렌더합니다. GPT 숲은 `art/source/gpt/`에 새 버전의 이미지 원본을 저장하고 `art/recipes/`에 실제 프롬프트와 참조·출력 해시를 기록합니다. [정확한 명령](art/README.md)을 참고하세요.
2. 원본을 교체할 때는 `art/recipes/catalog.json`의 `source`만 새 경로로 바꾸고, 기존 의미 ID(`mirror`, `forest` 등)는 유지합니다. `anchor`와 `scale`은 표시 크기·중심이며 게임 판정과 구분합니다.
3. `.venv-art-build/bin/python tools/art/publish_art.py`가 새 이미지 해시 이름을 만들고 마지막에 매니페스트를 교체합니다. `assets/game/`의 해시 파일을 직접 덮어쓰지 않습니다.
4. `npm run check:assets`, `npm test`와 실제 플레이를 확인합니다. 새 원본의 출처·사용 조건도 함께 기록합니다. 파일 해시 통과만으로 새 에셋의 저작권이 검증되는 것은 아닙니다.
5. `node tools/record-visual-provenance.mjs`로 현재 제작 기록을 갱신합니다. 기존 제작 증거와 원본 해시가 달라지면 출처 재검토가 필요한 것으로 기록하므로 새 제작 과정·사용 조건을 확인해 함께 보관합니다. 이 도구는 저작권을 자동 승인하지 않습니다.
6. `npm run build`로 일반 사용자용 `dist/`를 만듭니다. 별도의 업로드는 이 과정에 포함되지 않습니다.

현재 게임명은 [보석 타이틀 제작 기록](art/recipes/jeweled-title-v2.md)의 프롬프트·PNG와 내보내기 기록을 함께 갱신합니다. `publish_art.py`는 사이트 게임명 WebP를 생성하지 않습니다. 이전 상징·게임명 기록은 역사 자료로 보존합니다. 음악은 `art/source/audio/`의 악보를 편집하고 `node tools/audio/render-ancient-forest-music-v2.mjs`로 WAV와 제작 기록을 함께 만듭니다. 배포 후 파일 내용을 바꿀 때는 버전 파일명을 올리고 로더·서비스 워커·빌드 목록도 갱신합니다. 정확한 절차는 [현재 음악 레시피](art/recipes/ancient-forest-v2-music.md)를 참고하세요.

## 일반 사용자와 관리 기능

현재는 관리자 웹·관리자 계정·서버의 관리 API가 없는 기기 내 저장형 게임입니다. 따라서 별도 관리자 웹은 만들지 않습니다. `tools/`의 갤러리와 테스트는 로컬 개발 도구이며 `dist/`에 포함되지 않습니다. `config.json`은 공개해도 되는 게임 조정값이며 비밀 키나 관리자 권한을 두는 곳이 아닙니다.

`?debug=1`의 내부 게임 핸들은 localhost·127.0.0.1·[::1]에서만 열립니다. 이는 관리자 인증을 대신하지 않습니다. 나중에 서버 관리 기능을 추가한다면 서버 측 인증·권한 검사와 사용자 경로 분리가 별도로 필요합니다.

현재 저장소의 GitHub Pages는 `main`의 루트를 자동 게시하는 설정입니다. `_config.yml`은 그 게시 과정에서 `art/`, `tools/`, `tests/`, `docs/`와 개발 파일을 제외합니다. Git 저장소의 편집 원본 공개 여부와 게임 웹사이트의 제공 파일은 서로 다른 범위입니다. 원본의 작업 경로·렌더 시각 같은 제작 메타데이터는 Git의 제작 기록에 남고, 서비스용 이미지에는 포함하지 않습니다.

현재 고대 숲과 새 석문은 [제작 기록](art/recipes/ancient-forest-v6.md)을 참고합니다. 석문은 `ancient-gates-v2.blend`를 별도로 렌더하고, 나머지 소품은 기존 라이브러리에서 편집합니다.
