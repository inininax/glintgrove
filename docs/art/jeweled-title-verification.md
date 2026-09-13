# 보석 타이틀 검증 · 2026-09-14

현재 제작 경로는 [보석 타이틀 v2 레시피](../../art/recipes/jeweled-title-v2.md)를 따른다. 기존 서버 하나를 사용하고, 브라우저 동작 검사는 사용자 `localhost:8000`과 별도 origin인 `127.0.0.1:8000/?debug`에서 수행했다. 검증용 서버를 추가로 띄우지 않았다.

## 실제 화면

- Ego Lite에서 1440×900, 390×844, 614×427 화면을 직접 확인했다. 별도 상징이 없고, 금빛 게임명·보석·아래 펜던트가 모두 보인다. 검정 사각형이나 체크무늬 없이 숲과 합성된다.
- 설명은 데스크톱18px, 좁은 화면17px, 낮은 창16px로 이전보다 커졌다. 전폭 시작 버튼 아래에 같은 높이의 이어하기·일일 챌린지가 윤곽선 버튼으로 나란히 놓인다. 그 아래는 톱니바퀴 옵션과 도움말이다.
- 390px 화면에서 세 주요 버튼의 computed font-family는 지도 제목과 동일한 `Georgia, "Iowan Old Style", AppleMyungjo, Batang, serif`, 굵기는 모두400, 글자21px, 높이60px였다. 데스크톱은22px/62px, 낮은 창은 같은 높이54px다.
- 614×427에서 타이틀의 scrollHeight/clientHeight는 모두427이며 모든 메뉴가 화면 안에 들어온다. 영어320×720에서도 가로 넘침 없이 세 버튼이 모두60px로 유지된다.
- 타이틀 도움말은 제목에 초점을 두고 맨 위에서 열렸다. Escape로 닫으면 도움말 버튼으로 초점이 돌아오며, 여닫기 전후 저장 문자열과 화면이 동일했다.
- 실제 시작 버튼은 숲의 지도를 열었다. 이어하기는 저장된 해금 레벨13을 열었고, 일일 챌린지는 날짜 표시가 있는 퍼즐을 이동0회로 시작했다. 해당 검사에서 퍼즐 완료나 보상 획득을 수행하지 않았다.

캡처: [ilyndrel-jeweled-desktop-v2.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-jeweled-desktop-v2.png), [ilyndrel-jeweled-mobile-v2.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-jeweled-mobile-v2.png), [ilyndrel-jeweled-short-v2.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-jeweled-short-v2.png), [ilyndrel-jeweled-english-320.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-jeweled-english-320.png), [ilyndrel-jeweled-help-mobile.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-jeweled-help-mobile.png). 임시 검증 캡처는 배포하지 않는다.

## 움직임

실제 설정 스위치와 OS 모션 감소 에뮬레이션을 사용하고, Canvas의 시간과 픽셀을 연속8프레임 측정했다.

| 상태 | 서로 다른 배경 시각 | 서로 다른 픽셀 해시 |
| --- | ---: | ---: |
| 설정에서 움직임 끄기 | 1 | 1 |
| 움직임 켜기 | 8 | 8 |
| OS 모션 감소 켜기 | 1 | 1 |

따라서 정지 옵션에서는 실제 배경 픽셀도 멈추고, 켜면 화면이 변한다. 안개·반사·작은 빛의 타이틀 한정 강화와 장시간 연속성은 별도 테스트·독립 검토로 확인했다. 정지 숲 PNG 자체를 동영상으로 만들었다는 의미는 아니다.

## 자동 검사와 배포 묶음

- `npm test`의 최종 TAP: 131개 통과, 실패0개. 도움말 회귀3개와 배경 회귀3개가 추가됐다. 결과 로그는 [ilyndrel-jeweled-tests.log](../../art/history/2026-09-14-complete-work/review/logs/ilyndrel-jeweled-tests.log)에 있다. 로그를 요약하던 셸 래퍼의 예약 변수 사용 오류는 테스트 완료 후 발생했으며 테스트 실패가 아니다.
- 게임 이미지 검사: 25개, 2.35MiB, `nocturne-8f72a32c7dc7` 정상. 게임 이미지·음악은 이번 타이틀 작업에서 교체하지 않았다.
- 최종 PNG와 lossless WebP는 2172×724 RGB이며 디코딩한 픽셀 바이트가 동일하다. 제작 기록의 입력·프롬프트·출력과 내보내기 해시를 재귀적으로 연결했다. 명부는 게임 이미지25개, 사이트 이미지3개, 음악1개, 코드·레시피77개를 기록한다.
- `npm run build`: 실행 파일76개. 같은 서버의 `/dist/`로 모든 파일을 요청해 HTTP 성공·바이트 수·SHA256 일치를 확인했다. 이전 상징과 게임명, 중간 제작안, 원본·도구·검토 문서는 배포 목록에 없다.
- 서비스 워커 코어 버전은 `glintgrove-core-v9-jeweled-title`이다. 새 게임명 경로를 설치 목록에 넣고 이전 두 타이틀 이미지는 뺐다. 음악의 지연 캐시 정책은 유지한다.
- 사용자 `localhost:8000`의 기존 워커가 v9로 활성화된 뒤 캐시 우회 없이 다시 로드했다. 새 게임명과 게임 에셋25개가 모두 준비됐고 이전 상징 DOM은0개였다. 재로드 전후 저장 문자열이 동일했다. 최종 화면은 [ilyndrel-jeweled-local-final.png](../../art/history/2026-09-14-complete-work/review/captures/ilyndrel-jeweled-local-final.png)로 확인했다. 실행 중인 게임 서버는8000 하나다.

## 독립 검토

별도 검토 에이전트가 구현자의 작성 단계 이후 읽기 전용으로 승인했다. UI·장치 안내·언어·튜토리얼 테스트27개와 배경 테스트8개가 통과했다. 실제 화면3종, 생성 이미지의 동일 픽셀, 출처 고유142개 경로의 해시·크기, SW의 전체40개 JS 포함, 배포76개 항목을 확인했다. 검토 중 발견한 중간 제작 기록의 잘못된 투명 설명과 누락된 참조 증거 경로는 수정·재기록 후 검토자가 다시 확인했다. 검토자가 과거 작성했던 빔 코드는 이번 승인 범위에 포함하지 않았다.

이 검증은 위 화면 크기와 로컬 Ego Lite 환경 및 자동 검사의 범위다. 생성 도구의 정확한 모델 버전·계약상 권리·전 세계 비침해를 증명하는 자료는 아니다.
