import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, ExternalLink, AlertTriangle, Shield } from 'lucide-react'
import { calculateScamTypeBreakdown } from '@/utils/insightsCalculator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'

// Scam type education content
const scamEducation = {
  phishing: {
    title: 'Phishing Scams',
    description: 'Fake emails or messages designed to steal your personal information',
    tips: [
      'Never click links in suspicious emails',
      'Check the sender\'s email address carefully',
      'Verify requests for personal information directly with the company',
      'Look for spelling and grammar mistakes',
      'Hover over links to see the actual URL before clicking'
    ],
    learnMore: 'https://www.ftc.gov/articles/how-recognize-and-avoid-phishing-scams'
  },
  tech_support: {
    title: 'Tech Support Scams',
    description: 'Scammers pretending to be tech support to gain remote access to your device',
    tips: [
      'Legitimate tech support never contacts you unsolicited',
      'Never give remote access to your computer to unknown callers',
      'Don\'t pay for tech support with gift cards or wire transfers',
      'Contact your tech company directly through official channels',
      'Be suspicious of pop-up warnings that claim your computer is infected'
    ],
    learnMore: 'https://www.ftc.gov/articles/tech-support-scams'
  },
  romance: {
    title: 'Romance Scams',
    description: 'Scammers build fake relationships to eventually ask for money',
    tips: [
      'Be cautious of people you meet online who ask for money',
      'Never send money to someone you haven\'t met in person',
      'Watch for red flags: moving conversations off dating sites quickly, refusal to meet in person',
      'Reverse image search profile pictures to check if they\'re stolen',
      'Be wary of excuses about why they can\'t video chat or meet'
    ],
    learnMore: 'https://www.ftc.gov/articles/online-dating-scams'
  },
  investment: {
    title: 'Investment Scams',
    description: 'Fake investment opportunities promising high returns with little risk',
    tips: [
      'Be skeptical of guaranteed returns or "too good to be true" offers',
      'Research investment opportunities and check with regulatory bodies',
      'Never invest based solely on online ads or social media posts',
      'Be cautious of pressure to invest immediately',
      'Verify credentials of investment advisors and firms'
    ],
    learnMore: 'https://www.investor.gov/protect-your-investments/fraud/types-fraud'
  },
  lottery_sweepstakes: {
    title: 'Lottery & Sweepstakes Scams',
    description: 'Fake notifications claiming you\'ve won a prize that requires payment to claim',
    tips: [
      'You can\'t win a lottery you didn\'t enter',
      'Legitimate prizes don\'t require upfront payments',
      'Never pay fees to claim a prize',
      'Be suspicious of unsolicited winning notifications',
      'Contact the organization directly to verify winnings'
    ],
    learnMore: 'https://www.ftc.gov/articles/sweepstakes-scams'
  },
  impersonation: {
    title: 'Impersonation Scams',
    description: 'Scammers pretending to be someone you know or trust to steal money or information',
    tips: [
      'Verify identity before sending money or sharing information',
      'Contact the person or organization directly through official channels',
      'Be cautious of urgent requests for money',
      'Watch for unusual communication methods or payment requests',
      'Don\'t trust caller ID - it can be spoofed'
    ],
    learnMore: 'https://www.consumer.ftc.gov/articles/how-avoid-imposter-scams'
  },
  credential_theft: {
    title: 'Credential Theft',
    description: 'Attempts to steal your login credentials for accounts',
    tips: [
      'Use strong, unique passwords for each account',
      'Enable two-factor authentication whenever possible',
      'Never share passwords via email or text',
      'Check URLs carefully before entering credentials',
      'Be suspicious of login pages that look different from usual'
    ],
    learnMore: 'https://www.cisa.gov/news-events/news/understanding-and-defending-against-credential-stuffing'
  }
}

// Map actual scam_type values from scans to education keys
// Returns an array since one scam type might map to multiple education keys
function mapScamTypeToEducationKeys(scamType) {
  if (!scamType) return []
  
  const lowerType = scamType.toLowerCase()
  const keys = new Set()
  
  // Check for phishing-related scams first (includes credential harvesting phishing)
  if (lowerType.includes('phishing')) {
    keys.add('phishing')
  }
  
  // Check for credential-related scams (separate from phishing)
  if (lowerType.includes('credential') && !lowerType.includes('phishing')) {
    keys.add('credential_theft')
  }
  
  // If it's credential harvesting phishing, show both
  if (lowerType.includes('credential') && lowerType.includes('phishing')) {
    keys.add('phishing')
    keys.add('credential_theft')
  }
  
  // Check for tech support scams
  if (lowerType.includes('tech_support') || lowerType.includes('tech support')) {
    keys.add('tech_support')
  }
  
  // Check for romance scams
  if (lowerType.includes('romance')) {
    keys.add('romance')
  }
  
  // Check for investment scams
  if (lowerType.includes('investment') || lowerType.includes('financial')) {
    keys.add('investment')
  }
  
  // Check for lottery/sweepstakes scams
  if (lowerType.includes('lottery') || lowerType.includes('sweepstakes') || lowerType.includes('prize')) {
    keys.add('lottery_sweepstakes')
  }
  
  // Check for impersonation scams
  if (lowerType.includes('impersonation') || lowerType.includes('identity')) {
    keys.add('impersonation')
  }
  
  // Try direct match
  if (scamEducation[scamType]) {
    keys.add(scamType)
  }
  
  // Try with normalized format
  const normalized = lowerType.replace(/\s+/g, '_')
  if (scamEducation[normalized]) {
    keys.add(normalized)
  }
  
  return Array.from(keys)
}

export default function ScamEducation({ scanHistory }) {
  const detectedScamTypes = useMemo(() => {
    if (!scanHistory || scanHistory.length === 0) {
      return []
    }

    const breakdown = calculateScamTypeBreakdown(scanHistory)
    
    // Map actual scam types to education keys with counts
    const educationKeyCounts = new Map()
    
    Object.entries(breakdown).forEach(([scamType, count]) => {
      const mappedKeys = mapScamTypeToEducationKeys(scamType)
      mappedKeys.forEach(key => {
        if (scamEducation[key]) {
          // Add count to existing or set new count
          const currentCount = educationKeyCounts.get(key) || 0
          educationKeyCounts.set(key, currentCount + count)
        }
      })
    })
    
    // Convert to array and sort by count (most common first)
    const sorted = Array.from(educationKeyCounts.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([key]) => key) // Extract just the keys
    
    return sorted
  }, [scanHistory])

  if (detectedScamTypes.length === 0) {
    return null // Don't show if no scam types detected
  }

  // Limit to 4 items
  const displayedScamTypes = detectedScamTypes.slice(0, 4)
  const hasMore = detectedScamTypes.length > 4

  return (
    <Card className="mb-8" id="scam-education" data-scam-education>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-500" />
          <CardTitle>Scam Education</CardTitle>
        </div>
        <CardDescription>
          Learn how to protect yourself from your most common threats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`space-y-4 ${hasMore ? 'max-h-[600px] overflow-y-auto pr-2' : ''}`}>
          {displayedScamTypes.map((scamType) => {
            const education = scamEducation[scamType]
            if (!education) return null

            return (
              <Collapsible key={scamType} className="border rounded-lg" id={`scam-education-${scamType}`}>
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div className="text-left">
                      <div className="font-semibold">{education.title}</div>
                      <div className="text-sm text-muted-foreground">{education.description}</div>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 space-y-3">
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">How to Protect Yourself:</span>
                    </div>
                    <ul className="space-y-2 ml-6">
                      {education.tips.map((tip, index) => (
                        <li key={index} className="text-sm text-muted-foreground list-disc">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {education.learnMore && (
                    <a
                      href={education.learnMore}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-purple-500 hover:text-purple-600 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Learn More
                    </a>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
        {hasMore && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Showing 4 most common threats. Scroll to see more.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
