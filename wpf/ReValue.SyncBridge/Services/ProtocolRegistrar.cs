using System.Diagnostics;
using Microsoft.Win32;

namespace ReValue.SyncBridge.Services;

public static class ProtocolRegistrar
{
    private const string SchemeKey = @"Software\Classes\revalue";

    public static string RegisterCurrentUser()
    {
        var exePath = Environment.ProcessPath
            ?? Process.GetCurrentProcess().MainModule?.FileName
            ?? throw new InvalidOperationException("실행 파일 경로를 확인할 수 없습니다.");

        using var key = Registry.CurrentUser.CreateSubKey(SchemeKey, writable: true)
            ?? throw new InvalidOperationException("URL scheme 레지스트리 키를 만들 수 없습니다.");
        key.SetValue("", "URL:ReValue Sync Bridge");
        key.SetValue("URL Protocol", "");

        using var commandKey = key.CreateSubKey(@"shell\open\command", writable: true)
            ?? throw new InvalidOperationException("URL scheme command 키를 만들 수 없습니다.");
        commandKey.SetValue("", $"\"{exePath}\" \"%1\"");

        return exePath;
    }
}

