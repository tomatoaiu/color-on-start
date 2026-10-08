import type { On, PluginOptions } from 'claude-code'

const RANDOM = 'random'
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
const NEW_SESSION_SOURCES: ReadonlySet<string> = new Set(['startup', 'clear'])

export function register(on: On, options: PluginOptions): void {
  const configured = String(options.color)
  const color = configured === RANDOM ? COLORS[Math.floor(Math.random() * COLORS.length)] : configured

  // 起動時の classic.SessionStart は、session.start より先に発火することがある。
  // 対話セッションかどうかは session.start で確定するので、それまで /color の実行を持ち越す。
  let isInteractive: boolean | undefined
  let isPending = false

  on('classic.SessionStart', ($, e, next) => {
    if (NEW_SESSION_SOURCES.has(e.source)) {
      if (isInteractive === undefined) isPending = true
      else if (isInteractive) void $.command.run({ command: 'color', args: color }).catch(() => {})
    }
    return next(e)
  })

  on('session.start', async ($, e, next) => {
    isInteractive = e.isInteractive
    const result = await next(e)
    if (isInteractive && isPending) void $.command.run({ command: 'color', args: color }).catch(() => {})
    isPending = false
    return result
  })
}
