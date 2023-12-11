{{
  function BinaryExpression(operator, left, right, preferLeft, preferRight) {
    return {
      type: 'BinaryExpression',
      operator,
      left,
      right,
      preferLeft,
      preferRight,
    }
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
      type: "Program",
      body: body ?? [],
    }
  }

Statements
  = head: Statement tail: (_ @Statement)* {
    return prepend(head, tail);
  }

Statement
  = ExpressionStatement

ExpressionStatement
  = expression: Expression EOS {
    return {
      type: "ExpressionStatement",
      expression,
    }
  }

Expression
  = head:Term tail:(_ @'~'? @('+' / '-') @'~'? _ @Term)* {
      return tail.reduce(operatorReducer, head);
    }

Term
  = NedoLiteral
  / CommaDecimal
  / PlainLiteral
  / ColorLiteral
  / CallExpression
  / Identifier

NedoLiteral
  = numerator: Integer '\\' denominator: PositiveInteger {
    return {
      type: 'NedoLiteral',
      numerator,
      denominator,
    }
  }

CommaDecimal
  = !(',' [^0-9])
  whole: Integer? ',' fractional: FractionalPart {
    return {
      type: 'DecimalLiteral',
      whole: whole ?? 0n,
      fractional: fractional,
    }
  }

PlainLiteral
  = value: Integer {
    return {
      type: "PlainLiteral",
      value,
    }
  }

ColorLiteral
  = value: (@RGB8 / @RGB4) {
    return {
      type: "ColorLiteral",
      value,
    }
  }

CallExpression
  = callee: Identifier "()" {
    return {
      type: "CallExpression",
      callee,
    }
  }

Identifier
  = id: IdentifierName {
    return {
      type: "Identifier",
      id,
    }
  }

Integer
  = num:$("0" / ([1-9] [0-9]*)) { return BigInt(num) }

PositiveInteger
  = num:$([1-9] [0-9]*) { return BigInt(num) }

FractionalPart
  = $[0-9]*

HexDigit
  = [A-Fa-f0-9]

RGB4
  = $("#" HexDigit|3|)

RGB8
  = $("#" HexDigit|6|)

IdentifierName
  = $(IdentifierStart IdentifierPart*)

IdentifierStart
  = ID_Start
  / "$"
  / "_"

IdentifierPart
  = ID_Continue
  / "$"
  / "\u200C"
  / "\u200D"

_ "whitespace"
  = WhiteSpace*

EOS = _ ";"

WhiteSpace
  = "\t"
  / "\v"
  / "\f"
  / " "
  / "\u00A0"
  / "u\FEFF"
  / Zs

// Separator, Space
Zs = c:SourceCharacter &{ return /\p{Zs}/u.test(c) }

SourceCharacter
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
  = c:SourceCharacter &{ return /\p{ID_Start}/u.test(c) }

ID_Continue
  = c:SourceCharacter &{ return /\p{ID_Continue}/u.test(c) }
