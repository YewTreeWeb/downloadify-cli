import * as os from 'node:os'
import * as path from 'node:path'
import { Args, Command, Flags } from '@oclif/core'
import * as p from '@clack/prompts'
import color from 'picocolors'
import {
  checkCookiesExists,
  checkDirExists,
  deleteOldCookies,
  fetchCookie,
  getPrimaryDomain,
  iplayerDl,
} from '../utils/helper'
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
    url: Args.string({
      description: 'The URl of the videos you want to download',
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Iplayer)
    const baseUrl = 'https://www.bbc.co.uk/iplayer/'
    const sp = p.spinner()
    const date = new Date()
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`

    console.clear()
    p.intro(`${color.bgMagenta(color.black(' iPlayer '))}`)
  }
}
