# VR 리밸런싱 테마 가이드

## 테마 목록

| ID | 이름 | 모드 | 설명 |
|---|---|---|---|
| classic | Current Theme | Light | 밝은 기본 테마 |
| 	heme-2 | Theme 2 | Dark | 다크 대시보드 톤 (보라+민트 포인트) |

## 테마별 팔레트

### Classic (Light)

| 토큰 | 역할 | 색상 | 미리보기 |
|---|---|---|---|
| ackground | 전체 배경 | #f5f7fb | ?? |
| surface | 카드/패널 표면 | #ffffff | ?? |
| primary | 주요 강조색 | #2563eb | ?? |
| ccent | 보조 강조색 | #6366f1 | ?? |
| danger | 위험/손실 색상 | #ef4444 | ?? |

| 프리뷰 토큰 | 역할 | 값 |
|---|---|---|
| shell | 쉘 배경 | linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%) |
| sidebar | 사이드바 배경 | #ffffff |
| panel | 패널 배경 | #ffffff |
| highlight | 강조 표시 | #dbeafe |
| 	ext | 기본 텍스트 | #111827 |

### Theme-2 (Dark)

| 토큰 | 역할 | 색상 | 미리보기 |
|---|---|---|---|
| ackground | 전체 배경 | #0d1117 | ?? |
| surface | 카드/패널 표면 | #1a2230 | ?? |
| primary | 주요 강조색 | #6546ff | ?? |
| ccent | 보조 강조색 | #47e3d5 | ?? |
| danger | 위험/손실 색상 | #ff7b7b | ?? |

| 프리뷰 토큰 | 역할 | 값 |
|---|---|---|
| shell | 쉘 배경 | linear-gradient(135deg, #0d1117 0%, #111c2b 100%) |
| sidebar | 사이드바 배경 | #121926 |
| panel | 패널 배경 | #182232 |
| highlight | 강조 표시 | #6546ff |
| 	ext | 기본 텍스트 | #f4f7fb |

## CSS 변수 매핑

CSS 커스텀 프로퍼티는 src/app/globals.css에 정의되어 있으며,
html[data-theme="classic"] / html[data-theme="theme-2"] 셀렉터로 분기됩니다.

주요 CSS 변수:
- --background, --foreground
- --card, --surface-muted, --surface-subtle
- --border, --border-subtle, --border-strong
- --muted, --muted-strong, --muted-soft, --muted-faint
- --accent-blue, --accent-indigo, --accent-green, --accent-red, --accent-yellow
- --gradient-from, --gradient-to

## 테마 전환

테마는 src/components/ThemeProvider.tsx에서 관리되며,
로컬스토레이지 키 r-dashboard-theme에 저장됩니다.

설정 페이지(/settings)에서 테마 전환이 가능합니다.
