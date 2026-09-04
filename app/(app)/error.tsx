'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-fg-3 text-sm">Something went wrong loading this page.</p>
      <button
        onClick={reset}
        className="px-5 py-2 rounded-xl bg-cta text-fg-inverse font-semibold text-sm"
      >
        Try again
      </button>
    </div>
  )
}
