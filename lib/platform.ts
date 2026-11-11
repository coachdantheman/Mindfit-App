// The iPhone app is this site inside a native shell that adds "MindFitApp"
// to the user agent. app/layout.tsx puts `native-app` on <html> before
// first paint, so `.web-only` / `.native-only` (globals.css) never flash.
export const NATIVE_UA = 'MindFitApp'

export function isNativeApp(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('native-app')
}
