{{
  function PlainLiteral(value) {
    return {
      type: 'PlainLiteral',
      value
    }
  }

  function CentsLiteral(whole, fractional) {
    return {
      type: 'CentsLiteral',
      whole,
      fractional
    }
  }

  function NumericLiteral(whole, fractional) {
    return {
      type: 'NumericLiteral',
      whole,
      fractional
    }
  }

  function FractionLiteral(numerator, denominator) {
    return  {
      type: 'FractionLiteral',
      numerator,
      denominator
    }
  }

  function EdjiFraction(numerator, denominator, equave) {
    return {
      type: 'EdjiFraction',
      numerator,
      denominator,
      equave
    }
  }

  function Monzo(components) {
    return {
      type: 'Monzo',
      components
    }
  }

  function BinaryExpression(operator, left, right) {
    return {
      type: 'BinaryExpression',
      operator,
      left,
      right
    }
  }

  function UnaryExpression(operator, operand) {
    return {
      type: 'UnaryExpression',
      operator,
      operand
    }
  }

  function operatorReducer (result, element) {
    const left = result;
    const [op, right] = element;

    return BinaryExpression(op, left, right);
  }
}}

Start
  = Expression

SourceCharacter
  = .

Whitespace "whitespace"
  = "\t"
  / "\v"
  / "\f"
  / " "
  / "\u00A0"
  / "\uFEFF"
  / Zs
  / LineTerminator

// Separator, Space
Zs = [\u0020\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]

LineTerminator
  = [\n\r\u2028\u2029]

_ = Whitespace*

Expression
  = head:Term tail:(_ @('+' / '-') _ @Term)* {
      return tail.reduce(operatorReducer, head);
    }

Term
  = _ @(UnaryExpression / Primary) _

Primary
  = DotDecimal
  / CommaDecimal
  / SlashFraction
  / BackslashFraction
  / Monzo
  / PlainNumber

Integer
  = num:$('0' / ([1-9] [0-9]*)) { return BigInt(num) }

FractionalPart
  = $[0-9]*

SignedInteger
  = sign:'-'? value:Integer { return sign ? -value : value }

DotDecimal
  = whole:Integer? '.' fractional:FractionalPart { return CentsLiteral(whole, fractional) }

CommaDecimal
  = whole:Integer? ',' fractional:FractionalPart { return NumericLiteral(whole, fractional) }

SlashFraction
  = numerator:Integer '/' denominator:Integer { return FractionLiteral(numerator, denominator) }

PlainNumber
  = value:Integer { return PlainLiteral(value) }

EquaveExpression
  = '<' _ @(SlashFraction / PlainNumber) _ '>'

BackslashFraction
  = numerator:Integer '\\' denominator:SignedInteger equave:EquaveExpression? { return EdjiFraction(numerator, denominator, equave) }

Component
  = $([+-]? (SlashFraction / PlainNumber))

Monzo
  = '[' components:Component|.., _ ','? _| '>' { return Monzo(components) }

UnaryExpression
  = operator:'-' operand:Primary { return UnaryExpression(operator, operand) }
