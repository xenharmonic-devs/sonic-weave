{{
  function BinaryExpression(operator, left, right, preferLeft, preferRight) {
    return {
      type: 'BinaryExpression',
      operator,
      left,
      right,
      preferLeft,
      preferRight,
    };
  }

  function prepend(head, tail) {
    return [head].concat(tail ?? []);
  }

  function operatorReducer(result, element) {
    const left = result;
    const [preferLeft, op, preferRight, right] = element;

    return BinaryExpression(op, left, right, !!preferLeft, !!preferRight);
  }

  function operatorReducerLite(result, element) {
    const left = result;
    const [op, right] = element;

    return BinaryExpression(op, left, right, false, false);
  }
}}

Start
  = _ program: Program _ { return program; }

Program
  = body: Statements? {
    return {
      type: 'Program',
      body: body ?? [],
    };
  }

AndToken      = 'and'    !IdentifierPart
ByToken       = 'by'     !IdentifierPart
CentToken     = 'c'      !IdentifierPart
DotToken      = 'dot'    !IdentifierPart
ElseToken     = 'else'   !IdentifierPart
FalseToken    = 'false'  !IdentifierPart
ForToken      = 'for'    !IdentifierPart
HertzToken    = 'Hz'     !IdentifierPart
IfToken       = 'if'     !IdentifierPart
LogToken      = 'log'    !IdentifierPart
ModToken      = 'mod'    !IdentifierPart
NoneToken     = 'niente' !IdentifierPart
OfToken       = 'of'     !IdentifierPart
OrToken       = 'or'     !IdentifierPart
ReduceToken   = 'red'    !IdentifierPart
ReturnToken   = 'return' !IdentifierPart
FunctionToken = 'riff'   !IdentifierPart
SecondToken   = 's'      !IdentifierPart
TensorToken   = 'tns'    !IdentifierPart
ThrowToken    = 'throw'  !IdentifierPart
ToToken       = 'to'     !IdentifierPart
TrueToken     = 'true'   !IdentifierPart
WhileToken    = 'while'  !IdentifierPart

ReservedWord
  = AndToken
  / ByToken
  / CentToken
  / DotToken
  / ElseToken
  / FalseToken
  / ForToken
  / HertzToken
  / IfToken
  / LogToken
  / ModToken
  / NoneToken
  / OfToken
  / OrToken
  / ReduceToken
  / ReturnToken
  / FunctionToken
  / SecondToken
  / TensorToken
  / ThrowToken
  / ToToken
  / TrueToken
  / WhileToken

Statements
  = head: Statement tail: (_ @Statement)* {
    return prepend(head, tail);
  }

Statement
  = VariableDeclaration
  / ReassignmentStatement
  / FunctionDeclaration
  / PitchDeclaration
  / BlockStatement
  / ThrowStatement
  / ReturnStatement
  / WhileStatement
  / IfStatement
  / ForOfStatement
  / ExpressionStatement

// TODO: Slice assignment with broadcasting
LeftHandSideExpression
  = ArrayAccess
  / Identifier
  / IdentifierArray

VariableDeclaration
  = name: LeftHandSideExpression _ '=' _ value: Expression EOS {
    return {
      type: 'VariableDeclaration',
      name,
      value,
    };
  }

ReassignmentStatement
  = name: LeftHandSideExpression _ preferLeft: '~'? operator: AssigningOperator preferRight: '~'? '=' _ expression: Expression EOS {
    return {
      type: 'VariableDeclaration',
      name,
      value: BinaryExpression(operator, name, expression, !!preferLeft, !!preferRight),
    };
  }

FunctionDeclaration
  = FunctionToken _ name: Identifier _ parameters: Parameters _ body: BlockStatement {
    return {
      type: 'FunctionDeclaration',
      name,
      parameters,
      body: body.body,
    };
  }

PitchDeclaration
  = left: Expression _ '=' _ middle: Expression _ '=' _ right: Expression EOS {
    return {
      type: 'PitchDeclaration',
      left,
      middle,
      right,
    };
  }
  / left: Expression _ '=' _ right: Expression EOS {
    return {
      type: 'PitchDeclaration',
      left,
      right,
    };
  }

Parameters
  = Identifier|.., _ ','? _|

ArgumentList
  = Expression|.., _ ','? _|

IdentifierArray
  = '[' _ @Parameters _ ']'

BlockStatement
  = '{' _ body: Statements? _ '}' _ {
    return {
      type: 'BlockStatement',
      body: body ?? [],
    };
  }

ThrowStatement
  = ThrowToken _ argument: Expression EOS {
    return { type: 'ThrowStatement', argument };
  }

ReturnStatement
  = ReturnToken _ argument: Expression EOS {
    return { type: 'ReturnStatement', argument };
  }
  / ReturnToken EOS {
    return { type: 'ReturnStatement' };
  }

WhileStatement
  = WhileToken _ '(' _ test: Expression _ ')' _ body: Statement {
    return {
      type: 'WhileStatement',
      test,
      body,
    };
  }

IfStatement
  = IfToken _ '(' _ test: Expression _ ')' _
    consequent: Statement _
    ElseToken _
    alternate: Statement {
    return {
      type: 'IfStatement',
      test,
      consequent,
      alternate,
    };
  }
  / IfToken _ '(' _ test: Expression _ ')' _ consequent: Statement {
    return {
      type: 'IfStatement',
      test,
      consequent,
    }
  }

ForOfStatement
  = ForToken _ '(' _ element: (Identifier / IdentifierArray) _ OfToken _ array: Expression _ ')' _ body: Statement {
    return {
      type: 'ForOfStatement',
      element,
      array,
      body,
    };
  }

ExpressionStatement
  = !("{" / FunctionToken) expression: (CommaDecimal / Expression) EOS {
    return {
      type: 'ExpressionStatement',
      expression,
    };
  }

Expression
  = ConditionalExpression

ConditionalExpression
  = consequent: CoalescingExpression tail: (IfToken @CoalescingExpression ElseToken @CoalescingExpression)? {
    if (tail) {
      const [test, alternate] = tail;
      return {
        type: 'ConditionalExpression',
        test,
        consequent,
        alternate,
      };
    }
    return consequent;
  }

AssigningOperator
  = CoalescingOperator
  / AdditiveOperator
  / MultiplicativeOperator
  / ExponentiationOperator

CoalescingOperator
  = '??'
  / $(OrToken)
  / $(AndToken)

CoalescingExpression
  = head: RelationalExpression tail: (_ @CoalescingOperator _ @RelationalExpression)* {
    return tail.reduce(operatorReducerLite, head);
  }

RelationalOperator
  = '==='
  / '!=='
  / '=='
  / '!='
  / '<='
  / '>='
  / '<'
  / '>'
  / $(OfToken)
  / $('!' OfToken)
  / $('~' OfToken)
  / $('!~' OfToken)

RelationalExpression
  = head: AdditiveExpression tail: (_ @RelationalOperator _ @AdditiveExpression)* {
    return tail.reduce(operatorReducerLite, head);
  }

AdditiveOperator
  = $('+' / '-' / ToToken / ByToken)

AdditiveExpression
  = head: MultiplicativeExpression tail: (NedjiProjector / AdditiveTail) {
      if (Array.isArray(tail)) {
        return tail.reduce(operatorReducer, head);
      }
      return {
        type: 'NedjiProjection',
        octaves: head,
        base: tail.base,
      };
    }

AdditiveTail
  = (_ @'~'? @AdditiveOperator @'~'? _ @MultiplicativeExpression)*

MultiplicativeOperator
  = $('*' / '×' / '%' / '÷' / '\\' / ModToken / ReduceToken / LogToken / '·' / DotToken / '⊗' / TensorToken)

MultiplicativeExpression
  = head: ExponentiationExpression tail: (_ @'~'? @MultiplicativeOperator @'~'? _ @ExponentiationExpression)* {
    return tail.reduce(operatorReducer, head);
  }

ExponentiationOperator
  = '^'

ExponentiationExpression
  = head: LabeledExpression tail: (_ @'~'? @ExponentiationOperator !(FJS / AbsoluteFJS) @'~'? _ @ExponentiationExpression)* {
      return tail.reduce(operatorReducer, head);
    }

LabeledExpression
  = object: Group labels: (Identifier / ColorLiteral / StringLiteral)|.., _| __ {
    if (labels.length) {
      return {
        type: 'LabeledExpression',
        object,
        labels,
      };
    }
    return object;
  }

Group
  = __ @(UnaryExpression / Secondary / Primary) __

Secondary
  = DownExpression
  / Range
  / HarmonicSegment
  / EnumeratedChord
  / CallExpression
  / ArrayAccess
  / ArraySlice

UniformUnaryOperator
  = '-' / '%' / '÷'

ChainableUnaryOperator
  = '!' / '^'

UnaryExpression
  = operator: UniformUnaryOperator uniform: '~'? operand: (Secondary / Primary) {
    return {
      type: 'UnaryExpression',
      operator,
      operand,
      prefix: true,
      uniform: !!uniform,
    };
  }
  / operator: ChainableUnaryOperator operand: (Secondary / Primary / UnaryExpression) {
    return {
      type: 'UnaryExpression',
      operator,
      operand,
      prefix: true,
      uniform: false,
    };
  }
  / operator: ('--' / '++' / '+') operand: (Secondary / Primary) {
    return {
      type: 'UnaryExpression',
      operator,
      operand,
      prefix: true,
      uniform: false,
    };
  }
  / operand: (Primary) operator: ('--' / '++') {
    // TODO: Adjust flow to allow secondaries here without a huge performance hit
    return {
      type: 'UnaryExpression',
      operator,
      operand,
      prefix: false,
      uniform: false,
    }
  }

DownExpression
  = operators: 'v'+ '{' _ operand: Primary _ '}' {
    return {
      type: 'DownExpression',
      count: operators.length,
      operand,
    };
  }

ArrayAccess
  = head: Primary tail: (_ '[' @Expression ']')+ {
    return tail.reduce( (object, index) => {
      return { type: 'ArrayAccess', object, index };
    }, head);
  }

// TODO: Disallow literals with trailing commas from comma-separated lists
ArraySlice
  = head: Primary tail: (_ '[' @Expression ',' @Expression '..' @Expression? ']')+ {
    return tail.reduce( (object, [start, second, end]) => {
      return { type: 'ArraySlice', object, start, second, end };
    }, head);
  }
  / head: Primary tail: (_ '[' @Expression? '..' @Expression? ']')+ {
    return tail.reduce( (object, [start, end]) => {
      return { type: 'ArraySlice', object, start, second: null, end };
    }, head);
  }

UnitStepRange
  = '[' _ start: Expression _ '..' _ end: Expression _ ']' {
    return {
      type: 'Range',
      start,
      end,
    };
  }

StepRange
  = '[' _ start: Expression _ ',' _ second: Expression _ '..' _ end: Expression _ ']' {
    return {
      type: 'Range',
      start,
      second,
      end,
    };
  }

Range = StepRange / UnitStepRange

HarmonicSegment
  = root: Primary _ '::' _ end: Primary {
    return {
      type: 'HarmonicSegment',
      root,
      end,
    };
  }

EnumeratedChord
  = intervals: Primary|2.., _ ':' _| {
    return {
      type: 'EnumeratedChord',
      intervals,
    };
  }

ScalarMultiple
  = scalar: ScalarLike _ quantity: Quantity { return BinaryExpression('', scalar, quantity, false, false) }

ScalarLike
  = ParenthesizedExpression
  / DotDecimal
  / FractionLiteral
  / IntegerLiteral

Quantity
  = WartsLiteral
  / HertzLiteral
  / SecondLiteral
  / CentLiteral
  / ReciprocalCentLiteral
  / MonzoLiteral
  / ValLiteral

Primary
  = ScalarMultiple
  / Quantity
  / NoneLiteral
  / TrueLiteral
  / FalseLiteral
  / NedoLiteral
  / SoftDotDecimalWithExponent
  / HardDotDecimal
  / DotCentsLiteral
  / ColorLiteral
  / FJS
  / AbsoluteFJS
  / ArrowFunction
  / Identifier
  / ScalarLike
  / ArrayLiteral
  / StringLiteral

NedoLiteral
  = numerator: Integer '\\' denominator: PositiveInteger {
    return {
      type: 'NedoLiteral',
      numerator,
      denominator,
    };
  }

// TODO: Primary support
NedjiProjector
  = '<' _ base: Expression _'>' {
    return {
      type: 'NedjiProjector',
      base,
    };
  }

SoftDotDecimalWithExponent
  = !('.' [^0-9])
  whole: Integer? '.' !'.' fractional: FractionalPart exponent: ExponentPart  {
    return {
      type: 'DecimalLiteral',
      whole: whole ?? 0n,
      fractional: fractional,
      exponent,
      hard: false,
    };
  }
  / whole: Integer exponent: ExponentPart {
    return {
      type: 'DecimalLiteral',
      whole,
      fractional: '',
      exponent,
      hard: false,
    };
  }

SoftDotDecimal
  = !('.' [^0-9])
  whole: Integer? '.' !'.' fractional: FractionalPart {
    return {
      type: 'DecimalLiteral',
      whole: whole ?? 0n,
      fractional: fractional,
      exponent: null,
      hard: false,
    };
  }

HardDotDecimal
  = soft: (SoftDotDecimalWithExponent / SoftDotDecimal) '!' {
    return {...soft, hard: true};
  }
  / whole: Integer '!' {
    return {
      type: 'DecimalLiteral',
      whole,
      fractional: '',
      hard: true,
    };
  }

DotDecimal
  = HardDotDecimal
  / SoftDotDecimalWithExponent
  / SoftDotDecimal

CommaDecimal
  = whole: Integer ',' fractional: $(DecimalDigit+) exponent: ExponentPart? hard: '!'? {
    return {
      type: 'DecimalLiteral',
      whole: whole ?? 0n,
      fractional: fractional,
      exponent,
      hard: !!hard,
    };
  }

FractionLiteral
  = numerator: Integer '/' denominator: PositiveInteger {
    return {
      type: 'FractionLiteral',
      numerator,
      denominator,
    };
  }

IntegerLiteral
  = value: Integer {
    return {
      type: 'IntegerLiteral',
      value,
    };
  }

DotCentsLiteral
  = !('.' [^0-9])
  whole: Integer? '.' !'.' fractional: FractionalPart  {
    return {
      type: 'CentsLiteral',
      whole: whole,
      fractional: fractional,
    };
  }

VectorComponent
  = sign: SignPart left: Integer separator: '/' right: $(PositiveInteger) {
    return {sign, left, separator, right, exponent: null};
  }
  / sign: SignPart left: Integer separator: '.' right: FractionalPart exponent: ExponentPart? {
    return {sign, left, separator, right, exponent};
  }
  / sign: SignPart left: Integer exponent: ExponentPart? {
    return {sign, left, separator: '', right: '', exponent};
  }

VectorComponents
  = VectorComponent|.., _ ','? _|

MonzoLiteral
  = downs: 'v'* '[' _ components: VectorComponents _ '>' {
    return {
      type: 'MonzoLiteral',
      components,
      downs: downs.length,
    };
  }

ValLiteral
  = downs: 'v'* '<' _ components: VectorComponents _ ']' {
    return {
      type: 'ValLiteral',
      components,
      downs: downs.length,
    };
  }

WartsLiteral
  = equave: [a-z]i? divisions: PositiveInteger warts: [a-z]i* '@' basis: DotJoinedRationals {
    return {
      type: 'WartsLiteral',
      equave: (equave ?? '').toLowerCase(),
      divisions,
      warts: warts.map(w => w.toLowerCase()),
      basis,
    };
  }

DotJoinedRationals = ($(PositiveInteger ('/' PositiveInteger)?))|.., '.'|

CentLiteral
  = CentToken { return { type: 'CentLiteral' }; }

HertzLiteral
  = prefix: MetricPrefix? HertzToken {
    return {
      type: 'HertzLiteral',
      prefix,
    };
  }

SecondLiteral
  = prefix: MetricPrefix? SecondToken {
    return {
      type: 'SecondLiteral',
      prefix,
    };
  }

ReciprocalCentLiteral
  = '€' { return { type: 'ReciprocalCentLiteral' }; }

NoneLiteral
  = NoneToken { return { type: 'NoneLiteral' }; }

TrueLiteral
  = TrueToken { return { type: 'TrueLiteral' }; }

FalseLiteral
  = FalseToken { return { type: 'FalseLiteral' }; }

ColorLiteral
  = value: (@RGB8 / @RGB4) {
    return {
      type: 'ColorLiteral',
      value,
    };
  }

Semi
  = $('½' / 's')

Demisemi
  = $('¼' / 'q' / '½' / 's' / '¾' / 'Q')

AugmentedQuality
  = $(Demisemi? 'd'+) / $(Demisemi? 'A'+)

ImperfectQuality
  = 'm' / 'sm' / '½m' / 'n' / '½M' / 'sM' / 'M'

// Neutral is mid or ~ from ups-and-downs
MidQuality = 'P' / 'n'

PerfectQuality = 'P'

Degree
  = sign: '-'? num: PositiveInteger {
    num = Number(num) - 1;
    return {
      negative: !!sign,
      base: (num % 7) + 1,
      octaves: Math.floor(num / 7),
    };
  }

PerfectDegree
  = degree: Degree &{ return degree.base === 1; } {
    return degree;
  }

MidDegree
  = degree: Degree &{ return [4, 5].includes(degree.base); } {
    return degree;
  }

ImperfectDegree
  = degree: Degree &{ return [2, 3, 6, 7].includes(degree.base); } {
    return degree;
  }

HalfDegree
  = degree: Degree ('½' / '.5') {
    return {...degree, base: degree.base + 0.5};
  }

SplitDemisemipythagorean
  = quality: (AugmentedQuality / ImperfectQuality) degree: HalfDegree {
    return {
      type: 'Pythagorean',
      quality,
      degree,
      imperfect: true,
    };
  }
  / quality: (AugmentedQuality / ImperfectQuality) degree: ImperfectDegree {
    return {
      type: 'Pythagorean',
      quality,
      degree,
      imperfect: true,
    };
  }
  / quality: (AugmentedQuality / MidQuality) degree: MidDegree {
    return {
      type: 'Pythagorean',
      quality,
      degree,
      imperfect: false,
    };
  }
  / quality: (AugmentedQuality / PerfectQuality) degree: PerfectDegree {
    return {
      type: 'Pythagorean',
      quality,
      degree,
      imperfect: false,
    };
  }

FJS
  = downs: 'v'*
    pythagorean: SplitDemisemipythagorean
    superscripts: ('^' @CommaJoinedIntegers)?
    subscripts: ('_' @CommaJoinedIntegers)? {
    return {
      type: 'FJS',
      downs: downs.length,
      pythagorean,
      superscripts: superscripts ?? [],
      subscripts: subscripts ?? [],
    };
  }

Accidental
  = $('𝄪' / '𝄫' / '𝄲' / '𝄳' / [x♯#‡t♮=d♭b&@rp] / (Demisemi [♯#♭b]))

Nominal
  = $('alpha' / 'beta' / 'gamma' / 'delta' / 'epsilon' / 'zeta' / 'eta' / 'phi' / 'chi' / 'psi' / 'omega' / [\u03B1-ηφ-ωaA-G])

AbsolutePitch
  = nominal: Nominal accidentals: Accidental* octave: SignedInteger {
    return {
      type: 'AbsolutePitch',
      nominal,
      accidentals,
      octave,
    };
  }

AbsoluteFJS
  = downs: 'v'*
    pitch: AbsolutePitch
    superscripts: ('^' @CommaJoinedIntegers)?
    subscripts: ('_' @CommaJoinedIntegers)? {
    return {
      type: 'AbsoluteFJS',
      downs: downs.length,
      pitch,
      superscripts: superscripts ?? [],
      subscripts: subscripts ?? [],
    };
  }

ArrowFunction
  = parameters: Parameters _ '=>' _ expression: Expression {
    return {
      type: 'ArrowFunction',
      parameters,
      expression,
    };
  }

CallExpression
  = callee: LeftHandSideExpression _ '(' _ args: ArgumentList _ ')' {
    return {
      type: 'CallExpression',
      callee,
      args,
    };
  }

Identifier
  = !(ReservedWord / FJS / AbsoluteFJS) id: IdentifierName {
    return {
      type: 'Identifier',
      id,
    };
  }

ArrayLiteral
  = '[' _ elements: ArgumentList _ ']' {
    return {
      type: 'ArrayLiteral',
      elements,
    }
  }

ParenthesizedExpression
  = '(' _ @Expression _ ')'

MetricPrefix
  = $([QRYZEPTGMkhdcmµnpfazyrq] / 'da' / '')

Integer
  = num:$('0' / ([1-9] DecimalDigit*)) { return BigInt(num); }

PositiveInteger
  = num:$([1-9] DecimalDigit*) { return BigInt(num); }

SignedInteger
  = num:$(SignPart Integer) { return BigInt(num); }

SignPart
  = $([+-]?)

ExponentPart
  = ExponentIndicator exponent: SignedInteger { return exponent; }

ExponentIndicator
  = "e"i

FractionalPart
  = $(DecimalDigit*)

CommaJoinedIntegers
  = Integer|.., ','|

RGB4
  = $('#' HexDigit|3|)

RGB8
  = $('#' HexDigit|6|)

IdentifierName
  = $(IdentifierStart IdentifierPart*)

StringLiteral
  = '"' chars: DoubleStringCharacter* '"' { return { type: 'StringLiteral', value: chars.join('') }; }
  / "'" chars: SingleStringCharacter* "'" { return { type: 'StringLiteral', value: chars.join('') }; }

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
