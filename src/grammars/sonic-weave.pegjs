// Depends on base.pegjs

{{
  const TYPES_TO_PROPERTY_NAMES = {
    CallExpression: "callee",
    AccessExpression: "object",
    ArraySlice: "object",
  };

  const RESERVED_WORDS = new Set([
    'and',
    'break',
    'by',
    'catch',
    'const',
    'continue',
    'dot',
    'drop',
    'ed',
    'else',
    'false',
    'finally',
    'for',
    'if',
    'in',
    'lest',
    'let',
    'lift',
    'max',
    'min',
    'mod',
    'modc',
    'niente',
    'not',
    'of',
    'or',
    'rd',
    'rdc',
    'return',
    'riff',
    'fn',
    'tmpr',
    'tns',
    'throw',
    'to',
    'try',
    'true',
    'while',
  ]);

  function UpdateExpression(operator, argument) {
    return {
      type: 'UpdateExpression',
      operator,
      argument,
    };
  }

  function UnaryExpression(operator, operand, uniform) {
    return {
      type: 'UnaryExpression',
      operator,
      operand,
      uniform,
    };
  }

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

AndToken           = @'and'      !IdentifierPart
BreakToken         = @'break'    !IdentifierPart
ByToken            = @'by'       !IdentifierPart
CatchToken         = @'catch'    !IdentifierPart
ConstToken         = @'const'    !IdentifierPart
ContinueToken      = @'continue' !IdentifierPart
DotToken           = @'dot'      !IdentifierPart
DropToken          = @'drop'     !IdentifierPart
EdToken            = @'ed'       !IdentifierPart
ElseToken          = @'else'     !IdentifierPart
FalseToken         = @'false'    !IdentifierPart
FinallyToken       = @'finally'  !IdentifierPart
ForToken           = @'for'      !IdentifierPart
IfToken            = @'if'       !IdentifierPart
InToken            = @'in'       !IdentifierPart
LestToken          = @'lest'     !IdentifierPart
LetToken           = @'let'      !IdentifierPart
LiftToken          = @'lift'     !IdentifierPart
MaxToken           = @'max'      !IdentifierPart
MinToken           = @'min'      !IdentifierPart
ModToken           = @'mod'      !IdentifierPart
ModCeilingToken    = @'modc'     !IdentifierPart
NoneToken          = @'niente'   !IdentifierPart
NotToken           = @'not'      !IdentifierPart
OfToken            = @'of'       !IdentifierPart
OrToken            = @'or'       !IdentifierPart
ReduceToken        = @'rd'       !IdentifierPart
ReduceCeilingToken = @'rdc'      !IdentifierPart
ReturnToken        = @'return'   !IdentifierPart
FunctionToken      = @'riff'     !IdentifierPart
FunctionAliasToken = @'fn'       !IdentifierPart
TemperToken        = @'tmpr'     !IdentifierPart
TensorToken        = @'tns'      !IdentifierPart
ThrowToken         = @'throw'    !IdentifierPart
ToToken            = @'to'       !IdentifierPart
TryToken           = @'try'      !IdentifierPart
TrueToken          = @'true'     !IdentifierPart
WhileToken         = @'while'    !IdentifierPart

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
  / BreakStatement
  / ContinueStatement
  / WhileStatement
  / IfStatement
  / IterationStatement
  / TryStatement
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
  / name: AccessExpression tail: ReassignmentTail? EOS {
    if (!tail) {
      return {
        type: 'ExpressionStatement',
        expression: name,
      }
    }
    const {preferLeft, preferRight, operator, value} = tail;
    if (name.type === 'AccessExpression' || name.type === 'ArraySlice' || name.type === 'Identifier') {
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
  = LetToken _ parameters: Parameters EOS {
    return {
      type: 'VariableDeclaration',
      parameters,
      mutable: true,
    };
  }
  / ConstToken _ parameters: ParametersWithDefaults EOS {
    return {
      type: 'VariableDeclaration',
      parameters,
      mutable: false,
    };
  }

FunctionDeclaration
  = (FunctionToken / FunctionAliasToken) _ name: Identifier _ '(' _ parameters: Parameters _ ')' _ body: BlockStatement {
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
  = ('/' / LiftToken) _ '=' _ value: Expression EOS {
    return {
      type: 'LiftDeclaration',
      value,
    };
  }

Parameter
  = identifier: Identifier defaultValue: (_ '=' _ @Expression)? {
    return {
      ...identifier,
      type: 'Parameter',
      defaultValue,
    };
  }

Parameters
  = parameters: (Parameter / ParameterArray)|.., _ ',' _| rest: (_ ','? _ '...' _ @Parameter)? {
    return {
      type: 'Parameters',
      parameters,
      rest,
      defaultValue: null,
    };
  }

ParameterArray
  = '[' _ parameters: Parameters _ ']' defaultValue: (_ '=' _ @Expression)? {
    return {
      ...parameters,
      defaultValue,
    };
  }

ParameterWithDefault
  = identifier: Identifier _ '=' _ defaultValue: Expression {
    return {
      ...identifier,
      type: 'Parameter',
      defaultValue,
    };
  }

ParametersWithDefaults
  = parameters: (ParameterWithDefault / ParameterArrayWithDefault)|.., _ ',' _| {
    return {
      type: 'Parameters',
      parameters,
      defaultValue: null,
    };
  }

ParameterArrayWithDefault
  = '[' _ parameters: Parameters _ ']' _ '=' _ defaultValue: Expression {
    return {
      ...parameters,
      defaultValue,
    };
  }

Identifiers
  = identifiers: (Identifier / IdentifierArray)|.., _ ',' _| rest: (_ ','? _ '...' _ @Identifier)? {
    return {
      type: 'Identifiers',
      identifiers,
      rest,
    }
  }

IdentifierArray = '[' _ @Identifiers _ ']'

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

BreakStatement
  = BreakToken EOS {
    return { type: 'BreakStatement' };
  }

ContinueStatement
  = ContinueToken EOS {
    return { type: 'ContinueStatement' };
  }

WhileStatement
  = WhileToken _ '(' _ test: Expression _ ')' _ body: Statement tail: (_ ElseToken _ @Statement)? {
    return {
      type: 'WhileStatement',
      test,
      body,
      tail,
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

IterationKind = OfToken / InToken

IterationStatement
  = ForToken _ '(' _ LetToken _ element: (Parameter / ParameterArray) _ kind: IterationKind _ container: Expression _ ')' _ body: Statement tail: (_ ElseToken _ @Statement)? {
    return {
      type: 'IterationStatement',
      element,
      kind,
      container,
      body,
      tail,
      mutable: true,
    };
  }
  / ForToken _ '(' _ ConstToken _ element: (Parameter / ParameterArray) _ kind: IterationKind _ container: Expression _ ')' _ body: Statement tail: (_ ElseToken _ @Statement)? {
    return {
      type: 'IterationStatement',
      element,
      kind,
      container,
      body,
      tail,
      mutable: false,
    };
  }

TryStatement
  = TryToken _ body: Statement _ handler: CatchClause _ finalizer: TryFinalizer {
    return {
      type: 'TryStatement',
      body,
      handler,
      finalizer,
    };
  }
  / TryToken _ body: Statement _ handler: CatchClause {
    return {
      type: 'TryStatement',
      body,
      handler,
    };
  }
  / TryToken _ body: Statement _ finalizer: TryFinalizer {
    return {
      type: 'TryStatement',
      body,
      finalizer,
    };
  }

CatchClause
  = CatchToken _ '(' _ parameter: Parameter _ ')' _ body: Statement {
    return {
      type: 'CatchClause',
      parameter,
      body,
    };
  }
  / CatchToken _ body: Statement {
    return {
      type: 'CatchClause',
      body,
    };
  }

TryFinalizer = FinallyToken _ @Statement

EmptyStatement
  = (_ ';' / __ SingleLineComment LineTerminatorSequence) {
    return {
      type: 'EmptyStatement',
    };
  }

ExpressionStatement
  = !("{" / FunctionToken / FunctionAliasToken) expression: (LabeledCommaDecimal / Expression) EOS {
    return {
      type: 'ExpressionStatement',
      expression,
    };
  }

Expression
  = LestExpression

AssigningOperator
  = LestOperator
  / CoalescingOperator
  / ConjunctOperator
  / RoundingOperator
  / ExtremumOperator
  / AdditiveOperator
  / MiscOperator
  / MultiplicativeOperator
  / ExponentiationOperator
  / FractionOperator

LestOperator = LestToken

LestExpression
  = head: ConditionalExpression tail: (__ @LestOperator _ @LestExpression)* {
    return tail.reduce(operatorReducerLite, head);
  }

ConditionalExpression
  = consequent: CoalescingExpression tail: (__ IfToken _ @CoalescingExpression _ ElseToken _ @CoalescingExpression)* {
    return tail.reduce(
      (result, [test, alternate]) => (
        {
          type: 'ConditionalExpression',
          test,
          alternate,
          consequent: result,
        }
      ), consequent
    );
  }

CoalescingOperator = '??' / OrToken

CoalescingExpression
  = head: ConjunctionExpression tail: (__ @CoalescingOperator _ @ConjunctionExpression)* {
    return tail.reduce(operatorReducerLite, head);
  }

ConjunctOperator = AndToken

Conjunct = NotExpression / RelationalExpression

ConjunctionExpression
  = head: NotExpression tail: (__ @ConjunctOperator _ @NotExpression)* {
    return tail.reduce(operatorReducerLite, head);
  }

NotExpression
  = operators: NotToken|.., __| __ operand: RelationalExpression {
    if (!operators.length) {
      return operand;
    }
    if (operators.length & 1) {
      return UnaryExpression('not', operand, false);
    }
    return UnaryExpression('not', UnaryExpression('not', operand, false), false);
  }

RelationalOperator 'relational operator'
  = '==='
  / '!=='
  / '=='
  / '!='
  / '<='
  / '>='
  / '<'
  / '>'
  / OfToken
  / (NotToken __ OfToken) { return 'not of'; }
  / $('~' OfToken)
  / (NotToken __ '~' OfToken) { return 'not ~of'; }
  / InToken
  / (NotToken __ InToken) { return 'not in'; }
  / $('~' InToken)
  / (NotToken __ '~' InToken) { return 'not ~in'; }

RelationalExpression
  = head: RoundingExpression tail: (__ @RelationalOperator __ @RoundingExpression)* {
    return tail.reduce(operatorReducerLite, head);
  }

RoundingOperator
  = ToToken / ByToken

RoundingExpression
  = head: EnumeratedChord tail: (__ @'~'? @RoundingOperator @'~'? _ @EnumeratedChord)* {
    return tail.reduce(operatorReducer, head);
  }

HarmonicSegment
  = root: ExtremumExpression _ '::' _ end: ExtremumExpression {
    return {
      type: 'HarmonicSegment',
      root,
      end,
    };
  }

Enumeral = HarmonicSegment / ExtremumExpression

EnumeratedChord
  = '/' __ enumerals: Enumeral|2.., _ ':' _| {
    return {
      type: 'EnumeratedChord',
      mirror: true,
      enumerals,
    };
  }
  / '/' __ segment: HarmonicSegment {
    return  {
      type: 'EnumeratedChord',
      mirror: true,
      enumerals: [segment],
    };
  }
  / enumerals: Enumeral|1.., _ ':' _| {
    if (enumerals.length === 1) {
      return enumerals[0];
    }
    return {
      type: 'EnumeratedChord',
      mirror: false,
      enumerals,
    };
  }

ExtremumOperator
  = MaxToken / MinToken

ExtremumExpression
  = head: AdditiveExpression tail: (__ @'~'? @ExtremumOperator @'~'? _ @AdditiveExpression)* {
    return tail.reduce(operatorReducer, head);
  }

AdditiveOperator 'additive operator'
  = '+' / '-' / '/+' / '⊕' / '/-' / '⊖'

AdditiveExpression
  = head: Term tail: (__ @'~'? @AdditiveOperator @'~'? _ @Term)* {
    return tail.reduce(operatorReducer, head); 
  }

MiscOperator
  = ModCeilingToken / ModToken / ReduceCeilingToken / ReduceToken / EdToken

Term
  = head: MultiplicativeExpression tail: (__ @'~'? @MiscOperator @'~'? _ @MultiplicativeExpression)* {
    return tail.reduce(operatorReducer, head); 
  }

MultiplicativeOperator 'multiplicative operator'
  = '*' / '×' / '%' / '÷' / '\\' / '°' / '·' / DotToken / '⊗' / TensorToken / TemperToken

MultiplicativeExpression
  = head: UniformUnaryExpression tail: (__ @'~'? @MultiplicativeOperator @'~'? _ @UniformUnaryExpression)* {
    return tail.reduce(operatorReducer, head);
  }

UniformUnaryOperator
  = '-' / '%' / '÷'

UniformUnaryExpression
  = operator: '--' argument: ExponentiationExpression {
    return UpdateExpression(operator, argument, true);
  }
  / operator: UniformUnaryOperator '~' operand: ExponentiationExpression {
    return UnaryExpression(operator, operand, true);
  }
  / operator: UniformUnaryOperator? operand: ExponentiationExpression {
    if (operator) {
      return UnaryExpression(operator, operand, false);
    }
    return operand;
  }

ExponentiationOperator 'exponentiation'
  = '^/' / '^' / '/_' / '/^'

ExponentiationExpression
  = head: FractionExpression tail: (__ @'~'? @ExponentiationOperator !(FJS / AbsoluteFJS) @'~'? _ @ExponentiationExpression)* {
      return tail.reduce(operatorReducer, head);
    }

// Not comment or any of the the extended operators
FractionOperator = @'/' !'/' !'-' !'+' !'_' !'^'

FractionExpression
  = head: UnaryExpression tail: (__ @'~'? @FractionOperator @'~'? _ @UnaryExpression)* {
    return tail.reduce(operatorReducer, head);
  }

ChainableUnaryOperator
  = '^' / '∧' / '\u2228' / '/' / LiftToken / '\\' / DropToken

// The precedence between exponentiation and fractions is a bit uneasy.
// Uniform unary operators make a seccond appearance here to be valid right operands for exponentiation and fractions.
UnaryExpression
  = operator: UniformUnaryOperator uniform: '~'? operand: LabeledExpression {
    return UnaryExpression(operator, operand, !!uniform);
  }
  / operator: ChainableUnaryOperator __ operand: (LabeledExpression / UnaryExpression) {
    return UnaryExpression(operator, operand, false);
  }
  / operator: ('--' / '++' / '+')? operand: LabeledExpression {
    if (operator === '+') {
      return UnaryExpression(operator, operand, false);
    } else if (operator) {
      return UpdateExpression(operator, operand);
    }
    return operand;
  }

LabelObject = CallExpression / AccessExpression

Labels
  = (CallExpression / TrueAccessExpression / Identifier / TemplateArgument / ColorLiteral / StringLiteral / NoneLiteral)|1.., __|

LabeledExpression
  = object: LabelObject labels: (' ' __ @Labels)? {
    if (labels) {
      return {
        type: 'LabeledExpression',
        object,
        labels,
      };
    }
    return object;
  }

LabeledCommaDecimal
  = __ object: CommaDecimal labels: (' ' __ @Labels)? {
    if (labels) {
      return {
        type: 'LabeledExpression',
        object,
        labels,
      };
    }
    return object;
  }

CallExpression
  = head: (
    callee: AccessExpression __ '(' _ args: ArgumentList _ ')' {
      return { type: 'CallExpression', callee, args };
    }
  ) tail: (
    __ '(' _ args: ArgumentList _ ')' {
      return { type: 'CallExpression', args };
    }
    / __ '[' _ key: Expression _ ']' {
      return { type: 'AccessExpression', key };
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

AccessExpression
  = head: ArraySlice tail: (__ @('~'?) '[' _ @Expression _ ']')* {
    return tail.reduce( (object, [nullish, key]) => {
      return {
        type: 'AccessExpression',
        object,
        nullish: !!nullish,
        key,
      };
    }, head);
  }

TrueAccessExpression
  = head: Primary tail: (__ '[' _ @Expression _ ']')+ {
    return tail.reduce( (object, key) => {
      return {
        type: 'AccessExpression',
        object,
        nullish: false,
        key
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
  = scalar: ScalarLike operator: ' ' __ quantity: (Unit / Quantity) {
    return BinaryExpression(operator, scalar, quantity, false, false);
  }
  / scalar: ScalarLike quantity: (Unit / Quantity)? {
    if (quantity) {
      return BinaryExpression(' ', scalar, quantity, false, false);
    }
    if (scalar.type === 'DecimalLiteral') {
      if (scalar.exponent || scalar.flavor) {
        return scalar;
      }
      return {
        type: 'CentsLiteral',
        sign: scalar.sign,
        whole: scalar.whole,
        fractional: scalar.fractional,
        exponent: null,
        real: false,
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
  / ArrowFunction
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
  / SquareSuperparticular
  / Identifier
  / TemplateArgument
  / ArrayLiteral
  / RecordLiteral
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
  = _ ForToken _ element: (Parameter / ParameterArray) _ kind: IterationKind _ container: Expression _ {
    return {
      element,
      kind,
      container,
    };
  }

ArrayComprehension
  = '[' _ expression: Expression comprehensions: Comprehension+ _ test: (IfToken _ @Expression)? _ ']' {
    return  {
      type: 'ArrayComprehension',
      expression,
      comprehensions,
      test,
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
  = count: BasicInteger ('\\' / '°') __ denominator: (ParenthesizedExpression / CallExpression / TrueAccessExpression / Identifier / TemplateArgument)? {
    if (denominator) {
      return BinaryExpression(
        '\\',
        {
          type: 'IntegerLiteral',
          value: BigInt(count),
        },
        denominator,
        false,
        false
      );
    }
    return {
      type: 'StepLiteral',
      count,
    };
  }

NedjiLiteral
  = numerator: BasicInteger ('\\' / '°') denominator: PositiveBasicInteger '<' equaveNumerator: PositiveBasicInteger equaveDenominator: ('/' @PositiveBasicInteger)? '>' {
    return {
      type: 'NedjiLiteral',
      numerator,
      denominator,
      equaveNumerator,
      equaveDenominator,
    };
  }
  / numerator: BasicInteger ('\\' / '°') denominator: PositiveBasicInteger {
    return {
      type: 'NedjiLiteral',
      numerator,
      denominator,
      equaveNumerator: null,
      equaveDenominator: null,
    };
  }

NumericFlavor = 'r' / 'e'i / 'z' / ''

CommaDecimal
  = sign: SignPart whole: Integer? ',' fractional: $(DecimalDigit+) exponent: ExponentPart? flavor: NumericFlavor {
    return {
      type: 'DecimalLiteral',
      sign,
      whole: whole ?? 0n,
      fractional: fractional,
      exponent,
      flavor,
    };
  }

NumericLiteral
  = sign: SignPart whole: Integer separator: (!'..' @'.')? fractional: UnderscoreDigits exponent: ExponentPart? flavor: NumericFlavor {
    if (separator === '.' || exponent || flavor) {
      return {
        type: 'DecimalLiteral',
        sign,
        whole,
        fractional,
        exponent,
        flavor,
      }
    }
    return {
      type: 'IntegerLiteral',
      value: sign === '-' ? -whole : whole,
    };
  }
  / !'..' sign: SignPart '.' fractional: NonEmptyUnderscoreDigits exponent: ExponentPart? flavor: NumericFlavor {
    return {
      type: 'DecimalLiteral',
      sign,
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

UpsAndDowns 'up-and-down'
  = ('^' / 'v' / '/' / '\\')* {
    const t = text();
    return {
      ups: (t.match(/\^/g) ?? []).length - (t.match(/v/g) ?? []).length,
      lifts: (t.match(/\//g) ?? []).length - (t.match(/\\/g) ?? []).length,
    };
  }

MonzoLiteral
  = upsAndDowns: UpsAndDowns '[' _ components: VectorComponents _ [>⟩] basis: ('@' @SubgroupBasis)? {
    return {
      ...upsAndDowns,
      type: 'MonzoLiteral',
      components,
      basis: basis ?? [],
    };
  }

ValLiteral
  = [<⟨] _ components: VectorComponents _ ']' basis: ('@' @ValBasis)? {
    return {
      type: 'ValLiteral',
      components,
      basis: basis ?? [],
    };
  }

WartsLiteral
  = equave: [a-z]i? divisions: PositiveBasicInteger warts: [a-z]i* '@' basis: WartBasis {
    return {
      type: 'WartsLiteral',
      equave: (equave ?? '').toLowerCase(),
      divisions,
      warts: warts.map(w => w.toLowerCase()),
      basis,
    };
  }

PatentTweak
  = wide: ('+' / '^')+ element: Fraction {
    return {
      element,
      tweak: wide.length,
    };
  }
  / narrow: ('-' / 'v')* element: Fraction {
    return {
      element,
      tweak: -narrow.length,
    };
  }

PatentTweaks = PatentTweak|.., _ ',' _|

SparseOffsetVal
  = equave: ('[' @Fraction ']')? divisions: PositiveBasicInteger tweaks: ('[' _ @PatentTweaks _ ']')? '@' basis: WartBasis {
    return {
      type: 'SparseOffsetVal',
      equave: equave ?? '',
      divisions,
      tweaks: tweaks ?? [],
      basis,
    }
  }

WartBasis = (Fraction / '')|.., '.'|

CentLiteral
  = real: 'r'? (CentToken / '¢') { return { type: 'CentLiteral', real: !!real }; }

HertzLiteral
  = LowHertzToken {
    return {
      type: 'HertzLiteral',
      prefix: '',
    }
  }
  / prefix: (BinaryPrefix / MetricPrefix)? (HertzToken / LowHertzToken) {
    return {
      type: 'HertzLiteral',
      prefix,
    };
  }

SecondLiteral
  = prefix: (BinaryPrefix / MetricPrefix)? SecondToken {
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

VulgarFraction 'vulgar fraction'
  = '¼' / 'q' / '½' / 's' / '¾' / 'Q' / [⅐-⅞] / ''

AugmentedToken 'augmented quality'
  = 'dim' / 'aug' / 'Aug' / [daÂ]

AugmentedQuality
  = fraction: VulgarFraction quality: AugmentedToken {
    return {
      fraction,
      quality,
    };
  }

ImperfectQuality
  = 'n' {
    return {
      fraction: '',
      quality: 'n',
    };
  }
  / fraction: VulgarFraction quality: [mM] {
    return {
      fraction,
      quality,
    };
  }

// Neutral is mid or ~ from ups-and-downs
MidQuality
  = quality: ('P' / 'n') {
  return {
    fraction: '',
    quality,
  };
}

PerfectQuality
  = 'P' {
  return {
    fraction: '',
    quality: 'P',
  };
}

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

SplitPythagorean
  = quality: AugmentedQuality augmentations: AugmentedToken* degree: (HalfDegree / ImperfectDegree) {
    return {
      type: 'Pythagorean',
      quality,
      augmentations,
      degree,
      imperfect: true,
    };
  }
  / quality: AugmentedQuality augmentations: AugmentedToken* degree: (MidDegree / PerfectDegree) {
    return {
      type: 'Pythagorean',
      quality,
      augmentations,
      degree,
      imperfect: false,
    };
  }
  / quality: ImperfectQuality degree: (HalfDegree / ImperfectDegree) {
    return {
      type: 'Pythagorean',
      quality,
      degree,
      imperfect: true,
    };
  }
  / quality: MidQuality degree: MidDegree {
    return {
      type: 'Pythagorean',
      quality,
      degree,
      imperfect: false,
    };
  }
  / quality: PerfectQuality degree: PerfectDegree {
    return {
      type: 'Pythagorean',
      quality,
      degree,
      imperfect: false,
    };
  }

InflectionFlavor = 'n' / 'l' / 'h' / 'm' / 's' / 'f' / 'c' / 'q' / 't' / ''

Inflections
  = (BasicInteger InflectionFlavor)|.., ','|

Superscripts
  = '^' inflections: Inflections {
    return {
      type: 'Superscript',
      inflections,
    };
  }

Subscripts
  = [_v] inflections: Inflections {
    return {
      type: 'Subscript',
      inflections,
    };
  }

Hyperscripts
  = hyperscripts: (Superscripts / Subscripts)* {
    const superscripts = [];
    const subscripts = [];
    for (const h of hyperscripts) {
      if (h.type === 'Superscript') {
        superscripts.push(...h.inflections);
      } else {
        subscripts.push(...h.inflections);
      }
    }
    return {
      superscripts,
      subscripts,
    };
  }

FJS
  = upsAndDowns: UpsAndDowns
    pythagorean: SplitPythagorean
    hyperscripts: Hyperscripts {
    return {
      ...upsAndDowns,
      type: 'FJS',
      pythagorean,
      superscripts: hyperscripts.superscripts,
      subscripts: hyperscripts.subscripts,
    };
  }

AccidentalSign
  = '𝄪' / '𝄫' / '𝄲' / '𝄳' / [x♯#‡t♮=d♭b&@rp¤£]

Accidental 'accidental'
  = fraction: VulgarFraction accidental: AccidentalSign  {
    return {
      fraction,
      accidental,
    };
  }

PitchNominal 'pitch nominal'
  = 'alpha' / 'beta' / 'gamma' / 'delta' / 'epsilon' / 'zeta' / 'eta' / 'phi' / 'chi' / 'psi' / 'omega' / [\u03B1-ηφ-ωA-G]

AbsolutePitch
  = nominal: PitchNominal accidentals: Accidental* octave: SignedBasicInteger {
    return {
      type: 'AbsolutePitch',
      nominal,
      accidentals,
      octave,
    };
  }

AbsoluteFJS
  = upsAndDowns: UpsAndDowns
    pitch: AbsolutePitch
    hyperscripts: Hyperscripts {
    return {
      ...upsAndDowns,
      type: 'AbsoluteFJS',
      pitch,
      superscripts: hyperscripts.superscripts,
      subscripts: hyperscripts.subscripts,
    };
  }

SquareSuperparticular
  = 'S' start: Integer end: ('..' @Integer)? {
    return {
      type: 'SquareSuperparticular',
      start,
      end,
    };
  }

ArrowFunction
  = '(' _ parameters: Parameters _ ')' _ '=>' _ expression: Expression {
    return {
      type: 'ArrowFunction',
      parameters,
      expression,
      text: text(),
    };
  }
  / parameters: Parameters _ '=>' _ expression: Expression {
    return {
      type: 'ArrowFunction',
      parameters,
      expression,
      text: text(),
    };
  }

// This rule is a faster version of the part of (FJS / AbsoluteFJS / SquareSuperparticular) which overlaps with identifiers.
ReservedPattern
  = [sqQ]? (AugmentedToken+ / [mMnP]) [0-9]+ ([_v] [0-9])*
  / PitchNominal [sqQxdbrp]* [0-9]+ ([_v] [0-9])*
  / 'S' [0-9]+

ValidIdentifierName
  = @word:IdentifierName &{
    return !RESERVED_WORDS.has(word)
  }

Identifier
  = &IdentifierStart !ReservedPattern id: ValidIdentifierName {
    return {
      type: 'Identifier',
      id,
    };
  }

TemplateArgument
  = '£' index: BasicInteger {
    return {
      type: 'TemplateArgument',
      index,
    };
  }

ArrayLiteral
  = '[' _ elements: ArgumentList _ ']' {
    return {
      type: 'ArrayLiteral',
      elements,
    }
  }

RecordLiteral
  = '{' _ '}' {
    return {
      type: 'RecordLiteral',
      properties: [],
    };
  }
  / '{' _ properties: PropertyNameAndValueList _ (',' _)? '}' {
    return {
      type: 'RecordLiteral',
      properties,
    };
  }

PropertyNameAndValueList
  = head: PropertyAssignment tail: (_ ',' _ @PropertyAssignment)* {
    return tail.concat([head]);
  }

PropertyAssignment
  = key: PropertyName _ ':' _ value: Expression {
    if (key.type === 'StringLiteral') {
      key = key.value;
    } else if (key.type === 'Identifier') {
      key = key.id;
    }
    return [key, value];
  }
  / identifier: Identifier {
    return [identifier.id, identifier];
  }
  / '...' __ spread: Expression {
    return [null, spread];
  }

PropertyName
  = StringLiteral / Identifier

ParenthesizedExpression
  = '(' _ @Expression _ ')'

MetricPrefix
  = [QRYZEPTGMkhdcmµnpfazyrq] / 'da' / ''

// Note: According to Wikipedia Ri and Qi are still under review.
BinaryPrefix
  = $([KMGTPEZYRQ] 'i')

StringLiteral
  = '"' chars: DoubleStringCharacter* '"' { return { type: 'StringLiteral', value: chars.join('') }; }
  / "'" chars: SingleStringCharacter* "'" { return { type: 'StringLiteral', value: chars.join('') }; }
