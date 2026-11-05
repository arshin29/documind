import {
  isPlaceholderApiKey,
  maskApiKey,
  sanitizeErrorMessage,
} from './api-key.utils';

describe('api-key.utils', () => {
  describe('isPlaceholderApiKey', () => {
    it('should return true for empty or undefined keys', () => {
      expect(isPlaceholderApiKey(undefined)).toBe(true);
      expect(isPlaceholderApiKey(null as any)).toBe(true);
      expect(isPlaceholderApiKey('')).toBe(true);
      expect(isPlaceholderApiKey('   ')).toBe(true);
    });

    it('should return true for common placeholder strings', () => {
      expect(isPlaceholderApiKey('your_openai_api_key_here')).toBe(true);
      expect(isPlaceholderApiKey('your_key_here')).toBe(true);
      expect(isPlaceholderApiKey('placeholder_key')).toBe(true);
      expect(isPlaceholderApiKey('CHANGEME')).toBe(true);
      expect(isPlaceholderApiKey('sk-...')).toBe(true);
      expect(isPlaceholderApiKey('<OPENAI_API_KEY>')).toBe(true);
    });

    it('should return false for realistic or test API keys', () => {
      expect(isPlaceholderApiKey('sk-mock-test-key-12345')).toBe(false);
      expect(
        isPlaceholderApiKey(
          'sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567',
        ),
      ).toBe(false);
    });
  });

  describe('maskApiKey', () => {
    it('should return safe string for undefined or short keys', () => {
      expect(maskApiKey(undefined)).toBe('[NOT SET]');
      expect(maskApiKey('')).toBe('[EMPTY]');
      expect(maskApiKey('12345')).toBe('***');
    });

    it('should mask real key without exposing middle content', () => {
      const key = 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz';
      const masked = maskApiKey(key);
      expect(masked.startsWith('sk-proj')).toBe(true);
      expect(masked.endsWith('wxyz')).toBe(true);
      expect(masked).toContain('...');
      expect(masked.length).toBeLessThan(key.length);
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should redact raw OpenAI API keys from error messages', () => {
      const raw =
        'Incorrect API key provided: sk-proj-1234567890abcdef. Check your account.';
      const sanitized = sanitizeErrorMessage(raw);
      expect(sanitized).not.toContain('sk-proj-1234567890abcdef');
      expect(sanitized).toContain('[REDACTED_API_KEY]');
    });

    it('should redact placeholder keys from error messages', () => {
      const raw = 'Incorrect API key provided: your_openhe************here.';
      const sanitized = sanitizeErrorMessage(raw);
      expect(sanitized).not.toContain('your_openhe');
      expect(sanitized).toContain('[REDACTED_PLACEHOLDER]');
    });

    it('should redact Bearer authorization header values', () => {
      const raw = 'Failed request with Bearer sk-1234567890abcdef123';
      const sanitized = sanitizeErrorMessage(raw);
      expect(sanitized).toContain('Bearer [REDACTED]');
    });
  });
});

