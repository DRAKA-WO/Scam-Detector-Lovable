/**
 * Maps backend error messages to user-friendly messages.
 * This prevents exposing internal backend details to users.
 */

const USER_FRIENDLY_ERRORS = {
  // File/Image errors
  'Invalid file type': 'Please upload a valid image file (PNG, JPG, GIF, or WEBP)',
  'File too large': 'The file is too large. Please upload a smaller image (max 10MB)',
  'No image provided': 'Please select an image to analyze',
  
  // URL errors
  'Invalid URL': 'Please enter a valid website URL',
  'URL not accessible': 'We couldn\'t access this website. Please check the URL and try again',
  'URL timeout': 'The website took too long to respond. Please try again',
  
  // Text errors
  'Text too short': 'Please enter more text for accurate analysis',
  'Text too long': 'The text is too long. Please shorten it and try again',
  'No text provided': 'Please enter some text to analyze',
  
  // Rate limiting
  'Rate limit exceeded': 'Too many requests. Please wait a moment and try again',
  'Too many requests': 'Too many requests. Please wait a moment and try again',
  
  // Network errors
  'Network error': 'Connection issue. Please check your internet and try again',
  'Failed to fetch': 'Connection issue. Please check your internet and try again',
}

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again later.'

/**
 * Converts a backend error to a user-friendly message
 * @param {string} errorMessage - The raw error message from the backend
 * @param {string} context - The context of the error (e.g., 'image', 'url', 'text')
 * @returns {string} A user-friendly error message
 */
export function getUserFriendlyError(errorMessage, context = '') {
  if (!errorMessage) {
    return GENERIC_ERROR_MESSAGE
  }

  const errorLower = errorMessage.toLowerCase()

  // Check for exact matches first
  for (const [key, value] of Object.entries(USER_FRIENDLY_ERRORS)) {
    if (errorLower.includes(key.toLowerCase())) {
      return value
    }
  }

  // Context-specific generic messages
  const contextMessages = {
    image: 'Failed to analyze the image. Please try again.',
    url: 'Failed to analyze the website. Please try again.',
    text: 'Failed to analyze the text. Please try again.',
    report: 'Failed to submit the report. Please try again.',
  }

  return contextMessages[context] || GENERIC_ERROR_MESSAGE
}

/**
 * Handles API response errors safely without exposing backend details
 * @param {Response} response - The fetch response object
 * @param {string} context - The context of the error
 * @returns {Promise<string>} A user-friendly error message
 */
export async function handleApiError(response, context = '') {
  try {
    const errorData = await response.json()
    const rawError = errorData.error || errorData.message || ''
    return getUserFriendlyError(rawError, context)
  } catch {
    // If we can't parse the error, return a generic message
    return getUserFriendlyError('', context)
  }
}
