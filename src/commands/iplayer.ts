import * as p from '@clack/prompts'
import { Args, Command, Flags } from '@oclif/core'
import * as os from 'node:os'
import * as path from 'node:path'
import color from 'picocolors'

import { checkDirExists } from '../utils/check'
import createDir from '../utils/createDir'
import { iplayerDl } from '../utils/fetcher'
import outro from '../utils/outro'

export default class Iplayer extends Command {
  static args = {
    pid: Args.string({
      description:
        'The PID of the videos you want to download. The BBC Programme Identifier can be found in the URL after "episode/"',
      required: true,
    }),
  }

  static description =
    'The iPlayer command gives the user the ability to download videos from the iPlayer UK website by providing the PID of the show/episode.'

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

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Iplayer)
    const sp = p.spinner()

    console.clear()
    if (process.env.NODE_ENV === 'development')
      p.intro(`${color.bgGreen(color.white(' Dev Mode Active '))}`)

    p.intro(`${color.bgMagenta(color.black(' iPlayer '))}`)
    const opts = await p.group(
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
            await createDir('get_iplayer')
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

    // If confirm is false
    if (!opts.confirm) {
      outro('Download aborted! Thank you for using Downloadify.', 'abort')
      this.exit(1)
    }

    // Set download directory
    const dwnDir = path.join(os.homedir(), `Movies/get_iplayer`)

    /* Add arguments to the rest param */
    // Loop through the flags and any not in the ignore to the res variable
    let rest: null | string = null
    if (Object.keys(flags).length > 0) {
      const dismiss = new Set(['default', 'season'])
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

    const iOpts = {
      location: dwnDir,
      pid: args.pid,
      season: flags.season ?? false,
      subs: opts.subtitles === 'true',
      ...(rest && {
        rest,
      }),
    }
    if (flags.quiet) sp.start(`Downloading${opts.name ? ` ${opts.name}` : ''}`)

    await iplayerDl(iOpts)
      .then(() => {
        if (flags.quiet && !flags.verbose) sp.stop()

        outro(
          `All downloads completed! Thank you for using Downloadify. Completed downloading - ${color.underline(
            color.black(opts.name),
          )}`,
          'success',
        )
      })
      .catch((error) => {
        if (flags.quiet && !flags.verbose) sp.stop()

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
