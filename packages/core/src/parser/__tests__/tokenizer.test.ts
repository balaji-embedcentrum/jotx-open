import { Tokenizer, TokenType } from '../tokenizer.new'

describe('Tokenizer', () => {
  const tokenize = (input: string) => new Tokenizer().tokenize(input)

  it('tokenizes a header, a block and its properties', () => {
    const tokens = tokenize(`hdef jotx Note
  title "Hello"

  def heading h1
    text "Welcome"
    level 1`)

    expect(tokens[0]).toMatchObject({ type: TokenType.HEADER_DEF, params: ['jotx', 'Note'] })
    expect(tokens.find(t => t.type === TokenType.BLOCK_START)).toMatchObject({ params: ['heading', 'h1'] })
    const props = tokens.filter(t => t.type === TokenType.PROPERTY).map(t => [t.value, t.params![0]])
    expect(props).toEqual([['title', 'Hello'], ['text', 'Welcome'], ['level', '1']])
  })

  it('keeps multi-line content verbatim, including indentation', () => {
    const tokens = tokenize(`def filetree t
  tree """src/
  index.ts
    nested.ts"""`)

    const content = tokens.filter(t => t.type === TokenType.TEXT_CONTENT).map(t => t.value)
    expect(content).toEqual(['src/', '  index.ts', '    nested.ts'])
    expect(tokens.some(t => t.type === TokenType.TEXT_END)).toBe(true)
  })

  it('does not treat # inside a quoted value as a comment', () => {
    const tokens = tokenize(`def heading h
  text "Bug #42 fixed"`)
    expect(tokens.find(t => t.value === 'text')!.params![0]).toBe('Bug #42 fixed')
  })

  it('still strips trailing comments from unquoted values', () => {
    const tokens = tokenize(`def heading h
  level 2 # section level`)
    expect(tokens.find(t => t.value === 'level')!.params![0]).toBe('2')
  })

  it('reports the line of a syntax error', () => {
    expect(() => tokenize(`def heading h
  ??? broken`)).toThrow(/^Line 2:/)
  })
})
