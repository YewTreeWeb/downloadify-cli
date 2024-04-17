import * as p from '@clack/prompts'
import { Args, Command, Flags } from '@oclif/core'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import color from 'picocolors'

import { checkDirExists, checkFileExists } from '../utils/check'
import createDir from '../utils/createDir'
import deleteOldCookies from '../utils/deleteCookie'
import { LanguageProps, ytdl } from '../utils/fetcher'
import outro from '../utils/outro'

export default class Other extends Command {
  static args = {
    url: Args.string({
      description: 'The URl of the videos you want to download',
      required: true,
    }),
  }

  static description =
    'Other command allows for videos to be download from multiple different websites by providing the URL.'

  static examples = [
    'downloadify other https://www.dailymotion.com/video/x8k1i6w',
  ]

  static flags = {
    all_subs: Flags.boolean({
      char: 'a',
      description: 'Download all available subtitles',
      required: false,
    }),
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
    verbose: Flags.boolean({
      char: 'v',
      description: 'If you want to include debug information in the output',
      required: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Other)
    const sp = p.spinner()
    const date = new Date()
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    function extractDomainFromURL(url: string): null | string {
      try {
        const urlObject = new URL(url)
        return urlObject.hostname
      } catch (error) {
        // Handle invalid URLs or other errors here
        console.error('Invalid URL:', error)
        return null
      }
    }

    console.clear()
    if (process.env.NODE_ENV === 'development')
      p.intro(`${color.bgGreen(color.white(' Dev Mode Active '))}`)

    p.intro(`${color.bgMagenta(color.black(' Other '))}`)
    const opts = await p.group(
      {
        dir: () => {
          if (flags.default) return
          return p.text({
            message: 'What directory would you like to use for your downloads?',
            initialValue: 'Videos',
            validate: (value) => {
              const regex = /^[A-Za-z-]+$/
              if (!value) return 'Please enter a directory'
              if (!regex.test(value))
                return 'Directory name may only contain letters and dashes'
            },
          })
        },
        hasDir: async ({ results }) => {
          const chosenDirName = results.dir ?? 'Videos'
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
            initialValue: 'true',
            message: 'Have you already downloaded a cookie file?',
            maxItems: 3,
            options: [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
              { value: 'skip', label: 'Skip' },
            ],
          })
        },
        hasCookie: async ({ results }) => {
          if (flags.default) return
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

          const domain = extractDomainFromURL(args.url)
          const downloadedCookie = path.join(
            os.homedir(),
            `Downloads/${domain}_cookies.txt`,
          )
          const formattedCookieFile = `${cookieDir}/cookies-${formattedDate}.txt`

          // Move cookie file from Downloads
          // rename file to have date
          sp.start('fetching cookie')
          const hasDownloadedCookie = await checkFileExists(downloadedCookie)
          console.log(hasDownloadedCookie)

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
        subtitles: async () => {
          if (flags.all_subs || flags.default) return
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
        enforceEng: async () => {
          if (flags.default) return
          return p.select({
            message:
              'Would you like to force the download to be in English? Enforce by format, lang or title.',
            initialValue: 'false',
            options: [
              { value: 'format', label: 'Format' },
              { value: 'lang', label: 'Language' },
              { value: 'title', label: 'Title' },
              { value: 'false', label: 'No' },
            ],
          })
        },
        lang: ({ results }) => {
          if (flags.default || results.enforceEng !== 'false') return
          return p.select({
            message: 'Would you like download in another language?',
            initialValue: 'false',
            maxItems: 2,
            options: [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ],
          })
        },
        otherLang: ({ results }) => {
          if (flags.default || results.lang === 'false') return
          return p.text({
            message: 'What language would you like to download in? (eg. jp)',
          })
        },
        more: () => {
          if (flags.default) return
          return p.select({
            message: 'Would you like to add any other params to the download?',
            initialValue: 'false',
            maxItems: 2,
            options: [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ],
          })
        },
        custom: ({ results }) => {
          if (results.more === 'false' || flags.default) return
          return p.text({
            message: 'What other params would you like to add?',
          })
        },
        confirm: ({ results }) =>
          p.confirm({
            message: results.hasDir
              ? `Download videos to ${results.dir ?? 'Videos'}?`
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

    let defaults = null
    if (flags.default) {
      defaults = {
        dir: 'Videos',
        cookie: 'skip',
        subtitles: false,
        enforceEng: false,
        more: false,
      }
    }

    // If confirm is false
    if (!opts?.confirm) {
      outro('Download aborted! Thank you for using Downloadify.', 'abort')
      this.exit(1)
    }

    // Set download directory
    const dirName = defaults?.dir || opts.dir
    const dwnDir = path.join(os.homedir(), `Movies/${dirName}`)

    //* Add arguments to the rest param */
    // Loop through the flags and any not in the ignore to the res variable
    let rest: null | string = null
    if (Object.keys(flags).length > 0) {
      const dismiss = new Set(['all_subs', 'quiet', 'default', 'verbose'])
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

    const format: LanguageProps = {
      type: opts.enforceEng === 'false' ? 'language' : String(opts.enforceEng),
      custom: String(opts.otherLang),
      forceEn: opts.enforceEng !== 'false',
    }

    // If no cookie file end the cli
    // Else run yt-dlp
    if (!opts.hasCookie && opts.cookie === 'true' && !flags.default) {
      outro(
        `No cookie file found. Unable to download, please add a valid and up-to-date cookies file to the ${dirName} directory.`,
        'error',
      )
      this.exit(1)
    }

    const ytdlOpts = {
      location: dwnDir,
      episode: null,
      season: null,
      ...(opts.cookie !== 'skip' &&
        !flags.default && {
          cookieFile: {
            path: path.join(
              os.homedir(),
              `Movies/${String(dirName)}/cookies/cookies-${formattedDate}.txt`,
            ),
            exists: opts.cookie === 'true',
          },
        }),
      url: args.url,
      subs: defaults?.subtitles || flags.all_subs ? 'all' : opts.subtitles,
      ...(!defaults?.enforceEng && {
        format,
      }),
      ...(rest && {
        rest,
      }),
    }
    if (flags.quiet) {
      sp.start('Downloading')
    }

    await ytdl(ytdlOpts)
      .then(() => {
        if (flags.quiet) sp.stop()

        outro(
          'All downloads completed! Thank you for using Downloadify.',
          'success',
        )
      })
      .catch((error) => {
        if (flags.quiet) sp.stop()

        if (process.env.NODE_ENV === 'development') console.error(error)
        outro(
          `An error occurred. Unable to download due to the following error: ${color.underline(
            color.black(error.message),
          )}`,
          'error',
        )
      })
  }
}
