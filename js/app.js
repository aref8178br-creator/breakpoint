let currentFilter = { city: '', country: '', checkin: '', checkout: '' };

document.addEventListener('DOMContentLoaded', () => {
  initFilters();
  renderHotels(HOTELS);
  setupModalClose();

  document.getElementById('text-search').addEventListener('input', filterHotels);
  document.getElementById('city-filter').addEventListener('change', filterHotels);
  document.getElementById('country-filter').addEventListener('change', filterHotels);
});

function initFilters() {
  const cities = [...new Set(HOTELS.map(h => h.city))];
  const countries = [...new Set(HOTELS.map(h => h.country))];

  const citySelect = document.getElementById('city-filter');
  cities.forEach(city => {
    const opt = document.createElement('option');
    opt.value = city;
    opt.textContent = city;
    citySelect.appendChild(opt);
  });

  const countrySelect = document.getElementById('country-filter');
  countries.forEach(country => {
    const opt = document.createElement('option');
    opt.value = country;
    opt.textContent = country;
    countrySelect.appendChild(opt);
  });
}

function filterHotels() {
  const text = document.getElementById('text-search').value.toLowerCase();
  const city = document.getElementById('city-filter').value;
  const country = document.getElementById('country-filter').value;
  const checkin = document.getElementById('checkin').value;
  const checkout = document.getElementById('checkout').value;

  currentFilter = { city, country, checkin, checkout };

  let filtered = HOTELS;

  if (text) {
    filtered = filtered.filter(h =>
      h.name.toLowerCase().includes(text) ||
      h.city.toLowerCase().includes(text) ||
      h.country.toLowerCase().includes(text) ||
      h.description.toLowerCase().includes(text)
    );
  }

  if (city) {
    filtered = filtered.filter(h => h.city === city);
  }

  if (country) {
    filtered = filtered.filter(h => h.country === country);
  }

  renderHotels(filtered);
}

function filterByCity(city) {
  document.getElementById('city-filter').value = city;
  document.getElementById('country-filter').value = '';
  filterHotels();
  document.getElementById('hotels').scrollIntoView({ behavior: 'smooth' });
}

function getHotelCoverImage(hotelId) {
  const img = IMAGES.find(i => i.hotel_id === hotelId && i.is_cover && !i.room_id);
  if (img) return img.image_path;
  const roomImg = IMAGES.find(i => i.hotel_id === hotelId && i.is_cover && i.room_id);
  if (roomImg) return roomImg.image_path;
  return 'media/1.jpg';
}

function getHotelAmenities(hotelId) {
  const amenityIds = HOTEL_AMENITIES
    .filter(a => a.hotel_id === hotelId)
    .map(a => a.amenity_id);
  return AMENITIES.filter(a => amenityIds.includes(a.id));
}

function getHotelRooms(hotelId) {
  return ROOMS.filter(r => r.hotel_id === hotelId);
}

function getRoomPrice(roomId, date) {
  const price = ROOM_PRICES.find(p => p.room_id === roomId && p.date === date);
  return price ? price.price : null;
}

function getMinPrice(hotelId) {
  const rooms = getHotelRooms(hotelId);
  const prices = [];
  rooms.forEach(room => {
    ROOM_PRICES.filter(p => p.room_id === room.id).forEach(p => prices.push(p.price));
  });
  return prices.length > 0 ? Math.min(...prices) : 0;
}

function renderStars(count) {
  return '&#9733;'.repeat(count) + '&#9734;'.repeat(5 - count);
}

function renderHotels(hotels) {
  const grid = document.getElementById('hotel-grid');
  grid.innerHTML = '';

  if (hotels.length === 0) {
    grid.innerHTML = '<div class="no-results"><h3>No hotels found</h3><p>Try adjusting your search filters.</p></div>';
    return;
  }

  hotels.forEach(hotel => {
    const coverImage = getHotelCoverImage(hotel.id);
    const amenities = getHotelAmenities(hotel.id).slice(0, 4);
    const minPrice = getMinPrice(hotel.id);

    const card = document.createElement('div');
    card.className = 'hotel-card';
    card.onclick = () => openModal(hotel.id);

    card.innerHTML = `
      <div class="hotel-card-image">
        <img src="${coverImage}" alt="${hotel.name}" onerror="this.style.display='none'">
        <div class="hotel-badge">${hotel.stars} Star</div>
      </div>
      <div class="hotel-card-content">
        <h3>${hotel.name}</h3>
        <div class="hotel-location">&#128205; ${hotel.city}, ${hotel.country}</div>
        <div class="stars">${renderStars(hotel.stars)}</div>
        <p>${hotel.description}</p>
        <div class="hotel-amenities">
          ${amenities.map(a => `<span class="amenity-tag">${a.name}</span>`).join('')}
        </div>
        <div class="hotel-card-footer">
          <div class="hotel-price">$${minPrice} <span>/ night</span></div>
          <button class="view-btn">View Details</button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

function openModal(hotelId) {
  const hotel = HOTELS.find(h => h.id === hotelId);
  const rooms = getHotelRooms(hotelId);
  const amenities = getHotelAmenities(hotelId);
  const images = IMAGES.filter(i => i.hotel_id === hotelId);

  const modal = document.getElementById('hotel-modal');
  const content = document.getElementById('modal-content');

  const priceDates = [];
  for (let d = 10; d <= 30; d++) {
    const dateStr = `2026-09-${d.toString().padStart(2, '0')}`;
    const dayOfWeek = new Date(dateStr).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    priceDates.push({ date: dateStr, day: d, isWeekend });
  }

  let roomsHTML = rooms.map(room => {
    let price = getRoomPrice(room.id, currentFilter.checkin || '2026-09-10');
    return `
      <tr>
        <td><strong>${room.name}</strong><br><small>${room.description}</small></td>
        <td>${room.capacity} guests</td>
        <td class="room-price">$${price}</td>
        <td><button class="book-btn" onclick="alert('Booking confirmed for ${room.name} at ${hotel.name}!')">Book Now</button></td>
      </tr>
    `;
  }).join('');

  let calendarHTML = '';
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarHTML += daysOfWeek.map(d => `<div class="calendar-day header">${d}</div>`).join('');

  const firstDay = new Date('2026-09-10').getDay();
  for (let i = 0; i < firstDay; i++) {
    calendarHTML += '<div class="calendar-day"></div>';
  }

  for (let d = 10; d <= 30; d++) {
    const dateStr = `2026-09-${d.toString().padStart(2, '0')}`;
    const dayOfWeek = new Date(dateStr).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    let minRoomPrice = Infinity;
    rooms.forEach(room => {
      const p = getRoomPrice(room.id, dateStr);
      if (p && p < minRoomPrice) minRoomPrice = p;
    });

    calendarHTML += `
      <div class="calendar-day ${isWeekend ? 'weekend' : ''}">
        <div class="date">${d}</div>
        <div class="price">$${minRoomPrice === Infinity ? '-' : minRoomPrice}</div>
      </div>
    `;
  }

  content.innerHTML = `
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <div class="modal-gallery">
      ${images.map(img => `<img src="${img.image_path}" alt="${hotel.name}" onerror="this.style.display='none'">`).join('')}
    </div>
    <div class="modal-body">
      <h2>${hotel.name}</h2>
      <div class="modal-location">&#128205; ${hotel.address}, ${hotel.city}, ${hotel.country}</div>
      <div class="modal-stars">${renderStars(hotel.stars)}</div>
      <p class="modal-description">${hotel.description}</p>
      
      <div class="modal-amenities">
        <h3>Hotel Amenities</h3>
        <div class="modal-amenities-grid">
          ${amenities.map(a => `<div class="modal-amenity">${a.name}</div>`).join('')}
        </div>
      </div>

      <div class="rooms-section">
        <h3>Available Rooms</h3>
        <table class="room-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Capacity</th>
              <th>Price/Night</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${roomsHTML}
          </tbody>
        </table>
      </div>

      <div class="price-calendar">
        <h3>Price Calendar (September 2026)</h3>
        <div class="calendar-grid">
          ${calendarHTML}
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('hotel-modal').classList.remove('active');
  document.body.style.overflow = '';
}

function setupModalClose() {
  const modal = document.getElementById('hotel-modal');
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}
