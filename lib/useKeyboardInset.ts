'use client'
import { useEffect } from 'react'

// iOS keeps the layout viewport full-height under the on-screen keyboard,
// so fixed bottom chrome and bottom-anchored sheets cover the focused
// field. Publishes the keyboard height as --kb on <html>, toggles
// html.kb-open, and nudges the focused field into view once it settles.
export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement

    const update = () => {
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      const open = kb > 80
      root.style.setProperty('--kb', `${open ? kb : 0}px`)
      root.classList.toggle('kb-open', open)
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null
      if (!t || !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (document.activeElement !== t) return
        const inSheet = !!t.closest('.bottom-sheet')
        t.scrollIntoView({ block: inSheet ? 'nearest' : 'center', behavior: 'smooth' })
      }, 350)
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      clearTimeout(timer)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      document.removeEventListener('focusin', onFocusIn)
      root.style.removeProperty('--kb')
      root.classList.remove('kb-open')
    }
  }, [])
}
