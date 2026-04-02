import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MindFit | Mental Skills Training',
  description: 'Track your mental performance and daily objectives.',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-mindfit-bg text-gray-100 antialiased">
        {children}
      </body>
    </html>
  )
}
