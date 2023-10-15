import * as os from 'node:os'
import * as path from 'node:path'
import { Args, Command } from '@oclif/core'
import * as p from '@clack/prompts'
import color from 'picocolors'
import {
  checkCookiesExists,
  checkDirExists,
  deleteOldCookies,
  fetchCookie,
  getPrimaryDomain,
  ytdl,
} from '../utils/helper'
import shelljs from 'shelljs'
import { setTimeout } from 'node:timers/promises'

export default class Other extends Command {
  static description = 'describe the command here'

  static examples = ['<%= config.bin %> <%= command.id %>']

  static flags = {}

  static args = {
    url: Args.string({
      description: 'The URl of the videos you want to download',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { args } = await this.parse(Other)
    const sp = p.spinner()
    const date = new Date()
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    const formattedUrl = getPrimaryDomain(args.url)

    console.clear()
    p.intro(`${color.bgWhite(color.black(' Other '))}`)
    const otherOpts = await p.group(
      {
        dir: () =>
          p.text({
            message: 'What directory would you like to use for your downloads?',
            placeholder: 'Videos',
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

            sp.start(`Now creating ${String(results.dir)}\n`)
            await setTimeout(500)
            shelljs.mkdir(`~/Movies/${String(results.dir)}`)
            shelljs.mkdir(`~/Movies/${String(results.dir)}/cookies`)
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
            message: 'Have you already downloaded a cookie file?',
            initialValue: 'true',
            maxItems: 2,
            options: [
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ],
          }),
        username: async ({ results }) => {
          if (results.cookie === 'true') return
          return p.text({
            message: `Please enter your username for ${formattedUrl}?`,
            placeholder: 'User',
            validate: (value) => {
              if (!value) return 'Please enter a username'
            },
          })
        },
        password: async ({ results }) => {
          if (results.cookie === 'true') return
          return p.password({
            message: `Please enter your password for ${formattedUrl}?`,
            validate: (value) => {
              const regex =
                /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/
              if (!value) return 'Please enter a password'
              if (value.length <= 10)
                return 'Password must be more than 10 characters'
              if (!regex.test(value))
                return 'Password must contain at lease 1 uppercase, 1 special character, 1 number and 1 letter.'
            },
          })
        },
        login: async ({ results }) => {
          if (results.cookie === 'true') return
          return p.text({
            message: `Please enter the login URL for ${formattedUrl}?`,
            placeholder: 'https://test.com/login',
            validate: (value) => {
              if (!value) return 'Please enter a login url'
              if (Boolean(new URL(value)) === false)
                return 'Please enter a valid URL'
            },
          })
        },
        hasCookie: async ({ results }) => {
          let cookie = false
          const cookieDir = path.join(
            os.homedir(),
            `Movies/${String(results.dir)}/cookies`,
          )
          const downloadedCookie = path.join(
            os.homedir(),
            `Downloads/${formattedUrl}_cookies.txt`,
          )
          const formattedCookieFile = `${cookieDir}/cookies-${formattedDate}.txt`
          // Remove outdated cookies
          deleteOldCookies(cookieDir, String(results.dir))

          // Fetch cookie if previous answer was no
          // if yes move cookie and rename
          if (results.cookie === 'false') {
            const cookieOps = {
              url: String(results.login),
              user: {
                name: String(results.username),
                el: '#Email',
              },
              pass: {
                word: String(results.password),
                el: '#Password',
              },
              cookieDir,
              button: '#signInButton',
              selector: '#hdLogo',
            }
            sp.start('fetching cookie')
            await fetchCookie(cookieOps)
            sp.stop()
          } else {
            const hasDownloadedCookie =
              await checkCookiesExists(downloadedCookie)
            if (hasDownloadedCookie)
              shelljs.mv(downloadedCookie, formattedCookieFile)
          }

          const cookieCheck = await checkCookiesExists(formattedCookieFile)
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
        seasonNum: ({ results }) => {
          if (!results.hasCookie) return
          return p.text({
            message: 'What is the number of the season you want to download?',
            initialValue: '1',
            validate: (value) => {
              const regex = /^[1-9]\d*$/
              if (!regex.test(value))
                return 'Season number must be a positive number'
            },
          })
        },
        episodeNum: ({ results }) => {
          if (!results.hasCookie) return
          return p.text({
            message: 'Enter the episode number you want to download',
            validate: (value) => {
              const regex = /^[1-9]\d*$/
              if (!regex.test(value))
                return 'Episode number must be a positive number'
            },
          })
        },
        other: ({ results }) => {
          if (!results.hasCookie) return
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
          if (!results.hasCookie || results.other === 'false') return
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
    // If confirm is false
    if (!otherOpts.confirm) {
      p.outro(
        `${color.bgWhite(
          color.black('  Download aborted! Thank you for using Downloadify.  '),
        )}`,
      )
      process.exit(1)
    }

    // Ask where to download video
    const dirName = otherOpts.dir
    // Set download directory
    const dwnDir = path.join(os.homedir(), `Movies/${String(dirName)}`)

    // If no cookie file end the cli
    // Else run youtube-dl
    if (!otherOpts.cookie) {
      p.outro(
        `${color.bgWhite(
          color.black(
            `  Unable to download. Please add a valid and up-to-date cookies file to the ${String(
              dirName,
            )} directory.  `,
          ),
        )}`,
      )
      process.exit(1)
    } else {
      // Split the URL to get the name of the download
      const splitUrl = args.url.split('stream/')
      const splitLast = splitUrl[1].split('/')
      const name = splitLast[0]

      let hasFailed = false

      const opts = {
        location: dwnDir,
        season: Number(otherOpts.seasonNum) ?? 1,
        episode: Number(otherOpts.episodeNum) ?? 1,
        cookieFile: path.join(
          os.homedir(),
          `Movies/${String(dirName)}/cookies/cookies-${formattedDate}.txt`,
        ),
        url: args.url,
        subs: true,
      }
      await ytdl(opts).catch((error) => {
        if (process.env.NODE_ENV === 'development') console.error(error)
        hasFailed = true
      })
      if (!hasFailed) {
        p.outro(
          `${color.bgWhite(
            color.black(
              `  All downloads completed! Thank you for using Downloadify. Completed download - ${color.underline(
                color.black(name),
              )}  `,
            ),
          )}`,
        )
      } else {
        p.outro(
          `${color.bgRed(
            color.black(
              `  An error occurred. Unable to download - ${color.underline(
                color.white(name),
              )}  `,
            ),
          )}`,
        )
      }
    }
  }
}
