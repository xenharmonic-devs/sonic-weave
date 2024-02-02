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
LogToken           = '/_'     !IdentifierPart
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
SecondToken        = 's'      !IdentifierPart
TensorToken        = 'tns'    !IdentifierPart
ThrowToken         = 'throw'  !IdentifierPart
ToToken            = 'to'     !IdentifierPart
TrueToken          = 'true'   !IdentifierPart
WhileToken         = 'while'  !IdentifierPart

ReservedWord
  = AndToken
  / ByToken
  / CentToken
  / ConstToken
  / DotToken
  / ElseToken
  / FalseToken
  / ForToken
  / HertzToken
  / LowHertzToken
  / IfToken
  / LetToken
  / LogToken
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
  = FunctionToken _ name: Identifier _ parameters: Parameters _ body: BlockStatement {
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
  = !("{" / FunctionToken) expression: (LabeledCommaDecimal / Expression) EOS {
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
  = $('^' / LogToken / '/^')

ExponentiationExpression
  = head: LabeledExpression tail: (__ @'~'? @ExponentiationOperator !(FJS / AbsoluteFJS) @'~'? _ @ExponentiationExpression)* {
      return tail.reduce(operatorReducer, head);
    }

Labels
  = (CallExpression / TrueArrayAccess / Identifier / ColorLiteral / StringLiteral)|.., _|

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
    / __ '[' index: Expression ']' {
      return { type: 'ArrayAccess', index };
    }
    / __ '[' start: Expression? second: (',' @Expression)? '..' end: Expression? ']' {
      return { type: 'ArraySlice', start, second, end };
    }
  )* {
    return tail.reduce((result, element) => {
      element[TYPES_TO_PROPERTY_NAMES[element.type]] = result;

      return element;
    }, head);
  }

ArrayAccess
  = head: ArraySlice tail: (__ @('~'?) '[' @Expression ']')* {
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
  = head: Primary tail: (__ '[' @Expression ']')+ {
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
  = head: Primary tail: (_ '[' @Expression? @(',' @Expression)? '..' @Expression? ']')* {
    return tail.reduce( (object, [start, second, end]) => {
      return { type: 'ArraySlice', object, start, second, end };
    }, head);
  }

ScalarMultiple
  = scalar: ScalarLike operator: ' '? quantity: (__ @Quantity)? {
    if (operator && quantity) {
      return BinaryExpression(operator, scalar, quantity, false, false);
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
  / PlusMinusVal
  / HertzLiteral
  / SecondLiteral
  / CentLiteral
  / ReciprocalCentLiteral
  / MonzoLiteral
  / ValLiteral
  / DownExpression

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
  = '[' start: Expression '..' end: Expression ']' {
    return {
      type: 'Range',
      start,
      end,
    };
  }

StepRange
  = '[' start: Expression ',' second: Expression '..' end: Expression ']' {
    return {
      type: 'Range',
      start,
      second,
      end,
    };
  }

Range = StepRange / UnitStepRange

ArrayComprehension
  = '[' expression: Expression ForToken _ element: (Identifier / IdentifierArray) _ OfToken _ array: Expression ']' {
    return  {
      type: 'ArrayComprehension',
      expression,
      element,
      array,
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
  = downs: 'v'* '[' _ components: VectorComponents _ '>' {
    return {
      type: 'MonzoLiteral',
      components,
      ups: -downs.length,
      lifts: 0,
    };
  }

ValLiteral
  = downs: 'v'* '<' _ components: VectorComponents _ ']' {
    return {
      type: 'ValLiteral',
      components,
      ups: -downs.length,
      lifts: 0,
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

PlusMinusVal
  = equave: ('[' @Rational ']')? divisions: PositiveBasicInteger tweaks: ('[' _ @PatentTweaks _ ']')? '@' basis: DotJoinedRationals {
    return {
      type: 'PlusMinusVal',
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
