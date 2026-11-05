/**
 * Utilities for safe API key validation, masking, and error sanitization.
 */

/**
 * Checks if an API key is missing, empty, or set to a placeholder value.
 */
export function isPlaceholderApiKey(key?: string | null): boolean {
  if (!key || typeof key !== 'string') {
    return true;
  }
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  return (
    lower.includes('your_') ||
    lower.includes('placeholder') ||
    lower.includes('changeme') ||
    lower.includes('replace_me') ||
    lower.includes('insert_') ||
    lower.startsWith('sk-...') ||
    lower === 'sk-your-key-here' ||
    (lower.startsWith('<') && lower.endsWith('>'))
  );
}

/**
 * Returns a masked representation of an API key safe for logging (e.g. "sk-proj...1a2b").
 * Never exposes the full secret.
 */
export function maskApiKey(key?: string | null): string {
  if (key === undefined || key === null) {
    return '[NOT SET]';
  }
  if (typeof key !== 'string') {
    return '[NOT SET]';
  }
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    return '[EMPTY]';
  }
  if (trimmed.length <= 10) {
    return '***';
  }
  return `${trimmed.slice(0, 7)}...${trimmed.slice(-4)}`;
}

/**
 * Strips raw API keys, placeholder strings, and Authorization tokens from error messages
 * so that provider secrets are never leaked to frontend clients or logs.
 */
export function sanitizeErrorMessage(message?: string | null): string {
  if (!message) return '';
  return String(message)
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]{8,}/gi, 'Bearer [REDACTED]')
    .replace(/sk-[A-Za-z0-9_\-\.]{8,}/g, '[REDACTED_API_KEY]')
    .replace(/AIzaSy[A-Za-z0-9_\-]{30,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/your_ope[A-Za-z0-9_\*\.]+/gi, '[REDACTED_PLACEHOLDER]')
    .replace(/your_gem[A-Za-z0-9_\*\.]+/gi, '[REDACTED_PLACEHOLDER]');
}
