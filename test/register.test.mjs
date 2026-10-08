import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from '../hooks/register.ts'

function harness(options) {
  let handler
  const calls = []
  register((event, callback) => {
    assert.equal(event, 'session.start')
    assert.equal(handler, undefined)
    handler = callback
  }, options)

  return {
    calls,
    start(event) {
      return handler({
        command: { run: async request => { calls.push(['run', request]); return {} } },
      }, event, async nextEvent => {
        calls.push(['next', nextEvent])
        return 'next-result'
      })
    },
  }
}

test('random runs /color without arguments, after the rest of session.start', async () => {
  const hook = harness({ color: 'random' })
  const event = { cwd: '/repo', surface: 'terminal', isInteractive: true }
  assert.equal(await hook.start(event), 'next-result')
  assert.deepEqual(hook.calls, [
    ['next', event],
    ['run', { command: 'color', args: '' }],
  ])
})

test('a named color is passed to /color as its argument', async () => {
  const hook = harness({ color: 'blue' })
  await hook.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  assert.deepEqual(hook.calls[1], ['run', { command: 'color', args: 'blue' }])
})

test('a non-interactive session runs no command', async () => {
  const hook = harness({ color: 'blue' })
  const event = { cwd: '/repo', surface: null, isInteractive: false }
  assert.equal(await hook.start(event), 'next-result')
  assert.deepEqual(hook.calls, [['next', event]])
})
