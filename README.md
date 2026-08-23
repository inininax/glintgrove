# Glintgrove · 빛의 숲

> 거울을 회전해 어두운 숲에 빛을 전하면, 나무와 생물이 깨어납니다.

Glintgrove는 브라우저에서 바로 실행되는 **빛 반사 퍼즐 게임**입니다.
빛 발산원이 내보내는 빛을 거울(`/` `\`)과 분할기로 조작해, 숲 속의 나무 · 꽃 · 버섯 · 올빼미를 모두 깨우면 스테이지 클리어입니다.

**플레이하기: [GitHub Pages에서 열기](https://inininax.github.io/glintgrove/)** (배포 후 활성화)

---

## 특징

- **26개 수제 퍼즐 · 4챕터** — 새벽숲(거울 기초) → 안개 심연(분할기와 미로) → 별빛 정원(색상 빛) → 고대의 심장(포탈)
- **다양한 광학 장치**
  - `/` `\` 회전 거울 — 클릭으로 90도 회전
  - 분할기 — 빛을 통과시키며 동시에 반사
  - 크리스털(r/g/b) — 지나가는 빛을 물들임
  - 색상 문(A/B/C) — 같은 색의 빛만 통과
  - 포탈(P/Q·R/S) — 빛을 공간 이동
  - 암석 — 빛을 막는 장애물
- **깨어나는 숲**: 나무가 눈을 뜨고, 올빼미가 눈을 뜨고, 버섯이 형광으로 빛나는 연출
- **별점 시스템**: 최소 이동(par) 기반 ★3 평가, 도움말 사용 시 최대 ★2
- **도움말(힌트)**: 내장 솔버가 현재 상태에서 다음 수를 계산
- **되돌리기 / 초기화**, 진행 상황 자동 저장(localStorage)
- **절차적 사운드**: WebAudio로 생성한 앰비언트·효과음 (외부 파일 없음)
- **접근성**: 화면 효과 끄기(모션 최소화), 색약 모드(빛 무늬 + 문 문자 표기), 소리 끄기

## 실행 방법

빌드 과정이 없습니다. 정적 파일을 그대로 서빙하면 됩니다.

```bash
# 방법 1: 바로 열기
open index.html

# 방법 2: 로컬 서버 (권장)
python3 -m http.server 8000
# http://localhost:8000 접속
```

## 조작법

| 입력 | 동작 |
|---|---|
| 마우스 클릭 / 탭 | 거울·분할기 회전 |
| `R` | 레벨 초기화 |
| `U` / `Z` | 되돌리기 |
| `H` | 힌트 |
| `Esc` | 레벨 목록 / 모달 닫기 |

## 프로젝트 구조 (v1.1 — 네이티브 ESM)

빌드 도구 없이 **표준 ES Modules**만 사용합니다. 모든 임포트는 상대 경로이며 GitHub Pages에 그대로 배포됩니다.

```
glintgrove/
├── index.html              엔트리 (module script 1줄 + UI 오버레이, CSP 메타)
├── manifest.webmanifest    PWA 매니페스트
├── sw.js                   서비스 워커 (오프라인 캐시)
├── package.json            type:module + scripts (dev/test/check/verify)
├── src/
│   ├── main.js             부트 · 입력 · RAF 루프 · 딥링크 파싱
│   ├── core/               tiles · colors · math(RNG/이징) · emitter · version
│   ├── sim/                순수 로직 (DOM 불필요 — 테스트가 직접 import)
│   │   ├── parser.js       레벨 파싱 → emitters/targets/rotatables/crystals/gates/walls
│   │   ├── tracer.js       빔 추적 (state-key visited, 무한루프 가드)
│   │   └── solver.js       BFS 최적 플립 + 힌트
│   ├── data/levels.js      레벨 26개 + 챕터
│   ├── state/saveStore.js  저장 v2 (v1 마이그레이션 + 새니타이즈, 일일/업적 필드)
│   ├── fx/                 particles · sound(WebAudio 신디사이저)
│   ├── render/             renderer(장면 조립) + layout/background/beams/entities 분리
│   ├── game/game.js        컨트롤러 (판정·언두·힌트, 이벤트 Emitter 발행)
│   ├── ui/                 ui.js 화면 관리 + strings.js ko/en 사전
│   ├── services/           daily(날짜 시드 절차 생성) · achievements(9종)
│   └── infra/              analytics(로컬 링버퍼) · errorHandler(CSP 안전)
├── tests/                  node:test 스위트 (helpers/domStub 공유)
└── tools/                  check-levels · report-optimal · debug-level · verify-all
```

### 아키텍처 원칙

- **sim 계층은 DOM-free**: `src/sim/*`은 어떤 브라우저 API도 참조하지 않아 node:test가 소스를 직접 import합니다 (eval 적재 제거)
- **논리/프레젠테이션 분리**: 회전 애니메이션 상태(spin)는 Game의 FX 맵에, 퍼즐 상태(orient)는 level 객체에 존재
- **이벤트 버스**: Game→UI/Audio/Analytics 결합을 Emitter 이벤트(move/win/hint/settingsChange)로 대체
- **매직 문자 단일화**: 타일 어휘는 `core/tiles.js`, 색상은 `core/colors.js`로 한 곳에서 관리
- **정적 자산 캐싱**: 배경+격자+암석은 시드별 오프스크린 캔버스에 베이크

## 개발 워크플로우

전체 검증(문법 → 레벨 솔버 → 유닛 → 브라우저 E2E) 한 번에 실행:

```bash
./tools/verify-all.sh   # "ALL GREEN - 0 BUGS" 가 통과 조건
```

로컬 서버를 미리 띄워야 E2E가 동작합니다:

```bash
python3 -m http.server 8765 &
./tools/verify-all.sh
```

### 레벨 추가 방법

1. `js/levels.js`에 그리드 문자열 배열로 레벨 정의
   - `. `빈 칸 `#`암석 `>/<^v`발산원 `/`\`거울 `s`분할기
   - `T`나무 `f`꽃 `M`버섯 `O`올빼미 `r/g/b`크리스털 `A/B/C`색상문 `P/Q,R/S`포탈
2. `meta.needs`(색상 요구), `meta.splitOrient`(분할기 초기 방향), `par`(목표 이동수) 지정
3. `node tools/check-levels.mjs` — 솔버가 풀이 가능성과 par를 자동 검증
4. `node tools/debug-level.mjs <id>` — 빔 경로를 ASCII로 디버깅

## 기술 노트

- **빔 엔진**: 상태 `(x, y, dir, color)` 기준 visited-set으로 무한 반사 루프 차단, 분할기는 BFS 분기
- **솔버**: 회전 가능 장치 상태 공간(≤2²⁴) BFS — 최적 플립 시퀀스 산출, 힌트 시스템과 레벨 검증에 동일 엔진 사용
- **판정**: 승리는 *현재 순간* 모든 대상이 요구 색상으로 점등된 경우에만 성립 (깨어난 상태 시각 유지는 별도 `awarded` 세트)
- **저장**: 버전 필드 + 타입 새니타이즈로 손상 데이터 방어, localStorage 미지원 환경 메모리 폴백
