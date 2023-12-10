import {PlainLiteral, Primary} from './expression';
import {Interval, Color} from './interval';
import {TimeMonzo} from './monzo';
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

type BinaryExpression = {
  type: 'BinaryExpression';
  operator: '+' | '-';
  left: Expression;
  right: Expression;
};

type Expression = BinaryExpression | Primary;

class StatementVisitor {
  scale: Interval[];
  constructor() {
    this.scale = [];
  }

  visit(node: Statement) {
    const subVisitor = new ExpressionVisitor();
    const value = subVisitor.visit(node.expression);
    if (value instanceof Color) {
      if (this.scale.length) {
        this.scale[this.scale.length - 1].color = value;
      }
    } else {
      this.scale.push(value);
    }
  }
}

class ExpressionVisitor {
  visit(node: Expression): Interval | Color {
    switch (node.type) {
      case 'BinaryExpression':
        return this.visitBinaryExpression(node);
      case 'PlainLiteral':
        return this.visitPlainLiteral(node);
      case 'ColorLiteral':
        return new Color(node.value);
    }
  }

  visitBinaryExpression(node: BinaryExpression): Interval {
    const left = this.visit(node.left);
    const right = this.visit(node.right);
    if (left instanceof Color || right instanceof Color) {
      throw new Error('Cannot operate on colors');
    }
    switch (node.operator) {
      case '+':
        return left.add(right);
      case '-':
        return left.sub(right);
    }
  }

  visitPlainLiteral(node: PlainLiteral): Interval {
    const value = TimeMonzo.fromBigInt(node.value);
    return new Interval(value, 'linear', node);
  }
}

export function parseAST(source: string): Program {
  return parse(source);
}

export function parseSource(source: string): Interval[] {
  const program = parseAST(source);
  const visitor = new StatementVisitor();
  for (const statement of program.body) {
    visitor.visit(statement);
  }
  return visitor.scale;
}
