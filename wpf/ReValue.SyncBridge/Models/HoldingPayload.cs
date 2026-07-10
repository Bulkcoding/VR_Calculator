namespace ReValue.SyncBridge.Models;

public sealed record HoldingPayload(
    string Ticker,
    string Name,
    decimal Quantity,
    decimal AvgPrice,
    decimal? CurrentPrice,
    string Currency,
    string? Market)
{
    public decimal? MarketValue => CurrentPrice * Quantity;
}

