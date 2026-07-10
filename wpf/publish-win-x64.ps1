$ErrorActionPreference = "Stop"

$project = Join-Path $PSScriptRoot "ReValue.SyncBridge\ReValue.SyncBridge.csproj"
$output = Join-Path $PSScriptRoot "publish\win-x64"

dotnet publish $project `
  -c Release `
  -r win-x64 `
  --self-contained false `
  -p:PublishSingleFile=true `
  -o $output

Write-Host "Published to $output"

