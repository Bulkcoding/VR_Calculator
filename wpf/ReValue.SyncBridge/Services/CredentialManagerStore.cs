using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using ReValue.SyncBridge.Models;

namespace ReValue.SyncBridge.Services;

public sealed class CredentialManagerStore
{
    private const uint CredTypeGeneric = 1;
    private const uint CredPersistLocalMachine = 2;
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = false };

    public BrokerCredential? Read(string broker)
    {
        var targetName = GetTargetName(broker);
        if (!CredRead(targetName, CredTypeGeneric, 0, out var credentialPtr)) return null;

        try
        {
            var credential = Marshal.PtrToStructure<NativeCredential>(credentialPtr);
            if (credential.CredentialBlob == IntPtr.Zero || credential.CredentialBlobSize == 0) return null;

            var blob = new byte[credential.CredentialBlobSize];
            Marshal.Copy(credential.CredentialBlob, blob, 0, blob.Length);
            var json = Encoding.UTF8.GetString(blob);
            return JsonSerializer.Deserialize<BrokerCredential>(json, JsonOptions);
        }
        finally
        {
            CredFree(credentialPtr);
        }
    }

    public void Save(BrokerCredential credential)
    {
        var targetName = GetTargetName(credential.Broker);
        var json = JsonSerializer.Serialize(credential, JsonOptions);
        var blob = Encoding.UTF8.GetBytes(json);
        var blobPtr = Marshal.AllocCoTaskMem(blob.Length);

        try
        {
            Marshal.Copy(blob, 0, blobPtr, blob.Length);
            var nativeCredential = new NativeCredential
            {
                Type = CredTypeGeneric,
                TargetName = targetName,
                CredentialBlobSize = (uint)blob.Length,
                CredentialBlob = blobPtr,
                Persist = CredPersistLocalMachine,
                UserName = credential.AccountNo
            };

            if (!CredWrite(ref nativeCredential, 0))
            {
                throw new InvalidOperationException($"Credential Manager 저장 실패: {Marshal.GetLastWin32Error()}");
            }
        }
        finally
        {
            Marshal.FreeCoTaskMem(blobPtr);
        }
    }

    public void Delete(string broker)
    {
        CredDelete(GetTargetName(broker), CredTypeGeneric, 0);
    }

    private static string GetTargetName(string broker) => $"ReValue.SyncBridge/{broker}";

    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredRead(string target, uint type, uint reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredWrite(ref NativeCredential credential, uint flags);

    [DllImport("advapi32.dll", EntryPoint = "CredDeleteW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredDelete(string target, uint type, uint flags);

    [DllImport("advapi32.dll")]
    private static extern void CredFree(IntPtr credentialPtr);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct NativeCredential
    {
        public uint Flags;
        public uint Type;
        public string? TargetName;
        public string? Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist;
        public uint AttributeCount;
        public IntPtr Attributes;
        public string? TargetAlias;
        public string? UserName;
    }
}

