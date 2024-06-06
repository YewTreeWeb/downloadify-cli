import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import color from 'picocolors'

/**
 * Construct the directory path and create necessary directories if they don't exist.
 *
 * @param {string} name - the name of the directory
 * @param {string} dest - the location to create the directory in (defaults to the user's Movies directory)
 * @param requireCookies Whether or not to create a cookies directory
 * @returns {void}
 */
const createDir = (name: string, dest?: string, requireCookies = true) => {
  // Construct the directory path
  const destination = `${dest ?? 'Movies'}`
  const dir = path.join(os.homedir(), `${destination}/${name}`)
  const cookiesDir = requireCookies ? path.join(os.homedir(), `${destination}/${name}/cookies`) : null
  let created = false

  try {
    // Check if the directory exists
    if (!fs.existsSync(dir)) {
      // If it doesn't, create it
      fs.mkdirSync(dir)
    }

    // Check if the cookies directory exists
    if (requireCookies && !fs.existsSync(String(cookiesDir))) {
      // If it doesn't, create it
      fs.mkdirSync(String(cookiesDir))
    }

    created = !created
  } catch (error) {
    // If there is an error log it
    if (process.env.NODE_ENV === 'development') {
      console.error(error)
    } else {
      color.bgRed(color.white(`  ${error instanceof Error ? error.message : 'error'}  `))
    }
  }

  return created
}

export default createDir
