import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import shelljs from 'shelljs'
import puppeteer from 'puppeteer'
import dayjs from 'dayjs'

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
  const date = new Date()
  const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  const directory = path.dirname(cookieDir)
  const filesInDirectory = await fs.promises.readdir(directory)
  const otherCookieFiles = filesInDirectory.filter(
    (fileName) =>
      fileName !== path.basename(String(dirName)) &&
      !fileName.includes(formattedDate) &&
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
  season: {
    num: string | number
    all: boolean
  }
  episode: string | number
  cookieFile: string
  url: string
  subs: boolean
  filter?: string[]
  onError: (error: boolean) => void
}
export const ytdl = ({
  location,
  season,
  episode,
  cookieFile,
  url,
  subs,
  filter,
  onError,
  ...rest
}: YtdlOptions) => {
  const series = Number(season.num)
  const seriesNum = series < 10 ? `s0${series}` : `s${series}`
  const eps = Number(episode)
  const yt = (s: string, e: string) => {
    const formattedUrl = `${url}${s}${e}`
    return `youtube-dl --cookies ${cookieFile} ${formattedUrl} --referer ${formattedUrl}${
      subs ? ' --all-subs' : ''
    } --format "best[format_id*=en]" -o "${location}/%(series)s/%(season)s/%(title)s.%(ext)s" --user-agent "Mozilla/5.0" ${rest}`
  }

  if (season.all) {
    for (let i = 1; i < Number(episode); i++) {
      const ep = i < 10 ? `e00${i}` : i < 100 ? `e0${i}` : `e${i}`
      shelljs.exec(yt(seriesNum, ep))
    }
  } else if (filter) {
    for (let i = Number(filter[0]); i < Number(filter[1]); i++) {
      const ep = i < 10 ? `e00${i}` : i < 100 ? `e0${i}` : `e${i}`
      shelljs.exec(yt(seriesNum, ep))
    }
  } else {
    const ep = eps < 10 ? `e00${eps}` : eps < 100 ? `e0${eps}` : `e${eps}`
    shelljs.exec(yt(seriesNum, ep), (code) => {
      if (process.env.NODE_ENV === 'development') console.error(code)
      onError(true)
    })
  }
}
