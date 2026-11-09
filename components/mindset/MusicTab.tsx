'use client'
import { useState } from 'react'
import { MOMENTS, MusicMoment, Song, appleMusicUrl, spotifyUrl } from '@/lib/data/music'

type Filter = MusicMoment | 'all'

const INTRO = 'Music is a tool. Match it to the moment: raise your energy to compete, lower it to reset. Every song here is clean. Songs marked Clean edit open the clean version.'

function SongRow({ song }: { song: Song }) {
  return (
    <li className="py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex-1 min-w-[12rem]">
        <div className="flex items-center gap-2 min-w-0">
          <p className="min-w-0 truncate text-sm text-fg-1">{song.title}</p>
          {song.clean && (
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-cta border border-cta/40 rounded px-1.5 py-0.5">
              Clean edit
            </span>
          )}
        </div>
        <p className="min-w-0 truncate text-xs text-fg-3">{song.artist}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <a
          href={spotifyUrl(song)}
          target="_blank"
          rel="noopener noreferrer"
          className="tab-btn text-xs min-h-[44px] sm:min-h-0 inline-flex items-center"
        >
          Spotify
        </a>
        <a
          href={appleMusicUrl(song)}
          target="_blank"
          rel="noopener noreferrer"
          className="tab-btn text-xs min-h-[44px] sm:min-h-0 inline-flex items-center"
        >
          Apple Music
        </a>
      </div>
    </li>
  )
}

export default function MusicTab() {
  const [active, setActive] = useState<Filter>(MOMENTS[0].key)
  const shown = active === 'all' ? MOMENTS : MOMENTS.filter(m => m.key === active)
  const chipClass = (f: Filter) => (active === f ? 'tab-btn-active text-xs' : 'tab-btn text-xs')

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-2 leading-relaxed">{INTRO}</p>

      <div className="flex flex-wrap gap-2">
        {MOMENTS.map(m => (
          <button key={m.key} type="button" onClick={() => setActive(m.key)} className={chipClass(m.key)}>
            {m.name}
          </button>
        ))}
        <button type="button" onClick={() => setActive('all')} className={chipClass('all')}>All</button>
      </div>

      {shown.map(m => (
        <section key={m.key} className="card p-5">
          <h2 className="text-base font-semibold text-fg-1">{m.name}</h2>
          <p className="text-xs text-cta mt-1">{m.when}</p>
          <p className="text-sm text-fg-3 mt-2 leading-relaxed">{m.why}</p>
          <ul className="mt-3 divide-y divide-edge">
            {m.songs.map(s => (
              <SongRow key={`${s.title}-${s.artist}`} song={s} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
