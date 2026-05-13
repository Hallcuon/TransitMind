/** Shared map helpers for progress along a polyline (same logic as Session page). */

export const haversineDistanceKm = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const interpolateAlongPath = (path, progress) => {
  if (!Array.isArray(path) || path.length === 0) {
    return null;
  }

  if (path.length === 1) {
    return { lat: path[0].lat, lng: path[0].lng };
  }

  const clampedProgress = Math.max(0, Math.min(progress, 1));
  if (clampedProgress === 0) {
    return { lat: path[0].lat, lng: path[0].lng };
  }
  if (clampedProgress === 1) {
    const last = path[path.length - 1];
    return { lat: last.lat, lng: last.lng };
  }

  const segmentLengths = [];
  let totalLength = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const len = haversineDistanceKm(from, to);
    segmentLengths.push(len);
    totalLength += len;
  }

  if (totalLength <= 0) {
    return { lat: path[0].lat, lng: path[0].lng };
  }

  const targetDistance = totalLength * clampedProgress;
  let traversed = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (traversed + segLen >= targetDistance) {
      const localProgress = segLen === 0 ? 0 : (targetDistance - traversed) / segLen;
      const from = path[i];
      const to = path[i + 1];
      return {
        lat: from.lat + (to.lat - from.lat) * localProgress,
        lng: from.lng + (to.lng - from.lng) * localProgress,
      };
    }
    traversed += segLen;
  }

  const last = path[path.length - 1];
  return { lat: last.lat, lng: last.lng };
};
