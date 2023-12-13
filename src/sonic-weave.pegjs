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

  function swapQuotes(value) {
    let i = 0;
    while (value.includes(String.fromCharCode(i))) i++;
    const temp = String.fromCharCode(i);
    const re = RegExp(temp, 'g');
    return value.replace(/"/g, temp).replace(/'/g, '"').replace(re, "'");
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

CentToken   = 'c'      !IdentifierPart
DotToken    = 'dot'    !IdentifierPart
ElseToken   = 'else'   !IdentifierPart
ForToken    = 'for'    !IdentifierPart
HertzToken  = 'Hz'     !IdentifierPart
IfToken     = 'if'     !IdentifierPart
LogToken    = 'log'    !IdentifierPart
ModToken    = 'mod'    !IdentifierPart
OfToken     = 'of'     !IdentifierPart
ReduceToken = 'red'    !IdentifierPart
ReturnToken = 'return' !IdentifierPart
RiffToken   = 'riff'   !IdentifierPart
WhileToken  = 'while'  !IdentifierPart

Statements
  = head: Statement tail: (_ @Statement)* {
    return prepend(head, tail);
  }

Statement
  = VariableDeclaration
  / ReassignmentStatement
  / FunctionDeclaration
  / BlockStatement
  / ReturnStatement
  / WhileStatement
  / IfStatement
  / ForOfStatement
  / ExpressionStatement

LeftHandSideExpression
  = ArrayAccess
  / Identifier

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
  = RiffToken _ name: Identifier _ parameters: Parameters _ body: BlockStatement {
    return {
      type: 'FunctionDeclaration',
      name,
      parameters,
      body: body.body,
    };
  }

Parameters
  = Identifier|.., _ ','? _|

ArgumentList
  = Expression|.., _ ','? _|

BlockStatement
  = '{' _ body: Statements? _ '}' _ {
    return {
      type: 'BlockStatement',
      body: body ?? [],
    };
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
  = ForToken _ '(' _ element: Identifier _ OfToken _ array: Expression _ ')' _ body: Statement {
    return {
      type: 'ForOfStatement',
      element,
      array,
      body,
    };
  }

ExpressionStatement
  = expression: Expression EOS {
    return {
      type: 'ExpressionStatement',
      expression,
    };
  }

AssigningOperator
  = CoalescingOperator
  / AdditiveOperator
  / MultiplicativeOperator
  / ExponentiationOperator

CoalescingOperator
  = '??'

Expression
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
  = '+' / '-'

AdditiveExpression
  = head: MultiplicativeExpression tail: (_ @'~'? @AdditiveOperator @'~'? _ @MultiplicativeExpression)* {
      return tail.reduce(operatorReducer, head);
    }

MultiplicativeOperator
  = $('*' / '×' / '%' / '÷' / '\\' / ModToken / ReduceToken / LogToken / DotToken)

MultiplicativeExpression
  = head: ExponentiationExpression tail: (_ @'~'? @MultiplicativeOperator @'~'? _ @ExponentiationExpression)* {
    return tail.reduce(operatorReducer, head);
  }

ExponentiationOperator
  = '^'

ExponentiationExpression
  = head: Group tail: (_ @'~'? @ExponentiationOperator @'~'? _ @ExponentiationExpression)* {
      return tail.reduce(operatorReducer, head);
    }

Group
  = _ @(Secondary / Primary) _

Secondary
 = UnaryExpression
 / Range
 / HarmonicSegment
 / EnumeratedChord
 / ArrayAccess

// TODO: Universality with ~
UnaryExpression
  = operator: ('--' / '++' / '+' / '-' / '%' / '÷' / '!') operand: Primary {
    return {
      type: 'UnaryExpression',
      operator,
      operand,
      prefix: true,
    };
  }
  / operand: Primary operator: ('--' / '++') {
    return {
      type: 'UnaryExpression',
      operator,
      operand,
      prefix: false,
    }
  }

ArrayAccess
  = head: Primary tail: (_ '[' @Expression _ ']')* {
    return tail.reduce( (object, index) => {
      return { type: 'ArrayAccess', object, index };
    }, head);
  }

UnitStepRange
  = '[' _ start: Primary _ '..' _ end: Primary _ ']' {
    return {
      type: 'Range',
      start,
      end,
    };
  }

StepRange
  = '[' _ start: Primary _ ',' _ second: Primary _ '..' _ end: Primary _ ']' {
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
  / CommaDecimal
  / FractionLiteral
  / IntegerLiteral

Quantity
  = HertzLiteral
  / CentLiteral

Primary
  = ScalarMultiple
  / Quantity
  / NedoLiteral
  / HardDotDecimal
  / DotCentsLiteral
  / ColorLiteral
  / ArrowFunction
  / CallExpression
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

SoftDotDecimal
  = !('.' [^0-9])
  whole: Integer? '.' !'.' fractional: FractionalPart {
    return {
      type: 'DecimalLiteral',
      whole: whole ?? 0n,
      fractional: fractional,
      hard: false,
    };
  }

HardDotDecimal
  = !('.' [^0-9])
  whole: Integer? '.' !'.' fractional: FractionalPart '!' {
    return {
      type: 'DecimalLiteral',
      whole: whole ?? 0n,
      fractional: fractional,
      hard: true,
    };
  }

DotDecimal
  = SoftDotDecimal
  / HardDotDecimal

CommaDecimal
  = whole: Integer ',' fractional: DecimalDigits hard: '!'? {
    return {
      type: 'DecimalLiteral',
      whole: whole ?? 0n,
      fractional: fractional,
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
  = multiplier: SoftDotDecimal {
    return {
      type: 'CentsLiteral',
      whole: multiplier.whole,
      fractional: multiplier.fractional,
    };
  }

CentLiteral
  = CentToken { return { type: 'CentLiteral' }; }

HertzLiteral
  = prefix: MetricPrefix? HertzToken {
    return {
      type: 'HertzLiteral',
      prefix,
    };
  }

ColorLiteral
  = value: (@RGB8 / @RGB4) {
    return {
      type: 'ColorLiteral',
      value,
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
  = callee: Identifier _ '(' _ args: ArgumentList _ ')' {
    return {
      type: 'CallExpression',
      callee,
      args,
    };
  }

Identifier
  = id: IdentifierName {
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

FractionalPart
  = $(DecimalDigit*)

RGB4
  = $('#' HexDigit|3|)

RGB8
  = $('#' HexDigit|6|)

IdentifierName
  = $(IdentifierStart IdentifierPart*)

StringLiteral
  = '"' DoubleStringCharacter* '"' {
    return {
      type: 'StringLiteral',
      value: JSON.parse(text()),
    }
  }
  /  "'" SingleStringCharacter* "'" {
    // A horrible hack...
    const value = swapQuotes(JSON.parse(swapQuotes(text())));
    return {
      type: 'StringLiteral',
      value
    }
  }

DoubleStringCharacter
  = !(["\\] / LineTerminator) SourceCharacter
  / "\u2028"
  / "\u2029"
  / "\\" EscapeSequence
  / LineContinuation

SingleStringCharacter
  = !(['\\] / LineTerminator) SourceCharacter
  / "\u2028"
  / "\u2029"
  / "\\" EscapeSequence
  / LineContinuation

LineContinuation
  = "\\" LineTerminatorSequence

EscapeSequence
  = CharacterEscapeSequence
  / "0" !DecimalDigit
  / HexEscapeSequence
  / UnicodeEscapeSequence

CharacterEscapeSequence
  = SingleEscapeCharacter
  / NonEscapeCharacter

SingleEscapeCharacter
  = ['"\\bfnrtv]

NonEscapeCharacter
  = !(EscapeCharacter / LineTerminator) SourceCharacter

EscapeCharacter
  = SingleEscapeCharacter
  / DecimalDigit
  / "x"
  / "u"

HexEscapeSequence
  = "x" HexDigit HexDigit

UnicodeEscapeSequence
  = "u" Hex4Digits
  / "u{" CodePoint "}"

Hex4Digits
  = HexDigit HexDigit HexDigit HexDigit

DecimalDigits
  = $(DecimalDigit+)

DecimalDigit = [0-9]

HexDigits
  = $(HexDigit+)

HexDigits_Sep
  = HexDigit+ (NumericLiteralSeparator HexDigit+)*

HexDigit = [0-9a-f]i

NumericLiteralSeparator = "_"

CodePoint
   = HexDigits ?{ return parseInt(n, 16) <= 0x10FFFF }

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
  = (WhiteSpace / Comment)*

EOS = _ ';'

WhiteSpace
  = '\t'
  / '\v'
  / '\f'
  / ' '
  / '\u00A0'
  / 'u\FEFF'
  / Zs
  / LineTerminator

LineTerminator
  = '\n'
  / '\r'
  / '\u2028'
  / '\u2029'

LineTerminatorSequence
  = "\n"
  / "\r" !"\n"
  / "\u2028"
  / "\u2029"
  / "\r\n"

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

SingleLineComment
  = '//' $SingleLineCommentChar*

SingleLineCommentChar
  = !LineTerminator SourceCharacter
