/**
 * Schedule Parser Service
 * Handles parsing of class schedules from various formats:
 * - iCal (.ics) files
 * - CSV files
 * - Screenshots (via OCR - future)
 * - Manual entry
 */

/**
 * Parse iCal file (.ics format)
 * Common format exported by university course systems
 */
export function parseICalFile(icsContent) {
  const classes = []
  const lines = icsContent.split('\n')

  let currentClass = null
  let inEvent = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      currentClass = {
        class_code: '',
        class_name: '',
        professor: '',
        days_of_week: [],
        start_time: null,
        end_time: null,
        location: '',
        semester: '',
        section: ''
      }
    } else if (line === 'END:VEVENT') {
      if (currentClass && currentClass.class_code) {
        classes.push(currentClass)
      }
      inEvent = false
      currentClass = null
    } else if (inEvent && currentClass) {
      // Parse iCal properties
      if (line.startsWith('SUMMARY:')) {
        // Summary usually contains class name and code
        const summary = line.substring(8)
        const match = summary.match(/([A-Z]{2,4}\s+\d{3}[A-Z]?)\s+(.+)/)
        if (match) {
          currentClass.class_code = match[1].trim()
          currentClass.class_name = match[2].trim()
        } else {
          currentClass.class_name = summary
        }
      } else if (line.startsWith('DESCRIPTION:')) {
        // Description might contain professor info
        const desc = line.substring(12)
        const profMatch = desc.match(/Instructor[:\s]+([^\n]+)/i)
        if (profMatch) {
          currentClass.professor = profMatch[1].trim()
        }
      } else if (line.startsWith('LOCATION:')) {
        currentClass.location = line.substring(9).trim()
      } else if (line.startsWith('DTSTART:')) {
        // Parse start date/time
        const dtstart = line.substring(8)
        const dateMatch = dtstart.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)
        if (dateMatch) {
          const [, year, month, day, hour, minute] = dateMatch
          currentClass.start_time = `${hour}:${minute}`
          // Determine day of week
          const date = new Date(year, month - 1, day)
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          const dayName = dayNames[date.getDay()]
          if (!currentClass.days_of_week.includes(dayName)) {
            currentClass.days_of_week.push(dayName)
          }
        }
      } else if (line.startsWith('DTEND:')) {
        // Parse end date/time
        const dtend = line.substring(6)
        const dateMatch = dtend.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)
        if (dateMatch) {
          const [, , , , hour, minute] = dateMatch
          currentClass.end_time = `${hour}:${minute}`
        }
      } else if (line.startsWith('RRULE:')) {
        // Recurring rule - extract days
        const rrule = line.substring(6)
        const bydayMatch = rrule.match(/BYDAY=([^;]+)/)
        if (bydayMatch) {
          const days = bydayMatch[1].split(',')
          const dayMap = {
            'MO': 'Monday',
            'TU': 'Tuesday',
            'WE': 'Wednesday',
            'TH': 'Thursday',
            'FR': 'Friday',
            'SA': 'Saturday',
            'SU': 'Sunday'
          }
          currentClass.days_of_week = days.map(d => dayMap[d] || d).filter(Boolean)
        }
      }
    }
  }

  return classes
}

/**
 * Parse CSV schedule file
 * Common format: Class Code, Class Name, Professor, Days, Time, Location
 */
export function parseCSVFile(csvContent) {
  const classes = []
  const lines = csvContent.split('\n').filter(line => line.trim())

  // Skip header row if present
  const startIndex = lines[0].toLowerCase().includes('class') ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Parse CSV (handle quoted fields)
    const fields = parseCSVLine(line)

    if (fields.length < 2) continue

    const classObj = {
      class_code: fields[0]?.trim() || '',
      class_name: fields[1]?.trim() || '',
      professor: fields[2]?.trim() || '',
      days_of_week: parseDays(fields[3] || ''),
      start_time: parseTime(fields[4] || ''),
      end_time: parseTime(fields[5] || ''),
      location: fields[6]?.trim() || '',
      section: fields[7]?.trim() || ''
    }

    if (classObj.class_code) {
      classes.push(classObj)
    }
  }

  return classes
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const fields = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField)
      currentField = ''
    } else {
      currentField += char
    }
  }

  fields.push(currentField) // Add last field
  return fields
}

/**
 * Parse days string (e.g., "MWF", "Mon Wed Fri", "Monday, Wednesday, Friday")
 */
function parseDays(daysStr) {
  if (!daysStr) return []

  const dayMap = {
    'M': 'Monday',
    'T': 'Tuesday',
    'W': 'Wednesday',
    'R': 'Thursday',
    'F': 'Friday',
    'S': 'Saturday',
    'U': 'Sunday',
    'MON': 'Monday',
    'TUE': 'Tuesday',
    'WED': 'Wednesday',
    'THU': 'Thursday',
    'FRI': 'Friday',
    'SAT': 'Saturday',
    'SUN': 'Sunday'
  }

  const days = []
  const upper = daysStr.toUpperCase().trim()

  // Handle comma-separated
  if (upper.includes(',')) {
    const parts = upper.split(',').map(p => p.trim())
    parts.forEach(part => {
      const day = dayMap[part] || part
      if (day && !days.includes(day)) {
        days.push(day)
      }
    })
  } else {
    // Handle abbreviations like "MWF"
    for (const char of upper) {
      const day = dayMap[char]
      if (day && !days.includes(day)) {
        days.push(day)
      }
    }

    // Handle full names
    if (days.length === 0) {
      Object.values(dayMap).forEach(day => {
        if (upper.includes(day.toUpperCase())) {
          days.push(day)
        }
      })
    }
  }

  return days
}

/**
 * Parse time string (e.g., "9:00 AM", "14:30", "9:00-10:30")
 */
function parseTime(timeStr) {
  if (!timeStr) return null

  // Handle time range (e.g., "9:00-10:30")
  if (timeStr.includes('-')) {
    const [start] = timeStr.split('-')
    return parseTime(start.trim())
  }

  // Remove AM/PM and parse
  const cleaned = timeStr.replace(/\s*(AM|PM)\s*/i, '').trim()
  const match = cleaned.match(/(\d{1,2}):(\d{2})/)

  if (match) {
    let hours = parseInt(match[1])
    const minutes = parseInt(match[2])

    // Handle 12-hour format
    if (timeStr.toUpperCase().includes('PM') && hours !== 12) {
      hours += 12
    } else if (timeStr.toUpperCase().includes('AM') && hours === 12) {
      hours = 0
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  return null
}

import { extractTextFromImage } from '../utils/ocr/extractText'
import { parseSchedule } from '../utils/schedule/parseSchedule'

/**
 * Parse screenshot/image using production-ready OCR and spatial parsing
 * 
 * @param imageUri - Local URI of the image
 * @returns Structured class data compatible with the app's internal format
 */
export async function parseScheduleImage(imageUri) {
  try {
    console.log('🚀 Starting schedule OCR and parsing for:', imageUri)

    // 1. Extract text and blocks using ML Kit (production) or Cloud fallback
    const ocrResult = await extractTextFromImage(imageUri)

    if (!ocrResult || !ocrResult.rawText) {
      throw new Error('No text could be extracted from this image. Please try a clearer photo or manual entry.')
    }

    // 2. Parse text blocks spatially into structured course drafts
    const parsed = parseSchedule(ocrResult)

    if (!parsed || parsed.courses.length === 0) {
      throw new Error('No classes found in the image. Please ensure the schedule is clearly visible.')
    }

    // 3. Convert CourseDraft format to the legacy class_code/class_name format used by saveSchedule
    // This ensures compatibility with existing database hooks
    return parsed.courses.map(course => ({
      class_code: course.courseCode,
      class_name: course.courseCode, // Parser usually only gets code + section
      professor: course.components[0]?.professor || '',
      days_of_week: course.components[0]?.days || [],
      start_time: course.components[0]?.startTime || null,
      end_time: course.components[0]?.endTime || null,
      location: course.components[0]?.location || '',
      section: course.sectionId
    }))

  } catch (error) {
    console.error('❌ Schedule parsing failed:', error)
    throw error
  }
}

/**
 * Validate parsed class data
 */
export function validateClassData(classData) {
  const errors = []

  if (!classData.class_code || classData.class_code.trim() === '') {
    errors.push('Class code is required')
  }

  if (!classData.class_name || classData.class_name.trim() === '') {
    errors.push('Class name is required')
  }

  if (classData.days_of_week && classData.days_of_week.length === 0) {
    errors.push('At least one day of week is required')
  }

  if (classData.start_time && !isValidTime(classData.start_time)) {
    errors.push('Invalid start time format')
  }

  if (classData.end_time && !isValidTime(classData.end_time)) {
    errors.push('Invalid end time format')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

function isValidTime(time) {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

/**
 * Normalize class code (e.g., "CS 201" -> "CS201", "cs-201" -> "CS201")
 */
export function normalizeClassCode(classCode) {
  if (!classCode) return ''

  // Remove spaces, dashes, convert to uppercase
  return classCode
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .toUpperCase()
}
