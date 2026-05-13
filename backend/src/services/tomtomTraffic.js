/**
 * TomTom Routing API — live traffic + departure-time profiles (requires TOMTOM_API_KEY).
 * https://developer.tomtom.com/routing-api/documentation/routing/calculate-route
 */

const { DateTime } = require('luxon');

async function fetchTomtomSummary(start, end, apiKey, departAtIso = null) {
  const lat1 = Number(start.lat);
  const lng1 = Number(start.lng);
  const lat2 = Number(end.lat);
  const lng2 = Number(end.lng);
  if (![lat1, lng1, lat2, lng2].every((n) => Number.isFinite(n))) {
    return null;
  }

  const loc = `${lat1},${lng1}:${lat2},${lng2}`;
  const url = new URL(`https://api.tomtom.com/routing/1/calculateRoute/${encodeURI(loc)}/json`);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('traffic', 'true');
  url.searchParams.set('routeType', 'fastest');
  url.searchParams.set('travelMode', 'car');
  url.searchParams.set('vehicleCommercial', 'false');
  url.searchParams.set('routeRepresentation', 'summaryOnly');
  url.searchParams.set('computeTravelTimeFor', 'all');
  if (departAtIso) {
    url.searchParams.set('departAt', departAtIso);
  }

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`TomTom HTTP ${res.status}`);
    err.detail = text.slice(0, 300);
    throw err;
  }

  const data = await res.json();
  const summary = data.routes?.[0]?.summary;
  if (!summary) return null;

  return {
    lengthInMeters: summary.lengthInMeters ?? null,
    travelTimeInSeconds: summary.travelTimeInSeconds ?? null,
    trafficDelayInSeconds: summary.trafficDelayInSeconds ?? null,
    noTrafficTravelTimeInSeconds: summary.noTrafficTravelTimeInSeconds ?? null,
    historicTrafficTravelTimeInSeconds: summary.historicTrafficTravelTimeInSeconds ?? null,
    liveTrafficIncidentsTravelTimeInSeconds: summary.liveTrafficIncidentsTravelTimeInSeconds ?? null,
  };
}

async function getTomtomTrafficForPath(pathCoordinates, apiKey) {
  if (!apiKey || !Array.isArray(pathCoordinates) || pathCoordinates.length < 2) {
    return null;
  }

  const clean = pathCoordinates
    .map((c) => ({ lat: Number(c.lat), lng: Number(c.lng) }))
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
  if (clean.length < 2) return null;

  const start = clean[0];
  const end = clean[clean.length - 1];
  return fetchTomtomSummary(start, end, apiKey);
}

/** Typical weekday departure windows — tomorrow local wall-clock (Europe/Kyiv or route timezone). */
const DEPARTURE_SLOT_DEFS = [
  { h: 7, m: 30, period: 'morning_rush' },
  { h: 9, m: 0, period: 'morning' },
  { h: 12, m: 30, period: 'midday' },
  { h: 17, m: 30, period: 'evening_rush' },
  { h: 21, m: 0, period: 'evening' },
];

/**
 * Parallel TomTom requests for “what if I leave tomorrow at HH:MM local”.
 */
async function fetchCongestionSlots(pathCoordinates, apiKey, timeZone) {
  if (!apiKey || !Array.isArray(pathCoordinates) || pathCoordinates.length < 2) {
    return null;
  }

  const clean = pathCoordinates
    .map((c) => ({ lat: Number(c.lat), lng: Number(c.lng) }))
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
  if (clean.length < 2) return null;

  const start = clean[0];
  const end = clean[clean.length - 1];
  const tz = timeZone && typeof timeZone === 'string' ? timeZone : 'Europe/Kyiv';

  const tomorrow = DateTime.now().setZone(tz).plus({ days: 1 }).startOf('day');

  const settled = await Promise.allSettled(
    DEPARTURE_SLOT_DEFS.map(({ h, m, period }) => {
      const dt = tomorrow.set({ hour: h, minute: m, second: 0, millisecond: 0 });
      const departAtIso = dt.toISO();
      return fetchTomtomSummary(start, end, apiKey, departAtIso).then((summary) => ({
        period,
        localTimeLabel: dt.toFormat('HH:mm'),
        departAtIso,
        travelTimeSeconds: summary?.travelTimeInSeconds ?? null,
        trafficDelaySeconds: summary?.trafficDelayInSeconds ?? null,
      }));
    })
  );

  const slots = settled.map((r, i) => {
    const def = DEPARTURE_SLOT_DEFS[i];
    const dt = tomorrow.set({ hour: def.h, minute: def.m, second: 0, millisecond: 0 });
    if (r.status === 'fulfilled') {
      return r.value;
    }
    return {
      period: def.period,
      localTimeLabel: dt.toFormat('HH:mm'),
      departAtIso: dt.toISO(),
      travelTimeSeconds: null,
      trafficDelaySeconds: null,
      error: true,
    };
  });

  let peakSlotIndex = -1;
  let peakTravel = -1;
  slots.forEach((s, i) => {
    if (s.travelTimeSeconds != null && Number.isFinite(s.travelTimeSeconds) && s.travelTimeSeconds > peakTravel) {
      peakTravel = s.travelTimeSeconds;
      peakSlotIndex = i;
    }
  });

  return {
    available: true,
    timeZone: tz,
    slots,
    peakSlotIndex,
    note:
      'Travel times if you depart tomorrow at these local clock times (same start→end as TomTom). Peak = longest duration.',
  };
}

module.exports = {
  getTomtomTrafficForPath,
  fetchTomtomSummary,
  fetchCongestionSlots,
};
