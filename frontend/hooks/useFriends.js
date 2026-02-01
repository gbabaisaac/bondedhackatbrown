/**
 * Hooks for friend requests and friendships
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Alert } from 'react-native'
import { getFriendlyErrorMessage } from '../utils/userFacingErrors'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

/**
 * Hook to get all friends for the current user
 */
export function useFriends() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      console.log('👥 Fetching friends for user:', user.id)

      // Get friendships where user is either user1 or user2
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user1_id,
          user2_id,
          created_at
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

      if (error) {
        console.error('❌ Error fetching friendships:', error)
        throw error
      }

      // Get friend IDs (the other user in each friendship)
      const friendIds = (data || []).map(f => 
        f.user1_id === user.id ? f.user2_id : f.user1_id
      )

      if (friendIds.length === 0) {
        console.log('✅ No friends found')
        return []
      }

      // Fetch friend profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, major, grade')
        .in('id', friendIds)

      if (profileError) {
        console.error('❌ Error fetching friend profiles:', profileError)
        throw profileError
      }

      console.log(`✅ Found ${profiles?.length || 0} friends`)
      return profiles || []
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to get pending friend requests (received)
 */
export function useFriendRequests() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['friendRequests', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      console.log('📬 Fetching friend requests for user:', user.id)

      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          message,
          status,
          created_at,
          sender:profiles!friend_requests_sender_id_fkey (
            id,
            full_name,
            username,
            avatar_url,
            major
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching friend requests:', error)
        throw error
      }

      console.log(`✅ Found ${data?.length || 0} pending friend requests`)
      return data || []
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to get sent friend requests (pending)
 */
export function useSentFriendRequests() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['sentFriendRequests', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('friend_requests')
        .select('id, receiver_id, status, created_at')
        .eq('sender_id', user.id)
        .eq('status', 'pending')

      if (error) {
        console.error('❌ Error fetching sent requests:', error)
        throw error
      }

      return data || []
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to check friendship status with another user
 */
export function useFriendshipStatus(otherUserId) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['friendshipStatus', user?.id, otherUserId],
    queryFn: async () => {
      if (!user?.id || !otherUserId || user.id === otherUserId) {
        return { status: 'self' }
      }

      // Check if already friends
      const smallerId = user.id < otherUserId ? user.id : otherUserId
      const largerId = user.id < otherUserId ? otherUserId : user.id

      const { data: friendship } = await supabase
        .from('friendships')
        .select('id')
        .eq('user1_id', smallerId)
        .eq('user2_id', largerId)
        .maybeSingle()

      if (friendship) {
        return { status: 'friends', friendshipId: friendship.id }
      }

      // Check if there's a pending request from me
      const { data: sentRequest } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', otherUserId)
        .eq('status', 'pending')
        .maybeSingle()

      if (sentRequest) {
        return { status: 'request_sent', requestId: sentRequest.id }
      }

      // Check if there's a pending request to me
      const { data: receivedRequest } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (receivedRequest) {
        return { status: 'request_received', requestId: receivedRequest.id }
      }

      return { status: 'none' }
    },
    enabled: !!user?.id && !!otherUserId && user.id !== otherUserId,
    staleTime: 30 * 1000,
  })
}

/**
 * Hook to get friend count for a user
 */
export function useFriendCount(profileId) {
  return useQuery({
    queryKey: ['friendCount', profileId],
    queryFn: async () => {
      if (!profileId) return 0
      const { data, error } = await supabase
        .rpc('get_profile_friend_count', { target_profile_id: profileId })

      if (error) throw error
      return data || 0
    },
    enabled: !!profileId,
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook to get friends for a given profile
 */
export function useFriendsForProfile(profileId) {
  return useQuery({
    queryKey: ['friends-for-profile', profileId],
    queryFn: async () => {
      if (!profileId) return []
      const { data, error } = await supabase
        .rpc('get_profile_friends', { target_profile_id: profileId })

      if (error) throw error
      return data || []
    },
    enabled: !!profileId,
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

/**
 * Realtime subscription to keep friend count and list fresh for a profile
 */
export function useFriendsRealtime(profileId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!profileId) return undefined

    const channel = supabase
      .channel(`friendships-profile-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user1_id=eq.${profileId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['friendCount', profileId] })
          queryClient.invalidateQueries({ queryKey: ['friends-for-profile', profileId] })
          queryClient.invalidateQueries({ queryKey: ['friends', profileId] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user2_id=eq.${profileId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['friendCount', profileId] })
          queryClient.invalidateQueries({ queryKey: ['friends-for-profile', profileId] })
          queryClient.invalidateQueries({ queryKey: ['friends', profileId] })
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Friends realtime subscription error:', err)
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [profileId, queryClient])
}

/**
 * Hook to send a friend request
 */
export function useSendFriendRequest() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ receiverId, message }) => {
      if (!user?.id) throw new Error('Must be logged in')
      if (user.id === receiverId) throw new Error('Cannot send request to yourself')

      console.log('📤 Sending friend request to:', receiverId)

      // Block if already friends
      const smallerId = user.id < receiverId ? user.id : receiverId
      const largerId = user.id < receiverId ? receiverId : user.id
      const { data: existingFriendship, error: friendshipError } = await supabase
        .from('friendships')
        .select('id')
        .eq('user1_id', smallerId)
        .eq('user2_id', largerId)
        .maybeSingle()

      if (friendshipError) {
        throw friendshipError
      }

      if (existingFriendship) {
        throw new Error('Friend already added')
      }

      const { data: existingRequest, error: existingRequestError } = await supabase
        .from('friend_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', receiverId)
        .maybeSingle()

      if (existingRequestError) {
        throw existingRequestError
      }

      if (existingRequest?.status === 'pending') {
        throw new Error('Friend request already sent')
      }

      if (existingRequest?.status && existingRequest.status !== 'pending') {
        const { error: deleteError } = await supabase
          .from('friend_requests')
          .delete()
          .eq('id', existingRequest.id)
          .eq('sender_id', user.id)

        if (deleteError) {
          throw deleteError
        }
      }

      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          message: message || null,
          status: 'pending',
        })
        .select('id')
        .maybeSingle()

      if (error) {
        // Check if request already exists
        if (error.code === '23505') {
          throw new Error('Friend request already sent')
        }
        throw error
      }

      // If RLS blocked the select, the insert still succeeded
      console.log('✅ Friend request sent:', data?.id || 'success')
      return data || { id: 'created', success: true }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['friendshipStatus', user?.id, variables.receiverId] })
      queryClient.invalidateQueries({ queryKey: ['sentFriendRequests'] })
      // No alert needed - button changes to "Pending" which is clear enough
    },
    onError: (error) => {
      console.error('❌ Error sending friend request:', error)
      Alert.alert('Error', getFriendlyErrorMessage(error, 'Failed to send friend request'))
    },
  })
}

/**
 * Hook to accept a friend request
 */
export function useAcceptFriendRequest() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, senderId }) => {
      if (!user?.id) throw new Error('Must be logged in')

      console.log('✅ Accepting friend request:', requestId)

      // Create friendship (ensure user1_id < user2_id)
      const smallerId = user.id < senderId ? user.id : senderId
      const largerId = user.id < senderId ? senderId : user.id

      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user1_id: smallerId,
          user2_id: largerId,
        })

      if (friendshipError && friendshipError.code !== '23505') {
        throw friendshipError
      }

      // Update request status to accepted
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId)

      if (updateError) {
        throw updateError
      }

      console.log('✅ Friend request accepted')
      return { success: true }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
      queryClient.invalidateQueries({ queryKey: ['friendshipStatus'] })
      // No alert needed - button changes to "Friends" which is clear enough
    },
    onError: (error) => {
      console.error('❌ Error accepting friend request:', error)
      Alert.alert('Error', 'Failed to accept friend request')
    },
  })
}

/**
 * Hook to decline a friend request
 */
export function useDeclineFriendRequest() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId }) => {
      if (!user?.id) throw new Error('Must be logged in')

      console.log('❌ Declining friend request:', requestId)

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', requestId)

      if (error) throw error

      console.log('✅ Friend request declined')
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
    },
    onError: (error) => {
      console.error('❌ Error declining friend request:', error)
      Alert.alert('Error', 'Failed to decline friend request')
    },
  })
}

/**
 * Hook to cancel a sent friend request
 */
export function useCancelFriendRequest() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId }) => {
      if (!user?.id) throw new Error('Must be logged in')

      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId)
        .eq('sender_id', user.id)

      if (error) throw error

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentFriendRequests'] })
      queryClient.invalidateQueries({ queryKey: ['friendshipStatus'] })
    },
    onError: (error) => {
      console.error('❌ Error canceling friend request:', error)
      Alert.alert('Error', 'Failed to cancel friend request')
    },
  })
}

/**
 * Hook to remove a friend
 */
export function useRemoveFriend() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ friendId }) => {
      if (!user?.id) throw new Error('Must be logged in')

      const smallerId = user.id < friendId ? user.id : friendId
      const largerId = user.id < friendId ? friendId : user.id

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user1_id', smallerId)
        .eq('user2_id', largerId)

      if (error) throw error

      const { error: requestCleanupError } = await supabase
        .from('friend_requests')
        .delete()
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
        )

      if (requestCleanupError) {
        console.error('❌ Error cleaning friend requests:', requestCleanupError)
      }

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      queryClient.invalidateQueries({ queryKey: ['friendshipStatus'] })
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
      queryClient.invalidateQueries({ queryKey: ['sentFriendRequests'] })
      // No alert - UI already confirmed the action
    },
    onError: (error) => {
      console.error('❌ Error removing friend:', error)
      Alert.alert('Error', 'Failed to remove friend')
    },
  })
}
