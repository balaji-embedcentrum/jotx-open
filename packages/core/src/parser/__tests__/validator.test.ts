import { createValidator } from '../validator'
import { Parser } from '../v3/Parser'
import { registerStandardBlocks } from '@jotx-labs/standard-lib'

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  registerStandardBlocks()
})

const validate = (text: string) => createValidator().validate(new Parser().parse(text).document)

describe('Validator', () => {
  it('passes a valid document with classic blocks and widgets', () => {
    expect(validate(`hdef jotx T
  title "Ok"

  def heading h
    text "Hello"
    level 1

  def callout c
    variant success
    text "Done"

  def timeline t
    events """2026-01-01 | Start | done"""

  def matrix m
    dofirst """Fix the bug"""`)).toEqual([])
  })

  it('rejects invalid enum values', () => {
    const errors = validate(`hdef jotx T

  def callout c
    variant purple
    text "?"`)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({ type: 'invalid_enum', propertyName: 'variant', line: 3 })
  })

  it('flags unknown block types with their line', () => {
    const errors = validate(`hdef jotx T

  def notablock x
    text "?"`)
    expect(errors[0]).toMatchObject({ type: 'invalid_block_type', line: 3 })
  })

  it('reports missing required properties', () => {
    const errors = validate(`hdef jotx T

  def link l
    text "no url"`)
    expect(errors.some(e => e.type === 'missing_required' && e.propertyName === 'url')).toBe(true)
  })
})
