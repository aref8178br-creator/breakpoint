const API = '';

let debounceTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initFilters();
  await loadHotels();
  setupModalClose();
  loadStats();

  // Live search with debounce
  document.getElementById('text-search').addEventListener('input', debounceFilter);
  document.getElementById('city-filter').addEventListener('change', filterHotels);
  document.getElementById('country-filter').addEventListener('change', filterHotels);
  document.getElementById('stars-filter').addEventListener('change', filterHotels);
  document.getElementById('sort-filter').addEventListener('change', filterHotels);
  document.getElementById('min-price').addEventListener('input', debounceFilter);
  document.getElementById('max-price').addEventListener('input', debounceFilter);
  document.getElementById('amenity-filter').addEventListener('change', filterHotels);
  document.getElementById('checkin').addEventListener('change', filterHotels);
  document.getElementById('checkout').addEventListener('change', filterHotels);
});

function debounceFilter() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(filterHotels, 300);
}

async function loadStats() {
  try {
    const res = await fetch(`${API}/api/stats`);
    const stats = await res.json();
    document.getElementById('total-hotels').textContent = stats.hotels;
  } catch (e) {}
}

async function initFilters() {
  try {
    const [citiesRes, countriesRes, amenitiesRes] = await Promise.all([
      fetch(`${API}/api/hotels/cities`),
      fetch(`${API}/api/hotels/countries`),
      fetch(`${API}/api/hotels/amenities`)
    ]);
    const cities = await citiesRes.json();
    const countries = await countriesRes.json();
    const amenities = await amenitiesRes.json();

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

    const amenitySelect = document.getElementById('amenity-filter');
    amenities.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      amenitySelect.appendChild(opt);
    });
  } catch (e) {
    console.error('Failed to load filters:', e);
  }
}

function getFilters() {
  return {
    search: document.getElementById('text-search').value,
    city: document.getElementById('city-filter').value,
    country: document.getElementById('country-filter').value,
    stars: document.getElementById('stars-filter').value,
    sortBy: document.getElementById('sort-filter').value,
    minPrice: document.getElementById('min-price').value,
    maxPrice: document.getElementById('max-price').value,
    amenity: document.getElementById('amenity-filter').value,
    checkin: document.getElementById('checkin').value,
    checkout: document.getElementById('checkout').value
  };
}

async function filterHotels() {
  const filters = getFilters();
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, val]) => {
    if (val) params.set(key, val);
  });

  try {
    const res = await fetch(`${API}/api/hotels?${params}`);
    const hotels = await res.json();
    renderHotels(hotels);

    const countEl = document.getElementById('results-count');
    countEl.textContent = `${hotels.length} hotel${hotels.length !== 1 ? 's' : ''} found`;
  } catch (e) {
    console.error('Failed to filter hotels:', e);
  }
}

function resetFilters() {
  document.getElementById('text-search').value = '';
  document.getElementById('city-filter').value = '';
  document.getElementById('country-filter').value = '';
  document.getElementById('stars-filter').value = '';
  document.getElementById('sort-filter').value = 'name_asc';
  document.getElementById('min-price').value = '';
  document.getElementById('max-price').value = '';
  document.getElementById('amenity-filter').value = '';
  document.getElementById('checkin').value = '';
  document.getElementById('checkout').value = '';
  filterHotels();
}

function filterByCity(city) {
  document.getElementById('city-filter').value = city;
  document.getElementById('country-filter').value = '';
  document.getElementById('text-search').value = '';
  document.getElementById('stars-filter').value = '';
  document.getElementById('min-price').value = '';
  document.getElementById('max-price').value = '';
  document.getElementById('amenity-filter').value = '';
  filterHotels();
  document.getElementById('hotels').scrollIntoView({ behavior: 'smooth' });
}

function getHotelCoverImage(hotel) {
  if (hotel.cover_image) return hotel.cover_image;
  if (hotel.fallback_image) return hotel.fallback_image;
  return 'media/1.jpg';
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
    const minPrice = hotel.computed_min_price || hotel.base_min_price || hotel.min_price || 0;

    const card = document.createElement('div');
    card.className = 'hotel-card';
    card.onclick = () => openModal(hotel.id);

    card.innerHTML = `
      <div class="hotel-card-image">
        <img src="${getHotelCoverImage(hotel)}" alt="${hotel.name}" onerror="this.style.display='none'">
        <div class="hotel-badge">${hotel.stars} Star</div>
      </div>
      <div class="hotel-card-content">
        <h3>${hotel.name}</h3>
        <div class="hotel-location">&#128205; ${hotel.city}, ${hotel.country}</div>
        <div class="stars">${renderStars(hotel.stars)}</div>
        <p>${hotel.description}</p>
        <div class="hotel-card-footer">
          <div class="hotel-price">$${minPrice} <span>/ night</span></div>
          <button class="view-btn">View Details</button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

async function openModal(hotelId) {
  const modal = document.getElementById('hotel-modal');
  const content = document.getElementById('modal-content');
  content.innerHTML = '<div style="padding:4rem;text-align:center;color:#666;">Loading...</div>';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  try {
    const [hotelRes, roomsRes, amenitiesRes, imagesRes, pricesRes] = await Promise.all([
      fetch(`${API}/api/hotels/${hotelId}`),
      fetch(`${API}/api/hotels/${hotelId}/rooms`),
      fetch(`${API}/api/hotels/${hotelId}/amenities`),
      fetch(`${API}/api/hotels/${hotelId}/images`),
      fetch(`${API}/api/hotels/${hotelId}/prices`)
    ]);

    const hotel = await hotelRes.json();
    const rooms = await roomsRes.json();
    const amenities = await amenitiesRes.json();
    const images = await imagesRes.json();
    const priceCalendar = await pricesRes.json();

    const filters = getFilters();

    const roomsHTML = rooms.map(room => {
      const price = filters.checkin
        ? (priceCalendar.find(p => p.date === filters.checkin)?.min_price || '-')
        : (priceCalendar[0]?.min_price || '-');
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
      const dayPrice = priceCalendar.find(p => p.date === dateStr);

      calendarHTML += `
        <div class="calendar-day ${isWeekend ? 'weekend' : ''}">
          <div class="date">${d}</div>
          <div class="price">$${dayPrice ? dayPrice.min_price : '-'}</div>
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
            <tbody>${roomsHTML}</tbody>
          </table>
        </div>

        <div class="price-calendar">
          <h3>Price Calendar (September 2026)</h3>
          <div class="calendar-grid">${calendarHTML}</div>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = '<div style="padding:4rem;text-align:center;color:red;">Failed to load hotel details.</div>';
    console.error(e);
  }
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
