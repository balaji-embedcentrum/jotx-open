import { Parser } from '../v3/Parser'
import { registerStandardBlocks } from '@jotx-labs/standard-lib'

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  registerStandardBlocks()
})

describe('Parser', () => {
  const parse = (input: string) => new Parser().parse(input).document

  it('parses document header and metadata', () => {
    const doc = parse(`hdef jotx Plan
  title "Release plan"
  type roadmap`)
    expect(doc).toMatchObject({ id: 'Plan', type: 'jotx', metadata: { title: 'Release plan', type: 'roadmap' } })
  })

  it('builds nested children from indentation', () => {
    const doc = parse(`hdef jotx T

  def columns cols
    def column left
      def paragraph p1
        text "Left"
    def column right
      width "2"
      def paragraph p2
        text "Right"`)

    const cols = doc.blocks[0]
    expect(cols.type).toBe('columns')
    expect(cols.children!.map(c => c.id)).toEqual(['left', 'right'])
    expect(cols.children![1].properties.width).toBe('2')
    expect(cols.children![1].children![0].properties.text).toBe('Right')
  })

  it('parses widget properties including multi-line list data', () => {
    const doc = parse(`hdef jotx T

  def kanban board
    title "Sprint"
    board """[Todo]
- Write docs
[Done]
- Ship"""`)

    expect(doc.blocks[0]).toMatchObject({
      type: 'kanban',
      properties: { title: 'Sprint', board: '[Todo]\n- Write docs\n[Done]\n- Ship' }
    })
  })

  it('maps unregistered keywords to custom', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(parse(`hdef jotx T

  def notablock x
    text "?"`).blocks[0].type).toBe('custom')
  })
})
