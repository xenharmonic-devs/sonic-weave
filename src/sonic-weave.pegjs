// Depends on base.pegjs

{{
  const TYPES_TO_PROPERTY_NAMES = {
    CallExpression: "callee",
    ArrayAccess: "object",
    ArraySlice: "object",
  };

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

AndToken           = 'and'    !IdentifierPart
ByToken            = 'by'     !IdentifierPart
CentToken          = 'c'      !IdentifierPart
ConstToken         = 'const'  !IdentifierPart
DotToken           = 'dot'    !IdentifierPart
ElseToken          = 'else'   !IdentifierPart
FalseToken         = 'false'  !IdentifierPart
ForToken           = 'for'    !IdentifierPart
HertzToken         = 'Hz'     !IdentifierPart
LowHertzToken      = 'hz'     !IdentifierPart
IfToken            = 'if'     !IdentifierPart
LetToken           = 'let'    !IdentifierPart
ModToken           = 'mod'    !IdentifierPart
ModCeilingToken    = 'modc'   !IdentifierPart
NoneToken          = 'niente' !IdentifierPart
NotToken           = 'not'    !IdentifierPart
OfToken            = 'of'     !IdentifierPart
OrToken            = 'or'     !IdentifierPart
ReduceToken        = 'rd'     !IdentifierPart
ReduceCeilingToken = 'rdc'    !IdentifierPart
ReturnToken        = 'return' !IdentifierPart
FunctionToken      = 'riff'   !IdentifierPart
FunctionAliasToken = 'fn'     !IdentifierPart
SecondToken        = 's'      !IdentifierPart
TensorToken        = 'tns'    !IdentifierPart
ThrowToken         = 'throw'  !IdentifierPart
ToToken            = 'to'     !IdentifierPart
TrueToken          = 'true'   !IdentifierPart
WhileToken         = 'while'  !IdentifierPart

// Tokens representing units can only appear along scalars so they're not reserved.
ReservedWord
  = AndToken
  / ByToken
  / ConstToken
  / DotToken
  / ElseToken
  / FalseToken
  / ForToken
  / IfToken
  / LetToken
  / ModToken
  / ModCeilingToken
  / NoneToken
  / NotToken
  / OfToken
  / OrToken
  / ReduceToken
  / ReduceCeilingToken
  / ReturnToken
  / FunctionToken
  / FunctionAliasToken
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
  = VariableManipulationStatement
  / PitchDeclaration
  / ExpressionStatement
  / VariableDeclaration
  / FunctionDeclaration
  / UpDeclaration
  / LiftDeclaration
  / BlockStatement
  / ThrowStatement
  / ReturnStatement
  / WhileStatement
  / IfStatement
  / ForOfStatement
  / EmptyStatement

ReassignmentTail
  = _ preferLeft: '~'? operator: AssigningOperator? preferRight: '~'? '=' _ value: Expression {
    return {
      preferLeft: !!preferLeft,
      preferRight: !!preferRight,
      operator,
      value,
    };
  }

VariableManipulationStatement
  = name: IdentifierArray _ '=' _ value: Expression EOS {
    return {
      type: 'AssignmentStatement',
      name,
      value,
    };
  }
  / name: ArrayAccess tail: ReassignmentTail? EOS {
    if (!tail) {
      return {
        type: 'ExpressionStatement',
        expression: name,
      }
    }
    const {preferLeft, preferRight, operator, value} = tail;
    if (name.type === 'ArrayAccess' || name.type === 'ArraySlice' || name.type === 'Identifier') {
      if (operator) {
        return {
          type: 'AssignmentStatement',
          name,
          value: BinaryExpression(operator, name, value, preferLeft, preferRight),
        };
      }
      return {
        type: 'AssignmentStatement',
        name,
        value,
      };
    } else if (operator) {
      throw new Error('Left-hand-side expression expected.');
    }
    return {
      type: 'PitchDeclaration',
      left: name,
      right: value,
    };
  }

VariableDeclaration
  = LetToken _ name: (Identifier / IdentifierArray) value: (_ '=' _ @Expression)? EOS {
    return {
      type: 'VariableDeclaration',
      name,
      value,
      mutable: true,
    };
  }
  / ConstToken _ name: (Identifier / IdentifierArray) _ '=' _ value: Expression EOS {
    return {
      type: 'VariableDeclaration',
      name,
      value,
      mutable: false,
    };
  }

FunctionDeclaration
  = (FunctionToken / FunctionAliasToken) _ name: Identifier _ parameters: Parameters _ body: BlockStatement {
    return {
      type: 'FunctionDeclaration',
      name,
      parameters,
      body: body.body,
      text: text(),
    };
  }

PitchDeclaration
  = left: AbsoluteFJS middle: (_ '=' _ @Expression)? right: (_ '=' _ @Expression)? EOS {
    if (right) {
      return {
        type: 'PitchDeclaration',
        left,
        middle,
        right,
      };
    }
    if (middle) {
      return {
        type: 'PitchDeclaration',
        left,
        right: middle,
      };
    }
    return left;
  }

UpDeclaration
  = '^' _ '=' _ value: Expression EOS {
    return {
      type: 'UpDeclaration',
      value,
    };
  }

LiftDeclaration
  = '/' _ '=' _ value: Expression EOS {
    return {
      type: 'LiftDeclaration',
      value,
    };
  }

Parameters
  = identifiers: Identifier|.., _| rest: (_ '...' _ @Identifier)? _ {
    return {
      type: 'Parameters',
      identifiers,
      rest,
    };
  }

Argument
  = spread: '...'? _ expression: Expression {
    return {
      type: 'Argument',
      spread: !!spread,
      expression,
    };
  }

ArgumentList
  = (@(Argument|.., _ ',' _|) _ ','? _)

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
  = ForToken _ '(' _ LetToken _ element: (Identifier / IdentifierArray) _ OfToken _ array: Expression _ ')' _ body: Statement {
    return {
      type: 'ForOfStatement',
      element,
      array,
      body,
      mutable: true,
    };
  }
  / ForToken _ '(' _ ConstToken _ element: (Identifier / IdentifierArray) _ OfToken _ array: Expression _ ')' _ body: Statement {
    return {
      type: 'ForOfStatement',
      element,
      array,
      body,
      mutable: false,
    };
  }

EmptyStatement
  = _ ';'
  / __ SingleLineComment LineTerminatorSequence

ExpressionStatement
  = !("{" / FunctionToken / FunctionAliasToken) expression: (LabeledCommaDecimal / Expression) EOS {
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
  = head: RelationalExpression tail: (__ @CoalescingOperator _ @RelationalExpression)* {
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
  / (NotToken __ OfToken) { return 'not of'; }
  / $('~' OfToken)
  / (NotToken __ '~' OfToken) { return 'not ~of'; }

Segment
  = __ @(HarmonicSegment / EnumeratedChord) __

RelationalExpression
  = head: Segment tail: (__ @RelationalOperator __ @Segment)* {
    return tail.reduce(operatorReducerLite, head);
  }

HarmonicSegment
  = mirror: '/'? __ root: AdditiveExpression _ '::' _ end: AdditiveExpression {
    return {
      type: 'HarmonicSegment',
      mirror: !!mirror,
      root,
      end,
    };
  }

EnumeratedChord
  = '/' __ intervals: AdditiveExpression|2.., _ ':' _| {
    return {
      type: 'EnumeratedChord',
      mirror: true,
      intervals,
    };
  }
  / intervals: AdditiveExpression|1.., _ ':' _| {
    if (intervals.length === 1) {
      return intervals[0];
    }
    return {
      type: 'EnumeratedChord',
      mirror: false,
      intervals,
    };
  }

AdditiveOperator
  = $('+' / '-' / ToToken / ByToken / '/+' / '⊕' / '/-' / '⊖')

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
  = (__ @'~'? @AdditiveOperator @'~'? _ @MultiplicativeExpression)*

MultiplicativeOperator
  = $('*' / '×' / '%' / '÷' / '\\' / ModToken / ModCeilingToken / ReduceToken / ReduceCeilingToken / '·' / DotToken / '⊗' / TensorToken)

MultiplicativeExpression
  = head: UniformUnaryExpression tail: (__ @'~'? @MultiplicativeOperator @'~'? _ @UniformUnaryExpression)* {
    return tail.reduce(operatorReducer, head);
  }

UniformUnaryOperator
  = '-' / '%' / '÷'

UniformUnaryExpression
  = operator: '--' operand: ExponentiationExpression {
    return {
      type: 'UnaryExpression',
      operator,
      operand,
      prefix: true,
      uniform: false,
    };
  }
  / operator: UniformUnaryOperator? uniform: '~'? operand: ExponentiationExpression {
    if (operator) {
      return {
        type: 'UnaryExpression',
        operator,
        operand,
        prefix: true,
        uniform: !!uniform,
      };
    }
    return operand;
  }

ExponentiationOperator
  = $('^' / '/_' / '/^')

ExponentiationExpression
  = head: LabeledExpression tail: (__ @'~'? @ExponentiationOperator !(FJS / AbsoluteFJS) @'~'? _ @ExponentiationExpression)* {
      return tail.reduce(operatorReducer, head);
    }

Labels
  = (CallExpression / TrueArrayAccess / Identifier / ColorLiteral / StringLiteral / NoneLiteral)|.., __|

LabeledExpression
  = object: UnaryExpression __ labels: Labels __ {
    if (labels.length) {
      return {
        type: 'LabeledExpression',
        object,
        labels,
      };
    }
    return object;
  }

LabeledCommaDecimal
  = __ object: CommaDecimal __ labels: Labels __ {
    if (labels.length) {
      return {
        type: 'LabeledExpression',
        object,
        labels,
      };
    }
    return object;
  }

Secondary
  = CallExpression
  / ArrayAccess

ChainableUnaryOperator
  = $NotToken / '^' / '/' / '\\'

UnaryExpression
  = operator: UniformUnaryOperator uniform: '~'? operand: Secondary {
    return {
      type: 'UnaryExpression',
      operator,
      operand,
      prefix: true,
      uniform: !!uniform,
    };
  }
  / operator: ChainableUnaryOperator __ operand: (Secondary / UnaryExpression) {
    return {
      type: 'UnaryExpression',
      operator,
      operand,
      prefix: true,
      uniform: false,
    };
  }
  / operator: ('--' / '++' / '+') operand: Secondary {
    return {
      type: 'UnaryExpression',
      operator,
      operand,
      prefix: true,
      uniform: false,
    };
  }
  / operand: Secondary operator: ('--' / '++')? {
    if (operator) {
      return {
        type: 'UnaryExpression',
        operator,
        operand,
        prefix: false,
        uniform: false,
      }
    }
    return operand;
  }

CallExpression
  = head: (
    callee: ArrayAccess __ '(' _ args: ArgumentList _ ')' {
      return { type: 'CallExpression', callee, args };
    }
  ) tail: (
    __ '(' _ args: ArgumentList _ ')' {
      return { type: 'CallExpression', args };
    }
    / __ '[' _ index: Expression _ ']' {
      return { type: 'ArrayAccess', index };
    }
    / __ '[' _ start: Expression? _ second: (',' _ @Expression)? _ '..' _ end: Expression? _ ']' {
      return { type: 'ArraySlice', start, second, end };
    }
  )* {
    return tail.reduce((result, element) => {
      element[TYPES_TO_PROPERTY_NAMES[element.type]] = result;

      return element;
    }, head);
  }

ArrayAccess
  = head: ArraySlice tail: (__ @('~'?) '[' _ @Expression _ ']')* {
    return tail.reduce( (object, [nullish, index]) => {
      return {
        type: 'ArrayAccess',
        object,
        nullish: !!nullish,
        index,
      };
    }, head);
  }

TrueArrayAccess
  = head: Primary tail: (__ '[' _ @Expression _ ']')+ {
    return tail.reduce( (object, index) => {
      return {
        type: 'ArrayAccess',
        object,
        nullish: false,
        index
      };
    }, head);
  }

ArraySlice
  = head: Primary tail: (_ '[' _ @Expression? @(_ ',' _ @Expression)? _ '..' _ @Expression? _ ']')* {
    return tail.reduce( (object, [start, second, end]) => {
      return { type: 'ArraySlice', object, start, second, end };
    }, head);
  }

ScalarMultiple
  = scalar: ScalarLike operator: ' '? quantity: (__ @(Unit / Quantity))? {
    if (quantity) {
      return BinaryExpression(operator ?? ' ', scalar, quantity, false, false);
    }
    if (scalar.type === 'DecimalLiteral') {
      if (scalar.exponent || scalar.flavor) {
        return scalar;
      }
      return {
        type: 'CentsLiteral',
        whole: scalar.whole,
        fractional: scalar.fractional,
      };
    }
    return scalar;
  }

ScalarLike
  = ParenthesizedExpression
  / FractionLiteral
  / NumericLiteral

Quantity
  = WartsLiteral
  / SparseOffsetVal
  / ReciprocalCentLiteral
  / MonzoLiteral
  / ValLiteral
  / DownExpression

Unit
  = HertzLiteral
  / SecondLiteral
  / CentLiteral

Primary
  = Quantity
  / Range
  / ArrayComprehension
  / NoneLiteral
  / TrueLiteral
  / FalseLiteral
  / NedjiLiteral
  / StepLiteral
  / ScalarMultiple
  / ColorLiteral
  / FJS
  / AbsoluteFJS
  / ArrowFunction
  / Identifier
  / ArrayLiteral
  / StringLiteral

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

Comprehension
  = _ ForToken _ element: (Identifier / IdentifierArray) _ OfToken _ array: Expression _ {
    return {
      element,
      array,
    };
  }

ArrayComprehension
  = '[' _ expression: Expression comprehensions: Comprehension+ _ ']' {
    return  {
      type: 'ArrayComprehension',
      expression,
      comprehensions,
    };
  }

DownExpression
  = operators: 'v'+ '{' _ operand: Expression _ '}' {
    return {
      type: 'DownExpression',
      count: operators.length,
      operand,
    };
  }

StepLiteral
  = count: BasicInteger '\\' {
    return {
      type: 'StepLiteral',
      count,
    };
  }

NedjiLiteral
  = numerator: BasicInteger '\\' denominator: PositiveBasicInteger '<' equaveNumerator: PositiveBasicInteger equaveDenominator: ('/' @PositiveBasicInteger)? '>' {
    return {
      type: 'NedjiLiteral',
      numerator,
      denominator,
      equaveNumerator,
      equaveDenominator,
    };
  }
  / numerator: BasicInteger '\\' denominator: PositiveBasicInteger {
    return {
      type: 'NedjiLiteral',
      numerator,
      denominator,
      equaveNumerator: null,
      equaveDenominator: null,
    };
  }

NedjiProjector
  = '<' _ base: Expression _'>' {
    return {
      type: 'NedjiProjector',
      base,
    };
  }

NumericFlavor = 'r' / 'e'i / 'z' / ''

CommaDecimal
  = whole: Integer ',' fractional: $(DecimalDigit+) exponent: ExponentPart? flavor: NumericFlavor {
    return {
      type: 'DecimalLiteral',
      whole: whole ?? 0n,
      fractional: fractional,
      exponent,
      flavor,
    };
  }

NumericLiteral
  = whole: Integer separator: $(!'..' '.')? fractional: UnderscoreDigits exponent: ExponentPart? flavor: NumericFlavor {
    if (separator === '.' || exponent || flavor) {
      return {
        type: 'DecimalLiteral',
        whole,
        fractional,
        exponent,
        flavor,
      }
    }
    return {
      type: 'IntegerLiteral',
      value: whole,
    };
  }
  / !'..' '.' fractional: NonEmptyUnderscoreDigits exponent: ExponentPart? flavor: NumericFlavor {
    return {
      type: 'DecimalLiteral',
      whole: 0n,
      fractional,
      exponent,
      flavor,
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

MonzoLiteral
  = downs: 'v'* '[' _ components: VectorComponents _ '>' basis: ('@' @DotJoinedRationals)? {
    return {
      type: 'MonzoLiteral',
      components,
      ups: -downs.length,
      lifts: 0,
      basis: basis ?? [],
    };
  }

ValLiteral
  = downs: 'v'* '<' _ components: VectorComponents _ ']' basis: ('@' @DotJoinedRationals)? {
    return {
      type: 'ValLiteral',
      components,
      ups: -downs.length,
      lifts: 0,
      basis: basis ?? [],
    };
  }

WartsLiteral
  = equave: [a-z]i? divisions: PositiveBasicInteger warts: [a-z]i* '@' basis: DotJoinedRationals {
    return {
      type: 'WartsLiteral',
      equave: (equave ?? '').toLowerCase(),
      divisions,
      warts: warts.map(w => w.toLowerCase()),
      basis,
    };
  }

PatentTweak
  = wide: ('+' / '^')+ rational: Rational {
    return {
      rational,
      tweak: wide.length,
    };
  }
  / narrow: ('-' / 'v')* rational: Rational {
    return {
      rational,
      tweak: -narrow.length,
    };
  }

PatentTweaks = PatentTweak|.., _ ',' _|

SparseOffsetVal
  = equave: ('[' @Rational ']')? divisions: PositiveBasicInteger tweaks: ('[' _ @PatentTweaks _ ']')? '@' basis: DotJoinedRationals {
    return {
      type: 'SparseOffsetVal',
      equave: equave ?? '',
      divisions,
      tweaks: tweaks ?? [],
      basis,
    }
  }

Rational = $(PositiveInteger ('/' PositiveInteger)?)

DotJoinedRationals = Rational|.., '.'|

CentLiteral
  = (CentToken / '¢') { return { type: 'CentLiteral' }; }

HertzLiteral
  = LowHertzToken {
    return {
      type: 'HertzLiteral',
      prefix: '',
    }
  }
  / prefix: MetricPrefix? (HertzToken / LowHertzToken) {
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
  = sign: '-'? num: PositiveBasicInteger {
    num--;
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

InflectionFlavor = 'n' / ''

PrimeInflections
  = (PositiveBasicInteger InflectionFlavor)|.., ','|

FJS
  = downs: 'v'*
    pythagorean: SplitDemisemipythagorean
    superscripts: ('^' @PrimeInflections)?
    subscripts: ('_' @PrimeInflections)? {
    return {
      type: 'FJS',
      ups: -downs.length,
      lifts: 0,
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
  = nominal: Nominal accidentals: Accidental* octave: SignedBasicInteger {
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
    superscripts: ('^' @PrimeInflections)?
    subscripts: ('_' @PrimeInflections)? {
    return {
      type: 'AbsoluteFJS',
      ups: -downs.length,
      lifts: 0,
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
      text: text(),
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

StringLiteral
  = '"' chars: DoubleStringCharacter* '"' { return { type: 'StringLiteral', value: chars.join('') }; }
  / "'" chars: SingleStringCharacter* "'" { return { type: 'StringLiteral', value: chars.join('') }; }
