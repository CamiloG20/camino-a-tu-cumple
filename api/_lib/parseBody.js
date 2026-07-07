export function parseJsonBody(req) {
  try {
    if (typeof req.body === 'string') {
      return JSON.parse(req.body || '{}');
    }
    return req.body ?? {};
  } catch {
    return null;
  }
}
