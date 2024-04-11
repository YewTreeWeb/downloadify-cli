import dayjs from 'dayjs'
import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

// Always get the primary domain from a URL
export const getPrimaryDomain = (url: string) => {
  // Remove the protocol (http://, https://) if present
  url = url.replace(/(^\w+:|^)\/\//, '')
  // Split the URL by '/' to get the parts
  const parts = url.split('/')
  // The primary domain is the first part of the split URL
  const primaryDomain = parts[0]
  // Reconstruct the URL with the protocol and primary domain
  return `https://${primaryDomain}`
}

type IPlayerProps = {
  location: string
  pid: string
  season?: boolean
  subs?: string | boolean
  rest?: string
}
export const iplayerDl = async ({
  location,
  pid,
  season,
  subs = false,
  rest,
}: IPlayerProps) => {
  const iPlayerProcess = spawn(
    'get_iplayer',
    [
      '--pid',
      pid,
      ...(season ? ['--pid-recursive'] : []),
      '--tv-quality=fhd',
      ...(subs ? ['--subtitles'] : []),
      '--output',
      location,
      '--subdir',
      '--subdir-format',
      '<nameshort>/Season<seriesnum>',
      '--file-prefix',
      '<nameshort>-S<seriesnum>E<episodenum>-<episodeshort>',
      // Add additional arguments
      ...(rest ? [rest] : []),
    ],
    { stdio: 'inherit' },
  )

  if (process.env.NODE_ENV === 'development') console.info(iPlayerProcess)

  await new Promise<void>((resolve, reject) => {
    iPlayerProcess.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`get_iplayer exited with code ${code}`))
      }
    })
  })
}
