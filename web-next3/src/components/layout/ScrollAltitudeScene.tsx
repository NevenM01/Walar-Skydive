import { type CSSProperties, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { WalarShaderBackdrop } from './WalarShaderBackdrop'

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function computeProgress(): number {
  const doc = document.documentElement
  const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight)
  return clamp01(window.scrollY / maxScroll)
}

/** CSS var defaults so first paint and calc() are valid before the scroll loop runs */
const sceneVarStyle = {
  ['--scroll' as string]: '0',
  ['--px' as string]: '0',
  ['--cloud-band-a' as string]: '0.5',
  ['--cloud-mid-a' as string]: '0.14',
  ['--cloud-mid-dim-a' as string]: '0.1288',
  ['--ground-r' as string]: '0',
} as CSSProperties

export function ScrollAltitudeScene() {
  const [reduceMotion, setReduceMotion] = useState(false)
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useLayoutEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    let raf = 0
    let ticking = false

    const apply = () => {
      ticking = false
      const p = computeProgress()
      const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const px = prefersReduce ? 0 : p

      const cloudBand = 0.24 + (1 - p) * 0.22
      const cloudMid = p < 0.7 ? 0.14 + p * 0.34 : 0.24
      const groundR = Math.max(0, (p - 0.55) / 0.45)

      scene.style.setProperty('--scroll', String(p))
      scene.style.setProperty('--px', String(px))
      scene.style.setProperty('--cloud-band-a', String(Math.min(0.95, cloudBand + 0.04)))
      scene.style.setProperty('--cloud-mid-a', String(cloudMid))
      scene.style.setProperty('--cloud-mid-dim-a', String(cloudMid * 0.92))
      scene.style.setProperty('--ground-r', String(groundR))
    }

    const schedule = () => {
      if (ticking) return
      ticking = true
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(apply)
    }

    apply()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <div
      ref={sceneRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={sceneVarStyle}
      aria-hidden
    >
      {!reduceMotion && (
        <Suspense fallback={null}>
          <WalarShaderBackdrop />
        </Suspense>
      )}
      <div
        className="absolute inset-0 z-[1] dark:hidden"
        style={{
          background:
            'linear-gradient(180deg, rgba(240,249,255,0.34) 0%, rgba(224,242,254,0.22) 32%, rgba(186,230,253,0.2) 58%, rgba(125,211,252,0.14) 82%, rgba(224,242,254,0.18) 100%)',
        }}
      />
      <div
        className="absolute inset-0 z-[1] hidden dark:block"
        style={{
          background:
            'linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(12,74,110,0.35) 38%, rgba(8,47,73,0.28) 70%, rgba(15,23,42,0.4) 100%)',
        }}
      />
      <div
        className="absolute -top-[20%] left-[20%] z-[1] h-[55%] w-[90%] rounded-full blur-3xl will-change-transform dark:opacity-70"
        style={{
          background: 'radial-gradient(circle, rgba(12,74,110,0.14) 0%, rgba(56,189,248,0.06) 45%, transparent 70%)',
          transform:
            'translate3d(calc(var(--px) * -6px), calc(var(--px) * 16px), 0) scale(calc(1 + var(--px) * 0.02))',
        }}
      />
      <div
        className="absolute inset-0 z-[1] will-change-transform dark:opacity-75"
        style={{
          background: `
              radial-gradient(ellipse 135% 58% at 50% -10%, rgba(56,189,248,0.28), transparent 50%),
              radial-gradient(ellipse 88% 40% at 50% 58%, rgba(125,211,252,0.16), transparent 55%),
              radial-gradient(ellipse 70% 30% at 18% 40%, rgba(14,165,233,0.1), transparent 60%)
            `,
          transform: 'translate3d(0, calc(var(--px) * 14px), 0)',
        }}
      />
      <div
        className="absolute inset-0 z-[1] dark:opacity-90"
        style={{
          background: `
              radial-gradient(ellipse 72% 58% at 50% 40%, transparent 26%, rgba(12,74,110,0.11) 100%),
              linear-gradient(180deg, rgba(12,74,110,0.05) 0%, transparent 18%, transparent 78%, rgba(12,74,110,0.06) 100%)
            `,
        }}
      />

      <div
        className="absolute -top-14 left-[8%] z-[1] h-36 w-80 rounded-full blur-2xl will-change-transform"
        style={{
          backgroundColor: 'rgba(255, 255, 255, var(--cloud-band-a))',
          transform:
            'translate3d(0, calc(var(--px) * 40px), 0) scale(calc(1 + var(--px) * 0.015))',
        }}
      />
      <div
        className="absolute top-[28%] right-[7%] z-[1] h-32 w-72 rounded-full blur-2xl will-change-transform"
        style={{
          backgroundColor: 'rgba(255, 255, 255, var(--cloud-mid-a))',
          transform: 'translate3d(0, calc(var(--px) * -28px), 0)',
        }}
      />
      <div
        className="absolute top-[45%] left-[20%] z-[1] h-28 w-60 rounded-full blur-2xl will-change-transform"
        style={{
          backgroundColor: 'rgba(255, 255, 255, var(--cloud-mid-dim-a))',
          transform: 'translate3d(0, calc(var(--px) * 18px), 0)',
        }}
      />
      <div
        className="absolute left-[-10%] top-[52%] z-[1] h-48 w-[120%] rounded-[100%] blur-3xl will-change-transform"
        style={{
          background: `linear-gradient(180deg, rgba(14,165,233,0.1) 0%, rgba(56,189,248,0.05) 100%)`,
          transform: 'translateY(calc(var(--px) * -36px))',
        }}
      />

      <div className="altitude-depth-grain absolute inset-0 z-[1] max-lg:opacity-0" />

      <div
        className="absolute inset-x-0 bottom-0 z-[2] max-md:opacity-90 dark:opacity-95"
        style={{
          height: 'calc(var(--ground-r) * 44%)',
          background:
            'linear-gradient(180deg, rgba(163,230,53,0.06) 0%, rgba(132,204,22,0.26) 48%, rgba(63,98,18,0.34) 100%)',
          transform: 'translateY(calc((1 - var(--ground-r)) * 45%))',
        }}
      />
    </div>
  )
}
