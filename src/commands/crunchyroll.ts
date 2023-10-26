import * as os from 'node:os'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { Args, Command, Flags } from '@oclif/core'
import * as p from '@clack/prompts'
import color from 'picocolors'
import {
  checkFileExists,
  checkDirExists,
  crunchy,
  deleteOldCookies,
  fetchCookie,
  newDir,
  ytdl,
} from '../utils/helper'
import * as notifier from 'node-notifier'

export default class Crunchyroll extends Command {
  static description = 'describe the command here'

  static examples = ['<%= config.bin %> <%= command.id %>']

  static flags = {
    all_subs: Flags.boolean({
      char: 'a',
      description: 'Download all available subtitles',
      required: false,
    }),
    filter: Flags.string({
      char: 'f',
      description: 'Download a range of episodes e.g. S1-S3,S4E2-S4E6',
      required: false,
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'If you want to include debug information in the output',
      required: false,
    }),
    yes: Flags.boolean({
      char: 'y',
      description:
        'Sometimes different seasons have the same season number, this flag suppresses this interactive prompt and just downloads all seasons',
      required: false,
    }),
  }

  static args = {
    url: Args.string({
      description: 'The URL of the show you would like to download',
      required: true,
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
    p.intro(`${color.bgYellow(color.black(' Crunchyroll '))}`)
    const crunchyOpts = await p.group(
      {
        dir: () =>
          p.text({
            message: 'What directory would you like to use for your downloads?',
            initialValue: 'Crunchy',
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
          if (!dirExists) {
            p.log.step(
              `${color.bgRed(
                color.white(
                  `  Directory ${String(results.dir)} does not exist  `,
                ),
              )}`,
            )

            // Show spinner while directory is being created
            sp.start(`Now creating ${String(results.dir)}`)
            await newDir(String(results.dir))
            sp.stop()

            dirCreated = !dirCreated
            p.log.step(
              `${color.bgGreen(
                color.black(` Successfully created ${String(results.dir)} `),
              )}`,
            )
          } else {
            dirCreated = !dirCreated
            p.log.step(
              `${color.bgGreen(
                color.black(` Found directory ${String(results.dir)} `),
              )}`,
            )
          }
          return dirCreated
        },
        cookie: () =>
          p.select({
            message: 'Have you downloaded a Crunchyroll cookie file?',
            initialValue: 'skip',
            maxItems: 3,
            options: [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
              { value: 'skip', label: 'Skip' },
            ],
          }),
        username: async () => {
          return p.text({
            message: 'Please enter your username for Crunchyroll?',
            placeholder: 'User',
            validate: (value) => {
              if (!value) return 'Please enter a username'
            },
          })
        },
        password: async () => {
          return p.password({
            message: 'Please enter your password for Crunchyroll?',
            validate: (value) => {
              if (!value) return 'Please enter a password'
              if (value.length <= 10)
                return 'Password must be more than 10 characters'
            },
          })
        },
        hasCookie: async ({ results }) => {
          if (results.cookie === 'skip') return
          let cookie = false
          const cookieDir = path.join(
            os.homedir(),
            `Movies/${String(results.dir)}/cookies`,
          )
          const downloadedCookie = path.join(
            os.homedir(),
            `Downloads/www.crunchyroll.com_cookies.txt`,
          )
          const formattedCookieFile = `${cookieDir}/cookies-${formattedDate}.txt`
          // Remove outdated cookies
          deleteOldCookies(cookieDir, String(results.dir))

          // Fetch cookie if previous answer was no
          // if yes move cookie and rename
          if (results.cookie === 'false') {
            const cookieOps = {
              url: `https://sso.crunchyroll.com/login`,
              user: {
                name: String(results.username),
                el: '#username_input',
              },
              pass: {
                word: String(results.password),
                el: '#password_input',
              },
              cookieDir,
              button: '#submit_button',
              selector: '.header-logo',
            }
            sp.start('fetching cookie')
            await fetchCookie(cookieOps)
            sp.stop()
          } else {
            const hasDownloadedCookie = await checkFileExists(downloadedCookie)
            if (hasDownloadedCookie)
              fs.rename(downloadedCookie, formattedCookieFile, (err) => {
                if (process.env.NODE_ENV === 'development') console.error(err)
              })
          }

          const cookieCheck = await checkFileExists(formattedCookieFile)
          if (!cookieCheck) {
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
          } else {
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
          }

          return cookie
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
          p.cancel(
            color.bgYellow(color.black('  Crunchyroll download cancelled  ')),
          )
          process.exit(0)
        },
      },
    )

    // Create an outro for the cli
    const outro = (msg: string, type: 'abort' | 'error' | 'success') => {
      const colours: Record<
        'abort' | 'error' | 'success',
        (text: string) => string
      > = {
        abort: (text) => color.bgYellow(color.black(text)),
        error: (text) => color.bgRed(color.black(text)),
        success: (text) => color.bgYellow(color.black(text)),
      }
      const formattedText = colours[type](`  ${msg}  `)
      return p.outro(formattedText)
    }

    // If confirm is false
    if (!crunchyOpts.confirm) {
      outro('Download aborted! Thank you for using Downloadify.', 'abort')
      process.exit(1)
    }
    // Ask where to download video
    const dirName = crunchyOpts.dir
    // Set download directory
    const dwnDir = path.join(os.homedir(), `Movies/${String(dirName)}`)

    // Download from Crunchyroll
    let filter = flags.filter
    if (
      flags.filter &&
      flags.filter?.length > 1 &&
      !flags.filter.includes('-')
    ) {
      const isRange = await p.confirm({
        message: 'Is the filter your passing meant to be a range?',
        initialValue: true,
      })
      if (isRange) {
        p.log.step('A filter range must contain - ')
        const newVal = await p.text({
          message: 'Please enter a new filter containing a -',
        })
        filter = String(newVal)
      }
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
        process.exit(1)
      }
    }

    // Get the name of the video
    const splitPath = String(args.url).split('/')
    const words = String(splitPath[1]).split('-')
    const dwnName = words
      .map((word) => {
        return word[0].toUpperCase() + word.substring(1)
      })
      .join(' ')
    let hasFailed: boolean | string = false
    let retry: string | boolean = false

    // Add arguments to the rest param
    let rest: string | null = null
    if (Object.keys(flags).length > 0) {
      rest = Object.keys(flags)
        .map((key, i) => {
          if (key !== 'all_subs' && key !== 'save' && key !== 'default') {
            return `--${key}`
          }
        })
        .join(' ')
    }

    const opts = {
      location: dwnDir,
      url: args.url,
      username: String(crunchyOpts.username),
      password: String(crunchyOpts.password),
      subs: flags.all_subs
        ? 'all'
        : crunchyOpts.subtitles === 'true'
        ? true
        : false,
      ...(flags.filter && {
        filter,
      }),
      ...(rest && {
        rest,
      }),
    }

    await crunchy(opts).catch((error) => {
      if (process.env.NODE_ENV === 'development') console.error(error)
      retry = String(
        p.select({
          message: `Crunchyroll CLI failed to download ${dwnName}. Would you like to retry with yt-dlp?`,
          initialValue: 'yes',
          options: [
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ],
        }),
      )
      if (retry === 'false') {
        hasFailed = error.message
      }
    })

    if (String(retry) === 'true') {
      const newOpts = {
        location: dwnDir,
        url: args.url,
        cookieFile: {
          path: path.join(
            os.homedir(),
            `Movies/${String(dirName)}/cookies/cookies-${formattedDate}.txt`,
          ),
          exists: crunchyOpts.cookie === 'true',
        },
        format: true,
        subs: flags.all_subs
          ? 'all'
          : crunchyOpts.subtitles === 'true'
          ? true
          : false,
      }
      await ytdl(newOpts).catch((error) => {
        if (process.env.NODE_ENV === 'development') console.error(error)
        hasFailed = error.message
      })
    }

    if (hasFailed) {
      outro(
        `An error occurred. Unable to download - ${color.underline(
          color.white(dwnName),
        )}`,
        'error',
      )
      notifier.notify({
        title: 'Download Failed',
        message: `An error occurred. Unable to download - ${hasFailed}`,
      })
    } else {
      outro(
        `All downloads completed! Thank you for using Downloadify. Completed download - ${color.underline(
          color.black(dwnName),
        )}`,
        'success',
      )
      notifier.notify({
        title: 'Download Successful',
        message: `All downloads completed! Thank you for using Downloadify. Completed download - ${color.underline(
          color.black(dwnName),
        )}`,
      })
    }
  }
}
