# ReValue Sync Bridge

Windows WPF desktop bridge for ReValue broker synchronization.

## What It Does

- Handles `revalue://sync?requestId=...&token=...&callbackUrl=...&broker=...`
- Stores broker API credentials in Windows Credential Manager
- Sends sync lifecycle updates to the web callback API
- Uploads holdings to `/api/bridge/sync`
- Provides a demo broker provider so the web-to-desktop-to-web flow can be tested before real broker adapters are implemented

## Current Broker API Status

The first implementation includes `IBrokerClient` and `DemoBrokerClient`.
Real broker integrations should be added as separate `IBrokerClient` implementations under `Services/BrokerClients`.

## Register URL Scheme

Run the app and click `revalue:// 등록`.
It writes this current-user registry key:

```text
HKCU\Software\Classes\revalue\shell\open\command
```

No administrator permission is required.

## Build

```powershell
dotnet build .\wpf\ReValue.SyncBridge\ReValue.SyncBridge.csproj
```

## Publish

```powershell
.\wpf\publish-win-x64.ps1
```

