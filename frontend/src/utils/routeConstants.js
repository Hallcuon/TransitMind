// City coordinates database (currently all Ukraine)
export const CITIES = [
  { name: 'Kyiv', lat: 50.4501, lng: 30.5234, country: 'Ukraine' },
  { name: 'Lviv', lat: 49.8397, lng: 24.0297, country: 'Ukraine' },
  { name: 'Kharkiv', lat: 50.0038, lng: 36.2304, country: 'Ukraine' },
  { name: 'Odesa', lat: 46.4757, lng: 30.7325, country: 'Ukraine' },
  { name: 'Dnipro', lat: 48.4647, lng: 35.0461, country: 'Ukraine' },
  { name: 'Donestk', lat: 47.9601, lng: 37.8063, country: 'Ukraine' },
  { name: 'Zaporizhzhia', lat: 47.8388, lng: 35.1851, country: 'Ukraine' },
  { name: 'Mykolaiv', lat: 46.9751, lng: 31.9946, country: 'Ukraine' },
  { name: 'Poltava', lat: 49.5883, lng: 34.5514, country: 'Ukraine' },
  { name: 'Chernihiv', lat: 51.4982, lng: 31.2893, country: 'Ukraine' },
  { name: 'Sumy', lat: 50.9216, lng: 34.7978, country: 'Ukraine' },
  { name: 'Vinnytsia', lat: 49.2331, lng: 28.4613, country: 'Ukraine' },
  { name: 'Zhytomyr', lat: 50.2547, lng: 28.6587, country: 'Ukraine' },
  { name: 'Khmelnytsky', lat: 49.4144, lng: 26.9847, country: 'Ukraine' },
  { name: 'Cherkasy', lat: 49.4270, lng: 32.0603, country: 'Ukraine' },
  { name: 'Kirovohrad', lat: 48.5079, lng: 32.2623, country: 'Ukraine' },
  { name: 'Rivne', lat: 50.6199, lng: 26.2328, country: 'Ukraine' },
  { name: 'Lutsk', lat: 50.7472, lng: 25.3254, country: 'Ukraine' },
  { name: 'Ternopil', lat: 49.5535, lng: 25.6271, country: 'Ukraine' },
  { name: 'Ivano-Frankivsk', lat: 48.7215, lng: 24.7097, country: 'Ukraine' },
  { name: 'Uzhhorod', lat: 48.6208, lng: 22.2879, country: 'Ukraine' },
];

// Available countries for filtering
export const COUNTRIES = ['Ukraine'];

// Transport speeds in km/h (average speed)
export const TRANSPORT_SPEEDS = {
  flight: 800,      // Average cruise speed ~800 km/h
  train: 120,       // Average train speed ~120 km/h
  metro: 40,        // Metro average speed ~40 km/h
};

// Transport types
export const TRANSPORT_TYPES = [
  { id: 'flight', name: 'Flight', icon: '✈️', color: '#60a5fa' },
  { id: 'train', name: 'Train', icon: '🚂', color: '#f59e0b' },
  { id: 'metro', name: 'Metro', icon: '🚇', color: '#ec4899' },
];

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Starting latitude
 * @param {number} lng1 - Starting longitude
 * @param {number} lat2 - Ending latitude
 * @param {number} lng2 - Ending longitude
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
};

/**
 * Calculate travel duration in minutes
 * @param {number} distance - Distance in kilometers
 * @param {string} transportType - Type of transport (flight, train, bus, metro)
 * @returns {number} Duration in minutes
 */
export const calculateDuration = (distance, transportType) => {
  const speed = TRANSPORT_SPEEDS[transportType] || 100;
  const hours = distance / speed;
  const minutes = Math.round(hours * 60);
  return Math.max(minutes, 15); // Minimum 15 minutes
};

/**
 * Find city by name (case-insensitive)
 * @param {string} cityName - Name of city to find
 * @returns {object|null} City object or null
 */
export const findCity = (cityName) => {
  return CITIES.find(city => city.name.toLowerCase() === cityName.toLowerCase());
};

/**
 * Format duration to readable time string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
export const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};
