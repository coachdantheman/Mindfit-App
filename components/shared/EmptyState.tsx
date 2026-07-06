import { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export default function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 text-gray-400">
      <p className="font-medium">{title}</p>
      {subtitle && <p className="text-sm mt-1 text-gray-500">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
