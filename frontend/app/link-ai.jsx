import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import AppHeader from '../components/AppHeader'
import { isFeatureEnabled } from '../utils/featureGates'
import { useAppTheme } from './theme'
import { hp, wp } from '../helpers/common'
import { queryLink } from '../services/linkService'
import { useAuthStore } from '../stores/authStore'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'

// Quick suggestion prompts
const QUICK_SUGGESTIONS = [
  "I'm looking for friends who golf",
  "I need a startup co-founder",
  "Show me tech clubs",
  "Find me a study buddy",
]

// Mock initial messages
const INITIAL_MESSAGES = [
  {
    id: '1',
    type: 'ai',
    content: "Hey! I'm Link, your AI assistant. I can help you connect with anyone on campus! 🎓\n\nJust tell me what you're looking for and I'll scan the whole school's database to find perfect matches.",
    timestamp: new Date(),
  },
]

export default function LinkAI() {
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const router = useRouter()
  const { user, session } = useAuthStore()
  const { data: currentUserProfile } = useCurrentUserProfile()
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const flatListRef = useRef(null)

  // Gate: Redirect if feature is disabled
  useEffect(() => {
    if (!isFeatureEnabled('LINK_AI')) {
      router.replace('/yearbook')
    }
  }, [router])

  useEffect(() => {
    // Scroll to bottom when new messages are added
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }, [messages])

  const normalizeLinkResponse = useCallback((payload) => {
    const message =
      payload?.message ||
      payload?.response ||
      payload?.text ||
      payload?.answer ||
      'Link is thinking...'

    const resultsPayload = payload?.results || payload?.matches || payload?.data?.results || null
    const explicitType = payload?.type || payload?.data?.type || null

    if (Array.isArray(resultsPayload) && explicitType) {
      return { message, data: { type: explicitType, results: resultsPayload } }
    }

    if (resultsPayload && typeof resultsPayload === 'object') {
      if (Array.isArray(resultsPayload.people)) {
        return { message, data: { type: 'people', results: resultsPayload.people } }
      }
      if (Array.isArray(resultsPayload.clubs)) {
        return { message, data: { type: 'clubs', results: resultsPayload.clubs } }
      }
      if (Array.isArray(resultsPayload.organizations)) {
        return { message, data: { type: 'clubs', results: resultsPayload.organizations } }
      }
    }

    return { message, data: null }
  }, [])

  const handleSend = useCallback(async (text) => {
    const messageText = text || inputText
    if (!messageText.trim()) return

    setShowSuggestions(false)

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText('')
    setIsTyping(true)

    try {
      const response = await queryLink(
        user?.id,
        messageText,
        currentUserProfile?.university_id,
        { access_token: session?.access_token }
      )

      const normalized = normalizeLinkResponse(response)
      setIsTyping(false)

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: normalized.message,
        data: normalized.data,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error('Failed to query Link:', error)
      setIsTyping(false)
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Link is unavailable right now. Please try again in a moment.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
    }
  }, [inputText, user?.id, currentUserProfile?.university_id, normalizeLinkResponse])

  const renderMessage = ({ item }) => {
    const isUser = item.type === 'user'

    return (
      <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={hp(2.5)} color={theme.colors.bondedPurple} />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.content}
          </Text>
          {item.data && item.data.results && (
            <View style={styles.resultsContainer}>
              {item.data.type === 'people' && item.data.results.map((person) => (
                <TouchableOpacity
                  key={person.id}
                  style={styles.resultCard}
                  onPress={() => {
                    // Navigate to profile or show profile modal
                  }}
                >
                  <Image source={{ uri: person.avatar }} style={styles.resultAvatar} />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{person.name}</Text>
                    <Text style={styles.resultMeta}>
                      {person.major} • {person.year}
                    </Text>
                    <Text style={styles.resultBio} numberOfLines={2}>
                      {person.bio}
                    </Text>
                    <View style={styles.groupjamBadge}>
                      <Ionicons name="heart" size={hp(1.4)} color={theme.colors.bondedPurple} />
                      <Text style={styles.groupjamText}>GroupJam: {person.groupjamScore}%</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.connectButton}>
                    <Text style={styles.connectButtonText}>Connect</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              {item.data.type === 'clubs' && item.data.results.map((club) => (
                <TouchableOpacity
                  key={club.id}
                  style={styles.clubCard}
                  onPress={() => router.push(`/clubs/${club.id}`)}
                >
                  <Image source={{ uri: club.image }} style={styles.clubImage} />
                  <View style={styles.clubInfo}>
                    <Text style={styles.clubName}>{club.name}</Text>
                    <Text style={styles.clubCategory}>{club.category}</Text>
                    <Text style={styles.clubDescription} numberOfLines={2}>
                      {club.description}
                    </Text>
                    <View style={styles.clubMeta}>
                      <Ionicons name="people" size={hp(1.4)} color={theme.colors.textSecondary} />
                      <Text style={styles.clubMembers}>{club.members} members</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {isUser && (
          <View style={styles.userAvatar}>
            <Image
              source={{
                uri: currentUserProfile?.avatar_url
                  || currentUserProfile?.avatarUrl
                  || 'https://randomuser.me/api/portraits/men/32.jpg',
              }}
              style={styles.userAvatarImage}
            />
          </View>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Link AI"
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              setMessages(INITIAL_MESSAGES)
              setShowSuggestions(true)
            }}
          >
            <Ionicons name="refresh-outline" size={hp(2.4)} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <FlatList
        ref={flatListRef}
        data={[...messages, ...(isTyping ? [{ id: 'typing', type: 'ai', content: '...', isTyping: true }] : [])]}
        renderItem={({ item }) => {
          if (item.isTyping) {
            return (
              <View style={[styles.messageContainer, styles.userMessageContainer]}>
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={hp(2.5)} color={theme.colors.bondedPurple} />
                </View>
                <View style={[styles.messageBubble, styles.aiBubble]}>
                  <View style={styles.typingIndicator}>
                    <View style={[styles.typingDot, { animationDelay: '0ms' }]} />
                    <View style={[styles.typingDot, { animationDelay: '150ms' }]} />
                    <View style={[styles.typingDot, { animationDelay: '300ms' }]} />
                  </View>
                </View>
              </View>
            )
          }
          return renderMessage({ item })
        }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          showSuggestions && messages.length === INITIAL_MESSAGES.length ? (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Try asking:</Text>
              <View style={styles.suggestionsList}>
                {QUICK_SUGGESTIONS.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => handleSend(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ask Link anything... (e.g., 'I'm looking for friends who golf')"
              placeholderTextColor={theme.colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || isTyping}
            >
              <Ionicons
                name="send"
                size={hp(2.2)}
                color={inputText.trim() ? theme.colors.white : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  messagesList: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(1),
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: hp(2),
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    flexDirection: 'row-reverse',
  },
  aiAvatar: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: theme.colors.bondedPurple + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
    marginTop: hp(0.5),
  },
  userAvatar: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    marginLeft: wp(2),
    marginTop: hp(0.5),
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: theme.radius.lg,
  },
  aiBubble: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  userBubble: {
    backgroundColor: theme.colors.bondedPurple,
  },
  messageText: {
    fontSize: hp(1.7),
    lineHeight: hp(2.4),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
  userMessageText: {
    color: theme.colors.white,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: wp(1.5),
    alignItems: 'center',
  },
  typingDot: {
    width: hp(0.8),
    height: hp(0.8),
    borderRadius: hp(0.4),
    backgroundColor: theme.colors.textSecondary,
    opacity: 0.4,
  },
  resultsContainer: {
    marginTop: hp(1.5),
    gap: hp(1.5),
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: wp(3),
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  resultAvatar: {
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    marginRight: wp(3),
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(0.3),
  },
  resultMeta: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginBottom: hp(0.5),
  },
  resultBio: {
    fontSize: hp(1.5),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    marginBottom: hp(0.5),
  },
  groupjamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    marginTop: hp(0.3),
  },
  groupjamText: {
    fontSize: hp(1.3),
    color: theme.colors.bondedPurple,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.body,
  },
  connectButton: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.md,
  },
  connectButtonText: {
    fontSize: hp(1.5),
    color: theme.colors.white,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.body,
  },
  clubCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clubImage: {
    width: '100%',
    height: hp(12),
  },
  clubInfo: {
    padding: wp(3),
  },
  clubName: {
    fontSize: hp(1.9),
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: hp(0.3),
  },
  clubCategory: {
    fontSize: hp(1.4),
    color: theme.colors.bondedPurple,
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily.body,
    marginBottom: hp(0.5),
  },
  clubDescription: {
    fontSize: hp(1.5),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    marginBottom: hp(0.5),
  },
  clubMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  clubMembers: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
  },
  inputContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.xl,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: wp(2),
  },
  input: {
    flex: 1,
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    maxHeight: hp(12),
    paddingVertical: hp(0.5),
  },
  sendButton: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  suggestionsContainer: {
    marginTop: hp(2),
    marginBottom: hp(1),
  },
  suggestionsTitle: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily.body,
    marginBottom: hp(1.5),
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  suggestionChip: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  suggestionText: {
    fontSize: hp(1.5),
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
  },
})
