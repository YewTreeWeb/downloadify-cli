import dayjs from 'dayjs'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const deleteOldCookies = async (dir: string): Promise<void> => {
  const cookiesDir = path.join(dir, 'cookies')
  const date = dayjs(new Date()).format('DD-MM-YYYY')

  try {
    const filesInDirectory = await fs.readdir(cookiesDir)

    // Filter files to only include cookies that don't match the current date
    const oldCookieFiles = filesInDirectory.filter(
      (fileName) => !fileName.includes(date) && fileName.includes('cookies'),
    )

    // Map the file names to their full path
    const oldCookiePaths = oldCookieFiles.map((fileName) => path.join(cookiesDir, fileName))

    // If there are any old cookies to delete
    if (oldCookiePaths.length > 0) {
      // Delete each old cookie file
      await Promise.all(oldCookiePaths.map((file) => fs.unlink(file)))
    }
  } catch (error) {
    // Log any errors that occurred
    console.error('Error deleting old cookies:', error)
  }
}

export default deleteOldCookies
