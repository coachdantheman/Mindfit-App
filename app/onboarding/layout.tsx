export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-mindfit-bg px-4 py-10 sm:py-16">
      <p className="text-center text-2xl font-bold tracking-widest uppercase text-cta mb-8">MindFit</p>
      {children}
    </div>
  )
}
