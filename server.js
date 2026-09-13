const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// --- Database Setup ---
const db = new Database(path.join(__dirname, 'hotel.db'));
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

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; continue; }
      if (line[i] === ',' && !inQuotes) { values.push(current); current = ''; continue; }
      current += line[i];
    }
    values.push(current);
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (values[i] || '').trim());
    return obj;
  });
}

function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as c FROM hotels').get().c;
  if (count > 0) return;

  console.log('Seeding database...');

  const hotels = parseCSV(path.join(__dirname, 'hotels.csv'));
  const insertHotel = db.prepare('INSERT INTO hotels (id, name, description, address, city, country, stars, min_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const hotelTx = db.transaction(() => {
    for (const h of hotels) {
      insertHotel.run(
        parseInt(h.id), h.name, h.description, h.address,
        h.city, h.country, parseInt(h.stars), parseFloat(h.min_price) || null
      );
    }
  });
  hotelTx();

  const amenities = parseCSV(path.join(__dirname, 'amenities.csv'));
  const insertAmenity = db.prepare('INSERT INTO amenities (id, name) VALUES (?, ?)');
  const amenityTx = db.transaction(() => {
    for (const a of amenities) {
      insertAmenity.run(parseInt(a.id), a.name);
    }
  });
  amenityTx();

  const rooms = parseCSV(path.join(__dirname, 'rooms.csv'));
  const insertRoom = db.prepare('INSERT INTO rooms (id, hotel_id, name, description, capacity) VALUES (?, ?, ?, ?, ?)');
  const roomTx = db.transaction(() => {
    for (const r of rooms) {
      insertRoom.run(
        parseInt(r.id), parseInt(r.hotel_id), r.name,
        r.description, parseInt(r.capacity)
      );
    }
  });
  roomTx();

  const prices = parseCSV(path.join(__dirname, 'room_prices.csv'));
  const insertPrice = db.prepare('INSERT INTO room_prices (id, room_id, date, price) VALUES (?, ?, ?, ?)');
  const priceTx = db.transaction(() => {
    for (const p of prices) {
      insertPrice.run(
        parseInt(p.id), parseInt(p.room_id),
        p.date, parseFloat(p.price)
      );
    }
  });
  priceTx();

  const hotelAmenities = parseCSV(path.join(__dirname, 'hotel_room_amenities.csv'));
  const insertHA = db.prepare('INSERT INTO hotel_room_amenities (id, hotel_id, room_id, amenity_id) VALUES (?, ?, ?, ?)');
  const haTx = db.transaction(() => {
    for (const ha of hotelAmenities) {
      insertHA.run(
        parseInt(ha.id),
        ha.hotel_id ? parseInt(ha.hotel_id) : null,
        ha.room_id ? parseInt(ha.room_id) : null,
        parseInt(ha.amenity_id)
      );
    }
  });
  haTx();

  const images = parseCSV(path.join(__dirname, 'images.csv'));
  const insertImage = db.prepare('INSERT INTO images (id, hotel_id, room_id, image_path, is_cover, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
  const imageTx = db.transaction(() => {
    for (const img of images) {
      insertImage.run(
        parseInt(img.id),
        img.hotel_id ? parseInt(img.hotel_id) : null,
        img.room_id ? parseInt(img.room_id) : null,
        img.image_path,
        img.is_cover === 'true' ? 1 : 0,
        parseInt(img.sort_order) || 0
      );
    }
  });
  imageTx();

  console.log('Database seeded successfully!');
}

createTables();
seedDatabase();

// --- API Routes ---

// GET all hotels with optional filters
app.get('/api/hotels', (req, res) => {
  const { city, country, search, checkin } = req.query;
  let query = `
    SELECT h.*, 
      (SELECT MIN(rp.price) FROM room_prices rp 
       JOIN rooms r ON r.id = rp.room_id 
       WHERE r.hotel_id = h.id${checkin ? " AND rp.date = '" + checkin + "'" : ''}) as computed_min_price,
      (SELECT i.image_path FROM images i 
       WHERE i.hotel_id = h.id AND i.is_cover = 1 AND i.room_id IS NULL 
       LIMIT 1) as cover_image,
      (SELECT i.image_path FROM images i 
       WHERE i.hotel_id = h.id AND i.is_cover = 1
       LIMIT 1) as fallback_image
    FROM hotels h WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (h.name LIKE ? OR h.city LIKE ? OR h.country LIKE ? OR h.description LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (city) {
    query += ` AND h.city = ?`;
    params.push(city);
  }
  if (country) {
    query += ` AND h.country = ?`;
    params.push(country);
  }

  query += ` ORDER BY h.name`;
  const hotels = db.prepare(query).all(...params);
  res.json(hotels);
});

// GET single hotel
app.get('/api/hotels/:id', (req, res) => {
  const hotel = db.prepare('SELECT * FROM hotels WHERE id = ?').get(req.params.id);
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
  res.json(hotel);
});

// GET hotel amenities
app.get('/api/hotels/:id/amenities', (req, res) => {
  const amenities = db.prepare(`
    SELECT a.* FROM amenities a
    JOIN hotel_room_amenities ha ON ha.amenity_id = a.id
    WHERE ha.hotel_id = ? AND ha.room_id IS NULL
  `).all(req.params.id);
  res.json(amenities);
});

// GET hotel rooms
app.get('/api/hotels/:id/rooms', (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms WHERE hotel_id = ?').all(req.params.id);
  res.json(rooms);
});

// GET hotel images
app.get('/api/hotels/:id/images', (req, res) => {
  const images = db.prepare('SELECT * FROM images WHERE hotel_id = ? ORDER BY sort_order').all(req.params.id);
  res.json(images);
});

// GET room prices
app.get('/api/rooms/:id/prices', (req, res) => {
  const prices = db.prepare('SELECT * FROM room_prices WHERE room_id = ? ORDER BY date').all(req.params.id);
  res.json(prices);
});

// GET all prices for a hotel (aggregated by date, min price across rooms)
app.get('/api/hotels/:id/prices', (req, res) => {
  const prices = db.prepare(`
    SELECT rp.date, MIN(rp.price) as min_price, MAX(rp.price) as max_price, AVG(rp.price) as avg_price
    FROM room_prices rp
    JOIN rooms r ON r.id = rp.room_id
    WHERE r.hotel_id = ?
    GROUP BY rp.date
    ORDER BY rp.date
  `).all(req.params.id);
  res.json(prices);
});

// GET all cities
app.get('/api/cities', (req, res) => {
  const cities = db.prepare('SELECT DISTINCT city FROM hotels ORDER BY city').all();
  res.json(cities.map(c => c.city));
});

// GET all countries
app.get('/api/countries', (req, res) => {
  const countries = db.prepare('SELECT DISTINCT country FROM hotels ORDER BY country').all();
  res.json(countries.map(c => c.country));
});

// GET all amenities
app.get('/api/amenities', (req, res) => {
  const amenities = db.prepare('SELECT * FROM amenities ORDER BY name').all();
  res.json(amenities);
});

// GET hotel stats
app.get('/api/stats', (req, res) => {
  const hotels = db.prepare('SELECT COUNT(*) as count FROM hotels').get().count;
  const rooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
  const cities = db.prepare('SELECT COUNT(DISTINCT city) as count FROM hotels').get().count;
  const countries = db.prepare('SELECT COUNT(DISTINCT country) as count FROM hotels').get().count;
  res.json({ hotels, rooms, cities, countries });
});

// Fallback to index.html
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
