/**
 * Map utilities for generating static map images and location handling
 */

/**
 * Generate a static map image URL with coordinates
 * This is more accurate than using address strings
 */
export const getStaticMapUrlWithCoords = (lat, lng, width = 400, height = 200, zoom = 15) => {
  if (!lat || !lng) return null
  
  // Try Google Maps Static API first (if API key is available)
  const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  if (googleApiKey) {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&markers=color:0x8B5CF6%7C${lat},${lng}&key=${googleApiKey}`
  }
  
  // Fall back to Mapbox if Mapbox key is available
  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
  if (mapboxToken) {
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${lng},${lat})/${lng},${lat},${zoom}/${width}x${height}?access_token=${mapboxToken}`
  }
  
  // Last resort: Use placeholder
  return `https://via.placeholder.com/${width}x${height}/E5E5E5/737373?text=Map+Preview`
}

/**
 * Generate a static map image URL from location name
 * Geocodes the location first, then generates map with coordinates
 */
export const getStaticMapUrl = async (locationName, width = 400, height = 200) => {
  if (!locationName) return null
  
  // First, try to geocode the location to get coordinates
  const coords = await geocodeLocation(locationName)
  
  if (coords && coords.lat && coords.lng) {
    // Use coordinates for accurate map display
    return getStaticMapUrlWithCoords(coords.lat, coords.lng, width, height)
  }
  
  // Fallback: Try using address string directly (less accurate)
  const encodedLocation = encodeURIComponent(locationName)
  const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  if (googleApiKey) {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${encodedLocation}&zoom=15&size=${width}x${height}&markers=color:0x8B5CF6%7C${encodedLocation}&key=${googleApiKey}`
  }
  
  // Last resort: Use placeholder
  return `https://via.placeholder.com/${width}x${height}/E5E5E5/737373?text=Map+Preview`
}

/**
 * Generate a static map image URL using Google Maps Static API
 * Requires GOOGLE_MAPS_API_KEY in environment
 */
export const getGoogleStaticMapUrl = (locationName, width = 400, height = 200, zoom = 15) => {
  if (!locationName) return null
  
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  if (!apiKey) {
    // Fallback to placeholder
    return `https://via.placeholder.com/${width}x${height}/E5E5E5/737373?text=Map+Preview`
  }
  
  const encodedLocation = encodeURIComponent(locationName)
  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodedLocation}&zoom=${zoom}&size=${width}x${height}&markers=color:red%7C${encodedLocation}&key=${apiKey}`
}

/**
 * Get coordinates from location name (geocoding)
 * Uses Google Geocoding API if available, otherwise falls back to OpenStreetMap Nominatim
 */
export const geocodeLocation = async (locationName) => {
  if (!locationName) return null
  
  const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  
  // Try Google Geocoding API first (more accurate)
  if (googleApiKey) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${googleApiKey}`
      )
      const data = await response.json()
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location
        return {
          lat: location.lat,
          lng: location.lng,
          address: data.results[0].formatted_address,
        }
      }
    } catch (error) {
      console.log('Google Geocoding error:', error)
      // Fall through to OpenStreetMap
    }
  }
  
  // Fallback to OpenStreetMap Nominatim (free, but rate-limited)
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`,
      {
        headers: {
          'User-Agent': 'Bonded App', // Required by Nominatim
        },
      }
    )
    
    const data = await response.json()
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: data[0].display_name,
      }
    }
  } catch (error) {
    console.log('OpenStreetMap Geocoding error:', error)
  }
  
  return null
}

/**
 * Generate a simple map preview placeholder
 */
export const getMapPlaceholder = (width = 400, height = 200) => {
  return `https://via.placeholder.com/${width}x${height}/E5E5E5/737373?text=Map+Preview`
}


