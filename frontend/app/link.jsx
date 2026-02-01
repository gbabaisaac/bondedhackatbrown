/**
 * Link AI Chat Screen
 * Dedicated chat interface for talking with Link
 */

import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import RichMessagePreview from '../components/Message/RichMessagePreview'
// Custom Text component removed to force system font mapping bypass
import { hp, wp } from '../helpers/common'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'
import { useLinkConversation, useLinkMessages, useLinkMessagesRealtime, useLinkSystemProfile, useSendLinkMessage } from '../hooks/useLinkChat'
import { supabase } from '../lib/supabase'
import { collectLinkOutreach, learnUserStyle, queryLink, resolveLinkConsent } from '../services/linkService'
import { useAuthStore } from '../stores/authStore'
import { useAppTheme } from './theme'

const LINK_LOGO = require('../assets/images/transparent-bonded.png')

export default function LinkChat() {
  const router = useRouter()
  const theme = useAppTheme()
  const styles = createStyles(theme)
  const { user, session } = useAuthStore()
  const { data: currentUserProfile } = useCurrentUserProfile()
  const { data: linkProfile, isLoading: linkProfileLoading } = useLinkSystemProfile()
  const { data: conversation, isLoading: conversationLoading } = useLinkConversation()
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const { data: messagesData, isLoading: messagesLoading, fetchNextPage, hasNextPage } = useLinkMessages(conversation?.id)
  const sendMessage = useSendLinkMessage()

  // Subscribe to realtime Link message updates
  useLinkMessagesRealtime(conversation?.id, currentSessionId)

  const [inputText, setInputText] = useState('')
  const [isLinkTyping, setIsLinkTyping] = useState(false)
  const [localMessages, setLocalMessages] = useState([])
  const [linkMemory, setLinkMemory] = useState(null)
  const [isAwaitingPreferredName, setIsAwaitingPreferredName] = useState(false)
  const [introInjected, setIntroInjected] = useState(false)
  const [outreachRunId, setOutreachRunId] = useState(null)
  const [isCollectingOutreach, setIsCollectingOutreach] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [consentLoading, setConsentLoading] = useState({})
  const flatListRef = useRef(null)

  // Flatten messages from infinite query
  const messages = useMemo(() => {
    if (!messagesData?.pages) return []
    return messagesData.pages.flatMap(page => page.messages || [])
  }, [messagesData])

  const mergedMessages = useMemo(() => {
    // Combine DB messages with local messages
    const combined = [...messages, ...localMessages]

    // First, dedupe by ID
    const seenIds = new Set()
    const dedupedByUniqueId = combined.filter((message) => {
      if (!message?.id) return true
      if (seenIds.has(message.id)) return false
      seenIds.add(message.id)
      return true
    })

    // Sort by created_at (descending - newest first for inverted list)
    const sorted = dedupedByUniqueId.sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime()
      const bTime = new Date(b.created_at || 0).getTime()
      if (bTime !== aTime) return bTime - aTime
      // Tie-breaker for stable sorting
      return String(b.id || '').localeCompare(String(a.id || ''))
    })

    // Phase 1: Remove local messages if a matching DB message exists (optimistic UI cleanup)
    const finalLocalDeduped = sorted.filter((message, index, arr) => {
      if (!message?.id?.startsWith('local-')) return true

      const content = (message.content || '').trim()
      if (!content) return true

      const isOptimisticUser = message.id.startsWith('local-user-')
      const isOptimisticLink = message.id.startsWith('local-link-')

      const hasMatchingDbMessage = arr.some((other) => {
        if (other.id?.startsWith('local-')) return false
        const typeMatch = (isOptimisticUser && other.sender_type === 'user') ||
          (isOptimisticLink && other.sender_type === 'link')
        return typeMatch && (other.content || '').trim() === content
      })

      return !hasMatchingDbMessage
    })

    // Phase 2: Remove identical consecutive messages (handles historical DB duplicates)
    return finalLocalDeduped.filter((message, index, arr) => {
      if (index === 0) return true
      const prev = arr[index - 1]
      const timeDiff = Math.abs(new Date(message.created_at).getTime() - new Date(prev.created_at).getTime())
      const isDuplicate = message.sender_type === prev.sender_type &&
        (message.content || '').trim() === (prev.content || '').trim() &&
        timeDiff < 2000 // Within 2 seconds
      return !isDuplicate
    })
  }, [messages, localMessages])

  const latestOutreach = useMemo(() => {
    // In inverted list, newest are at the start
    for (let i = 0; i < mergedMessages.length; i += 1) {
      const message = mergedMessages[i]
      if (message?.sender_type !== 'link') continue
      const metadata = message?.metadata || {}
      const runId = metadata.run_id || metadata.runId || metadata.outreach_run_id
      const status = metadata.outreach_status || metadata.status
      if (runId) {
        return { runId, status }
      }
    }
    return null
  }, [mergedMessages])

  const activeOutreachRunId = latestOutreach?.runId || outreachRunId

  const coerceMessageText = useCallback((content) => {
    if (content == null) return ''
    if (typeof content === 'string' || typeof content === 'number') return String(content)
    if (typeof content === 'object') {
      if (typeof content.message === 'string') return content.message
      if (typeof content.response === 'string') return content.response
      if (typeof content.text === 'string') return content.text
      try {
        return JSON.stringify(content)
      } catch (error) {
        return ''
      }
    }
    return String(content)
  }, [])

  const normalizeMetadata = useCallback((metadata) => {
    if (!metadata) return {}
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata)
      } catch (error) {
        return {}
      }
    }
    if (Array.isArray(metadata)) return { items: metadata }
    if (typeof metadata === 'object') return metadata
    return {}
  }, [])

  const getCitations = useCallback((metadata, response) => {
    if (metadata?.citations) return metadata.citations
    if (response?.citations) return response.citations
    if (response?.metadata?.citations) return response.metadata.citations
    return null
  }, [])

  const parseOutreachInfo = useCallback((payload) => {
    if (!payload) return null
    const runId = payload.run_id || payload.runId || payload.outreach_run_id || payload.outreach?.run_id
    const status = payload.outreach_status || payload.status || payload.outreach?.status
    return runId ? { runId, status } : null
  }, [])

  const renderCitations = useCallback((citations) => {
    if (!citations || !Array.isArray(citations) || citations.length === 0) return null
    const formatted = citations.map((citation, index) => {
      if (typeof citation === 'string') return `[${index + 1}] ${citation}`
      if (citation?.title && citation?.url) return `[${index + 1}] ${citation.title}`
      if (citation?.title) return `[${index + 1}] ${citation.title}`
      return `[${index + 1}]`
    })
    return (
      <View style={styles.citationsContainer}>
        <Text style={styles.citationsLabel}>Sources</Text>
        {formatted.map((line, index) => (
          <Text key={`citation-${index}`} style={styles.citationText}>
            {line}
          </Text>
        ))}
      </View>
    )
  }, [styles])

  const getFirstName = useCallback((fullName, email) => {
    const normalized = (fullName || '').trim()
    if (normalized) {
      return normalized.split(/\s+/)[0]
    }
    if (email && email.includes('@')) {
      return email.split('@')[0]
    }
    return 'there'
  }, [])

  const inferCardType = useCallback((item, typeHint) => {
    const normalizedHint = (typeHint || '').toLowerCase()
    if (['people', 'person', 'profile', 'profiles', 'users', 'user'].includes(normalizedHint)) return 'profile'
    if (['event', 'events'].includes(normalizedHint)) return 'event'
    if (['org', 'orgs', 'organization', 'organizations', 'club', 'clubs'].includes(normalizedHint)) return 'org'
    if (['post', 'posts'].includes(normalizedHint)) return 'post'

    const itemType = (item?.type || '').toLowerCase()
    if (['profile', 'person', 'user'].includes(itemType)) return 'profile'
    if (['event'].includes(itemType)) return 'event'
    if (['organization', 'org', 'club'].includes(itemType)) return 'org'
    if (['post'].includes(itemType)) return 'post'

    if (item?.user_id || item?.profile_id || item?.username || item?.full_name) return 'profile'
    if (item?.event_id || item?.start_at || item?.end_at) return 'event'
    if (item?.org_id || item?.organization_id || item?.logo_url) return 'org'
    if (item?.post_id || item?.forum_id || item?.upvotes_count || item?.comments_count) return 'post'

    return null
  }, [])

  const normalizeLinkResponse = useCallback((response) => {
    if (!response) return { text: '', cards: [], citations: null, outreach: null }
    const text = coerceMessageText(response.response || response.message || response.text || '')
    const data = response.data || response.payload
    const typeHint = response.type || data?.type || response.shareType
    const results = data?.results || data?.items || []
    const allowCards = Array.isArray(results) && results.length > 0 && response.need_outreach === false
    const cards = Array.isArray(results)
      && allowCards
      ? results.map((item) => {
        const cardType = inferCardType(item, typeHint)
        if (!cardType) return null

        if (cardType === 'event') {
          return {
            message_type: 'event',
            metadata: {
              event_id: item.event_id || item.id,
              title: item.title || item.name,
              start_at: item.start_at || item.start_time || item.starts_at,
              location_name: item.location_name || item.location || item.venue,
              image_url: item.image_url || item.cover_url || item.image,
              attendee_count: item.attendee_count || item.going_count || item.rsvp_count,
            },
            fallbackText: item.title || 'Event',
          }
        }

        if (cardType === 'post') {
          return {
            message_type: 'post',
            metadata: {
              post_id: item.post_id || item.id,
              forum_id: item.forum_id,
              title: item.title,
              body: item.body || item.content,
              image_url: item.image_url || item.media_url,
              forum_name: item.forum_name,
              comments_count: item.comments_count,
              upvotes_count: item.upvotes_count,
            },
            fallbackText: item.title || 'Post',
          }
        }

        if (cardType === 'profile') {
          return {
            message_type: 'profile',
            metadata: {
              user_id: item.user_id || item.id,
              full_name: item.full_name || item.name,
              username: item.username,
              avatar_url: item.avatar_url || item.avatar,
              major: item.major,
              graduation_year: item.graduation_year || item.year,
              mutual_friends: item.mutual_friends,
            },
            fallbackText: item.full_name || item.name || 'Profile',
          }
        }

        if (cardType === 'org') {
          return {
            message_type: 'org',
            metadata: {
              org_id: item.org_id || item.id,
              name: item.name,
              category: item.category,
              logo_url: item.logo_url || item.image_url || item.image,
              member_count: item.member_count || item.members,
            },
            fallbackText: item.name || 'Organization',
          }
        }

        return null
      }).filter(Boolean)
      : []

    const citations = getCitations(response.metadata, response)
    const outreach = parseOutreachInfo(response)

    return { text, cards, citations, outreach }
  }, [coerceMessageText, inferCardType, getCitations, parseOutreachInfo])

  const extractPreferredName = useCallback((text, allowShortReply) => {
    if (!text) return null
    const trimmed = text.trim()
    const patterns = [
      /(?:call me|you can call me|please call me|i go by)\s+([A-Za-z][A-Za-z'’\\-]{1,30})/i,
      /(?:my name is|it's|it is|im|i'm)\s+([A-Za-z][A-Za-z'’\\-]{1,30})/i,
    ]
    for (const pattern of patterns) {
      const match = trimmed.match(pattern)
      if (match?.[1]) {
        return match[1]
      }
    }
    if (allowShortReply && trimmed.length <= 30 && !trimmed.includes('?')) {
      const parts = trimmed.split(/\s+/)
      if (parts.length <= 2) {
        return parts[0]
      }
    }
    return null
  }, [])

  const upsertLinkMemory = useCallback(async (updates) => {
    if (!user?.id) return null
    const knownPreferences = {
      ...(linkMemory?.known_preferences || {}),
      ...(updates?.known_preferences || {}),
    }
    const payload = {
      user_id: user.id,
      university_id: currentUserProfile?.university_id || null,
      ...updates,
      known_preferences: knownPreferences,
      last_interaction_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('link_user_memory')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .maybeSingle()

    if (error) {
      console.warn('Failed to update Link memory:', error)
      return null
    }

    setLinkMemory(data)
    return data
  }, [user?.id, linkMemory, currentUserProfile?.university_id])

  const insertLocalMessage = useCallback((content, senderType, options = {}) => {
    if (!conversation?.id) return null
    const normalizedContent = coerceMessageText(content)
    const metadata = {
      ...normalizeMetadata(options.metadata),
      ...(options.messageType ? { shareType: options.messageType } : {}),
    }

    const localMessage = {
      id: `local-${senderType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conversation_id: conversation.id,
      sender_type: senderType,
      sender_id: senderType === 'user' ? user?.id : (linkProfile?.link_user_id || null),
      content: normalizedContent,
      metadata,
      session_id: currentSessionId || null,
      created_at: new Date().toISOString(),
    }

    setLocalMessages(prev => ([localMessage, ...prev]))
    return localMessage
  }, [conversation?.id, linkProfile?.link_user_id, user?.id, coerceMessageText, normalizeMetadata, currentSessionId])

  const insertLinkMessage = useCallback((content, options) => {
    return insertLocalMessage(content, 'link', options)
  }, [insertLocalMessage])

  const insertUserMessage = useCallback((content, options) => {
    return insertLocalMessage(content, 'user', options)
  }, [insertLocalMessage])

  const preferredName = useMemo(() => {
    return linkMemory?.known_preferences?.preferred_name || null
  }, [linkMemory])

  const firstName = useMemo(() => {
    const baseName = preferredName
      || currentUserProfile?.full_name
      || user?.user_metadata?.full_name
      || user?.email
    return getFirstName(baseName, user?.email)
  }, [preferredName, currentUserProfile?.full_name, user?.user_metadata?.full_name, user?.email, getFirstName])

  const handleListScroll = useCallback(() => {
    // No-op, inverted list handles scroll to bottom
  }, [])

  const handleCheckStatus = useCallback(async () => {
    if (!activeOutreachRunId || !user?.id) return
    setIsCollectingOutreach(true)
    try {
      const response = await collectLinkOutreach(
        activeOutreachRunId,
        currentUserProfile?.university_id,
        currentSessionId,
        session?.access_token
      )

      if (response?.session_id && response.session_id !== currentSessionId) {
        setCurrentSessionId(response.session_id)
      }

      const normalized = normalizeLinkResponse(response)
      if (normalized.outreach?.runId) {
        setOutreachRunId(normalized.outreach.runId)
      }
      if (normalized.text) {
        await insertLinkMessage(normalized.text, {
          metadata: normalized.citations ? { citations: normalized.citations } : {},
        })
      }
      if (normalized.cards.length > 0) {
        for (const card of normalized.cards) {
          await insertLinkMessage(card.fallbackText || '', {
            messageType: card.message_type,
            metadata: card.metadata,
          })
        }
      }
    } catch (error) {
      console.error('Error checking outreach status:', error)
    } finally {
      setIsCollectingOutreach(false)
    }
  }, [
    activeOutreachRunId,
    user?.id,
    currentUserProfile?.university_id,
    currentSessionId,
    session?.access_token,
    normalizeLinkResponse,
    insertLinkMessage,
  ])

  const handleConsentAction = useCallback(async (metadata, approved) => {
    if (!metadata?.run_id || !metadata?.suggested_user_id || !user?.id) return
    const key = `${metadata.run_id}:${metadata.suggested_user_id}`
    setConsentLoading(prev => ({ ...prev, [key]: true }))
    try {
      await resolveLinkConsent({
        run_id: metadata.run_id,
        requester_user_id: user.id,
        target_user_id: metadata.suggested_user_id,
        requester_ok: approved,
        target_ok: true,
      })
      if (approved) {
        await insertLinkMessage('Got it — I’ll introduce you now.', { metadata: { consent_ack: true } })
      } else {
        await insertLinkMessage('No worries — I’ll keep looking.', { metadata: { consent_ack: true } })
      }
    } catch (error) {
      console.error('Failed to resolve consent:', error)
    } finally {
      setConsentLoading(prev => ({ ...prev, [key]: false }))
    }
  }, [user?.id, insertLinkMessage])

  useEffect(() => {
    if (!user?.id) return
    let isMounted = true

    const loadMemory = async () => {
      const { data, error } = await supabase
        .from('link_user_memory')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!isMounted) return
      if (error) {
        console.warn('Failed to load Link memory:', error)
        return
      }

      setLinkMemory(data)
    }

    loadMemory()
    return () => { isMounted = false }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    let isMounted = true

    const getOrCreateSession = async () => {
      const { data: existing, error } = await supabase
        .from('link_user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!isMounted) return
      if (error) {
        console.warn('Failed to load Link session:', error)
        return
      }

      if (existing?.id) {
        setCurrentSessionId(existing.id)
        return
      }

      const { data: created, error: createError } = await supabase
        .from('link_user_sessions')
        .insert({
          user_id: user.id,
          university_id: currentUserProfile?.university_id || null,
          status: 'active',
          last_active_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (!isMounted) return
      if (createError) {
        console.warn('Failed to create Link session:', createError)
        return
      }
      setCurrentSessionId(created?.id || null)
    }

    getOrCreateSession()
    return () => { isMounted = false }
  }, [user?.id, currentUserProfile?.university_id])

  useEffect(() => {
    if (introInjected) return
    if (!conversation?.id || !linkProfile || messagesLoading) return
    if ((messages?.length || 0) > 0 || localMessages.length > 0) return
    if (preferredName) return

    setIntroInjected(true)
    setIsAwaitingPreferredName(true)

    const introMessage = `hey ${firstName}! i'm link - think of me like a friend you can text anytime. btw, what should i call you?`
    insertLinkMessage(introMessage, { type: 'intro' })
  }, [
    introInjected,
    conversation?.id,
    linkProfile,
    messagesLoading,
    mergedMessages.length,
    localMessages.length,
    preferredName,
    firstName,
    insertLinkMessage,
  ])

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !conversation?.id) return

    const messageContent = inputText.trim()
    setInputText('')
    setIsSending(true)

    try {
      const extractedName = extractPreferredName(messageContent, isAwaitingPreferredName)

      if (extractedName) {
        await upsertLinkMemory({
          known_preferences: {
            preferred_name: extractedName,
            preferred_name_updated_at: new Date().toISOString(),
          },
        })
        setIsAwaitingPreferredName(false)
        insertLinkMessage(`got it — i’ll call you ${extractedName}.`, { type: 'preferred_name' })
      }

      // Insert optimistic user message
      console.log('[LinkChat] Inserting optimistic user message')
      insertUserMessage(messageContent)

      // Send user message to database
      console.log('[LinkChat] Sending message to DB for conversation:', conversation.id)
      const messageResult = await sendMessage.mutateAsync({
        conversationId: conversation.id,
        content: messageContent,
      })
      console.log('[LinkChat] Message saved to DB:', !!messageResult)

      // Learn user's style (non-blocking)
      learnUserStyle(user.id, messageContent).catch(() => { })

      // Show typing indicator
      setIsLinkTyping(true)

      // Query Link backend for response
      console.log('[LinkChat] Querying Link AI backend...')
      const linkResponse = await queryLink(
        user.id,
        messageContent,
        currentUserProfile?.university_id,
        {
          preferred_name: extractedName || preferredName || firstName,
          session_id: currentSessionId,
          access_token: session?.access_token,
        }
      )
      console.log('[LinkChat] Received Link response:', !!linkResponse)

      setIsLinkTyping(false)

      // If Link has a response, it will be inserted via the backend
      // The real-time subscription will pick it up
      // For now, we can show the response directly if needed

      if (linkResponse) {
        if (linkResponse.session_id && linkResponse.session_id !== currentSessionId) {
          setCurrentSessionId(linkResponse.session_id)
        }
        const normalized = normalizeLinkResponse(linkResponse)
        if (normalized.outreach?.runId) {
          setOutreachRunId(normalized.outreach.runId)
        } else if (linkResponse.run_id || linkResponse.outreach_run_id) {
          setOutreachRunId(linkResponse.run_id || linkResponse.outreach_run_id)
        } else if (linkResponse.need_outreach && outreachRunId) {
          setOutreachRunId(outreachRunId)
        }
        if (normalized.text) {
          await insertLinkMessage(normalized.text, {
            metadata: normalized.citations ? { citations: normalized.citations } : {},
          })
        }
        if (normalized.cards.length > 0) {
          for (const card of normalized.cards) {
            await insertLinkMessage(card.fallbackText || '', {
              messageType: card.message_type,
              metadata: card.metadata,
            })
          }
        }
      }

      // Journal the user's message (best-effort)
      supabase
        .from('link_journal_entries')
        .insert({
          user_id: user.id,
          university_id: currentUserProfile?.university_id || null,
          entry_type: 'note',
          title: 'Chat with Link',
          content: messageContent,
        })
        .then(() => { })
        .catch(() => { })

      // Update memory interaction stats (best-effort)
      upsertLinkMemory({
        total_interactions: (linkMemory?.total_interactions || 0) + 1,
      })

    } catch (error) {
      console.error('Error sending message to Link:', error)
      setIsLinkTyping(false)
    } finally {
      setIsSending(false)
    }
  }, [
    inputText,
    conversation?.id,
    user?.id,
    currentUserProfile?.university_id,
    sendMessage,
    extractPreferredName,
    isAwaitingPreferredName,
    upsertLinkMemory,
    insertLinkMessage,
    insertUserMessage,
    preferredName,
    firstName,
    normalizeLinkResponse,
    linkMemory?.total_interactions,
    currentSessionId,
    session?.access_token,
    outreachRunId,
  ])

  const renderMessage = useCallback(({ item }) => {
    const isUser = item.sender_type === 'user'
    const metadata = normalizeMetadata(item.metadata)
    console.log(`[LinkChat] Rendering message ${item.id} from ${item.sender_type}: ${item.content?.substring(0, 20)}...`)
    const consentKey = metadata?.run_id && metadata?.suggested_user_id
      ? `${metadata.run_id}:${metadata.suggested_user_id}`
      : null
    const isForumFallback = typeof item?.content === 'string'
      && item.content.toLowerCase().includes('anonymous forum post')
    const previewMessage = {
      ...item,
      metadata,
      sender: item.sender_type === 'link' ? { username: 'Link' } : item.sender,
    }

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.linkMessage]}>
        {!isUser && (
          <View style={styles.linkAvatar}>
            <Image source={LINK_LOGO} style={styles.linkLogoSmall} contentFit="contain" />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.linkBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.linkText]}>
            {typeof item.content === 'string' ? item.content : JSON.stringify(item.content || '')}
          </Text>
          {isForumFallback && (
            <Text style={styles.forumFallbackText}>
              We’ll notify you when responses arrive.
            </Text>
          )}
          {(metadata.shareType || Object.keys(metadata).length > 0) && (
            <RichMessagePreview message={previewMessage} isOwn={isUser} />
          )}
          {renderCitations(metadata.citations)}
          {metadata?.suggested_user_id && metadata?.run_id && (
            <View style={styles.consentActions}>
              <TouchableOpacity
                style={[styles.consentButton, styles.consentYes]}
                onPress={() => handleConsentAction(metadata, true)}
                disabled={consentKey ? consentLoading[consentKey] : false}
              >
                <Text style={styles.consentButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.consentButton, styles.consentNo]}
                onPress={() => handleConsentAction(metadata, false)}
                disabled={consentKey ? consentLoading[consentKey] : false}
              >
                <Text style={styles.consentButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    )
  }, [styles, theme, coerceMessageText, normalizeMetadata, renderCitations, handleConsentAction, consentLoading])

  if (linkProfileLoading || conversationLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.bondedPurple} />
          <Text style={styles.loadingText}>Starting chat with Link...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!linkProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={hp(6)} color={theme.colors.textSecondary} />
          <Text style={styles.loadingText}>Link is not available for your campus yet.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
          <Ionicons name="arrow-back" size={hp(2.8)} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Image source={LINK_LOGO} style={styles.linkLogo} contentFit="contain" />
          </View>
          <View>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerName}>Link</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>Your campus buddy</Text>
          </View>
        </View>
        <View style={{ width: hp(4.5) }} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.messagesWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={hp(10)}
      >
        <FlatList
          ref={flatListRef}
          data={mergedMessages}
          keyExtractor={(item, index) => item.id || `msg-${index}-${item.created_at || Date.now()}`}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messagesList}
          scrollEventThrottle={16}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.invertedContent}>
                {isLinkTyping && (
                  <View style={[styles.messageContainer, styles.linkMessage]}>
                    <View style={styles.linkAvatar}>
                      <Image source={LINK_LOGO} style={styles.linkLogoSmall} contentFit="contain" />
                    </View>
                    <View style={[styles.messageBubble, styles.linkBubble, styles.typingBubble]}>
                      <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                      <Text style={styles.typingText}>Link is typing...</Text>
                    </View>
                  </View>
                )}
                {activeOutreachRunId && (
                  <View style={styles.checkStatusContainer}>
                    <TouchableOpacity
                      style={[styles.checkStatusButton, isCollectingOutreach && styles.checkStatusButtonDisabled]}
                      onPress={handleCheckStatus}
                      disabled={isCollectingOutreach}
                    >
                      <Text style={styles.checkStatusText}>
                        {isCollectingOutreach ? 'Checking status…' : 'Check status'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            !messagesLoading && (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyAvatar}>
                  <Image source={LINK_LOGO} style={styles.linkLogoLarge} contentFit="contain" />
                </View>
                <Text style={styles.emptyTitle}>Chat with Link</Text>
                <Text style={styles.emptySubtitle}>
                  Ask me anything about campus! I can help you find friends, study spots, events, and more.
                </Text>
              </View>
            )
          }
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Message Link..."
            placeholderTextColor={theme.colors.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={hp(2.2)} color="#FFF" />
            )}
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(8),
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: hp(1.8),
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    marginTop: hp(3),
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    backgroundColor: theme.colors.bondedPurple,
    borderRadius: theme.radius.lg,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: hp(1.8),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSecondary,
  },
  backArrow: {
    padding: hp(0.5),
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: wp(3),
  },
  headerAvatar: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    backgroundColor: theme.colors.bondedPurple + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  linkLogo: {
    width: '70%',
    height: '70%',
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  headerName: {
    fontSize: hp(2),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    fontFamily: 'System',
  },
  aiBadge: {
    backgroundColor: theme.colors.bondedPurple + '20',
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.2),
    borderRadius: theme.radius.sm,
  },
  aiBadgeText: {
    fontSize: hp(1.1),
    color: theme.colors.bondedPurple,
    fontWeight: '700',
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    marginTop: hp(0.2),
    fontFamily: 'System',
  },
  messagesWrapper: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: hp(1.5),
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  linkMessage: {
    justifyContent: 'flex-start',
  },
  linkAvatar: {
    width: hp(3.5),
    height: hp(3.5),
    borderRadius: hp(1.75),
    backgroundColor: theme.colors.bondedPurple + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
  },
  linkLogoSmall: {
    width: '75%',
    height: '75%',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderRadius: theme.radius.lg,
  },
  userBubble: {
    backgroundColor: theme.colors.bondedPurple,
    borderBottomRightRadius: theme.radius.sm,
  },
  linkBubble: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottomLeftRadius: theme.radius.sm,
  },
  messageText: {
    fontSize: hp(1.8),
    lineHeight: hp(2.4),
    fontFamily: 'System',
  },
  userText: {
    color: '#FFF',
    fontFamily: 'System',
  },
  linkText: {
    color: theme.colors.textPrimary,
    fontFamily: 'System',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  typingText: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    fontFamily: 'System',
  },
  citationsContainer: {
    marginTop: hp(1),
  },
  citationsLabel: {
    fontSize: hp(1.2),
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: hp(0.4),
  },
  citationText: {
    fontSize: hp(1.3),
    color: theme.colors.textSecondary,
    marginBottom: hp(0.2),
    fontFamily: 'System',
  },
  forumFallbackText: {
    marginTop: hp(0.8),
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    fontFamily: 'System',
  },
  consentActions: {
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(1),
  },
  consentButton: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: theme.radius.md,
  },
  consentYes: {
    backgroundColor: theme.colors.bondedPurple,
  },
  consentNo: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderSecondary,
  },
  consentButtonText: {
    color: theme.colors.textPrimary,
    fontSize: hp(1.6),
    fontWeight: '600',
    fontFamily: 'System',
  },
  checkStatusContainer: {
    alignItems: 'center',
    marginVertical: hp(1),
  },
  checkStatusButton: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(1),
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.bondedPurple,
  },
  checkStatusButtonDisabled: {
    opacity: 0.6,
  },
  checkStatusText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: hp(1.6),
    fontFamily: 'System',
  },
  listHeader: {
    width: '100%',
    alignItems: 'center',
  },
  invertedContent: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: hp(1),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
    paddingTop: hp(10),
  },
  emptyAvatar: {
    width: hp(10),
    height: hp(10),
    borderRadius: hp(5),
    backgroundColor: theme.colors.bondedPurple + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(3),
  },
  linkLogoLarge: {
    width: '70%',
    height: '70%',
  },
  emptyTitle: {
    fontSize: hp(2.4),
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: hp(1),
    fontFamily: 'System',
  },
  emptySubtitle: {
    fontSize: hp(1.7),
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: hp(2.4),
    fontFamily: 'System',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSecondary,
    backgroundColor: theme.colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    fontSize: hp(1.8),
    color: theme.colors.textPrimary,
    maxHeight: hp(15),
    marginRight: wp(3),
    fontFamily: 'System',
  },
  sendButton: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    backgroundColor: theme.colors.bondedPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
})
