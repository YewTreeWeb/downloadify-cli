import * as p from '@clack/prompts'
import { Args, Command, Flags } from '@oclif/core'
import dayjs from 'dayjs'
import * as os from 'node:os'
import * as path from 'node:path'
import color from 'picocolors'

import { checkCookie, checkDirExists, checkFileExists } from '../utils/check'
import createDir from '../utils/createDir'
import deleteOldCookies from '../utils/deleteCookie'
import { ytdl } from '../utils/fetcher'
import outro from '../utils/outro'

export default class Crunchyroll extends Command {
  static override args = {
    url: Args.string({
      description: 'The URL of the show you would like to download',
      required: true,
    }),
  }

  static override description =
    'The crunchyroll command gives the user the ability to download videos from the Crunchyroll website.'

  static override examples = [
    'downloadify crunchyroll https://www.crunchyroll.com/series/GYEXQKJG6/dr-stone',
    'downloadify crunchyroll GYEXQKJG6/dr-stone -s',
  ]

  static override flags = {
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
      description: 'Download video based on title or language',
      required: false,
    }),
    language: Flags.string({
      char: 'l',
      description: 'Download video based on language (e.g. en, ja, fr, etc.)',
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
    username: Flags.string({
      char: 'u',
      description: 'Your Crunchyroll username',
      required: false,
    }),
    password: Flags.string({
      char: 'p',
      description: 'Your Crunchyroll password',
      required: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Crunchyroll)

    const sp = p.spinner()

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
        username: () => {
          if (flags.default || flags.username) return
          return p.text({
            message: 'What is your Crunchyroll username?',
            validate: (value) => {
              if (!value) return 'Please enter a username'
            },
          })
        },
        password: () => {
          if (flags.default || flags.password) return
          return p.password({
            message: 'What is your Crunchyroll password?',
            validate: (value) => {
              if (!value) return 'Please enter a password'
            },
          })
        },
        cookie: () => {
          if (flags.default) return
          return p.select({
            message: 'Have you downloaded a Crunchyroll cookie file?',
            initialValue: 'false',
            maxItems: 2,
            options: [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ],
          })
        },
        format: async () => {
          if (flags.default) return
          return p.select({
            message: 'What format would you like to download the video in?',
            initialValue: 'quality',
            maxItems: 3,
            options: [
              { value: 'id', label: 'ID' },
              { value: 'quality', label: 'Quality' },
              { value: 'multi', label: 'Multiple' },
            ],
          })
        },
        filter: async ({ results }) => {
          if (flags.default || flags.filter || results.format === 'multi')
            return
          return p.select({
            message: 'What format would you like to download the video in?',
            initialValue: 'lang',
            maxItems: 3,
            options: [
              { value: 'lang', label: 'Language' },
              { value: 'title', label: 'Title' },
              { value: 'skip', label: 'Skip' },
            ],
          })
        },
        language: async ({ results }) => {
          if (
            flags.default ||
            flags.language ||
            results.format === 'multi' ||
            (results.filter === 'skip' && results.format !== 'id')
          )
            return
          return p.select({
            message: 'What format would you like to download the video in?',
            initialValue: 'en',
            maxItems: 2,
            options: [
              { value: 'en', label: 'English' },
              { value: 'jp', label: 'Japanese' },
            ],
          })
        },
        subtitles: async ({ results }) => {
          if (
            flags.all_subs ||
            flags.default ||
            results.format === 'multi' ||
            results.language === 'jp'
          )
            return
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
          if (flags.default || results.subtitles === 'false') return
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
        confirm: ({ results }) => {
          if (flags.default) return
          return p.confirm({
            message: `Download videos to ${results.dir}?`,
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
        cookie: false,
        subtitles: false,
        hardSubs: false,
        format: 'quality',
        filter: 'lang',
        language: 'en',
        ...(!flags.username && {
          username: await p.text({
            message: 'What is your Crunchyroll username?',
            validate: (value) => {
              if (!value) return 'Please enter a username'
            },
          }),
        }),
        ...(!flags.password && {
          password: await p.password({
            message: 'What is your Crunchyroll password?',
            validate: (value) => {
              if (!value) return 'Please enter a password'
            },
          }),
        }),
      }
    }

    // If confirm is false
    if (!opts.confirm) {
      outro('Download aborted! Thank you for using Downloadify.', 'abort')
      this.exit(1)
    }

    // Set download directory
    const dirName = defaults?.dir || opts.dir
    const dwnDir = path.join(os.homedir(), `Movies/${dirName}`)
    // Get the name of the video
    const dwnName = args.url.split('/').at(-1) ?? ''

    // Check if the directory exists
    const dirExists = await checkDirExists(dwnDir)
    if (!dirExists) {
      const { success, error } = await createDir(dirName)
      if (error)
        this.error(`Failed to create directory ${dirName}: ${error}`, {
          exit: 1,
        })
      if (success) p.log.step(`Created directory ${dirName}`)
    }

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

    // Check if the cookie file exists
    // If file does not exist, exit the program
    const baseUrlNoLastSlash = baseUrl.slice(0, -1)
    let cookiePath: boolean | string = false

    const hasCookie = await checkCookie(dirName, baseUrlNoLastSlash)
    if (opts.cookie === 'true' && !flags.default) {
      deleteOldCookies(dwnDir)

      if (hasCookie.error) {
        this.error(
          `Failed to find an up to date cookie file in the ${dwnDir}.`,
          { exit: 1 },
        )
      } else if (hasCookie.success) {
        cookiePath = String(hasCookie.cookiePath)
        p.log.step(
          `${color.bgGreen(
            color.black(
              ` Success a cookie file was found in the ${dirName} directory `,
            ),
          )}`,
        )
      }
    } else {
      const cookieFile = `${dwnDir}/cookies/cookies-${dayjs(new Date()).format('DD-MM-YYYY')}.txt`
      const alreadyHasCookie = await checkFileExists(cookieFile)
      if (alreadyHasCookie) {
        cookiePath = cookieFile
      } else {
        p.log.step(
          'An attempt to downloaded cookies automatically will start soon. Please make sure the website you are downloading from is open in Chrome',
        )
      }
    }

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
    if (
      opts.more === 'true' &&
      String(opts.custom).length > 0 &&
      !flags.default
    ) {
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

    const ytdlParams = {
      location: dwnDir,
      username: flags.username ?? (defaults?.username || opts.username),
      password: flags.password ?? (defaults?.password || opts.password),
      cookieFile: {
        exists:
          typeof defaults?.cookie === 'boolean'
            ? defaults.cookie
            : opts.cookie === 'true'
              ? !!cookiePath
              : false,
        ...(cookiePath && { path: cookiePath }),
      },
      filter: defaults?.filter || (flags.filter ?? opts.filter),
      format: defaults?.format || opts.format,
      language: defaults?.language || (flags.language ?? opts.language),
      subs: defaults?.subtitles || (flags.all_subs ? 'all' : opts.subtitles),
      hardSubs: defaults?.hardSubs || opts.hardSubs,
      url,
      ...(rest && { rest }),
      ...(flags.quiet && { quiet: flags.quiet }),
      ...(flags.verbose && { verbose: flags.verbose }),
    }

    // Start the spinner
    if (flags.quiet && !flags.verbose) sp.start(`Downloading ${dwnName}`)

    await ytdl(ytdlParams)
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
        this.exit(0)
      })
      .catch((error) => {
        if (flags.quiet && !flags.verbose) {
          sp.stop()
        }

        if (process.env.NODE_ENV === 'development') console.error(error)
        outro(
          `An error occurred. Unable to download due to the following error: ${color.underline(
            color.black(error.message),
          )}`,
          'error',
        )
        this.exit(1)
      })
  }
}
