let audioCtx: AudioContext | null = null

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined
    if (!AC) return null
    audioCtx = new AC()
  }
  return audioCtx
}

export function playChime(freq = 880, duration = 0.35) {
  const c = ctx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, c.currentTime)
  gain.gain.linearRampToValueAtTime(0.18, c.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration)
  osc.connect(gain).connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + duration + 0.02)
}
