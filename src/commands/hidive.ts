import * as os from 'node:os'
import * as path from 'node:path'
import fs from 'node:fs'
import { Args, Command, Flags } from '@oclif/core'
import * as p from '@clack/prompts'
import color from 'picocolors'
import {
  checkCookiesExists,
  checkDirExists,
  checkForCookie,
  deleteOldCookies,
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
    filter: Flags.string({
      char: 'f',
      description: 'Download a range of episodes e.g. 1-5',
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
    const baseUrl = 'https://www.hidive.com/'
    const sp = p.spinner()
    const date = new Date()
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`

    console.clear()
    p.intro(`${color.bgCyan(color.black(' HiDive '))}`)
    const hidiveDwnLd = await p.group(
      {
        path: () =>
          p.text({
            message: 'What directory would you like to use for your downloads?',
            initialValue: 'HiDive',
            validate: (value) => {
              const regex = /^[A-Za-z-]+$/
              if (!value) return 'Please enter a path'
              if (!regex.test(value))
                return 'Directory name may only contain letters and dashes'
            },
          }),
        cookie: () =>
          p.select({
            message: 'Have you got a HiDive cookie file?',
            initialValue: 'yes',
            maxItems: 2,
            options: [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ],
          }),
        hasCookie: async ({ results }) => {
          let cookie = false
          const cookieDir = path.join(
            os.homedir(),
            `Movies/${String(results.path)}/cookies`,
          )
          const downloadedCookie = path.join(
            os.homedir(),
            `Downloads/www.hidive.com_cookies.txt`,
          )
          const formattedCookieFile = `${cookieDir}/cookies-${formattedDate}.txt`
          if (!Boolean(results.cookie)) return
          deleteOldCookies(cookieDir, String(results.path))
          shelljs.mv(downloadedCookie, formattedCookieFile)
          cookie = await checkCookiesExists(formattedCookieFile)
          if (!cookie) {
            // If no cookie file found
            p.log.step(
              `${color.bgRed(
                color.black(
                  ` Failed to find an up to date cookie file in the ${String(
                    results.path,
                  )} directory `,
                ),
              )}`,
            )
          } else {
            cookie = true
            // If cookie file found
            p.log.step(
              `${color.bgGreen(
                color.white(
                  ` Success an up to date cookie file was found in ${String(
                    results.path,
                  )} directory `,
                ),
              )}`,
            )
          }
          return cookie
        },
        seasonNum: ({ results }) => {
          if (!Boolean(results.cookie)) return
          return p.text({
            message: 'What is the number of the season you want to download?',
            initialValue: '1',
            validate: (value) => {
              const regex = /^[1-9]\d*$/
              if (!regex.test(value))
                return 'Season number must be a positive number'
            },
          })
        },
        episodeNum: ({ results }) => {
          if (!Boolean(results.cookie) || flags.filter) return
          return p.text({
            message: flags.season
              ? 'Enter the number of episodes there are in the season'
              : 'Enter the episode number you want to download',
            validate: (value) => {
              const regex = /^[1-9]\d*$/
              if (!regex.test(value))
                return 'Episode number must be a positive number'
            },
          })
        },
        download: ({ results }) =>
          p.confirm({
            message: `Download ${results.path}?`,
            initialValue: false,
          }),
      },
      {
        onCancel: () => {
          p.cancel(color.bgCyan(color.black('  Download cancelled  ')))
          process.exit(0)
        },
      },
    )
    // Ask where to download video
    const dirName = hidiveDwnLd.path
    // const dirName = await p.text({
    //   message: 'What directory would you like to use for your downloads?',
    //   initialValue: 'HiDive',
    //   validate: (value) => {
    //     const regex = /^[A-Za-z-]+$/
    //     if (!regex.test(value))
    //       return 'Directory name may only contain letters and dashes'
    //   },
    // })
    // Check to see if directory exists
    const dirExists = await checkDirExists(`Movies/${String(dirName)}`)
    let dirCreated = false
    // If directory doesn't exist create it
    if (!dirExists) {
      await p.log.step(
        `${color.bgRed(
          color.white(`\n Directory ${String(dirName)} does not exist `),
        )}`,
      )
      await p.log.step(`\nNow creating ${String(dirName)}\n`)
      shelljs.mkdir(`~/Movies/${String(dirName)}`)
      shelljs.mkdir(`~/Movies/${String(dirName)}/cookies`)
      dirCreated = !dirCreated
    }

    // Once directory is created, notify user
    if (dirCreated) {
      await p.log.step(
        `${color.bgGreen(
          color.black(` Successfully created ${String(dirName)} `),
        )}`,
      )
    }

    // Set download directory
    const dwnDir = path.join(os.homedir(), `Movies/${String(dirName)}`)

    // Check if cookies files exists

    // const cookieFile = `Movies/${String(dirName)}/cookies/cookies.txt`

    if (!hidiveDwnLd.cookie) {
      p.outro(
        `${color.bgCyan(
          color.black(
            `  Unable to download. Please add a valid and up-to-date cookies file to the ${String(
              dirName,
            )} directory.  `,
          ),
        )}`,
      )
      process.exit(1)
    }

    if (hidiveDwnLd.cookie) {
      // Split the URL to get the name of the download
      const splitUrl = args.url.split('stream/')
      const splitLast = splitUrl[1].split('/')
      const name = splitLast[0]

      // Download from HiDive
      const filter = flags.filter?.includes('-')
        ? flags.filter.split('-')
        : null
      if (!filter && flags.filter) {
        p.log.step('Filter must contain -')
      }

      const url = !args.url.includes(baseUrl)
        ? `${baseUrl}${args.url}`
        : args.url

      const opts = {
        location: dwnDir,
        season: {
          num: Number(hidiveDwnLd.seasonNum) ?? 1,
          all: flags.season,
        },
        episode: Number(hidiveDwnLd.episodeNum) ?? 1,
        cookieFile: path.join(
          os.homedir(),
          `Movies/${String(dirName)}/cookies/cookies-${formattedDate}.txt`,
        ),
        url,
        subs: true,
        ...(filter && {
          filter,
        }),
      }
      try {
        ytdl(opts)
        p.outro(
          `${color.bgCyan(
            color.black(
              `  All downloads completed! Thank you for using Downloadify. Completed download - ${color.underline(
                color.white(name),
              )}  `,
            ),
          )}`,
        )
      } catch (error) {
        p.outro(
          `${color.bgRed(
            color.black(
              `  An error occured. Unable to download - ${color.underline(
                color.white(name),
              )}  `,
            ),
          )}`,
        )
        if (process.env.NODE_ENV === 'development') console.error(error)
      }
    }
  }
}
