import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createSignedUrlForPath, uploadImageToBondedMedia } from '../helpers/mediaStorage'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const ClubsContext = createContext()

export function ClubsProvider({ children }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [clubs, setClubs] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [orgsAvailable, setOrgsAvailable] = useState(true)
  const [membershipsAvailable, setMembershipsAvailable] = useState(false)

  // Listen for auth state changes to refresh data
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // User signed in, refresh clubs data
          console.log('Auth state changed: SIGNED_IN, refreshing clubs')
          fetchClubs()
        } else if (event === 'SIGNED_OUT') {
          // User signed out, clear clubs data
          console.log('Auth state changed: SIGNED_OUT, clearing clubs')
          setClubs({})
          setLoading(false)
          setError(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const normalizeMeetingTimes = (meetingTimeValue) => {
    if (!meetingTimeValue) return []
    if (Array.isArray(meetingTimeValue)) return meetingTimeValue
    if (typeof meetingTimeValue === 'string') {
      try {
        const parsed = JSON.parse(meetingTimeValue)
        return Array.isArray(parsed) ? parsed : []
      } catch (error) {
        return []
      }
    }
    return []
  }

  const notifyAdminsOfRequest = async (clubId, requesterId, clubName, fallbackAdminIds = []) => {
    if (!clubId || !requesterId) return
    try {
      const { data: admins, error } = await supabase
        .from('org_members')
        .select('user_id')
        .eq('organization_id', clubId)
        .in('role', ['admin', 'owner'])

      let adminIds = (admins || []).map((row) => row.user_id).filter((id) => id && id !== requesterId)
      if (error) {
        console.warn('Failed to fetch org admins for notifications:', error)
        adminIds = (fallbackAdminIds || []).filter((id) => id && id !== requesterId)
      }

      if (adminIds.length === 0) return

      const baseNotifications = adminIds.map((adminId) => ({
        user_id: adminId,
        actor_id: requesterId,
        type: 'org_join_request',
        title: 'Join request',
        body: `${clubName || 'An organization'} has a new join request.`,
        data: { clubId, clubName },
      }))

      const { error: insertError } = await supabase.from('notifications').insert(
        baseNotifications.map((item) => ({
          ...item,
          entity_type: 'organization',
          entity_id: clubId,
        }))
      )

      if (insertError?.code === 'PGRST204' || insertError?.message?.includes('entity_type')) {
        await supabase.from('notifications').insert(baseNotifications)
      } else if (insertError) {
        console.warn('Failed to insert admin notifications:', insertError)
      }
    } catch (error) {
      // Notifications are best-effort only.
    }
  }

  const insertOrgForum = async (org, universityId, isPublicOverride) => {
    // Forum creation is now handled by database trigger
    // Just fetch the forum that should have been created
    try {
      const { data: forum, error } = await supabase
        .rpc('get_org_forum_by_org_id', { p_org_id: org.id })
        .single()

      if (error) {
        console.warn('Failed to fetch org forum:', error)
        return { forumId: null, error }
      }

      return { forumId: forum?.id || null, error: null }
    } catch (err) {
      console.error('Error in insertOrgForum:', err)
      return { forumId: null, error: err }
    }
  }

  // Fetch all clubs from Supabase
  const fetchClubs = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching user university:', profileError)
        setLoading(false)
        return
      }
      if (!userProfile?.university_id) {
        console.warn('User profile missing university_id; cannot load organizations.')
        setLoading(false)
        return
      }

      // Fetch organizations
      // Handle case where organizations table might not exist yet (graceful degradation)
      let { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .eq('university_id', userProfile.university_id)
        .order('name')

      if (orgsError) {
        // PGRST205 = table not found - table might not be deployed yet
        if (orgsError.code === 'PGRST205') {
          console.warn('⚠️ organizations table not found - organizations feature may not be deployed yet')
          setClubs({})
          setOrgsAvailable(false)
          setError(null) // Don't show error to user if table doesn't exist
          setLoading(false)
          return
        }
        console.error('Error fetching orgs:', orgsError)
        setError(orgsError.message)
        setLoading(false)
        return
      }
      setOrgsAvailable(true)

      // Fetch user's org memberships using security definer function
      let { data: userMemberships, error: membershipError } = await supabase
        .rpc('get_user_org_memberships', { p_user_id: user.id })

      if (membershipError) {
        console.warn('Failed to fetch user memberships:', membershipError)
        userMemberships = []
      }

      let membersData = []
      let membersError = null
      if ((orgsData || []).length > 0) {
        const orgIds = orgsData.map((org) => org.id)
        ;({ data: membersData, error: membersError } = await supabase
          .from('org_members')
          .select('organization_id, user_id, role, joined_at')
          .in('organization_id', orgIds))
      } else if (userMemberships?.length > 0) {
        // Fallback: fetch orgs where user is a member
        const memberOrgIds = userMemberships.map(m => m.organization_id)
        const { data: memberOrgs, error: memberOrgError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', memberOrgIds)

        if (!memberOrgError && memberOrgs?.length) {
          orgsData = memberOrgs
          // Re-fetch members for these orgs
          ;({ data: membersData, error: membersError } = await supabase
            .from('org_members')
            .select('organization_id, user_id, role, joined_at')
            .in('organization_id', memberOrgIds))
        }
      } else {
        ;({ data: membersData, error: membersError } = await supabase
          .from('org_members')
          .select('organization_id, user_id, role, joined_at')
          .limit(1))
      }

      let fallbackMemberRoles = {}
      if (membersError) {
        if (membersError.code === 'PGRST205') {
          console.warn('⚠️ org_members table not found - membership features disabled')
          setMembershipsAvailable(false)
          membersData = []
        } else {
          console.warn('⚠️ org_members unavailable for reads:', membersError)
          setMembershipsAvailable(true)
          membersData = []
        }
      } else {
        setMembershipsAvailable(true)
      }

      try {
        const { data: selfMemberships, error: selfError } = await supabase
          .from('org_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
        if (!selfError) {
          fallbackMemberRoles = (selfMemberships || []).reduce((acc, row) => {
            if (row.organization_id) {
              acc[row.organization_id] = row.role || 'member'
            }
            return acc
          }, {})
        }
      } catch (selfError) {
        // Non-blocking.
      }

      let forumsByOrg = {}
      if ((orgsData || []).length > 0) {
        const orgIds = orgsData.map((org) => org.id)
        let forumsData = []
        let forumsError = null
        ;({ data: forumsData, error: forumsError } = await supabase
          .from('forums')
          .select('id, org_id, name, type')
          .in('org_id', orgIds)
          .eq('type', 'org'))

        if (forumsError?.code === 'PGRST204' || forumsError?.message?.includes('org_id')) {
          forumsData = []
        } else if (forumsError) {
          console.warn('⚠️ forums lookup failed:', forumsError)
          forumsData = []
        }

        forumsByOrg = (forumsData || []).reduce((acc, forum) => {
          if (forum.org_id) {
            acc[forum.org_id] = forum.id
          }
          return acc
        }, {})
      }

      let orgMedia = { logo: {}, cover: {} }
      if ((orgsData || []).length > 0) {
        const orgIds = orgsData.map((org) => org.id)
        const { data: mediaData, error: mediaError } = await supabase
          .from('media')
          .select('owner_id, path, media_type, created_at')
          .eq('owner_type', 'org')
          .in('owner_id', orgIds)
          .in('media_type', ['org_logo', 'org_cover'])
          .order('created_at', { ascending: false })

        if (mediaError) {
          console.warn('⚠️ Failed to fetch org media:', mediaError)
        } else {
          orgMedia = (mediaData || []).reduce(
            (acc, row) => {
              if (row.media_type === 'org_logo' && !acc.logo[row.owner_id]) {
                acc.logo[row.owner_id] = row.path
              }
              if (row.media_type === 'org_cover' && !acc.cover[row.owner_id]) {
                acc.cover[row.owner_id] = row.path
              }
              return acc
            },
            { logo: {}, cover: {} }
          )
        }
      }

      // Transform to indexed object with expected fields
      const extractStoragePath = (value) => {
        if (!value || typeof value !== 'string') return null
        if (value.startsWith('file://')) return null
        if (!value.startsWith('http')) return value
        const bucketMarker = 'bonded-media/'
        const index = value.indexOf(bucketMarker)
        if (index === -1) return value
        const pathWithQuery = value.slice(index + bucketMarker.length)
        return pathWithQuery.split('?')[0]
      }

      const resolveMediaUrl = async (value) => {
        if (!value) return null
        const extractedPath = extractStoragePath(value)
        if (extractedPath && !/^https?:\/\//i.test(extractedPath)) {
          try {
            return await createSignedUrlForPath(extractedPath)
          } catch (error) {
            console.warn('Failed to sign media URL:', error?.message || error)
            return null
          }
        }
        return extractedPath
      }

      const clubsMap = {}
      for (const org of orgsData || []) {
        const allOrgMembers = (membersData || []).filter((member) => member.organization_id === org.id)
        // Only include actual members (not pending) in memberIds
        const memberIds = allOrgMembers
          .filter((member) => member.role !== 'pending')
          .map((member) => member.user_id)
        const admins = allOrgMembers
          .filter((member) => member.role === 'admin' || member.role === 'owner')
          .map((member) => member.user_id)
        const pendingRequests = allOrgMembers
          .filter((member) => member.role === 'pending')
          .map((member) => member.user_id)
        const creatorId = org.created_by || org.owner_id || org.admin_id || null

        if (creatorId && !memberIds.includes(creatorId)) {
          memberIds.push(creatorId)
        }
        if (creatorId && !admins.includes(creatorId)) {
          admins.push(creatorId)
        }

        const selfRole = fallbackMemberRoles[org.id]
        if (selfRole) {
          if (selfRole === 'pending' && !pendingRequests.includes(user.id)) {
            pendingRequests.push(user.id)
          }
          if (selfRole !== 'pending' && !memberIds.includes(user.id)) {
            memberIds.push(user.id)
          }
          if ((selfRole === 'admin' || selfRole === 'owner') && !admins.includes(user.id)) {
            admins.push(user.id)
          }
        }

        let avatarUrl = await resolveMediaUrl(org.logo_url)
        if (!avatarUrl && orgMedia.logo[org.id]) {
          try {
            avatarUrl = await createSignedUrlForPath(orgMedia.logo[org.id])
          } catch (error) {
            console.warn('Failed to sign fallback org logo:', error?.message || error)
          }
        }

        let coverUrl = await resolveMediaUrl(org.cover_url)
        if (!coverUrl && orgMedia.cover[org.id]) {
          try {
            coverUrl = await createSignedUrlForPath(orgMedia.cover[org.id])
          } catch (error) {
            console.warn('Failed to sign fallback org cover:', error?.message || error)
          }
        }

        clubsMap[org.id] = {
          id: org.id,
          name: org.name,
          description: org.mission_statement || '',
          category: org.category || org.type || 'general',
          coverImage: coverUrl || null,
          avatar: avatarUrl || null,
          isPublic: org.is_public !== false,
          requiresApproval: org.requires_approval === true,
          members: memberIds,
          admins,
          requests: pendingRequests,
          leadership: admins.map((userId) => ({ userId, role: 'Admin' })),
          forumId: forumsByOrg[org.id] || `org-${org.id}`,
          createdAt: org.created_at,
          meetingTimes: normalizeMeetingTimes(org.meeting_time),
          meetingLocation: org.meeting_place || '',
          locationCoords: null,
          isMeetingPublic: true,
          posts: [],
          events: [],
          interested: [],
        }
      }

      setClubs(clubsMap)
    } catch (err) {
      console.error('Error in fetchClubs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchClubs()
  }, [fetchClubs])

  const currentUserId = user?.id || null

  const getAllClubs = () => {
    return Object.values(clubs)
  }

  const getClub = (clubId) => {
    return clubs[clubId] || null
  }

  const getClubsByCategory = (category) => {
    return Object.values(clubs).filter((club) => club.category === category)
  }

  const isUserMember = (clubId, userId = currentUserId) => {
    const club = clubs[clubId]
    if (!club || !userId) return false
    return club.members.includes(userId)
  }

  const hasUserRequested = (clubId, userId = currentUserId) => {
    const club = clubs[clubId]
    if (!club || !userId) return false
    return (club.requests || []).includes(userId)
  }

  const isUserInterested = (clubId, userId = currentUserId) => {
    const club = clubs[clubId]
    if (!club || !userId) return false
    return (club.interested || []).includes(userId)
  }

  const requestToJoin = async (clubId, userId = currentUserId) => {
    if (!membershipsAvailable) {
      console.warn('Organization memberships are not available yet.')
      return { ok: false, error: 'Organization memberships are not available yet.' }
    }
    const club = clubs[clubId]
    if (!club || !userId) {
      return { ok: false, error: 'Organization unavailable.' }
    }

    try {
      const needsApproval = club.requiresApproval || club.isPublic === false
      const role = needsApproval ? 'pending' : 'member'

      // Check existing membership using security definer function
      const { data: existingMembership, error: existingError } = await supabase
        .rpc('is_user_org_admin', { p_user_id: userId, p_org_id: clubId })

      if (!existingError && existingMembership) {
        return { ok: true, pending: false } // Already a member/admin
      }

      // Check for pending request
      const { data: pendingMembership, error: pendingError } = await supabase
        .from('org_members')
        .select('role')
        .eq('organization_id', clubId)
        .eq('user_id', userId)
        .eq('role', 'pending')
        .maybeSingle()

      if (!pendingError && pendingMembership) {
        return { ok: true, pending: true }
      }

      // Insert new membership request
      const { error } = await supabase
        .from('org_members')
        .insert({
          organization_id: clubId,
          user_id: userId,
          role,
          joined_at: new Date().toISOString(),
        })

      if (error) {
        // Handle specific error cases
        if (error.code === '23505') {
          // Duplicate - user already has some membership, this is expected behavior
          console.log('User already has membership, treating as success')
          // Forum/conversation membership is handled by database triggers
          return { ok: true, pending: needsApproval }
        } else if (error.code === 'PGRST301' || error.message?.includes('permission')) {
          console.error('Permission denied joining club:', error)
          return { ok: false, error: 'You do not have permission to join this organization.' }
        } else {
          console.error('Error joining club:', error)
        }
        
        return { ok: false, error: error.message || 'Failed to join organization.' }
      }

      // Update local state
      setClubs((prev) => {
        const updatedClub = { ...prev[clubId] }
        if (needsApproval) {
          updatedClub.requests = [...(updatedClub.requests || []), userId]
        } else {
          updatedClub.members = [...(updatedClub.members || []), userId]
        }
        return { ...prev, [clubId]: updatedClub }
      })

      // Notify admins if approval needed
      if (needsApproval) {
        await notifyAdminsOfRequest(clubId, userId, club.name, club.admins || [])
      }

      // Forum and conversation membership is now handled automatically by database triggers
      // when the org_members record is inserted above

      // Refresh data to ensure consistency
      console.log('About to refresh clubs data after join...')
      await fetchClubs()
      console.log('Clubs data refreshed after join')
      queryClient.invalidateQueries({ queryKey: ['forums'] })

      return { ok: true, pending: needsApproval }
    } catch (err) {
      console.error('Error in requestToJoin:', err)
      return { ok: false, error: err.message || 'Failed to join organization.' }
    }
  }

  const showInterest = (clubId, userId = currentUserId) => {
    // Interest is local-only for now
    setClubs((prev) => ({
      ...prev,
      [clubId]: {
        ...prev[clubId],
        interested: [...(prev[clubId]?.interested || []), userId],
      },
    }))
  }

  const removeInterest = (clubId, userId = currentUserId) => {
    setClubs((prev) => ({
      ...prev,
      [clubId]: {
        ...prev[clubId],
        interested: (prev[clubId]?.interested || []).filter((id) => id !== userId),
      },
    }))
  }

  const approveRequest = async (clubId, userId) => {
    if (!membershipsAvailable) {
      console.warn('Organization memberships are not available yet.')
      return false
    }
    try {
      const { error } = await supabase
        .from('org_members')
        .update({ role: 'member' })
        .eq('organization_id', clubId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error approving request:', error)
        return false
      }

      // Update local state
      setClubs((prev) => ({
        ...prev,
        [clubId]: {
          ...prev[clubId],
          requests: (prev[clubId].requests || []).filter((id) => id !== userId),
          members: [...prev[clubId].members, userId],
        },
      }))

      // Forum/conversation membership is handled automatically by database triggers
      queryClient.invalidateQueries({ queryKey: ['forums'] })

      return true
    } catch (err) {
      console.error('Error in approveRequest:', err)
      return false
    }
  }

  const rejectRequest = async (clubId, userId) => {
    if (!membershipsAvailable) {
      console.warn('Organization memberships are not available yet.')
      return false
    }
    try {
      const { error } = await supabase
        .from('org_members')
        .delete()
        .eq('organization_id', clubId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error rejecting request:', error)
        return false
      }

      setClubs((prev) => ({
        ...prev,
        [clubId]: {
          ...prev[clubId],
          requests: (prev[clubId].requests || []).filter((id) => id !== userId),
        },
      }))

      return true
    } catch (err) {
      console.error('Error in rejectRequest:', err)
      return false
    }
  }

  const leaveClub = async (clubId, userId = currentUserId) => {
    if (!membershipsAvailable) {
      console.warn('Organization memberships are not available yet.')
      return false
    }
    try {
      const { error } = await supabase
        .from('org_members')
        .delete()
        .eq('organization_id', clubId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error leaving club:', error)
        return false
      }

      setClubs((prev) => ({
        ...prev,
        [clubId]: {
          ...prev[clubId],
          members: (prev[clubId].members || []).filter((id) => id !== userId),
        },
      }))
      queryClient.invalidateQueries({ queryKey: ['forums'] })

      return true
    } catch (err) {
      console.error('Error in leaveClub:', err)
      return false
    }
  }

  const getUserClubs = (userId = currentUserId) => {
    if (!userId) return []
    return Object.values(clubs).filter((club) => isUserMember(club.id, userId))
  }

  const removeMember = async (clubId, userId) => {
    if (!membershipsAvailable) {
      console.warn('Organization memberships are not available yet.')
      return false
    }
    const club = clubs[clubId]
    if (!club || !isUserAdmin(clubId)) return false
    if ((club.admins || []).includes(userId)) return false

    try {
      const { error } = await supabase
        .from('org_members')
        .delete()
        .eq('organization_id', clubId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error removing member:', error)
        return false
      }

      setClubs((prev) => ({
        ...prev,
        [clubId]: {
          ...prev[clubId],
          members: (prev[clubId].members || []).filter((id) => id !== userId),
        },
      }))

      return true
    } catch (err) {
      console.error('Error in removeMember:', err)
      return false
    }
  }

  const getAdminClubs = (userId = currentUserId) => {
    if (!userId) return []
    return Object.values(clubs).filter((club) => isUserAdmin(club.id, userId))
  }

  const ensureClubForum = async (clubId) => {
    const club = clubs[clubId]
    if (!club || !currentUserId) return null

    if (club.forumId && !club.forumId.startsWith('org-')) {
      return club.forumId
    }

    let universityId = null
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', currentUserId)
        .single()
      universityId = profile?.university_id || null
    } catch (error) {
      console.warn('Failed to fetch university for forum:', error)
    }

    if (!universityId) return null

    // Check for an existing forum first
      try {
        const { data: existingForum, error: existingError } = await supabase
          .from('forums')
          .select('id, org_id, type')
          .eq('type', 'org')
          .eq('org_id', clubId)
          .maybeSingle()

        if (!existingError && existingForum?.id) {
          setClubs((prev) => ({
            ...prev,
            [clubId]: {
              ...prev[clubId],
              forumId: existingForum.id,
            },
          }))
          return existingForum.id
        }
      } catch (error) {
        // If org_id column is missing, we'll fall back to creating a forum
      }

    try {
      const { data: namedForum, error: namedError } = await supabase
        .from('forums')
        .select('id, name, type, university_id')
        .eq('type', 'org')
        .eq('university_id', universityId)
        .eq('name', club.name)
        .maybeSingle()

      if (!namedError && namedForum?.id) {
        try {
          await supabase
            .from('forums')
            .update({ org_id: clubId })
            .eq('id', namedForum.id)
        } catch (updateError) {
          console.warn('Failed to attach org to existing forum:', updateError)
        }
        setClubs((prev) => ({
          ...prev,
          [clubId]: {
            ...prev[clubId],
            forumId: namedForum.id,
          },
        }))
        return namedForum.id
      }
    } catch (error) {
      // No-op: will create a forum below
    }

    const { forumId } = await insertOrgForum(
      {
        id: clubId,
        name: club.name,
        mission_statement: club.description,
        is_public: club.isPublic,
      },
      universityId,
      club.isPublic
    )

    if (forumId) {
      setClubs((prev) => ({
        ...prev,
        [clubId]: {
          ...prev[clubId],
          forumId,
        },
      }))
    }

    return forumId || null
  }

  const isUserAdmin = (clubId, userId = currentUserId) => {
    const club = clubs[clubId]
    if (!club || !userId) return false
    return (club.admins || []).includes(userId) ||
           (club.leadership || []).some(leader => leader.userId === userId)
  }

  const addAdmin = async (clubId, userId) => {
    if (!membershipsAvailable) {
      console.warn('Organization memberships are not available yet.')
      return false
    }
    try {
      const { error } = await supabase
        .from('org_members')
        .update({ role: 'admin' })
        .eq('organization_id', clubId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error adding admin:', error)
        return false
      }

      setClubs((prev) => {
        const club = prev[clubId]
        if (!club) return prev
        return {
          ...prev,
          [clubId]: {
            ...club,
            admins: [...(club.admins || []), userId],
          },
        }
      })

      return true
    } catch (err) {
      console.error('Error in addAdmin:', err)
      return false
    }
  }

  const removeAdmin = async (clubId, userId) => {
    if (!membershipsAvailable) {
      console.warn('Organization memberships are not available yet.')
      return false
    }
    try {
      const { error } = await supabase
        .from('org_members')
        .update({ role: 'member' })
        .eq('organization_id', clubId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error removing admin:', error)
        return false
      }

      setClubs((prev) => {
        const club = prev[clubId]
        if (!club) return prev
        return {
          ...prev,
          [clubId]: {
            ...club,
            admins: (club.admins || []).filter((id) => id !== userId),
          },
        }
      })

      return true
    } catch (err) {
      console.error('Error in removeAdmin:', err)
      return false
    }
  }

  const createClub = async (clubData) => {
    if (!currentUserId) return { id: null, error: 'You must be logged in to create an organization.' }
    if (!orgsAvailable) {
      return { id: null, error: 'Organizations are not available yet. Please try again later.' }
    }

    try {
      // Insert the org
      // Check if orgs table exists first
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', currentUserId)
        .single()

      if (profileError) {
        console.error('Error fetching university for org:', profileError)
        return { id: null, error: 'Failed to fetch your university information. Please try again.' }
      }
      if (!userProfile?.university_id) {
        return { id: null, error: 'Please select a university before creating an organization.' }
      }

      const meetingTime = clubData.meetingTimes?.length
        ? JSON.stringify(clubData.meetingTimes)
        : null

      const isPublic = clubData.isPublic !== undefined ? clubData.isPublic : true
      const requiresApproval = isPublic ? clubData.requiresApproval === true : true

      const isRemoteUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value)
      const basePayload = {
        name: clubData.name,
        university_id: userProfile.university_id,
        logo_url: isRemoteUrl(clubData.avatar) ? clubData.avatar : null,
        mission_statement: clubData.description,
        meeting_time: meetingTime,
        meeting_place: clubData.meetingLocation || null,
        office_location: null,
        category: clubData.category || 'general',
      }

      let newOrg = null
      let orgError = null
      ;({ data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          ...basePayload,
          is_public: isPublic,
          requires_approval: requiresApproval,
        })
        .select()
        .single())

      if (orgError?.code === 'PGRST204') {
        const missingColumn = orgError?.message || ''
        if (missingColumn.includes("'is_public'") || missingColumn.includes("'requires_approval'")) {
          ;({ data: newOrg, error: orgError } = await supabase
            .from('organizations')
            .insert(basePayload)
            .select()
            .single())
        }
      }

      if (orgError) {
        console.error('Error creating org:', orgError)
        if (orgError.code === 'PGRST205') {
          return { id: null, error: 'Organizations are not available yet. Please try again later.' }
        }
        return { id: null, error: orgError.message || 'Failed to create organization.' }
      }

      // Handle media uploads
      let logoPath = newOrg.logo_url
      let coverPath = newOrg.cover_url
      let logoDisplayUrl = newOrg.logo_url
      let coverDisplayUrl = newOrg.cover_url

      if (clubData.avatar) {
        try {
          const uploadResult = await uploadImageToBondedMedia({
            fileUri: clubData.avatar,
            mediaType: 'org_logo',
            ownerType: 'org',
            ownerId: newOrg.id,
            userId: currentUserId,
            orgId: newOrg.id,
            upsert: true,
          })
          logoPath = uploadResult.path
          logoDisplayUrl = await createSignedUrlForPath(uploadResult.path)
        } catch (uploadError) {
          console.warn('Failed to upload org logo:', uploadError?.message || uploadError)
          // Don't fail the whole creation for logo upload issues
        }
      }

      if (clubData.coverImage) {
        try {
          const uploadResult = await uploadImageToBondedMedia({
            fileUri: clubData.coverImage,
            mediaType: 'org_cover',
            ownerType: 'org',
            ownerId: newOrg.id,
            userId: currentUserId,
            orgId: newOrg.id,
            upsert: true,
          })
          coverPath = uploadResult.path
          coverDisplayUrl = await createSignedUrlForPath(uploadResult.path)
        } catch (uploadError) {
          console.warn('Failed to upload org cover:', uploadError?.message || uploadError)
          // Don't fail the whole creation for cover upload issues
        }
      }

      // Update org with media URLs if uploads succeeded
      if (logoPath || coverPath) {
        const updates = {}
        if (logoPath) updates.logo_url = logoPath
        if (coverPath) updates.cover_url = coverPath
        if (Object.keys(updates).length > 0) {
          try {
            await supabase.from('organizations').update(updates).eq('id', newOrg.id)
          } catch (updateError) {
            console.warn('Failed to update org media URLs:', updateError?.message || updateError)
          }
        }
      }

      // Add creator as admin
      let memberInsertSuccess = false
      const { error: memberError } = await supabase
        .from('org_members')
        .insert({
          organization_id: newOrg.id,
          user_id: currentUserId,
          role: 'admin',
          joined_at: new Date().toISOString(),
        })

      if (memberError) {
        if (memberError.code === 'PGRST205') {
          console.warn('org_members table not found - skipping membership insert')
        } else {
          console.warn('Error adding creator as admin:', memberError)
          // Continue with creation but warn about membership issue
        }
      } else {
        memberInsertSuccess = true
      }

      // Forum is now created automatically by database trigger
      // Just fetch the forum that should have been created
      let forumId = null
      try {
        const { data: forum, error: forumError } = await supabase
          .rpc('get_org_forum_by_org_id', { p_org_id: newOrg.id })
          .single()

        if (!forumError && forum?.id) {
          forumId = forum.id
        } else {
          console.warn('Forum not found after org creation:', forumError)
        }
      } catch (forumErr) {
        console.warn('Error fetching org forum:', forumErr)
      }

      // Update local state
      const creatorMembers = [currentUserId]
      const newClub = {
        id: newOrg.id,
        name: newOrg.name,
        description: newOrg.mission_statement || '',
        category: newOrg.category || clubData.category || 'general',
        coverImage: coverDisplayUrl || null,
        avatar: logoDisplayUrl || newOrg.logo_url,
        isPublic,
        requiresApproval,
        members: memberInsertSuccess ? [currentUserId] : creatorMembers,
        admins: memberInsertSuccess ? [currentUserId] : creatorMembers,
        requests: [],
        leadership: memberInsertSuccess ? [{ userId: currentUserId, role: 'Admin' }] : [{ userId: currentUserId, role: 'Admin' }],
        forumId: forumId || `org-${newOrg.id}`,
        createdAt: newOrg.created_at,
        meetingTimes: normalizeMeetingTimes(newOrg.meeting_time),
        meetingLocation: newOrg.meeting_place || '',
        locationCoords: null,
        isMeetingPublic: true,
        posts: [],
        events: [],
        interested: [],
      }

      setClubs((prev) => ({
        ...prev,
        [newOrg.id]: newClub,
      }))

      // Refresh data to ensure consistency
      await fetchClubs()

      return { id: newOrg.id, error: null }
    } catch (err) {
      console.error('Error in createClub:', err)
      return { id: null, error: err.message || 'An unexpected error occurred while creating the organization.' }
    }
  }

  const addClubPost = (clubId, post) => {
    setClubs((prev) => ({
      ...prev,
      [clubId]: {
        ...prev[clubId],
        posts: [
          {
            ...post,
            id: `post-${Date.now()}`,
            createdAt: new Date().toISOString(),
          },
          ...(prev[clubId]?.posts || []),
        ],
      },
    }))
  }

  const addClubEvent = (clubId, eventId) => {
    setClubs((prev) => ({
      ...prev,
      [clubId]: {
        ...prev[clubId],
        events: [...(prev[clubId]?.events || []), eventId],
      },
    }))
  }

  const refetch = () => {
    fetchClubs()
  }

  return (
    <ClubsContext.Provider
      value={{
        clubs,
        loading,
        error,
        orgsAvailable,
        membershipsAvailable,
        getAllClubs,
        getClub,
        getClubsByCategory,
        isUserMember,
        hasUserRequested,
        isUserInterested,
        requestToJoin,
        showInterest,
        removeInterest,
        approveRequest,
        rejectRequest,
        leaveClub,
        getUserClubs,
        getAdminClubs,
        isUserAdmin,
        addAdmin,
        removeMember,
        removeAdmin,
        addClubPost,
        addClubEvent,
        createClub,
        ensureClubForum,
        currentUserId,
        refetch,
      }}
    >
      {children}
    </ClubsContext.Provider>
  )
}

export const useClubsContext = () => {
  const context = useContext(ClubsContext)
  if (!context) {
    throw new Error('useClubsContext must be used within ClubsProvider')
  }
  return context
}
