function parseDeepLink(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== 'revalue:') return null;

  const requestId = url.searchParams.get('requestId')?.trim();
  const token = url.searchParams.get('token')?.trim();
  const callbackUrl = url.searchParams.get('callbackUrl')?.trim();
  const broker = url.searchParams.get('broker')?.trim() || null;

  if (!requestId || !token || !callbackUrl) return null;

  let callback;
  try {
    callback = new URL(callbackUrl);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(callback.protocol)) return null;

  return {
    rawUrl,
    requestId,
    token,
    callbackUrl: callback.toString(),
    broker,
  };
}

module.exports = {
  parseDeepLink,
};
