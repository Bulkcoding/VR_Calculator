namespace ReValue.SyncBridge.Models;

public sealed record SyncLaunchRequest(
    string RequestId,
    string Token,
    Uri CallbackUrl,
    string? Broker)
{
    public string BrokerLabel => BrokerInfo.Find(Broker).Name;
}

