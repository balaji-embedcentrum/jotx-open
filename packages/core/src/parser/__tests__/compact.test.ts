import { Parser } from '../v3/Parser'
import { Serializer, detectSyntaxStyle } from '../serializer'
import { convertSyntax } from '../../index'
import { registerStandardBlocks } from '@jotx-labs/standard-lib'

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  registerStandardBlocks()
})

const parse = (text: string) => new Parser().parse(text).document
const compact = (text: string) => new Serializer().serialize(new Parser().parse(text), { style: 'compact' })
const classic = (text: string) => new Serializer().serialize(new Parser().parse(text), { style: 'classic' })
const doc = (body: string) => `hdef jotx T\n  title Test\n\n${body}\n`

describe('Compact syntax: reading', () => {
  it('puts the inline value into the block\'s primary property', () => {
    const [h, w] = parse(doc('  def heading "Goals"\n    level 2\n  def kanban "Sprint 12"')).blocks
    expect(h.properties).toMatchObject({ text: 'Goals', level: 2 })
    expect(w.properties.title).toBe('Sprint 12')
  })

  it('keeps an explicit id alongside an inline value', () => {
    const [t] = parse(doc('  def table risks "Risks"\n    rows """a | b"""')).blocks
    expect(t.id).toBe('risks')
    expect(t.properties.title).toBe('Risks')
  })

  it('expands list and checklist items', () => {
    const [list, tasks] = parse(doc('  def list\n    items """One\nTwo"""\n  def checklist\n    items """[x] Done\n[ ] Open"""')).blocks
    expect(list.children!.map(c => c.properties.text)).toEqual(['One', 'Two'])
    expect(tasks.children!.map(c => [c.type, c.properties.checked, c.properties.text])).toEqual([['taskitem', true, 'Done'], ['taskitem', false, 'Open']])
  })

  it('expands table rows, honouring escaped pipes and empty cells', () => {
    const [t] = parse(doc('  def table\n    columns A, B\n    rows """x \\| y | z\n | w"""')).blocks
    const cells = t.children!.map(r => r.children!.map(c => c.children![0]?.properties.text ?? ''))
    expect(cells).toEqual([['x | y', 'z'], ['', 'w']])
  })

  it('turns chart data lines into Chart.js JSON', () => {
    const [c] = parse(doc('  def chart "Weekly"\n    data """Label | Users\nW1 | 120\nW2 | 210"""')).blocks
    expect(JSON.parse(c.properties.json)).toEqual({ labels: ['W1', 'W2'], datasets: [{ label: 'Users', data: [120, 210] }] })
  })

  it('reads retired properties blocks as a Key | Value table', () => {
    const [t] = parse(doc('  def properties p\n    def property a\n      key "Owner"\n      value "Priya"\n      type text')).blocks
    expect(t.type).toBe('table')
    expect(t.properties.columns).toBe('Key, Value')
    expect(t.children![0].children!.map(c => c.children![0].properties.text)).toEqual(['Owner', 'Priya'])
  })
})

describe('Compact syntax: writing', () => {
  const source = doc([
    '  def heading h1',
    '    text "Atlas"',
    '    level 1',
    '  def callout c1',
    '    variant info',
    '    text "Bug #42 fixed"',
    '  def checklist t',
    '    def taskitem a',
    '      checked "true"',
    '      text "Ship"',
    '  def table risks',
    '    columns "Risk, Owner"',
    '    def row r',
    '      def cell c',
    '        def paragraph p',
    '          text "Data | loss"',
    '      def cell d',
    '        def paragraph q',
    '          text "Marco"'
  ].join('\n'))

  it('drops ids except on link targets, and drops defaults', () => {
    const out = compact(source)
    expect(out).toContain('def heading "Atlas"\n')
    expect(out).not.toContain('level 1')
    expect(out).not.toContain('variant info')
    expect(out).toContain('def table risks')
  })

  it('writes one line per item and per row, escaping pipes', () => {
    const out = compact(source)
    expect(out).toContain('items """[x] Ship"""')
    expect(out).toContain('rows """Data \\| loss | Marco"""')
  })

  it('never writes a line that starts with "-"', () => {
    const out = compact(doc('  def list\n    def listitem a\n      text "- not a bullet"'))
    expect(out.split('\n').some(l => l.trimStart().startsWith('-'))).toBe(false)
  })

  it('keeps quotes where a bare value would be misread', () => {
    const out = compact(doc('  def paragraph p\n    text "x"\n  def kanban k\n    title "Bug #42"'))
    expect(out).toContain('def kanban "Bug #42"')
  })
})

describe('Syntax conversion', () => {
  const classicDoc = doc('  def heading h1\n    text "Goals"\n    level 2\n  def list l\n    def listitem i\n      text "One"')

  it('round-trips classic → compact → classic with the same content', () => {
    const toCompact = convertSyntax(classicDoc, 'compact')
    expect(toCompact.ok).toBe(true)
    const back = convertSyntax(toCompact.text, 'classic')
    expect(back.ok).toBe(true)
    expect(detectSyntaxStyle(toCompact.text)).toBe('compact')
    expect(detectSyntaxStyle(back.text)).toBe('classic')
  })

  it('refuses a conversion that would lose content', () => {
    const broken = convertSyntax('hdef jotx T\n  def heading "unterminated\n', 'compact')
    expect(broken.ok).toBe(false)
  })

  it('reports no change when a file is already in the target style', () => {
    const once = convertSyntax(classicDoc, 'compact').text
    expect(convertSyntax(once, 'compact').changed).toBe(false)
    expect(classic(classicDoc)).toBe(convertSyntax(classicDoc, 'classic').text)
  })
})
