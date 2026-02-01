/**
 * Deterministic Schedule Parser
 * 
 * Parses OCR-extracted text into structured course data
 * Groups text blocks by bounding box proximity
 * Infers course codes, sections, component types, days, and times
 * 
 * Rules:
 * - Only ONE chat per SECTION (not per component)
 * - Never auto-create chats for lectures, labs, recitations, or PRO sections
 * - Components are stored as metadata only
 */

import { TextBlock } from '../ocr/extractText'

export type ComponentType = 'Lecture' | 'Lab' | 'Recitation' | 'PRO'

export interface ComponentDraft {
  type: ComponentType
  days: string[] // e.g., ['Monday', 'Wednesday', 'Friday']
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  location: string
}

export interface CourseDraft {
  courseCode: string // e.g., "CSC 305"
  sectionId: string // e.g., "0002"
  components: ComponentDraft[]
}

export interface ParsedSchedule {
  courses: CourseDraft[]
  rawText: string
}

/**
 * Parse schedule from OCR text blocks
 */
export function parseSchedule(ocrResult: { rawText: string; blocks: TextBlock[] }): ParsedSchedule {
  const { rawText, blocks } = ocrResult

  // Group blocks by proximity (rows/columns)
  const groupedBlocks = groupBlocksByProximity(blocks)

  // Extract courses from grouped blocks
  const courses = extractCourses(groupedBlocks)

  return {
    courses,
    rawText,
  }
}

/**
 * Group text blocks by spatial proximity
 * Assumes schedule is in a grid format
 */
function groupBlocksByProximity(blocks: TextBlock[]): TextBlock[][] {
  if (blocks.length === 0) return []

  // Sort blocks by Y position (top to bottom)
  const sortedBlocks = [...blocks].sort((a, b) => a.boundingBox.y - b.boundingBox.y)

  const rows: TextBlock[][] = []
  const ROW_THRESHOLD = 30 // pixels - blocks within this Y distance are in same row

  for (const block of sortedBlocks) {
    // Find existing row within threshold
    let addedToRow = false
    for (const row of rows) {
      const avgY = row.reduce((sum, b) => sum + b.boundingBox.y, 0) / row.length
      if (Math.abs(block.boundingBox.y - avgY) < ROW_THRESHOLD) {
        row.push(block)
        addedToRow = true
        break
      }
    }

    // Create new row if not added
    if (!addedToRow) {
      rows.push([block])
    }
  }

  // Sort each row by X position (left to right)
  return rows.map((row) => row.sort((a, b) => a.boundingBox.x - b.boundingBox.x))
}

/**
 * Extract courses from grouped blocks
 */
function extractCourses(groupedBlocks: TextBlock[][]): CourseDraft[] {
  const courses: CourseDraft[] = []
  const courseMap = new Map<string, CourseDraft>()

  for (const row of groupedBlocks) {
    // Try to identify course code and section from row
    const courseInfo = extractCourseInfo(row)

    if (!courseInfo) continue

    const { courseCode, sectionId, componentType, days, startTime, endTime, location } = courseInfo

    // Create unique key for course + section
    const key = `${courseCode}-${sectionId}`

    if (!courseMap.has(key)) {
      courseMap.set(key, {
        courseCode,
        sectionId,
        components: [],
      })
    }

    const course = courseMap.get(key)!

    // Add component if it doesn't already exist
    const componentExists = course.components.some(
      (c) =>
        c.type === componentType &&
        c.days.join(',') === days.join(',') &&
        c.startTime === startTime
    )

    if (!componentExists && componentType) {
      course.components.push({
        type: componentType,
        days,
        startTime,
        endTime,
        location: location || '',
      })
    }
  }

  return Array.from(courseMap.values())
}

/**
 * Extract course information from a row of text blocks
 */
function extractCourseInfo(row: TextBlock[]): {
  courseCode: string
  sectionId: string
  componentType: ComponentType | null
  days: string[]
  startTime: string
  endTime: string
  location: string
} | null {
  const rowText = row.map((b) => b.text).join(' ')

  // Extract course code (e.g., "CSC 305", "MATH 201")
  const courseCodeMatch = rowText.match(/\b([A-Z]{2,4})\s+(\d{3}[A-Z]?)\b/)
  if (!courseCodeMatch) return null

  const courseCode = `${courseCodeMatch[1]} ${courseCodeMatch[2]}`

  // Extract section ID (e.g., "0002", "001", "A", "B", "P01", "L02", "R03")
  // Try multiple patterns for different university formats
  let sectionId = '0001'
  
  // 1. Numeric sections (0001, 001, 002, etc.)
  const numericMatch = rowText.match(/\b(0\d{2,3}|\d{1,3})\b/)
  if (numericMatch) {
    sectionId = numericMatch[1].padStart(3, '0')
  } else {
    // 2. Letter sections (A, B, C, etc.)
    const letterMatch = rowText.match(/\b([A-Z])\b/)
    if (letterMatch) {
      sectionId = letterMatch[1]
    } else {
      // 3. Prefixed sections (P01, L02, R03, etc.)
      const prefixedMatch = rowText.match(/\b(P\d{2}|L\d{2}|R\d{2}|DIS\d{2})\b/i)
      if (prefixedMatch) {
        sectionId = prefixedMatch[1].toUpperCase()
      }
    }
  }

  // Determine component type based on section pattern or keywords
  let componentType: ComponentType | null = null
  if (/^P\d{2}$/i.test(sectionId)) {
    componentType = 'PRO'
  } else if (/^L\d{2}$/i.test(sectionId)) {
    componentType = 'Lab'
  } else if (/^R\d{2}$/i.test(sectionId)) {
    componentType = 'Recitation'
  } else if (/lab|laboratory/i.test(rowText)) {
    componentType = 'Lab'
  } else if (/recitation|discussion/i.test(rowText)) {
    componentType = 'Recitation'
  } else if (/pro|project/i.test(rowText)) {
    componentType = 'PRO'
  } else if (/^[A-Z]$/.test(sectionId)) {
    // Letter sections (A, B, C) are typically lectures
    componentType = 'Lecture'
  } else if (/^0\d{3}$/.test(sectionId)) {
    // 0001, 0002, etc. are typically lectures/sections
    componentType = 'Lecture'
  }

  // Extract days (look for day abbreviations or full names)
  const days = extractDays(rowText)

  // Extract time range (e.g., "9:00-10:30", "9:00 AM - 10:30 AM")
  const { startTime, endTime } = extractTimeRange(rowText)

  // Extract location (usually at the end, or after time)
  const location = extractLocation(rowText)

  return {
    courseCode,
    sectionId,
    componentType,
    days,
    startTime,
    endTime,
    location,
  }
}

/**
 * Extract days from text
 */
function extractDays(text: string): string[] {
  const dayMap: Record<string, string> = {
    M: 'Monday',
    T: 'Tuesday',
    W: 'Wednesday',
    R: 'Thursday',
    F: 'Friday',
    S: 'Saturday',
    U: 'Sunday',
    MON: 'Monday',
    TUE: 'Tuesday',
    WED: 'Wednesday',
    THU: 'Thursday',
    FRI: 'Friday',
    SAT: 'Saturday',
    SUN: 'Sunday',
    MONDAY: 'Monday',
    TUESDAY: 'Tuesday',
    WEDNESDAY: 'Wednesday',
    THURSDAY: 'Thursday',
    FRIDAY: 'Friday',
    SATURDAY: 'Saturday',
    SUNDAY: 'Sunday',
  }

  const days: string[] = []
  const upperText = text.toUpperCase()

  // Check for day abbreviations (M, T, W, R, F, S, U)
  for (const [abbr, fullName] of Object.entries(dayMap)) {
    if (upperText.includes(abbr.toUpperCase()) && !days.includes(fullName)) {
      // Avoid false positives (e.g., "M" in "AM")
      if (abbr.length === 1) {
        const regex = new RegExp(`\\b${abbr}\\b`, 'i')
        if (regex.test(text)) {
          days.push(fullName)
        }
      } else {
        days.push(fullName)
      }
    }
  }

  // Sort days by week order
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))
}

/**
 * Extract time range from text
 */
function extractTimeRange(text: string): { startTime: string; endTime: string } {
  // Match patterns like "9:00-10:30", "9:00 AM - 10:30 AM", "09:00-10:30"
  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i,
    /(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/,
  ]

  for (const pattern of timePatterns) {
    const match = text.match(pattern)
    if (match) {
      let startHours = parseInt(match[1])
      const startMinutes = parseInt(match[2])
      const startPeriod = match[3]?.toUpperCase() || match[6]?.toUpperCase()

      let endHours = parseInt(match[4] || match[3])
      const endMinutes = parseInt(match[5] || match[4])
      const endPeriod = match[6]?.toUpperCase() || match[3]?.toUpperCase()

      // Convert to 24-hour format
      if (startPeriod === 'PM' && startHours !== 12) startHours += 12
      if (startPeriod === 'AM' && startHours === 12) startHours = 0

      if (endPeriod === 'PM' && endHours !== 12) endHours += 12
      if (endPeriod === 'AM' && endHours === 12) endHours = 0

      return {
        startTime: `${startHours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`,
        endTime: `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`,
      }
    }
  }

  // Fallback: try to extract single time
  const singleTimeMatch = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (singleTimeMatch) {
    let hours = parseInt(singleTimeMatch[1])
    const minutes = parseInt(singleTimeMatch[2])
    const period = singleTimeMatch[3]?.toUpperCase()

    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0

    const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    return { startTime: time, endTime: time }
  }

  return { startTime: '00:00', endTime: '00:00' }
}

/**
 * Extract location from text
 */
function extractLocation(text: string): string {
  // Look for building/room patterns (e.g., "LIB 123", "Room 201", "Building A")
  const locationPatterns = [
    /\b([A-Z]{2,4}\s+\d{2,4})\b/, // Building code + room number
    /\b(Room\s+\d+)\b/i,
    /\b(Building\s+[A-Z])\b/i,
    /\b([A-Z]+\s+\d{3,4})\b/, // Generic building + number
  ]

  for (const pattern of locationPatterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return ''
}





