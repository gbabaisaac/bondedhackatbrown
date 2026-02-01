/**
 * Cloud-based OCR Text Extraction for Expo Go
 * 
 * Uses Google Cloud Vision API (or other cloud OCR services) via HTTP
 * Works in Expo Go since it doesn't require native modules
 * 
 * Setup:
 * 1. Get Google Cloud Vision API key from Google Cloud Console
 * 2. Add EXPO_PUBLIC_GOOGLE_VISION_API_KEY to your .env file
 * 3. Enable Cloud Vision API in your Google Cloud project
 * 
 * Alternative: Use Supabase Edge Function to call OCR service
 */

import * as FileSystem from 'expo-file-system'
import { TextBlock, OCRResult } from './extractText'

const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate'

/**
 * Convert local image URI to base64 for API upload
 */
async function imageToBase64(imageUri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    })
    return base64
  } catch (error) {
    console.error('Error converting image to base64:', error)
    throw new Error('Failed to convert image to base64')
  }
}

/**
 * Extract text from image using Google Cloud Vision API
 * Works in Expo Go - no native modules required!
 * 
 * @param imageUri - Local URI of the image
 * @returns OCR result with raw text and bounding boxes
 */
export async function extractTextFromImageCloud(imageUri: string): Promise<OCRResult> {
  if (!imageUri) {
    throw new Error('Image URI is required')
  }

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY

  if (!apiKey) {
    console.warn('⚠️ Google Vision API key not found. Set EXPO_PUBLIC_GOOGLE_VISION_API_KEY in .env')
    console.log('💡 Alternative: Use Supabase Edge Function for OCR (see cloudOCR-supabase.ts)')
    
    // Return empty result - UI will show fallback message
    return {
      rawText: '',
      blocks: [],
      imageUri,
    }
  }

  try {
    console.log('📷 Processing image with Google Cloud Vision API...')
    
    // Convert image to base64
    const base64Image = await imageToBase64(imageUri)
    
    // Prepare API request
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 1,
            },
          ],
        },
      ],
    }

    // Call Google Vision API
    const response = await fetch(
      `${GOOGLE_VISION_API_URL}?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Google Vision API error:', response.status, errorText)
      throw new Error(`Google Vision API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.responses || !data.responses[0]) {
      console.warn('⚠️ No response from Google Vision API')
      return {
        rawText: '',
        blocks: [],
        imageUri,
      }
    }

    const textAnnotations = data.responses[0].textAnnotations || []
    
    if (textAnnotations.length === 0) {
      console.warn('⚠️ No text found in image')
      return {
        rawText: '',
        blocks: [],
        imageUri,
      }
    }

    // First annotation is the full text
    const fullText = textAnnotations[0].description || ''
    
    // Remaining annotations are individual words with bounding boxes
    const blocks: TextBlock[] = textAnnotations.slice(1).map((annotation: any) => {
      const vertices = annotation.boundingPoly?.vertices || []
      
      // Calculate bounding box from vertices
      const x = Math.min(...vertices.map((v: any) => v.x || 0))
      const y = Math.min(...vertices.map((v: any) => v.y || 0))
      const maxX = Math.max(...vertices.map((v: any) => v.x || 0))
      const maxY = Math.max(...vertices.map((v: any) => v.y || 0))
      
      return {
        text: annotation.description || '',
        boundingBox: {
          x,
          y,
          width: maxX - x,
          height: maxY - y,
        },
      }
    })

    console.log(`✅ Google Vision extracted ${fullText.length} characters`)
    console.log(`📊 Found ${blocks.length} text blocks`)

    return {
      rawText: fullText,
      blocks,
      imageUri,
    }
  } catch (error) {
    console.error('❌ Cloud OCR failed:', error)
    
    // Return empty result on error - let UI show fallback
    return {
      rawText: '',
      blocks: [],
      imageUri,
    }
  }
}

/**
 * Check if cloud OCR is available (API key configured)
 */
export function isCloudOCRAvailable(): boolean {
  return !!process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY
}


