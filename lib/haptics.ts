'use client'
// Small physical feedback on taps. Android: the Vibration API. iPhone has
// no Vibration API, but toggling a native switch control gives a system
// tick on iOS 17.4+, so a hidden switch is clicked instead. Both are best
// effort: where neither works, nothing happens.

let iosSwitch: HTMLLabelElement | null = null

function iosTick() {
  if (typeof document === 'undefined') return
  if (!iosSwitch) {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.cssText = 'position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0;pointer-events:none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    label.appendChild(input)
    document.body.appendChild(label)
    iosSwitch = label
  }
  iosSwitch.click()
}

function buzz(pattern: number | number[], iosTicks: number) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
      return
    }
    for (let i = 0; i < iosTicks; i++) setTimeout(iosTick, i * 90)
  } catch {}
}

export const haptic = {
  /** One step of a dial or stepper. */
  tick: () => buzz(6, 1),
  /** A tap that commits something small: a checkbox, a chip. */
  tap: () => buzz(10, 1),
  /** Saved, finished, streak kept. */
  success: () => buzz([12, 50, 18], 2),
}
