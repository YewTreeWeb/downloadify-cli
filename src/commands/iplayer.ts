import * as os from 'node:os'
import * as path from 'node:path'
import { Args, Command, Flags } from '@oclif/core'
import * as p from '@clack/prompts'
import color from 'picocolors'
import { checkDirExists, iplayerDl, newDir, ytdl } from '../utils/helper'
import notifier from 'node-notifier'

export default class Iplayer extends Command {
  static description =
    'The iplayer command gives the user the ability to download videos from the iPlayer UK website by providing the PID of the show/episode.'

  static examples = ['downloadify iplayer m001rswk']

  static flags = {
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
    default: Flags.boolean({
      char: 'd',
      description:
        'Skip the majority of the choices and use predefined settings.',
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
        other: () => {
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
      process.exit(1)
    }

    // Set download directory
    const dwnDir = path.join(os.homedir(), `Movies/get_iplayer`)

    // Add arguments to the rest param
    let rest: string | null = null
    if (Object.keys(flags).length > 0) {
      rest = Object.keys(flags)
        .map((key, i) => {
          if (key !== 'default') {
            return `--${key}`
          }
        })
        .join(' ')
    }

    if (iplayerOpts.otherOpts && String(iplayerOpts.otherOpts).length > 0) {
      const flags = String(iplayerOpts.otherOpts)
        .split(' ')
        .map((flag) => (flag.startsWith('--') ? flag : `--${flag}`))
        .join(' ')
      rest += flags
    }

    let hasFailed: string | boolean = false
    let retry: string | boolean = false

    const opts = {
      location: dwnDir,
      pid: args.pid,
      season: flags.season ?? false,
      subs: iplayerOpts.subtitles === 'true',
      ...(rest && {
        rest,
      }),
    }

    await iplayerDl(opts).catch((error) => {
      if (process.env.NODE_ENV === 'development') console.error(error)
      retry = String(
        p.select({
          message: `get_iplayer failed to download${
            iplayerDl.name ? ` ${iplayerOpts.name}` : ''
          }. Would you like to retry with yt-dlp?`,
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
      const url = p.text({
        message: 'Please enter the iPlayer URL?',
        validate: (value) => {
          if (!value) return 'Please enter a URL'
        },
      })
      const newOpts = {
        location: dwnDir,
        url: String(url),
        subs: iplayerOpts.subtitles === 'true',
      }
      await ytdl(newOpts).catch((error) => {
        if (process.env.NODE_ENV === 'development') console.error(error)
        hasFailed = error.message
      })
    }

    if (hasFailed) {
      outro('An error occurred. Unable to download.', 'error')
      notifier.notify({
        title: 'Download Failed',
        message: `An error occurred. Unable to download - ${hasFailed}`,
      })
    } else {
      outro(
        `${
          iplayerOpts.name
            ? `Completed download for ${iplayerOpts.name}.`
            : 'All downloads completed!'
        } Thank you for using Downloadify.`,
        'success',
      )
      notifier.notify({
        title: 'Download Successful',
        message: `All downloads completed! Thank you for using Downloadify. Completed download${
          iplayerOpts.name ? `for ${iplayerOpts.name}` : ''
        }`,
      })
    }
  }
}
