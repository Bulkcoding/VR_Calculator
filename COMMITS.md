# VR 웹앱 커밋 로그

## 2026-06-22 — feat: 증권사 연동 페이지 + 멀티 증권사 연동 모달
- 사이드바: 미구현 메뉴(포트폴리오/리밸런싱/사이클 기록/알림/API 연동/설정) 클릭 비활성화 처리
- 사이드바: "증권사 연동" 메뉴 추가 (`/broker-connections`)
- `BrokerConnectionModal` 신규: 증권사 선택 드롭다운 + AppKey/Secret/계좌번호 입력 + 연동 상태 표시
- 메인화면 우상단 "증권사 연동" 버튼 → 멀티 증권사 연동 모달로 교체
- `/broker-connections` 페이지: 연동된/연동 가능한 증권사 목록 + 연동하기 버튼 → 모달 오픈
- API: `/api/brokers/credentials` (증권사별 자격증명 CRUD), `/api/brokers/list` (연동 목록)
- 보유종목 불러오기는 현재 KIS만 지원 (그 외 증권사는 비활성)

## 2026-06-19 — feat: 로그인/회원가입 추가
- NextAuth v5 설치 및 auth 설정
- Prisma User 모델에 password 필드 추가
- 로그인 페이지 (`/login`) 생성
- 회원가입 페이지 (`/register`) 생성
- Auth 미들웨어로 페이지 보호
- API routes에서 DEFAULT_USER_ID를 실제 세션으로 교체
- 첫 가입 시 기존 데이터 자동 연결 (default → 신규 user)

## 2026-06-19 — feat: VR webapp - KIS API 연동, 증권사 태그, Neon adapter, UI 개선
- 한국투자증권 KIS API 연동 (앱키+시크릿 저장 → 보유종목 불러오기)
- 계좌 잔액/평가손익 조회
- AES-256 암호화로 API 키 저장
- 증권사 선택 콤보박스 (12개 증권사)
- 종목 카드에 증권사 뱃지 표시
- Prisma adapter `@prisma/adapter-pg` → `@prisma/adapter-neon` 교체 (Vercel 배포 대응)
- 30초 자동 현재가 갱신
- 우클릭 컨텍스트 메뉴 (수정/삭제)
- 카드 표시 옵션 (1~4열)
- Yahoo Finance + Naver API로 현재가 조회
- 평가손익/수익률 카드 표시
- 통화 선택 (KRW/USD)
- CSV 업로드
