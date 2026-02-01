/**
 * Unsplash API Service
 * Fetches college-aged photos for yearbook demo
 * 
 * Note: You'll need an Unsplash API key
 * Get one free at: https://unsplash.com/developers
 * Add to .env: UNSPLASH_ACCESS_KEY=your_key_here
 */

const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY || 'YOUR_UNSPLASH_ACCESS_KEY'
const UNSPLASH_API_URL = 'https://api.unsplash.com'

// College-aged search terms for diverse, realistic photos
const SEARCH_TERMS = [
  'young adult portrait',
  'college student',
  'university student',
  'young professional',
  'campus life',
  'student lifestyle',
  'young person',
  'millennial portrait',
  'gen z portrait',
]

/**
 * Fetch a random photo from Unsplash
 * @param {string} searchTerm - Search term for photo
 * @param {number} width - Desired width (default 400)
 * @param {number} height - Desired height (default 400)
 * @returns {Promise<string>} Photo URL
 */
export const fetchUnsplashPhoto = async (searchTerm = null, width = 400, height = 400) => {
  try {
    const term = searchTerm || SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)]
    
    const response = await fetch(
      `${UNSPLASH_API_URL}/photos/random?query=${encodeURIComponent(term)}&orientation=portrait&w=${width}&h=${height}&client_id=${UNSPLASH_ACCESS_KEY}`
    )

    if (!response.ok) {
      // Fallback to a placeholder service if Unsplash fails
      console.warn('Unsplash API failed, using fallback')
      return getFallbackPhoto()
    }

    const data = await response.json()
    return data.urls?.regular || data.urls?.small || getFallbackPhoto()
  } catch (error) {
    console.error('Error fetching Unsplash photo:', error)
    return getFallbackPhoto()
  }
}

/**
 * Fetch multiple photos at once
 * @param {number} count - Number of photos to fetch
 * @returns {Promise<string[]>} Array of photo URLs
 */
export const fetchMultiplePhotos = async (count = 10) => {
  try {
    const response = await fetch(
      `${UNSPLASH_API_URL}/photos/random?count=${count}&query=young%20adult%20portrait&orientation=portrait&client_id=${UNSPLASH_ACCESS_KEY}`
    )

    if (!response.ok) {
      // Fallback to multiple placeholder photos
      return Array.from({ length: count }, () => getFallbackPhoto())
    }

    const data = await response.json()
    return data.map(photo => photo.urls?.regular || photo.urls?.small || getFallbackPhoto())
  } catch (error) {
    console.error('Error fetching multiple Unsplash photos:', error)
    return Array.from({ length: count }, () => getFallbackPhoto())
  }
}

/**
 * Fallback photo service (using a free alternative)
 */
const getFallbackPhoto = () => {
  // Using Picsum Photos as fallback (free, no API key needed)
  const id = Math.floor(Math.random() * 1000)
  return `https://picsum.photos/400/400?random=${id}`
}

/**
 * Get a photo URL with specific dimensions
 * @param {number} width 
 * @param {number} height 
 * @param {string} seed - Optional seed for consistent random photos
 */
export const getPhotoUrl = (width = 400, height = 400, seed = null) => {
  if (seed) {
    return `https://picsum.photos/seed/${seed}/${width}/${height}`
  }
  const id = Math.floor(Math.random() * 1000)
  return `https://picsum.photos/${width}/${height}?random=${id}`
}

