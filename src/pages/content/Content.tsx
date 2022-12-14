import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import useStorage from '../../hooks/useStorage'
import useYoutubePlayer from '../../hooks/useYoutubePlayer'
import useChannelWhitelist from '../../hooks/useChannelWhitelist'
import SongsPanel from './SongsPanel'
import DexLink from './DexLink'

export enum RepeatMode {
  Off,
  On,
  One,
}

export enum MusicMode {
  Off,
  On,
}

export interface Song {
  id: string,
  name: string,
  original_artist: string,
  start: number,
  end: number,
  itunesid?: string,
  art?: string,
}

export interface ContentProps {
  player: HTMLElement,
  videoId: string | null,
  channelId: string | null,
  songsPanelContainer: HTMLElement,
  dexLinkContainer: HTMLElement,
}

const Content = ({ player, videoId, channelId, songsPanelContainer, dexLinkContainer } : ContentProps) => {
  const [apiKey] = useStorage<string>('apiKey')
  const [showDexButton] = useStorage('showDexButton', true)
  const [enableWhitelist] = useStorage('enableWhitelist', false)

  const { isWhitelisted } = useChannelWhitelist()
  const { video, paused, currentTime, playingAd } = useYoutubePlayer(player)

  const [songs, setSongs] = useState<Song[]>([])
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [repeatMode, setRepeatMode] = useState(RepeatMode.Off)
  const [musicMode, setMusicMode] = useState(MusicMode.Off)

  useEffect(() => {
    if (!videoId || !apiKey || !channelId || (enableWhitelist && !isWhitelisted(channelId))) return setSongs([])

    fetch(`https://holodex.net/api/v2/videos?id=${videoId}&include=songs`, {
      headers: {
        'X-APIKEY': apiKey,
      }
    }).then((r) => r.json())
      .then((data: { songs: Song[] }[]) => {
        if (data.length <= 0 || !data[0].songs) throw new Error()
        setSongs(data[0].songs.sort((a, b) => { return a.start - b.start }))
      })
      .catch(() => {
        setSongs([])
      })
  }, [videoId, apiKey, channelId])

  useEffect(() => {
    setCurrentSong(null)
  }, [songs])

  useEffect(() => {
    if (!video || playingAd) return

    if (currentSong && currentTime >= Math.min(video.duration, currentSong.end) && repeatMode !== RepeatMode.Off) {
      switch (repeatMode) {
      case RepeatMode.On:
        if (!getNextSong()) video.currentTime = songs[0].start
        break
      case RepeatMode.One:
        video.currentTime = currentSong.start
        break
      }
    }

    if (!currentSong || currentTime < currentSong.start || currentTime > currentSong.end) {
      let nextSong: Song | null = null

      for (const song of songs) {
        if (song.start <= currentTime && currentTime <= song.end) {
          nextSong = song
          break
        }
      }

      if (!nextSong && musicMode !== MusicMode.Off) {
        nextSong = getNextSong()
        video.currentTime = nextSong?.start ?? video.duration
      }

      setCurrentSong(nextSong)
    }
  }, [currentTime])

  const getNextSong = () => {
    for (const song of songs) {
      if (currentTime < song.start) return song
    }

    return null
  }

  const getPrevSong = () => {
    for (const song of songs.slice().reverse()) {
      if (currentTime > song.end) return song
    }

    return null
  }

  const handleSelectSong = (song: Song) => {
    setCurrentSong(null)
    if (video) video.currentTime = song.start

    const url = new URL(window.location.href)
    url.searchParams.set('t', song.start.toString())
    window.history.replaceState(window.history.state, '', url.toString())
  }

  const handleSkipForward = () => {
    if (video) video.currentTime = getNextSong()?.start ?? video?.duration
  }

  const handleSkipBackward = () => {
    if (video) video.currentTime = (!currentSong || currentTime - currentSong.start < 5) ? getPrevSong()?.start ?? 0 : currentSong?.start
  }

  const handleSeek = (t: number) => {
    if (video && currentSong) video.currentTime = currentSong.start + t
  }

  const handleToggleRepeatMode = () => {
    switch (repeatMode) {
    case RepeatMode.Off:
      setRepeatMode(RepeatMode.On)
      break
    case RepeatMode.On:
      setRepeatMode(RepeatMode.One)
      break
    case RepeatMode.One:
      setRepeatMode(RepeatMode.Off)
      break
    }
  }

  const handleToggleMusicMode = () => {
    switch (musicMode) {
    case MusicMode.Off:
      setMusicMode(MusicMode.On)
      break
    case MusicMode.On:
      setMusicMode(MusicMode.Off)
      break
    }
  }

  const handleClickDexLink = () => {
    if (!videoId) return

    const url = new URL(`https://holodex.net/watch/${videoId}`)
    url.searchParams.set('t', Math.floor(currentTime).toString())
    window.location.href = url.toString()
  }

  return (
    <>
      {
        songs.length && createPortal((
          <SongsPanel
            songs={songs}
            currentSong={!playingAd ? currentSong : null}
            currentSongProgress={(currentSong && !playingAd) ? currentTime - currentSong.start : null}
            playing={!paused}
            repeatMode={repeatMode}
            musicMode={musicMode}
            onSelectSong={handleSelectSong}
            onPlay={() => video?.play()}
            onPause={() => video?.pause()}
            onSkipForward={handleSkipForward}
            onSkipBackward={handleSkipBackward}
            onSeek={handleSeek}
            onToggleRepeatMode={handleToggleRepeatMode}
            onToggleMusicMode={handleToggleMusicMode}
          />
        ), songsPanelContainer)
      }

      {
        songs.length && showDexButton && createPortal((
          <DexLink onClick={handleClickDexLink} />
        ), dexLinkContainer)
      }
    </>
  )
}

export default Content
