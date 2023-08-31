import * as os from 'node:os'
import * as path from 'node:path'
import { Args, Command, Flags } from '@oclif/core'
import * as p from '@clack/prompts'
import color from 'picocolors'
import {
  checkCookiesExists,
  checkDirExists,
  loginAndGetCookies,
  ytdl,
} from '../utils/helper'
import shelljs from 'shelljs'

export default class Hidive extends Command {
  static description = 'describe the command here'

  static examples = ['<%= config.bin %> <%= command.id %>']

  static flags = {
    season: Flags.boolean({
      char: 's',
      description: 'Would you like to download the entire season',
      required: false,
    }),
  }

  static args = {
    url: Args.string({
      description: 'The URl of the video/s you want to download',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Hidive)
    const sp = p.spinner()
    p.intro(`${color.bgCyan(color.black(' HiDive '))}`)
    // Ask where to download video
    const dirName = await p.text({
      message: 'What directory would you like to use for your downloads?',
      initialValue: 'HiDive',
      validate: (value) => {
        const regex = /^[A-Za-z-]+$/
        if (!regex.test(value))
          return 'Directory name may only contain letters and dashes'
      },
    })
    // Check to see if directory exists
    const dirExists = await checkDirExists(`Movies/${String(dirName)}`)
    let dirCreated = false
    // If directory doesn't exist create it
    if (!dirExists) {
      console.log(
        `${color.bgRed(
          color.white(`\n Directory ${String(dirName)} does not exist `),
        )}`,
      )
      console.log(`\nNow creating ${String(dirName)}\n`)
      shelljs.mkdir(`~/Movies/${String(dirName)}`)
      shelljs.mkdir(`~/Movies/${String(dirName)}/cookies`)
      dirCreated = !dirCreated
    }

    // Once directory is created, notify user
    if (dirCreated) {
      console.log(
        `${color.bgGreen(
          color.black(` Successfully created ${String(dirName)} `),
        )}`,
      )
    }

    // Set download directory
    const dwnDir = path.join(os.homedir(), `Movies/${String(dirName)}`)

    // Check if cookies files exists
    // const date = new Date()
    // const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
    //   .toString()
    //   .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    const cookieFile = `Movies/${String(dirName)}/cookies/cookies.txt`
    // const cookieFile = `Movies/${String(
    //   dirName,
    // )}/cookies/cookies-${formattedDate}.txt`
    const formattedCookieFile = path.join(
      os.homedir(),
      `Movies/${String(dirName)}/cookies/cookies.txt`,
    )
    const hasCookies = await checkCookiesExists(cookieFile)

    // if (!hasCookies) {
    //   console.log(
    //     `${color.bgRed(
    //       color.white(` Cookie file does not exist in ${String(dirName)} \n`),
    //     )}`,
    //   )
    //   const directory = path.dirname(cookieFile)
    //   const filesInDirectory = await fs.promises.readdir(directory)

    //   const otherCookieFiles = filesInDirectory.filter(
    //     (fileName) =>
    //       fileName !== path.basename(String(dirName)) &&
    //       fileName.includes('cookies'),
    //   )

    //   console.log('others', otherCookieFiles)

    //   if (otherCookieFiles.length > 0) shelljs.rm('-rf', otherCookieFiles)
    //   //   // Ask for login details to HiDive
    //     const usrName = await p.text({
    //       message: 'HiDive username',
    //       placeholder: 'test@email.com',
    //       validate: (value) => {
    //         const regex =
    //           /^[\w!#$%&'*+./=?^`{|}~-]+@[\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*$/
    //         if (!value) return 'Please enter a username.'
    //         if (!regex.test(value))
    //           return 'Username must be a valid email address'
    //       },
    //     })
    //     const passWrd = await p.password({
    //       message: 'HiDive password',
    //       validate: (value) => {
    //         if (!value) return 'Please enter a password.'
    //         if (value.length < 5)
    //           return 'Password should have at least 5 characters.'
    //       },
    //     })
    //     s.start('Creating cookie file...')
    //     loginAndGetCookies(
    //       'https://www.hidive.com/',
    //       String(usrName).toLowerCase(),
    //       String(passWrd),
    //       String(dirName),
    //       formattedDate,
    //     )
    //     hasCookies = await checkCookiesExists(cookieFile)
    //     s.stop('Cookie file created')
    // }

    // Ask which season to download
    const sNum = (await p.text({
      message: 'What season number would you like to download?',
      initialValue: '1',
      validate: (value) => {
        const regex = /^[1-9]\d*$/
        if (!regex.test(value)) return 'Season number must be a positive number'
      },
    })) as string | number

    // Ask how many episodes are in season
    const epNum = (await p.text({
      message: flags.season
        ? 'Enter the number of episodes there are in the season'
        : 'Enter the episode number you want to download',
      validate: (value) => {
        const regex = /^[1-9]\d*$/
        if (!regex.test(value))
          return 'Episode number must be a positive number'
      },
    })) as string | number

    const splitUrl = args.url.split('stream/')
    const splitLast = splitUrl[1].split('/')
    const name = splitLast[0]

    if (hasCookies) {
      const season = {
        num: sNum,
        all: flags.season,
      }
      sp.start(`Downloading ${name}...`)
      try {
        await ytdl(dwnDir, season, epNum, formattedCookieFile, args.url, true)
        sp.stop('HiDive download complete')
      } catch (error) {
        console.error(error)
        p.outro(
          `Unable to download show - ${color.bgRed(
            color.underline(color.white(name)),
          )}`,
        )
      }
    } else {
      p.log.step(
        `Unable to download. Please add a valid and up-to-date cookies file to the ${String(
          dirName,
        )} directory.`,
      )
      process.exit(1)
    }

    p.outro(
      `All downloads completed! Thank you for using Downloadify. Completed download - ${color.underline(
        color.cyan(name),
      )}`,
    )
  }
}
