'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onNativePushTap } from '@/lib/native'

// iPhone app only: wires notification taps to in-app navigation.
export default function NativeBoot() {
  const router = useRouter()
  useEffect(() => onNativePushTap(path => router.push(path)), [router])
  return null
}
