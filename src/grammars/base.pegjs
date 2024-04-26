{{
  const ZS_RE = /\p{Zs}/u;
  const ID_START_RE = /\p{ID_Start}/u;
  const ID_CONTINUE_RE = /\p{ID_Continue}/u;
}}

UnderscoreDigits
  = num: $([_0-9]*) {
  if (num.endsWith('_')) {
    error('Numeric separators are not allowed at the end of numeric literals.');
  }
  return num.replace(/_/g, '');
}

NonEmptyUnderscoreDigits
  = num: $([0-9] [_0-9]*) {
  if (num.endsWith('_')) {
    error('Numeric separators are not allowed at the end of numeric literals.');
  }
  return num.replace(/_/g, '');
}

PositiveInteger
  = num:([1-9] UnderscoreDigits) { return BigInt(num.join('')); }

Integer
  = '0' { return 0n; }
  / PositiveInteger

SignPart
  = $([+-]?)

SignedInteger
  = num: ([+-]? ('0' / ([1-9] UnderscoreDigits))) { return BigInt(num.flat().join('')); }

ExponentIndicator
  = 'e'i

ExponentPart
  = ExponentIndicator exponent: SignedBasicInteger { return exponent; }

BasicInteger
  = num: $('0' / ([1-9] DecimalDigit*)) { return parseInt(num, 10) }

PositiveBasicInteger
  = num: $([1-9] DecimalDigit*) { return parseInt(num, 10) }

DenominatorPart
  = $([1-9] DecimalDigit*)

SignedBasicInteger
  = num: $([+-]? ('0' / ([1-9] DecimalDigit*))) { return parseInt(num, 10) }

RGB4
  = $('#' HexDigit|3|)

RGB8
  = $('#' HexDigit|6|)

IdentifierName
  = $(IdentifierStart IdentifierPart*)

DoubleStringCharacter
  = $(!(["\\] / LineTerminator) SourceCharacter)
  / '\u2028'
  / '\u2029'
  / '\\' @EscapeSequence
  / LineContinuation

SingleStringCharacter
  = $(!(['\\] / LineTerminator) SourceCharacter)
  / '\u2028'
  / '\u2029'
  / '\\' @EscapeSequence
  / LineContinuation

LineContinuation
  = '\\' LineTerminatorSequence { return ''; }

EscapeSequence
  = CharacterEscapeSequence
  / '0' !DecimalDigit { return '\0'; }
  / HexEscapeSequence
  / UnicodeEscapeSequence

CharacterEscapeSequence
  = SingleEscapeCharacter
  / NonEscapeCharacter

SingleEscapeCharacter
  = "'"
  / '"'
  / '\\'
  / 'b'  { return '\b'; }
  / 'f'  { return '\f'; }
  / 'n'  { return '\n'; }
  / 'r'  { return '\r'; }
  / 't'  { return '\t'; }
  / 'v'  { return '\v'; }

NonEscapeCharacter
  = $(!(EscapeCharacter / LineTerminator) SourceCharacter)

EscapeCharacter
  = SingleEscapeCharacter
  / DecimalDigit
  / 'x'
  / 'u'

HexEscapeSequence
  = 'x' digits:$(HexDigit HexDigit) {
      return String.fromCharCode(parseInt(digits, 16));
    }

UnicodeEscapeSequence
  = 'u' digits:$(HexDigit HexDigit HexDigit HexDigit) {
      return String.fromCharCode(parseInt(digits, 16));
    }

DecimalDigit
  = [0-9]

HexDigit
  = [0-9a-f]i

IdentifierStart
  = ID_Start
  / '$'
  / '_'

IdentifierPart
  = ID_Continue
  / '$'
  / '\u200C'
  / '\u200D'

_ 'whitespace'
  = (WhiteSpace / LineTerminatorSequence / Comment)*

__ 'inline whitespace'
  = (WhiteSpace / MultiLineCommentNoLineTerminator)*

// Automatic Semicolon Insertion
EOS = _ ';'
  / __ SingleLineComment? LineTerminatorSequence
  / __ &"}"
  / _ EOF

EOF
  = !.

WhiteSpace
  = '\t'
  / '\v'
  / '\f'
  / ' '
  / '\u00A0'
  / '\uFEFF'
  / Zs

LineTerminator 'line break'
  = '\n'
  / '\r'
  / '\u2028'
  / '\u2029'

LineTerminatorSequence 'line terminator'
  = '\n'
  / '\r' !'\n'
  / '\u2028'
  / '\u2029'
  / '\r\n'

// Separator, Space
Zs = c:SourceCharacter &{ return ZS_RE.test(c); }

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

ID_Start
  = c:SourceCharacter &{ return ID_START_RE.test(c); }

ID_Continue
  = c:SourceCharacter &{ return ID_CONTINUE_RE.test(c); }

Comment
  = MultiLineComment
  / SingleLineComment

MultiLineComment = '/*' $(!'*/' SourceCharacter)* '*/'

MultiLineCommentNoLineTerminator
  = "/*" (!("*/" / LineTerminator) SourceCharacter)* "*/"

SingleLineComment
  = '//' $SingleLineCommentChar*

SingleLineCommentChar
  = !LineTerminator SourceCharacter

// Chord parser needs to know what monzo components look like
VectorComponent
  = sign: SignPart left: BasicInteger separator: '/' right: DenominatorPart {
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

Fraction
  = numerator: SignedBasicInteger denominator: ('/' @BasicInteger)? {
    return {
      numerator,
      denominator,
    };
  }

// Tokens representing units can only appear along scalars so they're not reserved.
CentToken     = @'c'  !IdentifierPart
HertzToken    = @'Hz' !IdentifierPart
LowHertzToken = @'hz' !IdentifierPart
RealCentToken = @'rc' !IdentifierPart
SecondToken   = @'s'  !IdentifierPart

ValBasisElement = Fraction / SecondToken / HertzToken / LowHertzToken

BasisElement = ValBasisElement / RealCentToken / 'r¢' / '1\\' / '1°' / ''

ValBasis = (ValBasisElement / '')|.., '.'|

SubgroupBasis = BasisElement|.., '.'|
