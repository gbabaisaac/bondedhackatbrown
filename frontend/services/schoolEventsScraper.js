/**
 * School Events Scraper
 * Generic scraper for syncing events from external school event platforms
 * Works with any university's event system
 * 
 * Features:
 * - Fetches events with description, date, time, location, organization
 * - Matches organizations to Bonded clubs
 * - Deduplicates (skips if event already exists)
 * - Can run weekly/continuously
 * 
 * Usage:
 * - Run manually: await syncSchoolEvents(universityDomain, eventSourceUrl)
 * - Set up cron/scheduled job to run weekly per university
 */

import { supabase } from '../lib/supabase'

/**
 * Scrape events from a school's external event platform
 * Returns array of event objects
 * 
 * @param {string} eventSourceUrl - The URL of the school's event platform
 * @returns {Promise<Array>} Array of event objects
 * 
 * Note: This is a placeholder - you'll need to inspect the actual HTML structure
 * and implement parsing based on how the school's platform displays events
 */
export async function scrapeSchoolEvents(eventSourceUrl) {
  if (!eventSourceUrl) {
    console.warn('⚠️  No event source URL provided')
    return []
  }

  try {
    // Fetch the events page
    const response = await fetch(eventSourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BondedApp/1.0)',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch school events: ${response.statusText}`)
    }

    const html = await response.text()
    
    // Parse HTML to extract events
    // TODO: Implement based on actual HTML structure
    // You may need to use a library like:
    // - node-html-parser (for Node.js)
    // - Or use a headless browser like Puppeteer if the page is JS-rendered
    const events = parseEventsFromHTML(html)
    
    console.log(`✅ Scraped ${events.length} events from school platform`)
    return events
  } catch (error) {
    console.error('❌ Error scraping school events:', error)
    throw error
  }
}

/**
 * Parse events from HTML
 * 
 * INSTRUCTIONS:
 * 1. Inspect the school's event platform in browser
 * 2. Identify the HTML structure (event cards, selectors, etc.)
 * 3. Update this function to extract:
 *    - title
 *    - description
 *    - date/time (start_at, end_at)
 *    - location (location_name, location_address)
 *    - organization/club name
 *    - URL to full event page
 * 
 * Example structure (adjust based on actual page):
 * <div class="event-card">
 *   <h3>Event Title</h3>
 *   <p>Description...</p>
 *   <span>Date: Dec 20, 2024</span>
 *   <span>Time: 7:00 PM</span>
 *   <span>Location: Student Center</span>
 *   <span>Organization: CS Club</span>
 *   <a href="/events/12345">View Details</a>
 * </div>
 */
function parseEventsFromHTML(html) {
  const events = []
  
  // PLACEHOLDER: Implement actual parsing
  // You can use regex, DOM parsing, or a library like node-html-parser
  
  // Example using regex (adjust based on actual HTML):
  // const eventMatches = html.match(/<div class="event-card">[\s\S]*?<\/div>/g)
  // eventMatches?.forEach(match => {
  //   const title = extractTitle(match)
  //   const date = extractDate(match)
  //   // ... etc
  // })
  
  // For now, return empty array - implement based on actual page structure
  console.warn('⚠️  parseEventsFromHTML not implemented - inspect school event platform HTML structure first')
  return events
}

/**
 * Match organization name to Bonded club
 * Returns club ID if found, null otherwise
 * 
 * @param {string} orgName - Organization name from external platform
 * @param {string} universityId - University ID to search within
 * @returns {Promise<string|null>} Club ID or null
 */
export async function matchOrganizationToClub(orgName, universityId) {
  if (!orgName) return null

  try {
    // Search for club by name (case-insensitive, partial match) within university
    const { data: clubs, error } = await supabase
      .from('orgs')
      .select('id, name')
      .eq('university_id', universityId)
      .ilike('name', `%${orgName.trim()}%`)
      .limit(1)

    if (error) {
      console.error('Error matching organization to club:', error)
      return null
    }

    if (clubs && clubs.length > 0) {
      console.log(`✅ Matched "${orgName}" to club: ${clubs[0].name} (${clubs[0].id})`)
      return clubs[0].id
    }

    return null
  } catch (error) {
    console.error('Error in matchOrganizationToClub:', error)
    return null
  }
}

/**
 * Check if event already exists in database
 * Uses title + start_at + university_id as unique identifier
 * 
 * @param {string} title - Event title
 * @param {string} startAt - Event start time (ISO string)
 * @param {string} universityId - University ID
 * @returns {Promise<boolean>} True if event exists
 */
export async function eventExists(title, startAt, universityId) {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .eq('title', title.trim())
      .eq('start_at', startAt)
      .eq('university_id', universityId)
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking if event exists:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error in eventExists:', error)
    return false
  }
}

/**
 * Save scraped event to database
 * Links to club if organization matches
 * 
 * @param {Object} event - Event object from scraper
 * @param {string} universityId - University ID
 * @param {string} systemUserId - System user ID for organizer
 * @returns {Promise<Object|null>} Created event or null if duplicate
 */
export async function saveScrapedEvent(event, universityId, systemUserId) {
  try {
    // Check if event already exists
    const exists = await eventExists(event.title, event.start_at, universityId)
    if (exists) {
      console.log(`⏭️  Skipping duplicate event: ${event.title}`)
      return null
    }

    // Try to match organization to club
    let orgId = null
    if (event.organization) {
      orgId = await matchOrganizationToClub(event.organization, universityId)
    }

    // Prepare event data
    const eventData = {
      organizer_id: systemUserId,
      organizer_type: orgId ? 'org' : 'user',
      title: event.title.trim(),
      description: event.description 
        ? `${event.description}\n\n[View on School Events](${event.externalUrl || ''})`
        : `Learn more: ${event.externalUrl || ''}`,
      start_at: event.start_at,
      end_at: event.end_at || event.start_at, // Use start_at if no end_at
      location_name: event.location,
      location_address: event.location_address || event.location,
      visibility: 'public', // School-synced events are public
      org_id: orgId, // Link to club if matched
      university_id: universityId, // Required: filter by university
      created_by: systemUserId,
      source: 'school_sync',
      // Store external organizer info if available
      external_organizer_name: event.organization || null,
      external_organizer_logo: event.imageUrl || null,
    }

    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()

    if (error) {
      console.error('Error saving event:', error)
      throw error
    }

    console.log(`✅ Saved event: ${event.title}${orgId ? ` (linked to club)` : ''}`)
    return data
  } catch (error) {
    console.error('Error in saveScrapedEvent:', error)
    throw error
  }
}

/**
 * Sync all events from a school's external event platform
 * Main function to run weekly/continuously per university
 * 
 * @param {string} universityDomain - University domain (e.g., 'uri.edu', 'mit.edu')
 * @param {string} eventSourceUrl - URL of the school's event platform
 * @returns {Promise<Object>} { synced: number, skipped: number, errors: number }
 */
export async function syncSchoolEvents(universityDomain, eventSourceUrl) {
  try {
    console.log(`🔄 Starting school events sync for ${universityDomain}...`)

    // Get university by domain
    const { data: university, error: uniError } = await supabase
      .from('universities')
      .select('id')
      .eq('domain', universityDomain)
      .single()

    if (uniError || !university) {
      throw new Error(`University with domain ${universityDomain} not found in database`)
    }

    // Get system user (first user from this university)
    const { data: systemUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('university_id', university.id)
      .limit(1)
      .single()

    if (userError || !systemUser) {
      throw new Error('System user not found - need at least one user in database')
    }

    // Scrape events
    const scrapedEvents = await scrapeSchoolEvents(eventSourceUrl)

    if (scrapedEvents.length === 0) {
      console.log('ℹ️  No events found to sync')
      return { synced: 0, skipped: 0, errors: 0 }
    }

    // Save each event
    let synced = 0
    let skipped = 0
    let errors = 0

    for (const event of scrapedEvents) {
      try {
        const saved = await saveScrapedEvent(event, university.id, systemUser.id)
        if (saved) {
          synced++
        } else {
          skipped++
        }
      } catch (error) {
        console.error(`❌ Error saving event "${event.title}":`, error)
        errors++
      }
    }

    console.log(`✅ Sync complete: ${synced} synced, ${skipped} skipped, ${errors} errors`)
    return { synced, skipped, errors }
  } catch (error) {
    console.error('❌ Error in syncSchoolEvents:', error)
    throw error
  }
}

/**
 * Helper to format date from school event platform format
 * Adjust based on actual date format from the platform
 * 
 * @param {string} dateString - Date string from platform
 * @param {string} timeString - Time string from platform
 * @returns {string} ISO date string
 */
export function parseSchoolDate(dateString, timeString) {
  try {
    // Example formats to handle:
    // "December 17, 2024" + "7:00 PM"
    // "12/17/2024" + "19:00"
    // Adjust parsing logic based on actual format
    
    const date = new Date(`${dateString} ${timeString}`)
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date')
    }
    return date.toISOString()
  } catch (error) {
    console.error('Error parsing date:', error, { dateString, timeString })
    return new Date().toISOString()
  }
}


