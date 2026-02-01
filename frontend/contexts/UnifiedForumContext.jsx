import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createSignedUrlForPath } from '../helpers/mediaStorage'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const UnifiedForumContext = createContext()

export function UnifiedForumProvider({ children }) {
  const { user } = useAuthStore()
  const [forums, setForums] = useState([])
  const [currentForum, setCurrentForum] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetchInFlightRef = useRef(false)

  // Fetch all forums user has access to
  const fetchForums = async () => {
    if (!user?.id) {
      setForums([])
      setLoading(false)
      return
    }

    try {
      if (fetchInFlightRef.current) return
      fetchInFlightRef.current = true
      setLoading(true)
      setError(null)

      // Get user's university
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile?.university_id) {
        console.warn('Failed to fetch user university:', profileError)
        setForums([])
        setLoading(false)
        return
      }

      // Fetch main university forum
      const { data: mainForum, error: mainError } = await supabase
        .from('forums')
        .select('*')
        .eq('university_id', profile.university_id)
        .eq('type', 'main')
        .single()

      console.log('Main forum fetch result:', mainForum, 'Error:', mainError, 'University ID:', profile.university_id)

      // If main forum not found, try campus type
      let campusForum = null
      if (mainError) {
        console.log('Main forum not found, trying campus type...')
        const { data: campusData, error: campusError } = await supabase
          .from('forums')
          .select('*')
          .eq('university_id', profile.university_id)
          .eq('type', 'campus')
          .single()
        
        console.log('Campus forum fetch result:', campusData, 'Error:', campusError)
        if (!campusError) {
          campusForum = campusData
        }
      }

      // Fetch user's org memberships using security definer function
      let { data: userMemberships, error: membershipError } = await supabase
        .rpc('get_user_org_memberships', { p_user_id: user.id })

      console.log('User org memberships:', userMemberships, 'Error:', membershipError)

      let orgForums = []
      if (!membershipError && userMemberships?.length > 0) {
        const orgIds = userMemberships.map(m => m.organization_id)
        console.log('Fetching org forums for orgIds:', orgIds)
        const { data: forumsData } = await supabase
          .from('forums')
          .select('*')
          .in('org_id', orgIds)
          .eq('type', 'org')
        
        orgForums = forumsData || []
        console.log('Org forums found:', orgForums)
      }

      const extractStoragePath = (value) => {
        if (!value || typeof value !== 'string') return null
        if (!value.startsWith('http')) return value
        const bucketMarker = 'bonded-media/'
        const index = value.indexOf(bucketMarker)
        if (index === -1) return value
        return value.slice(index + bucketMarker.length).split('?')[0]
      }

      if (orgForums.length > 0) {
        const orgIds = [...new Set(orgForums.map((forum) => forum.org_id).filter(Boolean))]
        if (orgIds.length > 0) {
          const { data: orgsData } = await supabase
            .from('organizations')
            .select('id, name, logo_url')
            .in('id', orgIds)

          const orgMap = {}
          if (orgsData?.length) {
            const orgEntries = await Promise.all(
              orgsData.map(async (org) => {
                let logoUrl = null
                if (org.logo_url) {
                  const path = extractStoragePath(org.logo_url)
                  if (path && !path.startsWith('http')) {
                    try {
                      logoUrl = await createSignedUrlForPath(path)
                    } catch (error) {
                      logoUrl = null
                    }
                  } else {
                    logoUrl = path
                  }
                }
                return { ...org, logo_url: logoUrl }
              })
            )

            orgEntries.forEach((org) => {
              orgMap[org.id] = org
            })
          }

          orgForums = orgForums.map((forum) => ({
            ...forum,
            image: orgMap[forum.org_id]?.logo_url || forum.image || null,
            orgName: orgMap[forum.org_id]?.name || forum.orgName || null,
          }))
        }
      }

      // Fetch class forums based on enrollments
      let classForums = []
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('user_class_enrollments')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (enrollmentError) {
        console.warn('Failed to fetch class enrollments:', enrollmentError)
      } else {
        const classIds = [...new Set((enrollments || []).map((row) => row.class_id).filter(Boolean))]
        if (classIds.length > 0) {
          const { data: classForumData, error: classForumError } = await supabase
            .from('forums')
            .select('*')
            .in('class_id', classIds)
            .eq('type', 'class')

          if (classForumError) {
            console.warn('Failed to fetch class forums:', classForumError)
          } else {
            classForums = classForumData || []
          }
        }
      }

      // Combine forums
      const allForums = [
        ...(mainForum ? [mainForum] : []),
        ...(campusForum ? [campusForum] : []),
        ...orgForums,
        ...classForums,
      ]

      const uniqueForums = Array.from(
        new Map(allForums.filter(Boolean).map((forum) => [forum.id, forum])).values()
      )

      console.log('All forums combined:', uniqueForums)

      const memberCountsMap = {}

      // Campus/main forums: count all users in the university
      if (profile?.university_id) {
        const { count: universityUserCount, error: universityCountError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('university_id', profile.university_id)

        if (!universityCountError) {
          uniqueForums.forEach((forum) => {
            if (forum.type === 'campus' || forum.type === 'main') {
              memberCountsMap[forum.id] = universityUserCount || 0
            }
          })
        }
      }

      // Class forums: count enrolled students
      const classForumsForCount = uniqueForums.filter((forum) => forum.type === 'class' && forum.class_id)
      for (const forum of classForumsForCount) {
        const { count, error: classCountError } = await supabase
          .from('user_class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', forum.class_id)
          .eq('is_active', true)

        if (!classCountError) {
          memberCountsMap[forum.id] = count || 0
        }
      }

      // Org forums: count org members
      const orgForumsForCount = uniqueForums.filter((forum) => forum.type === 'org' && forum.org_id)
      for (const forum of orgForumsForCount) {
        let orgMemberCount = 0
        let orgCountError = null
        ;({ count: orgMemberCount, error: orgCountError } = await supabase
          .from('org_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', forum.org_id)
          .in('role', ['member', 'admin', 'owner']))

        if (orgCountError?.code === '42703') {
          ;({ count: orgMemberCount, error: orgCountError } = await supabase
            .from('org_members')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', forum.org_id)
            .in('role', ['member', 'admin', 'owner']))
        }

        if (!orgCountError) {
          memberCountsMap[forum.id] = orgMemberCount || 0
        }
      }

      const nextForums = uniqueForums.map((forum) => {
        const fallbackCount = forum.member_count ?? forum.memberCount ?? 0
        const memberCount = memberCountsMap[forum.id] ?? fallbackCount
        return { ...forum, memberCount }
      })

      setForums(nextForums)

      const nextCurrentForum = currentForum
        ? nextForums.find((forum) => forum.id === currentForum.id)
        : null

      if (nextCurrentForum) {
        setCurrentForum(nextCurrentForum)
      } else if (!currentForum && nextForums.length > 0) {
        setCurrentForum(nextForums[0])
      }

    } catch (err) {
      console.error('Error fetching forums:', err)
      setError(err.message)
    } finally {
      fetchInFlightRef.current = false
      setLoading(false)
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          fetchForums()
        } else if (event === 'SIGNED_OUT') {
          setForums([])
          setCurrentForum(null)
          setLoading(false)
          setError(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchForums()
  }, [user?.id])

  // Realtime refresh on membership/enrollment changes
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`forums-memberships-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'org_members', filter: `user_id=eq.${user.id}` },
        () => {
          fetchForums()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_class_enrollments', filter: `user_id=eq.${user.id}` },
        () => {
          fetchForums()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Switch to a specific forum
  const switchToForum = (forumId) => {
    const forum = forums.find(f => f.id === forumId)
    if (forum) {
      setCurrentForum(forum)
    }
  }

  // Refresh forums data
  const refreshForums = () => {
    fetchForums()
  }

  const value = {
    forums,
    currentForum,
    loading,
    error,
    switchToForum,
    refreshForums,
    fetchForums
  }

  return (
    <UnifiedForumContext.Provider value={value}>
      {children}
    </UnifiedForumContext.Provider>
  )
}

export const useUnifiedForum = () => {
  const context = useContext(UnifiedForumContext)
  if (!context) {
    throw new Error('useUnifiedForum must be used within UnifiedForumProvider')
  }
  return context
}
