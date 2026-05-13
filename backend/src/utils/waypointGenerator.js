/**
 * Generate realistic curved waypoints between two coordinates
 * Creates a curved path simulating real roads/railways
 */
function generateWaypoints(startLat, startLng, endLat, endLng, numPoints = 5) {
  const points = [];
  
  // Add start point
  points.push({ lat: startLat, lng: startLng });
  
  // Calculate midpoint and perpendicular offset for curve
  const midLat = (startLat + endLat) / 2;
  const midLng = (startLng + endLng) / 2;
  
  // Calculate distance for perpendicular offset
  const latDiff = endLat - startLat;
  const lngDiff = endLng - startLng;
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  
  // Perpendicular direction (rotated 90 degrees)
  const perpLat = -lngDiff / distance;
  const perpLng = latDiff / distance;
  
  // Offset amount (creates curve)
  const offsetAmount = distance * 0.15;
  
  // Generate intermediate points with bezier-like curve
  for (let i = 1; i < numPoints; i++) {
    const t = i / numPoints;
    
    // Linear interpolation
    let lat = startLat + (endLat - startLat) * t;
    let lng = startLng + (endLng - startLng) * t;
    
    // Add perpendicular offset (creates curve)
    // Sine wave to make curve smooth
    const curveAmount = Math.sin(t * Math.PI) * offsetAmount;
    lat += perpLat * curveAmount;
    lng += perpLng * curveAmount;
    
    points.push({ lat: parseFloat(lat.toFixed(4)), lng: parseFloat(lng.toFixed(4)) });
  }
  
  // Add end point
  points.push({ lat: endLat, lng: endLng });
  
  return points;
}

module.exports = { generateWaypoints };
