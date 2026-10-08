import type { On, PluginOptions } from 'claude-code'

const RANDOM = 'random'
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
const NEW_SESSION_SOURCES: ReadonlySet<string> = new Set(['startup', 'clear'])

export function register(on: On, options: PluginOptions): void {
  const configured = String(options.color)
  const color = configured === RANDOM ? COLORS[Math.floor(Math.random() * COLORS.length)] : configured

  on('classic.SessionStart', async ($, e, next) => {
    if (NEW_SESSION_SOURCES.has(e.source) && (await $.session.surface()) !== null) {
      await $.command.run({ command: 'color', args: color })
    }
    return next(e)
  })
}
