# 고대 숲 개편 검증 · 2026-09-14

이번 검증은 [현재 제작 기록](../../art/recipes/ancient-forest-v6.md)의 GPT 숲 v6, Blender 석문 v2, 96초 음악 v2와 장치 안내·빛 도착 표현을 대상으로 한다. 이전 v5/72초 검증 문서는 당시 버전의 기록으로 보존한다.

## 자동 검사와 독립 검토

- 최종 코드에서 `npm test`: 125개 통과, 실패 0개. 안내창의 제목 초점·초기 스크롤 수정까지 포함한다.
- `npm run check`: 300개 레벨 모두 풀이 가능, 평균 최적 이동 4.28회.
- `npm run check:assets`: 게임 이미지 25개, 2.35 MiB, `nocturne-8f72a32c7dc7` 검증 통과.
- 기획 에이전트가 별도 작성자의 타이틀과 빔 구현을 검토했다. [타이틀 검토](../design/ancient-forest-title-independent-review.md), [빔 검토](../design/ancient-forest-beam-independent-review.md).
- 별도 검토자가 음악·오디오·장치 안내 테스트 20개와 SW/빌드 포함 목록·출처 명부를 확인했다. 자신이 작성한 빔 코드는 그 승인 범위에서 제외했다.
- Blender 원본을 실제 열어 세 장면과 외부 링크 부재를 확인했다. GPT 입력·출력·프롬프트, Blender 생성기·원본·출력의 해시가 기록과 일치한다. [아트 독립 검토](../design/ancient-forest-art-independent-review.md).
- 96초 음악의 악보와 생성기로 동일 WAV를 파일 변경 없이 재현했다. 루프 경계 전후 기울기·곡률이 이어지고, 무음인 1초 구간이 없다. v1 원본·악보·생성기는 보존했다.

## Ego Lite 실측

별도 `localhost:8017` 검증 주소를 사용해 사용자 `localhost:8000` 진행 데이터를 건드리지 않았다. 실제 마우스·키보드 입력과 Canvas 화면을 함께 확인했다.

- 타이틀 1440×900, 390×844, 614×427: 중앙 명암, 상징과 게임명의 간격, 글자 획 보존, 설명과 시작·설정 버튼의 가독성을 확인했다. 타이틀의 모서리 문구는 없고 설정은 시작 버튼 아래에 있다.
- 게임 1100×800, 390×844, 320×720: 새 숲이 게임에도 이어지며, 좁은 화면에서 여섯 HUD 버튼이 한 줄에 들어간다. 320px 화면의 가로 넘침은 없다.
- 17번 퍼즐에서 실제 거울을 두 번 눌러 첫 완료 직후 다음 레벨 모달이 열렸다. 다음 버튼으로 18번에 진입했고 완료창이 사라졌다.
- 첫 번째 거울 조작 후 실제 경로를 따라 목적지에 빛이 닿고 접촉 효과가 표시되는 화면을 확인했다. 목표 중심까지 연장하는 빔, 문 봉인 해제 시점, 도착·유지·연결 해제 효과는 전용 테스트와 독립 검토로 함께 확인했다.
- 장치 안내는 처음 열 때 제목부터 보이고, Tab으로 닫기에 이동해 Enter로 닫을 수 있다. Escape와 원래 버튼으로의 초점 복귀도 확인했다.
- 석문 자체를 누르면 해당 문 규칙만 표시됐다. 설명을 여는 동안 이동 횟수·힌트·거울 방향·저장 데이터가 모두 유지됐다.
- 게임 중 설정에서 간결한 도형과 조각 아트를 전환해 실제 렌더러 반영과 이동 횟수 보존을 확인했다.
- 실제 입력으로 음악을 활성화한 뒤 음소거 시 소스가 제거되고, 재개 시 저장된 35.102766초 위치에서 재생됐다. 브라우저에서 디코딩한 길이는 96초이며 `loop=true`였다.
- 재개 후 100.083810초 동안 21회 측정한 모두에서 같은 소스가 유지됐다. 시작 순간은 1.6초 페이드인으로 RMS 0이었고, 이후 20회 측정의 최저 RMS는 0.015686, 마지막 RMS는 0.024356이었다. 한 루프를 넘겨도 소스 교체 없이 신호가 출력됐다.
- 검증 주소에서만 서비스 워커를 명시적으로 등록했다. v8 설치 직후 음악은 캐시에 없었고, 첫 제어된 요청 후 9,216,044바이트 전부 저장됐다. 음악은 설치 다운로드에 포함되지 않는다.
- `npm run build`는 77개 실행 파일을 만들었다. `localhost:8014`로 각 파일을 요청해 모두 HTTP 성공·크기·SHA256 일치를 확인했다. 원본·도구·테스트·검토 문서는 배포 목록에 없으며, 음악은 v2 WAV 하나만 포함한다. `git diff --check`도 통과했다.
- 사용자 `localhost:8000`의 기존 워커를 정상 업데이트한 뒤 네트워크 캐시와 서비스 워커 우회를 끄고 다시 로드했다. v8 코어 캐시와 현재 에셋 25개가 오류 없이 준비됐고, 타이틀 두 이미지도 디코딩됐다. 재로드 전후 `glintgrove_save_v2` 내용은 동일했다. 현재 화면은 [ilyndrel-ancient-local-final.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-ancient-local-final.png)로 확인했다.

검증 캡처는 [ilyndrel-ancient-title-desktop-v2.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-ancient-title-desktop-v2.png), [ilyndrel-ancient-title-mobile-v2.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-ancient-title-mobile-v2.png), [ilyndrel-ancient-title-short-v2.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-ancient-title-short-v2.png), [ilyndrel-ancient-game-320.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-ancient-game-320.png), [ilyndrel-ancient-beam-first-contact.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-ancient-beam-first-contact.png), [ilyndrel-ancient-first-clear.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-ancient-first-clear.png), [ilyndrel-ancient-guide-mobile-fixed.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-ancient-guide-mobile-fixed.png), [ilyndrel-ancient-gate-guide.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-ancient-gate-guide.png)에 남겼다. 임시 캡처는 배포 파일이 아니다.

## 범위

물리 스피커로 직접 청음한 평가는 수행하지 않았다. 음악의 신호·재생 수명·루프 경계는 수치 및 브라우저에서 검증한다. 브라우저 정책상 처음에는 실제 클릭·터치·키 입력이 필요하다. 숨긴 탭은 재생 위치를 보존해 멈추고, 돌아온 뒤 다음 실제 입력에서 다시 재생한다.

파일과 제작 기록의 일치는 출처 추적과 재현성의 근거이며, 모든 환경의 동작이나 전 세계 비침해·독점 권리의 보증은 아니다.
