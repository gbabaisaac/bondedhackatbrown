/**
 * Link AI Conversation Assistance
 * Provides AI-powered conversation help and suggestions
 */

// Mock AI responses - replace with actual AI service
export const getConversationSuggestions = async (conversationContext) => {
  const { messages, recipientInfo, conversationStage } = conversationContext

  // Analyze conversation stage
  if (messages.length === 0) {
    return {
      suggestions: [
        "Hey! How's your day going?",
        "I saw you're in [major]. That's awesome!",
        "Want to grab coffee sometime?",
      ],
      prompts: [
        "Start with a friendly greeting",
        "Mention something from their profile",
        "Suggest a casual meetup",
      ],
      tone: 'friendly',
    }
  }

  if (messages.length < 5) {
    return {
      suggestions: [
        "That sounds interesting! Tell me more.",
        "I'd love to hear about that.",
        "What do you think about [topic]?",
      ],
      prompts: [
        "Ask follow-up questions",
        "Show genuine interest",
        "Share your own experiences",
      ],
      tone: 'engaging',
    }
  }

  // Check if conversation is stalling
  const lastMessageTime = new Date(messages[messages.length - 1].created_at)
  const timeSinceLastMessage = Date.now() - lastMessageTime.getTime()
  
  if (timeSinceLastMessage > 24 * 60 * 60 * 1000) {
    return {
      suggestions: [
        "Hey! Hope you're doing well.",
        "Just checking in - how's everything?",
        "I was thinking about our conversation earlier...",
      ],
      prompts: [
        "Re-engage after a break",
        "Reference previous conversation",
        "Be casual and friendly",
      ],
      tone: 'reconnecting',
    }
  }

  return {
    suggestions: [],
    prompts: [],
    tone: 'neutral',
  }
}

// Get conversation quality score
export const analyzeConversationQuality = async (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      score: 0,
      feedback: 'Start the conversation to see insights.',
    }
  }

  const getText = (msg) => msg?.message_text || msg?.content || ''
  let score = 50 // Base score

  // Check for engagement
  const hasQuestions = messages.some((msg) => getText(msg).includes('?'))
  if (hasQuestions) score += 10

  // Check for balance (both parties contributing)
  const uniqueSenders = new Set(messages.map((msg) => msg.sender_id))
  if (uniqueSenders.size > 1) score += 15

  // Check for meaningful length
  const avgLength = messages.reduce((sum, msg) => sum + getText(msg).length, 0) / messages.length
  if (avgLength > 20) score += 10

  // Check for positive language
  const positiveWords = ['great', 'awesome', 'love', 'excited', 'happy', 'thanks']
  const hasPositive = messages.some((msg) =>
    positiveWords.some((word) => getText(msg).toLowerCase().includes(word))
  )
  if (hasPositive) score += 15

  return {
    score: Math.min(100, score),
    feedback: score > 70 ? 'Great conversation!' : score > 50 ? 'Good start!' : 'Keep engaging!',
  }
}

// Generate conversation starter based on profile
export const generateConversationStarter = async (recipientProfile) => {
  const starters = [
    `Hey ${recipientProfile.name}! I saw you're studying ${recipientProfile.major}. That's really cool!`,
    `Hi! I noticed we both like ${recipientProfile.interests?.[0] || 'similar things'}. Want to chat?`,
    `Hey! How's your semester going?`,
    `Hi there! I'd love to learn more about your interest in ${recipientProfile.interests?.[0] || 'your studies'}.`,
  ]

  return starters[Math.floor(Math.random() * starters.length)]
}











