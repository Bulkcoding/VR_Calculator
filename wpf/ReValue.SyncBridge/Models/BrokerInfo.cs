namespace ReValue.SyncBridge.Models;

public sealed record BrokerInfo(string Id, string Name, string ShortName)
{
    public static IReadOnlyList<BrokerInfo> All { get; } =
    [
        new("toss", "토스증권", "Toss"),
        new("kis", "한국투자증권", "KIS"),
        new("samsung", "삼성증권", "Samsung"),
        new("kb", "KB증권", "KB"),
        new("kakao", "카카오페이증권", "Kakao"),
        new("mirae", "미래에셋증권", "Mirae"),
        new("nh", "NH투자증권", "NH"),
        new("shinhan", "신한투자증권", "Shinhan"),
        new("hana", "하나증권", "Hana")
    ];

    public override string ToString() => Name;

    public static BrokerInfo Find(string? brokerId)
    {
        return All.FirstOrDefault(item => item.Id.Equals(brokerId, StringComparison.OrdinalIgnoreCase)) ?? All[0];
    }
}
