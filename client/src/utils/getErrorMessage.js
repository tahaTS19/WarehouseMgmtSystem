/**
 * Extracts a human-readable message from an apiClient error.
 *
 * ASSUMPTION FLAGGED: the exact shape apiClient throws on a non-2xx response
 * isn't specified anywhere I've seen — this checks several plausible shapes
 * (raw parsed body, .data, .response.data) and handles the class-validator
 * array-of-strings case. If apiClient's real throw shape differs, only this
 * function needs updating — every screen calls through it, not the raw error.
 */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const body = error?.response?.data ?? error?.data ?? error;
  const message = body?.message ?? error?.message;

  if (Array.isArray(message)) {
    return message.join(' ');
  }
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }
  return fallback;
}
