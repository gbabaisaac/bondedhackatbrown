/**
 * Unsplash API Service
 * Fetches college-aged photos for yearbook demo
 * 
 * Setup Instructions:
 * 1. Go to https://unsplash.com/developers
 * 2. Create a free account (if you don't have one)
 * 3. Create a new application
 * 4. Copy your "Access Key" (you only need the Access Key, NOT the Secret)
 * 5. Create a .env file in the root directory (Bonded/.env)
 * 6. Add: EXPO_PUBLIC_UNSPLASH_ACCESS_KEY=your_access_key_here
 * 
 * Note: If you don't set up an API key, it will automatically use Picsum Photos
 * as a fallback (free, no API key needed, but less curated photos)
 */

// Get the API key from environment variables
// In Expo, environment variables with EXPO_PUBLIC_ prefix are available at build time
const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY || null

// Debug: Log if key is found (remove in production)
if (__DEV__) {
  console.log('Unsplash API Key loaded:', UNSPLASH_ACCESS_KEY ? `Yes (${UNSPLASH_ACCESS_KEY.substring(0, 10)}...)` : 'No (using fallback)')
  if (UNSPLASH_ACCESS_KEY) {
    console.log('Full key length:', UNSPLASH_ACCESS_KEY.length)
  }
}
const UNSPLASH_API_URL = 'https://api.unsplash.com'

// Session cache - stores photos for the current Expo session
// Cleared when app restarts
let photoCache = {
  urls: null,
  count: 0,
  timestamp: null,
}

// College-aged search terms for diverse, realistic photos
// Mix of general and diversity-focused terms to ensure representation
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
  'diverse college students',
  'black college student',
  'african american student',
  'black young adult',
  'diverse university students',
  'multicultural students',
  'college student portrait',
  'university student portrait',
  'young adult diverse',
  'student diversity',
  'black engineering student',
  'african american engineering student',
  'black male college student',
  'black engineering senior',
  'black male engineering student',
  'african american male student',
  'black senior college student',
  'engineering student portrait',
  'black male university student',
  'senior engineering student',
  'black male senior',
  'diverse engineering students',
]

/**
 * Fetch a random photo from Unsplash
 * @param {string} searchTerm - Search term for photo
 * @param {number} width - Desired width (default 400)
 * @param {number} height - Desired height (default 400)
 * @returns {Promise<string>} Photo URL
 */
export const fetchUnsplashPhoto = async (searchTerm = null, width = 400, height = 400) => {
  // If no API key is set, use fallback immediately
  if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY') {
    console.log('⚠️ No Unsplash API key found, using fallback')
    return getFallbackPhoto()
  }

  try {
    const term = searchTerm || SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)]
    
    // Correct Unsplash API format: client_id should be in query params, not w/h (those are for URL sizes)
    const url = `${UNSPLASH_API_URL}/photos/random?client_id=${UNSPLASH_ACCESS_KEY}&query=${encodeURIComponent(term)}&orientation=portrait`
    
    const response = await fetch(url, {
      headers: {
        'Accept-Version': 'v1',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`❌ Unsplash API failed (${response.status}):`, errorText.substring(0, 200))
      console.warn('API Key present:', UNSPLASH_ACCESS_KEY ? 'Yes' : 'No')
      return getFallbackPhoto()
    }

    const data = await response.json()
    // Use the appropriate size URL based on requested dimensions
    let imageUrl = data.urls?.regular || data.urls?.small || data.urls?.thumb
    
    // If we need specific dimensions, use Unsplash's URL parameters
    if (imageUrl && (width !== 400 || height !== 400)) {
      // Replace the size parameters in the URL if present, or append them
      imageUrl = imageUrl.split('?')[0] + `?w=${width}&h=${height}&fit=crop`
    }
    
    return imageUrl || getFallbackPhoto()
  } catch (error) {
    console.error('❌ Error fetching Unsplash photo:', error.message)
    console.error('Full error:', error)
    return getFallbackPhoto()
  }
}

/**
 * Fetch multiple photos at once
 * @param {number} count - Number of photos to fetch
 * @returns {Promise<string[]>} Array of photo URLs
 */
export const fetchMultiplePhotos = async (count = 10) => {
  // Check cache first - if we have enough cached photos, return them
  if (photoCache.urls && photoCache.urls.length >= count) {
    console.log(`✅ Using cached Unsplash photos (${photoCache.urls.length} available)`)
    return photoCache.urls.slice(0, count)
  }

  // If no API key is set, use fallback immediately
  if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY') {
    console.log('⚠️ No Unsplash API key found, using Picsum Photos fallback')
    const fallbackUrls = Array.from({ length: count }, (_, i) => getPhotoUrl(400, 400, `batch-${i}`))
    // Cache fallback URLs too
    photoCache = {
      urls: fallbackUrls,
      count: fallbackUrls.length,
      timestamp: Date.now(),
    }
    return fallbackUrls
  }

  // Fetch more photos than requested to fill cache (but cap at reasonable amount)
  const fetchCount = Math.max(count, 200) // Always fetch at least 200 for cache
  const MAX_PER_REQUEST = 30
  const batches = Math.ceil(fetchCount / MAX_PER_REQUEST)
  const allUrls = []

  try {
    console.log(`📸 Fetching ${fetchCount} photos from Unsplash (in ${batches} batches)...`)
    
    // Diverse search terms array - rotates through different terms to ensure diversity
    // Includes specific terms for black male engineering seniors
    const diverseSearchTerms = [
      'college student',
      'black college student',
      'black engineering student',
      'university student',
      'diverse college students',
      'young adult portrait',
      'african american student',
      'black male engineering student',
      'campus life',
      'multicultural students',
      'black engineering senior',
      'young professional',
      'black young adult',
      'african american engineering student',
      'student lifestyle',
      'college student portrait',
      'black male college student',
      'university student portrait',
      'diverse university students',
      'black male senior',
      'young person',
      'african american male student',
      'gen z portrait',
      'senior engineering student',
      'student diversity',
      'black senior college student',
      'young adult diverse',
      'engineering student portrait',
      'black male university student',
      'diverse engineering students',
    ]
    
    for (let i = 0; i < batches; i++) {
      const batchSize = i === batches - 1 ? fetchCount - (i * MAX_PER_REQUEST) : MAX_PER_REQUEST
      // Rotate through diverse search terms to ensure good mix
      const searchTerm = diverseSearchTerms[i % diverseSearchTerms.length]
      
      const response = await fetch(
        `${UNSPLASH_API_URL}/photos/random?client_id=${UNSPLASH_ACCESS_KEY}&count=${batchSize}&query=${encodeURIComponent(searchTerm)}&orientation=portrait`,
        {
          headers: {
            'Accept-Version': 'v1',
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.warn(`❌ Unsplash API batch ${i + 1} failed:`, response.status, errorText.substring(0, 100))
        // Fill this batch with fallback photos
        const fallbackUrls = Array.from({ length: batchSize }, (_, j) => 
          getPhotoUrl(400, 400, `batch-${i * MAX_PER_REQUEST + j}`)
        )
        allUrls.push(...fallbackUrls)
        continue
      }

      const data = await response.json()
      const batchUrls = data.map(photo => photo.urls?.regular || photo.urls?.small || getFallbackPhoto())
      allUrls.push(...batchUrls)
      
      // Small delay between batches to avoid rate limiting
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    // Cache the fetched photos
    photoCache = {
      urls: allUrls,
      count: allUrls.length,
      timestamp: Date.now(),
    }

    console.log(`✅ Successfully fetched and cached ${allUrls.length} photos from Unsplash`)
    return allUrls.slice(0, count) // Return only the requested count
  } catch (error) {
    console.error('❌ Error fetching multiple Unsplash photos:', error.message)
    const fallbackUrls = Array.from({ length: count }, (_, i) => getPhotoUrl(400, 400, `batch-${i}`))
    // Cache fallback URLs
    photoCache = {
      urls: fallbackUrls,
      count: fallbackUrls.length,
      timestamp: Date.now(),
    }
    return fallbackUrls
  }
}

/**
 * Clear the photo cache (useful for testing or forcing refresh)
 */
export const clearPhotoCache = () => {
  photoCache = {
    urls: null,
    count: 0,
    timestamp: null,
  }
  console.log('🗑️ Photo cache cleared')
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

