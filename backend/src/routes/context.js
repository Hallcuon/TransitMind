const express = require('express');
const { getTomtomTrafficForPath, fetchCongestionSlots } = require('../services/tomtomTraffic');

const router = express.Router();

const contextCache = new Map();
const CONTEXT_TTL_MS = 10 * 60 * 1000; // 10 minutes

const getCacheKey = (lat, lng) => `${Number(lat).toFixed(2)}:${Number(lng).toFixed(2)}`;

const weatherCodeToText = (code) => {
  const mapping = {
    0: 'Clear',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Dense drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    80: 'Rain showers',
    81: 'Showers',
    82: 'Heavy showers',
    95: 'Thunderstorm',
  };
  return mapping[code] || `Code ${code}`;
};

const fetchPointContext = async (point) => {
  const { lat, lng, label, atTime } = point;
  const cacheKey = getCacheKey(lat, lng);
  const now = Date.now();
  const cached = contextCache.get(cacheKey);

  let normalized = cached?.data;
  if (!normalized || now - cached.timestamp >= CONTEXT_TTL_MS) {
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,rain,cloud_cover,is_day` +
      `&timezone=auto`;
    const timezoneUrl = `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lng}`;

    const [weatherResponse, timezoneResponse] = await Promise.all([
      fetch(weatherUrl),
      fetch(timezoneUrl),
    ]);

    if (!weatherResponse.ok) {
      throw new Error(`Weather API failed: ${weatherResponse.status}`);
    }
    if (!timezoneResponse.ok) {
      throw new Error(`Timezone API failed: ${timezoneResponse.status}`);
    }

    const weatherData = await weatherResponse.json();
    const timezoneData = await timezoneResponse.json();

    const cur = weatherData.current || {};
    normalized = {
      lat,
      lng,
      timezone: timezoneData.timeZone || weatherData.timezone || 'UTC',
      weather: {
        temperature: cur.temperature_2m ?? null,
        humidity: cur.relative_humidity_2m ?? null,
        windSpeed: cur.wind_speed_10m ?? null,
        weatherCode: cur.weather_code ?? null,
        description: weatherCodeToText(cur.weather_code),
        isDay: cur.is_day === 1,
        precipitationMm: cur.precipitation ?? null,
        rainMm: cur.rain ?? null,
        cloudCoverPct: cur.cloud_cover ?? null,
      },
    };

    contextCache.set(cacheKey, {
      timestamp: now,
      data: normalized,
    });
  }

  const targetDate = atTime ? new Date(atTime) : new Date();
  const localTime = targetDate.toLocaleTimeString('uk-UA', {
    timeZone: normalized.timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return {
    ...normalized,
    label,
    atTime: targetDate.toISOString(),
    localTime,
  };
};

router.post('/route-points', async (req, res) => {
  try {
    const { points = [] } = req.body;

    if (!Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ error: 'points array is required' });
    }

    const sanitizedPoints = points
      .map((point, index) => ({
        label: point.label || `Point ${index + 1}`,
        lat: Number(point.lat),
        lng: Number(point.lng),
        atTime: point.atTime || null,
      }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
      .slice(0, 5);

    if (sanitizedPoints.length === 0) {
      return res.status(400).json({ error: 'No valid points provided' });
    }

    const context = await Promise.all(sanitizedPoints.map(fetchPointContext));
    res.json({ points: context, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Failed to fetch route context:', error.message);
    res.status(500).json({ error: 'Failed to fetch route context' });
  }
});

function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Approximate route length from polyline (km); used when OSRM stats are missing or zero. */
function polylineLengthKm(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = { lat: Number(coords[i].lat), lng: Number(coords[i].lng) };
    const b = { lat: Number(coords[i + 1].lat), lng: Number(coords[i + 1].lng) };
    if (Number.isFinite(a.lat) && Number.isFinite(a.lng) && Number.isFinite(b.lat) && Number.isFinite(b.lng)) {
      sum += haversineKm(a, b);
    }
  }
  return sum;
}

function samplePathCoordinates(coords, maxPoints) {
  if (!Array.isArray(coords) || coords.length < 2) return [];
  const clean = coords
    .map((c) => ({ lat: Number(c.lat), lng: Number(c.lng) }))
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
  if (clean.length <= maxPoints) {
    return clean.map((p, i, arr) => ({
      ...p,
      label:
        i === 0 ? 'Start' : i === arr.length - 1 ? 'End' : `${Math.round((i / (arr.length - 1)) * 100)}%`,
    }));
  }
  const out = [];
  const n = maxPoints;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const idx = Math.round(t * (clean.length - 1));
    const p = clean[idx];
    let label;
    if (i === 0) label = 'Start';
    else if (i === n - 1) label = 'End';
    else label = `${Math.round(t * 100)}%`;
    out.push({ lat: p.lat, lng: p.lng, label });
  }
  return out;
}

/**
 * POST /route-enrichment
 * Body: { pathCoordinates: [{lat,lng},...], statistics: { totalDistance, totalTime } }
 * Returns weather along sampled polyline + coarse pace / congestion hint from average speed.
 */
router.post('/route-enrichment', async (req, res) => {
  try {
    const { pathCoordinates = [], statistics = {} } = req.body;
    const sampled = samplePathCoordinates(pathCoordinates, 5);

    const weatherAlongRoute =
      sampled.length > 0
        ? await Promise.all(
            sampled.map((p) =>
              fetchPointContext({
                lat: p.lat,
                lng: p.lng,
                label: p.label,
                atTime: new Date().toISOString(),
              })
            )
          )
        : [];

    let totalDistance = Number(
      statistics.totalDistance ?? statistics.total_distance ?? statistics.distanceKm
    );
    let totalTime = Number(
      statistics.totalTime ?? statistics.total_time ?? statistics.durationMinutes ?? statistics.duration_minutes
    );

    const pathKm = polylineLengthKm(pathCoordinates);

    // OSRM segments sometimes lack distance/duration (fallback straight line) — use polyline length.
    if (!Number.isFinite(totalDistance) || totalDistance <= 0) {
      totalDistance = pathKm > 0 ? pathKm : NaN;
    }

    let avgSpeedKmh = null;
    let loadLevel = 'unknown';
    let paceNote =
      'Missing distance or duration — cannot estimate average pace. Re-run route details or check OSRM response.';

    if (Number.isFinite(totalDistance) && totalDistance > 0 && Number.isFinite(totalTime) && totalTime > 0) {
      avgSpeedKmh = totalDistance / (totalTime / 60);
      if (avgSpeedKmh >= 65) loadLevel = 'light';
      else if (avgSpeedKmh >= 38) loadLevel = 'moderate';
      else loadLevel = 'heavy';
      paceNote =
        loadLevel === 'light'
          ? 'Higher average pace — typical for highways or light traffic periods.'
          : loadLevel === 'moderate'
            ? 'Mixed pace — urban stretches or varying conditions.'
            : 'Lower average pace — dense traffic, city segments, or winding roads.';
    } else if (Number.isFinite(pathKm) && pathKm > 0 && (!Number.isFinite(totalTime) || totalTime <= 0)) {
      paceNote =
        'Route geometry is present but OSRM duration is missing — average speed was not computed.';
    }

    const tomtomKey = process.env.TOMTOM_API_KEY;
    const trafficSetupHint =
      'Set TOMTOM_API_KEY in the backend .env to enable live traffic delay via TomTom Routing (free developer tier). Traffic here is never inferred from other TransitMind users.';
    let liveTraffic = {
      available: false,
      provider: null,
      setupHint: trafficSetupHint,
    };

    if (tomtomKey) {
      try {
        const tt = await getTomtomTrafficForPath(pathCoordinates, tomtomKey);
        if (tt && tt.travelTimeInSeconds != null) {
          const delaySec = tt.trafficDelayInSeconds;
          liveTraffic = {
            available: true,
            provider: 'TomTom',
            lengthInMeters: tt.lengthInMeters,
            travelTimeInSeconds: tt.travelTimeInSeconds,
            trafficDelayInSeconds: delaySec,
            trafficDelayMinutes:
              delaySec != null && Number.isFinite(delaySec)
                ? Math.round((delaySec / 60) * 10) / 10
                : null,
            noTrafficTravelTimeInSeconds: tt.noTrafficTravelTimeInSeconds,
            historicTrafficTravelTimeInSeconds: tt.historicTrafficTravelTimeInSeconds,
            liveTrafficIncidentsTravelTimeInSeconds: tt.liveTrafficIncidentsTravelTimeInSeconds,
            note:
              'TomTom route uses start→end on its road network (may differ slightly from the OSRM line shown on the map). Includes live/historic traffic per TomTom.',
          };
        } else if (tt === null && pathCoordinates.length >= 2) {
          liveTraffic = {
            available: false,
            provider: 'TomTom',
            setupHint: trafficSetupHint,
            error: 'TomTom returned no route for start/end — check coordinates or API quota.',
          };
        }
      } catch (err) {
        liveTraffic = {
          available: false,
          provider: 'TomTom',
          setupHint: trafficSetupHint,
          error: err.message || 'TomTom request failed',
        };
      }
    }

    let congestionByDeparture = null;
    if (tomtomKey && pathCoordinates.length >= 2) {
      try {
        const tz = weatherAlongRoute[0]?.timezone || 'Europe/Kyiv';
        congestionByDeparture = await fetchCongestionSlots(pathCoordinates, tomtomKey, tz);
      } catch (err) {
        congestionByDeparture = { available: false, error: err.message || 'Congestion profile failed' };
      }
    }

    res.json({
      weatherAlongRoute,
      routePace: {
        avgSpeedKmh: avgSpeedKmh != null && Number.isFinite(avgSpeedKmh)
          ? Math.round(avgSpeedKmh * 10) / 10
          : null,
        loadLevel,
        paceNote,
        distanceSource:
          Number(statistics.totalDistance ?? statistics.total_distance ?? statistics.distanceKm) > 0
            ? 'osrm'
            : pathKm > 0
              ? 'polyline'
              : 'none',
      },
      liveTraffic,
      congestionByDeparture,
      sources: {
        weather: 'Open-Meteo',
        paceHint: 'derived from OSRM distance & duration (not live traffic feeds)',
        traffic: tomtomKey ? 'TomTom Routing (optional)' : null,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('route-enrichment:', error.message);
    res.status(500).json({ error: 'Failed to build route enrichment' });
  }
});

module.exports = router;
