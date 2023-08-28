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
    const s = p.spinner()
    let episode = 'e00'
    let seasonNum = 's00'
    console.log(flags)

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

    // Check if cookies files exists
    const date = new Date()
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    const cookieFile = `Movies/${String(dirName)}/cookies-${formattedDate}.txt`
    let hasCookies = await checkCookiesExists(cookieFile)

    // Todo: check if a cookie file exists but isn't the same date

    if (!hasCookies) {
      console.log(
        `${color.bgRed(
          color.white(` Cookie file does not exist in ${String(dirName)} \n`),
        )}`,
      )

      // Ask for login details to HiDive
      const usrName = await p.text({
        message: 'HiDive username',
        initialValue: 'HiDive',
        validate: (value) => {
          const regex = /^[A-Za-z-]+$/
          if (!value) return 'Please enter a username.'
          if (!regex.test(value)) return 'Username letters and dashes'
        },
      })
      const passWrd = await p.password({
        message: 'HiDive password',
        validate: (value) => {
          if (!value) return 'Please enter a password.'
          if (value.length < 5)
            return 'Password should have at least 5 characters.'
        },
      })
      s.start('Creating cookie file...')
      loginAndGetCookies(
        'https://www.hidive.com/',
        String(usrName),
        String(passWrd),
        String(dirName),
        formattedDate,
      )
      hasCookies = await checkCookiesExists(cookieFile)
      s.stop('Cookie file created')
    }

    // Ask which season to download
    if (flags.season) {
      const sNum = await p.text({
        message: 'What season number would you like to download?',
        validate: (value) => {
          const regex = /^[1-9]\d*$/
          if (!regex.test(value))
            return 'Season number must be a positive number'
        },
      })
      seasonNum = Number(sNum) < 10 ? `s0${Number(sNum)}` : `s${Number(sNum)}`

      // Ask how many episodes are in season
      const eNum = await p.text({
        message: 'Enter the number of episodes there are in the season',
        validate: (value) => {
          const regex = /^[1-9]\d*$/
          if (!regex.test(value))
            return 'Episode number must be a positive number'
        },
      })

      // Check if cookie file exists
      if (hasCookies) {
        // Loop over set number to run youtube-dl command the specified number of times
        for (let i = 1; i < Number(eNum); i++) {
          episode = i < 10 ? `e00${i}` : i < 100 ? `e0${i}` : `e${i}`
          const formattedUrl = `${args.url}/${seasonNum}${episode}`
          ytdl(cookieFile, formattedUrl, true)
        }
      } else {
        throw new Error(
          `Unable to download. Please add a valid and up-to-date cookies file to the ${String(
            dirName,
          )} directory.`,
        )
      }
    }
  }
}
