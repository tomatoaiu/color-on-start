import assert from 'node:assert/strict'
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

test('a startup with random runs /color without arguments, then hands the event on', async () => {
  const hook = harness({ color: 'random' })
  const event = { hook_event_name: 'SessionStart', source: 'startup' }
  assert.equal(await hook.start(event), 'next-result')
  assert.deepEqual(hook.calls, [
    ['run', { command: 'color', args: '' }],
    ['next', event],
  ])
})

test('a /clear colors the new session with the named color', async () => {
  const hook = harness({ color: 'blue' })
  await hook.start({ hook_event_name: 'SessionStart', source: 'clear' })
  assert.deepEqual(hook.calls[0], ['run', { command: 'color', args: 'blue' }])
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
