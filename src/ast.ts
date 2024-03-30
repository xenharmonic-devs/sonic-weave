import {IntervalLiteral, literalToString} from './expression';

export type BinaryOperator =
  | '??'
  | 'or'
  | 'and'
  | '==='
  | '!=='
  | '=='
  | '!='
  | '<='
  | '>='
  | '<'
  | '>'
  | 'of'
  | 'not of'
  | '~of'
  | 'not ~of'
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
  | 'mod'
  | 'modc'
  | 'rd'
  | 'rdc'
  | '/_'
  | '·'
  | 'dot'
  | '⊗'
  | 'tns'
  | '^'
  | '/^'
  | '^/';

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
  name: Identifier | Identifiers | ArrayAccess | ArraySlice;
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

export type ForOfStatement = {
  type: 'ForOfStatement';
  element: Parameter | Parameters_;
  array: Expression;
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
  | BlockStatement
  | WhileStatement
  | IfStatement
  | ForOfStatement
  | TryStatement
  | ThrowStatement
  | BreakStatement
  | ContinueStatement
  | ReturnStatement;

export type LestExpression = {
  type: 'LestExpression';
  primary: Expression;
  fallback: Expression;
};

export type ConditionalExpression = {
  type: 'ConditionalExpression';
  test: Expression;
  consequent: Expression;
  alternate: Expression;
};

export type ArrayAccess = {
  type: 'ArrayAccess';
  object: Expression;
  nullish: boolean;
  index: Expression;
};

export type ArraySlice = {
  type: 'ArraySlice';
  object: Expression;
  start: Expression | null;
  second: Expression | null;
  end: Expression | null;
};

export type UnaryExpression = {
  type: 'UnaryExpression';
  operator: '+' | '-' | '%' | '÷' | 'not' | '^' | '/' | '\\' | '++' | '--';
  operand: Expression;
  prefix: boolean;
  uniform: boolean;
};

export type DownExpression = {
  type: 'DownExpression';
  count: number;
  operand: Expression;
};

export type BinaryExpression = {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
  preferLeft: boolean;
  preferRight: boolean;
};

export type LabeledExpression = {
  type: 'LabeledExpression';
  object: Expression;
  labels: (Identifier | ColorLiteral | StringLiteral | NoneLiteral)[];
};

export type NedjiProjection = {
  type: 'NedjiProjection';
  octaves: Expression;
  base: Expression;
};

export type NoneLiteral = {
  type: 'NoneLiteral';
};

export type ColorLiteral = {
  type: 'ColorLiteral';
  value: string;
};

export type Identifier = {
  type: 'Identifier';
  id: string;
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
  intervals: Expression[];
};

export type HarmonicSegment = {
  type: 'HarmonicSegment';
  mirror: boolean;
  root: Expression;
  end: Expression;
};

export type Range = {
  type: 'Range';
  start: Expression;
  second?: Expression;
  end: Expression;
};

export type Comprehension = {
  element: Parameter | Parameters_;
  array: Expression;
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
  | LestExpression
  | ConditionalExpression
  | ArrayAccess
  | ArraySlice
  | UnaryExpression
  | DownExpression
  | BinaryExpression
  | LabeledExpression
  | NedjiProjection
  | CallExpression
  | ArrowFunction
  | IntervalLiteral
  | NoneLiteral
  | TrueLiteral
  | FalseLiteral
  | ColorLiteral
  | Identifier
  | EnumeratedChord
  | Range
  | ArrayComprehension
  | ArrayLiteral
  | StringLiteral
  | HarmonicSegment;

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
    case 'StringLiteral':
      return JSON.stringify(node.value);
  }
  throw new Error(`Cannot convert ${node.type} to string.`);
}
