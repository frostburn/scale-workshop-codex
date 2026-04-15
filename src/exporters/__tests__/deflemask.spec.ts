import { describe, it, expect } from 'vitest'

import DeflemaskExporter from '../deflemask'

// @ts-expect-error -- test fixture module import has no typings
import EXPECTED_CONTENT from './deflemask.txt?raw'
import { getTestData } from './test-data'

describe('Deflemask exporter', () => {
  it('can handle all line types', () => {
    const params = getTestData('Deflemask exporter unit test v0.0.0')
    const exporter = new DeflemaskExporter(params)
    expect(exporter.getFileContents()).toBe(EXPECTED_CONTENT)
  })
})
