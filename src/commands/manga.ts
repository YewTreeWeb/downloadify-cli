import * as p from '@clack/prompts'
import { Args, Command, Flags } from '@oclif/core'
import * as os from 'node:os'
import * as path from 'node:path'
import color from 'picocolors'

import { checkDirExists } from '../utils/check'
import createDir from '../utils/createDir'
import { dwnManga } from '../utils/fetcher'
import outro from '../utils/outro'

const baseUrl = 'https://chapmanganato.to/'
export default class Manga extends Command {
  static args = {
    url: Args.string({
      description: 'The URL or name of the manga you would like to download',
      required: true,
    }),
  }

  static description =
    'The manga command gives the user the ability to download manga chapters from specific websites.'

  static examples: [
    'downloadify manga https://www.mangaeden.com/manga/one_piece',
  ]

  static flags = {
    language: Flags.string({
      char: 'l',
      description: 'The language of the manga you would like to download',
    }),
    filter: Flags.string({
      char: 'f',
      description: 'Download a range of chapters e.g. 1-3,42-46',
    }),
    baseUrl: Flags.boolean({
      char: 'b',
      description: `Use the default URL ${baseUrl} as the second-level domain`,
    }),
    default: Flags.boolean({
      char: 'd',
      description: 'Skip download questions and use default settings',
      required: false,
    }),
    quiet: Flags.boolean({
      char: 'q',
      description:
        "Don't print the output of the downloading process to the terminal",
      required: false,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Manga)
    const sp = p.spinner()
    console.clear()
    if (process.env.NODE_ENV === 'development')
      p.intro(`${color.bgGreen(color.white(' Dev Mode Active '))}`)

    p.intro(`${color.bgMagenta(color.black(' Manga '))}`)
    const opts = await p.group(
      {
        dir: () => {
          if (flags.default) return
          return p.text({
            message: 'What directory would you like to use for your downloads?',
            initialValue: 'Manga',
          })
        },
        hasDir: async ({ results }) => {
          const chosenDirName = results.dir ?? 'Manga'
          // Check to see if directory exists
          const dirExists = await checkDirExists(`Documents/${chosenDirName}`)
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
                color.black(`  Directory ${chosenDirName} does not exist  `),
              )}`,
            )

            // Show spinner while directory is being created
            sp.start(`Now creating ${chosenDirName}`)
            await createDir(chosenDirName, 'Documents', false)
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
        language: () => {
          if (flags.default || flags.language) return
          return p.text({
            message: 'What language would you like to download?',
            initialValue: 'en',
          })
        },
        filter: () => {
          if (flags.default || flags.filter) return
          return p.text({
            message: 'What chapters would you like to download?',
            initialValue: 'All',
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
            message: results.hasDir
              ? `Download to ${results.dir}?`
              : 'Confirm settings?',
            initialValue: true,
          })
        },
      },
      {
        onCancel: () => {
          p.cancel(color.bgMagenta(color.black('  Manga download cancelled  ')))
          this.exit(0)
        },
      },
    )

    let defaults = null
    if (flags.default) {
      defaults = {
        dir: 'Manga',
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
      `Documents/${defaults?.dir || opts.dir}`,
    )

    const url =
      (!/^(https?:\/\/)/i.test(args.url) && !flags.baseUrl) || flags.baseUrl
        ? `${baseUrl}${args.url}`
        : args.url

    /* Add arguments to the rest param */
    // Loop through the flags and any not in the ignore to the res variable
    let rest: null | string = null
    if (Object.keys(flags).length > 0) {
      const dismiss = new Set([
        'baseUrl',
        'filter',
        'language',
        'default',
        'quiet',
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

    let filter = null
    if (opts.filter !== 'All') {
      filter = opts.filter
    } else if (flags.filter) {
      filter = flags.filter
    }

    let language = 'en'
    if (opts.language !== 'en') {
      language = opts.language
    } else if (flags.language && flags.language !== 'en') {
      language = flags.language
    }

    const dwnOpts = {
      location: dwnDir,
      url,
      language,
      filter,
      rest,
      ...(flags.quiet && { quiet: flags.quiet }),
    }

    if (flags.quiet) sp.start('Downloading manga')

    await dwnManga(dwnOpts)
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
