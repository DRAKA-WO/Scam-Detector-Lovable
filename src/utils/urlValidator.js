/**
 * Enhanced URL validation with security checks.
 * Blocks dangerous protocols and private/internal network addresses.
 */

// Dangerous protocols that should never be allowed
const BLOCKED_PROTOCOLS = [
  'javascript:',
  'data:',
  'file:',
  'vbscript:',
  'about:',
  'blob:',
]

// Private/internal IP patterns that could be used for SSRF attacks
const PRIVATE_IP_PATTERNS = [
  // Localhost
  /^localhost$/i,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^\[::1\]$/,
  
  // Private networks (RFC 1918)
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  
  // Link-local
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  /^fe80:/i,
  
  // Other internal addresses
  /^0\.0\.0\.0$/,
  /^::$/,
  /^fc00:/i,
  /^fd00:/i,
]

// Common internal hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'internal',
  'intranet',
  'local',
  'private',
  'corp',
  'admin',
  'metadata', // Cloud metadata endpoints
  'instance-data', // AWS metadata
]

const MAX_URL_LENGTH = 2000

/**
 * Validates a URL for security and format
 * @param {string} url - The URL to validate
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'Please enter a URL' }
  }

  const trimmedUrl = url.trim()

  // Check length
  if (trimmedUrl.length > MAX_URL_LENGTH) {
    return { isValid: false, error: 'URL is too long (max 2000 characters)' }
  }

  if (trimmedUrl.length === 0) {
    return { isValid: false, error: 'Please enter a URL' }
  }

  // Check for blocked protocols
  const lowerUrl = trimmedUrl.toLowerCase()
  for (const protocol of BLOCKED_PROTOCOLS) {
    if (lowerUrl.startsWith(protocol)) {
      return { isValid: false, error: 'Invalid URL protocol. Please use http:// or https://' }
    }
  }

  // Try to parse as URL
  let parsedUrl
  try {
    // Add https:// if no protocol specified
    const urlWithProtocol = /^https?:\/\//i.test(trimmedUrl)
      ? trimmedUrl
      : `https://${trimmedUrl}`
    
    parsedUrl = new URL(urlWithProtocol)
  } catch {
    return { isValid: false, error: 'Please enter a valid URL (e.g., example.com)' }
  }

  // Check protocol is http or https only
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { isValid: false, error: 'Invalid URL protocol. Please use http:// or https://' }
  }

  const hostname = parsedUrl.hostname.toLowerCase()

  // Check for private IP addresses
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { isValid: false, error: 'Please enter a public website URL' }
    }
  }

  // Check for blocked hostnames
  for (const blocked of BLOCKED_HOSTNAMES) {
    if (hostname === blocked || hostname.startsWith(`${blocked}.`) || hostname.endsWith(`.${blocked}`)) {
      return { isValid: false, error: 'Please enter a public website URL' }
    }
  }

  // Check for IP address format (additional check for numeric IPs)
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4Pattern.test(hostname)) {
    // It's an IP address - check each octet
    const octets = hostname.split('.').map(Number)
    
    // Block private ranges
    if (octets[0] === 10) {
      return { isValid: false, error: 'Please enter a public website URL' }
    }
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
      return { isValid: false, error: 'Please enter a public website URL' }
    }
    if (octets[0] === 192 && octets[1] === 168) {
      return { isValid: false, error: 'Please enter a public website URL' }
    }
    if (octets[0] === 127) {
      return { isValid: false, error: 'Please enter a public website URL' }
    }
    if (octets[0] === 0) {
      return { isValid: false, error: 'Please enter a public website URL' }
    }
  }

  // Basic structure validation - must have at least a TLD
  if (!hostname.includes('.') || hostname.endsWith('.')) {
    return { isValid: false, error: 'Please enter a valid URL with a domain (e.g., example.com)' }
  }

  return { isValid: true, error: null }
}
