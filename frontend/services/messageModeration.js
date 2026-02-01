/**
 * Message Moderation Service
 * Provides AI-powered content moderation for messages
 */

// Basic moderation - replace with actual AI service (OpenAI, Perspective API, etc.)
export const moderateMessage = async (text, options = {}) => {
  const {
    checkHateSpeech = true,
    checkThreats = true,
    checkHarassment = true,
    checkExplicit = true,
  } = options

  const lowerText = text.toLowerCase()

  // Hate speech detection (basic keyword matching)
  if (checkHateSpeech) {
    const hateSpeechPatterns = [
      /\b(kill|die|hate|stupid|idiot|moron)\b/gi,
      // Add more patterns
    ]
    
    const hasHateSpeech = hateSpeechPatterns.some((pattern) => pattern.test(text))
    if (hasHateSpeech) {
      return {
        allowed: false,
        reason: 'Your message contains language that may be offensive.',
        severity: 'high',
        category: 'hate_speech',
      }
    }
  }

  // Threat detection
  if (checkThreats) {
    const threatPatterns = [
      /\b(harm|hurt|attack|threat|violence)\b/gi,
      // Add more patterns
    ]
    
    const hasThreat = threatPatterns.some((pattern) => pattern.test(text))
    if (hasThreat) {
      return {
        allowed: false,
        reason: 'Your message contains threatening language.',
        severity: 'high',
        category: 'threat',
      }
    }
  }

  // Harassment detection (repeated messages, excessive caps, etc.)
  if (checkHarassment) {
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length
    if (capsRatio > 0.7 && text.length > 10) {
      return {
        allowed: false,
        reason: 'Please avoid using excessive capitalization.',
        severity: 'low',
        category: 'harassment',
      }
    }
  }

  // Explicit content detection (basic)
  if (checkExplicit) {
    const explicitPatterns = [
      /\b(nsfw|explicit|adult)\b/gi,
      // Add more patterns
    ]
    
    const hasExplicit = explicitPatterns.some((pattern) => pattern.test(text))
    if (hasExplicit) {
      return {
        allowed: false,
        reason: 'Your message contains inappropriate content.',
        severity: 'medium',
        category: 'explicit',
      }
    }
  }

  // All checks passed
  return {
    allowed: true,
    reason: null,
    severity: 'low',
    category: null,
  }
}

// Check for red flags in conversation patterns
export const detectRedFlags = async (messages, currentUserId) => {
  const redFlags = []

  // Check for excessive messaging
  const recentMessages = messages.filter(
    (msg) => msg.sender_id === currentUserId && 
    new Date(msg.created_at) > new Date(Date.now() - 60000) // Last minute
  )
  
  if (recentMessages.length > 10) {
    redFlags.push({
      type: 'excessive_messaging',
      severity: 'medium',
      message: 'You\'re sending messages too quickly. Please slow down.',
    })
  }

  // Check for one-sided conversations
  const userMessages = messages.filter((msg) => msg.sender_id === currentUserId)
  const otherMessages = messages.filter((msg) => msg.sender_id !== currentUserId)
  
  if (userMessages.length > 5 && otherMessages.length === 0) {
    redFlags.push({
      type: 'one_sided',
      severity: 'low',
      message: 'The other person hasn\'t responded yet. Consider waiting for a reply.',
    })
  }

  return redFlags
}












