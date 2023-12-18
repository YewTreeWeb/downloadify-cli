import dayjs from 'dayjs'
import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as util from 'node:util'
import puppeteer from 'puppeteer'
import * as which from 'which'

// Always get the primary domain from a URL
export const getPrimaryDomain = (url: string) => {
  // Remove the protocol (http://, https://) if present
  url = url.replace(/(^\w+:|^)\/\//, '')
  // Split the URL by '/' to get the parts
  const parts = url.split('/')
  // The primary domain is the first part of the split URL
  const primaryDomain = parts[0]
  // Reconstruct the URL with the protocol and primary domain
  return `https://${primaryDomain}`
}

// Create a new directory
export const newDir = (name: string) => {
  const dir = path.join(os.homedir(), `Movies/${String(name)}`)
  const cookiesDir = path.join(os.homedir(), `Movies/${String(name)}/cookies`)
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
    }

    if (!fs.existsSync(cookiesDir)) {
      fs.mkdirSync(cookiesDir)
    }
  } catch (error) {
    console.error(error)
  }
}

// Get Name of download
export const getName = (url: string, pattern: RegExp): string | null => {
  let name = null
  // Function to extract the last part of the URL
  const match = url.match(pattern)
  if (match) name = match[1]
  return name
}

// Check to see if the directory exists
export const checkDirExists = async (dir: string): Promise<boolean> => {
  const expandedPath = path.join(os.homedir(), dir)
  let exists = false
  try {
    await fs.promises.access(expandedPath)
    const stats = await fs.promises.lstat(expandedPath)
    exists = stats.isDirectory()
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error(error)
  }

  return exists
}

// Check to see if cookies file exists
export const checkFileExists = async (file: string): Promise<boolean> => {
  let exists = false
  try {
    await fs.promises.access(file)
    const stats = await fs.promises.lstat(file)
    exists = stats.isFile()
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error(error)
  }

  return exists
}

// Delete older cookie files
export const deleteOldCookies = async (cookieDir: string, dirName: string) => {
  const directory = path.dirname(cookieDir)
  const filesInDirectory = await fs.promises.readdir(directory)
  const otherCookieFiles = filesInDirectory.filter(
    (fileName) =>
      fileName !== path.basename(String(dirName)) &&
      fileName.includes('cookies'),
  )
  const existingCookies = otherCookieFiles.map((file) => {
    return `${cookieDir}/${file}.txt`
  })

  if (otherCookieFiles.length > 0) {
    for (const file of existingCookies) {
      fs.unlink(file, (error) => {
        if (process.env.NODE_ENV === 'development') console.error(error)
      })
    }
  }
}

// Fetch cookie
type FetchCookieProps = {
  url: string
  user: {
    name: string
    el: string
  }
  pass: {
    word: string
    el: string
  }
  cookieDir: string
  button: string
  selector: string
}
export const fetchCookie = async ({
  url,
  user,
  pass,
  cookieDir,
  button,
  selector,
}: FetchCookieProps) => {
  const date = new Date()
  const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  const browser = await puppeteer.launch({ headless: 'new' })
  const page = await browser.newPage()
  const navigationPromise = page.waitForNavigation({
    waitUntil: 'domcontentloaded',
  })
  await page.setDefaultNavigationTimeout(120_000)
  // Navigate to the login page
  // Replace with the login page URL
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 })
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
  )
  // Fill in the login form fields (replace with actual field selectors and credentials)
  await page.type(user.el, user.name)
  await page.type(pass.el, pass.word)
  // Submit the login form
  // Replace with the login button selector
  await page.click(button)
  // Wait for site navigation to load
  await navigationPromise
  // Wait for a selector on the logged-in page to ensure successful login
  // Replace with a selector on the logged-in page
  await page.waitForSelector(selector, { timeout: 60_000 })
  // Get the cookies from the page
  const cookies = await page.cookies()
  // Convert the cookies to a Netscape-style cookie file format
  let cookieString = ''
  for (const cookie of cookies) {
    cookieString += `${cookie.domain}\t${cookie.httpOnly ? 'TRUE' : 'FALSE'}\t${
      cookie.path
    }\t${cookie.secure ? 'TRUE' : 'FALSE'}\t${dayjs(
      cookie.expires * 1000,
    ).unix()}\t${cookie.name}\t${cookie.value}\n`
  }

  // Specify the path where you want to save the cookie file
  const cookieFilePath = `${cookieDir}/cookies-${formattedDate}.txt`
  // Write the cookies to the file in Netscape format
  fs.writeFileSync(
    cookieFilePath,
    `# Netscape HTTP Cookie File\n${cookieString}`,
    'utf8',
  )
  await browser.close()
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

// youtude-dl downloader
type YtdlOptions = {
  cookieFile?: {
    exists?: boolean
    path?: string
  }
  episode?: null | number | string
  format?: boolean
  lang?: boolean
  location: string
  rest?: null | string
  retry?: boolean
  season?: null | number | string
  subs: boolean | string
  hardSubs?: boolean
  title?: boolean
  url: string
}
export const ytdl = async ({
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

// YouTube downloader for HiDive
type HiDiveProps = {
  location: string
  season: {
    num: string | number
    all?: boolean
  }
  episode: string | number
  episodeStart?: string | number
  cookieFile?: {
    path?: string
    exists?: boolean
  }
  url: string
  filter?: string | string[]
  subs?: string | boolean
  rest?: string
}

export const hidiveDl = async ({
  location,
  season,
  episode,
  episodeStart,
  cookieFile,
  url,
  filter,
  subs = true,
  rest,
}: HiDiveProps) => {
  const seriesNum = `/s${season.num.toString().padStart(2, '0')}`
  const eps = episode.toString().padStart(3, '0')
  const opts: YtdlOptions = {
    location,
    season: seriesNum,
    episode: eps,
    cookieFile,
    url,
    subs,
    format: true,
    ...(rest && {
      rest,
    }),
  }

  if (season.all || (filter && filter.length === 2)) {
    const start = filter
      ? Number(filter[0])
      : episodeStart
        ? Number(episodeStart)
        : 1
    const end = filter
      ? Number(filter[1])
      : episodeStart
        ? Number(episodeStart) + Number(episode)
        : Number(episode)
    for (let i = start; i < end; i++) {
      const ep = `e${i.toString().padStart(3, '0')}`
      opts.episode = ep
      ytdl(opts)
    }
  } else {
    const ep = `e${eps}`
    opts.episode = ep
    ytdl(opts)
  }
}

type CrunchyProps = {
  filter?: string
  hardSubs?: boolean
  location: string
  password: string
  quiet?: boolean
  rest?: string
  subs?: boolean | string
  url: string
  username: string
  verbose?: boolean
}
export const crunchy = async ({
  filter,
  hardSubs = false,
  location,
  password,
  quiet,
  rest,
  subs = true,
  url,
  username,
  verbose,
}: CrunchyProps) => {
  const login = `${username}:${password}`
  const range = filter && String(filter).length > 0 ? `[${filter}]` : ''
  const crunchyProcess = spawn(
    'crunchy-cli',
    [
      ...(quiet ? ['--quiet'] : []),
      ...(verbose ? ['--verbose'] : []),
      '--credentials',
      login,
      // If all available subs is passed change argument to archive
      ...(subs === 'all' ? ['archive'] : ['download']),
      '--skip-existing',
      '-a',
      'en-US',
      '-r',
      'best',
      // Add the '-s en-US' argument only if subs is true
      ...(subs && subs !== 'all' ? ['-s', 'en-US'] : []),
      ...(hardSubs ? ['--force-hardsub'] : []),
      '-o',
      `${location}/{series_name}/Season {season_number}/{series_name}-S{season_number}E{episode_number}-{title}.${
        subs === 'all' ? 'mkv' : 'mp4'
      }`,
      `${url}${range}`,
      // Add additional arguments
      ...(rest ? [rest] : []),
    ],
    { stdio: 'inherit' },
  )

  if (process.env.NODE_ENV === 'development') console.info(crunchyProcess)

  await new Promise<void>((resolve, reject) => {
    crunchyProcess.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`crunchy-cli exited with code ${code}`))
      }
    })
  })
}

type IPlayerProps = {
  location: string
  pid: string
  season?: boolean
  subs?: string | boolean
  rest?: string
}
export const iplayerDl = async ({
  location,
  pid,
  season,
  subs = false,
  rest,
}: IPlayerProps) => {
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
    { stdio: 'inherit' },
  )

  if (process.env.NODE_ENV === 'development') console.info(iPlayerProcess)

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
