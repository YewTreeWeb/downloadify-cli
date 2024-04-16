import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import color from 'picocolors'

/**
 * Construct the directory path and create necessary directories if they don't exist.
 *
 * @param {string} name - the name of the directory
 * @returns {void}
 */
const createDir = (name: string) => {
  // Construct the directory path
  const dir = path.join(os.homedir(), `Movies/${name}`)
  const cookiesDir = path.join(os.homedir(), `Movies/${name}/cookies`)
  let created = false

  try {
    // Check if the directory exists
    if (!fs.existsSync(dir)) {
      // If it doesn't, create it
      fs.mkdirSync(dir)
    }

    // Check if the cookies directory exists
    if (!fs.existsSync(cookiesDir)) {
      // If it doesn't, create it
      fs.mkdirSync(cookiesDir)
    }

    created = !created
  } catch (error) {
    // If there is an error log it
    if (process.env.NODE_ENV === 'development') {
      console.error(error)
    } else {
      color.bgRed(color.white(`  ${error.message}  `))
    }
  }

  return created
}

export default createDir
