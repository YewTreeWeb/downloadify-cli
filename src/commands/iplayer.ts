import * as os from 'node:os'
import * as path from 'node:path'
import { Args, Command, Flags } from '@oclif/core'
import * as p from '@clack/prompts'
import color from 'picocolors'
import { checkDirExists } from '../utils/helper'
import shelljs from 'shelljs'
import { setTimeout } from 'node:timers/promises'

export default class Iplayer extends Command {
  static description = 'describe the command here'

  static examples = ['<%= config.bin %> <%= command.id %>']

  static flags = {
    season: Flags.boolean({
      char: 's',
      description: 'Would you like to download the entire season',
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
          if (!dirExists) {
            p.log.step(
              `${color.bgRed(
                color.white(`  Directory get_iplayer does not exist  `),
              )}`,
            )

            sp.start(`Now creating get_iplayer\n`)
            await setTimeout(500)
            shelljs.mkdir(`~/Movies/get_iplayer`)
            sp.stop()

            dirCreated = !dirCreated
            p.log.step(
              `${color.bgGreen(
                color.black(` Successfully created get_iplayer `),
              )}`,
            )
          } else {
            dirCreated = !dirCreated
            p.log.step(
              `${color.bgGreen(color.black(` Found directory get_iplayer `))}`,
            )
          }
          return dirCreated
        },
        name: () => {
          return p.text({
            message: 'What is the name of the season or episode?',
            validate: (value) => {
              if (!value) return 'Please enter a name'
            },
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
        params: ({ results }) => {
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
    // If confirm is false
    if (!iplayerOpts.confirm) {
      p.outro(
        `${color.bgMagenta(
          color.black('  Download aborted! Thank you for using Downloadify.  '),
        )}`,
      )
      process.exit(1)
    }
    // Set download directory
    const dwnDir = path.join(os.homedir(), `Movies/get_iplayer`)

    let hasFailed = false

    try {
      const isSeason = flags.season ? '--pid-recursive' : ''

      shelljs.exec(
        `get_iplayer --pid=${args.pid} ${isSeason} --tv-quality=fhd --subtitles --output="${dwnDir}" --subdir --subdir-format="<nameshort>/Season<seriesnum>" --file-prefix="<nameshort>-S<seriesnum>E<episodenum>-<episodeshort>" ${iplayerOpts.params}`,
        (err) => {
          if (process.env.NODE_ENV === 'development') console.error(err)
          hasFailed = !hasFailed
        },
      )
      if (hasFailed) {
        p.outro(
          `${color.bgRed(
            color.black(
              `  An error occurred. Unable to download - ${color.underline(
                color.white(iplayerOpts.name),
              )}  `,
            ),
          )}`,
        )
      } else {
        p.outro(
          `${color.bgMagenta(
            color.black(
              `  All downloads completed! Thank you for using Downloadify. Completed download - ${color.underline(
                color.black(iplayerOpts.name),
              )}  `,
            ),
          )}`,
        )
      }
    } catch (error) {
      p.outro(
        `${color.bgRed(
          color.black(
            `  An error occurred. Unable to download - ${color.underline(
              color.white(iplayerOpts.name),
            )}  `,
          ),
        )}`,
      )
      if (process.env.NODE_ENV === 'development') console.error(error)
    }
  }
}
