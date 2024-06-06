import * as p from '@clack/prompts'
import color from 'picocolors'

// Create an outro for the cli
const outro = (msg: string, type: 'abort' | 'error' | 'success') => {
  const colours: Record<'abort' | 'error' | 'success', (text: string) => string> = {
    abort: (text) => color.bgMagenta(color.black(text)),
    error: (text) => color.bgRed(color.black(text)),
    success: (text) => color.bgMagenta(color.black(text)),
  }
  const formattedText = colours[type](`  ${msg}  `)
  return p.outro(formattedText)
}

export default outro
