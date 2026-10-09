import { useRef, useState } from 'react'
import Logo from './Logo.jsx'
import Result from './Result.jsx'
import { analyze } from './api.js'
import { T, EXAMPLES } from './i18n.js'

const MAX = 2000

export default function App() {
  const [lang, setLang] = useState('en')
  const [text, setText] = useState('')
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [data, setData] = useState(null)
  const [hint, setHint] = useState('')
  const [errStatus, setErrStatus] = useState(0)
  const ctrl = useRef(null)
  const t = T[lang]

  async function run(value = text, l = lang) {
    const v = value.trim()
    if (v.length < 3) { setHint(T[l].short); return }
    setHint('')
    ctrl.current?.abort()
    ctrl.current = new AbortController()
    setState('loading')
    try {
      const res = await analyze(v, l, ctrl.current.signal)
      setData(res)
      setState('done')
    } catch (e) {
      if (e.name !== 'AbortError') { setErrStatus(e.status || 0); setState('error') }
    }
  }

  function switchLang(l) {
    setLang(l)
    document.documentElement.lang = l === 'pcm' ? 'pcm' : 'en'
    if (state === 'done' && text.trim()) run(text, l) // re-explain in the new language
  }

  function reset() {
    ctrl.current?.abort()
    setText(''); setData(null); setState('idle'); setHint('')
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[520px]" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[680px] flex-col px-5 pb-10 pt-6 sm:px-6">
        {/* header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight">ScamShield <span className="font-normal" style={{ color: 'var(--muted)' }}>Naija</span></span>
          </div>
          <div role="group" aria-label={t.lang} className="flex rounded-lg border p-0.5 text-[13px]" style={{ borderColor: 'var(--line)', background: 'var(--card)' }}>
            {[['en', 'English'], ['pcm', 'Pidgin']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => switchLang(k)}
                aria-pressed={lang === k}
                className="cursor-pointer rounded-md px-3 py-1.5 font-medium transition-colors"
                style={lang === k ? { background: 'var(--ink)', color: 'var(--paper)' } : { color: 'var(--muted)' }}
              >{label}</button>
            ))}
          </div>
        </header>

        {/* hero */}
        <main className="flex-1">
          <div className="rise pt-14 sm:pt-20">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>{t.tagline}</p>
            <h1 className="font-display mt-4 text-[44px] leading-[1.02] tracking-tight sm:text-[64px]">
              {t.h1a}<br /><em className="italic">{t.h1b}</em>
            </h1>
            <p className="mt-5 max-w-[52ch] text-[16.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>{t.sub}</p>
          </div>

          {/* input */}
          <div className="rise mt-9" style={{ animationDelay: '.08s' }}>
            <div className="relative overflow-hidden rounded-2xl border transition-shadow focus-within:shadow-[0_0_0_3px_var(--line)]" style={{ borderColor: 'var(--line)', background: 'var(--card)' }}>
              <label htmlFor="msg" className="sr-only">{t.placeholder}</label>
              <textarea
                id="msg"
                value={text}
                onChange={(e) => { setText(e.target.value.slice(0, MAX)); setHint('') }}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run() }}
                placeholder={t.placeholder}
                rows={6}
                className="block w-full resize-none bg-transparent p-5 text-[16.5px] leading-relaxed outline-none placeholder:opacity-50"
                style={{ color: 'var(--ink)' }}
              />
              {state === 'loading' && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                  <div className="scanline absolute inset-x-0 h-1/2" style={{ background: 'linear-gradient(to bottom, transparent, var(--line), transparent)' }} />
                </div>
              )}
              <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: 'var(--line)' }}>
                <span className="font-mono text-[11.5px]" style={{ color: 'var(--muted)' }}>{text.length}/{MAX}</span>
                <div className="flex items-center gap-2">
                  {(text || data) && (
                    <button onClick={reset} className="cursor-pointer rounded-lg px-3 py-2 text-[14px] font-medium" style={{ color: 'var(--muted)' }}>{t.clear}</button>
                  )}
                  <button
                    onClick={() => run()}
                    disabled={state === 'loading'}
                    className="cursor-pointer rounded-lg px-5 py-2.5 text-[14.5px] font-semibold transition-opacity disabled:cursor-wait disabled:opacity-60"
                    style={{ background: 'var(--ink)', color: 'var(--paper)' }}
                  >{state === 'loading' ? t.checking : t.check}</button>
                </div>
              </div>
            </div>
            {hint && <p role="alert" className="mt-2 text-[13.5px]" style={{ color: 'var(--bad)' }}>{hint}</p>}

            {/* examples */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[13px]" style={{ color: 'var(--muted)' }}>{t.tryOne}:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => { setText(ex.text); run(ex.text) }}
                  className="cursor-pointer rounded-full border px-3 py-1.5 text-[13px] transition-colors hover:bg-[var(--card)]"
                  style={{ borderColor: 'var(--line)' }}
                >{ex.label[lang]}</button>
              ))}
            </div>
          </div>

          {state === 'error' && (
            <div role="alert" className="rise mt-10 rounded-2xl border p-6" style={{ borderColor: 'var(--line)', background: 'var(--card)' }}>
              <h2 className="font-display text-2xl">{t.errTitle}</h2>
              <p className="mt-2 text-[15.5px]" style={{ color: 'var(--muted)' }}>{errStatus === 429 ? t.errRate : t.errBody}</p>
            </div>
          )}
          {state === 'done' && data && <Result data={data} t={t} />}
        </main>

        <footer className="mt-16 border-t pt-5 text-[13px] leading-relaxed" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
          {t.foot}
        </footer>
      </div>
    </div>
  )
}
