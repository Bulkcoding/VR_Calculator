namespace ReValue.SyncBridge.Models;

public sealed record BrokerCredential(
    string Broker,
    string AppKey,
    string AppSecret,
    string AccountNo);

