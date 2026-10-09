export default function Logo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3 5 7v8c0 7 4.6 12.2 11 14 6.4-1.8 11-7 11-14V7z" fill="currentColor" />
      <path d="m11 16 4 4 7-8" fill="none" stroke="var(--paper)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
