$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class CredBridge {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct NativeCredential {
        public UInt32 Flags;
        public UInt32 Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public UInt32 CredentialBlobSize;
        public IntPtr CredentialBlob;
        public UInt32 Persist;
        public UInt32 AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, UInt32 type, UInt32 reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll")]
    public static extern void CredFree(IntPtr credentialPtr);
}
"@

function Read-CredentialJson([string]$TargetName) {
    $ptr = [IntPtr]::Zero
    if (-not [CredBridge]::CredRead($TargetName, 1, 0, [ref]$ptr)) {
        return $null
    }

    try {
        $credential = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][CredBridge+NativeCredential])
        if ($credential.CredentialBlob -eq [IntPtr]::Zero -or $credential.CredentialBlobSize -eq 0) {
            return $null
        }

        $bytes = New-Object byte[] $credential.CredentialBlobSize
        [Runtime.InteropServices.Marshal]::Copy($credential.CredentialBlob, $bytes, 0, $bytes.Length)
        return [Text.Encoding]::UTF8.GetString($bytes)
    }
    finally {
        [CredBridge]::CredFree($ptr)
    }
}

$brokers = @('toss','kis','samsung','kb','kakao','mirae','nh','shinhan','hana')
$result = @{}
foreach ($broker in $brokers) {
    $json = Read-CredentialJson "ReValue.SyncBridge/$broker"
    if (-not $json) { continue }

    try {
        $parsed = $json | ConvertFrom-Json
        $result[$broker] = @{
            appKey = [string]$parsed.AppKey
            appSecret = [string]$parsed.AppSecret
            accountNo = [string]$parsed.AccountNo
        }
    }
    catch {
    }
}

$result | ConvertTo-Json -Compress
