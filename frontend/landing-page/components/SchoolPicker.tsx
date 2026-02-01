'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const COMMON_SCHOOLS = [
  'University of Rhode Island',
  'Brown University',
  'Rhode Island College',
  'Harvard University',
  'MIT',
  'Yale University',
  'Stanford University',
  'UC Berkeley',
  'UCLA',
  'University of Michigan',
  'University of Texas at Austin',
  'New York University',
  'Boston University',
  'Northeastern University',
  'University of Pennsylvania',
  'Columbia University',
  'Cornell University',
  'Princeton University',
  'Duke University',
  'University of North Carolina',
  'University of Virginia',
  'Georgetown University',
  'University of Southern California',
  'University of Washington',
  'University of Illinois',
  'Ohio State University',
  'Penn State University',
  'University of Florida',
  'University of Georgia',
  'Arizona State University',
  'University of Arizona',
  'Texas A&M University',
  'Purdue University',
  'Indiana University',
  'University of Wisconsin',
  'University of Minnesota',
  'University of Colorado',
  'University of Oregon',
  'University of California, San Diego',
  'University of California, Irvine',
  'University of California, Davis',
  'University of California, Santa Barbara',
  'Other',
]

interface SchoolPickerProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function SchoolPicker({ 
  value, 
  onChange, 
  disabled = false,
  placeholder = 'Search your school...'
}: SchoolPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOtherInput, setShowOtherInput] = useState(false)
  const [otherSchoolValue, setOtherSchoolValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredSchools = COMMON_SCHOOLS.filter(school =>
    school.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    // If value is set and not in common schools, show other input
    if (value && !COMMON_SCHOOLS.includes(value)) {
      setShowOtherInput(true)
      setOtherSchoolValue(value)
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectSchool = (school: string) => {
    if (school === 'Other') {
      setShowOtherInput(true)
      setIsOpen(false)
      setSearchQuery('')
      onChange('')
    } else {
      onChange(school)
      setIsOpen(false)
      setSearchQuery('')
      setShowOtherInput(false)
      setOtherSchoolValue('')
    }
  }

  const handleOtherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setOtherSchoolValue(newValue)
    onChange(newValue)
  }

  const displayValue = showOtherInput ? otherSchoolValue : value

  return (
    <div ref={containerRef} className="relative flex-1">
      {showOtherInput ? (
        <input
          ref={inputRef}
          type="text"
          value={otherSchoolValue}
          onChange={handleOtherInputChange}
          placeholder="Enter your school name"
          disabled={disabled}
          className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-purple-400/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-base transition-all shadow-sm"
          onFocus={() => setIsOpen(false)}
        />
      ) : (
        <>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery || displayValue}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsOpen(true)
                if (!e.target.value) {
                  onChange('')
                }
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full px-5 py-4 pr-10 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 text-base transition-all shadow-sm"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <AnimatePresence>
            {isOpen && filteredSchools.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute z-50 w-full mt-2 bg-white rounded-2xl border border-gray-200 shadow-xl max-h-64 overflow-y-auto"
              >
                {filteredSchools.map((school, index) => (
                  <button
                    key={school}
                    type="button"
                    onClick={() => handleSelectSchool(school)}
                    className={`w-full px-5 py-3 text-left text-base transition-colors ${
                      school === value
                        ? 'bg-gradient-to-r from-purple-50 to-purple-100/50 text-purple-700 font-semibold border-l-2 border-purple-500'
                        : 'text-gray-900 hover:bg-purple-50/50'
                    } ${index === 0 ? 'rounded-t-2xl' : ''} ${
                      index === filteredSchools.length - 1 ? 'rounded-b-2xl' : ''
                    }`}
                  >
                    {school === 'Other' ? (
                      <span className="flex items-center gap-2">
                        <span>{school}</span>
                        <span className="text-xs text-gray-500">(Enter custom school)</span>
                      </span>
                    ) : (
                      school
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {showOtherInput && (
        <button
          type="button"
          onClick={() => {
            setShowOtherInput(false)
            setOtherSchoolValue('')
            onChange('')
            setSearchQuery('')
          }}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs hover:bg-purple-600 transition-colors shadow-md"
          title="Back to school list"
        >
          ×
        </button>
      )}
    </div>
  )
}












