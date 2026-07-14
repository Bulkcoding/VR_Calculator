# ReValue Sync Bridge (Electron)

Electron desktop bridge for ReValue broker synchronization.

## What It Does

- Handles `revalue://sync?requestId=...&token=...&callbackUrl=...&broker=...`
- Stores broker API credentials in the local app data store
- Looks up the current public IP and shows it in Settings
- Supports direct Toss Securities and Korea Investment holdings sync from the desktop app
- Sends sync lifecycle updates to `/api/bridge/sync`
- Checks GitHub Releases for newer Windows builds and lets each installed user apply updates in-app

## Run

```powershell
cd .\desktop\revalue-sync-bridge
npm install
npm start
```

또는 루트에서 바로:

```powershell
npm run bridge
```

## Verify

```powershell
cd .\desktop\revalue-sync-bridge
npm run check
```

## Package for Windows

```powershell
cd .\desktop\revalue-sync-bridge
npm install
npm run package:win
```

또는 루트에서 바로:

```powershell
npm run bridge:package
```

생성 위치:

- `desktop/revalue-sync-bridge/release/ReValue Sync Bridge-0.1.0-x64.exe`
- `desktop/revalue-sync-bridge/release/ReValue-Sync-Bridge-Portable-0.1.0-x64.exe`

첫 번째는 설치형(NSIS)이고, 두 번째는 압축 해제 없이 바로 실행 가능한 portable exe다.
다른 사용자는 이 파일을 받아서 실행하면 된다.

## Auto Update

- 배포 빌드에서만 활성화됩니다. 개발 모드(`npm start`)에서는 비활성화됩니다.
- 현재 설정은 `desktop/revalue-sync-bridge/package.json`의 `revalueUpdate`를 읽어 `Bulkcoding/VR_Calculator` GitHub Releases 최신 릴리스를 확인합니다.
- 앱은 시작 직후와 이후 2분마다 새 버전을 확인합니다.
- 사용자는 Settings의 `앱 업데이트` 카드에서 `지금 확인` 또는 `업데이트 적용`을 누를 수 있습니다.
- 릴리스에는 아래 두 파일을 함께 올려야 합니다.
  - `ReValue Sync Bridge-<version>-x64.exe`
  - `ReValue-Sync-Bridge-Portable-<version>-x64.exe`
- 설치형 사용자는 NSIS 설치 파일을 조용히 실행해 업데이트하고, portable 사용자는 실행 중인 exe를 교체한 뒤 다시 실행합니다.
