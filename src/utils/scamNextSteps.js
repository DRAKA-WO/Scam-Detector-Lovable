/**
 * Next steps templates for different types of scams
 * These provide actionable guidance based on the detected scam type
 */

const scamNextSteps = {
  // Phishing scams (domain mismatch, fake login pages, etc.)
  phishing: [
    "Do not enter any credentials, passwords, or personal information on this page",
    "Check the URL in your browser's address bar - it should match the official domain exactly",
    "Report this phishing attempt to the organization being impersonated",
    "If you already entered information, change your passwords immediately and enable two-factor authentication",
    "Access the legitimate website directly by typing the official domain in your browser"
  ],

  // Social media impersonation scams
  impersonation: [
    "Do not click any links or make any purchases from this account",
    "Report the fake account to the social media platform (use the platform's reporting feature)",
    "Verify the official account by checking the organization's official website for their verified social media links",
    "Warn others about this fake account if possible",
    "If you made a purchase, contact your payment provider to dispute the transaction"
  ],

  // Credential harvesting scams
  "credential harvesting": [
    "Do not enter any login credentials or passwords",
    "If you already entered credentials, change your password immediately on the legitimate website",
    "Enable two-factor authentication (2FA) on all your accounts if not already enabled",
    "Monitor your accounts for any suspicious activity",
    "Report the phishing attempt to the organization being impersonated"
  ],

  // Fake account scams
  "fake account": [
    "Do not interact with or trust this account",
    "Report the fake account to the platform where it appears",
    "Verify the official account through the organization's official website",
    "Do not provide any personal information or make purchases",
    "Warn others about this fake account"
  ],

  // Fake product or "too good to be true" scams
  "fake product": [
    "Do not make any purchases or provide payment information",
    "Research the company through official channels (official website, verified social media)",
    "Compare the price with legitimate retailers - if it's too good to be true, it likely is",
    "Check for customer reviews and complaints about the seller",
    "If you already made a purchase, contact your payment provider to dispute the transaction"
  ],

  // Generic/other scams (fallback)
  generic: [
    "Do not provide any personal information, credentials, or payment details",
    "Do not click any links or download any files",
    "Report this scam to relevant authorities or the platform where it appeared",
    "Verify any claims through official channels (official website, verified accounts)",
    "If you already interacted with this scam, monitor your accounts and consider changing passwords"
  ]
}

/**
 * Get next steps for a given scam type
 * @param {string} scamType - The type of scam detected (e.g., "Phishing Scam - Domain Mismatch")
 * @returns {string[]} Array of next steps
 */
export function getScamNextSteps(scamType) {
  if (!scamType) {
    return scamNextSteps.generic
  }

  const scamTypeLower = scamType.toLowerCase()

  // Match phishing-related scams
  if (scamTypeLower.includes('phishing') || scamTypeLower.includes('domain mismatch')) {
    return scamNextSteps.phishing
  }

  // Match impersonation scams
  if (scamTypeLower.includes('impersonation') || scamTypeLower.includes('fake account')) {
    return scamNextSteps.impersonation
  }

  // Match credential harvesting
  if (scamTypeLower.includes('credential') || scamTypeLower.includes('harvesting')) {
    return scamNextSteps['credential harvesting']
  }

  // Match fake product scams
  if (scamTypeLower.includes('fake product') || scamTypeLower.includes('too good to be true')) {
    return scamNextSteps['fake product']
  }

  // Default to generic
  return scamNextSteps.generic
}

export default getScamNextSteps
