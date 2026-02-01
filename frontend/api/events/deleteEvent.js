import { supabase } from '../../lib/supabase'

/**
 * Delete an event from the database
 * @param {string} eventId - The ID of the event to delete
 * @returns {Promise<Object>} The deleted event data
 */
export async function deleteEvent(eventId) {
  try {
    // First check if event exists and user has permission
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('organizer_id, org_id')
      .eq('id', eventId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch event: ${fetchError.message}`)
    }

    if (!event) {
      throw new Error('Event not found')
    }

    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is the organizer or admin of the org
    const isOrganizer = event.organizer_id === user.id
    const isOrgAdmin = event.org_id ? await checkOrgAdmin(user.id, event.org_id) : false
    
    if (!isOrganizer && !isOrgAdmin) {
      throw new Error('You do not have permission to delete this event')
    }

    // Delete the event
    const { data, error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) {
      throw new Error(`Failed to delete event: ${error.message}`)
    }

    console.log('Event deleted successfully')
    return data
  } catch (error) {
    console.error('Error deleting event:', error)
    throw error
  }
}

/**
 * Check if user is admin of an organization
 * @param {string} userId - User ID to check
 * @param {string} orgId - Organization ID to check
 * @returns {Promise<boolean>} True if user is admin of the org
 */
async function checkOrgAdmin(userId, orgId) {
  try {
    const { data, error } = await supabase
      .from('org_members')
      .select('role')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('role', 'admin')
      .single()

    if (error) {
      console.error('Error checking org admin status:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error checking org admin status:', error)
    return false
  }
}
