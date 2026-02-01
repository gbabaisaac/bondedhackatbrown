/**
 * Icon wrapper component
 * Provides a consistent interface for icons across the app
 * Falls back to Expo icons if lucide-react-native has issues
 */

import { Ionicons } from '@expo/vector-icons'
import React from 'react'

// Icon mapping: lucide name -> Ionicons name
const ICON_MAP = {
  'X': 'close',
  'Check': 'checkmark',
  'Search': 'search-outline',
  'ChevronDown': 'chevron-down-outline',
  'ChevronUp': 'chevron-up-outline',
  'CheckCircle2': 'checkmark-circle',
  'Filter': 'options-outline',
  'ArrowLeft': 'arrow-back',
  'MoreHorizontal': 'ellipsis-horizontal',
  'School': 'school-outline',
  'Calendar': 'calendar-outline',
  'List': 'list-outline',
  'User': 'person-outline',
  'MapPin': 'location-outline',
  'UserPlus': 'person-add-outline',
  'MessageCircle': 'chatbubble-outline',
  'Tag': 'pricetag-outline',
  'BarChart3': 'stats-chart-outline',
  'Add': 'add-circle-outline',
  'Image': 'image-outline',
  'Video': 'videocam-outline',
  'EyeOff': 'eye-off-outline',
  'Person': 'person-outline',
  'Repeat': 'refresh-outline',
  'Share2': 'share-outline',
  'Heart': 'heart-outline',
  'HeartFill': 'heart',
  'ArrowUpCircle': 'arrow-up-circle-outline',
  'ArrowDownCircle': 'arrow-down-circle-outline',
  'Mail': 'mail-outline',
  'Users': 'people-outline',
  'Plus': 'add-circle-outline',
  'ChevronLeft': 'chevron-back',
  'ChevronRight': 'chevron-forward',
  'Lock': 'lock-closed-outline',
  'Edit2': 'create-outline',
  'Trash2': 'trash-outline',
  'CheckCircle': 'checkmark-circle-outline',
  'MoreVertical': 'ellipsis-vertical',
  'Clock': 'time-outline',
  'Settings': 'settings-outline',
  'Camera': 'camera-outline',
  'Send': 'send-outline',
  'FileText': 'document-text-outline',
}

/**
 * Create an icon component wrapper
 */
export const createIcon = (lucideName, defaultSize = 24) => {
  return ({ size = defaultSize, color = '#000', strokeWidth = 2, style, ...props }) => {
    const ioniconName = ICON_MAP[lucideName] || 'help-outline'
    return (
      <Ionicons
        name={ioniconName}
        size={size}
        color={color}
        style={style}
        {...props}
      />
    )
  }
}

// Export commonly used icons
export const X = createIcon('X')
export const Check = createIcon('Check')
export const Search = createIcon('Search')
export const ChevronDown = createIcon('ChevronDown')
export const ChevronUp = createIcon('ChevronUp')
export const CheckCircle2 = createIcon('CheckCircle2')
export const Filter = createIcon('Filter')
export const ArrowLeft = createIcon('ArrowLeft')
export const MoreHorizontal = createIcon('MoreHorizontal')
export const School = createIcon('School')
export const Calendar = createIcon('Calendar')
export const List = createIcon('List')
export const User = createIcon('User')
export const MapPin = createIcon('MapPin')
export const UserPlus = createIcon('UserPlus')
export const MessageCircle = createIcon('MessageCircle')
export const Tag = createIcon('Tag')
export const BarChart3 = createIcon('BarChart3')
export const Add = createIcon('Add')
export const ImageIcon = createIcon('Image')
export const Video = createIcon('Video')
export const EyeOff = createIcon('EyeOff')
export const Person = createIcon('Person')
export const Repeat = createIcon('Repeat')
export const Share2 = createIcon('Share2')
export const Heart = createIcon('Heart')
export const HeartFill = createIcon('HeartFill')
export const ArrowUpCircle = createIcon('ArrowUpCircle')
export const ArrowDownCircle = createIcon('ArrowDownCircle')
export const Mail = createIcon('Mail')
export const Users = createIcon('Users')
export const Plus = createIcon('Plus')
export const ChevronLeft = createIcon('ChevronLeft')
export const ChevronRight = createIcon('ChevronRight')
export const Lock = createIcon('Lock')
export const Edit2 = createIcon('Edit2')
export const Trash2 = createIcon('Trash2')
export const CheckCircle = createIcon('CheckCircle')
export const MoreVertical = createIcon('MoreVertical')
export const Clock = createIcon('Clock')
export const Settings = createIcon('Settings')
export const FileText = createIcon('FileText')

