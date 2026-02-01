import { differenceInMinutes, format, isSameDay, isToday, isYesterday } from 'date-fns'

export const formatChatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''

    if (isToday(date)) {
        return 'Today'
    }
    if (isYesterday(date)) {
        return 'Yesterday'
    }
    return format(date, 'MMM d, yyyy') // e.g., Jan 24, 2026
}

export const formatMessageTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return format(date, 'h:mm a')
}

export const shouldShowDateSeparator = (currentMessageDate, previousMessageDate) => {
    if (!previousMessageDate) return true // Show for first message ever (bottom of list)
    const current = new Date(currentMessageDate)
    const prev = new Date(previousMessageDate)

    return !isSameDay(current, prev)
}

export const isSameGroup = (currentMsg, adjacentMsg) => {
    if (!adjacentMsg) return false
    if (currentMsg.sender_id !== adjacentMsg.sender_id) return false

    const current = new Date(currentMsg.created_at)
    const adjacent = new Date(adjacentMsg.created_at)

    // Group if within 15 minutes
    return Math.abs(differenceInMinutes(current, adjacent)) < 15
}
