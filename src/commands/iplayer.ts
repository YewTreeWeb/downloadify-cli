/* eslint-disable perfectionist/sort-objects */
/* eslint-disable object-shorthand */
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { Args, Command, Flags } from '@oclif/core'
import * as p from '@clack/prompts'
import color from 'picocolors'
import {
  checkDirExists,
  checkFileExists,
  deleteOldCookies,
  iplayerDl,
  newDir,
  ytdl,
} from '../utils/helper'

export default class Iplayer extends Command {
  static description =
    'The iplayer command gives the user the ability to download videos from the iPlayer UK website by providing the PID of the show/episode.'

  static examples = ['downloadify iplayer m001rswk']

  static flags = {
    default: Flags.boolean({
      char: 'd',
      description:
        'Skip the majority of the choices and use predefined settings.',
      required: false,
    }),
    quiet: Flags.boolean({
      char: 'q',
      description:
        "Don't print the output of the downloading process to the terminal",
      required: false,
    }),
    season: Flags.boolean({
      char: 's',
      description: 'Would you like to download the entire season',
      required: false,
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'If you want to include debug information in the output',
      required: false,
    }),
  }

  static args = {
    pid: Args.string({
      description:
        'The PID of the videos you want to download. The BBC Programme Identifier can be found in the URL after "episode/"',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Iplayer)
    const sp = p.spinner()
    const date = new Date()
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`

    console.clear()
    p.intro(`${color.bgMagenta(color.black(' iPlayer '))}`)
    const iplayerOpts = await p.group(
      {
        hasDir: async () => {
          // Check to see if directory exists
          const dirExists = await checkDirExists(`Movies/get_iplayer`)
          let dirCreated = false
          // If directory doesn't exist create it
          // Else once directory is created, notify user
          if (dirExists) {
            dirCreated = !dirCreated
            p.log.step(
              `${color.bgGreen(color.black(` Found directory get_iplayer `))}`,
            )
          } else {
            p.log.step(
              `${color.bgRed(
                color.white(`  Directory get_iplayer does not exist  `),
              )}`,
            )

            sp.start(`Now creating get_iplayer`)
            await newDir('get_iplayer')
            sp.stop()

            dirCreated = !dirCreated
            p.log.step(
              `${color.bgGreen(
                color.black(` Successfully created get_iplayer `),
              )}`,
            )
          }

          return dirCreated
        },
        name: () => {
          if (flags.default) return
          return p.text({
            message: 'What is the name of the season or episode?',
            validate: (value) => {
              if (!value) return 'Please enter a name'
            },
          })
        },
        subtitles: async () => {
          if (flags.default) return
          return p.select({
            message: 'Would you like to download subtitles?',
            initialValue: 'false',
            maxItems: 2,
            options: [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ],
          })
        },
        cookie: () =>
          p.select({
            message: 'Have you downloaded an iPlayer cookie file?',
            initialValue: 'skip',
            maxItems: 3,
            options: [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
              { value: 'skip', label: 'Skip' },
            ],
          }),
        hasCookie: async ({ results }) => {
          if (results.cookie === 'skip') return
          let cookie = false
          const cookieDir = path.join(
            os.homedir(),
            'Movies/get_iplayer/cookies',
          )
          // Remove outdated cookies
          deleteOldCookies(cookieDir, 'get_iplayer')

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
            `Downloads/www.bbc.co.uk_cookies.txt`,
          )
          const formattedCookieFile = `${cookieDir}/cookies-${formattedDate}.txt`

          // Move cookie file from Downloads
          // rename file to have date
          sp.start('fetching cookie')
          const hasDownloadedCookie = await checkFileExists(downloadedCookie)
          if (hasDownloadedCookie)
            fs.rename(downloadedCookie, formattedCookieFile, (err) => {
              if (process.env.NODE_ENV === 'development') console.error(err)
            })
          sp.stop()

          const cookieCheck =
            (await checkFileExists(formattedCookieFile)) ||
            (await checkFileExists(downloadedCookie))

          if (cookieCheck) {
            // If cookie file found
            cookie = true
            p.log.step(
              `${color.bgGreen(
                color.black(
                  ` Success an up to date cookie file was found in the get_iplayer directory `,
                ),
              )}`,
            )
          } else {
            // If no cookie file found
            p.log.step(
              `${color.bgRed(
                color.black(
                  ` Failed to find an up to date cookie file in the get_iplayer directory `,
                ),
              )}`,
            )
          }

          return cookie
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
              ? `Download videos to get_iplayer?`
              : 'Confirm settings?',
            initialValue: true,
          }),
      },
      {
        onCancel: () => {
          p.cancel(color.bgMagenta(color.black('  Download cancelled  ')))
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
        abort: (text) => color.bgMagenta(color.black(text)),
        error: (text) => color.bgRed(color.black(text)),
        success: (text) => color.bgMagenta(color.black(text)),
      }
      const formattedText = colours[type](`  ${msg}  `)
      return p.outro(formattedText)
    }

    // If confirm is false
    if (!iplayerOpts.confirm) {
      outro('Download aborted! Thank you for using Downloadify.', 'abort')
      this.exit(1)
    }

    // Set download directory
    const dwnDir = path.join(os.homedir(), `Movies/get_iplayer`)

    // Add arguments to the rest param
    let rest: null | string = null
    if (Object.keys(flags).length > 0) {
      rest = Object.keys(flags)
        .map((key) => {
          let newKey = ''
          if (key !== 'default') {
            newKey = `--${key}`
          }

          return newKey
        })
        .join(' ')
    }

    if (iplayerOpts.otherOpts && String(iplayerOpts.otherOpts).length > 0) {
      const emptyRest = rest
      const moreOpts = String(iplayerOpts.otherOpts).trim()
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

    // let hasFailed: boolean | string = false
    // let retry: string | boolean = false

    const opts = {
      location: dwnDir,
      pid: args.pid,
      season: flags.season ?? false,
      subs: iplayerOpts.subtitles === 'true',
      ...(rest && {
        rest,
      }),
    }
    if (flags.quiet) {
      sp.start(`Downloading${iplayerOpts.name ? ` ${iplayerOpts.name}` : ''}`)
    }

    await iplayerDl(opts)
      .then(() => {
        if (flags.quiet) {
          sp.stop()
        }

        outro(
          `${
            iplayerOpts.name
              ? `Completed download for ${iplayerOpts.name}.`
              : 'All downloads completed!'
          } Thank you for using Downloadify.`,
          'success',
        )
      })
      .catch((error) => {
        if (flags.quiet) {
          sp.stop()
        }

        if (process.env.NODE_ENV === 'development') console.error(error)
        p.select({
          message:
            'Crunchyroll CLI failed to download video. Would you like to retry with yt-dlp?',
          initialValue: 'yes',
          options: [
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ],
        }).then((res) => {
          if (Object.keys(flags).length > 0) {
            const flags = new Set(['quiet', 'verbose'])
            rest = Object.keys(flags)
              .map((key) => (flags.has(key) ? `--${key}` : ''))
              .join(' ')
          }

          if (res === 'true') {
            p.text({
              message: 'Please enter the iPlayer video URL?',
              validate: (value) => {
                if (!value) return 'Please enter a URL'
              },
            }).then((data) => {
              if (flags.quiet) {
                sp.start(
                  `Downloading${
                    iplayerOpts.name ? ` ${iplayerOpts.name}` : ''
                  }`,
                )
              }

              const newOpts = {
                location: dwnDir,
                url: String(data),
                cookieFile: {
                  path: path.join(
                    os.homedir(),
                    `Movies/${String(
                      dwnDir,
                    )}/cookies/cookies-${formattedDate}.txt`,
                  ),
                  exists: iplayerOpts.cookie === 'true',
                },
                subs: iplayerOpts.subtitles === 'true',
                ...(rest && {
                  rest,
                }),
              }
              ytdl(newOpts)
                .then(() => {
                  outro(
                    'All downloads completed! Thank you for using Downloadify. Completed download',
                    'success',
                  )
                })
                .catch((error) => {
                  if (flags.quiet) {
                    sp.stop()
                  }

                  if (process.env.NODE_ENV === 'development')
                    console.error(error)
                  outro('An error occurred. Unable to download', 'error')
                })
            })
          } else {
            if (flags.quiet) {
              sp.stop()
            }

            outro('An error occurred. Unable to download.', 'error')
          }
        })
      })
  }
}
