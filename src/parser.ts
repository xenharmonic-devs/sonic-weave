import {parse} from './sonic-weave-ast';

type Program = {
  type: 'Program';
  body: Statement[];
};

type ExpressionStatement = {
  type: 'ExpressionStatement';
  expression: Expression;
};

type Statement = ExpressionStatement;

type PlainLiteral = {
  type: 'PlainLiteral';
  value: bigint;
};

type ColorLiteral = {
  type: 'ColorLiteral';
  value: string;
};

type Expression = PlainLiteral | ColorLiteral;

export function parseAST(source: string): Program {
  return parse(source);
}
