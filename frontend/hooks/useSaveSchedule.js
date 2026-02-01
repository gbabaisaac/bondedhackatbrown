/**
 * Hook to save schedule data and create section chats
 * Handles course/section/component creation and chat setup
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useSaveSchedule() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ courses, selectedSections, universityId }) => {
      try {
        if (!user?.id) {
          throw new Error('User must be authenticated to save schedule')
        }

        if (!universityId) {
          throw new Error('University ID is required')
        }

        const sectionKeys = new Set(selectedSections)
        console.log(`📋 Saving schedule: ${courses.length} courses, ${selectedSections.length} selected sections`)
        console.log(`📋 Selected sections:`, Array.from(sectionKeys))

      let displayName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.username ||
        user?.email?.split('@')[0] ||
        'Someone'

      let preferences = {
        autoJoinCourseForums: true,
        autoJoinSectionChats: true,
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('forum_preferences, full_name, username')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.warn('⚠️ Could not load forum preferences, using defaults:', profileError)
        } else if (profileData) {
          displayName = profileData.full_name || profileData.username || displayName
          if (profileData.forum_preferences) {
            preferences = {
              ...preferences,
              ...profileData.forum_preferences,
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not load forum preferences (exception), using defaults:', err)
      }

      const semester = getCurrentSemester()
      const termCode = getCurrentTermCode()

      // Process each course
      for (const course of courses) {
        // Clean course code FIRST - extract just the base code (e.g., "CSC 305")
        // This ensures all sections of the same course use the same class_code
        let cleanCourseCode = course.courseCode.trim()
        // Remove duplicates like "CSC 305 – CSC 305" -> "CSC 305"
        if (cleanCourseCode.includes(' – ')) {
          cleanCourseCode = cleanCourseCode.split(' – ')[0].trim()
        }
        if (cleanCourseCode.includes(' - ')) {
          cleanCourseCode = cleanCourseCode.split(' - ')[0].trim()
        }
        // Handle parenthetical duplicates like "CSC 305 (CSC 305)"
        const parenMatch = cleanCourseCode.match(/^([A-Z]{2,4}\s*\d{3}[A-Z]?)\s*\(/)
        if (parenMatch) {
          cleanCourseCode = parenMatch[1].trim()
        }
        // Final cleanup - just get the course code pattern
        const codeMatch = cleanCourseCode.match(/^([A-Z]{2,4}\s*\d{3}[A-Z]?)/)
        if (codeMatch) {
          cleanCourseCode = codeMatch[1].trim()
        }
        
        console.log(`📚 Processing course: ${course.courseCode} -> cleaned: ${cleanCourseCode}, sectionId: ${course.sectionId}`)
        
        // 1. Find or create class
        // Using classes table (not courses) with CLEANED class_code
        // This ensures all sections of the same course share one class record
        let { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id')
          .eq('university_id', universityId)
          .eq('class_code', cleanCourseCode)
          .maybeSingle()

        if (classError && classError.code !== 'PGRST116') {
          // PGRST116 = no rows found, which is fine
          console.error('Error finding class:', classError)
          throw classError
        }

        let classId
        if (!classData) {
          // Create class with CLEANED class_code
          const { data: newClass, error: createError } = await supabase
            .from('classes')
            .insert({
              university_id: universityId,
              class_code: cleanCourseCode,
              class_name: course.courseName || cleanCourseCode,
            })
            .select('id')
            .single()

          if (createError) {
            console.error('Error creating class:', createError)
            throw createError
          }
          classId = newClass.id
        } else {
          classId = classData.id
        }

        // 2. Find or create section
        // Note: Using class_sections table (not sections) and class_id (not course_id)
        // The section_code is stored in the section data, but class_sections uses different structure
        // We'll match by class_id and create if needed
        let { data: sectionData, error: sectionError } = await supabase
          .from('class_sections')
          .select('id')
          .eq('class_id', classId)
          .eq('section_number', course.sectionId)
          .eq('term_code', termCode)
          .maybeSingle()

        if (sectionError && sectionError.code !== 'PGRST116') {
          console.error('Error finding section:', sectionError)
          throw sectionError
        }

        let sectionId
        if (!sectionData) {
          // Create section - class_sections table structure from useClassMatching.js
          // Get the first lecture component for section details
          const lectureComponent = course.components.find((c) => c.type === 'Lecture') || course.components[0]
          const { data: newSection, error: createError } = await supabase
            .from('class_sections')
            .insert({
              class_id: classId,
              section_number: course.sectionId,
              professor_name: course.professor || null,
              semester,
              term_code: termCode,
              days_of_week: lectureComponent?.days || [],
              start_time: lectureComponent?.startTime || null,
              end_time: lectureComponent?.endTime || null,
              location: lectureComponent?.location || null,
            })
            .select('id')
            .single()

          if (createError) {
            console.error('Error creating section:', createError)
            throw createError
          }
          sectionId = newSection.id
        } else {
          sectionId = sectionData.id
        }

        // 3. Section data is set once during creation (step 2)
        // We don't update it afterwards to avoid overwriting existing data
        // This ensures consistent section data regardless of which student uploads their schedule first

        // 4. Add user to section enrollment (if not already enrolled)
        // Using user_class_enrollments table (not section_members)
        const { error: memberError } = await supabase
          .from('user_class_enrollments')
          .insert({
            user_id: user.id,
            class_id: classId,
            section_id: sectionId,
            semester,
            term_code: termCode,
            is_active: true,
          })
          .select()
          .single()

        // Ignore duplicate key errors (user already enrolled)
        if (memberError && memberError.code !== '23505') {
          console.error('Error adding user to class enrollment:', memberError)
          throw memberError
        }

        // 5. Ensure class forum exists for this course at user's university
        // cleanCourseCode was already computed at the start of the loop
        // This is what makes the class appear in the sidebar
        // IMPORTANT: Create forum for ALL courses, not just selected sections
        // RESPECT: Check user's forum preferences before auto-joining
        try {
          const { data: existingForum } = await supabase
            .from('forums')
            .select('id')
            .eq('class_id', classId)
            .eq('type', 'class')
            .maybeSingle()

          let forumId
          if (!existingForum) {
            // Create class forum
            const { data: newForum, error: forumError } = await supabase
              .from('forums')
              .insert({
                name: cleanCourseCode,
                type: 'class',
                university_id: universityId,
                class_id: classId,
                description: `Forum for ${cleanCourseCode}`,
                is_public: false,
              })
              .select('id')
              .single()

            if (forumError && forumError.code !== '23505') {
              console.error('Error creating class forum:', forumError)
            } else if (newForum) {
              forumId = newForum.id
              console.log(`✅ Created class forum for ${cleanCourseCode} (ID: ${forumId})`)
              
              // Auto-add user to forum if preferences allow
              if (preferences.autoJoinCourseForums) {
                await supabase
                  .from('forum_members')
                  .insert({
                    forum_id: forumId,
                    user_id: user.id,
                    role: 'member'
                  })
                  .select()
                  .single()
                console.log(`✅ Auto-added user to course forum for ${cleanCourseCode}`)
              } else {
                console.log(`⚠️ User opted out of auto-joining course forum for ${cleanCourseCode}`)
              }
            }
          } else {
            forumId = existingForum.id
            console.log(`✅ Class forum already exists for ${cleanCourseCode}`)
            
            // Add user to existing forum if preferences allow and not already member
            if (preferences.autoJoinCourseForums) {
              const { data: existingMembership } = await supabase
                .from('forum_members')
                .select('id')
                .eq('forum_id', forumId)
                .eq('user_id', user.id)
                .maybeSingle()
              
              if (!existingMembership) {
                await supabase
                  .from('forum_members')
                  .insert({
                    forum_id: forumId,
                    user_id: user.id,
                    role: 'member'
                  })
                  .select()
                  .single()
                console.log(`✅ Added user to existing course forum for ${cleanCourseCode}`)
              }
            }
          }
        } catch (forumErr) {
          console.error('Exception creating forum:', forumErr)
          // Continue - don't block enrollment
        }

        // 6. If section is selected and has a Lecture component, ensure group chat exists and user is added
        // IMPORTANT: Use original courseCode for sectionKey to match what ScheduleConfirmStep uses
        const sectionKey = `${course.courseCode}-${course.sectionId}`
        const hasLecture = course.components.some((c) => c.type === 'Lecture')
        
        // Debug logging
        console.log(`🔍 Checking section: ${sectionKey}, hasLecture: ${hasLecture}, in selectedSections: ${sectionKeys.has(sectionKey)}`)

        if (sectionKeys.has(sectionKey) && hasLecture) {
          try {
            // Create or find group conversation for this section
            // Link to section via conversations.class_section_id (recommended)
            // Use clean course code for chat name
            const chatName = `${cleanCourseCode} Section ${course.sectionId}`
            
            // Check if conversation already exists
            const { data: existingConv, error: checkError } = await supabase
              .from('conversations')
              .select('id')
              .eq('type', 'group')
              .eq('class_section_id', sectionId)
              .maybeSingle()

            if (checkError && checkError.code !== 'PGRST116') {
              console.error('Error checking for existing conversation:', checkError)
            }

            let conversationId
            if (existingConv) {
              conversationId = existingConv.id
              console.log(`✅ Found existing chat for ${chatName} (ID: ${conversationId})`)
              
              // Add user to existing chat if preferences allow and not already participant
              if (preferences.autoJoinSectionChats) {
                const { data: existingParticipant } = await supabase
                  .from('conversation_participants')
                  .select('conversation_id')
                  .eq('conversation_id', conversationId)
                  .eq('user_id', user.id)
                  .maybeSingle()
                
                if (!existingParticipant) {
                  const { error: participantError } = await supabase
                    .from('conversation_participants')
                    .insert({
                      conversation_id: conversationId,
                      user_id: user.id,
                    })
                  
                  if (!participantError) {
                    await supabase.from('messages').insert({
                      conversation_id: conversationId,
                      sender_id: user.id,
                      content: `${displayName} joined the chat`,
                      metadata: { type: 'system', action: 'joined' },
                    })
                    console.log(`✅ Added user to existing section chat ${chatName}`)
                  } else {
                    console.error('Error adding user to existing chat:', participantError)
                  }
                } else {
                  console.log(`✅ User already in section chat ${chatName}`)
                }
              } else {
                console.log(`⚠️ User opted out of auto-joining section chat for ${chatName}`)
              }
            } else {
              // Create new group conversation for this section
              const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert({
                  type: 'group',
                  name: chatName,
                  created_by: user.id,
                  class_section_id: sectionId,
                })
                .select('id')
                .single()

              if (convError) {
                console.error('Error creating section chat:', convError)
              } else if (newConv) {
                conversationId = newConv.id
                console.log(`✅ Created section chat for ${chatName} (ID: ${conversationId})`)
                
                // Auto-add user to new chat if preferences allow
                if (preferences.autoJoinSectionChats) {
                  const { error: participantError } = await supabase
                    .from('conversation_participants')
                    .insert({
                      conversation_id: conversationId,
                      user_id: user.id,
                    })
                  
                  if (!participantError) {
                    console.log(`✅ Auto-added user to new section chat ${chatName}`)
                  } else {
                    console.error('Error adding user to new chat:', participantError)
                  }
                } else {
                  console.log(`⚠️ User opted out of auto-joining new section chat for ${chatName}`)
                }
              }
            }
          } catch (chatErr) {
            console.error('Exception creating section chat:', chatErr)
            // Continue - don't block enrollment
          }
        } else {
          console.log(`⏭️ Skipping chat creation for ${sectionKey} - not selected or no lecture`)
        }

      }

        console.log('✅ Finished saving schedule')
        return { success: true }
      } catch (err) {
        console.error('❌ Schedule save failed:', err)
        throw err
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      queryClient.invalidateQueries({ queryKey: ['forums'] }) // Refresh sidebar
      console.log('✅ Schedule saved successfully')
    },
    retry: 1,
  })
}

function getCurrentSemester() {
  const now = new Date()
  const month = now.getMonth() // 0-11
  const year = now.getFullYear()

  if (month >= 0 && month <= 4) {
    return `Spring ${year}`
  }
  if (month >= 5 && month <= 7) {
    return `Summer ${year}`
  }
  return `Fall ${year}`
}

function getCurrentTermCode() {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  if (month >= 0 && month <= 4) {
    return `${year}SP`
  }
  if (month >= 5 && month <= 7) {
    return `${year}SU`
  }
  return `${year}FA`
}
