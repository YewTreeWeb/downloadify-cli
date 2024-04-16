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
    const otherOpts = await p.group(
      {
        dir: () =>
          p.text({
            message: 'What directory would you like to use for your downloads?',
            initialValue: 'Videos',
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
            await createDir(String(results.dir))
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
        includeSE: () => {
          if (flags.default) return
          return p.select({
            message: 'Do you need to enter a season or episode?',
            initialValue: 'both',
            maxItems: 4,
            options: [
              { value: 'both', label: 'Both' },
              { value: 'season', label: 'Season' },
              { value: 'episode', label: 'Episode' },
              { value: 'skip', label: 'Skip' },
            ],
          })
        },
        seasonNum: ({ results }) => {
          if (
            String(results.includeSE) === 'episode' ||
            String(results.includeSE) === 'skip' ||
            flags.default
          )
            return
          return p.text({
            message: 'What is the number of the season you want to download?',
            initialValue: '1',
            validate(value) {
              const regex = /^[1-9]\d*$/
              if (!regex.test(value))
                return 'Season number must be a positive number'
            },
          })
        },
        episodeNum: ({ results }) => {
          if (
            String(results.includeSE) === 'season' ||
            String(results.includeSE) === 'skip' ||
            flags.default
          )
            return
          return p.text({
            message: 'Enter the episode number you want to download',
            validate: (value) => {
              const regex = /^[1-9]\d*$/
              if (!regex.test(value))
                return 'Episode number must be a positive number'
            },
          })
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
        hardSubs: async ({ results }) => {
          if (
            flags.default ||
            results.subtitles === 'false' ||
            !args.url.includes('crunchyroll')
          )
            return
          return p.select({
            message: 'Would you like the subtitles to be hard coded?',
            initialValue: 'false',
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
        moreOpts: ({ results }) => {
          if (results.more === 'false' || flags.default) return
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
          p.cancel(color.bgMagenta(color.black('  Download cancelled  ')))
          this.exit(0)
        },
      },
    )

    // If confirm is false
    if (!otherOpts?.confirm) {
      outro('Download aborted! Thank you for using Downloadify.', 'abort')
      this.exit(1)
    }

    // Ask where to download video
    const dirName = otherOpts.dir
    // Set download directory
    const dwnDir = path.join(os.homedir(), `Movies/${String(dirName)}`)

    // Add arguments to the rest param
    let rest: null | string = null
    if (Object.keys(flags).length > 0) {
      rest = Object.keys(flags)
        .map((key) => {
          let newKey = ''
          if (key !== 'all_subs' && key !== 'default') {
            newKey = `--${key}`
          }

          return newKey
        })
        .join(' ')
    }

    if (otherOpts.moreOpts && String(otherOpts.moreOpts).length > 0) {
      const emptyRest = rest
      const moreOpts = String(otherOpts.moreOpts).trim()
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

    // If no cookie file end the cli
    // Else run yt-dlp
    if (!otherOpts.hasCookie && otherOpts.cookie === 'true') {
      outro(
        `Unable to download. Please add a valid and up-to-date cookies file to the ${String(
          dirName,
        )} directory.`,
        'error',
      )
      this.exit(1)
    } else {
      let hasFailed: boolean | string = false

      const opts = {
        location: dwnDir,
        episode: Number(otherOpts?.episodeNum) || null,
        season: Number(otherOpts?.seasonNum) || null,
        ...(otherOpts.cookie !== 'skip' &&
          !flags.default && {
            cookieFile: {
              path: path.join(
                os.homedir(),
                `Movies/${String(
                  dirName,
                )}/cookies/cookies-${formattedDate}.txt`,
              ),
              exists: otherOpts.cookie === 'true',
            },
          }),
        url: args.url,
        subs: flags.all_subs ? 'all' : otherOpts.subtitles === 'true',
        hardSubs: otherOpts.hardSubs === 'true',
        format: otherOpts.enforceEng === 'format',
        lang: otherOpts.enforceEng === 'lang',
        title: otherOpts.enforceEng === 'title',
        ...(rest && {
          rest,
        }),
      }
      if (flags.quiet) {
        sp.start('Downloading')
      }

      await ytdl(opts).catch((error) => {
        if (process.env.NODE_ENV === 'development') console.error(error)
        hasFailed = error.message
      })

      if (flags.quiet) {
        sp.stop()
      }

      if (hasFailed) {
        outro('An error occurred. Unable to download.', 'error')
      } else {
        outro(
          'All downloads completed! Thank you for using Downloadify.',
          'success',
        )
      }
    }
  }
}
