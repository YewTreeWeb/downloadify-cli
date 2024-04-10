import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

/**
 * Construct the directory path and create necessary directories if they don't exist.
 *
 * @param {string} name - the name of the directory
 * @returns {void}
 */
const newDir = (name: string) => {
  // Construct the directory path
  const dir = path.join(os.homedir(), `Movies/${String(name)}`)
  const cookiesDir = path.join(os.homedir(), `Movies/${String(name)}/cookies`)

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
  } catch (error) {
    // If there is an error log it
    console.error(error)
  }
}

export default newDir
