// Lexer for chords separated by spaces or other separators
// TODO: Dont' return anything from the auxillary rules.

Start = _ @(MonzoLiteral / ValLiteral / Other)|.., Separator| _ EOF

Separator = _ [|&:;,]? _

SignPart
  = $([+-]?)

ExponentIndicator
  = 'e'i

ExponentPart
  = ExponentIndicator exponent: SignedBasicInteger { return exponent; }

BasicInteger
  = num: $('0' / ([1-9] DecimalDigit*)) { return parseInt(num, 10) }

PositiveBasicInteger
  = num: $([1-9] DecimalDigit*) { return parseInt(num, 10) }

SignedBasicInteger
  = num: $([+-]? ('0' / ([1-9] DecimalDigit*))) { return parseInt(num, 10) }

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

Other = (!WhiteSpace ![|&:;,] SourceCharacter)+ {
  return text();
}

_ 'whitespace' = WhiteSpace*

WhiteSpace
  = '\t'
  / '\v'
  / '\f'
  / ' '
  / '\u00A0'
  / '\uFEFF'
  / Zs

// Separator, Space
Zs = c:SourceCharacter &{ return /\p{Zs}/u.test(c); }

SourceCharacter 'any character'
  = SourceCharacterLow
  / SourceCharacterHigh

// Not surrogates
SourceCharacterLow
  = [\u0000-\uD7FF\uE000-\uFFFF]

// Can be properly-matched surrogates or lone surrogates.
SourceCharacterHigh
  = $([\uD800-\uDBFF][\uDC00-\uDFFF]) // Surrogate pair
  / [\uD800-\uDBFF] // Lone first surrogate
  / [\uDC00-\uDFFF] // Lone second surrogate

DecimalDigit
  = [0-9]

UnderscoreDigits
  = num: $([_0-9]*) { return num.replace(/_/g, ''); }

EOF
  = !.
