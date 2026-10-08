import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const readJson = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
const plugin = readJson('.claude-plugin/plugin.json')
const pkg = readJson('package.json')

test('plugin and development package share a stable SemVer', () => {
  assert.match(plugin.version, /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/)
  assert.equal(pkg.version, plugin.version)
  assert.equal(pkg.name, plugin.name)
  assert.equal(pkg.private, true)
})

test('the function hook module exists and the color defaults to one of its options', () => {
  const hooks = readJson('hooks/hooks.json')
  assert.deepEqual(hooks.modules, ['./register.ts'])
  assert.ok(readFileSync(new URL('../hooks/register.ts', import.meta.url), 'utf8').length > 0)
  assert.equal(plugin.userConfig.color.type, 'string')
  assert.ok(plugin.userConfig.color.options.includes(plugin.userConfig.color.default))
})
