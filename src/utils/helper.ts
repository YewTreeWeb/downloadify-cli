import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import shelljs from 'shelljs'
import * as p from '@clack/prompts'

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

// Check for Cookie file
export const checkForCookie = (
  cookieFileNoDate: string,
  formattedCookieFile: string,
) => {
  const sp = p.spinner()
  let found = false
  let cookieCheckCount = 1
  sp.start('Waiting for cookie file')
  if (fs.existsSync(cookieFileNoDate) || fs.existsSync(formattedCookieFile)) {
    if (fs.existsSync(cookieFileNoDate)) {
      // shelljs.mv(cookieFileNoDate, formattedCookieFile)
      fs.rename(cookieFileNoDate, formattedCookieFile, (err) => {
        if (err) {
          if (process.env.NODE_ENV === 'development') console.error(err)
          sp.stop('Cookie file not found')
        } else {
          sp.stop('Cookie file found')
          found = true
        }
      })
    } else {
      sp.stop('Cookie file found')
      found = true
    }
  } else if (!fs.existsSync(formattedCookieFile) && cookieCheckCount === 15) {
    sp.stop('Cookie file not found')
  } else {
    cookieCheckCount += 1
    if (cookieCheckCount >= 4 && cookieCheckCount < 15)
      sp.message('Still waiting for cookie file...')
    setTimeout(checkForCookie, 5000)
  }
  return found
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
}
export const ytdl = ({
  location,
  season,
  episode,
  cookieFile,
  url,
  subs,
  filter,
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
    shelljs.exec(yt(seriesNum, ep))
  }
}
