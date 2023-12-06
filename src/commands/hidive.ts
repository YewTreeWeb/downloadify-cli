/* eslint-disable object-shorthand */
/* eslint-disable perfectionist/sort-objects */
/* eslint-disable complexity */
import * as os from 'node:os'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { Args, Command, Flags } from '@oclif/core'
import * as p from '@clack/prompts'
import color from 'picocolors'
import {
  checkFileExists,
  checkDirExists,
  deleteOldCookies,
  hidiveDl,
  newDir,
} from '../utils/helper'

export default class Hidive extends Command {
  static description =
    'hidive commands gives the user the ability to download videos from the HiDive website'

  static examples = [
    'downloadify hidive https://www.hidive.com/stream/the-eminence-in-shadow',
  ]

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
    all_subs: Flags.boolean({
      char: 'a',
      description: 'Download all available subtitles',
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
  }

  static args = {
    url: Args.string({
      description: 'The URl of the videos you want to download',
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
    const hidiveOpts = await p.group(
      {
        dir: () =>
          p.text({
            message: 'What directory would you like to use for your downloads?',
            initialValue: 'HiDive',
            validate: (value) => {
              const regex = /^[A-Za-z-]+$/
              if (!value) return 'Please enter a directory'
              if (!regex.test(value))
                return 'Directory name may only contain letters and dashes'
            },
          }),
        hasDir: async ({ results }) => {
          // Check to see if directory exists
          const dirExists = await checkDirExists(
            `Movies/${String(results.dir)}`,
          )
          let dirCreated = false
          // If directory doesn't exist create it
          // Else once directory is created, notify user
          if (dirExists) {
            dirCreated = !dirCreated
            p.log.step(
              `${color.bgGreen(
                color.black(` Found directory ${String(results.dir)} `),
              )}`,
            )
          } else {
            p.log.step(
              `${color.bgRed(
                color.white(
                  `  Directory ${String(results.dir)} does not exist  `,
                ),
              )}`,
            )

            sp.start(`Now creating ${String(results.dir)}`)
            await newDir(String(results.dir))
            sp.stop()

            dirCreated = !dirCreated
            p.log.step(
              `${color.bgGreen(
                color.black(` Successfully created ${String(results.dir)} `),
              )}`,
            )
          }

          return dirCreated
        },
        cookie: () =>
          p.select({
            message: 'Have you already downloaded a HiDive cookie file?',
            initialValue: 'false',
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
            `Movies/${String(results.dir)}/cookies`,
          )
          // Remove outdated cookies
          deleteOldCookies(cookieDir, String(results.dir))

          // Display warning message
          if (results.cookie === 'false') {
            p.log.step(
              'An attempt to downloaded cookies automatically will start soon. Please make sure the website you are downloading from is open in Chrome',
            )
          }

          // Skip to next command if previous isn't true
          if (results.cookie !== 'true') return

          const downloadedCookie = path.join(
            os.homedir(),
            `Downloads/www.hidive.com_cookies.txt`,
          )
          const formattedCookieFile = `${cookieDir}/cookies-${formattedDate}.txt`
          // Remove outdated cookies
          deleteOldCookies(cookieDir, String(results.dir))

          // Move cookie file from Downloads
          // rename file to have date
          sp.start('fetching cookie')

          const hasDownloadedCookie = await checkFileExists(downloadedCookie)
          if (hasDownloadedCookie) {
            fs.rename(downloadedCookie, formattedCookieFile, (err) => {
              if (process.env.NODE_ENV === 'development') console.error(err)
            })
          }

          sp.stop()

          const cookieCheck =
            (await checkFileExists(formattedCookieFile)) ||
            (await checkFileExists(downloadedCookie))

          if (cookieCheck) {
            // If cookie file found
            cookie = !cookie
            p.log.step(
              `${color.bgGreen(
                color.black(
                  ` Success an up to date cookie file was found in the ${String(
                    results.dir,
                  )} directory `,
                ),
              )}`,
            )
          } else {
            // If no cookie file found
            p.log.step(
              `${color.bgRed(
                color.black(
                  ` Failed to find an up to date cookie file in the ${String(
                    results.dir,
                  )} directory `,
                ),
              )}`,
            )
          }

          return cookie
        },
        seasonNum: () =>
          p.text({
            message: 'What is the number of the season you want to download?',
            initialValue: '1',
            validate: (value) => {
              const regex = /^[1-9]\d*$/
              if (!regex.test(value))
                return 'Season number must be a positive number'
            },
          }),
        changeEpisodeStarter: ({ results }) => {
          if (flags.filter || Number(results.seasonNum) <= 1) return
          return p.select({
            message:
              "Would you like to change the season's starting episode numbers?",
            initialValue: 'false',
            maxItems: 2,
            options: [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ],
          })
        },
        episodeStarter: ({ results }) => {
          if (flags.filter || Number(results.seasonNum) <= 1) return
          return p.text({
            message: 'Enter the new starting number e.g. 20',
            validate: (value) => {
              const regex = /^[1-9]\d*$/
              if (!regex.test(value))
                return 'Episode number must be a positive number'
            },
          })
        },
        episodeNum: () => {
          if (flags.filter) return
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
        subtitles: async () => {
          if (flags.all_subs) return
          return p.select({
            message: 'Would you like to download subtitles?',
            initialValue: 'true',
            maxItems: 2,
            options: [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ],
          })
        },
        other: () =>
          p.select({
            message: 'Would you like to add any other params to the download?',
            initialValue: 'false',
            maxItems: 2,
            options: [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ],
          }),
        otherOpts: ({ results }) => {
          if (results.other === 'false') return
          return p.text({
            message: 'What other params would you like to add?',
          })
        },
        confirm: ({ results }) =>
          p.confirm({
            message: results.hasDir
              ? `Download videos to ${results.dir}?`
              : 'Confirm settings?',
            initialValue: true,
          }),
      },
      {
        onCancel: () => {
          p.cancel(color.bgCyan(color.black('  Download cancelled  ')))
          this.exit(0)
        },
      },
    )
    // Create an outro for the cli
    const outro = (msg: string, type: 'abort' | 'error' | 'success') => {
      const colours: Record<
        'abort' | 'error' | 'success',
        (text: string) => string
      > = {
        abort: (text) => color.bgCyan(color.black(text)),
        error: (text) => color.bgRed(color.black(text)),
        success: (text) => color.bgBlue(color.black(text)),
      }
      const formattedText = colours[type](`  ${msg}  `)
      return p.outro(formattedText)
    }

    // If confirm is false
    if (!hidiveOpts.confirm) {
      outro('Download aborted! Thank you for using Downloadify.', 'abort')
      this.exit(1)
    }

    // Ask where to download video
    const dirName = hidiveOpts.dir

    // Set download directory
    const dwnDir = path.join(os.homedir(), `Movies/${String(dirName)}`)

    // If no cookie file end the cli
    // Else run youtube-dl
    if (hidiveOpts.cookie) {
      // Split the URL to get the name of the download
      const splitUrl = args.url.split('stream/').at(-1) ?? ''
      const name = splitUrl.split('/').at(0)

      // If the filter flag is passed check to see if valid
      let filter: string | string[] = flags.filter ?? ''
      if (
        flags.filter &&
        flags.filter?.length > 1 &&
        !flags.filter.includes('-')
      ) {
        p.log.step('A filter range must contain - ')
        const newVal = await p.text({
          message: 'Please enter a new filter containing a -',
        })
        filter = String(newVal)
      } else if (flags.filter && flags.filter?.length <= 1) {
        p.log.step(
          `${color.bgRed(
            color.black(
              '  A value is required and must be at least 2 characters  ',
            ),
          )}`,
        )
        const proceed = await p.confirm({
          message: 'Would you like to continue without a filter?',
          initialValue: true,
        })
        if (!proceed) {
          outro('Download aborted! Thank you for using Downloadify.', 'abort')
          this.exit(1)
        }
      } else {
        // Split the filter
        filter = flags.filter ? flags?.filter.split('-') : ''
      }

      let hasFailed: boolean | string = false

      // Add arguments to the rest param
      let rest = null
      if (Object.keys(flags).length > 0) {
        const dismiss = new Set(['all_subs', 'filter', 'season'])
        rest = Object.keys(flags)
          .map((key) => (dismiss.has(key) ? '' : `--${key}`))
          .join(' ')
      }

      if (hidiveOpts.otherOpts && String(hidiveOpts.otherOpts).length > 0) {
        const emptyRest = rest
        const moreOpts = String(hidiveOpts.otherOpts).trim()
        const flags = moreOpts
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

      const url = args.url.includes(baseUrl)
        ? args.url
        : `${baseUrl}${args.url}`

      const opts = {
        location: dwnDir,
        season: {
          num: Number(hidiveOpts.seasonNum) ?? 1,
          all: flags.season,
        },
        subs: flags.all_subs ? 'all' : hidiveOpts.subtitles === 'true',
        episode: Number(hidiveOpts.episodeNum) ?? 1,
        ...(String(hidiveOpts.changeEpisodeStarter) &&
          String(hidiveOpts.changeEpisodeStarter === 'true') && {
            episodeStart: Number(hidiveOpts.episodeStarter),
          }),
        cookieFile: {
          path: path.join(
            os.homedir(),
            `Movies/${String(dirName)}/cookies/cookies-${formattedDate}.txt`,
          ),
          exists: hidiveOpts.cookie === 'true',
        },
        url,
        ...(filter && {
          filter,
        }),
        ...(rest && {
          rest,
        }),
      }
      if (flags.quiet) {
        sp.start(`Downloading ${name}`)
      }

      await hidiveDl(opts).catch((error) => {
        if (process.env.NODE_ENV === 'development') console.error(error)
        hasFailed = error.message
      })

      if (flags.quiet) {
        sp.stop()
      }

      if (hasFailed) {
        outro(
          `An error occurred. Unable to download - ${color.underline(
            color.white(name),
          )}`,
          'error',
        )
      } else {
        outro(
          `All downloads completed! Thank you for using Downloadify. Completed download - ${color.underline(
            color.black(name),
          )}`,
          'success',
        )
      }
    } else {
      outro(
        `Unable to download. Please add a valid and up-to-date cookies file to the ${dirName} directory.`,
        'error',
      )
      this.exit(1)
    }
  }
}
