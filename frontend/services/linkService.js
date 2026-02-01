/**
 * Link AI Service Client
 * Connects to the Link backend at link-ai-production.up.railway.app
 */

const LINK_API_URL = process.env.EXPO_PUBLIC_LINK_API_URL || 'https://link-ai-production.up.railway.app'

/**
 * Send a query to Link and get a response
 * @param {string} userId - The user's ID
 * @param {string} question - The question to ask Link
 * @param {string} universityId - The user's university ID
 * @returns {Promise<object>} Link's response
 */
export async function queryLink(userId, question, universityId, context = {}) {
  try {
    const payload = {
      user_id: userId,
      message_text: question,
      university_id: universityId,
      session_id: context.session_id || null,
      access_token: context.access_token || null,
    }

    if (context.preferred_name) {
      payload.preferred_name = context.preferred_name
    }

    const response = await fetch(`${LINK_API_URL}/link/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Link API error body:', text)
      throw new Error(`Link API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error querying Link:', error)
    throw error
  }
}

export async function collectLinkOutreach(runId, universityId, sessionId, accessToken) {
  try {
    const response = await fetch(`${LINK_API_URL}/link/outreach/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        run_id: runId,
        university_id: universityId,
        session_id: sessionId || null,
        access_token: accessToken || null,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Link collect error body:', text)
      throw new Error(`Link API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error collecting outreach:', error)
    throw error
  }
}

export async function resolveLinkConsent(payload) {
  try {
    const response = await fetch(`${LINK_API_URL}/link/consent/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Link API error body:', text)
      throw new Error(`Link API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error resolving consent:', error)
    throw error
  }
}

/**
 * Check Link service health
 * @returns {Promise<object>} Health status
 */
export async function checkLinkHealth() {
  try {
    const response = await fetch(`${LINK_API_URL}/health`)
    if (!response.ok) {
      const text = await response.text()
      console.error('Link API error body:', text)
      return { status: 'unhealthy', error: response.status }
    }
    return await response.json()
  } catch (error) {
    console.error('Error checking Link health:', error)
    return { status: 'unreachable', error: error.message }
  }
}

/**
 * Start an outreach request (Link asks campus for info)
 * @param {string} userId - The requesting user's ID  
 * @param {string} question - The question triggering outreach
 * @param {string} universityId - The university ID
 * @returns {Promise<object>} Outreach request details
 */
export async function startOutreach(userId, question, universityId) {
  try {
    const response = await fetch(`${LINK_API_URL}/outreach/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        question: question,
        university_id: universityId,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Link API error body:', text)
      throw new Error(`Link API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error starting outreach:', error)
    throw error
  }
}

/**
 * Get user's journal entries from Link
 * @param {string} userId - The user's ID
 * @param {number} days - Number of days to fetch (default 7)
 * @returns {Promise<object>} Journal entries
 */
export async function getLinkJournal(userId, days = 7) {
  try {
    const response = await fetch(`${LINK_API_URL}/journal/${userId}?days=${days}`)
    
    if (!response.ok) {
      const text = await response.text()
      console.error('Link API error body:', text)
      throw new Error(`Link API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching Link journal:', error)
    throw error
  }
}

/**
 * Learn user's communication style from a message
 * @param {string} userId - The user's ID
 * @param {string} message - The message to analyze
 * @returns {Promise<object>} Style analysis
 */
export async function learnUserStyle(userId, message) {
  try {
    const response = await fetch(`${LINK_API_URL}/style/learn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        message: message,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Link API error body:', text)
      throw new Error(`Link API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error learning user style:', error)
    // Non-critical, don't throw
    return null
  }
}

/**
 * Get user's style profile
 * @param {string} userId - The user's ID
 * @returns {Promise<object>} Style profile
 */
export async function getUserStyle(userId) {
  try {
    const response = await fetch(`${LINK_API_URL}/style/${userId}`)
    
    if (!response.ok) {
      const text = await response.text()
      console.error('Link API error body:', text)
      throw new Error(`Link API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching user style:', error)
    return null
  }
}

/**
 * Process a check-in response
 * @param {string} checkinId - The check-in ID
 * @param {string} userResponse - The user's response
 * @returns {Promise<object>} Processing result
 */
export async function respondToCheckin(checkinId, userResponse) {
  try {
    const response = await fetch(`${LINK_API_URL}/checkins/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkin_id: checkinId,
        user_response: userResponse,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Link API error body:', text)
      throw new Error(`Link API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error responding to checkin:', error)
    throw error
  }
}

export default {
  queryLink,
  checkLinkHealth,
  startOutreach,
  collectLinkOutreach,
  resolveLinkConsent,
  getLinkJournal,
  learnUserStyle,
  getUserStyle,
  respondToCheckin,
  LINK_API_URL,
}
