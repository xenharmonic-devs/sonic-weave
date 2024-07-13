import {
  IntervalLiteral,
  CoIntervalLiteral,
  ValBasisLiteral,
  literalToString,
  Identifier,
} from './expression';

export {Identifier} from './expression';

export type UnaryOperator =
  | '+'
  | '-'
  | '%'
  | '÷'
  | 'abs'
  | 'labs'
  | '√'
  | 'not'
  | 'vnot'
  | '^'
  | '∧'
  | '\u2228' // ∨
  | '/'
  | 'lift'
  | '\\'
  | 'drop';

export type UpdateOperator = '++' | '--';

export type BinaryOperator =
  | 'lest'
  | 'al'
  | 'al~'
  | 'or'
  | 'vor'
  | 'and'
  | 'vand'
  | '=='
  | '<>'
  | '~='
  | '<='
  | '>='
  | '<'
  | '>'
  | 'of'
  | 'not of'
  | '~of'
  | 'not ~of'
  | 'in'
  | 'not in'
  | '~in'
  | 'not ~in'
  | '+'
  | '-'
  | 'max'
  | 'min'
  | 'to'
  | 'by'
  | '/+'
  | '⊕'
  | '/-'
  | '⊖'
  | ' '
  | '*'
  | '×'
  | '%'
  | '÷'
  | '\\'
  | 'sof'
  | 'mod'
  | 'modc'
  | 'rd'
  | 'rdc'
  | 'ed'
  | '/_'
  | '·'
  | 'dot'
  | 'vdot'
  | 'mdot'
  | '⊗'
  | 'tns'
  | 'tmpr'
  | '^'
  | '/^'
  | '^/'
  | '/';

export type ConditionalKind = 'if' | 'where';

export type IterationKind = 'in' | 'of';

export type Program = {
  type: 'Program';
  body: Statement[];
};

export type Parameter = {
  type: 'Parameter';
  id: string;
  defaultValue: null | Expression;
};

export type Parameters_ = {
  type: 'Parameters';
  parameters: (Parameter | Parameters_)[];
  rest?: Parameter;
  defaultValue: null | Expression;
};

export type Identifiers = {
  type: 'Identifiers';
  identifiers: (Identifier | Identifiers)[];
  rest?: Identifier;
};

export type EmptyStatement = {
  type: 'EmptyStatement';
};

export type AssignmentStatement = {
  type: 'AssignmentStatement';
  name: Identifier | Identifiers | AccessExpression | ArraySlice;
  value: Expression;
};

export type VariableDeclaration = {
  type: 'VariableDeclaration';
  parameters: Parameter | Parameters_;
  mutable: boolean;
};

export type FunctionDeclaration = {
  type: 'FunctionDeclaration';
  name: Identifier;
  parameters: Parameters_;
  body: Statement[];
  text: string;
};

export type PitchDeclaration = {
  type: 'PitchDeclaration';
  left: Expression;
  middle?: Expression;
  right: Expression;
};

export type UpDeclaration = {
  type: 'UpDeclaration';
  value: Expression;
};

export type LiftDeclaration = {
  type: 'LiftDeclaration';
  value: Expression;
};

export type BlockStatement = {
  type: 'BlockStatement';
  body: Statement[];
};

export type ReturnStatement = {
  type: 'ReturnStatement';
  argument?: Expression;
};

export type BreakStatement = {
  type: 'BreakStatement';
};

export type ContinueStatement = {
  type: 'ContinueStatement';
};

export type ThrowStatement = {
  type: 'ThrowStatement';
  argument: Expression;
};

export type WhileStatement = {
  type: 'WhileStatement';
  test: Expression;
  body: Statement;
  tail: null | Statement;
};

export type IfStatement = {
  type: 'IfStatement';
  test: Expression;
  consequent: Statement;
  alternate?: Statement;
};

export type IterationStatement = {
  type: 'IterationStatement';
  element: Parameter | Parameters_;
  kind: IterationKind;
  container: Expression;
  body: Statement;
  tail: null | Statement;
  mutable: boolean;
};

export type CatchClause = {
  type: 'CatchClause';
  parameter?: Parameter;
  body: Statement;
};

export type TryStatement = {
  type: 'TryStatement';
  body: Statement;
  handler?: CatchClause;
  finalizer?: Statement;
};

export type DeferStatement = {
  type: 'DeferStatement';
  body: Statement;
};

export type ModuleDeclaration = {
  type: 'ModuleDeclaration';
  name: string;
  body: Statement[];
};

export type ExportConstantStatement = {
  type: 'ExportConstantStatement';
  parameter: Parameter;
};

export interface ExportFunctionStatement
  extends Omit<FunctionDeclaration, 'type'> {
  type: 'ExportFunctionStatement';
}

export type ExportAllStatement = {
  type: 'ExportAllStatement';
  module: string;
};

export type ImportElement = {
  type: 'ImportElement';
  id: string;
  alias: null | string;
};

export type ImportStatement = {
  type: 'ImportStatement';
  elements: ImportElement[];
  module: string;
};

export type ImportAllStatement = {
  type: 'ImportAllStatement';
  module: string;
};

export type DeleteStatement = {
  type: 'DeleteStatement';
  entry: AccessExpression | ArraySlice;
};

export type ExpressionStatement = {
  type: 'ExpressionStatement';
  expression: Expression;
};

export type Statement =
  | EmptyStatement
  | AssignmentStatement
  | VariableDeclaration
  | ExpressionStatement
  | FunctionDeclaration
  | PitchDeclaration
  | UpDeclaration
  | LiftDeclaration
  | DeleteStatement
  | BlockStatement
  | WhileStatement
  | IfStatement
  | IterationStatement
  | TryStatement
  | DeferStatement
  | ModuleDeclaration
  | ExportConstantStatement
  | ExportFunctionStatement
  | ExportAllStatement
  | ImportStatement
  | ImportAllStatement
  | MosDeclaration
  | ThrowStatement
  | BreakStatement
  | ContinueStatement
  | ReturnStatement;

export type BlockExpression = {
  type: 'BlockExpression';
  body: Statement[];
};

export type ConditionalExpression = {
  type: 'ConditionalExpression';
  kind: ConditionalKind;
  test: Expression;
  consequent: Expression;
  alternate: Expression;
};

export type AccessExpression = {
  type: 'AccessExpression';
  object: Expression;
  nullish: boolean;
  key: Expression;
};

export type ArraySlice = {
  type: 'ArraySlice';
  object: Expression;
  start: Expression | null;
  second: Expression | null;
  penultimate: boolean;
  end: Expression | null;
};

export type UnaryExpression = {
  type: 'UnaryExpression';
  operator: UnaryOperator;
  operand: Expression;
  uniform: boolean;
};

export type UpdateExpression = {
  type: 'UpdateExpression';
  operator: UpdateOperator;
  argument: Expression;
};

export type DownExpression = {
  type: 'DownExpression';
  count: number;
  operand: Expression;
};

export type RangeRelation = {
  type: 'RangeRelation';
  left: Expression;
  leftOperator: '<' | '<=' | '>' | '>=';
  middle: Expression;
  rightOperator: '<' | '<=' | '>' | '>=';
  right: Expression;
};

export type BinaryExpression = {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
  preferLeft: boolean;
  preferRight: boolean;
};

export type NoneLiteral = {
  type: 'NoneLiteral';
};

export type ColorLiteral = {
  type: 'ColorLiteral';
  value: string;
};

export type PopScale = {
  type: 'PopScale';
  parent: boolean;
};

export type TemplateArgument = {
  type: 'TemplateArgument';
  index: number;
};

export type Argument = {
  type: 'Argument';
  expression: Expression;
  spread: boolean;
};

export type CallExpression = {
  type: 'CallExpression';
  callee: Expression;
  args: Argument[];
};

export type ArrowFunction = {
  type: 'ArrowFunction';
  parameters: Parameters_;
  expression: Expression;
  text: string;
};

export type EnumeratedChord = {
  type: 'EnumeratedChord';
  mirror: boolean;
  enumerals: Expression[];
};

export type HarmonicSegment = {
  type: 'HarmonicSegment';
  root: Expression;
  end: Expression;
};

export type Range = {
  type: 'Range';
  start: Expression;
  second?: Expression;
  penultimate: boolean;
  end: Expression;
};

export type Comprehension = {
  element: Parameter | Parameters_;
  kind: IterationKind;
  container: Expression;
};

export type ArrayComprehension = {
  type: 'ArrayComprehension';
  expression: Expression;
  comprehensions: Comprehension[];
  test: Expression | null;
};

export type ArrayLiteral = {
  type: 'ArrayLiteral';
  elements: Argument[];
};

export type SetLiteral = {
  type: 'SetLiteral';
  elements: Argument[];
};

export type RecordLiteral = {
  type: 'RecordLiteral';
  properties: [string | null, Expression][];
};

export type StringLiteral = {
  type: 'StringLiteral';
  value: string;
};

export type TrueLiteral = {
  type: 'TrueLiteral';
};

export type FalseLiteral = {
  type: 'FalseLiteral';
};

export type Expression =
  | BlockExpression
  | ConditionalExpression
  | AccessExpression
  | ArraySlice
  | UnaryExpression
  | UpdateExpression
  | DownExpression
  | RangeRelation
  | BinaryExpression
  | CallExpression
  | ArrowFunction
  | IntervalLiteral
  | CoIntervalLiteral
  | ValBasisLiteral
  | NoneLiteral
  | TrueLiteral
  | FalseLiteral
  | ColorLiteral
  | Identifier
  | PopScale
  | TemplateArgument
  | EnumeratedChord
  | Range
  | ArrayComprehension
  | ArrayLiteral
  | SetLiteral
  | RecordLiteral
  | StringLiteral
  | HarmonicSegment;

export type RationalEquave = {
  numerator: number;
  denominator: number;
};

export type AbstractStepPattern = {
  type: 'AbstractStepPattern';
  pattern: ('L' | 's')[];
  equave: RationalEquave | null;
};

export type IntegerPattern = {
  type: 'IntegerPattern';
  pattern: number[];
  equave: RationalEquave | null;
};

export type UpDownPeriod = {
  type: 'UDP';
  up: number;
  down: number;
  period: number | null;
};

export type PatternUpDownPeriod = {
  type: 'PatternUpDownPeriod';
  countLarge: number;
  countSmall: number;
  udp: UpDownPeriod | null;
  equave: RationalEquave | null;
};

export type HardnessDeclaration = {
  type: 'HardnessDeclaration';
  value: Expression;
};

export type LargeDeclaration = {
  type: 'LargeDeclaration';
  value: Expression;
};

export type SmallDeclaration = {
  type: 'SmallDeclaration';
  value: Expression;
};

export type EquaveDeclaration = {
  type: 'EquaveDeclaration';
  value: Expression;
};

export type MosExpression =
  | AbstractStepPattern
  | IntegerPattern
  | PatternUpDownPeriod
  | HardnessDeclaration
  | LargeDeclaration
  | SmallDeclaration
  | EquaveDeclaration;

export type MosDeclaration = {
  type: 'MosDeclaration';
  body: MosExpression[];
};

/**
 * Convert an AST node to a string representation.
 * @param node Expression node to convert.
 * @returns Text representation of the expression.
 */
export function expressionToString(node: Expression) {
  switch (node.type) {
    case 'IntegerLiteral':
    case 'DecimalLiteral':
    case 'FractionLiteral':
    case 'RadicalLiteral':
    case 'StepLiteral':
    case 'NedjiLiteral':
    case 'CentsLiteral':
    case 'CentLiteral':
    case 'ReciprocalCentLiteral':
    case 'ReciprocalLogarithmicHertzLiteral':
    case 'FJS':
    case 'AspiringFJS':
    case 'AbsoluteFJS':
    case 'AspiringAbsoluteFJS':
    case 'HertzLiteral':
    case 'SecondLiteral':
    case 'MonzoLiteral':
    case 'ValLiteral':
    case 'SparseOffsetVal':
    case 'WartsLiteral':
    case 'SquareSuperparticular':
      return literalToString(node);
    case 'TrueLiteral':
      return 'true';
    case 'FalseLiteral':
      return 'false';
    case 'NoneLiteral':
      return 'niente';
    case 'Identifier':
      return node.id;
    case 'PopScale':
      return node.parent ? '££' : '£';
    case 'TemplateArgument':
      return `¥${node.index}`;
    case 'StringLiteral':
      return JSON.stringify(node.value);
  }
  throw new Error(`Cannot convert ${node.type} to string.`);
}
