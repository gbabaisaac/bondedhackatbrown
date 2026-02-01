import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { isSuperAdminEmail } from '../utils/admin'
import { isRlsRecursionError } from '../utils/rlsHelpers'
import { createSignedUrlForPath } from '../helpers/mediaStorage'

/**
 * Hook to fetch forums for the current user's university
 * Returns forums the user can access based on RLS policies
 */
export function useForums() {
  const { user } = useAuthStore()
  
  return useQuery({
    queryKey: ['forums', user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('User must be authenticated to view forums')
      }

      const isSuperAdmin = isSuperAdminEmail(user?.email)
      let universityId = null

      if (!isSuperAdmin) {
        // Get user's university_id first to filter forums
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('university_id')
          .eq('id', user.id)
          .single()

        if (profileError) {
          if (isRlsRecursionError(profileError)) {
            console.warn('⚠️ RLS recursion detected on profiles – cannot resolve university_id')
          } else {
            console.error('Error fetching user profile:', profileError)
            console.error('User ID:', user.id)
          }
        }

        universityId = userProfile?.university_id || null
      }

      if (!universityId && !isSuperAdmin) {
        console.warn('User has no university_id, cannot fetch forums')
        console.warn('User ID:', user.id)
        console.warn('User may need to complete onboarding to set university')
        return []
      }

      if (isSuperAdmin) {
        console.log('Fetching forums as super admin')
      } else {
        console.log('Fetching forums for university_id:', universityId)
      }

      // Fetch forums for the user's university
      // Campus forums (type='campus') are visible to all students in the university
      const selectWithOrg = `
        id,
        name,
        type,
        description,
        university_id,
        class_id,
        org_id,
        created_at,
        class:classes(
          id,
          class_code,
          class_name
        )
      `
      const selectWithoutOrg = `
        id,
        name,
        type,
        description,
        university_id,
        class_id,
        created_at,
        class:classes(
          id,
          class_code,
          class_name
        )
      `

      const buildForumsQuery = (selectFields) => {
        let query = supabase
          .from('forums')
          .select(selectFields)
          .order('type', { ascending: true }) // Campus forums first
          .order('created_at', { ascending: false })

        if (!isSuperAdmin) {
          query = query.eq('university_id', universityId) // Only forums from user's university
        }

        return query
      }

      let { data, error } = await buildForumsQuery(selectWithOrg)
      if (error?.message?.includes('org_id')) {
        ;({ data, error } = await buildForumsQuery(selectWithoutOrg))
      }

      if (error) {
        console.error('Error fetching forums:', error)
        console.error('University ID used:', universityId)
        throw error
      }

      // Auto-seed a default campus forum if none exists for this university
      if (!isSuperAdmin && universityId && (!data || data.length === 0)) {
        console.warn('⚠️ No forums found for university. Seeding default "Main" forum…')
        const { data: seededForum, error: seedError } = await supabase
          .from('forums')
          .insert({
            name: 'Main',
            type: 'campus',
            description: 'Main campus forum',
            university_id: universityId,
            is_public: true,
          })
          .select(selectWithoutOrg)
          .single()

        if (seedError) {
          console.error('❌ Failed to seed default campus forum:', seedError)
          console.error('Seed error details:', JSON.stringify(seedError, null, 2))
        } else if (seededForum) {
          console.log('✅ Seeded default "Main" forum:', seededForum.id)
          data = [seededForum]
        }
      }

      console.log(`✅ Fetched ${data?.length || 0} forums for university ${universityId}`)

      // Restrict org forums to membership only (prevents private org forums from leaking)
      let userOrgIds = []
      try {
        const { data: memberships, error: membershipError } = await supabase
          .from('org_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .in('role', ['member', 'admin', 'owner'])

        if (!membershipError) {
          userOrgIds = memberships?.map((m) => m.organization_id).filter(Boolean) || []
        }
      } catch (membershipError) {
        // If org membership reads are blocked, hide org forums by default.
        userOrgIds = []
      }

      data = (data || []).filter((forum) => {
        if (forum.type !== 'org') return true
        if (!forum.org_id) return false
        return userOrgIds.includes(forum.org_id)
      })

      // Fetch org data separately if org_id exists (since there's no FK relationship)
      const orgIds = [...new Set((data || []).filter(f => f.org_id).map(f => f.org_id))]
      let orgsMap = {}
      
      const extractStoragePath = (value) => {
        if (!value || typeof value !== 'string') return null
        if (!value.startsWith('http')) return value
        const bucketMarker = 'bonded-media/'
        const index = value.indexOf(bucketMarker)
        if (index === -1) return value
        return value.slice(index + bucketMarker.length).split('?')[0]
      }

      if (orgIds.length > 0) {
        const { data: orgsData } = await supabase
          .from('organizations')
          .select('id, name, logo_url')
          .in('id', orgIds)
        
        if (orgsData) {
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
              return {
                ...org,
                logo_url: logoUrl,
              }
            })
          )

          orgsMap = orgEntries.reduce((acc, org) => {
            acc[org.id] = org
            return acc
          }, {})
        }
      }

      // universityId already fetched above

      // Fetch post counts for all forums (more efficient with count queries)
      const forumIds = (data || []).map(f => f.id)
      const postCountsMap = {}
      
      if (forumIds.length > 0) {
        // Use count queries for each forum (Supabase doesn't support GROUP BY easily)
        // For better performance, we'll batch count queries
        const countPromises = forumIds.map(async (forumId) => {
          const { count, error } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('forum_id', forumId)
            .is('deleted_at', null)
          
          if (!error && count !== null) {
            postCountsMap[forumId] = count
          } else {
            postCountsMap[forumId] = 0
          }
        })
        
        await Promise.all(countPromises)
      }

      // Fetch member counts
      const memberCountsMap = {}
      
      // For campus forums: count all users in the university
      if (isSuperAdmin) {
        const universityIds = [...new Set((data || []).map((forum) => forum.university_id).filter(Boolean))]
        if (universityIds.length > 0) {
          const universityCounts = await Promise.all(
            universityIds.map(async (id) => {
              const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('university_id', id)
              return { id, count: count || 0 }
            })
          )

          const universityCountsMap = universityCounts.reduce((acc, entry) => {
            acc[entry.id] = entry.count
            return acc
          }, {})

          data?.forEach((forum) => {
            if (forum.type === 'campus') {
              memberCountsMap[forum.id] = universityCountsMap[forum.university_id] || 0
            }
          })
        }
      } else if (universityId) {
        const { count: universityUserCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('university_id', universityId)
        
        // Apply to all campus forums
        data?.forEach(forum => {
          if (forum.type === 'campus') {
            memberCountsMap[forum.id] = universityUserCount || 0
          }
        })
      }

      // For class forums: count enrolled students
      const classForumIds = (data || []).filter(f => f.type === 'class' && f.class_id).map(f => f.id)
      if (classForumIds.length > 0) {
        const classForums = data.filter(f => f.type === 'class' && f.class_id)
        for (const forum of classForums) {
          if (forum.class_id) {
            try {
              const { count: enrolledCount, error: enrollmentError } = await supabase
                .from('user_class_enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', forum.class_id)
                .eq('is_active', true)

              if (enrollmentError) {
                if (isRlsRecursionError(enrollmentError)) {
                  console.warn('⚠️ RLS recursion on user_class_enrollments - skipping class member count')
                } else {
                  console.error('Error fetching class enrollment count:', enrollmentError)
                }
                memberCountsMap[forum.id] = memberCountsMap[forum.id] || 0
              } else {
                memberCountsMap[forum.id] = enrolledCount || 0
              }
            } catch (countError) {
              console.warn('⚠️ Failed to fetch class enrollment count, defaulting to 0')
              memberCountsMap[forum.id] = memberCountsMap[forum.id] || 0
            }
          }
        }
      }

      // For org forums: count org members
      const orgForumIds = (data || []).filter(f => f.type === 'org' && f.org_id).map(f => f.id)
      if (orgForumIds.length > 0) {
        const orgForums = data.filter(f => f.type === 'org' && f.org_id)
        for (const forum of orgForums) {
          if (forum.org_id) {
            try {
              let orgMemberCount = 0
              let orgCountError = null
              ;({ count: orgMemberCount, error: orgCountError } = await supabase
                .from('org_members')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', forum.org_id)
                .in('role', ['member', 'admin']))

              if (orgCountError?.code === '42703') {
                ;({ count: orgMemberCount, error: orgCountError } = await supabase
                  .from('org_members')
                  .select('*', { count: 'exact', head: true })
                  .eq('org_id', forum.org_id)
                  .in('role', ['member', 'admin']))
              }

              if (orgCountError) {
                if (isRlsRecursionError(orgCountError)) {
                  console.warn('⚠️ RLS recursion on org_members - skipping org member count')
                } else {
                  console.error('Error fetching org member count:', orgCountError)
                }
                memberCountsMap[forum.id] = memberCountsMap[forum.id] || 0
              } else {
                memberCountsMap[forum.id] = orgMemberCount || 0
              }
            } catch (countError) {
              console.warn('⚠️ Failed to fetch org member count, defaulting to 0')
              memberCountsMap[forum.id] = memberCountsMap[forum.id] || 0
            }
          }
        }
      }

      // Transform data to match Forum component expectations
      // Sort to ensure campus forums appear first
      const sortedForums = [...(data || [])].sort((a, b) => {
        // Campus forums first
        if (a.type === 'campus' && b.type !== 'campus') return -1
        if (a.type !== 'campus' && b.type === 'campus') return 1
        // Then by created_at
        return new Date(b.created_at) - new Date(a.created_at)
      })

      return sortedForums.map((forum) => ({
        id: forum.id,
        name: forum.name,
        type: forum.type,
        description: forum.description,
        universityId: forum.university_id,
        code: forum.class?.class_code || null,
        image: forum.org_id ? (orgsMap[forum.org_id]?.logo_url || null) : null,
        memberCount: memberCountsMap[forum.id] || 0,
        postCount: postCountsMap[forum.id] || 0,
        unreadCount: 0, // TODO: Calculate unread posts for user
        isPinned: forum.type === 'campus', // Main campus forum is pinned and visible to all students
      }))
    },
    enabled: !!user, // Only run if user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes (forums don't change often)
    retry: 1,
  })
}
