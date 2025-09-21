import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import usePlayer from '@/hooks/use-player'
import { Pause, Play } from 'lucide-react'

export default function FooterPlayer() {
  const {
    stateQ,
    devicesQ,
    playPause,
    next,
    prev,
    setVolume,
    transfer,
    current,
    artistNames,
  } = usePlayer()

  const volume = stateQ.data?.device?.volume_percent ?? 50
  const progress = (() => {
    const d = current?.duration_ms ?? 0
    const p = stateQ.data?.progress_ms ?? 0
    if (!d) return 0
    return Math.max(0, Math.min(100, Math.round((p / d) * 100)))
  })()
  const devices = devicesQ.data ?? []

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-5 px-24">
      <div className="flex items-center gap-3">
        {current?.album?.images?.[2]?.url && (
          <img
            src={current.album.images[2].url}
            alt=""
            className="w-10 h-10 rounded"
          />
        )}
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">
            {current?.name ?? 'Nothing playing'}
          </div>
          <div className="text-xs opacity-80 truncate">{artistNames}</div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <Button size="sm" variant="outline" onClick={prev}>
            Prev
          </Button>
          <Button
            size="sm"
            className="rounded-full w-8 h-8"
            onClick={playPause}
            aria-busy={stateQ.isFetching}
          >
            {stateQ.data?.is_playing ? <Pause /> : <Play />}
          </Button>
          <Button size="sm" variant="outline" onClick={next}>
            Next
          </Button>
        </div>
        <div className="flex items-center gap-3 ml-6">
          <div className="w-56 h-1 rounded bg-muted/40">
            <div
              className="h-1 rounded bg-primary transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs opacity-80">Vol</span>
          <Slider
            defaultValue={[volume]}
            max={100}
            step={1}
            className="w-28"
            onValueCommit={(v) => setVolume(v[0] ?? volume)}
          />
          {devices.length > 0 && (
            <select
              className="text-sm border rounded px-2 py-1"
              defaultValue={devices.find((d: any) => d.is_active)?.id ?? ''}
              onChange={(e) => e.target.value && transfer(e.target.value)}
            >
              {devices.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </footer>
  )
}
