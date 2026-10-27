import { Parser } from '../v3/Parser'
import { Serializer } from '../serializer'
import { registerStandardBlocks } from '@jotx-labs/standard-lib'

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  registerStandardBlocks()
})

const roundTrip = (text: string) => new Serializer().serialize(new Parser().parse(text))

describe('Serializer', () => {
  const source = `hdef jotx Showcase

  title "Showcase"

  def heading h1
    text "Bug #42"
    level 1

  def callout c1
    variant info
    text "Plain **text**"

  def palette pal
    colors """Teal | #14b8a6
Ink | #0f172a"""

  def columns cols
    def column a
      def paragraph p
        text "A"
    def column b
      def paragraph q
        text "B"
`

  it('leaves enum values unquoted and strings quoted', () => {
    const out = roundTrip(source)
    expect(out).toContain('    variant info\n')
    expect(out).toContain('    text "Bug #42"\n')
  })

  it('writes multi-line values with triple quotes', () => {
    expect(roundTrip(source)).toContain('colors """Teal | #14b8a6\nInk | #0f172a"""')
  })

  it('is stable across repeated round trips', () => {
    const once = roundTrip(source)
    expect(roundTrip(once)).toBe(once)
  })

  it('escalates the delimiter when content contains triple quotes', () => {
    const out = roundTrip(`hdef jotx T

  def code c
    language "plaintext"
    text """"line one
board """x"""
""""
`)
    expect(out).toMatch(/text """"[\s\S]*board """x"""[\s\S]*""""/)
    expect(roundTrip(out)).toBe(out)
  })
})
