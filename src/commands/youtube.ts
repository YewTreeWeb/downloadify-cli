import * as p from '@clack/prompts'
import { Args, Command, Flags } from '@oclif/core'
import * as os from 'node:os'
import * as path from 'node:path'
import color from 'picocolors'

import { checkDirExists } from '../utils/check'
import createDir from '../utils/createDir'
import { ytdl } from '../utils/fetcher'
import outro from '../utils/outro'

const baseUrl = 'https://www.youtube.com/'

export default class Youtube extends Command {
  static args = {
    url: Args.string({
      description: 'The URl of the videos you want to download',
      required: true,
    }),
  }

  static description =
    'This command allows the user to download videos on YouTube'

  static examples = [
    'downloadify youtube https://www.youtube.com/watch?v=XPo8Z3tzyH0',
  ]

  static flags = {
    default: Flags.boolean({
      char: 'd',
      description:
        'Skip the majority of the choices and use predefined settings.',
      required: false,
    }),
    playlist: Flags.boolean({
      char: 'p',
      description:
        'Download the playlist, if the URL refers to a video and a playlist',
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
    const { args, flags } = await this.parse(Youtube)
    const sp = p.spinner()
    console.clear()
    if (process.env.NODE_ENV === 'development')
      p.intro(`${color.bgGreen(color.white(' Dev Mode Active '))}`)

    p.intro(`${color.bgMagenta(color.black(' YouTube '))}`)
    const opts = await p.group(
      {
        dir: () => {
          if (flags.default) return
          return p.text({
            message: 'What directory would you like to use for your downloads?',
            initialValue: 'YouTube',
            validate: (value) => {
              const regex = /^[A-Za-z-]+$/
              if (!value) return 'Please enter a directory'
              if (!regex.test(value))
                return 'Directory name may only contain letters and dashes'
            },
          })
        },
        hasDir: async ({ results }) => {
          const chosenDirName = results.dir ?? 'YouTube'
          // Check to see if directory exists
          const dirExists = await checkDirExists(`Movies/${chosenDirName}`)
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
        subtitles: async () => {
          if (flags.default) return
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
        enFormat: async () => {
          if (flags.default) return
          return p.select({
            message: 'Would you like to force the download to be in English?',
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
        confirm: ({ results }) =>
          p.confirm({
            message: results.hasDir
              ? `Download videos to ${results.dir ?? 'YouTube'}?`
              : 'Confirm settings?',
            initialValue: true,
          }),
      },
      {
        onCancel: () => {
          p.cancel(color.bgWhite(color.black('  Download cancelled  ')))
          this.exit(0)
        },
      },
    )

    let defaults = null
    if (flags.default) {
      defaults = {
        dir: 'YouTube',
        subtitles: false,
        enFormat: false,
      }
    }

    // If confirm is false
    if (!opts?.confirm) {
      outro('Download aborted! Thank you for using Downloadify.', 'abort')
      this.exit(1)
    }

    // Set download directory
    const dwnDir = path.join(
      os.homedir(),
      `Movies/${defaults?.dir || opts.dir}`,
    )

    const url = args.url.includes('youtube')
      ? args.url
      : `${baseUrl}${args.url}`

    /* Add arguments to the rest param */
    // Loop through the flags and any not in the ignore to the res variable
    let rest: null | string = null
    if (Object.keys(flags).length > 0) {
      const dismiss = new Set(['playlist', 'quiet', 'default', 'verbose'])
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
      subs: defaults?.subtitles || opts.subtitles,
      format: defaults?.enFormat || opts.enFormat,
      ...(rest && {
        rest,
      }),
    }
    if (flags.quiet && !flags.verbose) {
      sp.start('Downloading')
    }

    await ytdl(ytdlOpts)
      .then(() => {
        if (flags.quiet && !flags.verbose) {
          sp.stop()
        }

        outro(
          'All downloads completed! Thank you for using Downloadify.',
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
            color.black(error.message),
          )}`,
          'error',
        )
      })
  }
}
