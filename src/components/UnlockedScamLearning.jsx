import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { BookOpen, ChevronDown, ChevronUp, History, Sparkles, Shield } from 'lucide-react'
import { CategoryIcon } from './ScamResult'
import { normalizeScamType } from '@/utils/insightsCalculator'

/** Format relative time (e.g. "2 days ago", "1 hour ago") */
function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

/** Infer primary category from title for smart grouping (e.g. "Phishing", "QR Code") */
function getPrimaryCategory(title) {
  if (!title || typeof title !== 'string') return 'Scam'
  const t = title.toLowerCase()
  if (t.includes('phishing') || t.includes('quishing')) return 'Phishing'
  if (t.includes('qr code')) return 'QR / Quishing'
  if (t.includes('reward') || t.includes('prize')) return 'Rewards & Prizes'
  if (t.includes('impersonat')) return 'Impersonation'
  if (t.includes('credential')) return 'Credentials'
  return 'Scam'
}

/** Tailwind classes for category pill and left accent bar */
function getCategoryStyles(category) {
  const styles = {
    'Phishing': { pill: 'bg-amber-500/20 text-amber-400 border-amber-500/40', bar: 'bg-amber-500' },
    'QR / Quishing': { pill: 'bg-violet-500/20 text-violet-400 border-violet-500/40', bar: 'bg-violet-500' },
    'Rewards & Prizes': { pill: 'bg-orange-500/20 text-orange-400 border-orange-500/40', bar: 'bg-orange-500' },
    'Impersonation': { pill: 'bg-rose-500/20 text-rose-400 border-rose-500/40', bar: 'bg-rose-500' },
    'Credentials': { pill: 'bg-red-500/20 text-red-400 border-red-500/40', bar: 'bg-red-500' },
  }
  return styles[category] || { pill: 'bg-slate-500/20 text-slate-400 border-slate-500/40', bar: 'bg-slate-500' }
}

/**
 * Derive unique unlocked learnings from scan history.
 * Filters scam scans with learn_more_data, dedupes by title (or normalized scam_type), keeps latest per key.
 * @param {Array} scanHistory - Full scan history from Dashboard
 * @returns {Array<{ scan: object, learnMoreData: object }>}
 */
function deriveUnlockedLearnings(scanHistory) {
  if (!scanHistory?.length) return []
  const withLearnMore = scanHistory.filter(
    (s) => s.classification === 'scam' && s.learn_more_data && typeof s.learn_more_data === 'object'
  )
  if (withLearnMore.length === 0) return []

  const byKey = new Map()
  for (const scan of withLearnMore) {
    const data = scan.learn_more_data
    const key = (data.title && String(data.title).trim()) || normalizeScamType(scan.analysis_result?.scam_type) || scan.id
    const existing = byKey.get(key)
    const scanAt = scan.created_at ? new Date(scan.created_at).getTime() : 0
    if (!existing || scanAt > (existing.scan.created_at ? new Date(existing.scan.created_at).getTime() : 0)) {
      byKey.set(key, { scan, learnMoreData: data })
    }
  }
  return Array.from(byKey.values()).sort((a, b) => {
    const ta = a.scan.created_at ? new Date(a.scan.created_at).getTime() : 0
    const tb = b.scan.created_at ? new Date(b.scan.created_at).getTime() : 0
    return tb - ta
  })
}

const TYPE_ALL = 'all'

export default function UnlockedScamLearning({ scanHistory, highlight, onViewScan }) {
  const unlockedLearnings = useMemo(() => deriveUnlockedLearnings(scanHistory), [scanHistory])
  const [openId, setOpenId] = useState(null)
  const [typeFilter, setTypeFilter] = useState(TYPE_ALL)

  // Unique type options: All + each category that appears (sorted)
  const typeOptions = useMemo(() => {
    if (!unlockedLearnings.length) return [{ value: TYPE_ALL, label: 'All' }]
    const categories = [...new Set(unlockedLearnings.map(({ learnMoreData }) => getPrimaryCategory(learnMoreData.title)))]
    categories.sort((a, b) => a.localeCompare(b))
    return [{ value: TYPE_ALL, label: 'All' }, ...categories.map((c) => ({ value: c, label: c }))]
  }, [unlockedLearnings])

  // Filtered list by selected type
  const filteredLearnings = useMemo(() => {
    if (typeFilter === TYPE_ALL) return unlockedLearnings
    return unlockedLearnings.filter(({ learnMoreData }) => getPrimaryCategory(learnMoreData.title) === typeFilter)
  }, [unlockedLearnings, typeFilter])

  // Smart stats: unique categories from titles
  const categoryCount = useMemo(() => {
    if (!unlockedLearnings.length) return 0
    const categories = new Set(unlockedLearnings.map(({ learnMoreData }) => getPrimaryCategory(learnMoreData.title)))
    return categories.size
  }, [unlockedLearnings])

  const mostRecentScanAt = unlockedLearnings[0]?.scan?.created_at

  return (
    <Card className={`mb-10 border-border bg-card/50 backdrop-blur-sm transition-all duration-1000 overflow-hidden ${highlight ? 'border-primary shadow-lg shadow-primary/50 ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]' : ''}`} id="unlocked-scam-learning">
      {/* Gradient accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-amber-500/80 to-red-500/80" />
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-3 text-foreground text-xl sm:text-2xl font-bold tracking-tight">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/25 to-amber-500/25 border border-purple-500/40 shadow-sm">
                <BookOpen className="h-5 w-5 text-purple-400" />
              </span>
              Your Scam Library
            </CardTitle>
            <CardDescription className="text-zinc-400 text-sm leading-relaxed max-w-xl">
              Your personal knowledge base—unlocked by using Learn more on scam results.
            </CardDescription>
            {unlockedLearnings.length > 0 && (
              <p className="flex items-center gap-2 text-xs font-medium text-amber-400/95 pt-1">
                <Sparkles className="h-4 w-4" />
                {unlockedLearnings.length} guide{unlockedLearnings.length !== 1 ? 's' : ''} · {categoryCount} type{categoryCount !== 1 ? 's' : ''} covered
              </p>
            )}
          </div>
          {unlockedLearnings.length > 0 && (
            <span className="rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/40 px-4 py-2 text-sm font-semibold text-amber-400 flex items-center gap-2 shadow-sm">
              <Shield className="h-4 w-4" />
              {unlockedLearnings.length} unlocked
            </span>
          )}
        </div>
        {unlockedLearnings.length > 0 && <div className="h-px bg-gradient-to-r from-border via-amber-500/20 to-border mt-2" />}
      </CardHeader>
      <CardContent>
        {unlockedLearnings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-gradient-to-b from-muted/20 to-muted/5 p-8 sm:p-10 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
              <BookOpen className="h-7 w-7 text-purple-400" />
            </div>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
              No guides yet. <strong className="text-foreground">Scan a link, image, or message</strong> to detect scams, then tap <strong className="text-purple-400">Learn more</strong> on a result to unlock your first guide.
            </p>
            <p className="text-muted-foreground/80 text-xs mt-2">Your library grows as you learn.</p>
          </div>
        ) : (
          <>
            {/* Type filter */}
            {typeOptions.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mr-1">Filter by type</span>
                {typeOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTypeFilter(value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium border transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
                      typeFilter === value
                        ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25 ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground hover:border-amber-500/40 hover:shadow-sm'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 dark-scrollbar">
            {filteredLearnings.length === 0 ? (
              <p className="text-muted-foreground text-sm py-6 text-center">
                No guides match &quot;{typeFilter === TYPE_ALL ? 'All' : typeFilter}&quot;. Try another type.
              </p>
            ) : (
            filteredLearnings.map(({ scan, learnMoreData }, index) => {
              const id = scan.id
              const isOpen = openId === id
              const title = learnMoreData.title || 'Scam guide'
              const shortDescription = learnMoreData.short_description || ''
              const howItWorks = learnMoreData.how_it_works || []
              const preventionTips = learnMoreData.prevention_tips || []
              const iconCategory = learnMoreData.icon_category || 'generic'
              const category = getPrimaryCategory(title)
              const accent = getCategoryStyles(category)
              const isNew = index === 0 && mostRecentScanAt && (Date.now() - new Date(mostRecentScanAt).getTime() < 7 * 24 * 3600000) && typeFilter === TYPE_ALL
              const relativeTime = formatRelativeTime(scan.created_at)

              return (
                <Collapsible
                  key={id}
                  open={isOpen}
                  onOpenChange={(open) => setOpenId(open ? id : null)}
                  className="rounded-xl border border-border bg-card/40 transition-all duration-200 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 overflow-hidden"
                >
                  <CollapsibleTrigger className="w-full flex items-stretch gap-0 text-left hover:bg-muted/15 transition-colors">
                    {/* Left accent bar */}
                    <div className={`w-1 flex-shrink-0 ${accent.bar} opacity-80`} />
                    <div className="flex items-start gap-4 p-4 sm:p-5 flex-1 min-w-0">
                      <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-red-500/10 border border-red-500/30 flex-shrink-0">
                        <CategoryIcon category={iconCategory} className="w-6 h-6 sm:w-7 sm:h-7 text-red-400" />
                        {isNew && (
                          <span className="absolute -top-1 -right-1 rounded-full bg-amber-500 text-[10px] font-bold text-black px-1.5 py-0.5">New</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Title row: title + category pill */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-foreground text-base sm:text-lg leading-tight">{title}</h4>
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${accent.pill}`}>
                            {category}
                          </span>
                        </div>
                        {/* Description: muted, clearly separated */}
                        {shortDescription && (
                          <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2 border-l-2 border-muted/50 pl-3">
                            {shortDescription}
                          </p>
                        )}
                        {/* Meta: unlocked time - distinct style */}
                        {relativeTime && (
                          <p className="text-zinc-500 text-xs font-medium flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                            Unlocked {relativeTime}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {onViewScan && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              onViewScan(scan)
                            }}
                            className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-amber-400 hover:border-amber-500/40 hover:bg-amber-500/10 flex items-center gap-1.5 transition-colors"
                            title="View original scan"
                          >
                            <History className="w-4 h-4" />
                            View scan
                          </button>
                        )}
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-zinc-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-4 space-y-6 border-t border-border bg-gradient-to-b from-muted/10 to-transparent rounded-b-xl">
                      {howItWorks.length > 0 && (
                        <section className="space-y-3">
                          <h5 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2 text-red-400">
                            <span className="w-1.5 h-4 bg-red-500 rounded-full" />
                            How it works
                          </h5>
                          <ul className="space-y-2 pl-5 border-l-2 border-red-500/20">
                            {howItWorks.map((item, i) => (
                              <li key={i} className="flex gap-3 text-zinc-400 text-sm leading-relaxed">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">
                                  {i + 1}
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                      {preventionTips.length > 0 && (
                        <section className="space-y-3">
                          <h5 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2 text-emerald-400">
                            <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                            How to stay safe
                          </h5>
                          <ul className="space-y-2 pl-5 border-l-2 border-emerald-500/20">
                            {preventionTips.map((item, i) => (
                              <li key={i} className="flex gap-3 text-zinc-400 text-sm leading-relaxed">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                                  {i + 1}
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })
            )}
          </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
