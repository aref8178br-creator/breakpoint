const request = require('supertest');

// Import the pure Express app (no listen() side effect — see app.js).
// This lets supertest bind its own ephemeral port per request without
// leaving a real server open after the test file finishes.
const { app } = require('../app');

describe('GET /api/hotels (search)', () => {
  test('returns all hotels with no query params, paginated', async () => {
    const res = await request(app).get('/api/hotels');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 20 });
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });

  test('search by hotel name substring/prefix returns matching hotels', async () => {
    const res = await request(app).get('/api/hotels').query({ search: 'Tbilisi' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const hotel of res.body.data) {
      const haystack = `${hotel.name} ${hotel.city} ${hotel.country} ${hotel.description}`.toLowerCase();
      expect(haystack).toContain('tbilisi');
    }
  });

  test('search is case-insensitive', async () => {
    const lower = await request(app).get('/api/hotels').query({ search: 'dubai' });
    const upper = await request(app).get('/api/hotels').query({ search: 'DUBAI' });
    expect(lower.body.data.map((h) => h.id).sort()).toEqual(upper.body.data.map((h) => h.id).sort());
    expect(lower.body.data.length).toBeGreaterThan(0);
  });

  test('search matches by city name even when name differs', async () => {
    const res = await request(app).get('/api/hotels').query({ search: 'Osaka' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((h) => h.city === 'Osaka')).toBe(true);
  });

  test('partial word / prefix search works (search-as-you-type)', async () => {
    const res = await request(app).get('/api/hotels').query({ search: 'tok' }); // prefix of "Tokyo"
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('nonsense search returns an empty result set, not an error', async () => {
    const res = await request(app).get('/api/hotels').query({ search: 'zzzznotarealhotelword' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  test('malicious/SQL-injection-shaped search input does not error and does not corrupt data', async () => {
    const res = await request(app)
      .get('/api/hotels')
      .query({ search: "'; DROP TABLE hotels;--" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    // Confirm the hotels table is still intact after the attempted injection.
    const followUp = await request(app).get('/api/hotels');
    expect(followUp.status).toBe(200);
    expect(followUp.body.pagination.total).toBeGreaterThan(0);
  });

  test('FTS operator keywords in search input are treated as literal words, not query syntax', async () => {
    const res = await request(app).get('/api/hotels').query({ search: 'hotel AND OR NOT' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('unbalanced quotes in search input do not crash the query', async () => {
    const res = await request(app).get('/api/hotels').query({ search: '"unbalanced' });
    expect(res.status).toBe(200);
  });

  test('overly long search input is rejected with 400, not 500', async () => {
    const res = await request(app).get('/api/hotels').query({ search: 'a'.repeat(500) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('combines search with city filter (AND semantics)', async () => {
    const res = await request(app).get('/api/hotels').query({ search: 'hotel', city: 'Tbilisi' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((h) => h.city === 'Tbilisi')).toBe(true);
  });

  test('combines search with price range filter', async () => {
    const res = await request(app)
      .get('/api/hotels')
      .query({ search: 'hotel', minPrice: 0, maxPrice: 100000 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('invalid sortBy value is rejected with 400', async () => {
    const res = await request(app).get('/api/hotels').query({ sortBy: 'not_a_real_sort' });
    expect(res.status).toBe(400);
  });

  test('invalid stars value is rejected with 400', async () => {
    const res = await request(app).get('/api/hotels').query({ stars: 99 });
    expect(res.status).toBe(400);
  });

  test('invalid checkin date format is rejected with 400', async () => {
    const res = await request(app).get('/api/hotels').query({ checkin: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  test('checkin after checkout is rejected with 400', async () => {
    const res = await request(app)
      .get('/api/hotels')
      .query({ checkin: '2026-09-20', checkout: '2026-09-10' });
    expect(res.status).toBe(400);
  });

  test('minPrice greater than maxPrice is rejected with 400', async () => {
    const res = await request(app).get('/api/hotels').query({ minPrice: 500, maxPrice: 100 });
    expect(res.status).toBe(400);
  });

  test('pageSize is capped even if a huge value is requested', async () => {
    const res = await request(app).get('/api/hotels').query({ pageSize: 999999 });
    expect(res.status).toBe(400); // exceeds max(50) -> validation rejects it
  });

  test('pagination actually slices results', async () => {
    const page1 = await request(app).get('/api/hotels').query({ pageSize: 1, page: 1 });
    const page2 = await request(app).get('/api/hotels').query({ pageSize: 1, page: 2 });
    expect(page1.body.data.length).toBe(1);
    expect(page2.body.data.length).toBe(1);
    expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
  });
});

describe('GET /api/hotels/suggest (autocomplete)', () => {
  test('returns suggestions for a valid prefix', async () => {
    const res = await request(app).get('/api/hotels/suggest').query({ q: 'dub' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('requires the q param', async () => {
    const res = await request(app).get('/api/hotels/suggest');
    expect(res.status).toBe(400);
  });

  test('respects the limit param and its cap', async () => {
    const res = await request(app).get('/api/hotels/suggest').query({ q: 'hotel', limit: 2 });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(2);
  });

  test('rejects a limit above the max', async () => {
    const res = await request(app).get('/api/hotels/suggest').query({ q: 'hotel', limit: 999 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/hotels/:id', () => {
  test('returns 404 for a non-existent hotel', async () => {
    const res = await request(app).get('/api/hotels/999999');
    expect(res.status).toBe(404);
  });

  test('returns 400 for a non-numeric id (not a raw 500/crash)', async () => {
    const res = await request(app).get('/api/hotels/not-a-number');
    expect(res.status).toBe(400);
  });

  test('returns the hotel for a valid id', async () => {
    const list = await request(app).get('/api/hotels').query({ pageSize: 1 });
    const id = list.body.data[0].id;
    const res = await request(app).get(`/api/hotels/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });
});

describe('GET /api/health', () => {
  test('reports ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Unknown API routes', () => {
  test('returns a clean JSON 404, not the SPA fallback', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
