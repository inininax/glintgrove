# 폴더 안내

```text
glintgrove/                      저장소 폴더명 (게임 표시명: Ilyndrel)
├── src/                          게임 실행 소스 코드 (.js)
│   ├── game/                     판 진행·완료 처리
│   ├── sim/                      빛 경로·퍼즐 풀이 계산
│   ├── render/                   Canvas 화면·기본 도형 렌더링 코드
│   ├── fx/                       합성 음향·입자 효과 코드
│   ├── ui/                       화면 동작·문구·자체 SVG 기호 코드
│   ├── assets/                   이미지 로더 코드 (그림 파일 아님)
│   ├── data/                     현재 300개 퍼즐 데이터
│   ├── state/                    기기 내 진행·설정 저장
│   ├── services/                 레벨 생성·일일 도전·튜토리얼
│   └── core/, infra/             공통 함수·버전·로컬 진단
├── css/                          화면 스타일 소스
├── assets/                       브라우저에 제공하는 최종 이미지
│   ├── game/
│   │   ├── manifest.json         현재 게임 이미지 목록
│   │   ├── sprites/              소품 PNG 21개
│   │   └── backgrounds/          배경 WebP 4개
│   └── site/
│       ├── icon.svg              사이트·PWA 아이콘 원본
│       └── share.png             링크 공유 미리보기
├── art/                          편집·재제작을 위한 아트 원본
│   ├── source/
│   │   ├── blender/              소품 21개 편집용 .blend
│   │   └── procedural/           배경·공유 장면 .blend 및 원본 PNG
│   ├── renders/sprites/          소품 렌더 원본 PNG (Git에 보관)
│   ├── recipes/                  제작 명령·시드·매핑·출처/해시 기록
│   ├── previews/                 개발자가 검토하는 화면·소품 모음
│   ├── build/                    재생성 가능한 임시 파일 (Git 제외)
│   └── retired/                  교체 전 자료 보관함 (Git·배포 제외)
├── tools/                        로컬 제작·검사 도구 (서비스 배포 제외)
│   ├── art/                      Blender 생성·렌더·이미지 내보내기
│   │   ├── LICENSES.md            Blender API 스크립트만의 라이선스 범위
│   │   └── COPYING.GPL-3.0        해당 스크립트 라이선스 원문
│   ├── art-preview.html          개발용 이미지 갤러리
│   ├── browser-e2e.html           개발용 브라우저 테스트 화면
│   ├── build-release.mjs          서비스 파일만 묶는 도구
│   └── record-visual-provenance.mjs 현재 제작 경로·파일 해시 기록
├── tests/                        회귀·동작 검사
├── _config.yml                   기존 GitHub Pages에서 제작·개발 파일 제외
├── docs/
│   ├── legal/                    현재 재제작 감사 + history/의 교체 전 기록
│   └── art/                      제작 방향·검증 기록
└── dist/                         npm run build 결과 (Git 제외)
    └── ...                       일반 사용자에게 제공할 실행 파일만 포함
```

`src/assets/`는 파일을 읽는 JavaScript 코드이며, 실제 그림은 최상위 `assets/`에만 서비스용으로 배치합니다. 편집 가능한 Blender 원본은 `art/source/`, 압축 전 소품 PNG는 `art/renders/sprites/`, 브라우저용 파일은 `assets/game/`입니다.

## 업데이트 순서

1. 소품은 `art/source/blender/`의 `.blend`를 편집·저장하고 `bash tools/art/render.sh`로 렌더합니다. 배경은 `art/source/procedural/` 원본을 편집하고 해당 렌더 명령을 실행합니다. [정확한 명령](art/README.md)을 참고하세요.
2. 원본을 교체할 때는 `art/recipes/catalog.json`의 `source`만 새 경로로 바꾸고, 기존 의미 ID(`mirror`, `forest` 등)는 유지합니다. `anchor`와 `scale`은 표시 크기·중심이며 게임 판정과 구분합니다.
3. `.venv-art-build/bin/python tools/art/publish_art.py`가 새 이미지 해시 이름을 만들고 마지막에 매니페스트를 교체합니다. `assets/game/`의 해시 파일을 직접 덮어쓰지 않습니다.
4. `npm run check:assets`, `npm test`와 실제 플레이를 확인합니다. 새 원본의 출처·사용 조건도 함께 기록합니다. 파일 해시 통과만으로 새 에셋의 저작권이 검증되는 것은 아닙니다.
5. `node tools/record-visual-provenance.mjs`로 현재 제작 기록을 갱신합니다. 기존 제작 증거와 원본 해시가 달라지면 출처 재검토가 필요한 것으로 기록하므로 새 제작 과정·사용 조건을 확인해 함께 보관합니다. 이 도구는 저작권을 자동 승인하지 않습니다.
6. `npm run build`로 일반 사용자용 `dist/`를 만듭니다. 별도의 업로드는 이 과정에 포함되지 않습니다.

## 일반 사용자와 관리 기능

현재는 관리자 웹·관리자 계정·서버의 관리 API가 없는 기기 내 저장형 게임입니다. 따라서 별도 관리자 웹은 만들지 않습니다. `tools/`의 갤러리와 테스트는 로컬 개발 도구이며 `dist/`에 포함되지 않습니다. `config.json`은 공개해도 되는 게임 조정값이며 비밀 키나 관리자 권한을 두는 곳이 아닙니다.

`?debug=1`의 내부 게임 핸들은 localhost·127.0.0.1·[::1]에서만 열립니다. 이는 관리자 인증을 대신하지 않습니다. 나중에 서버 관리 기능을 추가한다면 서버 측 인증·권한 검사와 사용자 경로 분리가 별도로 필요합니다.

현재 저장소의 GitHub Pages는 `main`의 루트를 자동 게시하는 설정입니다. `_config.yml`은 그 게시 과정에서 `art/`, `tools/`, `tests/`, `docs/`와 개발 파일을 제외합니다. Git 저장소의 편집 원본 공개 여부와 게임 웹사이트의 제공 파일은 서로 다른 범위입니다. 원본의 작업 경로·렌더 시각 같은 제작 메타데이터는 Git의 제작 기록에 남고, 서비스용 이미지에는 포함하지 않습니다.
