/**
 * Export Utilities
 * Functions for exporting scan history and generating reports
 */

/**
 * Export scan history to CSV format
 * @param {Array} scanHistory - Array of scan records
 * @returns {string} CSV string
 */
export function exportToCSV(scanHistory) {
  if (!scanHistory || scanHistory.length === 0) {
    return ''
  }

  // CSV headers
  const headers = [
    'Date',
    'Scan Type',
    'Classification',
    'Scam Type',
    'Content Preview',
    'Analysis Result'
  ]

  // Helper function to format analysis result as readable text
  const formatAnalysisResult = (analysisResult) => {
    if (!analysisResult || typeof analysisResult !== 'object') {
      return ''
    }

    const parts = []

    // Add explanation if available
    if (analysisResult.explanation) {
      parts.push(`Explanation: ${analysisResult.explanation}`)
    }

    // Add reasons if available
    if (analysisResult.reasons && Array.isArray(analysisResult.reasons) && analysisResult.reasons.length > 0) {
      parts.push(`\nReasons:`)
      analysisResult.reasons.forEach((reason, index) => {
        parts.push(`${index + 1}. ${reason}`)
      })
    }

    // Add scam type if available (and not already in the Scam Type column)
    if (analysisResult.scam_type && analysisResult.scam_type !== 'N/A') {
      parts.push(`\nScam Type: ${analysisResult.scam_type}`)
    }

    // Add source URL if available
    if (analysisResult.source_url) {
      parts.push(`\nSource URL: ${analysisResult.source_url}`)
    }

    // Add content type if available
    if (analysisResult.content_type) {
      parts.push(`\nContent Type: ${analysisResult.content_type}`)
    }

    // Add confidence score if available
    if (analysisResult.confidence !== undefined && analysisResult.confidence !== null) {
      parts.push(`\nConfidence: ${(analysisResult.confidence * 100).toFixed(1)}%`)
    }

    // Add risk level if available
    if (analysisResult.risk_level) {
      parts.push(`\nRisk Level: ${analysisResult.risk_level}`)
    }

    // Join all parts with line breaks and escape quotes for CSV
    return parts.join('\n').replace(/"/g, '""')
  }

  // Convert scans to CSV rows
  const rows = scanHistory.map(scan => {
    const date = new Date(scan.created_at).toLocaleString()
    const scanType = scan.scan_type || ''
    const classification = scan.classification || ''
    const scamType = scan.analysis_result?.scam_type || ''
    const contentPreview = (scan.content_preview || '').replace(/"/g, '""') // Escape quotes
    const analysisResult = formatAnalysisResult(scan.analysis_result) // Format as readable text

    return [
      date,
      scanType,
      classification,
      scamType,
      contentPreview,
      analysisResult
    ]
  })

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
}

/**
 * Export scan history to JSON format
 * @param {Array} scanHistory - Array of scan records
 * @returns {string} JSON string
 */
export function exportToJSON(scanHistory) {
  if (!scanHistory || scanHistory.length === 0) {
    return JSON.stringify([], null, 2)
  }

  return JSON.stringify(scanHistory, null, 2)
}

/**
 * Download data as a file
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type (e.g., 'text/csv', 'application/json')
 */
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export scan history to CSV and download
 * @param {Array} scanHistory - Array of scan records
 * @param {string} filename - Optional filename (default: 'scan-history-YYYY-MM-DD.csv')
 */
export function downloadCSV(scanHistory, filename = null) {
  const csv = exportToCSV(scanHistory)
  if (!csv) {
    console.warn('No data to export')
    return
  }

  if (!filename) {
    const date = new Date().toISOString().split('T')[0]
    filename = `scan-history-${date}.csv`
  }

  downloadFile(csv, filename, 'text/csv')
}

/**
 * Export scan history to JSON and download
 * @param {Array} scanHistory - Array of scan records
 * @param {string} filename - Optional filename (default: 'scan-history-YYYY-MM-DD.json')
 */
export function downloadJSON(scanHistory, filename = null) {
  const json = exportToJSON(scanHistory)
  if (!json) {
    console.warn('No data to export')
    return
  }

  if (!filename) {
    const date = new Date().toISOString().split('T')[0]
    filename = `scan-history-${date}.json`
  }

  downloadFile(json, filename, 'application/json')
}

/**
 * Generate protection report summary
 * @param {Array} scanHistory - Array of scan records
 * @param {Object} stats - User stats object
 * @returns {string} Report text
 */
export function generateProtectionReport(scanHistory, stats) {
  if (!scanHistory || scanHistory.length === 0) {
    return 'No scan history available.'
  }

  const total = scanHistory.length
  const scams = scanHistory.filter(s => s.classification === 'scam').length
  const suspicious = scanHistory.filter(s => s.classification === 'suspicious').length
  const safe = scanHistory.filter(s => s.classification === 'safe').length

  const report = `
SCAM DETECTOR - PROTECTION REPORT
Generated: ${new Date().toLocaleString()}

SUMMARY
-------
Total Scans: ${total}
Scams Detected: ${scams}
Suspicious Results: ${suspicious}
Safe Results: ${safe}

STATISTICS
----------
Scam Rate: ${total > 0 ? Math.round((scams / total) * 100) : 0}%
Safe Rate: ${total > 0 ? Math.round((safe / total) * 100) : 0}%
Suspicious Rate: ${total > 0 ? Math.round((suspicious / total) * 100) : 0}%

SCAN TYPE DISTRIBUTION
----------------------
Images: ${scanHistory.filter(s => s.scan_type === 'image').length}
URLs: ${scanHistory.filter(s => s.scan_type === 'url').length}
Text: ${scanHistory.filter(s => s.scan_type === 'text').length}

RECOMMENDATIONS
---------------
${scams > 0 ? `- You've detected ${scams} scam${scams > 1 ? 's' : ''}. Stay vigilant and continue scanning content before engaging.` : '- Continue scanning content to maintain your protection.'}
${safe / total < 0.5 && total > 5 ? '- Consider scanning more content from trusted sources.' : ''}
${scams / total > 0.3 && total > 5 ? '- You may be encountering a higher-than-average number of scams. Be extra cautious.' : ''}

For detailed scan information, export the full scan history.
  `.trim()

  return report
}

/**
 * Download protection report as text file
 * @param {Array} scanHistory - Array of scan records
 * @param {Object} stats - User stats object
 * @param {string} filename - Optional filename (default: 'protection-report-YYYY-MM-DD.txt')
 */
export function downloadProtectionReport(scanHistory, stats, filename = null) {
  const report = generateProtectionReport(scanHistory, stats)
  
  if (!filename) {
    const date = new Date().toISOString().split('T')[0]
    filename = `protection-report-${date}.txt`
  }

  downloadFile(report, filename, 'text/plain')
}
