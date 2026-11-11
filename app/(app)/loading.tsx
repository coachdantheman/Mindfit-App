'use client'
import { usePathname } from 'next/navigation'
import PageSkeleton, { variantFor } from '@/components/shared/PageSkeleton'

export default function Loading() {
  return <PageSkeleton variant={variantFor(usePathname())} />
}
