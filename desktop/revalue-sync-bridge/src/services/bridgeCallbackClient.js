async function sendStarted(request) {
  return postJson(request.callbackUrl, {
    requestId: request.requestId,
    token: request.token,
    status: 'started',
  });
}

async function sendFailed(request, errorMessage) {
  return postJson(request.callbackUrl, {
    requestId: request.requestId,
    token: request.token,
    status: 'failed',
    errorMessage,
  });
}

async function sendCompleted(request, broker, accountNoMasked, holdings) {
  return postJson(request.callbackUrl, {
    requestId: request.requestId,
    token: request.token,
    status: 'completed',
    broker,
    accountNoMasked,
    holdings,
  });
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  const text = await response.text();
  if (!response.ok) {
    const detail = `url=${url} status=${response.status} body=${text} requestId=${payload.requestId || '?'} tokenLen=${(payload.token || '').length}`;
    console.error(`[bridge] 웹 콜백 실패: ${detail}`);
    throw new Error(`웹 콜백 실패: ${response.status} ${text}`.trim());
  }
}

module.exports = {
  sendStarted,
  sendFailed,
  sendCompleted,
};
