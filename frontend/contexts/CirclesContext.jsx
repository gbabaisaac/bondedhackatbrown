import React, { createContext, useState, useContext, useEffect } from 'react'

const CirclesContext = createContext()

// Topic categories by day of week
const TOPIC_CATEGORIES = {
  0: 'Deep Thoughts', // Sunday
  1: 'Hot Takes', // Monday
  2: 'Campus Life', // Tuesday
  3: 'Personal Stories', // Wednesday
  4: 'Random & Fun', // Thursday
  5: 'Weekend Plans', // Friday
  6: 'Chill Vibes', // Saturday
}

// Sample topics for each category
const SAMPLE_TOPICS = {
  'Hot Takes': [
    { text: "What's your most controversial food opinion?", subtitle: "Hot takes only 🌶️" },
    { text: "What popular thing do you secretly hate?", subtitle: "No judgment zone" },
    { text: "Which movie is overrated?", subtitle: "Film critics only 🎬" },
    { text: "What's a hill you're willing to die on?", subtitle: "Stand your ground" },
    { text: "What's your most controversial music opinion?", subtitle: "Music takes 🎵" },
  ],
  'Campus Life': [
    { text: "What's the most awkward thing that happened to you on campus?", subtitle: "Cringe stories welcome" },
    { text: "Best and worst dining hall foods?", subtitle: "Rate your dining experience" },
    { text: "If you could change one thing about your school...", subtitle: "Dream changes" },
    { text: "What's your campus conspiracy theory?", subtitle: "Spill the tea ☕" },
    { text: "Rate your dorm experience 1-10 and explain", subtitle: "Dorm life reviews" },
  ],
  'Personal Stories': [
    { text: "What's the craziest thing you did in high school?", subtitle: "No regrets" },
    { text: "Tell us about your worst first date", subtitle: "Dating horror stories 💔" },
    { text: "Most embarrassing moment in college so far?", subtitle: "Share the cringe" },
    { text: "What's something you're secretly proud of?", subtitle: "Humble brags allowed" },
    { text: "When did you realize you were an adult?", subtitle: "Growing up moments" },
  ],
  'Random & Fun': [
    { text: "If you could have dinner with any person (dead or alive)...", subtitle: "Dream dinner party" },
    { text: "What superpower would you choose and why?", subtitle: "Pick your power 🦸" },
    { text: "You have $1M but can only spend it on one category. What is it?", subtitle: "Money talks 💰" },
    { text: "What's a skill you wish you learned earlier?", subtitle: "Life lessons" },
    { text: "Desert island: 3 items you bring?", subtitle: "Survival mode 🏝️" },
  ],
  'Weekend Plans': [
    { text: "What's everyone doing this weekend?", subtitle: "Share your plans" },
    { text: "Best party you've been to at school?", subtitle: "Party stories 🎉" },
    { text: "Where's the move tonight?", subtitle: "Friday night plans" },
    { text: "Anyone doing anything interesting this break?", subtitle: "Break plans" },
    { text: "Share your weekend plans and rate them 1-10", subtitle: "How excited are you?" },
  ],
  'Chill Vibes': [
    { text: "What are you binge-watching right now?", subtitle: "Show recommendations 📺" },
    { text: "Best concert you've been to?", subtitle: "Live music stories 🎸" },
    { text: "What song is stuck in your head?", subtitle: "Earworm alert 🎵" },
    { text: "Recommend something: Book, show, album, anything", subtitle: "Share your favorites" },
    { text: "What's making you happy this week?", subtitle: "Good vibes only ✨" },
  ],
  'Deep Thoughts': [
    { text: "What's something you believed in college that changed?", subtitle: "Growth moments" },
    { text: "What advice would you give your freshman self?", subtitle: "Hindsight wisdom" },
    { text: "What are you most worried about after graduation?", subtitle: "Real talk" },
    { text: "When did you figure out what you wanted to do?", subtitle: "Career thoughts" },
    { text: "What's the meaning of life? (Seriously)", subtitle: "Philosophy time 🤔" },
  ],
}

// Generate today's topic based on date
function generateDailyTopic() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const category = TOPIC_CATEGORIES[dayOfWeek]

  // Use date to deterministically pick a topic (same topic for all users on same day)
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24)
  const topics = SAMPLE_TOPICS[category]
  const topicIndex = dayOfYear % topics.length

  const topic = topics[topicIndex]

  return {
    id: `topic-${today.toISOString().split('T')[0]}`,
    date: today.toISOString().split('T')[0],
    category,
    topic: topic.text,
    subtitle: topic.subtitle,
    releaseTime: '19:00', // 7 PM
    endTime: '23:59', // 11:59 PM
    rooms: [],
  }
}

export function CirclesProvider({ children }) {
  const [dailyTopic, setDailyTopic] = useState(generateDailyTopic())
  const [userViewpoints, setUserViewpoints] = useState({})
  const [circleStats, setCircleStats] = useState({
    totalParticipants: 0,
    activeRooms: 0,
    totalViewpointChanges: 0,
  })

  // Mock data for demonstration
  useEffect(() => {
    // Generate mock active rooms
    const mockRooms = [
      {
        id: 'room-1',
        participants: 42,
        maxParticipants: 50,
        status: 'open',
        speakers: [
          { id: 'speaker-1', name: 'Sarah', isAnonymous: false, timeRemaining: 45 },
          { id: 'speaker-2', name: 'Anon', isAnonymous: true, timeRemaining: 62 },
          { id: 'speaker-3', name: 'Mike', isAnonymous: false, timeRemaining: 15 },
        ],
        listeners: 39,
      },
      {
        id: 'room-2',
        participants: 50,
        maxParticipants: 50,
        status: 'full',
        speakers: [],
        listeners: 50,
      },
      {
        id: 'room-3',
        participants: 28,
        maxParticipants: 50,
        status: 'open',
        speakers: [],
        listeners: 28,
      },
    ]

    setDailyTopic(prev => ({
      ...prev,
      rooms: mockRooms,
    }))

    setCircleStats({
      totalParticipants: mockRooms.reduce((sum, room) => sum + room.participants, 0),
      activeRooms: mockRooms.filter(r => r.status === 'open').length,
      totalViewpointChanges: 89,
    })
  }, [])

  // Submit pre-answer before joining
  const submitPreAnswer = (answer, confidence = 50) => {
    const viewpoint = {
      id: `viewpoint-${Date.now()}`,
      circleId: dailyTopic.id,
      topic: dailyTopic.topic,
      initial: {
        answer,
        confidence,
        timestamp: new Date().toISOString(),
      },
      updates: [],
      final: null,
      metrics: {
        totalUpdates: 0,
        confidenceDelta: 0,
        timeInCircle: 0,
      },
    }

    setUserViewpoints(prev => ({
      ...prev,
      [dailyTopic.id]: viewpoint,
    }))

    return viewpoint.id
  }

  // Update viewpoint during circle
  const updateViewpoint = (viewpointId, newAnswer, newConfidence, reason = null) => {
    setUserViewpoints(prev => {
      const viewpoint = prev[dailyTopic.id]
      if (!viewpoint) return prev

      const previousConfidence = viewpoint.updates.length > 0
        ? viewpoint.updates[viewpoint.updates.length - 1].confidence
        : viewpoint.initial.confidence

      const update = {
        answer: newAnswer,
        confidence: newConfidence,
        timestamp: new Date().toISOString(),
        reasonForChange: reason,
        confidenceDelta: newConfidence - previousConfidence,
      }

      const updatedViewpoint = {
        ...viewpoint,
        updates: [...viewpoint.updates, update],
        metrics: {
          ...viewpoint.metrics,
          totalUpdates: viewpoint.updates.length + 1,
          confidenceDelta: newConfidence - viewpoint.initial.confidence,
        },
      }

      return {
        ...prev,
        [dailyTopic.id]: updatedViewpoint,
      }
    })
  }

  // Finalize viewpoint when leaving circle
  const finalizeViewpoint = (finalAnswer, finalConfidence) => {
    setUserViewpoints(prev => {
      const viewpoint = prev[dailyTopic.id]
      if (!viewpoint) return prev

      return {
        ...prev,
        [dailyTopic.id]: {
          ...viewpoint,
          final: {
            answer: finalAnswer,
            confidence: finalConfidence,
            timestamp: new Date().toISOString(),
          },
        },
      }
    })
  }

  // Get current user's viewpoint for today's circle
  const getCurrentViewpoint = () => {
    return userViewpoints[dailyTopic.id] || null
  }

  // Join a circle (find available room or create new one)
  const joinCircle = (isAnonymous = false) => {
    const viewpoint = getCurrentViewpoint()
    if (!viewpoint) {
      throw new Error('Must submit pre-answer before joining')
    }

    // Find available room
    let availableRoom = dailyTopic.rooms.find(r =>
      r.participants < r.maxParticipants && r.status === 'open'
    )

    // Create new room if needed
    if (!availableRoom) {
      availableRoom = {
        id: `room-${dailyTopic.rooms.length + 1}`,
        participants: 0,
        maxParticipants: 50,
        status: 'open',
        speakers: [],
        listeners: 0,
      }

      setDailyTopic(prev => ({
        ...prev,
        rooms: [...prev.rooms, availableRoom],
      }))
    }

    return {
      roomId: availableRoom.id,
      roomNumber: dailyTopic.rooms.indexOf(availableRoom) + 1,
      totalRooms: dailyTopic.rooms.length,
    }
  }

  // Get yesterday's insights
  const getYesterdayInsights = () => {
    // Mock data for now
    return {
      totalParticipants: 247,
      viewpointChanges: 89,
      changePercentage: 36,
      biggestShifts: [
        { from: '"Pizza is overrated"', to: '"Pizza is amazing"', count: 23 },
        { from: '"Milk before cereal"', to: '"Cereal before milk"', count: 18 },
        { from: '"Sushi is gross"', to: '"Sushi is ok"', count: 15 },
      ],
      mostPersuasive: [
        { name: 'Sarah Chen', influenced: 12 },
        { name: 'Anon', influenced: 9 },
        { name: 'Mike Johnson', influenced: 7 },
      ],
    }
  }

  return (
    <CirclesContext.Provider
      value={{
        dailyTopic,
        circleStats,
        submitPreAnswer,
        updateViewpoint,
        finalizeViewpoint,
        getCurrentViewpoint,
        joinCircle,
        getYesterdayInsights,
        userViewpoints,
      }}
    >
      {children}
    </CirclesContext.Provider>
  )
}

export const useCirclesContext = () => {
  const context = useContext(CirclesContext)
  if (!context) {
    throw new Error('useCirclesContext must be used within CirclesProvider')
  }
  return context
}
