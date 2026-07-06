'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-gray-400 text-sm">Something went wrong loading this page.</p>
      <button
        onClick={reset}
        className="px-5 py-2 rounded-xl bg-cta text-mindfit-bg font-semibold text-sm"
      >
        Try again
      </button>
    </div>
  )
}
