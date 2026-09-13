# 전체 작업 보관 · 2026-09-14

사용자의 전체 작업물 푸시 및 불필요 파일 정리 요청에 따라, 이전에 임시 폴더에만 있던 제작·검증 산출물 280개를 이곳에 보관했다. [inventory.json](inventory.json)은 원래 경로, 보관 경로, 용도, 바이트 수와 SHA256을 기록한다. 복사 후 모든 파일의 일치를 확인했다.

이 폴더는 **과거 작업 기록**이며 게임의 실행 에셋이나 새 권리 승인 목록이 아니다. GitHub Pages와 실행용 빌드는 `art/`를 제외한다. 현재 실행 파일은 `src/`와 `assets/`, 편집 원본은 `art/source/`, 현재 제작 기록은 `art/recipes/`를 사용한다.

```text
2026-09-14-complete-work/
├── inventory.json         보관 파일 280개와 원래 경로·해시
├── cleanup.json           작업 폴더에서 정리한 항목과 복원 근거
├── review/
│   ├── captures/          게임 화면·수정 전후 비교 53개
│   ├── logs/              테스트와 제작 로그 13개
│   ├── scripts/           당시 일회성 검증 코드 9개
│   └── snapshots/         당시 응답·검증 상태 3개
├── production/            렌더 초안·검사 기록·테스트용 데이터 34개
├── blender/               이전 저장 상태의 Blender 원본 1개
├── imagegen/              미선택 투명 추출 시도 PNG와 그 제작 기록
├── retired/               초기 재제작 때 교체했던 자료 89개
└── release-e355b1b/        이전 푸시 시점의 실행 파일 76개와 빌드 명부
```

`retired/`의 원래 명부는 당시 문구와 바이트를 그대로 보관했다. 그 안의 “Git 제외”와 `art/retired/` 경로는 과거 상태를 뜻한다. 현 보관 위치는 이 폴더와 `inventory.json`을 기준으로 찾는다. 외부 에셋팩 원본은 발견하지 않았으며, 이전 GPT 생성·Blender 제작·게임 캡처 자료를 역사 기록으로 옮겼다. 현재 제작 원본의 출처 검증과 구분한다.

검토 스크립트·테스트용 손상 이미지·초안은 실행용이 아니다. 당시 경로와 문맥을 재현하려면 해당 기록 또는 Git 버전을 함께 확인한다. 외부 웹사이트 참고 이미지·다운로드한 문서, 플러그인 목록, 도구 설치 환경, OS·Python 캐시는 작업 산출물에 포함하지 않았다.

Blender API를 사용하는 `review/scripts/ilyndrel-inspect-master.py`에는 제작 도구의 [별도 GPL-3.0-or-later 고지](../../../tools/art/LICENSES.md)가 적용된다. 고지는 그 검사 스크립트에 한정되며 보관 이미지·장면·게임 전체에 일괄 라이선스를 부여하지 않는다.

## 정리와 복원

미사용 배포 파일 13개는 [e355b1b](https://github.com/inininax/glintgrove/commit/e355b1b8ffa46d2047dcbd427fa20ebb37c5c6a0)에 모두 보존되어 있다. 현재 폴더에서 삭제했지만 원본·악보·생성 코드·프롬프트와 현행 출처 참조 체인은 남겨뒀다. 제거 목록과 SHA256·Git blob은 [cleanup.json](cleanup.json)에 있다.

과거 파일이 필요하면 다음과 같이 별도의 임시 경로로 읽을 수 있다. 현재 에셋을 덮어쓰는 명령이 아니다.

```bash
git show e355b1b:assets/audio/forest-reverie-v1.wav > /tmp/forest-reverie-v1.wav
```

기존 `art/build/`, `art/retired/`와 Blender 자동 백업은 보관본 확인 후 원래 위치에서 정리했다. 검토 캡처의 문서 링크도 이 보관 폴더로 바꾸고, 같은 바이트임을 다시 확인한 `/tmp/` 작업 자료 78개도 중복 위치에서 정리했다. 새 아트 작업 시 임시 빌드 폴더는 도구가 다시 생성한다. 가상 환경은 설치된 제작 도구로 유지하며 Git에 올리지 않는다. `dist/`는 `npm run build`로 다시 만드는 최신 실행 묶음이고, 이 폴더의 `release-e355b1b/`는 이전 시점의 고정 스냅샷이다.
