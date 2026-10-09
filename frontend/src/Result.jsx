import { useEffect, useRef } from 'react'

const TONE = {
  ok: { fg: 'var(--ok)', bg: 'var(--ok-bg)' },
  warn: { fg: 'var(--warn)', bg: 'var(--warn-bg)' },
  bad: { fg: 'var(--bad)', bg: 'var(--bad-bg)' },
}

// Confidence from the model is not calibrated, so we show a coarse risk level instead of a percentage.
export function riskLevel(r) {
  if (!r.is_scam) return 'low'
  const strong = (r.signals || []).filter((s) => !['job_offer', 'loan_offer', 'pidgin', 'legit_alert_format'].includes(s)).length
  return strong >= 2 ? 'high' : 'medium'
}

function Icon({ kind }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (kind === 'ok')
    return (<svg {...common}><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z" /><path d="m8.8 12 2.4 2.4 4.2-4.8" /></svg>)
  return (<svg {...common}><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z" /><path d="M12 8.2v4.4" /><path d="M12 15.8h.01" /></svg>)
}

export default function Result({ data, t }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus({ preventScroll: false }) }, [data])

  const level = riskLevel(data)
  const tone = !data.is_scam ? 'ok' : level === 'high' ? 'bad' : 'warn'
  const c = TONE[tone]
  const reasons = data.reasons || []

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-live="polite"
      className="rise mt-10 overflow-hidden rounded-2xl border outline-none"
      style={{ borderColor: 'var(--line)', background: 'var(--card)' }}
    >
      {/* verdict header */}
      <div className="flex items-start gap-4 p-6 sm:p-7" style={{ background: c.bg, color: c.fg }}>
        <div className="mt-1 shrink-0"><Icon kind={data.is_scam ? 'bad' : 'ok'} /></div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] opacity-80">
            {t.verdict}
          </p>
          <h2 className="font-display mt-1 text-3xl leading-tight sm:text-4xl" style={{ color: 'var(--ink)' }}>
            {data.is_scam ? `${t.scamTitle}: ${data.verdict}` : t.safeTitle}
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] opacity-80">{t.risk}</p>
          <p className="mt-1 text-lg font-semibold">{t[level]}</p>
        </div>
      </div>

      {/* reasons */}
      <div className="p-6 sm:p-7">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>{t.why}</h3>
        {data.explanation && (
          <p className="mt-3 text-[17px] leading-relaxed">{data.explanation}</p>
        )}
        {reasons.length > 0 ? (
          <ul className={`${data.explanation ? 'mt-4' : 'mt-3'} divide-y`} style={{ borderColor: 'var(--line)' }}>
            {reasons.map((r, i) => (
              <li key={i} className="flex gap-3 py-3 text-[15.5px] leading-relaxed" style={{ borderColor: 'var(--line)' }}>
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.fg }} aria-hidden="true" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        ) : !data.explanation && (
          <p className="mt-3 text-[15.5px]" style={{ color: 'var(--muted)' }}>{t.noFlags}</p>
        )}

        {/* signals as mono tags */}
        {data.signals?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.signals.filter((s) => s !== 'pidgin').map((s) => (
              <span key={s} className="rounded-md border px-2 py-1 font-mono text-[11.5px]" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>{s}</span>
            ))}
          </div>
        )}

        {/* advice */}
        <div className="mt-6 rounded-xl border p-4" style={{ borderColor: 'var(--line)' }}>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>{t.next}</h3>
          <p className="mt-2 text-[15.5px] leading-relaxed">{data.advice}</p>
        </div>

        <p className="mt-5 font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
          {data.explanation_source === 'llm' ? t.aiNote : t.rulesNote}
        </p>
      </div>
    </section>
  )
}
