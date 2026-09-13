const request = require('supertest');
const { app } = require('../app');

describe('GET /api/hotels/:id/rooms', () => {
  test('returns rooms for a valid hotel', async () => {
    const res = await request(app).get('/api/hotels/1/rooms');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('capacity');
  });

  test('returns 400 for a non-numeric hotel id', async () => {
    const res = await request(app).get('/api/hotels/abc/rooms');
    expect(res.status).toBe(400);
  });

  test('returns an empty array for a hotel id with no rooms (not an error)', async () => {
    const res = await request(app).get('/api/hotels/999999/rooms');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/hotels/:id/amenities', () => {
  test('returns hotel-level amenities only', async () => {
    const res = await request(app).get('/api/hotels/1/amenities');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/hotels/:id/images', () => {
  test('returns images ordered by sort_order', async () => {
    const res = await request(app).get('/api/hotels/1/images');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 1) {
      const orders = res.body.map((i) => i.sort_order);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
  });
});

describe('GET /api/hotels/:id/prices', () => {
  test('returns a per-date price calendar', async () => {
    const res = await request(app).get('/api/hotels/1/prices');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('date');
    expect(res.body[0]).toHaveProperty('min_price');
  });
});

describe('GET /api/rooms/:id and /api/rooms/:id/prices', () => {
  test('returns a room by id', async () => {
    const res = await request(app).get('/api/rooms/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  test('returns 404 for a missing room', async () => {
    const res = await request(app).get('/api/rooms/999999');
    expect(res.status).toBe(404);
  });

  test('returns 400 for a non-numeric room id', async () => {
    const res = await request(app).get('/api/rooms/xyz');
    expect(res.status).toBe(400);
  });

  test('returns daily prices for a room', async () => {
    const res = await request(app).get('/api/rooms/1/prices');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/amenities', () => {
  test('returns the full amenities reference list', async () => {
    const res = await request(app).get('/api/amenities');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('name');
  });
});

describe('GET /api/hotels/cities and /countries', () => {
  test('returns a distinct, sorted list of cities', async () => {
    const res = await request(app).get('/api/hotels/cities');
    expect(res.status).toBe(200);
    expect(new Set(res.body).size).toBe(res.body.length); // all distinct
  });

  test('returns a distinct, sorted list of countries', async () => {
    const res = await request(app).get('/api/hotels/countries');
    expect(res.status).toBe(200);
    expect(new Set(res.body).size).toBe(res.body.length);
  });
});

describe('GET /api/stats', () => {
  test('returns aggregate counts', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        hotels: expect.any(Number),
        rooms: expect.any(Number),
        cities: expect.any(Number),
        countries: expect.any(Number)
      })
    );
    expect(res.body.hotels).toBeGreaterThan(0);
  });
});

describe('Security headers', () => {
  test('helmet security headers are present', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  test('a request body over the JSON size limit is rejected', async () => {
    const res = await request(app)
      .post('/api/hotels')
      .set('Content-Type', 'application/json')
      .send({ padding: 'x'.repeat(200 * 1024) }); // > 100kb limit
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
