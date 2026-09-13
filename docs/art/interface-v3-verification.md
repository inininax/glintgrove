# 메인 메뉴·광선·아트 스튜디오 통합 검증

2026-09-14. 메인 메뉴의 버튼을 숲의 짙은 녹색과 얇은 금속 테두리로 통일했습니다. 광선은 레벨 시작과 동시에 전체 경로가 보이며, 흐르는 하이라이트와 발사부 후광으로 계속 빛을 보내는 모습을 표현합니다. 제작자는 별도의 로컬 아트 스튜디오에서 이미지와 음악, 원본 파일과 제작 기록을 확인할 수 있습니다.

## 구현 범위

- [메인 버튼 디자인](../design/title-buttons-v3.md): 기본·보조 버튼과 옵션·도움말 아이콘에 같은 테두리와 표면을 적용합니다. 글꼴은 숲의 지도와 같습니다.
- [광선 디자인](../design/beam-emission-v3.md): 최초 노출 지연을 없애고 광선의 밝은 중심, 움직이는 빛 띠, 발사부 후광을 그립니다. 장치·목표 접촉점과 색 판정은 유지하며 움직임 감소 설정에서는 정지합니다.
- [아트 스튜디오 안내](art-studio.md): 배경 4개, 소품 21개, 사이트 이미지 3개, 음악 1개를 검색·확대하고 제작 원본과 비교합니다. 게임 사용자 메뉴와 실행용 배포에는 포함하지 않습니다.

이번 추가 시각 요소는 직접 작성한 CSS·SVG·Canvas 코드입니다. 외부 이미지·음원·폰트·라이브러리를 추가하지 않았습니다. 기존 에셋의 제작 이력은 [대체 파일 기록](../legal/replacement-register.json)에 유지합니다. 이 기록은 파일의 출처와 무결성 확인이며 법률적 보증이 아닙니다.

## 실행 및 브라우저 확인

Ego Lite에서 기존 로컬 서버를 사용했습니다. 모바일 확인은 브라우저의 화면 크기 에뮬레이션이며 실제 모바일 기기 검사는 아닙니다. 테스트 페이지에서 오래된 서비스 워커 응답을 우회해 최신 모듈을 로드했고, 테스트에 사용한 로컬 저장 데이터는 원래 값으로 복원했습니다.

| 대상 | 확인 내용 | 결과 |
| --- | --- | --- |
| 메인 메뉴 | 1440×900, 390×844, 614×427, 320×568 화면; 작은 화면의 한국어·영어 버튼; 지도와 글꼴 일치; 옵션·도움말의 Escape 및 초점 복귀 | 통과 |
| 광선 | 레벨 17 최초 프레임에서 모든 경로 표시; 실제 클릭 두 번으로 첫 완료 모달 표시; 목표 중심까지의 연결; 데스크톱·모바일 표시 | 통과 |
| 움직임 감소 | 연속 12프레임의 게임 Canvas 이미지 일치 | 통과 |
| 아트 스튜디오 | 검색과 종류 필터, 빈 결과, 원본 전환, 링크, 실패한 새로고침의 기존 이미지 유지, 모바일 목록·확대 창 표시 | 통과 |
| 확대 창 키보드 | Tab 12회와 Shift+Tab 12회가 창 안에서 순환; 제목에서 역방향 이동; Escape 후 실행 버튼으로 초점 복귀 | 통과 |
| 음악 미리 듣기 | 기본 컨트롤로 재생·일시중지, 상태 문구, 단일 재생, 반복 선택, 상세 창을 닫으면 정지 | 통과 |
| 음악 반복 경계 | 96초 음원을 끝부분으로 이동한 뒤 처음으로 이어지는 재생 확인 | 통과 |

음악 반복 검사는 끝부분 탐색으로 경계 동작을 확인했습니다. 전체 96초를 반복 청취한 음향 평가를 뜻하지 않습니다.

브라우저 결과: [버튼 6개](../../art/previews/interface-v3/button-checks.json), [광선 및 첫 완료](../../art/previews/interface-v3/beam-checks.json), [스튜디오 18개](../../art/previews/interface-v3/studio-checks.json).

## 자동 검사와 배포 분리

- `npm test`: 133개 통과, 실패 0개. [실행 로그](../../art/previews/interface-v3/node-tests.txt)
- `npm run check:assets`: 게임 이미지 25개, 약 2.35 MB 검사 통과.
- `npm run build`: 실행 파일 76개 생성. 각 배포 파일의 SHA-256과 원본·배포 목록을 대조했고 `art/`, `tools/`, `tests/`, `docs/`가 포함되지 않음을 확인했습니다.
- `node tools/record-visual-provenance.mjs`: 게임 이미지 25개·사이트 이미지 3개·음악 1개·소스/제작 기록 80개의 목록 갱신. 현재 참조되는 중복 제외 151개 파일의 해시와 크기 불일치 0개입니다. 과거 폐기 파일 목록은 별도의 역사 기록으로 보존했습니다.
- 서비스 워커의 코어 캐시를 `glintgrove-core-v10-luminous-menu`로 갱신했습니다.

작성과 독립 검토는 서로 다른 에이전트가 맡았습니다. 광선 검토에서는 집중 회귀 검사 42개와 300개 레벨의 시작·해답 상태 총 600장면, 10,239개 광선 구간을 확인했습니다. 버튼·스튜디오 검토에서는 관련 기존 검사 32개와 에셋·원본·제작 기록 링크 112개, 허용하지 않는 경로 입력 11개를 확인했습니다. 최종 키보드 수정과 실제 Ego 결과, 갱신된 스튜디오 화면 4장까지 재검토해 차단 문제 없이 승인했습니다.

## 화면 기록

| 메인 화면 | 광선 | 아트 스튜디오 |
| --- | --- | --- |
| [데스크톱](../../art/previews/interface-v3/title-desktop.png) | [발사 상태](../../art/previews/interface-v3/beam-desktop.png) | [데스크톱 목록](../../art/previews/interface-v3/studio-desktop.png) |
| [모바일](../../art/previews/interface-v3/title-mobile.png) | [목표 연결](../../art/previews/interface-v3/beam-connected-desktop.png) | [모바일 목록](../../art/previews/interface-v3/studio-mobile.png) |
| [작은 화면](../../art/previews/interface-v3/title-small.png) | [도착 상태](../../art/previews/interface-v3/beam-arrival-desktop.png) | [원본 확대](../../art/previews/interface-v3/studio-detail-desktop.png) |
| [높이가 낮은 화면](../../art/previews/interface-v3/title-short.png) | [모바일 광선](../../art/previews/interface-v3/beam-mobile.png) | [모바일 확대](../../art/previews/interface-v3/studio-detail-mobile.png) |

[변경 전 메인 화면](../../art/previews/interface-v3/title-before.png)도 비교 자료로 보존했습니다.
