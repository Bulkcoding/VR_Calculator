namespace ReValue.SyncBridge.Services.BrokerClients;

public static class BrokerClientFactory
{
    public static IBrokerClient Create(bool demoMode)
    {
        if (demoMode) return new DemoBrokerClient();
        throw new NotSupportedException("실제 증권사 Open API adapter는 아직 연결되지 않았습니다. 증권사별 API 문서 기준으로 IBrokerClient 구현체를 추가해야 합니다.");
    }
}

