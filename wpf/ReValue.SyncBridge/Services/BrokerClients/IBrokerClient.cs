using ReValue.SyncBridge.Models;

namespace ReValue.SyncBridge.Services.BrokerClients;

public interface IBrokerClient
{
    Task<IReadOnlyList<HoldingPayload>> GetHoldingsAsync(
        BrokerCredential credential,
        IProgress<string> progress,
        CancellationToken cancellationToken);
}

