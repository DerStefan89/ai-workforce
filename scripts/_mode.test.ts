import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startScript } from './_mode.ts'

test('startScript() liefert false ohne --execute', () => {
  const originalArgv = process.argv
  process.argv = [...originalArgv.slice(0, 2)]

  try {
    assert.equal(startScript(), false)
  } finally {
    process.argv = originalArgv
  }
})
