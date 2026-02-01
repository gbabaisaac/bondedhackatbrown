/**
 * School Events Service
 * Generic service for syncing events from external school event platforms
 * Works with any university's event system
 */

import { supabase } from '../lib/supabase'

/**
 * Scrape events from a school's external event platform
 * 
 * NOTE: This is a placeholder implementation.
 * Each school can configure their own event source URL and scraping logic.
 * 
 * @param {string} eventSourceUrl - The URL of the school's event platform
 * @returns {Promise<Array>} Array of event objects
 */
export async function scrapeSchoolEvents(eventSourceUrl) {
  try {
    // TODO: Implement actual scraping based on school's event platform
    // Option 1: If the school has an API
    // const response = await fetch(`${eventSourceUrl}/api/events`)
    // const events = await response.json()
    
    // Option 2: Web scraping (if no API)
    // Use a library like cheerio (Node.js) or puppeteer
    // Example:
    // const response = await fetch(eventSourceUrl)
    // const html = await response.text()
    // Parse HTML to extract events
    
    // PLACEHOLDER: Sample events structure
    // Replace this with actual scraping logic
    const events = [
      {
        title: 'Basketball Game',
        description: 'Come support our team!',
        startDate: new Date('2024-12-15T19:00:00'),
        endDate: new Date('2024-12-15T21:00:00'),
        location: 'Sports Center',
        externalUrl: `${eventSourceUrl}/events/12345`,
        category: 'sports',
        imageUrl: null
      }
    ]
    
    return events
  } catch (error) {
    console.error('Error scraping school events:', error)
    return []
  }
}

/**
 * Create events in Bonded from scraped school events
 * 
 * @param {string} userId - User ID of the organizer (founder/admin)
 * @param {string} universityId - University ID
 * @param {string} eventSourceUrl - Optional: URL of the event source
 * @returns {Promise<Array>} Array of created event objects
 */
export async function seedSchoolEvents(userId, universityId, eventSourceUrl = null) {
  if (!userId || !universityId) {
    throw new Error('userId and universityId are required')
  }
  
  const scrapedEvents = await scrapeSchoolEvents(eventSourceUrl)
  
  if (scrapedEvents.length === 0) {
    console.warn('No events scraped from school event platform')
    return []
  }
  
  const createdEvents = []
  
  for (const event of scrapedEvents) {
    try {
      // Check if event already exists (by title, start date, and university)
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('title', event.title)
        .eq('start_at', event.startDate.toISOString())
        .eq('university_id', universityId)
        .limit(1)
        .single()
      
      if (existing) {
        console.log(`Event already exists: ${event.title}`)
        continue
      }
      
      // Create event in Bonded
      const { data, error } = await supabase
        .from('events')
        .insert({
          organizer_id: userId,
          title: event.title,
          description: event.externalUrl 
            ? `${event.description}\n\n[View on School Events](${event.externalUrl})`
            : event.description,
          start_at: event.startDate.toISOString(),
          end_at: event.endDate.toISOString(),
          location_name: event.location,
          visibility: 'public',
          university_id: universityId,
          created_by: userId,
          source: 'school_sync',
        })
        .select()
        .single()
      
      if (error) {
        console.error(`Error creating event "${event.title}":`, error)
        continue
      }
      
      createdEvents.push(data)
      console.log(`Created event: ${event.title}`)
    } catch (error) {
      console.error(`Error processing event "${event.title}":`, error)
    }
  }
  
  return createdEvents
}

/**
 * Manual function to run event seeding for a specific university
 * Call this from a script or admin panel
 * 
 * @param {string} universityDomain - University domain (e.g., 'uri.edu', 'mit.edu')
 * @param {string} eventSourceUrl - Optional: URL of the school's event platform
 */
export async function runSchoolEventsSeeding(universityDomain, eventSourceUrl = null) {
  try {
    // Get university by domain
    const { data: university } = await supabase
      .from('universities')
      .select('id')
      .eq('domain', universityDomain)
      .single()
    
    if (!university) {
      throw new Error(`University with domain ${universityDomain} not found`)
    }
    
    // Get system/admin user for this university
    const { data: adminUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('university_id', university.id)
      .limit(1)
      .single()
    
    if (!adminUser) {
      throw new Error('Admin user not found for this university')
    }
    
    const events = await seedSchoolEvents(adminUser.id, university.id, eventSourceUrl)
    
    console.log(`Successfully seeded ${events.length} events for ${universityDomain}`)
    return events
  } catch (error) {
    console.error('Error running school events seeding:', error)
    throw error
  }
}


