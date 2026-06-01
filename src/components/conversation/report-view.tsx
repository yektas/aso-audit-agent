import { ChevronRight, Route, TriangleAlert } from 'lucide-react'

import type { WorkflowOutput } from '@/mastra/workflows/listing-audit/schemas'

type Report = WorkflowOutput['report']
type ScoreFactor = Report['scoreCard'][number]
type Recommendation = Report['quickWins'][number]
type CompetitorComparison = Report['competitorComparison'][number]

const RATING_FORMAT = new Intl.NumberFormat('en', { maximumFractionDigits: 1 })
const COUNT_FORMAT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

const ACTION_GROUPS = [
  ['Quick wins', 'Implement today', 'quickWins'],
  ['High-impact changes', 'This week', 'highImpactChanges'],
  ['Strategic recommendations', 'This month', 'strategicRecommendations'],
] as const

function scoreTone(scoreOutOfTen: number) {
  if (scoreOutOfTen >= 7.5) {
    return { barClassName: 'bg-primary', accent: 'var(--primary)', textClassName: 'text-primary' }
  }

  if (scoreOutOfTen >= 6) {
    return { barClassName: 'bg-amber-400', accent: '#fbbf24', textClassName: 'text-amber-400' }
  }

  return { barClassName: 'bg-rose-400', accent: '#fb7185', textClassName: 'text-rose-400' }
}

function ScoreBar({ score }: { score: number }) {
  const normalizedScore = Math.max(0, Math.min(10, score))
  const tone = scoreTone(normalizedScore)

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${tone.barClassName}`} style={{ width: `${normalizedScore * 10}%` }} />
    </div>
  )
}

function OverallScoreMark({ score, confidence }: { score: number; confidence: Report['confidence'] }) {
  const normalizedScore = Math.max(0, Math.min(100, score))
  const tone = scoreTone(normalizedScore / 10)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const progressLength = (normalizedScore / 100) * circumference

  return (
    <figure
      className="w-32 shrink-0 rounded-lg border border-border bg-background px-2 pb-2 pt-1.5 text-center"
      aria-label={`ASO score ${Math.round(normalizedScore)} out of 100, ${confidence} confidence`}
    >
      <svg viewBox="0 0 112 112" className="mx-auto size-24" aria-hidden="true">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={tone.accent}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${progressLength} ${circumference}`}
          transform="rotate(-90 56 56)"
        />
        <text x="56" y="53" textAnchor="middle" className={`font-mono text-2xl font-medium ${tone.textClassName}`} fill="currentColor">
          {Math.round(normalizedScore)}
        </text>
        <text x="56" y="70" textAnchor="middle" className="fill-foreground/48 text-[10px]">
          ASO score
        </text>
      </svg>
      <figcaption className={`text-[10px] capitalize ${tone.textClassName}`}>{confidence} confidence</figcaption>
    </figure>
  )
}

function BeforeAfterExamples({ recommendation }: { recommendation: Recommendation }) {
  if (recommendation.beforeAfterExamples.length === 0) {
    return null
  }

  return (
    <div className="mt-3 space-y-2">
      {recommendation.beforeAfterExamples.map((example) => (
        <div
          key={`${recommendation.title}-${example.field}-${example.after}`}
          className="grid overflow-hidden rounded-md border border-border bg-muted/40 text-xs leading-5 sm:grid-cols-2"
        >
          <div className="px-3 py-2.5 text-foreground/48">
            <span className="mr-2 font-mono text-[11px] text-foreground/32">FROM</span>
            <span className="text-foreground/58">{example.before}</span>
          </div>
          <div className="border-t border-border px-3 py-2.5 sm:border-l sm:border-t-0">
            <span className="mr-2 font-mono text-[11px] text-primary/70">TO</span>
            <span className="text-foreground/86">{example.after}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function RecommendationSupport({ recommendation }: { recommendation: Recommendation }) {
  const exampleRationales = recommendation.beforeAfterExamples.map((example) => example.rationale)
  const sourceCount = recommendation.evidence.length

  return (
    <details className="prose group mt-3 border-t border-border pt-2 text-xs">
      <summary className="flex list-none items-center gap-2 py-1 text-foreground/46 marker:content-none hover:text-foreground/64 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3 text-primary/64 transition-transform group-open:rotate-90" aria-hidden="true" />
        Details
        <span className="text-foreground/28">
          {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
        </span>
      </summary>
      <div className="mt-2 space-y-2.5 border-l border-border pl-3 leading-5">
        <p className="text-foreground/58">{recommendation.action}</p>
        <p className="text-primary/64">{recommendation.expectedImpact}</p>
        {exampleRationales.map((rationale, index) => (
          <p key={`${index}-${rationale}`} className="text-foreground/48">{rationale}</p>
        ))}
        <ul className="space-y-1 text-foreground/38">
          {recommendation.evidence.map((item, index) => (
            <li key={`${index}-${item}`}>Evidence: {item}</li>
          ))}
        </ul>
      </div>
    </details>
  )
}

function RecommendationItem({
  recommendation,
  index,
}: {
  recommendation: Recommendation
  index: number
}) {
  return (
    <li className="grid min-w-0 gap-2.5 py-3.5 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-3">
      <p className="font-mono text-xs leading-6 text-foreground/32">{String(index + 1).padStart(2, '0')}</p>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-6 text-foreground/88">{recommendation.title}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-foreground/56">{recommendation.action}</p>
        <BeforeAfterExamples recommendation={recommendation} />
        <RecommendationSupport recommendation={recommendation} />
      </div>
    </li>
  )
}

function RecommendationGroup({
  label,
  timing,
  recommendations,
  startIndex,
}: {
  label: string
  timing: string
  recommendations: Recommendation[]
  startIndex: number
}) {
  return (
    <section className="border-b border-border px-4 py-4 last:border-b-0 sm:px-5">
      <div className="mb-1 flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-primary/82">{label}</h3>
        <p className="font-mono text-[11px] text-foreground/34">{timing}</p>
      </div>
      <ol start={startIndex + 1} className="divide-y divide-border">
        {recommendations.map((recommendation, index) => (
          <RecommendationItem
            key={recommendation.title}
            recommendation={recommendation}
            index={startIndex + index}
          />
        ))}
      </ol>
    </section>
  )
}

function ActionPlan({ report }: { report: Report }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-medium text-foreground/90">Recommended action sequence</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/58">{report.summary}</p>
          </div>
          <OverallScoreMark score={report.overallScore} confidence={report.confidence} />
        </div>
      </div>

      {ACTION_GROUPS.map(([group, timing, key], groupIndex) => {
        const startIndex = ACTION_GROUPS
          .slice(0, groupIndex)
          .reduce((count, [, , previousKey]) => count + report[previousKey].length, 0)

        return (
          <RecommendationGroup
            key={key}
            label={group}
            timing={timing}
            recommendations={report[key]}
            startIndex={startIndex}
          />
        )
      })}
    </section>
  )
}

function FactorDrag({ factors }: { factors: ScoreFactor[] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Route className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-medium text-foreground/84">Factor drag</h3>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {factors
          .slice()
          .sort((a, b) => a.score - b.score)
          .map((factor) => (
            <div key={factor.factor} className="rounded-md border border-border bg-muted/40 p-3">
              <div className="mb-2 flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-foreground/78" title={factor.label}>{factor.label}</p>
                  <p className="mt-1 text-xs text-foreground/34">Weight {factor.weight}%</p>
                </div>
                <p className="shrink-0 font-mono text-xs text-foreground/46">{factor.score.toFixed(1)}/10</p>
              </div>
              <ScoreBar score={factor.score} />
              <p className="mt-2 text-xs leading-5 text-foreground/46">{factor.rationale}</p>
            </div>
          ))}
      </div>
    </section>
  )
}

function CompetitiveRead({ competitors }: { competitors: CompetitorComparison[] }) {
  if (competitors.length === 0) {
    return null
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <TriangleAlert className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-medium text-foreground/84">Competitive read</h3>
      </div>
      <div className="mt-4 space-y-3">
        {competitors.map((competitor) => (
          <div key={`${competitor.app}-${competitor.developer}`} className="rounded-md border border-border bg-muted/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground/76" title={competitor.app}>{competitor.app}</p>
                <p className="mt-1 text-xs text-foreground/34">
                  {competitor.developer ?? 'Unknown developer'}{competitor.category ? ` - ${competitor.category}` : ''}
                </p>
              </div>
              <p className="shrink-0 text-right font-mono text-xs text-foreground/42">
                {competitor.rating !== null ? `${RATING_FORMAT.format(competitor.rating)} stars` : 'No rating'}
                {competitor.ratingCount !== null ? ` (${COUNT_FORMAT.format(competitor.ratingCount)})` : ''}
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-foreground/50">{competitor.signal}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function ReportView({ report }: { report: Report }) {
  return (
    <div className="mt-3 w-full max-w-5xl space-y-5">
      <ActionPlan report={report} />
      <FactorDrag factors={report.scoreCard} />
      <CompetitiveRead competitors={report.competitorComparison} />
    </div>
  )
}
