export const PHOTO_SLOTS = ['front', 'side', 'back'] as const
export type PhotoSlot = (typeof PHOTO_SLOTS)[number]

export interface WeighInWithPhotos { id: string; entry_date: string; weight_lb: number; photo_slots?: string[] }

// Default comparison: the earliest and latest weigh-ins that have photos.
export function pickCompareDates<T extends WeighInWithPhotos>(weighIns: T[]): [T, T] | null {
  const withPhotos = weighIns
    .filter(w => (w.photo_slots?.length ?? 0) > 0)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  if (withPhotos.length < 2) return null
  return [withPhotos[0], withPhotos[withPhotos.length - 1]]
}

// Browser-only: downscale to ≤ maxEdge px and re-encode as JPEG so uploads
// stay small and iPhone HEIC never reaches the server.
export async function downscaleImage(file: File, maxEdge = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality)
  )
}
