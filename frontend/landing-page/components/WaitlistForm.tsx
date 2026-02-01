'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import SchoolPicker from './SchoolPicker'

interface WaitlistFormProps {
  variant?: 'hero' | 'cta'
}

const SCHOOLS = [
  'University of Rhode Island',
  'Brown Universi~ty',
  'Rhode Island College',
  'Other',
]

export default function WaitlistForm({ variant = 'hero' }: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [school, setSchool] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !school) {
      setErrorMessage('Please fill in all fields')
      setStatus('error')
      return
    }

    setIsSubmitting(true)
    setStatus('idle')
    setErrorMessage('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          school: school.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setErrorMessage('You\'re already on the waitlist!')
        } else {
          const existing = JSON.parse(localStorage.getItem('bonded_waitlist') || '[]')
          const isDuplicate = existing.some((entry: any) => entry.email === email.trim().toLowerCase())
          
          if (!isDuplicate) {
            existing.push({
              email: email.trim().toLowerCase(),
              school: school.trim(),
              created_at: new Date().toISOString(),
            })
            localStorage.setItem('bonded_waitlist', JSON.stringify(existing))
            setStatus('success')
            setEmail('')
            setSchool('')
            return
          } else {
            setErrorMessage('You\'re already on the waitlist!')
          }
        }
        setStatus('error')
        return
      }

      setStatus('success')
      setEmail('')
      setSchool('')
    } catch (error: any) {
      console.error('Error submitting waitlist:', error)
      try {
        const existing = JSON.parse(localStorage.getItem('bonded_waitlist') || '[]')
        const isDuplicate = existing.some((entry: any) => entry.email === email.trim().toLowerCase())
        
        if (!isDuplicate) {
          existing.push({
            email: email.trim().toLowerCase(),
            school: school.trim(),
            created_at: new Date().toISOString(),
          })
          localStorage.setItem('bonded_waitlist', JSON.stringify(existing))
          setStatus('success')
          setEmail('')
          setSchool('')
          return
        }
      } catch (e) {
        // localStorage might not be available
      }
      
      setStatus('error')
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 mb-6 shadow-lg shadow-purple-500/30">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold mb-3 text-gray-900">
          You&apos;re on the list!
        </h3>
        <p className="text-gray-600">
          We&apos;ll notify you when Bonded launches at your campus.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          required
          className="flex-1 px-5 py-4 rounded-2xl bg-gray-50 border-2 border-purple-400/30 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-base transition-all shadow-sm"
          disabled={isSubmitting}
        />
        <SchoolPicker
          value={school}
          onChange={setSchool}
          disabled={isSubmitting}
        />
      </div>

      {status === 'error' && errorMessage && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-red-600 text-center"
        >
          {errorMessage}
        </motion.p>
      )}

      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full sm:w-auto px-10 py-4 rounded-2xl font-semibold text-base text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2 justify-center">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Joining...
          </span>
        ) : (
          'Join the waitlist'
        )}
      </motion.button>

      <p className="text-sm text-center text-gray-500">
        We&apos;ll only use your email to notify you about Bonded. No spam, ever.
      </p>
    </motion.form>
  )
}












