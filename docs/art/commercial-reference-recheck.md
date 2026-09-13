# 현재 아트의 외부 참고 범위 재확인

확인일: 2026-09-13. Git 반영 전 현재 작업본을 대상으로 재확인했다. [초기 참고 조사](reference-research.md)는 제작 방향을 결정한 이력이며, 그 문서에 언급된 이미지 모델 배경은 이후 자체 Blender 장면으로 교체했다.

## 다시 확인한 제작자 자료

| 공식 자료 | 공개 페이지에서 확인한 내용 | 이 프로젝트에서의 사용 |
| --- | --- | --- |
| [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) | 3D 자연 소품, 파일 330개, CC0 표시와 선택적 후원 다운로드 | 나무·바위·지피 식물의 분류와 작은 화면에서 읽히는 실루엣을 참고했다. 파일을 다운로드하거나 포함하지 않았다. |
| [Kenney Particle Pack](https://kenney.nl/assets/particle-pack) | 2D/VFX, 파일 80개, CC0 표시와 선택적 후원 다운로드 | 효과 형태를 소수로 유지하고 크기·수명·투명도로 변주하는 제작 방향을 참고했다. 게임 입자는 직접 작성한 Canvas 경로다. |
| [Quaternius Stylized Nature MegaKit](https://quaternius.com/packs/stylizednaturemegakit.html) | 자연 모델 116개와 CC0 표시. 무료 구성이 전체의 일부이며 추가 구성·Blender 원본은 별도 등급으로 구분된다. | 숲을 여러 크기의 식물 군집으로 구성하는 방향을 참고했다. 유료·무료 구성 어느 쪽도 반입하지 않았다. |

표의 제작 방향은 이 게임의 설계 판단이며 제작자가 이 프로젝트를 승인했다는 뜻이 아니다. 상품의 구체적인 모델·텍스처·홍보 이미지를 추출하거나 변형하지 않았다. 추가 결제, 외부 에셋 구매, 이미지 생성 API 호출은 이번 최종 확인에 포함되지 않는다.

## 현재 결과물과 연결

- 21개 소품은 `art/source/blender/grove-library-v1.blend`의 실제 모델·재질·조명·카메라에서 렌더한 결과다.
- 네 배경과 공유 이미지는 `art/source/procedural/nocturne-environments-v2.blend`의 절차적 숲 장면에서 렌더했다. 제작자가 다른 모델이나 사진·텍스처를 불러오는 방식이 아니다.
- 사이트 아이콘, UI 선 기호와 보드·입자·광선 표현은 로컬 SVG/Canvas 코드로 작성했다.
- 현재 카탈로그의 외부 에셋 파일 의존성은 발견되지 않았다. 파일별 원본·마스터 연결과 해시는 [현재 명부](../legal/replacement-register.json)에 있다.

[Blender 공식 라이선스 안내](https://www.blender.org/about/license/)는 Blender로 만든 이미지·장면 등 결과물의 상업적 사용을 허용하고, 공개하는 Blender API 스크립트에는 GPL에 맞는 라이선스를 요구한다고 설명한다. 이 프로젝트는 해당 스크립트 다섯 개에 한정해 [고지와 라이선스 원문](../../tools/art/LICENSES.md)을 포함한다. 게임 전체나 아트에 일괄 GPL을 지정한 것이 아니다. 공식 페이지 직접 가져오기는 402를 반환했으나 같은 공식 URL의 검색 색인 본문에서 해당 안내를 확인했다.

이 확인은 유료·비상업용 외부 에셋을 게임에 사용하지 않는다는 제작 방식과 일치한다. 계약상 권리 귀속, 독점 저작권 성립 또는 게임명 상표를 확정하는 검사는 아니며, [권리 검토 범위](../legal/remake-audit.md)의 한계는 유지한다.
