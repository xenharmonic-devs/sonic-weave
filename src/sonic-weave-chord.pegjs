// Lexer for chords separated by spaces or other separators
// TODO: Use lightweight aux rules that don't return anything.

// Depends on base.pegjs

Start = _ @(MonzoLiteral / ValLiteral / FunctionCall / ParenthesizedExpression / ArrayExpression / Other)|.., Separator| _ EOF

Separator = _ [|&:;,]? _

VectorComponent
  = sign: SignPart left: BasicInteger separator: '/' right: $(PositiveBasicInteger) {
    return {sign, left, separator, right, exponent: null};
  }
  / sign: SignPart left: BasicInteger separator: '.' right: UnderscoreDigits exponent: ExponentPart? {
    return {sign, left, separator, right, exponent};
  }
  / sign: SignPart left: BasicInteger exponent: ExponentPart? {
    return {sign, left, separator: '', right: '', exponent};
  }

VectorComponents
  = VectorComponent|.., _ ','? _|

Prefix = (!WhiteSpace ![v<|&:;,] !'[' SourceCharacter)*

MonzoLiteral
  = prefix: Prefix downs: 'v'* '[' _ components: VectorComponents _ '>' {
    return text();
  }

ValLiteral
  = prefix: Prefix downs: 'v'* '<' _ components: VectorComponents _ ']' {
    return text();
  }

FunctionCall
  = IdentifierName '(' (!')' SourceCharacter)* ')' {
    return text();
  }

ParenthesizedExpression
  = '(' (!')' SourceCharacter)* ')' {
    return text();
  }

ArrayExpression
  = '[' (!']' SourceCharacter)* ']' {
    return text();
  }

Other = (!WhiteSpace ![|&:;,] SourceCharacter)+ {
  return text();
}
