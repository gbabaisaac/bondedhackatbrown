import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, school } = await request.json()

    if (!email || !school) {
      return NextResponse.json(
        { error: 'Email and school are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if Supabase is available
    if (!supabase) {
      return NextResponse.json(
        { error: 'Waitlist service is temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    const { data, error } = await supabase
      .from('waitlist')
      .insert([
        {
          email: email.trim().toLowerCase(),
          school: school.trim(),
        },
      ])
      .select()
      .single()

    if (error) {
      // Handle duplicate email error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This email is already on the waitlist' },
          { status: 409 }
        )
      }

      throw error
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: any) {
    console.error('Waitlist submission error:', error)
    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 500 }
    )
  }
}












