import type { On, PluginOptions } from 'claude-code'

const RANDOM = 'random'
const NEW_SESSION_SOURCES: ReadonlySet<string> = new Set(['startup', 'clear'])

export function register(on: On, options: PluginOptions): void {
  const color = String(options.color)
  const args = color === RANDOM ? '' : color

  on('classic.SessionStart', async ($, e, next) => {
    if (NEW_SESSION_SOURCES.has(e.source) && (await $.session.surface()) !== null) {
      await $.command.run({ command: 'color', args })
    }
    return next(e)
  })
}
