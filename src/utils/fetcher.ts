import {exit} from '@oclif/core/lib/errors'
import {ChildProcessWithoutNullStreams, SpawnOptions, spawn} from 'node:child_process'
import {sync} from 'which'

export type LanguageProps = {
  lang?: 'en' | 'jp' | string
  type: string
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
  subs?: boolean | string
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

type IPlayerProps = {
  location: string
  pid: string
  rest?: null | string
  season?: boolean
  subs?: boolean | string
}

// Find the path location of ffmpeg
const findFFmpegLocation = () => {
  const defaultPath = '/opt/homebrew/bin/ffmpeg'
  let path = ''
  try {
    const found = sync('ffmpeg', {nothrow: true})
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
  const subtitles = subs && subs === 'all' ? ['--sub-langs', 'all'] : subs ? ['--sub-langs', 'en.*'] : []
  const cookies = cookieFile?.exists ? ['--cookies', String(cookieFile.path)] : ['--cookies-from-browser', 'chrome']

  // Set format
  const formatType =
    typeof format === 'object' && format.type === 'title'
      ? '--match-title'
      : typeof format === 'boolean' && format
      ? '-f'
      : []
  let lang = typeof format === 'boolean' && format ? 'bv+ba[language*=en]' : []
  if (format && typeof format === 'object') {
    switch (format.type) {
      case 'id': {
        lang = `best[format_id*=${format.lang}]`
        break
      }

      case 'title': {
        lang = `${format.lang === 'en' || format.lang === 'English' ? '(English Dub)' : format.lang}`
        break
      }

      case 'multi': {
        lang = 'bv*+mergeall[vcodec=none]'
        break
      }

      default: {
        lang = `bv+ba[language*=${format.lang}]`
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
      ...formatType,
      ...lang,
      ...subtitles,
      ...(subs ? ['--embed-subs'] : []),
      '-o',
      `${location}/%(series)s/Season%(season_number)s/%(series)s-S%(season_number)sE%(episode_number)s-%(episode)s.%(ext)s`,
      ...(typeof format === 'object' && format.type === 'multi' ? '--audio-multistreams' : []),
      '--ffmpeg-location',
      ffmpegPath,
      // Add additional arguments
      ...(rest ? [rest] : []),
      `--user-agent`,
      // Use the dynamically retrieved user agent
      userAgent,
      // Hard code the subtitles into the video
      ...(hardSubs ? ['--extractor-args', 'crunchyrollbeta:hardsub=en-US'] : []),
      // Enable quiet mode
      ...(quiet && !verbose ? ['--quiet', '--no-warnings', '--progress'] : []),
      // Enable verbose output
      ...(verbose ? ['--verbose'] : []),
    ],
    {stdio: 'inherit'},
  )

  if (process.env.NODE_ENV === 'development') console.info(ytdlProcess)

  // Add a listener for the SIGINT signal
  process.on('SIGINT', () => {
    // Send SIGINT signal to the child process
    if (ytdlProcess) {
      ytdlProcess.kill('SIGINT')
    }

    exit(1)
  })

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
  filter,
  language,
  location,
  quiet = false,
  rest,
  url,
}: {quiet?: boolean} & DwnMangaProps) => {
  const args = [
    '--language',
    language,
    url,
    ...(filter ? [filter] : []),
    '--filename-template',
    '{{.Series}} - Ch{{.Number}} - {{.Title}}',
    '-o',
    location,
    ...(rest ? [rest] : []),
  ]

  const options: SpawnOptions = {
    stdio: quiet ? ['pipe', 'pipe', 'pipe'] : ['pipe', 'inherit', 'inherit'],
  }

  const dwnProcess = spawn(
    'manga-downloader',
    args.filter((arg) => arg !== undefined) as readonly string[],
    options,
  ) as ChildProcessWithoutNullStreams

  if (!filter && dwnProcess.stdin) {
    dwnProcess.stdin.write('y\n')
  }

  if (process.env.NODE_ENV === 'development') {
    console.info('dwnProcess.stdin', dwnProcess.stdin)
    console.info(dwnProcess)
  }

  // Add a listener for the SIGINT signal
  process.on('SIGINT', () => {
    // Send SIGINT signal to the child process
    if (dwnProcess) {
      dwnProcess.kill('SIGINT')
    }

    exit(1)
  })

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

export const iplayerDl = async ({location, pid, rest, season, subs = false}: IPlayerProps) => {
  const iPlayerProcess = spawn(
    'get_iplayer',
    [
      '--pid',
      pid,
      ...(season ? ['--pid-recursive'] : []),
      '--tv-quality=fhd',
      ...(subs ? ['--subtitles'] : []),
      '--output',
      location,
      '--subdir',
      '--subdir-format',
      '<nameshort>/Season<seriesnum>',
      '--file-prefix',
      '<nameshort>-S<seriesnum>E<episodenum>-<episodeshort>',
      // Add additional arguments
      ...(rest ? [rest] : []),
    ],
    {stdio: rest?.includes('quiet') ? ['pipe', 'pipe', 'pipe'] : 'inherit'},
  )

  if (process.env.NODE_ENV === 'development') console.info(iPlayerProcess)

  // Add a listener for the SIGINT signal
  process.on('SIGINT', () => {
    // Send SIGINT signal to the child process
    if (iPlayerProcess) {
      iPlayerProcess.kill('SIGINT')
    }

    exit(1)
  })

  await new Promise<void>((resolve, reject) => {
    iPlayerProcess.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`get_iplayer exited with code ${code}`))
      }
    })
  })
}
