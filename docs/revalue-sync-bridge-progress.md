# ReValue Sync Bridge 진행 정리

작성일: 2026-07-10

## 목적

ReValue 웹 서비스에서 증권사 계좌 연동을 요청하면 Windows WPF 앱이 실행되고, 로컬에서 보유주식을 조회한 뒤 결과를 다시 웹 DB에 반영하는 Sync Bridge 흐름을 추가했다.

## 구현된 흐름

1. 웹에서 Sync Bridge 요청 생성
   - `/api/brokers/sync-requests`에서 `SyncRequest`를 생성한다.
   - 요청별 토큰을 생성하고 해시로 저장한다.
   - `revalue://sync?requestId=...&token=...&callbackUrl=...&broker=...` 딥링크를 반환한다.

2. WPF 앱 실행 및 딥링크 파싱
   - WPF 앱은 `revalue://` 인자를 받아 `requestId`, `token`, `callbackUrl`, `broker`를 파싱한다.
   - 딥링크로 실행된 경우 앱 로드 후 자동으로 동기화를 시작한다.

3. WPF에서 보유주식 불러오기
   - `보유주식 불러오기` 버튼 하나로 조회와 웹 반영 흐름을 처리한다.
   - 현재 실제 증권사 API adapter는 아직 없고, `DemoBrokerClient`가 샘플 보유종목 5개를 반환한다.
   - 조회된 데이터는 WPF 미리보기 그리드에 표시된다.

4. 웹 DB 반영
   - WPF는 조회 완료 후 `/api/bridge/sync`로 `completed` payload를 전송한다.
   - 웹 API는 요청 토큰을 검증한 뒤 holdings를 `Holding` 테이블에 upsert한다.
   - `BrokerConnection`을 upsert하고 `SyncRequest` 상태를 `completed`로 갱신한다.

5. 웹 UI 갱신
   - 웹 화면은 sync request 상태를 polling한다.
   - 완료 시 보유주식 목록과 연동 상태를 다시 불러온다.

## WPF 앱 작업

- `wpf/ReValue.SyncBridge` WPF 프로젝트와 solution을 추가했다.
- 커스텀 타이틀바, 사이드바, 연동 상태, 보유주식 미리보기, 동기화 로그, 완료 toast UI를 구현했다.
- Pretendard 우선 font family를 적용했다.
- 창을 항상 위에 뜨도록 `Topmost=True`로 고정했다.
- 기존 `웹에 반영하기 (DB 동기화)` 버튼을 제거하고 `보유주식 불러오기` 버튼 하나만 남겼다.
- `Button`, `TextBox`, `PasswordBox`, `ComboBox`, `ListBoxItem`, `DataGrid`에 `ControlTemplate` 기반 스타일을 적용했다.
- hover, focus, pressed 상태에 애니메이션과 focus ring을 추가했다.
- TextBox/PasswordBox padding 문제를 수정해 입력값과 Secret Key bullet이 정상 표시되도록 고쳤다.
- ComboBox가 `BrokerInfo { ... }`로 표시되던 문제를 `ToString() => Name` 처리로 수정했다.

## 웹/DB 작업

- Prisma schema에 `BrokerConnection`, `SyncRequest` 모델을 추가했다.
- `20260709150000_add_sync_bridge` migration을 추가했다.
- `/api/brokers/sync-requests` API를 추가했다.
- `/api/bridge/sync` API를 추가했다.
- broker 목록과 연결 상태 조회 API를 Sync Bridge 흐름에 맞게 확장했다.
- broker connection 화면과 modal에서 Sync Bridge 실행, 상태 polling, 완료 후 holdings refresh를 연결했다.
- 메인 대시보드에서 Sync Bridge 진입 버튼을 연결했다.

## 현재 한계

- 실제 증권사 Open API 연동은 아직 미구현이다.
- WPF `BrokerClientFactory`는 demo mode에서만 `DemoBrokerClient`를 반환하고, 실제 mode는 `NotSupportedException`을 던진다.
- WPF 화면의 `DemoModeBox`는 숨겨져 있고 기본값이 `true`라 현재 불러오기는 데모 데이터 기준이다.
- WPF를 웹 딥링크 없이 단독 실행하면 `requestId/token/callbackUrl`이 없어 웹 DB 반영은 하지 않고 로컬 미리보기만 갱신한다.
- 실제 배포 전에는 `revalue://` URL scheme 등록과 설치 패키징 흐름을 더 다듬어야 한다.

## 검증한 내용

- `dotnet build wpf\ReValue.SyncBridge.sln` 경고 0, 오류 0 통과.
- WPF 앱 실제 실행 후 화면 캡처로 버튼이 하나만 남은 것을 확인했다.
- WPF 앱 실제 실행 후 API Key와 Secret Key에 값을 입력해 TextBox baseline과 PasswordBox bullet 표시를 확인했다.
- WPF 임시 캡처 파일과 실행 프로세스는 정리했다.

## 주요 파일

- `wpf/ReValue.SyncBridge/`
- `wpf/ReValue.SyncBridge.sln`
- `wpf/publish-win-x64.ps1`
- `src/app/api/brokers/sync-requests/route.ts`
- `src/app/api/bridge/sync/route.ts`
- `src/components/BrokerConnectionModal.tsx`
- `src/app/broker-connections/page.tsx`
- `src/lib/brokers.ts`
- `src/lib/syncBridge.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260709150000_add_sync_bridge/migration.sql`
