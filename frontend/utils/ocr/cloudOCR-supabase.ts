/**
 * Supabase Edge Function OCR (Alternative to Google Vision)
 * 
 * This approach uses a Supabase Edge Function to call OCR services
 * Keeps API keys secure on the server side
 * 
 * Setup:
 * 1. Create a Supabase Edge Function for OCR
 * 2. Deploy the function (see supabase/functions/ocr-text-extraction/index.ts)
 * 3. No API keys needed in the client!
 */

import { supabase } from '../../lib/supabase'
import { TextBlock, OCRResult } from './extractText'

/**
 * Extract text from image using Supabase Edge Function
 * Works in Expo Go - no native modules or API keys needed!
 * 
 * @param imageUri - Local URI of the image
 * @returns OCR result with raw text and bounding boxes
 */
export async function extractTextFromImageSupabase(imageUri: string): Promise<OCRResult> {
  if (!imageUri) {
    throw new Error('Image URI is required')
  }

  try {
    console.log('📷 Processing image with Supabase Edge Function OCR...')
    
    // Read image as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    })

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('ocr-text-extraction', {
      body: {
        image: base64,
        imageType: 'base64',
      },
    })

    if (error) {
      console.error('❌ Supabase Edge Function error:', error)
      throw error
    }

    if (!data || !data.text) {
      console.warn('⚠️ No text found in image')
      return {
        rawText: '',
        blocks: [],
        imageUri,
      }
    }

    // Parse response from Edge Function
    const blocks: TextBlock[] = (data.blocks || []).map((block: any) => ({
      text: block.text || '',
      boundingBox: {
        x: block.x || 0,
        y: block.y || 0,
        width: block.width || 0,
        height: block.height || 0,
      },
      confidence: block.confidence,
    }))

    console.log(`✅ Supabase OCR extracted ${data.text.length} characters`)
    console.log(`📊 Found ${blocks.length} text blocks`)

    return {
      rawText: data.text || '',
      blocks,
      imageUri,
    }
  } catch (error) {
    console.error('❌ Supabase OCR failed:', error)
    
    // Return empty result on error
    return {
      rawText: '',
      blocks: [],
      imageUri,
    }
  }
}

/**
 * Check if Supabase OCR is available (Edge Function deployed)
 */
export async function isSupabaseOCRAvailable(): Promise<boolean> {
  try {
    // Try to invoke the function (lightweight check)
    const { error } = await supabase.functions.invoke('ocr-text-extraction', {
      body: { test: true },
    })
    // If function doesn't exist, we'll get an error
    return !error || error.message?.includes('test') // If it's just a test error, function exists
  } catch {
    return false
  }
}


