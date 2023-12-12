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

  function operatorReducer (result, element) {
    const left = result;
    const [preferLeft, op, preferRight, right] = element;

    return BinaryExpression(op, left, right, !!preferLeft, !!preferRight);
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
HertzToken  = 'Hz'     !IdentifierPart
LogToken    = 'log'    !IdentifierPart
ModToken    = 'mod'    !IdentifierPart
ReduceToken = 'reduce' !IdentifierPart
ReturnToken = 'return' !IdentifierPart
RiffToken   = 'riff'   !IdentifierPart

Statements
  = head: Statement tail: (_ @Statement)* {
    return prepend(head, tail);
  }

Statement
  = VariableDeclaration
  / FunctionDeclaration
  / BlockStatement
  / ExpressionStatement
  / ReturnStatement

VariableDeclaration
  = name: Identifier _ '=' _ value: Expression EOS {
    return {
      type: 'VariableDeclaration',
      name,
      value,
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

ExpressionStatement
  = expression: Expression EOS {
    return {
      type: 'ExpressionStatement',
      expression,
    };
  }

Expression
  = head:Term tail:(_ @'~'? @('+' / '-') @'~'? _ @Term)* {
      return tail.reduce(operatorReducer, head);
    }

MultiplicativeOperator
  = $('*' / '×' / '%' / '÷' / ModToken / ReduceToken / LogToken / DotToken)

Term
  = head:Factor tail:(_ @'~'? @MultiplicativeOperator @'~'? _ @Factor)* {
    return tail.reduce(operatorReducer, head);
  }

Factor
  = head:Group tail:(_ @'~'? @'^' @'~'? _ @Factor)* {
      return tail.reduce(operatorReducer, head);
    }

Group
  = _ @(UnaryExpression / OtonalChord / Primary) _

UnaryExpression
  = operator: ('+' / '-' / '%' / '÷') operand: Primary {
    return {
      type: 'UnaryExpression',
      operator,
      operand,
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
  / HarmonicSegment
  / ArrowFunction
  / CallExpression
  / Identifier
  / ScalarLike

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
  whole: Integer? '.' fractional: FractionalPart {
    return {
      type: 'DecimalLiteral',
      whole: whole ?? 0n,
      fractional: fractional,
      hard: false,
    };
  }

HardDotDecimal
  = !('.' [^0-9])
  whole: Integer? '.' fractional: FractionalPart '!' {
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
  = !(',' [^0-9])
  whole: Integer? ',' fractional: FractionalPart hard: '!'? {
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
  = multiplier: DotDecimal {
    return BinaryExpression('', multiplier, { type: 'CentLiteral' }, false, false);
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

HarmonicSegment
  = root: PositiveInteger _ '::' _ end: PositiveInteger {
    return {
      type: 'HarmonicSegment',
      root,
      end,
    };
  }

OtonalChord
  = intervals: Primary|2.., _ ':' _| {
    return {
      type: 'OtonalChord',
      intervals,
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

ParenthesizedExpression
  = '(' _ @Expression _ ')'

MetricPrefix
  = $([QRYZEPTGMkhdcmµnpfazyrq] / 'da' / '')

Integer
  = num:$('0' / ([1-9] [0-9]*)) { return BigInt(num); }

PositiveInteger
  = num:$([1-9] [0-9]*) { return BigInt(num); }

FractionalPart
  = $[0-9]*

HexDigit
  = [A-Fa-f0-9]

RGB4
  = $('#' HexDigit|3|)

RGB8
  = $('#' HexDigit|6|)

IdentifierName
  = $(IdentifierStart IdentifierPart*)

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
