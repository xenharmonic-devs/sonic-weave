import {IntervalLiteral} from './expression';

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
  | '!of'
  | '~of'
  | '!~of'
  | '+'
  | '-'
  | 'to'
  | 'by'
  | ''
  | '*'
  | '×'
  | '%'
  | '÷'
  | '\\'
  | 'mod'
  | 'rd'
  | '/_'
  | '·'
  | 'dot'
  | '⊗'
  | 'tns'
  | '^'
  | '/^';

export type Program = {
  type: 'Program';
  body: Statement[];
};

export type VariableDeclaration = {
  type: 'VariableDeclaration';
  name: Identifier | Identifier[] | ArrayAccess;
  value: Expression;
};

export type FunctionDeclaration = {
  type: 'FunctionDeclaration';
  name: Identifier;
  parameters: Identifier[];
  body: Statement[];
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

export type ThrowStatement = {
  type: 'ThrowStatement';
  argument: Expression;
};

export type WhileStatement = {
  type: 'WhileStatement';
  test: Expression;
  body: Statement;
};

export type IfStatement = {
  type: 'IfStatement';
  test: Expression;
  consequent: Statement;
  alternate?: Statement;
};

export type ForOfStatement = {
  type: 'ForOfStatement';
  element: Identifier | Identifier[];
  array: Expression;
  body: Statement;
};

export type ExpressionStatement = {
  type: 'ExpressionStatement';
  expression: Expression;
};

export type Statement =
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
  | ThrowStatement
  | ReturnStatement;

export type ConditionalExpression = {
  type: 'ConditionalExpression';
  test: Expression;
  consequent: Expression;
  alternate: Expression;
};

export type ArrayAccess = {
  type: 'ArrayAccess';
  object: Expression;
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
  operator: '+' | '-' | '%' | '÷' | '!' | '^' | '/' | '\\' | '++' | '--';
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
  labels: (Identifier | ColorLiteral | StringLiteral)[];
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

export type CallExpression = {
  type: 'CallExpression';
  callee: Identifier | ArrayAccess;
  args: Expression[];
};

export type ArrowFunction = {
  type: 'ArrowFunction';
  parameters: Identifier[];
  expression: Expression;
};

export type EnumeratedChord = {
  type: 'EnumeratedChord';
  intervals: Expression[];
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
  end: Expression;
};

export type ArrayLiteral = {
  type: 'ArrayLiteral';
  elements: Expression[];
};

export type StringLiteral = {
  type: 'StringLiteral';
  value: string;
};

export type Expression =
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
  | ColorLiteral
  | Identifier
  | EnumeratedChord
  | Range
  | ArrayLiteral
  | StringLiteral
  | HarmonicSegment;
