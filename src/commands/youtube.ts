import * as os from 'node:os'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { Args, Command, Flags } from '@oclif/core'
import * as p from '@clack/prompts'
import color from 'picocolors'
import { checkDirExists, newDir, ytdl } from '../utils/helper'
import notifier from 'node-notifier'

export default class Youtube extends Command {
  static description =
    'This command allows the user to download videos on YouTube'

  static examples = [
    'downloadify youtube https://www.youtube.com/watch?v=XPo8Z3tzyH0',
  ]

  static flags = {
    playlist: Flags.boolean({
      char: 'p',
      description:
        'Download the playlist, if the URL refers to a video and a playlist',
      required: false,
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'If you want to include debug information in the output',
      required: false,
    }),
    default: Flags.boolean({
      char: 'd',
      description:
        'Skip the majority of the choices and use predefined settings.',
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
    const { args, flags } = await this.parse(Youtube)
    const sp = p.spinner()
    console.clear()
    p.intro(`${color.bgMagenta(color.black(' YouTube '))}`)
    const ytOpts = await p.group(
      {
        dir: () =>
          p.text({
            message: 'What directory would you like to use for your downloads?',
            initialValue: 'YouTube',
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
        subtitles: async () => {
          if (flags.default) return
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
        enFormat: async () => {
          if (flags.default) return
          return p.select({
            message: 'Would you like to force the download to be in English?',
            initialValue: 'No',
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
          p.cancel(color.bgWhite(color.black('  Download cancelled  ')))
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
        abort: (text) => color.bgBlack(color.white(text)),
        error: (text) => color.bgRed(color.black(text)),
        success: (text) => color.bgMagenta(color.black(text)),
      }
      const formattedText = colours[type](`  ${msg}  `)
      return p.outro(formattedText)
    }

    // If confirm is false
    if (!ytOpts?.confirm) {
      outro('Download aborted! Thank you for using Downloadify.', 'abort')
      process.exit(1)
    }

    // Ask where to download video
    const dirName = ytOpts.dir
    // Set download directory
    const dwnDir = path.join(os.homedir(), `Movies/${String(dirName)}`)

    // Add arguments to the rest param
    let rest: string | null = null
    if (Object.keys(flags).length > 0) {
      rest = Object.keys(flags)
        .map((key, i) => {
          if (key !== 'default') {
            return key === 'playlist' ? `--yes-${key}` : `--${key}`
          }
        })
        .join(' ')
    }

    if (ytOpts.moreOpts && String(ytOpts.moreOpts).length > 0) {
      const flags = String(ytOpts.moreOpts)
        .split(' ')
        .map((flag) => (flag.startsWith('--') ? flag : `--${flag}`))
        .join(' ')
      rest += flags
    }

    let hasFailed: string | boolean = false

    const opts = {
      location: dwnDir,
      url: args.url,
      subs: ytOpts.subtitles === 'true',
      format: ytOpts.enFormat === 'true',
      ...(rest && {
        rest,
      }),
    }
    await ytdl(opts).catch((error) => {
      if (process.env.NODE_ENV === 'development') console.error(error)
      hasFailed = error.message
    })

    if (hasFailed) {
      outro('An error occurred. Unable to download.', 'error')
      notifier.notify({
        title: 'Download Failed',
        message: `An error occurred. Unable to download - ${hasFailed}`,
      })
    } else {
      outro(
        'All downloads completed! Thank you for using Downloadify.',
        'success',
      )
      notifier.notify({
        title: 'Download Successful',
        message: `All downloads completed! Thank you for using Downloadify. Completed download`,
      })
    }
  }
}
