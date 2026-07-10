namespace ReValue.SyncBridge.Models;

public sealed record LogLine(DateTime Time, string Message)
{
    public string TimeText => Time.ToString("HH:mm:ss");
}

