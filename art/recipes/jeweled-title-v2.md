# 보석 타이틀 v2 · 제작과 갱신

2026-09-14. 메인 화면의 별도 상징을 빼고, 게임명 자체에 금세공·녹색 보석·덩굴 장식을 결합했다. 세 주요 메뉴는 지도 제목과 같은 `var(--serif)`/400을 사용한다. 외부 폰트 파일을 배포하지 않는다.

## 이미지 제작

- 최종 PNG: [ilyndrel-wordmark-v2.png](../source/gpt/ilyndrel-wordmark-v2.png), 2172×724 RGB.
- 실행 이미지: [ilyndrel-wordmark-v2.webp](../../assets/site/ilyndrel-wordmark-v2.webp). 원본 픽셀과 크기를 보존한 lossless WebP다.
- 내장 `image_gen.imagegen`으로 생성했다. 정확한 모델 버전은 도구가 반환하지 않았다. Blender로 만들었다고 기록하지 않는다.
- 1차 입력은 프로젝트의 기존 게임명 v1과 숲 v6였다. [디자인 프롬프트](ilyndrel-wordmark-v2.prompt.txt), [1차 생성 기록](ilyndrel-wordmark-v2-design.json)에 두 참조와 중간 출력의 해시가 있다. 외부 이미지·모델·텍스처·폰트는 가져오지 않았다.
- 1차 출력은 투명 요청에도 회색 체크무늬가 들어간 RGB였다. 해당 파일은 제작 원본으로만 보존하고 배포하지 않는다. 추가 투명 추출 시도도 RGB로 돌아와 선택하지 않았다.
- 최종 단계는 같은 디자인을 입력하고 체크무늬를 순수 검정 배경으로 바꾸도록 이미지 도구에 요청했다. [실제 최종 프롬프트](ilyndrel-wordmark-v2-black.prompt.txt), [최종 입력·출력·내보내기 기록](ilyndrel-wordmark-v2.json).
- 최종 파일은 **알파가 없는 검정 매트 이미지**다. CSS `screen` 합성으로 검정을 배경과 섞는다. 타이틀 화면의 스태킹 구성을 조정해 실제 숲과 합성하며, 글자·보석을 자르지 않고 전체 3:1 이미지를 표시한다. 이미지 원본을 별도 스크립트로 누끼 처리하거나 재도색하지 않았다.
- 이전 상징 및 게임명 파일은 보존하지만 메인 화면·현재 서비스 워커·`dist/`에서는 제외한다.

## 새 버전 만들기

원본·제작 기록은 `art/source/gpt/`와 `art/recipes/`, 실행 이미지는 `assets/site/`에 둔다. 정식 버전을 교체할 때는 새 버전 이름을 사용하고 참조·프롬프트·출력·실행 파일 SHA256을 함께 기록한다. 생성 도구가 실제 알파를 반환했는지 확인하고, RGB 검정 매트이면 현재 합성 방식을 유지한다.

현재 파일의 무손실 내보내기 명령:

```bash
.venv-art-build/bin/python - <<'PY'
from PIL import Image
Image.open('art/source/gpt/ilyndrel-wordmark-v2.png').save(
    'assets/site/ilyndrel-wordmark-v2.webp', 'WEBP', lossless=True, method=6)
PY
```

새 경로를 `index.html`, `sw.js`, `tools/build-release.mjs`, `tools/record-visual-provenance.mjs`에 반영하고 서비스 워커 코어 버전을 올린다. `publish_art.py`는 사이트 게임명 이미지를 만들지 않는다.

```bash
npm test
npm run check:assets
node tools/record-visual-provenance.mjs
npm run build
```

## 화면과 움직임

[UI 설계](../../docs/design/jeweled-title-design.md)와 [배경 움직임 기록](../../docs/design/jeweled-title-motion.md)에 담당 파일과 동작을 정리한다. 새 도움말은 게임을 시작하거나 저장된 진행을 바꾸지 않고 규칙을 설명한다. 배경은 기존 숲 v6 정지 이미지 위에서 Canvas 안개·물빛·작은 빛이 움직인다. 설정의 움직임 끄기와 OS의 모션 감소를 따른다.

화면 크기별 캡처·버튼 동작·배경 정지·테스트·배포 파일 검사는 [최종 검증 기록](../../docs/art/jeweled-title-verification.md)에 있다.

이 기록은 생성 과정과 파일 일치를 추적하는 자료다. 독점 권리나 전 세계 비침해를 보증하지 않는다.
