import { supabase } from '../../lib/supabase'

/**
 * Create a new event with ticket types and invites
 * This should be called from a Supabase Edge Function for transactional safety
 * For now, we'll do it client-side with proper error handling
 */
export async function createEvent(input) {
  const {
    // Event fields
    organizer_id,
    organizer_type = 'user',
    title,
    description,
    image_url,
    start_at,
    end_at,
    location_name,
    location_address,
    visibility = 'public',
    org_id,
    university_id,
    requires_approval = false,
    hide_guest_list = false,
    allow_sharing = true,
    is_paid = false,
    created_by,
    source = 'user',
    // Ticket types
    ticket_types = [],
    // Invites
    invites = [],
    // New fields
    type = 'event',
    sticker = null,
  } = input

  // Validate required fields
  if (!organizer_id || !title || !start_at || !end_at || !created_by || !university_id) {
    throw new Error('Missing required fields')
  }

  // Validate dates
  if (new Date(end_at) <= new Date(start_at)) {
    throw new Error('End date must be after start date')
  }

  // Start transaction by creating event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      organizer_id,
      organizer_type,
      title,
      description,
      image_url,
      start_at,
      end_at,
      location_name,
      location_address,
      visibility,
      org_id: org_id || null,
      university_id,
      requires_approval,
      hide_guest_list,
      allow_sharing,
      is_paid,
      created_by,
      source,
      type,
      sticker,
    })
    .select()
    .single()

  if (eventError) throw eventError

  // Create ticket types if provided
  if (ticket_types.length > 0 && is_paid) {
    const ticketTypesData = ticket_types.map((tt) => ({
      event_id: event.id,
      name: tt.name,
      price_cents: tt.price_cents || 0,
      currency: tt.currency || 'USD',
      quantity: tt.quantity || null,
      wallet_supported: tt.wallet_supported || false,
      description: tt.description || null,
    }))

    const { error: ticketError } = await supabase
      .from('event_ticket_types')
      .insert(ticketTypesData)

    if (ticketError) {
      // Rollback: delete the event
      await supabase.from('events').delete().eq('id', event.id)
      throw ticketError
    }
  }

  // Create initial attendance for host
  const { error: hostAttendanceError } = await supabase
    .from('event_attendance')
    .insert({
      event_id: event.id,
      user_id: organizer_id,
      status: 'going',
      is_host: true,
    })

  if (hostAttendanceError) {
    // Rollback: delete the event
    await supabase.from('events').delete().eq('id', event.id)
    throw hostAttendanceError
  }

  // Create invites if provided
  if (invites.length > 0) {
    const invitesData = invites.map((invite) => ({
      event_id: event.id,
      user_id: invite.user_id || null,
      role_scope: invite.role_scope || 'direct',
      org_role_id: invite.org_role_id || null,
      invited_by: created_by,
    }))

    const { error: invitesError } = await supabase
      .from('event_invites')
      .insert(invitesData)

    if (invitesError) {
      // Note: We don't rollback for invite errors, just log them
      console.warn('Failed to create some invites:', invitesError)
    }
  }

  return event
}
