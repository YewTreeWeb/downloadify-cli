import * as p from '@clack/prompts'
import { Args, Command, Flags } from '@oclif/core'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import color from 'picocolors'

import { checkDirExists, checkFileExists } from '../utils/check'
import createDir from '../utils/createDir'
import deleteOldCookies from '../utils/deleteCookie'
import { ytdl } from '../utils/fetcher'
import outro from '../utils/outro'

export default class Crunchyroll extends Command {
  static args = {
    url: Args.string({
      description: 'The URL of the show you would like to download',
      required: true,
    }),
  }

  static description =
    'The crunchyroll command gives the user the ability to download videos from the Crunchyroll website.'

  static examples = [
    'downloadify crunchyroll https://www.crunchyroll.com/series/GYEXQKJG6/dr-stone',
  ]

  static flags = {
    all_subs: Flags.boolean({
      char: 'a',
      description: 'Download all available subtitles',
      required: false,
    }),
    season: Flags.boolean({
      char: 's',
      description: 'Download all available seasons',
      required: false,
    }),
    filter: Flags.string({
      char: 'f',
      description: 'Download a range of episodes e.g. S1-S3,S4E2-S4E6',
      required: false,
    }),
    quiet: Flags.boolean({
      char: 'q',
      description:
        "Don't print the output of the downloading process to the terminal",
      required: false,
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'If you want to include debug information in the output',
      required: false,
    }),
    default: Flags.boolean({
      char: 'd',
      description: 'Skip download questions and use default settings',
      required: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Crunchyroll)
    const sp = p.spinner()
    const date = new Date()
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`

    console.clear()
    if (process.env.NODE_ENV === 'development')
      p.intro(`${color.bgGreen(color.white(' Dev Mode Active '))}`)

    p.intro(`${color.bgMagenta(color.black(' Crunchyroll '))}`)
    const opts = await p.group(
      {
        dir: () => {
          if (flags.default) return
          return p.text({
            message: 'What directory would you like to use for your downloads?',
            initialValue: 'Crunchy',
            validate: (value) => {
              const regex = /^[A-Za-z-]+$/
              if (!value) return 'Please enter a directory'
              if (!regex.test(value))
                return 'Directory name may only contain letters and dashes'
            },
          })
        },
        hasDir: async ({ results }) => {
          const chosenDirName = results.dir ?? 'Crunchy'
          // Check to see if directory exists
          const dirExists = await checkDirExists(`Movies/${chosenDirName}`)
          let dirCreated = false
          // If directory doesn't exist create it
          // Else once directory is created, notify user
          if (dirExists) {
            dirCreated = !dirCreated
            p.log.step(
              `${color.bgGreen(
                color.black(` Found directory ${chosenDirName} `),
              )}`,
            )
          } else {
            p.log.step(
              `${color.bgRed(
                color.white(`  Directory ${chosenDirName} does not exist  `),
              )}`,
            )

            // Show spinner while directory is being created
            sp.start(`Now creating ${chosenDirName}`)
            await createDir(chosenDirName)
            sp.stop()

            dirCreated = !dirCreated
            p.log.step(
              `${color.bgGreen(
                color.black(` Successfully created ${chosenDirName} `),
              )}`,
            )
          }

          return dirCreated
        },
        cookie: () => {
          if (flags.default) return
          return p.select({
            message: 'Have you downloaded a Crunchyroll cookie file?',
            initialValue: false,
            maxItems: 3,
            options: [
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ],
          })
        },
        hasCookie: async ({ results }) => {
          const chosenDirName = results.dir ?? 'Crunchy'
          const defaultCookie = results.cookie ?? false
          let cookie = false
          const cookieDir = path.join(
            os.homedir(),
            `Movies/${chosenDirName}/cookies`,
          )
          // Remove outdated cookies
          deleteOldCookies(cookieDir, chosenDirName)

          // Display warning message
          if (!defaultCookie) {
            p.log.step(
              'An attempt to downloaded cookies automatically will start soon. Please make sure the website you are downloading from is open in Chrome',
            )
          }

          // Skip to next command if previous isn't true
          if (!defaultCookie) return

          const downloadedCookie = path.join(
            os.homedir(),
            `Downloads/www.crunchyroll.com_cookies.txt`,
          )
          const formattedCookieFile = `${cookieDir}/cookies-${formattedDate}.txt`

          // Move cookie file from Downloads
          // rename file to have date
          const hasDownloadedCookie = await checkFileExists(downloadedCookie)
          if (hasDownloadedCookie) {
            fs.rename(downloadedCookie, formattedCookieFile, (err) => {
              if (process.env.NODE_ENV === 'development') console.error(err)
            })
          }

          const cookieCheck =
            (await checkFileExists(formattedCookieFile)) ||
            (await checkFileExists(downloadedCookie))

          if (cookieCheck) {
            // If cookie file found
            cookie = true
            p.log.step(
              `${color.bgGreen(
                color.black(
                  ` Success an up to date cookie file was found in the ${chosenDirName} directory `,
                ),
              )}`,
            )
          } else {
            // If no cookie file found
            p.log.step(
              `${color.bgRed(
                color.black(
                  ` Failed to find an up to date cookie file in the ${chosenDirName} directory `,
                ),
              )}`,
            )
          }

          return cookie
        },
        subtitles: async () => {
          if (flags.all_subs || flags.default) return
          return p.select({
            message: 'Would you like to download subtitles?',
            initialValue: true,
            maxItems: 2,
            options: [
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ],
          })
        },
        hardSubs: async ({ results }) => {
          if (flags.default || !results.subtitles) return
          return p.select({
            message: 'Would you like the subtitles to be hard coded?',
            initialValue: false,
            maxItems: 2,
            options: [
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ],
          })
        },
        more: () => {
          if (flags.default) return
          return p.select({
            message: 'Would you like to add any other params to the download?',
            initialValue: false,
            maxItems: 2,
            options: [
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ],
          })
        },
        custom: ({ results }) => {
          if (!results.more || flags.default) return
          return p.text({
            message: 'What other params would you like to add?',
          })
        },
        confirm: ({ results }) => {
          if (flags.default) return
          return p.confirm({
            message: results.hasDir
              ? `Download videos to ${results.dir}?`
              : 'Confirm settings?',
            initialValue: true,
          })
        },
      },
      {
        onCancel: () => {
          p.cancel(
            color.bgMagenta(color.black('  Crunchyroll download cancelled  ')),
          )
          this.exit(0)
        },
      },
    )

    let defaults = null
    if (flags.default) {
      defaults = {
        dir: 'Crunchy',
        subtitles: false,
        hardSubs: false,
      }
    }

    // If confirm is false
    if (!opts.confirm) {
      outro('Download aborted! Thank you for using Downloadify.', 'abort')
      this.exit(1)
    }

    // Set download directory
    const dwnDir = path.join(
      os.homedir(),
      `Movies/${defaults?.dir || opts.dir}`,
    )

    // Format URL if not already formatted
    // Check if URL is already formatted with 'crunchyroll' in it
    // If not, add it to the beginning of the URL
    //
    // Examples:
    //   Input: 'https://www.crunchyroll.com/series/GYEXQKJG6/dr-stone'
    //   Output: 'https://www.crunchyroll.com/series/GYEXQKJG6/dr-stone'
    //
    //   Input: 'series/GYEXQKJG6/dr-stone'
    //   Output: 'https://www.crunchyroll.com/series/GYEXQKJG6/dr-stone'
    //
    //   Input: 'https://www.crunchyroll.com/watch/GYEXQKJG6/dr-stone'
    //   Output: 'https://www.crunchyroll.com/watch/GYEXQKJG6/dr-stone'
    //
    //   Input: 'watch/GYEXQKJG6/dr-stone'
    //   Output: 'https://www.crunchyroll.com/watch/GYEXQKJG6/dr-stone'
    const baseUrl = 'https://www.crunchyroll.com/'
    let url = ''
    if (
      !args.url.includes('crunchyroll') &&
      // Check if URL is a series URL
      !args.url.includes('series') &&
      // Check if URL is a watch URL
      !args.url.includes('watch')
    ) {
      // Add series or watch to beginning of URL
      url = `${baseUrl}${flags?.season ? 'series' : 'watch'}/${args.url}`
    } else if (args.url.includes('crunchyroll')) {
      // URL is already formatted
      url = args.url
    } else {
      // Add www.crunchyroll.com to beginning of URL
      url = `${baseUrl}${args.url}`
    }

    // Get the name of the video
    const dwnName = args.url.split('/').at(-1) ?? ''

    /* Add arguments to the rest param */
    // Loop through the flags and any not in the ignore to the res variable
    let rest: null | string = null
    if (Object.keys(flags).length > 0) {
      const dismiss = new Set([
        'all_subs',
        'filter',
        'quiet',
        'default',
        'verbose',
        'season',
      ])
      rest = Object.keys(flags)
        .map((key) => (dismiss.has(key) ? '' : `--${key}`))
        .join(' ')
    }

    // Loop through custom commands added and format them to be valid args for yt-dlp
    if (opts.custom && String(opts.custom).length > 0 && !flags.default) {
      const emptyRest = rest
      const customOpts = String(opts.custom).trim()
      const flags = customOpts
        .split(' ')
        .map((flag) => {
          let formattedFlag = flag.startsWith('--') ? flag : `--${flag}`
          if (formattedFlag.includes('_')) {
            formattedFlag = formattedFlag.split('_').join(' ')
          }

          return formattedFlag
        })
        .join(' ')
      rest = emptyRest ? `${rest} ${flags}` : flags
    }

    const ytdlOpts = {
      location: dwnDir,
      url,
      subs: defaults?.subtitles || flags.all_subs ? 'all' : opts.subtitles,
      hardSubs: defaults?.hardSubs || opts.hardSubs,
      ...(rest && {
        rest,
      }),
      ...(flags.quiet && {
        quiet: flags.quiet,
      }),
      ...(flags.verbose && {
        verbose: flags.verbose,
      }),
    }
    if (flags.quiet && !flags.verbose) {
      sp.start(`Downloading ${dwnName}`)
    }

    await ytdl(ytdlOpts)
      .then(() => {
        if (flags.quiet && !flags.verbose) {
          sp.stop()
        }

        outro(
          `All downloads completed! Thank you for using Downloadify. Completed downloading - ${color.underline(
            color.black(dwnName),
          )}`,
          'success',
        )
      })
      .catch((error) => {
        if (flags.quiet && !flags.verbose) {
          sp.stop()
        }

        if (process.env.NODE_ENV === 'development') console.error(error)
        outro(
          `An error occurred. Unable to download due to the following error: ${color.underline(
            color.white(error.message),
          )}`,
          'error',
        )
      })
  }
}
