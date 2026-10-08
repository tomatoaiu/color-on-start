import type { On, PluginOptions } from 'claude-code'

const RANDOM = 'random'

export function register(on: On, options: PluginOptions): void {
  const color = String(options.color)
  const args = color === RANDOM ? '' : color

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    if (e.isInteractive) await $.command.run({ command: 'color', args })
    return result
  })
}
