// Lexer for chords separated by spaces or other separators

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

Rational = $((PositiveInteger ('/' PositiveInteger)?) / '0' / '-1')

DotJoinedRationals = Rational|.., '.'|

Prefix = (!WhiteSpace ![<|&:;,] !'[' SourceCharacter)*

MonzoLiteral
  = prefix: Prefix '[' _ components: VectorComponents _ '>' basis: ('@' @DotJoinedRationals)? {
    return text();
  }

ValLiteral
  = prefix: Prefix '<' _ components: VectorComponents _ ']' basis: ('@' @DotJoinedRationals)? {
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
