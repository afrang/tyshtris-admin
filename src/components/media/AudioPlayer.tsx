import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import './AudioPlayer.css'

type Props = {
  src: string
  title?: string | null
  compact?: boolean
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AudioPlayer({ src, title, compact = false }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.85)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.load()
    setPlaying(false)
    setCurrent(0)
    setDuration(0)
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = muted ? 0 : volume
  }, [volume, muted])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play()
      setPlaying(true)
    } else {
      audio.pause()
      setPlaying(false)
    }
  }

  function seek(value: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setCurrent(value)
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div className={`audio-player${compact ? ' audio-player--compact' : ''}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime || 0)}
        onEnded={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <div className="audio-player-art" aria-hidden="true">
        <span className={`audio-player-bars${playing ? ' is-playing' : ''}`}>
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>

      <div className="audio-player-body">
        <div className="audio-player-top">
          <button
            type="button"
            className="audio-player-play"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <div className="audio-player-copy">
            <strong>{title?.trim() || 'Audio track'}</strong>
            <span>
              {formatTime(current)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        <label className="audio-player-seek">
          <span className="audio-player-seek-track">
            <span className="audio-player-seek-fill" style={{ width: `${progress}%` }} />
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            aria-label="Seek"
            onChange={(e) => seek(Number(e.target.value))}
          />
        </label>

        <div className="audio-player-volume">
          <button
            type="button"
            className="audio-player-mute"
            aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
            onClick={() => setMuted((v) => !v)}
          >
            {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            aria-label="Volume"
            onChange={(e) => {
              const next = Number(e.target.value)
              setVolume(next)
              setMuted(next === 0)
            }}
          />
        </div>
      </div>
    </div>
  )
}
