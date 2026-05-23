const OVERPASS_INSTANCES = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];
const OVERPASS_HEADERS = {
  'User-Agent':   'RoadSOS/1.0 (emergency-response-app)',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Accept':       'application/json',
};
const SEARCH_RADIUS_M = 5000;  // 5 km
const REQUEST_TIMEOUT = 20000; // 20 s
const CACHE_TTL_MS    = 5 * 60 * 1000; // 5 min in-memory TTL

// In-memory cache keyed by rounded coordinates
const memCache = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R    = 6371;
  const toR  = d => d * Math.PI / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = km =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

const buildQuery = (lat, lng) => {
  const r = SEARCH_RADIUS_M;
  return `[out:json][timeout:18];
(
  node["amenity"="hospital"](around:${r},${lat},${lng});
  way["amenity"="hospital"](around:${r},${lat},${lng});
  node["amenity"="clinic"](around:${r},${lat},${lng});
  way["amenity"="clinic"](around:${r},${lat},${lng});
  node["amenity"="police"](around:${r},${lat},${lng});
  way["amenity"="police"](around:${r},${lat},${lng});
  node["emergency"="ambulance_station"](around:${r},${lat},${lng});
  way["emergency"="ambulance_station"](around:${r},${lat},${lng});
  node["shop"="car_repair"](around:${r},${lat},${lng});
  way["shop"="car_repair"](around:${r},${lat},${lng});
  node["shop"="tyres"](around:${r},${lat},${lng});
  way["shop"="tyres"](around:${r},${lat},${lng});
);
out center;`;
};

const resolveType = tags => {
  const {amenity, emergency, shop} = tags;
  if (amenity === 'hospital' || amenity === 'clinic') return 'hospital';
  if (amenity === 'police')                           return 'police';
  if (emergency === 'ambulance_station')              return 'ambulance';
  if (shop === 'car_repair')                          return 'mechanic';
  if (shop === 'tyres')                               return 'tow_truck';
  return null;
};

const parseElement = (el, userLat, userLng) => {
  const tags = el.tags || {};
  const lat  = el.lat ?? el.center?.lat;
  const lng  = el.lon ?? el.center?.lon;
  if (!lat || !lng) return null;

  const type = resolveType(tags);
  if (!type) return null;

  const distKm = haversineKm(userLat, userLng, lat, lng);

  const addrParts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:city'],
  ].filter(Boolean);
  const address = addrParts.length
    ? addrParts.join(', ')
    : tags['addr:full'] || tags.description || '';

  const phone = tags.phone
    || tags['contact:phone']
    || tags['contact:mobile']
    || null;

  return {
    id:       `${el.type}-${el.id}`,
    name:     tags.name || tags['name:en'] || `Unnamed ${type}`,
    type,
    lat,
    lng,
    address,
    phone,
    distance: formatDistance(distKm),
    distKm,   // stripped before sending to client
  };
};

// ── Overpass fetch ────────────────────────────────────────────────────────────

const fetchOverpass = async (lat, lng) => {
  const query = buildQuery(lat, lng);
  let lastErr;

  for (const base of OVERPASS_INSTANCES) {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(base, {
        method:  'POST',
        headers: OVERPASS_HEADERS,
        body:    `data=${encodeURIComponent(query)}`,
        signal:  controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json     = await response.json();
      const elements = json.elements || [];

      const services = elements
        .map(el => parseElement(el, lat, lng))
        .filter(Boolean)
        .sort((a, b) => a.distKm - b.distKm);

      return services.map(({distKm: _, ...rest}) => rest);
    } catch (err) {
      lastErr = err;
      console.warn(`[nearby] ${base} failed: ${err.message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr;
};

// ── Cache helpers ─────────────────────────────────────────────────────────────

// Round coords to ~1.1 km grid so nearby requests share a cache entry
const cacheKey = (lat, lng) =>
  `${(Math.round(lat * 100) / 100).toFixed(2)},${(Math.round(lng * 100) / 100).toFixed(2)}`;

const fromCache = key => {
  const entry = memCache.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.ts;
  return {data: entry.data, fresh: age < CACHE_TTL_MS};
};

// ── Controller ────────────────────────────────────────────────────────────────

const getNearbyServices = async (req, res) => {
  const {lat, lng} = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      message: 'lat and lng query parameters are required',
    });
  }

  const latitude  = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({
      success: false,
      message: 'lat and lng must be valid numbers',
    });
  }

  const key    = cacheKey(latitude, longitude);
  const cached = fromCache(key);

  if (cached?.fresh) {
    return res.json({success: true, source: 'cache', data: cached.data});
  }

  try {
    const data = await fetchOverpass(latitude, longitude);
    memCache.set(key, {data, ts: Date.now()});
    console.log(`[nearby] ${data.length} results for (${latitude}, ${longitude})`);
    return res.json({success: true, source: 'live', data});
  } catch (err) {
    console.error('[nearby] Overpass error:', err.message);

    if (cached) {
      return res.json({success: true, source: 'stale_cache', data: cached.data});
    }

    return res.status(503).json({
      success: false,
      message: 'Could not fetch nearby services. Backend could not reach OpenStreetMap.',
    });
  }
};

module.exports = {getNearbyServices};
