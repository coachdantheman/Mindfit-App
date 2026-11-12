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

    // In the native shell the webview itself shrinks for the keyboard, so the
    // measured inset is ~0. A focused text field also counts as "keyboard up".
    const typing = (el: Element | null) => {
      if (!el) return false
      if (el instanceof HTMLTextAreaElement || (el as HTMLElement).isContentEditable) return true
      return el instanceof HTMLInputElement && /^(text|search|email|number|tel|url|password)$/.test(el.type)
    }

    const update = () => {
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      const open = kb > 80
      root.style.setProperty('--kb', `${open ? kb : 0}px`)
      root.classList.toggle('kb-open', open || typing(document.activeElement))
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    const onFocusOut = () => setTimeout(update, 50)
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null
      update()
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
    document.addEventListener('focusout', onFocusOut)
    return () => {
      clearTimeout(timer)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      root.style.removeProperty('--kb')
      root.classList.remove('kb-open')
    }
  }, [])
}
