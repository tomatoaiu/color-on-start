import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { register } from '../hooks/register.ts'

function harness(options, { surface = 'terminal' } = {}) {
  let handler
  const calls = []
  register((event, callback) => {
    assert.equal(event, 'classic.SessionStart')
    assert.equal(handler, undefined)
    handler = callback
  }, options)

  return {
    calls,
    start(event) {
      return handler({
        session: { surface: async () => surface },
        command: { run: async request => { calls.push(['run', request]); return {} } },
      }, event, async nextEvent => {
        calls.push(['next', nextEvent])
        return 'next-result'
      })
    },
  }
}

test('a startup runs /color with the named color, then hands the event on', async () => {
  const hook = harness({ color: 'blue' })
  const event = { hook_event_name: 'SessionStart', source: 'startup' }
  assert.equal(await hook.start(event), 'next-result')
  assert.deepEqual(hook.calls, [
    ['run', { command: 'color', args: 'blue' }],
    ['next', event],
  ])
})

test('random picks one color when the mod loads and reuses it after /clear', async t => {
  const random = t.mock.method(Math, 'random', () => 0.3)
  const hook = harness({ color: 'random' })
  random.mock.mockImplementation(() => 0.9)

  await hook.start({ hook_event_name: 'SessionStart', source: 'startup' })
  await hook.start({ hook_event_name: 'SessionStart', source: 'clear' })
  assert.deepEqual(
    hook.calls.filter(([kind]) => kind === 'run'),
    [
      ['run', { command: 'color', args: 'green' }],
      ['run', { command: 'color', args: 'green' }],
    ],
  )
})

test('random picks from exactly the colors the manifest offers', async t => {
  const plugin = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8'))
  const offered = plugin.userConfig.color.options.filter(option => option !== 'random')
  const random = t.mock.method(Math, 'random')
  const picked = []
  for (let i = 0; i < offered.length; i++) {
    random.mock.mockImplementation(() => (i + 0.5) / offered.length)
    const hook = harness({ color: 'random' })
    await hook.start({ hook_event_name: 'SessionStart', source: 'startup' })
    picked.push(hook.calls[0][1].args)
  }
  assert.deepEqual(picked, offered)
})

for (const source of ['resume', 'fork', 'compact']) {
  test(`a session that continues keeps its color: ${source}`, async () => {
    const hook = harness({ color: 'blue' })
    const event = { hook_event_name: 'SessionStart', source }
    assert.equal(await hook.start(event), 'next-result')
    assert.deepEqual(hook.calls, [['next', event]])
  })
}

test('a non-interactive session runs no command', async () => {
  const hook = harness({ color: 'blue' }, { surface: null })
  const event = { hook_event_name: 'SessionStart', source: 'startup' }
  assert.equal(await hook.start(event), 'next-result')
  assert.deepEqual(hook.calls, [['next', event]])
})
