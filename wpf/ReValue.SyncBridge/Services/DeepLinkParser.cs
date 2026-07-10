using ReValue.SyncBridge.Models;

namespace ReValue.SyncBridge.Services;

public static class DeepLinkParser
{
    public static SyncLaunchRequest? TryParse(string? rawUrl)
    {
        if (string.IsNullOrWhiteSpace(rawUrl)) return null;
        if (!Uri.TryCreate(rawUrl, UriKind.Absolute, out var uri)) return null;
        if (!uri.Scheme.Equals("revalue", StringComparison.OrdinalIgnoreCase)) return null;

        var query = ParseQuery(uri.Query);
        if (!query.TryGetValue("requestId", out var requestId) || string.IsNullOrWhiteSpace(requestId)) return null;
        if (!query.TryGetValue("token", out var token) || string.IsNullOrWhiteSpace(token)) return null;
        if (!query.TryGetValue("callbackUrl", out var callbackUrlRaw)) return null;
        if (!Uri.TryCreate(callbackUrlRaw, UriKind.Absolute, out var callbackUrl)) return null;
        if (callbackUrl.Scheme != Uri.UriSchemeHttp && callbackUrl.Scheme != Uri.UriSchemeHttps) return null;

        query.TryGetValue("broker", out var broker);
        return new SyncLaunchRequest(requestId, token, callbackUrl, broker);
    }

    private static Dictionary<string, string> ParseQuery(string query)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var trimmed = query.TrimStart('?');
        if (string.IsNullOrWhiteSpace(trimmed)) return result;

        foreach (var part in trimmed.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var equalsIndex = part.IndexOf('=');
            var rawKey = equalsIndex >= 0 ? part[..equalsIndex] : part;
            var rawValue = equalsIndex >= 0 ? part[(equalsIndex + 1)..] : "";
            var key = Uri.UnescapeDataString(rawKey.Replace("+", " "));
            var value = Uri.UnescapeDataString(rawValue.Replace("+", " "));
            if (!string.IsNullOrWhiteSpace(key)) result[key] = value;
        }

        return result;
    }
}

