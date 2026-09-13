const Database = require('better-sqlite3');
const path = require('path');
const { parseCSV } = require('../utils/csvParser');

const db = new Database(path.join(__dirname, '..', 'hotel.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function createTables() {
  db.exec(`
    DROP TABLE IF EXISTS hotel_room_amenities;
    DROP TABLE IF EXISTS images;
    DROP TABLE IF EXISTS room_prices;
    DROP TABLE IF EXISTS rooms;
    DROP TABLE IF EXISTS amenities;
    DROP TABLE IF EXISTS hotels;

    CREATE TABLE amenities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE hotels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      address TEXT,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      stars INTEGER,
      min_price REAL
    );

    CREATE TABLE rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hotel_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      capacity INTEGER,
      FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
    );

    CREATE TABLE room_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      price REAL NOT NULL,
      UNIQUE(room_id, date),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE hotel_room_amenities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hotel_id INTEGER,
      room_id INTEGER,
      amenity_id INTEGER NOT NULL,
      FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
    );

    CREATE TABLE images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hotel_id INTEGER,
      room_id INTEGER,
      image_path TEXT NOT NULL,
      is_cover INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_hotels_city ON hotels(city);
    CREATE INDEX idx_hotels_country ON hotels(country);
    CREATE INDEX idx_rooms_hotel_id ON rooms(hotel_id);
    CREATE INDEX idx_room_prices_room ON room_prices(room_id);
    CREATE INDEX idx_room_prices_date ON room_prices(date);
    CREATE INDEX idx_images_hotel_id ON images(hotel_id);
    CREATE INDEX idx_images_room_id ON images(room_id);
  `);
}

function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as c FROM hotels').get().c;
  if (count > 0) return;

  console.log('Seeding database...');

  const root = path.join(__dirname, '..');

  const hotels = parseCSV(path.join(root, 'hotels.csv'));
  const insertHotel = db.prepare('INSERT INTO hotels (id, name, description, address, city, country, stars, min_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  db.transaction(() => {
    for (const h of hotels) {
      insertHotel.run(parseInt(h.id), h.name, h.description, h.address, h.city, h.country, parseInt(h.stars), parseFloat(h.min_price) || null);
    }
  })();

  const amenities = parseCSV(path.join(root, 'amenities.csv'));
  const insertAmenity = db.prepare('INSERT INTO amenities (id, name) VALUES (?, ?)');
  db.transaction(() => {
    for (const a of amenities) {
      insertAmenity.run(parseInt(a.id), a.name);
    }
  })();

  const rooms = parseCSV(path.join(root, 'rooms.csv'));
  const insertRoom = db.prepare('INSERT INTO rooms (id, hotel_id, name, description, capacity) VALUES (?, ?, ?, ?, ?)');
  db.transaction(() => {
    for (const r of rooms) {
      insertRoom.run(parseInt(r.id), parseInt(r.hotel_id), r.name, r.description, parseInt(r.capacity));
    }
  })();

  const prices = parseCSV(path.join(root, 'room_prices.csv'));
  const insertPrice = db.prepare('INSERT INTO room_prices (id, room_id, date, price) VALUES (?, ?, ?, ?)');
  db.transaction(() => {
    for (const p of prices) {
      insertPrice.run(parseInt(p.id), parseInt(p.room_id), p.date, parseFloat(p.price));
    }
  })();

  const hotelAmenities = parseCSV(path.join(root, 'hotel_room_amenities.csv'));
  const insertHA = db.prepare('INSERT INTO hotel_room_amenities (id, hotel_id, room_id, amenity_id) VALUES (?, ?, ?, ?)');
  db.transaction(() => {
    for (const ha of hotelAmenities) {
      insertHA.run(parseInt(ha.id), ha.hotel_id ? parseInt(ha.hotel_id) : null, ha.room_id ? parseInt(ha.room_id) : null, parseInt(ha.amenity_id));
    }
  })();

  const images = parseCSV(path.join(root, 'images.csv'));
  const insertImage = db.prepare('INSERT INTO images (id, hotel_id, room_id, image_path, is_cover, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
  db.transaction(() => {
    for (const img of images) {
      insertImage.run(parseInt(img.id), img.hotel_id ? parseInt(img.hotel_id) : null, img.room_id ? parseInt(img.room_id) : null, img.image_path, img.is_cover === 'true' ? 1 : 0, parseInt(img.sort_order) || 0);
    }
  })();

  console.log('Database seeded successfully!');
}

function initDatabase() {
  createTables();
  seedDatabase();
}

module.exports = { db, initDatabase };
