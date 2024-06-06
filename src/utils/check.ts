import dayjs from 'dayjs'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

/**
 * Checks if a directory exists.
 *
 * @param dir - the directory path to check
 * @return {Promise<boolean>} a boolean indicating if the directory exists
 */
export const checkDirExists = async (dir: string): Promise<boolean> => {
  // Expand the path to include the home directory
  const expandedPath = path.join(os.homedir(), dir)
  let exists = false

  // Try to access the directory
  try {
    await fs.promises.access(expandedPath)

    // Check if the directory exists
    const stats = await fs.promises.lstat(expandedPath)

    // If it is a directory return true, otherwise false
    exists = stats.isDirectory()
  } catch (error) {
    // If in development mode log the error
    if (process.env.NODE_ENV === 'development') console.error(error)
  }

  // Return true if the directory exists
  return exists
}

/**
 * Checks if the given file exists.
 *
 * @param file - the path to the file
 * @returns a boolean indicating if the file exists or not
 */
export const checkFileExists = async (file: string): Promise<boolean> => {
  let exists = false

  // Try to access the file
  try {
    await fs.promises.access(file)

    // Check if the file exists
    const stats = await fs.promises.lstat(file)

    // If it is a file return true, otherwise false
    exists = stats.isFile()
  } catch (error) {
    // If in development mode log the error
    if (process.env.NODE_ENV === 'development') console.error(error)
  }

  // Return true if the file exists
  return exists
}

export const checkCookie = (chosenDirName: string) => {
  let success = false
  let error = false
  let cookiePath = null
  const cookieDir = path.join(os.homedir(), `Movies/${chosenDirName}/cookies`)
  const date = new Date()
  const formattedDate = dayjs(date).format('DD-MM-YYYY')

  const downloadedCookie = path.join(os.homedir(), `Downloads/www.crunchyroll.com_cookies.txt`)
  const formattedCookieFile = `${cookieDir}/cookies-${formattedDate}.txt`

  // Move cookie file from Downloads
  // rename file to have date
  const hasDownloadedCookie = await checkFileExists(downloadedCookie)
  if (hasDownloadedCookie) {
    fs.rename(downloadedCookie, formattedCookieFile, (err) => {
      if (process.env.NODE_ENV === 'development') console.error(err)
    })
  }

  const cookieCheck = (await checkFileExists(formattedCookieFile)) || (await checkFileExists(downloadedCookie))

  if (cookieCheck) {
    // If cookie file found
    cookie = true
    p.log.step(
      `${color.bgGreen(
        color.black(` Success an up to date cookie file was found in the ${chosenDirName} directory `),
      )}`,
    )
  } else {
    // If no cookie file found
    p.log.step(
      `${color.bgRed(color.black(` Failed to find an up to date cookie file in the ${chosenDirName} directory `))}`,
    )
  }

  return { success, error, cookiePath }
}
