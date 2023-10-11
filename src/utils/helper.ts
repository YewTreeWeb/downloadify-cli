import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import shelljs from 'shelljs'
import puppeteer from 'puppeteer'
import dayjs from 'dayjs'
import { spawn } from 'node:child_process'

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
  } catch (err) {
    console.error(err)
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
export const checkCookiesExists = async (file: string): Promise<boolean> => {
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

  if (otherCookieFiles.length > 0) shelljs.rm('-rf', existingCookies)
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
  await page.setDefaultNavigationTimeout(120000)
  // Navigate to the login page
  await page.goto(url, { waitUntil: 'load', timeout: 60000 }) // Replace with the login page URL
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
  )
  // Fill in the login form fields (replace with actual field selectors and credentials)
  await page.type(user.el, user.name)
  await page.type(pass.el, pass.word)
  // Submit the login form
  await page.click(button) // Replace with the login button selector
  // Wait for site navigation to load
  await navigationPromise
  // Wait for a selector on the logged-in page to ensure successful login
  await page.waitForSelector(selector, { timeout: 60000 }) // Replace with a selector on the logged-in page
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
    '# Netscape HTTP Cookie File\n' + cookieString,
    'utf-8',
  )
  await browser.close()
}

// youtude-dl downloader
type YtdlOptions = {
  location: string
  season?: string | number
  episode?: string | number
  cookieFile: string
  url: string
  failed?: boolean
}
export const ytdl = ({
  location,
  season,
  episode,
  cookieFile,
  url,
  failed,
}: YtdlOptions) => {
  const formattedUrl = `${url}${season ?? ''}${episode ?? ''}`
  return `${
    failed ? 'yt-dlp' : 'youtube-dl'
  } --cookies ${cookieFile} ${formattedUrl} --referer ${formattedUrl} --all-subs --embed-subs --format "best[format_id*=en]" -o "${location}/%(series)s/%(season)s/%(title)s.%(ext)s" --user-agent "Mozilla/5.0"`
}

// YouTube downloader for HiDive
type HiDiveProps = {
  location: string
  season: {
    num: string | number
    all?: boolean
  }
  episode: string | number
  cookieFile: string
  url: string
  filter?: string | string[]
  onError: (error: boolean) => void
}

export const hidiveDl = ({
  location,
  season,
  episode,
  cookieFile,
  url,
  filter,
  onError,
}: HiDiveProps) => {
  const seriesNum = `s${season.num.toString().padStart(2, '0')}`
  const eps = episode.toString().padStart(3, '0')
  const opts: YtdlOptions = {
    location,
    season: seriesNum,
    episode: eps,
    cookieFile,
    url,
    failed: false,
  }

  const executeYtdl = (opts: YtdlOptions) => {
    shelljs.exec(ytdl(opts), (err) => {
      if (process.env.NODE_ENV === 'development') console.error(err)
      onError(true)
      opts.failed = true
      shelljs.exec(ytdl(opts))
    })
  }

  if (season.all || (filter && filter.length === 2)) {
    const start = filter ? Number(filter[0]) : 1
    const end = filter ? Number(filter[1]) : Number(episode)
    for (let i = start; i < end; i++) {
      const ep = `e${i.toString().padStart(3, '0')}`
      opts.episode = ep
      executeYtdl(opts)
    }
  } else {
    const ep = `e${eps}`
    opts.episode = ep
    executeYtdl(opts)
  }
}

type CrunchyProps = {
  location: string
  username: string
  password: string
  cookieFile?: string
  url: string
  filter?: string
  subs?: string | boolean
  rest?: string
}
export const crunchy = async ({
  location,
  username,
  password,
  cookieFile,
  url,
  filter,
  subs,
  rest,
}: CrunchyProps) => {
  const login = `${username}:${password}`
  const range = String(filter).length > 0 ? `\\[${filter}]` : ''

  const opts: YtdlOptions = {
    location,
    cookieFile: cookieFile ?? '',
    url,
    failed: false,
  }

  const executeYtdl = (opts: YtdlOptions) => {
    shelljs.exec(ytdl(opts), (err) => {
      if (process.env.NODE_ENV === 'development') console.error(err)
    })
  }

  const crunchyProcess = spawn(
    'crunchy-cli',
    [
      '--credentials',
      login,
      // If all available subs is passed change argument to archive
      ...(subs === 'all' ? 'archive' : 'download'),
      '--skip-existing',
      '-a',
      'en-US',
      '-r',
      'best',
      // Add the '-s en-US' argument only if subs is true
      ...(subs && subs !== 'all' ? ['-s', 'en-GB'] : []),
      '-o',
      `${location}/{series_name}/Season {season_number}/{series_name}-S{season_number}E{episode_number}-{title}.mp4`,
      `${url}${range}`,
      // Add additional arguments
      ...(rest ? rest : []),
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
        if (cookieFile) executeYtdl(opts)
      }
    })
  })
}
