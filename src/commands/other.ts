import * as os from 'node:os'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { Args, Command, Flags } from '@oclif/core'
import * as p from '@clack/prompts'
import color from 'picocolors'
import {
  checkFileExists,
  checkDirExists,
  deleteOldCookies,
  fetchCookie,
  getPrimaryDomain,
  newDir,
  ytdl,
} from '../utils/helper'

export default class Other extends Command {
  static description = 'describe the command here'

  static examples = ['<%= config.bin %> <%= command.id %>']

  static flags = {
    all_subs: Flags.boolean({
      char: 'a',
      description: 'Download all available subtitles',
      required: false,
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'If you want to include debug information in the output',
      required: false,
    }),
    save: Flags.boolean({
      char: 's',
      description: 'Save your chosen options to a file for quicker downloading',
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
    const { args, flags } = await this.parse(Other)
    const sp = p.spinner()
    const date = new Date()
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    const formattedUrl = getPrimaryDomain(args.url)

    console.clear()
    p.intro(`${color.bgWhite(color.black(' Other '))}`)
    let otherOpts = null
    const optsExist = await checkFileExists('data/other.json')
    let hasSavedOpts: string | boolean = false

    // Check if there is a saved file of options. If there is then load file data to otherOpts
    if (optsExist) {
      hasSavedOpts = String(
        p.select({
          message:
            'A saved settings file was found. Would you like to load the settings?',
          initialValue: 'true',
          maxItems: 2,
          options: [
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ],
        }),
      )
    }
    if (hasSavedOpts === 'true') {
      fs.readFile('data/other.json', (err, data) => {
        if (err) {
          if (process.env.NODE_ENV === 'development') console.error(err)
          p.log.step(
            `  ${color.bgRed(
              color.black(
                'There was an error encountered while trying to read other.json. Please re-run Downloadify and try again',
              ),
            )}  `,
          )
          hasSavedOpts = false
        }
        if (data) otherOpts = JSON.parse(String(data))
      })
    }
    if (hasSavedOpts === 'false' || !hasSavedOpts) {
      otherOpts = await p.group(
        {
          dir: () =>
            p.text({
              message:
                'What directory would you like to use for your downloads?',
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
              // await setTimeout(500)
              await newDir(String(results.dir))
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
              maxItems: 3,
              options: [
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
                { value: 'skip', label: 'Skip' },
              ],
            }),
          username: async ({ results }) => {
            if (results.cookie === 'true' || results.cookie === 'skip') return
            return p.text({
              message: `Please enter your username for ${formattedUrl}?`,
              placeholder: 'User',
              validate: (value) => {
                if (!value) return 'Please enter a username'
              },
            })
          },
          password: async ({ results }) => {
            if (results.cookie === 'true' || results.cookie === 'skip') return
            return p.password({
              message: `Please enter your password for ${formattedUrl}?`,
              validate: (value) => {
                if (!value) return 'Please enter a password'
                if (value.length <= 10)
                  return 'Password must be more than 10 characters'
              },
            })
          },
          // login: async ({ results }) => {
          //   if (results.cookie === 'true' || results.cookie === 'skip') return
          //   return p.text({
          //     message: `Please enter the login URL for ${formattedUrl}?`,
          //     placeholder: 'https://test.com/login',
          //     validate: (value) => {
          //       if (!value) return 'Please enter a login url'
          //       if (Boolean(new URL(value)) === false)
          //         return 'Please enter a valid URL'
          //     },
          //   })
          // },
          hasCookie: async ({ results }) => {
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

            function extractDomainFromURL(url: string): string | null {
              try {
                const urlObject = new URL(url)
                return urlObject.hostname
              } catch (error) {
                // Handle invalid URLs or other errors here
                console.error('Invalid URL:', error)
                return null
              }
            }

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
            if (hasDownloadedCookie)
              fs.rename(downloadedCookie, downloadedCookie, (err) => {
                if (process.env.NODE_ENV === 'development') console.error(err)
              })
            sp.stop()

            const cookieCheck =
              (await checkFileExists(formattedCookieFile)) ||
              (await checkFileExists(downloadedCookie))

            return cookieCheck
          },
          includeSE: () =>
            p.select({
              message: 'Do you need to enter a season or episode?',
              initialValue: 'both',
              maxItems: 4,
              options: [
                { value: 'both', label: 'Both' },
                { value: 'season', label: 'Season' },
                { value: 'episode', label: 'Episode' },
                { value: 'skip', label: 'Skip' },
              ],
            }),
          seasonNum: ({ results }) => {
            if (
              String(results.includeSE) === 'episode' ||
              String(results.includeSE) === 'skip'
            )
              return
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
            if (
              String(results.includeSE) === 'season' ||
              String(results.includeSE) === 'skip'
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
            if (flags.all_subs) return
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
            return p.select({
              message:
                'Would you like to add any other params to the download?',
              initialValue: 'false',
              maxItems: 2,
              options: [
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ],
            })
          },
          moreOpts: ({ results }) => {
            if (results.more === 'false') return
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
    }

    // Create an outro for the cli
    const outro = (msg: string, type: 'abort' | 'error' | 'success') => {
      const colours: Record<
        'abort' | 'error' | 'success',
        (text: string) => string
      > = {
        abort: (text) => color.bgBlack(color.white(text)),
        error: (text) => color.bgRed(color.black(text)),
        success: (text) => color.bgWhite(color.black(text)),
      }
      const formattedText = colours[type](`  ${msg}  `)
      return p.outro(formattedText)
    }

    // Save options to file if save is passed
    if (flags.save) {
      const savedOptions = JSON.stringify(otherOpts)
      fs.writeFile('data/other.json', savedOptions, (error) => {
        if (process.env.NODE_ENV === 'development') console.error(error)
        p.log.step(
          `  ${color.bgRed(
            color.black(
              'There was an error encountered while trying to save. Please re-run Downloadify and try again',
            ),
          )}  `,
        )
      })
    }

    // If confirm is false
    if (!otherOpts?.confirm) {
      outro('Download aborted! Thank you for using Downloadify.', 'abort')
      process.exit(1)
    }

    // Ask where to download video
    const dirName = otherOpts.dir
    // Set download directory
    const dwnDir = path.join(os.homedir(), `Movies/${String(dirName)}`)

    // Add arguments to the rest param
    let rest: string | null = null
    if (Object.keys(flags).length > 0) {
      rest = Object.keys(flags)
        .map((key, i) => {
          if (key !== 'all_subs' && key !== 'save' && key !== 'default') {
            return `--${key}`
          }
        })
        .join(' ')
    }
    if (otherOpts.moreOpts && String(otherOpts.moreOpts).length > 0) {
      const flags = String(otherOpts.moreOpts)
        .split(' ')
        .map((flag) => (flag.startsWith('--') ? flag : `--${flag}`))
        .join(' ')
      rest += flags
    }

    // If no cookie file end the cli
    // Else run youtube-dl
    if (!otherOpts.hasCookie && otherOpts.cookie !== 'skip') {
      outro(
        `Unable to download. Please add a valid and up-to-date cookies file to the ${String(
          dirName,
        )} directory.`,
        'error',
      )
      process.exit(1)
    } else {
      let hasFailed = false

      const opts = {
        location: dwnDir,
        season: Number(otherOpts.seasonNum) ?? null,
        episode: Number(otherOpts.episodeNum) ?? null,
        ...(otherOpts.cookie !== 'skip' && {
          cookieFile: {
            path: path.join(
              os.homedir(),
              `Movies/${String(dirName)}/cookies/cookies-${formattedDate}.txt`,
            ),
            exists: otherOpts.cookie === 'true',
          },
        }),
        url: args.url,
        subs: flags.all_subs
          ? 'all'
          : otherOpts.subtitles === 'true'
          ? true
          : false,
        format: otherOpts.enFormat === 'true' ? true : false,
        ...(rest && {
          rest,
        }),
      }
      await ytdl(opts).catch((error) => {
        if (process.env.NODE_ENV === 'development') console.error(error)
        hasFailed = true
      })
      if (!hasFailed) {
        outro(
          'All downloads completed! Thank you for using Downloadify.',
          'success',
        )
      } else {
        outro('An error occurred. Unable to download.', 'error')
      }
    }
  }
}
