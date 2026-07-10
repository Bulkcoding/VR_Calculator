using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ReValue.SyncBridge.Models;

namespace ReValue.SyncBridge.Services;

public sealed class BridgeCallbackClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly HttpClient _httpClient = new();

    public Task SendStartedAsync(SyncLaunchRequest request, CancellationToken cancellationToken)
    {
        return PostAsync(request.CallbackUrl, new
        {
            requestId = request.RequestId,
            token = request.Token,
            status = "started"
        }, cancellationToken);
    }

    public Task SendFailedAsync(SyncLaunchRequest request, string errorMessage, CancellationToken cancellationToken)
    {
        return PostAsync(request.CallbackUrl, new
        {
            requestId = request.RequestId,
            token = request.Token,
            status = "failed",
            errorMessage
        }, cancellationToken);
    }

    public Task SendCompletedAsync(
        SyncLaunchRequest request,
        string broker,
        string? accountNoMasked,
        IReadOnlyList<HoldingPayload> holdings,
        CancellationToken cancellationToken)
    {
        return PostAsync(request.CallbackUrl, new
        {
            requestId = request.RequestId,
            token = request.Token,
            status = "completed",
            broker,
            accountNoMasked,
            holdings
        }, cancellationToken);
    }

    private async Task PostAsync(Uri callbackUrl, object payload, CancellationToken cancellationToken)
    {
        if (callbackUrl.Scheme != Uri.UriSchemeHttp && callbackUrl.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException("HTTP/HTTPS callbackUrl만 지원합니다.");
        }

        var json = JsonSerializer.Serialize(payload, JsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var response = await _httpClient.PostAsync(callbackUrl, content, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"웹 콜백 실패: {(int)response.StatusCode} {responseBody}");
        }
    }
}

