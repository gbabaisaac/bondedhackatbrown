import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'

const EventsContext = createContext()

// Events now come from useEventsForUser hook - no mock data needed

export function EventsProvider({ children }) {
  // Check if user is authenticated
  const { user } = useAuthStore()
  
  // Initialize with empty events - will be populated if authenticated
  const [events, setEvents] = useState({})
  
  // User RSVPs: { eventId: 'going' | 'interested' | null }
  const [userRSVPs, setUserRSVPs] = useState({})
  
  // Forum posts for events: { forumId: [{ event post objects }] }
  const [eventForumPosts, setEventForumPosts] = useState({})
  
  // Only initialize mock events if user is authenticated (for now, until we fully migrate to useEvents hook)
  useEffect(() => {
    if (!user) {
      // User not authenticated - keep events empty
      return
    }
    
    // For now, initialize with empty events (migration to useEvents hook in progress)
    // const { events: initialEvents, forumPosts: initialForumPosts } = generateMockEvents()
    // setEvents(initialEvents)
    // setEventForumPosts(initialForumPosts)
  }, [user])

  // Helper to generate recurring event instances
  const generateRecurringEvents = (baseEvent, recurringType, recurringEndDate) => {
    const events = []
    const startDate = new Date(baseEvent.startDate)
    const endDate = new Date(baseEvent.endDate)
    const duration = endDate - startDate
    const endRecurringDate = new Date(recurringEndDate)
    
    let currentDate = new Date(startDate)
    let eventIndex = 0
    
    while (currentDate <= endRecurringDate) {
      const eventStart = new Date(currentDate)
      const eventEnd = new Date(eventStart.getTime() + duration)
      
      const recurringEvent = {
        ...baseEvent,
        id: `${baseEvent.id}-recurring-${eventIndex}`,
        startDate: eventStart.toISOString(),
        endDate: eventEnd.toISOString(),
        isRecurring: true,
        recurringType,
        recurringIndex: eventIndex,
        parentEventId: baseEvent.id,
      }
      
      events.push(recurringEvent)
      
      // Calculate next occurrence
      if (recurringType === 'daily') {
        currentDate.setDate(currentDate.getDate() + 1)
      } else if (recurringType === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7)
      } else if (recurringType === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
      
      eventIndex++
    }
    
    return events
  }

  // Create new event
  const createEvent = (eventData) => {
    const baseEventId = `event-${Date.now()}`
    const baseEvent = {
      ...eventData,
      id: baseEventId,
      createdAt: new Date().toISOString(),
      attendees: [],
      interested: [],
      comments: [],
    }
    
    const eventsToCreate = []
    
    // If recurring, generate all instances
    if (eventData.isRecurring && eventData.recurringType && eventData.recurringEndDate) {
      const recurringEvents = generateRecurringEvents(
        baseEvent,
        eventData.recurringType,
        eventData.recurringEndDate
      )
      eventsToCreate.push(...recurringEvents)
    } else {
      // Single event
      eventsToCreate.push(baseEvent)
    }
    
    // Add all events to state
    setEvents((prev) => {
      const updated = { ...prev }
      eventsToCreate.forEach((event) => {
        updated[event.id] = event
      })
      return updated
    })

    // Create forum posts if specified (only for first event or all if not recurring)
    if (eventData.postedToForums && eventData.postedToForums.length > 0) {
      eventData.postedToForums.forEach((forumId) => {
        setEventForumPosts((prev) => {
          const newPosts = eventsToCreate.map((event) => ({
            id: `event-post-${event.id}-${forumId}`,
            type: 'event',
            eventId: event.id,
            forumId,
            createdAt: event.createdAt,
          }))
          
          return {
            ...prev,
            [forumId]: [...newPosts, ...(prev[forumId] || [])],
          }
        })
      })
    }

    return baseEventId
  }

  // Get event by ID
  const getEvent = (eventId) => {
    return events[eventId] || null
  }

  // Get all events
  const getAllEvents = () => {
    return Object.values(events)
  }

  // Get events for a specific forum
  const getForumEventPosts = (forumId) => {
    const postIds = eventForumPosts[forumId] || []
    return postIds.map((post) => ({
      ...post,
      event: events[post.eventId],
    })).filter((post) => post.event) // Only return posts with valid events
  }

  // RSVP to event
  const rsvpToEvent = (eventId, userId, status) => {
    setEvents((prev) => {
      const event = prev[eventId]
      if (!event) return prev

      // Remove from both arrays first
      const attendees = (event.attendees || []).filter((id) => id !== userId)
      const interested = (event.interested || []).filter((id) => id !== userId)

      // Add to appropriate array
      if (status === 'going') {
        attendees.push(userId)
      } else if (status === 'interested') {
        interested.push(userId)
      }

      return {
        ...prev,
        [eventId]: {
          ...event,
          attendees,
          interested,
        },
      }
    })

    setUserRSVPs((prev) => ({
      ...prev,
      [eventId]: status,
    }))
  }

  // Get user's RSVP status
  const getUserRSVP = (eventId, userId) => {
    const event = events[eventId]
    if (!event) return null

    if ((event.attendees || []).includes(userId)) return 'going'
    if ((event.interested || []).includes(userId)) return 'interested'
    return null
  }

  // Get events user is attending
  const getUserEvents = (userId) => {
    return Object.values(events).filter((event) =>
      (event.attendees || []).includes(userId)
    )
  }

  // Delete event
  const deleteEvent = (eventId) => {
    setEvents((prev) => {
      const { [eventId]: deleted, ...rest } = prev
      return rest
    })

    // Remove forum posts
    setEventForumPosts((prev) => {
      const updated = { ...prev }
      Object.keys(updated).forEach((forumId) => {
        updated[forumId] = updated[forumId].filter(
          (post) => post.eventId !== eventId
        )
      })
      return updated
    })
  }

  return (
    <EventsContext.Provider
      value={{
        events,
        createEvent,
        getEvent,
        getAllEvents,
        getForumEventPosts,
        rsvpToEvent,
        getUserRSVP,
        getUserEvents,
        deleteEvent,
      }}
    >
      {children}
    </EventsContext.Provider>
  )
}

export const useEventsContext = () => {
  const context = useContext(EventsContext)
  if (!context) {
    throw new Error('useEventsContext must be used within EventsProvider')
  }
  return context
}

