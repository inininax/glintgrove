> 교체 전 조사 스냅샷입니다. 현재 작업본의 교체 결과는 [재제작 기록](../../remake-audit.md)을 확인하세요. 아래 해시·파일 상태·화면 관찰은 당시 버전에 해당합니다.

# Glintgrove 글꼴·Unicode 기호 점검

검토일: 2026-09-13. 대상: 현재 HTML/CSS/JavaScript, `assets/`, `art/previews/`, 개발용 Art Studio. 이 문서는 글꼴 이용 방식과 확인한 조건의 기록이며, 게임 전체의 권리 보증이나 라이선스 부여가 아니다.

**현재 게임은 기기에 설치된 글꼴로 문자와 이모지를 표시한다. 글꼴 파일이나 특정 회사의 이모지 이미지 세트를 게임에 배포하는 구성은 발견되지 않았다.** Microsoft는 Windows 글꼴 이름을 웹 CSS에 지정하는 방식을 명시적으로 허용하고, Apple은 macOS에 포함된 글꼴의 화면 표시·인쇄를 허용한다. 이 근거로 현재의 시스템 글꼴 호출이나 Unicode 이모지 문자를 상업 게임에서 사용한다는 이유만으로 금지라고 판단하지 않는다. 해당 OS의 적법한 이용과 개별 글꼴 조건은 전제이며, PNG로 고정한 과거 이미지의 제작 경위까지 이 결론이 인증하는 것은 아니다. [Microsoft 공식 FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq#web), [Apple macOS Tahoe 26 SLA §2E, PDF 3쪽](https://www.apple.com/legal/sla/docs/macOSTahoe.pdf)

## 1. 현재 코드와 실행 증거

| 위치 | 실제 지정 | 구분 |
|---|---|---|
| [css/style.css:12](../../css/style.css#L12) | `Georgia, 'Iowan Old Style', 'AppleMyungjo', 'Batang', serif` | 제목·챕터·모달 등에 사용하는 설치 글꼴 우선순위 |
| [css/style.css:13](../../css/style.css#L13) | `'Apple SD Gothic Neo', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | 본문·버튼 등의 설치 글꼴 및 시스템 별칭 |
| [src/render/entities.js:262](../../src/render/entities.js#L262) | `bold …px system-ui, sans-serif` | 기존 게이트 대체 렌더의 문자 |
| [src/render/entities.js:294](../../src/render/entities.js#L294) | `…px Georgia, serif` | 포털 구분용 `I`, `II`를 Canvas에 그리는 설정 |
| [src/render/entities.js:332](../../src/render/entities.js#L332) | `600 …px system-ui, sans-serif` | 빛 색상 구분 문자 `R`, `G`, `B` 등 |
| [tools/art-preview.css:1](../../tools/art-preview.css#L1) | `-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, sans-serif` | 개발용 갤러리 본문 |
| [tools/art-preview.css:14](../../tools/art-preview.css#L14), [38](../../tools/art-preview.css#L38) | `Georgia, serif` | 개발용 갤러리 제목 |
| [tools/art-preview.css:52](../../tools/art-preview.css#L52) | `ui-monospace, SFMono-Regular, Consolas, monospace` | 개발용 에셋 ID 표시. 파일을 읽거나 제공하지 않고 설치된 글꼴만 요청 |
| [tools/art-preview.js:134](../../tools/art-preview.js#L134) | `11px system-ui` | 실패한 에셋의 대체 상태 문구 |

`src`, `css`, `index.html`, `tools/art-preview.*`에서 `@font-face`, `FontFace` 생성, Google Fonts URL, 폰트 데이터 URL, 글꼴 파일 로딩을 발견하지 못했다. Git 추적 파일 및 `rg --files`로 확인한 제품 소스·에셋 경로에서 `.ttf`, `.otf`, `.ttc`, `.woff`, `.woff2`, `.eot`, `.dfont` 파일도 발견하지 못했다. 로컬 프로그램·가상환경 안의 패키지 글꼴까지 없다는 뜻은 아니다.

별도 브라우저 관측 기록 `art/build/legal/runtime-visual-audit.json`도 읽어 대조했다. 이 파일은 Git 제외 대상이므로 주요 결과를 아래에 보존한다.

- 관측 시각: `2026-09-13T08:39:47.470Z`. 로컬 OS: macOS `26.6.2`.
- `.title-logo`: `Georgia`, `isCustomFont: false`.
- `#ach-title`: `AppleMyungjo`와 `Georgia`, 모두 `isCustomFont: false`.
- 실제 `#ach-list .ach-icon`의 `🌱`: `Apple Color Emoji`, `isCustomFont: false`.
- 관측한 리소스 64개에 외부 리소스 없음. CSS `@font-face` 없음, `document.fonts.size`는 0.
- 증거 파일 SHA-256: `2a11cc3973df35bad310a600bd19c98b57c9b776ccca480666e58e9a9b4daefa`.

이는 관측한 Mac 화면의 결과다. Windows에서 Segoe UI·Batang이 실제 사용되었다는 증거는 아니며, 다른 문자·OS·브라우저에서는 대체 글꼴이 달라질 수 있다. `document.fonts.size`가 0이라는 것은 다운로드·등록한 웹 FontFace가 없다는 증거 중 하나이며, 시스템 글꼴 자체가 없다는 뜻이 아니다. WebKit도 `-apple-system`을 웹 콘텐츠에서 플랫폼 글꼴을 사용하는 방법으로 설명한다. [WebKit 공식 설명](https://webkit.org/blog/3709/using-the-system-font-in-web-content/)

## 2. 현재 Unicode 이모지·기호 목록

아래는 현재 제품 소스와 개발 도구의 비ASCII 기호를 문자 단위로 검색하고 실제 표시 경로를 확인한 목록이다. 한글·영문·일반 문장부호는 별도 에셋으로 취급하지 않았다. 이 목록에는 24개 기호 코드포인트와 표시 선택자 `U+FE0F`가 포함된다. 화면의 모양은 설치 글꼴이 결정하며, 아래 문자를 썼다는 사실이 특정 플랫폼의 그림 파일을 포함했다는 뜻은 아니다.

| 용도 | 문자와 코드포인트 | 코드 근거 |
|---|---|---|
| 업적 9종 | `🌱 U+1F331`, `🌄 U+1F304`, `🌫️ U+1F32B U+FE0F`, `✨ U+2728`, `💎 U+1F48E`, `🧠 U+1F9E0`, `📅 U+1F4C5`, `🔥 U+1F525`, `🌟 U+1F31F` | [src/services/achievements.js:6](../../src/services/achievements.js#L6), 12, 18, 24, 30, 36, 42, 48, 54. [src/ui/ui.js:281](../../src/ui/ui.js#L281)에서 텍스트로 삽입 |
| 문맥 도움말 토스트 | `💡 U+1F4A1` | [src/main.js:132](../../src/main.js#L132) |
| 일일 퍼즐 HUD | `☀️ U+2600 U+FE0F` | [src/main.js:298](../../src/main.js#L298), [370](../../src/main.js#L370) |
| 장식·업적 알림 | `✧ U+2727` | [index.html:25](../../index.html#L25), 54, 75, 80, 137 및 [src/main.js:84](../../src/main.js#L84). 이 문자는 직접 만든 SVG가 아니라 Unicode 문자임 |
| 별점·공유 문구 | `★ U+2605`, `☆ U+2606` | [src/ui/ui.js:140](../../src/ui/ui.js#L140), [index.html:83](../../index.html#L83), [src/ui/strings.js:46](../../src/ui/strings.js#L46), 77, 123, [src/services/achievements.js:56](../../src/services/achievements.js#L56) |
| 튜토리얼 장치 설명 | `◇ U+25C7`, `◈ U+25C8`, `Ⓐ U+24B6`, `◎ U+25CE` | [src/services/tutorial.js:13](../../src/services/tutorial.js#L13), 16, 19 및 [src/ui/strings.js:62](../../src/ui/strings.js#L62), 68 |
| 뒤로·다음 | `← U+2190`, `→ U+2192` | [src/ui/strings.js:35](../../src/ui/strings.js#L35), 42, 112, 119; [index.html:59](../../index.html#L59), 86 |
| 개발 도구 기호 | `↗ U+2197`, `↻ U+21BB`, `● U+25CF`, `× U+00D7`, `→ U+2192` | [tools/art-preview.html:15](../../tools/art-preview.html#L15), 19, 29; [tools/art-preview.css:20](../../tools/art-preview.css#L20); [tools/art-preview.js:64](../../tools/art-preview.js#L64); `tools/check-assets.mjs:27`, `tools/analyze-events.mjs:7` |

`U+FE0F`는 이모지 표시를 요청하는 선택자이며 자체 그림 파일이 아니다. Unicode는 문자·문자열과 실제 이모지 그림의 표현을 구분한다. Unicode 문서에 실린 컬러 샘플의 권리는 각 제공자에게 있으며, Unicode가 해당 그림의 상업적 재사용 권한을 대신 주는 것은 아니다. **차트의 Apple·Microsoft 그림을 다운로드하는 행위와, 게임 HTML에 이모지 문자를 넣어 사용자의 기기에서 표시하는 현재 방식은 구분해야 한다.** 이는 코드 경로와 표준의 설명을 함께 본 해석이다. [Unicode UTS #51 §1.4, §4.1](https://www.unicode.org/reports/tr51/), [Unicode Emoji Images and Rights](https://www.unicode.org/emoji/images.html)

빛·되돌리기·재시작·지도 버튼과 나뭇잎 문장, 잠금 표시, 튜토리얼 포인터는 현재 [index.html](../../index.html) 및 [src/ui/ui.js](../../src/ui/ui.js)에 있는 SVG 경로다. SF Symbols, 아이콘 폰트, 외부 이모지 PNG/SVG 세트 로더는 발견되지 않았다. 이 코드 구성 사실이 모든 기존 SVG의 창작 경위를 독립적으로 입증하는 것은 아니다.

## 3. 공식 조건을 현재 구성에 적용하면

### Windows에서의 표시와 파일 배포

Microsoft FAQ는 Windows에 설치된 시스템 글꼴을 웹의 CSS 우선순위에 지정할 수 있고, 웹 제작자가 Windows 라이선스를 보유할 필요도 없다고 설명한다. 사용은 서버가 아니라 방문자의 기기에서 이루어진다. 이 안내는 Windows의 시스템 기호·이모지 글꼴에도 적용된다. 반면 Windows 글꼴을 웹 서버에 복사하거나 WOFF/비트맵 폰트로 변환하는 권한은 기본 제공되지 않는다. 문서 임베딩 권한도 게임에 글꼴을 넣는 권한으로 확장되지 않는다. 문구·로고를 고정한 그래픽 파일의 게임 사용은 별도로 허용하지만, 낱글자별 비트맵 폰트 제작은 구별한다. 상업 이용을 제한하는 제작 앱을 쓰는 경우에는 그 조건도 적용한다. [Microsoft 공식 FAQ — Web, Document embedding, Redistribution](https://learn.microsoft.com/en-us/typography/fonts/font-faq)

현재 코드는 이 중 기기 글꼴을 요청하는 방식이다. `Georgia`, `Segoe UI`, `Batang`, `Consolas`라는 이름이 소스에 있다는 이유로 별도 게임용 글꼴 배포 라이선스가 필요하다고 결론내리지 않는다. Windows 11 공식 목록은 Georgia·Segoe UI·Consolas, 한국어 추가 글꼴의 Batang을 구분해 열거한다. 사용 가능 여부는 실제 설치 상태에 달려 있다. [Microsoft Windows 11 글꼴 목록](https://learn.microsoft.com/en-us/typography/fonts/windows_11_font_list)

### macOS에서의 표시와 개별 임베딩 조건

macOS Tahoe SLA §2E는 해당 OS 실행 중 포함된 글꼴로 내용을 표시·인쇄하도록 허용하며, 글꼴을 콘텐츠에 포함하려면 그 글꼴의 임베딩 조건을 따르도록 한다. 이 조항에 화면 글꼴 사용을 개인·비상업용으로만 제한하는 문구는 없다. 별도 목소리·다른 앱 콘텐츠 조항의 제한을 글꼴에 자동 적용하지 않았다. **이 조항을 모든 Apple 글꼴 파일의 자유 재배포 또는 Apple 이모지 그림의 독립 상품화 허가로 확장하지 않는다.** [Apple macOS Tahoe 26 SLA §2E](https://www.apple.com/legal/sla/docs/macOSTahoe.pdf)

Apple의 Tahoe 글꼴 목록에는 Apple SD Gothic Neo, AppleMyungjo, Apple Color Emoji, Georgia, Iowan Old Style이 실려 있다. 목록 등재는 파일의 재배포 허가와 같지 않다. [Apple 공식 포함 글꼴 목록](https://support.apple.com/en-us/122869)

로컬 시스템 파일은 복사하지 않고 이름·버전·임베딩 메타데이터만 읽었다. TTC는 첫 번째 글꼴만 확인했다.

| 로컬 파일의 가족 이름 | 확인 버전 | `OS/2.fsType` |
|---|---|---|
| Apple Color Emoji | `21.4d3e1` | `4` |
| Apple SD Gothic Neo | `21.0d1e6` | `8` |
| Georgia | `Version 5.00x-4` | `8` |
| Iowan Old Style | `14.0d1e1` | `4` |
| AppleMyungjo | `13.0d1e6` | 이 파일에 OS/2 테이블 없음 |

OpenType 명세에서 `4`는 문서의 미리보기·인쇄 임베딩, `8`은 편집 가능한 문서 임베딩을 뜻한다. **이 숫자는 웹폰트·게임 폰트 배포 허가증이 아니며, 필드가 없는 것도 허가를 의미하지 않는다.** 로컬 Georgia의 라이선스 이름 레코드 역시 제공 제품 EULA와 포함된 임베딩 제한을 따르도록 안내한다. 현재는 글꼴을 내보내지 않으므로 이 정보를 근거로 불필요한 파일 추출·변환을 수행하지 않았다. [OpenType OS/2 `fsType` 명세](https://learn.microsoft.com/en-us/typography/opentype/spec/os2#fstype)

### 현재 이모지 사용 판단

현재 업적의 `🌱`은 실제로 기기의 Apple Color Emoji로 표시되었다. Apple의 포함 글꼴 목록, SLA의 글꼴 표시 조항과 이 관측을 함께 보면, 이는 OS 글꼴의 정상적인 화면 표시 경로로 해석된다. Windows에서도 앞의 Microsoft 안내가 시스템 이모지 글꼴을 포함한다. 따라서 현재 코드만으로 **상업 게임의 이모지 사용이 금지되었다거나 삭제해야 한다는 결론을 내릴 근거는 확인되지 않았다.** 기기별 글꼴 소유권은 각 권리자에게 있으며, 이 게임이 그 이모지 그림 자체를 직접 디자인했다고 표시해서도 안 된다. [Apple 글꼴 조항](https://www.apple.com/legal/sla/docs/macOSTahoe.pdf), [Microsoft 시스템 기호·이모지 안내](https://learn.microsoft.com/en-us/typography/fonts/font-faq)

Android·Linux 및 사용자가 별도로 설치한 글꼴의 모든 라이선스를 이번 조사에서 확인한 것은 아니다. `system-ui`나 일반 가족 이름은 그 환경의 사용 가능한 글꼴로 대체되므로, 지금의 CSS가 특정 공급자 파일을 다른 OS로 옮기는 동작은 없다. 앞으로 고정된 이모지 이미지나 폰트 파일을 제공하는 기능을 추가하면 실제 제공 파일의 라이선스를 다시 확인해야 한다.

## 4. PNG/JPEG에 이미 고정된 글자와 미리보기

| 파일/범위 | 확인한 화면·경로 | 남은 한계 |
|---|---|---|
| `assets/og.png` | 기존 1200×630 타이틀 화면. 현재 `index.html:12`의 공유 이미지다. 한글·영문 텍스트는 이미지 픽셀이며, 눈에 보이는 컬러 이모지는 발견하지 못했다. | 원 생성 환경·실제 글꼴·생성 스크립트가 확인되지 않았다. 현 CSS 글꼴을 과거 이미지에 그대로 소급하지 않는다. 폰트 위반이 확인되었다는 뜻은 아니다. |
| `art/previews/title-desktop-v1.png`, `title-mobile-v1.png` | 타이틀의 문자, `✧`, 직접 작성된 잎 SVG가 고정된 화면 | 현재 렌더와 일치하는 형태이나, 이미지 파일만으로 과거 렌더러의 모든 실제 글꼴을 식별할 수는 없음 |
| `art/previews/game-desktop-v1.png`, `game-heart-v1.png`, `game-mobile-v1.png` | HUD 문자, `R`·`I` 등 게임 표식, SVG 조작 버튼 | 런타임 글꼴 파일이 들어 있는 것이 아니라 화면 픽셀 |
| `art/previews/map-mobile-v1.png`, `win-mobile-v1.png`, `settings-mobile-v1.png` | 제목·본문 및 `★`, `☆`, `✧`, 화살표 | 확인한 화면에 별도 컬러 이모지 그림은 발견되지 않음 |
| `art/previews/art-studio-v1.png` | 갤러리의 문자와 `↗`, `↻`, `●`, 치수 표시 | 개발 화면 기록. 게임 런타임이 이 PNG를 읽지는 않음 |
| `art/previews/sprite-contact-sheet-v1.jpg` | 소품 21개와 영문 에셋 ID 라벨 | 콘택트 시트 라벨을 그린 스크립트·정확한 글꼴이 보존되어 있지 않아 **라벨 글꼴 미확인**. Pillow 기본 글꼴이라고 추정하지 않음 |

위 10개 미리보기와 기존 공유 이미지를 직접 열어 확인했다. 기기 화면 캡처의 고정된 글자와, 프로그램이 새 문자열을 조합하도록 낱글자를 나누어 제공하는 비트맵 폰트는 구별했다. 현재 미리보기는 후자의 문자 아틀라스가 아니다. `src/main.js:396`의 공유 기능도 텍스트·URL을 공유하며 이모지 글리프를 추출하지 않는다. `assets/icon.svg`와 인라인 파비콘에는 글꼴 기반 텍스트가 없다.

이 조사에서 **현 제품 코드의 폰트 재배포 위반이나 Unicode 문자의 상업 표시 금지를 확정할 증거는 발견되지 않았다.** 남은 구체적 사실은 과거 `og.png`와 개발용 콘택트 시트 라벨의 제작 환경이다. 이 미확인 사항을 현재 시스템 글꼴 사용 전체의 금지로 확대하지 않으며, 다른 게임 아트·코드·상표의 권리 판단은 [전체 상업 이용 점검](commercial-use-audit.md)의 범위에 남겨 둔다.
