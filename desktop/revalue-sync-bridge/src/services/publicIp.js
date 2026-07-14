const SOURCES = [
  { name: 'api4.ipify.org', url: 'https://api4.ipify.org?format=json', format: 'json' },
  { name: 'api.ipify.org', url: 'https://api.ipify.org?format=json', format: 'json' },
  { name: 'ifconfig.me', url: 'https://ifconfig.me/ip', format: 'text' },
  { name: 'icanhazip.com', url: 'https://icanhazip.com', format: 'text' },
];

async function lookupPublicIp() {
  const errors = [];

  for (const source of SOURCES) {
    try {
      return await fetchFromSource(source);
    } catch (error) {
      errors.push(`${source.name}: ${error.message}`);
    }
  }

  throw new Error(`모든 공인 IP 조회 경로가 실패했습니다. ${errors.join(' | ')}`);
}

async function fetchFromSource(source) {
  const response = await fetch(source.url, {
    headers: {
      'User-Agent': 'ReValueSyncBridge/1.0',
      Accept: 'application/json, text/plain',
    },
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${payload}`.trim());
  }

  const candidate = source.format === 'json'
    ? tryExtractJsonIp(payload)
    : payload;

  const ip = extractIp(candidate || payload);
  if (!ip) {
    throw new Error('응답에서 IP를 찾지 못했습니다.');
  }

  return ip;
}

function tryExtractJsonIp(payload) {
  try {
    const parsed = JSON.parse(payload);
    if (typeof parsed === 'string') return parsed;
    return typeof parsed?.ip === 'string' ? parsed.ip : null;
  } catch {
    return null;
  }
}

function extractIp(payload) {
  const tokens = String(payload || '').split(/[\s"',:;<>\[\]{}]+/).filter(Boolean);
  for (const token of tokens) {
    if (isIp(token)) return token;
  }
  return null;
}

function isIp(value) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) || /^[0-9a-f:]+$/i.test(value);
}

module.exports = {
  lookupPublicIp,
};
