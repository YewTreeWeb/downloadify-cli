import { spawn } from 'child_process'
import which from 'which'

type FormatProps = {
  country?: string
  id?: boolean
  lang?: boolean | 'multi'
  title?: boolean
}

type YtdlOptions = {
  cookieFile?: {
    exists?: boolean
    path?: string
  }
  episode?: null | number | string
  lang?: boolean | FormatProps
  hardSubs?: boolean
  location: string
  rest?: null | string
  season?: null | number | string
  subs: boolean | string
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
  lang,
  location,
  rest,
  season,
  subs = false,
  hardSubs = false,
  url,
}: YtdlOptions) => {
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  // Get the location of ffmpeg
  const ffmpegPath = findFFmpegLocation()
  // Format the URL, season and episode into one string
  const formattedUrl = `${url}${season || ''}${episode || ''}`
  // Get all available subtitles or just English
  const subtitles =
    subs && subs === 'all'
      ? ['--sub-langs', 'all']
      : subs
      ? ['--sub-langs', 'en.*']
      : []
  // Check if cookies exist or try to automatically download them
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
  let language = lang ? ['--format', 'bv+ba[language*=en]'] : []
  if (lang && typeof lang !== 'boolean') {
    if (lang.title && (!lang.country || lang.country === 'en')) {
      language = ['--match-title', '(English Dub)']
    } else if (lang.id && (!lang.country || lang.country === 'en')) {
      language = ['--format', 'best[format_id*=en]']
    }

    if (lang.lang === 'multi') {
      language = [
        '--format',
        'bv*+mergeall[vcodec=none]',
        '--audio-multistreams',
      ]
    } else if (lang.country !== 'en') {
      language = ['--format', `bv+ba[language*=${lang.country}]`]
    }
  }

  const ytdlProcess = spawn(
    'yt-dlp',
    [
      ...cookies,
      formattedUrl,
      '--referer',
      formattedUrl,
      ...(lang ? ['--format', `${language}`] : []),
      ...subtitles,
      ...(subs ? ['--embed-subs'] : []),
      '-o',
      `${location}/%(series)s/Season%(season_number)s/%(series)s-S%(season_number)sE%(episode_number)s-%(episode)s.%(ext)s`,
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
