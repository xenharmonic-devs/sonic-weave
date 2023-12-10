{{
  function BinaryExpression(operator, left, right) {
    return {
      type: 'BinaryExpression',
      operator,
      left,
      right
    }
  }

  function prepend(head, tail) {
    return [head].concat(tail ?? []);
  }

  function operatorReducer (result, element) {
    const left = result;
    const [op, right] = element;

    return BinaryExpression(op, left, right);
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
  = head:Term tail:(_ @('+' / '-') _ @Term)* {
      return tail.reduce(operatorReducer, head);
    }

Term
  = PlainLiteral
  / ColorLiteral

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

Integer
  = num:$("0" / ([1-9] [0-9]*)) { return BigInt(num) }

HexDigit
  = [A-Fa-f0-9]

RGB4
  = $("#" HexDigit|3|)

RGB8
  = $("#" HexDigit|6|)

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

_ = WhiteSpace*
