import {
  ChildProcessWithoutNullStreams,
  SpawnOptions,
  spawn,
} from 'node:child_process'
import { sync } from 'which'

type LanguageProps = {
  custom?: string
  forceEn?: boolean
  type: 'id' | 'language' | 'title'
}

type YtdlOptions = {
  cookieFile?: {
    exists?: boolean
    path?: string
  }
  episode?: null | number | string
  format?: LanguageProps | boolean
  hardSubs?: boolean
  location: string
  quiet?: boolean
  rest?: null | string
  season?: null | number | string
  subs: boolean | string
  url: string
  verbose?: boolean
}

type DwnMangaProps = {
  filter?: null | string
  language?: string
  location: string
  quiet?: boolean
  rest?: null | string
  url: string
}

// Find the path location of ffmpeg
const findFFmpegLocation = () => {
  const defaultPath = '/opt/homebrew/bin/ffmpeg'
  let path = ''
  try {
    const found = sync('ffmpeg', { nothrow: true })
    path = found && found !== defaultPath ? found : defaultPath
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error(error)
    path = defaultPath
  }

  return path
}

export const ytdl = async ({
  cookieFile,
  episode,
  format,
  hardSubs = false,
  location,
  quiet,
  rest,
  season,
  subs = false,
  url,
  verbose,
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

  // Set format
  const formatType =
    typeof format === 'object' && format.type === 'title'
      ? '--match-title'
      : '--format'
  let lang = format ? 'bv+ba[language*=en]' : ''
  if (format && typeof format === 'object') {
    switch (format.type) {
      case 'id': {
        lang = `best[format_id*=${format.forceEn ? 'en' : format.custom}]`
        break
      }

      case 'title': {
        lang = `${format.forceEn ? '(English Dub)' : format.custom}`
        break
      }

      case 'language': {
        lang = format.forceEn
          ? 'bv+ba[language*=en]'
          : format.custom === 'multi'
            ? 'bv*+mergeall[vcodec=none]'
            : `bv+ba[language*=${format.custom}]`

        break
      }
    }
  }

  const ytdlProcess = spawn(
    'yt-dlp',
    [
      ...cookies,
      formattedUrl,
      '--referer',
      formattedUrl,
      ...(format ? [formatType, lang] : []),
      ...subtitles,
      ...(subs ? ['--embed-subs'] : []),
      '-o',
      `${location}/%(series)s/Season%(season_number)s/%(series)s-S%(season_number)sE%(episode_number)s-%(episode)s.%(ext)s`,
      ...(typeof format === 'object' && format.custom === 'multi'
        ? '--audio-multistreams'
        : []),
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
      // Enable quiet mode
      ...(quiet && !verbose ? ['--quiet', '--no-warnings', '--progress'] : []),
      // Enable verbose output
      ...(verbose ? ['--verbose'] : []),
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

export const dwnManga = async ({
  location,
  url,
  language,
  filter,
  rest,
  quiet = false,
}: DwnMangaProps & { quiet?: boolean }) => {
  const args = [
    '--language',
    language,
    url,
    ...(filter ? [filter] : []),
    '--filename-template',
    '{{Series}} - C{{Number}} - {{Title}}',
    '-o',
    location,
    ...(rest ? [rest] : []),
  ]

  const options: SpawnOptions = {
    stdio: quiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
  }

  const dwnProcess = spawn(
    'manga-downloader',
    args.filter((arg) => arg !== undefined) as readonly string[],
    options,
  ) as ChildProcessWithoutNullStreams

  if (quiet && !filter && dwnProcess.stdin) {
    dwnProcess.stdin.write('y')
  }

  if (process.env.NODE_ENV === 'development') console.info(dwnProcess)

  await new Promise<void>((resolve, reject) => {
    dwnProcess.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`manga-downloader exited with code ${code}`))
      }
    })
  })
}
