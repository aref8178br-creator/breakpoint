const { buildFtsQuery } = require('../utils/searchQuery');

describe('buildFtsQuery', () => {
  test('builds a simple prefix query for a single word', () => {
    expect(buildFtsQuery('tbilisi')).toBe('"tbilisi"*');
  });

  test('ANDs multiple words together', () => {
    expect(buildFtsQuery('grand hotel')).toBe('"grand"* AND "hotel"*');
  });

  test('returns null for empty input', () => {
    expect(buildFtsQuery('')).toBeNull();
  });

  test('returns null for whitespace-only input', () => {
    expect(buildFtsQuery('   ')).toBeNull();
  });

  test('returns null for non-string input', () => {
    expect(buildFtsQuery(undefined)).toBeNull();
    expect(buildFtsQuery(null)).toBeNull();
    expect(buildFtsQuery(42)).toBeNull();
  });

  test('strips FTS boolean operator keywords', () => {
    expect(buildFtsQuery('spa AND pool')).toBe('"spa"* AND "pool"*');
    expect(buildFtsQuery('spa OR NOT pool')).toBe('"spa"* AND "pool"*');
  });

  test('neutralizes FTS special characters (quotes, colons, parens, wildcards)', () => {
    const result = buildFtsQuery('"unbalanced quote (test): *');
    // Must not throw, and must not contain raw unescaped FTS syntax chars
    // outside of the wrapping quotes this function itself adds.
    expect(result).not.toContain('(');
    expect(result).not.toContain(':');
  });

  test('handles SQL-injection-shaped input safely as plain text', () => {
    const result = buildFtsQuery("hotel'; DROP TABLE hotels;--");
    expect(result).toBe('"hotel"* AND "DROP"* AND "TABLE"* AND "hotels"*');
  });

  test('supports non-Latin scripts (e.g. Persian)', () => {
    expect(buildFtsQuery('تفلیس')).toBe('"تفلیس"*');
  });

  test('caps the number of terms to prevent pathological queries', () => {
    const manyWords = Array.from({ length: 50 }, (_, i) => `word${i}`).join(' ');
    const result = buildFtsQuery(manyWords);
    const termCount = result.split(' AND ').length;
    expect(termCount).toBeLessThanOrEqual(8);
  });

  test('caps individual term length', () => {
    const longWord = 'a'.repeat(500);
    const result = buildFtsQuery(longWord);
    expect(result.length).toBeLessThan(100);
  });

  test('is idempotent/safe when called repeatedly with the same input', () => {
    expect(buildFtsQuery('dubai')).toBe(buildFtsQuery('dubai'));
  });
});
