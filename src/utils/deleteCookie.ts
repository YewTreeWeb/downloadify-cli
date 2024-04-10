import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

/**
 * Delete older cookie files
 *
 * @param {string} cookieDir - the directory path where the cookies are stored
 * @param {string} dirName - the name of the directory containing the cookies to be deleted
 * @return {void}
 */
const deleteOldCookies = async (
  cookieDir: string,
  dirName: string,
): Promise<void> => {
  // Get the directory path where the cookies are stored
  const directory = path.dirname(cookieDir)

  // List all files in the directory
  const filesInDirectory = await fs.promises.readdir(directory)

  // Filter files to only include cookies from other directories
  const otherCookieFiles = filesInDirectory.filter(
    (fileName) =>
      fileName !== path.basename(String(dirName)) &&
      fileName.includes('cookies'),
  )

  // Map the file names to their full path
  const existingCookiePaths = otherCookieFiles.map((fileName) =>
    path.join(directory, `${fileName}.txt`),
  )

  // If there are any cookies to delete
  if (otherCookieFiles.length > 0) {
    // Loop through each cookie file and delete it
    for (const file of existingCookiePaths) {
      fs.unlink(file, (error) => {
        // If in development mode log the error
        if (process.env.NODE_ENV === 'development') console.error(error)
      })
    }
  }
}

export default deleteOldCookies
