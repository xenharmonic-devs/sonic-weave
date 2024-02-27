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

export type Parameters = {
  type: 'Parameters';
  identifiers: Identifier[];
  rest?: Identifier;
};

export type AssignmentStatement = {
  type: 'AssignmentStatement';
  name: Identifier | Parameters | ArrayAccess | ArraySlice;
  value: Expression;
};

export type VariableDeclaration =
  | {
      type: 'VariableDeclaration';
      name: Identifier | Parameters;
      value: Expression;
      mutable: false;
    }
  | {
      type: 'VariableDeclaration';
      name: Identifier | Parameters;
      value?: Expression;
      mutable: true;
    };

export type FunctionDeclaration = {
  type: 'FunctionDeclaration';
  name: Identifier;
  parameters: Parameters;
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
  element: Identifier | Parameters;
  array: Expression;
  body: Statement;
  mutable: Boolean;
};

export type ExpressionStatement = {
  type: 'ExpressionStatement';
  expression: Expression;
};

export type Statement =
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
  spread: Boolean;
};

export type CallExpression = {
  type: 'CallExpression';
  // Slicing is legal in the grammar, but not in the runtime.
  callee: Identifier | ArrayAccess | ArraySlice;
  args: Argument[];
};

export type ArrowFunction = {
  type: 'ArrowFunction';
  parameters: Parameters;
  expression: Expression;
  text: string;
};

export type EnumeratedChord = {
  type: 'EnumeratedChord';
  mirror: Boolean;
  intervals: Expression[];
};

export type HarmonicSegment = {
  type: 'HarmonicSegment';
  mirror: Boolean;
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
  element: Identifier | Parameters;
  array: Expression;
};

export type ArrayComprehension = {
  type: 'ArrayComprehension';
  expression: Expression;
  comprehensions: Comprehension[];
};

export type ArrayLiteral = {
  type: 'ArrayLiteral';
  elements: Argument[];
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
  | ArrayComprehension
  | ArrayLiteral
  | StringLiteral
  | HarmonicSegment;
