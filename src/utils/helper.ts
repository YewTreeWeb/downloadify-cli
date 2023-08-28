import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import axios from 'axios'
import tough from 'tough-cookie'
import shelljs from 'shelljs'

// Check to see if the directory exists
export const checkDirExists = async (dir: string): Promise<boolean> => {
  const expandedPath = path.join(os.homedir(), dir)
  let exists = false
  try {
    await fs.promises.access(expandedPath)
    const stats = await fs.promises.lstat(expandedPath)
    exists = stats.isDirectory()
  } catch (error) {
    console.error(error)
  }

  return exists
}

// Check to see if cookies file exists
export const checkCookiesExists = async (file: string): Promise<boolean> => {
  const expandedPath = path.join(os.homedir(), file)
  let exists = false
  try {
    await fs.promises.access(expandedPath)
    const stats = await fs.promises.lstat(expandedPath)
    exists = stats.isFile()
  } catch (error) {
    console.error(error)
  }

  return exists
}

// Get cookie file from website
export const loginAndGetCookies = async (
  url: string,
  user: string,
  pass: string,
  dir: string,
  date: string,
) => {
  const { CookieJar } = tough
  const loginUrl = url
  const username = user
  const password = pass
  const jar = new CookieJar()

  // Perform login
  try {
    const response = await axios.post(loginUrl, { username, password })
    const expandedPath = path.join(os.homedir(), dir)
    if (response.status === 200) {
      // Get cookies from the response
      const cookies = jar.getCookieStringSync(loginUrl)
      console.log('Cookies:', cookies)

      // Save cookies to a Netscape cookie file format
      const netscapeCookies = jar
        .getCookiesSync(loginUrl)
        .map((cookie) => cookie.toString())
        .join('\n')
      // Filename with date
      const cookieFilePath = `${expandedPath}/cookies-${date}.txt`
      // Save to file
      fs.writeFileSync(cookieFilePath, netscapeCookies)
    } else {
      console.error('Login failed:', response.status)
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

// youtude-dl downloader
export const ytdl = async (cookieFile: string, url: string, subs: boolean) => {
  const yt = `youtube-dl --cookies ${cookieFile} ${url} --referer ${url}${
    subs ? ' --all-subs' : ''
  } --format "best[format_id*=en]" -o "%(series)s/%(season)s/%(title)s.%(ext)s" --user-agent "Mozilla/5.0"`
  shelljs.exec(yt, (code, stdout, stderr) => {
    console.log('Exit code:', code)
    console.log('Program output:', stdout)
    console.log('Program stderr:', stderr)
  })
}
