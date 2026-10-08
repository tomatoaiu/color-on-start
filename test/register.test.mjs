import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { register } from '../hooks/register.ts'

const STARTUP = { hook_event_name: 'SessionStart', source: 'startup' }
const CLEAR = { hook_event_name: 'SessionStart', source: 'clear' }

function harness(options) {
  const handlers = {}
  const calls = []
  register((event, callback) => {
    assert.equal(handlers[event], undefined)
    handlers[event] = callback
  }, options)
  assert.deepEqual(Object.keys(handlers).sort(), ['classic.SessionStart', 'session.start'])

  const engine = {
    command: { run: async request => { calls.push(['run', request]); return {} } },
  }
  const dispatch = (name, event) => handlers[name](engine, event, async nextEvent => {
    calls.push(['next', name, nextEvent])
    return 'next-result'
  })

  return {
    calls,
    runs: () => calls.filter(([kind]) => kind === 'run').map(([, request]) => request),
    classic: event => dispatch('classic.SessionStart', event),
    sessionStart: isInteractive => dispatch('session.start', { cwd: '/repo', surface: isInteractive ? 'terminal' : null, isInteractive }),
  }
}

test('a startup that fires before session.start waits, then runs /color once', async () => {
  const hook = harness({ color: 'blue' })
  assert.equal(await hook.classic(STARTUP), 'next-result')
  assert.deepEqual(hook.runs(), [])

  assert.equal(await hook.sessionStart(true), 'next-result')
  assert.deepEqual(hook.calls.map(([kind]) => kind), ['next', 'next', 'run'])
  assert.deepEqual(hook.runs(), [{ command: 'color', args: 'blue' }])
})

test('a startup that fires before a non-interactive session.start runs no command', async () => {
  const hook = harness({ color: 'blue' })
  await hook.classic(STARTUP)
  await hook.sessionStart(false)
  await hook.classic(CLEAR)
  assert.deepEqual(hook.runs(), [])
})

test('a startup that fires after session.start runs /color once, from classic.SessionStart', async () => {
  const hook = harness({ color: 'blue' })
  await hook.sessionStart(true)
  assert.deepEqual(hook.runs(), [])

  assert.equal(await hook.classic(STARTUP), 'next-result')
  assert.deepEqual(hook.runs(), [{ command: 'color', args: 'blue' }])
})

test('a startup that never learns the session is interactive runs no command', async () => {
  const hook = harness({ color: 'blue' })
  await hook.classic(STARTUP)
  assert.deepEqual(hook.runs(), [])
})

test('a /clear after startup colors the new session again', async () => {
  const hook = harness({ color: 'blue' })
  await hook.classic(STARTUP)
  await hook.sessionStart(true)
  await hook.classic(CLEAR)
  assert.deepEqual(hook.runs(), [
    { command: 'color', args: 'blue' },
    { command: 'color', args: 'blue' },
  ])
})

for (const source of ['resume', 'fork', 'compact']) {
  for (const order of ['before', 'after']) {
    test(`a session that continues keeps its color: ${source} ${order} session.start`, async () => {
      const hook = harness({ color: 'blue' })
      const event = { hook_event_name: 'SessionStart', source }
      if (order === 'after') await hook.sessionStart(true)
      assert.equal(await hook.classic(event), 'next-result')
      if (order === 'before') await hook.sessionStart(true)
      assert.deepEqual(hook.runs(), [])
    })
  }
}

test('a failing /color leaves both hooks working', async () => {
  const failing = {
    command: { run: async () => { throw new Error('no command named /color') } },
  }
  const handlers = {}
  register((event, callback) => { handlers[event] = callback }, { color: 'blue' })
  const next = async () => 'next-result'
  assert.equal(await handlers['classic.SessionStart'](failing, STARTUP, next), 'next-result')
  assert.equal(await handlers['session.start'](failing, { isInteractive: true }, next), 'next-result')
  assert.equal(await handlers['classic.SessionStart'](failing, CLEAR, next), 'next-result')
})

test('random picks one color when the mod loads and reuses it after /clear', async t => {
  const random = t.mock.method(Math, 'random', () => 0.3)
  const hook = harness({ color: 'random' })
  random.mock.mockImplementation(() => 0.9)

  await hook.classic(STARTUP)
  await hook.sessionStart(true)
  await hook.classic(CLEAR)
  assert.deepEqual(hook.runs(), [
    { command: 'color', args: 'green' },
    { command: 'color', args: 'green' },
  ])
})

test('random picks from exactly the colors the manifest offers', async t => {
  const plugin = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8'))
  const offered = plugin.userConfig.color.options.filter(option => option !== 'random')
  const random = t.mock.method(Math, 'random')
  const picked = []
  for (let i = 0; i < offered.length; i++) {
    random.mock.mockImplementation(() => (i + 0.5) / offered.length)
    const hook = harness({ color: 'random' })
    await hook.sessionStart(true)
    await hook.classic(STARTUP)
    picked.push(hook.runs()[0].args)
  }
  assert.deepEqual(picked, offered)
})
