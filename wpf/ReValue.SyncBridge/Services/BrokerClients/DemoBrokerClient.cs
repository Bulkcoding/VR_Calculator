using ReValue.SyncBridge.Models;

namespace ReValue.SyncBridge.Services.BrokerClients;

public sealed class DemoBrokerClient : IBrokerClient
{
    public async Task<IReadOnlyList<HoldingPayload>> GetHoldingsAsync(
        BrokerCredential credential,
        IProgress<string> progress,
        CancellationToken cancellationToken)
    {
        progress.Report("증권사 API 조회를 시작합니다. 현재 빌드는 데모 provider를 사용합니다.");
        await Task.Delay(400, cancellationToken);
        progress.Report("잔고와 보유종목을 변환합니다.");
        await Task.Delay(400, cancellationToken);

        return
        [
            new("005930", "삼성전자", 10, 78500, 81200, "KRW", "KOSPI"),
            new("000660", "SK하이닉스", 5, 192000, 198500, "KRW", "KOSPI"),
            new("035420", "NAVER", 8, 195000, 201000, "KRW", "KOSPI"),
            new("035720", "카카오", 15, 46000, 50300, "KRW", "KOSPI"),
            new("005380", "현대차", 7, 194000, 202000, "KRW", "KOSPI")
        ];
    }
}

