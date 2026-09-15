import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const packageRoot = resolve(import.meta.dirname, '..')
const sha256 = (relativePath: string): string =>
  createHash('sha256')
    .update(readFileSync(resolve(packageRoot, relativePath)))
    .digest('hex')

describe('Notebook network sandbox resources', () => {
  it.each([
    [
      'vendor/windows/x64/notebook-appcontainer-host.exe',
      '6e52256f1a6fc8908d37d55070e0f3918b82437f0eb1d445c51360278d201d5f'
    ],
    [
      'vendor/windows/arm64/notebook-appcontainer-host.exe',
      'dfc5752fb2144304ff08b90bd0b038e68d5742409a0c23b5076806783630d2a9'
    ]
  ])('verifies %s', (relativePath, expectedHash) => {
    expect(sha256(relativePath)).toBe(expectedHash)
  })
})
