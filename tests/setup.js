// Ensures every test run uses an isolated, throwaway SQLite database file
// instead of the real hotel.db, and that env validation passes in the test
// environment. Must run before any module requires config/env or
// config/database.
const path = require('path');
const fs = require('fs');

const testDbPath = path.join(__dirname, `.test-${process.pid}.db`);
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
process.env.ALLOW_DB_RESET = 'true';

// Best-effort: close the shared better-sqlite3 connection after each test
// file so the file handle doesn't linger and jest can exit cleanly without
// --forceExit. Wrapped in try/catch because a test file may not have
// required config/database at all (e.g. pure unit tests). Registered
// BEFORE the file-cleanup afterAll below so it runs first (Jest runs
// afterAll hooks in registration order) — the DB must be closed before we
// try to delete its file.
afterAll(() => {
  try {
    // eslint-disable-next-line global-require
    const { db } = require('../config/database');
    db.close();
  } catch (err) {
    // no database was opened by this test file — nothing to close
  }
});

afterAll(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = testDbPath + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
});
