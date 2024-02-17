UnderscoreDigits
  = num: $([_0-9]*) { return num.replace(/_/g, ''); }

NonEmptyUnderscoreDigits
  = num: $([_0-9]+) { return num.replace(/_/g, ''); }

PositiveInteger
  = num:([1-9] UnderscoreDigits) { return BigInt(num.join('')); }

Integer
  = '0' { return 0n; }
  / PositiveInteger

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

LineTerminator
  = '\n'
  / '\r'
  / '\u2028'
  / '\u2029'

LineTerminatorSequence
  = '\n'
  / '\r' !'\n'
  / '\u2028'
  / '\u2029'
  / '\r\n'

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

ID_Start
  = c:SourceCharacter &{ return /\p{ID_Start}/u.test(c); }

ID_Continue
  = c:SourceCharacter &{ return /\p{ID_Continue}/u.test(c); }

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
