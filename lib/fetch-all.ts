const PAGE = 1000

// PostgREST returns at most 1000 rows per request; read every page. The
// query must have a stable order.
// Throws on a failed page: a silent empty list would read as "nobody" (for
// example, nobody opted out).
export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error?: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) return out
  }
}

export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}
