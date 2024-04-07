import { spawn } from 'child_process'
import which from 'which'

type YtdlOptions = {
  cookieFile?: {
    exists?: boolean
    path?: string
  }
  episode?: null | number | string
  format?: boolean
  hardSubs?: boolean
  lang?: boolean
  location: string
  rest?: null | string
  season?: null | number | string
  subs: boolean | string
  title?: boolean
  url: string
}

// Find the path location of ffmpeg
const findFFmpegLocation = () => {
  const defaultPath = '/opt/homebrew/bin/ffmpeg'
  let path = ''
  try {
    const found = which.sync('ffmpeg', { nothrow: true })
    path = found && found !== defaultPath ? found : defaultPath
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error(error)
    path = defaultPath
  }

  return path
}

const ytdl = async ({
  cookieFile,
  episode,
  format,
  lang,
  location,
  rest,
  season,
  subs = false,
  hardSubs = false,
  title,
  url,
}: YtdlOptions) => {
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  // Get the location of ffmpeg
  const ffmpegPath = findFFmpegLocation()
  // Format the URL, season and episode into one string
  const formattedUrl = `${url}${season || ''}${episode || ''}`
  const subtitles =
    subs && subs === 'all'
      ? ['--sub-langs', 'all']
      : subs
      ? ['--sub-langs', 'en.*']
      : []
  const cookies = cookieFile?.exists
    ? ['--cookies', String(cookieFile.path)]
    : cookieFile?.exists
    ? []
    : [
        '--cookies-from-browser',
        'chrome',
        '--cookies',
        String(cookieFile?.path),
      ]
  const enLang = lang ? ['--match-filter', 'language=en-US'] : []
  const enTitle = title ? ['--match-title', '(English Dub)'] : []

  const ytdlProcess = spawn(
    'yt-dlp',
    [
      ...cookies,
      formattedUrl,
      '--referer',
      formattedUrl,
      ...(format ? ['--format', 'best[format_id*=en]'] : []),
      ...subtitles,
      ...(subs ? ['--embed-subs'] : []),
      '-o',
      `${location}/%(series)s/Season%(season_number)s/%(series)s-S%(season_number)sE%(episode_number)s-%(episode)s.%(ext)s`,
      ...enLang,
      ...enTitle,
      '--ffmpeg-location',
      ffmpegPath,
      // Add additional arguments
      ...(rest ? [rest] : []),
      `--user-agent`,
      // Use the dynamically retrieved user agent
      userAgent,
      // Hard code the subtitles into the video
      ...(hardSubs
        ? ['--extractor-args', 'crunchyrollbeta:hardsub=en-US']
        : []),
    ],
    { stdio: 'inherit' },
  )

  if (process.env.NODE_ENV === 'development') console.info(ytdlProcess)

  await new Promise<void>((resolve, reject) => {
    ytdlProcess.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`yt-dl exited with code ${code}`))
      }
    })
  })
}

export default ytdl
