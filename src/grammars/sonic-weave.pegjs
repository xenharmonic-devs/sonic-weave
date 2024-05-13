// Depends on base.pegjs and mos.pegjs

{{
  const TYPES_TO_PROPERTY_NAMES = {
    CallExpression: "callee",
    AccessExpression: "object",
    ArraySlice: "object",
  };

  const RESERVED_WORDS = new Set([
    'abs',
    'al',
    'and',
    'as',
    'break',
    'by',
    'catch',
    'const',
    'continue',
    'defer',
    'dot',
    'drop',
    'ed',
    'else',
    'export',
    'false',
    'finally',
    'fn',
    'for',
    'from',
    'if',
    'import',
    'in',
    'inf',
    'labs',
    'lest',
    'let',
    'lift',
    'max',
    'mdot',
    'min',
    'mod',
    'modc',
    'module',
    'MOS',
    'nan',
    'niente',
    'not',
    'of',
    'or',
    'rd',
    'rdc',
    'return',
    'riff',
    'sof',
    'tmpr',
    'tns',
    'throw',
    'to',
    'try',
    'true',
    'vand',
    'vdot',
    'vnot',
    'vor',
    'where',
    'while',
    // Future reserved words
    'case',
    'debugger',
    'default',
    'delete',
    'match',
    'yield',
  ]);

  const PERFECT_DEGREES = new Set([1, 4, 5, 1.5, 4.5, 7.5]);
  const MID_DEGREES = new Set([4, 5, 1.5, 7.5]);
  const IMPERFECT_DEGREES = new Set([2, 3, 6, 7, 2.5, 3.5, 5.5, 6.5]);

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

  function processCallTail(head, tail) {
    let result = head;
    for (const element of tail) {
      element[TYPES_TO_PROPERTY_NAMES[element.type]] = result;
      result = element;
    }
    return result;
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

AbsToken           = @'abs'      !IdentifierPart
AlToken            = @'al'       !IdentifierPart
AndToken           = @'and'      !IdentifierPart
AsToken            = @'as'       !IdentifierPart
BreakToken         = @'break'    !IdentifierPart
ByToken            = @'by'       !IdentifierPart
CatchToken         = @'catch'    !IdentifierPart
ConstToken         = @'const'    !IdentifierPart
ContinueToken      = @'continue' !IdentifierPart
DeferToken         = @'defer'    !IdentifierPart
DotToken           = @'dot'      !IdentifierPart
DropToken          = @'drop'     !IdentifierPart
EdToken            = @'ed'       !IdentifierPart
ElseToken          = @'else'     !IdentifierPart
ExportToken        = @'export'   !IdentifierPart
FalseToken         = @'false'    !IdentifierPart
FinallyToken       = @'finally'  !IdentifierPart
ForToken           = @'for'      !IdentifierPart
FromToken          = @'from'     !IdentifierPart
IfToken            = @'if'       !IdentifierPart
ImportToken        = @'import'   !IdentifierPart
InToken            = @'in'       !IdentifierPart
InfinityToken      = @'inf'      !IdentifierPart
LogAbsToken        = @'labs'     !IdentifierPart
LestToken          = @'lest'     !IdentifierPart
LetToken           = @'let'      !IdentifierPart
LiftToken          = @'lift'     !IdentifierPart
MaxToken           = @'max'      !IdentifierPart
MatrixDotToken     = @'mdot'     !IdentifierPart
MinToken           = @'min'      !IdentifierPart
ModToken           = @'mod'      !IdentifierPart
ModCeilingToken    = @'modc'     !IdentifierPart
ModuleToken        = @'module'   !IdentifierPart
NotANumberToken    = @'nan'      !IdentifierPart
NoneToken          = @'niente'   !IdentifierPart
NotToken           = @'not'      !IdentifierPart
OfToken            = @'of'       !IdentifierPart
OrToken            = @'or'       !IdentifierPart
ReduceToken        = @'rd'       !IdentifierPart
ReduceCeilingToken = @'rdc'      !IdentifierPart
ReturnToken        = @'return'   !IdentifierPart
FunctionToken      = @'riff'     !IdentifierPart
FunctionAliasToken = @'fn'       !IdentifierPart
StepsOfToken       = @'sof'      !IdentifierPart
TemperToken        = @'tmpr'     !IdentifierPart
TensorToken        = @'tns'      !IdentifierPart
ThrowToken         = @'throw'    !IdentifierPart
ToToken            = @'to'       !IdentifierPart
TryToken           = @'try'      !IdentifierPart
TrueToken          = @'true'     !IdentifierPart
VectorAndToken     = @'vand'     !IdentifierPart
VectorDotToken     = @'vdot'     !IdentifierPart
VectorNotToken     = @'vnot'     !IdentifierPart
VectorOrToken      = @'vor'      !IdentifierPart
WhereToken         = @'where'    !IdentifierPart
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
  / DeferStatement
  / ModuleDeclaration
  / ExportConstantStatement
  / ExportFunctionStatement
  / ExportAllStatement
  / ImportAllStatement
  / ImportStatement
  / MosDeclaration
  / MosUndeclaration
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
  = &SourceCharacter name: IdentifierArray _ '=' _ value: Expression EOS {
    return {
      type: 'AssignmentStatement',
      name,
      value,
    };
  }
  / &SourceCharacter name: AccessExpression tail: ReassignmentTail? EOS {
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
    } else if (preferLeft) {
      return {
        type: 'ExpressionStatement',
        expression: BinaryExpression('~=', name, value, false, false)
      };
    }
    return {
      type: 'PitchDeclaration',
      left: name,
      right: value,
    };
  }

VariableDeclaration
  = LetToken _ parameters: NonEmptyParameters EOS {
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
  = &SourceCharacter left: AbsoluteFJS middle: (_ '=' _ @Expression)? right: (_ '=' _ @Expression)? EOS {
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

NonEmptyParameters
  = parameters: (Parameter / ParameterArray)|1.., _ ',' _| rest: (_ ','? _ '...' _ @Parameter)? {
    return {
      type: 'Parameters',
      parameters,
      rest,
      defaultValue: null,
    };
  }
  / '...' _ rest: Parameter {
    return {
      type: 'Parameters',
      parameters: [],
      rest,
      defaultValue: null,
    }
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
  = parameters: (ParameterWithDefault / ParameterArrayWithDefault)|1.., _ ',' _| {
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
  = (@(Argument|.., _ ',' _|) _ ','?)

BlockStatement
  = '{' _ body: Statements? _ '}' {
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

DeferStatement
  = DeferToken _ body: Statement {
    return {
      type: 'DeferStatement',
      body,
    };
  }

ModuleDeclaration
  = ModuleToken _ name: Identifier _ body: BlockStatement {
    return {
      type: 'ModuleDeclaration',
      name: name.id,
      body: body.body,
    }
  }

ExportConstantStatement
  = ExportToken _ ConstToken _ parameter: ParameterWithDefault EOS {
    return {
      type: 'ExportConstantStatement',
      parameter,
    };
  }

ExportFunctionStatement
  = ExportToken _ riff: FunctionDeclaration {
    return {
      ...riff,
      type: 'ExportFunctionStatement',
    };
  }

ExportAllStatement
  = ExportToken _ '*' _ FromToken _ name: Identifier EOS {
    return {
      type: 'ExportAllStatement',
      module: name.id,
    };
  }

ImportElement
  = name: Identifier alias: (_ AsToken _ @Identifier)? {
    return {
      type: 'ImportElement',
      id: name.id,
      alias: alias && alias.id,
    };
  }

ImportStatement
  = ImportToken _ elements: ImportElement|1.., _ ',' _| _ FromToken _ name: Identifier EOS {
  return {
    type: 'ImportStatement',
    elements,
    module: name.id,
  };
}

ImportAllStatement
  = ImportToken _ '*' _ FromToken _ name: Identifier EOS {
    return {
      type: 'ImportAllStatement',
      module: name.id,
    };
  }

EmptyStatement
  = (_ ';' / __ SingleLineComment LineTerminatorSequence) {
    return {
      type: 'EmptyStatement',
    };
  }

ExpressionStatement
  = &SourceCharacter !(FunctionToken / FunctionAliasToken) expression: (LabeledCommaDecimal / Expression) EOS {
    return {
      type: 'ExpressionStatement',
      expression,
    };
  }

Expression
  = LestExpression

AssigningOperator
  = CoalescingOperator
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
  = consequent: CoalescingExpression tail: (__ @(IfToken / WhereToken) _ @CoalescingExpression _ ElseToken _ @CoalescingExpression)* {
    if (!tail.length) {
      return consequent;
    }
    const [kind, test, alternate] = tail.pop();
    let result = {
      type: 'ConditionalExpression',
      kind,
      test,
      alternate,
    };
    while (tail.length) {
      const [kind, test, alternate] = tail.pop();
      result.consequent = alternate;
      result = {
        type: 'ConditionalExpression',
        kind,
        test,
        alternate: result,
      };
    }
    result.consequent = consequent;
    return result;
  }

CoalescingOperator = AlToken / OrToken / VectorOrToken

CoalescingExpression
  = head: ConjunctionExpression tail: (__ @CoalescingOperator _ @ConjunctionExpression)* {
    return tail.reduce(operatorReducerLite, head);
  }

ConjunctOperator = AndToken / VectorAndToken

Conjunct = NotExpression / RelationalExpression

ConjunctionExpression
  = head: NotExpression tail: (__ @ConjunctOperator _ @NotExpression)* {
    return tail.reduce(operatorReducerLite, head);
  }

NotExpression
  = operators: (NotToken / VectorNotToken)|.., __| __ operand: RelationalExpression {
    return operators.reduce((result, operator) => UnaryExpression(operator, result, false), operand);
  }

RelationalOperator 'relational operator'
  = '=='
  / '<>'
  / '~='
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
  = '*' / '×' / '%' / '÷' / '\\' / StepsOfToken / '·' / DotToken / MatrixDotToken / VectorDotToken / '⊗' / TensorToken / TemperToken

MultiplicativeExpression
  = head: UniformUnaryExpression tail: (__ @'~'? @MultiplicativeOperator @'~'? _ @UniformUnaryExpression)* {
    return tail.reduce(operatorReducer, head);
  }

// The radical is universal, but featured here for precedence.
UniformUnaryOperator
  = '-' / '%' / '÷' / (@AbsToken _) / (@LogAbsToken _) / '√'

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
  = operator: UniformUnaryOperator uniform: '~'? operand: ImplicitCallExpression {
    return UnaryExpression(operator, operand, !!uniform);
  }
  / operator: ChainableUnaryOperator __ operand: (ImplicitCallExpression / UnaryExpression) {
    return UnaryExpression(operator, operand, false);
  }
  / operator: ('--' / '++' / '+')? operand: ImplicitCallExpression {
    if (operator === '+') {
      return UnaryExpression(operator, operand, false);
    } else if (operator) {
      return UpdateExpression(operator, operand);
    }
    return operand;
  }

// Val literals must be excluded to keep comparisons working
ImplicitCallExpression
  = head: CallExpression tail: (@' ' __ !'<' @CallExpression)* {
    return tail.reduce(operatorReducerLite, head);
  }

// Comma decimal labeling uses implicit calling, but with a limited selection
Label
  = TrueCallExpression / TrueAccessExpression / Identifier / TemplateArgument / ColorLiteral / StringLiteral / NoneLiteral

LabeledCommaDecimal
  = __ object: CommaDecimal labels: (@' ' __ @Label)* {
    return labels.reduce(operatorReducerLite, object);
  }

RangeDotsPenultimate = '..' _ penultimate: '<'? {
  return !!penultimate;
}

CallTail
  = head: (__ '(' _ @ArgumentList _ ')')
    tail: (
      __ '(' _ args: ArgumentList _ ')' {
        return { type: 'CallExpression', args };
      }
      / __ '[' _ key: Expression _ ']' {
        return { type: 'AccessExpression', key };
      }
      / __ '[' _ start: Expression? _ second: (',' _ @Expression)? _ penultimate: RangeDotsPenultimate _ end: Expression? _ ']' {
        return { type: 'ArraySlice', start, second, penultimate, end };
      }
    )* {
      tail.unshift({ type: 'CallExpression', args: head});
      return tail;
    }

CallExpression
  = head: AccessExpression tail: CallTail? {
    if (tail) {
      return processCallTail(head, tail);
    }
    return head;
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

TrueCallExpression
  = head: AccessExpression tail: CallTail {
    return processCallTail(head, tail);
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
  = head: Primary tail: (_ '[' _ @Expression? @(_ ',' _ @Expression)? _ @RangeDotsPenultimate _ @Expression? _ ']')* {
    return tail.reduce( (object, [start, second, penultimate, end]) => {
      return { type: 'ArraySlice', object, start, second, penultimate, end };
    }, head);
  }

ScalarMultiple
  = scalar: Scalar unit: (__ @Unit)? {
    if (unit) {
      return BinaryExpression('×', scalar, unit, false, false);
    }
    if (scalar.type === 'DecimalLiteral') {
      if (scalar.exponent !== null || scalar.flavor) {
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

Scalar
  = FractionLiteral
  / NumericLiteral

Unit
  = HertzLiteral
  / SecondLiteral
  / CentLiteral

Quantity
  = WartsLiteral
  / SparseOffsetVal
  / ReciprocalCentLiteral
  / ReciprocalLogarithmicHertzLiteral
  / MonzoLiteral
  / ValLiteral
  / DownExpression

Primary
  = ArrowFunction
  / ParenthesizedExpression
  / Quantity
  / Range
  / ArrayComprehension
  / NoneLiteral
  / TrueLiteral
  / FalseLiteral
  / NotANumberLiteral
  / InfinityLiteral
  / NedjiLiteral
  / StepLiteral
  / ScalarMultiple
  / ColorLiteral
  / SquareSuperparticular
  / MosStepLiteral
  / FJS
  / AbsoluteFJS
  / Identifier
  / TemplateArgument
  / ArrayLiteral
  / RecordLiteral
  / StringLiteral

UnitStepRange
  = '[' _ start: Expression _ penultimate: RangeDotsPenultimate _ end: Expression _ ']' {
    return {
      type: 'Range',
      start,
      penultimate,
      end,
    };
  }

StepRange
  = '[' _ start: Expression _ ',' _ second: Expression _ penultimate: RangeDotsPenultimate _ end: Expression _ ']' {
    return {
      type: 'Range',
      start,
      second,
      penultimate,
      end,
    };
  }

Range = StepRange / UnitStepRange

Comprehension
  = _ ForToken _ element: (Parameter / ParameterArray) _ kind: IterationKind _ container: Expression {
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
  = count: BasicInteger '°' {
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
  = whole: Integer separator: (!'..' @'.')? fractional: UnderscoreDigits exponent: ExponentPart? flavor: NumericFlavor {
    if (separator === '.' || exponent !== null || flavor) {
      return {
        type: 'DecimalLiteral',
        sign: '',
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
      sign: '',
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

ReciprocalLogarithmicHertzLiteral
  = '¶' { return { type: 'ReciprocalLogarithmicHertzLiteral' }; }

NoneLiteral
  = NoneToken { return { type: 'NoneLiteral' }; }

TrueLiteral
  = TrueToken { return { type: 'TrueLiteral' }; }

FalseLiteral
  = FalseToken { return { type: 'FalseLiteral' }; }

NotANumberLiteral
  = NotANumberToken { return { type: 'NotANumberLiteral' }; }

InfinityLiteral
  = InfinityToken { return { type: 'InfinityLiteral' }; }

// RGB and HSL use modern CSS syntax, no legacy support
ColorLiteral
  = value: (@RGB8 / @RGB4) {
    return {
      type: 'ColorLiteral',
      value,
    };
  }
  / 'rgb' 'a'? '(' __ CSSNumber '%'? __ CSSNumber '%'? __ CSSNumber '%'? (__ '/' __ __ CSSNumber '%'?)? __ ')' {
    return {
      type: 'ColorLiteral',
      value: text(),
    };
  }
  / 'hsl' 'a'? '(' __ CSSNumber 'deg'? __ CSSNumber '%'? __ CSSNumber '%'? (__ '/' __ CSSNumber '%'?)? __ ')' {
    return {
      type: 'ColorLiteral',
      value: text(),
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
  = sign: '-'? num: PositiveBasicInteger half: ('½' / '.5')? {
    num = num - 1 + (half ? 0.5 : 0);
    return {
      negative: !!sign,
      base: (num % 7) + 1,
      octaves: Math.floor(num / 7),
      imperfect: false,
    };
  }

PerfectDegree
  = @degree:Degree &{ return PERFECT_DEGREES.has(degree.base); }

MidDegree
  = @degree:Degree &{ return MID_DEGREES.has(degree.base); }

ImperfectDegree
  = degree: Degree &{ return IMPERFECT_DEGREES.has(degree.base); } {
    return {
      ...degree,
      imperfect: true,
    };
  }

SplitPythagorean
  = quality: AugmentedQuality augmentations: AugmentedToken* degree: (ImperfectDegree / PerfectDegree) {
    return {
      type: 'Pythagorean',
      quality,
      augmentations,
      degree,
    };
  }
  / quality: ImperfectQuality degree: ImperfectDegree {
    return {
      type: 'Pythagorean',
      quality,
      degree,
    };
  }
  / quality: MidQuality degree: MidDegree {
    return {
      type: 'Pythagorean',
      quality,
      degree,
    };
  }
  / quality: PerfectQuality degree: PerfectDegree {
    return {
      type: 'Pythagorean',
      quality,
      degree,
    };
  }

MosStep
  = quality: AugmentedQuality augmentations: AugmentedToken* degree: SignedBasicInteger 'ms' {
    return {
      type: 'MosStep',
      quality,
      augmentations,
      degree,
    };
  }
  / quality: (ImperfectQuality / PerfectQuality) degree: SignedBasicInteger 'ms' {
    return {
      type: 'MosStep',
      quality,
      degree,
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

MosStepLiteral
  = upsAndDowns: UpsAndDowns
    mosStep: MosStep
    hyperscripts: Hyperscripts {
      return {
        ...upsAndDowns,
        type: 'MosStepLiteral',
        mosStep,
        superscripts: hyperscripts.superscripts,
        subscripts: hyperscripts.subscripts,
      };
    }

AccidentalSign
  = '𝄪' / '𝄫' / '𝄲' / '𝄳' / [x♯#‡t♮_d♭b&ea@]

Accidental 'accidental'
  = fraction: VulgarFraction accidental: AccidentalSign  {
    return {
      fraction,
      accidental,
    };
  }

PitchNominal 'pitch nominal'
  = [α-ωA-Z]
  / 'alp'
  / 'bet'
  / 'gam'
  / 'del'
  / 'eps'
  / 'zet'
  / 'eta'
  / 'the'
  / 'iot'
  / 'kap'
  / 'lam'
  / 'muu' // 'mu' is too short
  / 'nuu' // 'nu'
  / 'xii' // 'xi'
  / 'omi'
  / 'pii' // 'pi'
  / 'rho'
  / 'fsi' // Final sigma
  / 'sig'
  / 'tau'
  / 'ups'
  / 'phi'
  / 'chi'
  / 'psi'
  / 'ome'

// Some pitches like M3 or S9 are inaccessible due to other rules and require accidentals to disambiguate.
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
  / parameters: NonEmptyParameters _ '=>' _ expression: Expression {
    return {
      type: 'ArrowFunction',
      parameters,
      expression,
      text: text(),
    };
  }

// This rule is a faster version of the part of (FJS / AbsoluteFJS / (SquareSuperparticular)) which overlaps with identifiers.
ReservedPattern
  = [sqQ]? (AugmentedToken+ / [mMnP]) [0-9]+ 'ms'? ([_v] [0-9])*
  / PitchNominal [sqQxdb_ae]* [0-9]+ ([_v] [0-9])*

// TODO: Figure out where to put this
InvalidIdentifier
  = word:IdentifierName {
    if (RESERVED_WORDS.has(word)) {
      error(`${word} is a reserved keyword`);
    }
    error(`${word} is a reserved pattern`);
  }

ValidIdentifierName
  = @word:IdentifierName &{
    return !RESERVED_WORDS.has(word);
  }

Identifier
  = &IdentifierStart !ReservedPattern id: ValidIdentifierName {
    return {
      type: 'Identifier',
      id,
    };
  }

TemplateArgument
  = '¥' index: BasicInteger {
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
