/* eslint-disable @typescript-eslint/no-unused-vars */
import {relative, repr} from './stdlib';
import {Interval} from './interval';
import {
  ExpressionVisitor,
  StatementVisitor,
  evaluateSource,
  getSourceVisitor,
  parseAST,
} from './parser/parser';
import type {REPLServer, ReplOptions} from 'repl';
import type {Context} from 'node:vm';
import {parenCounter} from './parser';
// TODO: Import version from package.json

export function toScalaScl(source: string) {
  const visitor = evaluateSource(source);
  const keyColors = [];
  let useColors = false;
  const lines = ['!Created using SonicWeave v0.0.0 alpha', '!'];
  lines.push(visitor.rootContext.title || 'Untitled tuning');
  const scale = visitor.mutables.get('$') as Interval[];
  lines.push(` ${scale.length}`);
  lines.push('!');
  const rel = relative.bind(visitor as unknown as ExpressionVisitor);
  for (const interval of scale) {
    if (interval.color) {
      keyColors.push(interval.color.value);
      useColors = true;
    } else {
      keyColors.push('#808080');
    }
    const relative = rel(interval);
    const value = relative.value;
    let sclValue: string;
    if (value.isFractional()) {
      sclValue = value.toFraction().abs().toFraction();
    } else {
      sclValue = value.totalCents(true).toFixed(6);
    }
    const label = interval.label ? ' ' + interval.label : '';
    lines.push(` ${sclValue}${label}`);
  }
  if (useColors) {
    keyColors.unshift(keyColors.pop());
    lines.push('! A list of key colors, ascending from 1/1');
    lines.push('! ' + keyColors.join(' '));
  }
  lines.push('');
  return lines.join('\n');
}

const prompt = '𝄞 ';

export function repl(start: (options?: string | ReplOptions) => REPLServer) {
  const globalVisitor = getSourceVisitor();
  const visitor = new StatementVisitor(
    globalVisitor.rootContext,
    globalVisitor
  );

  let currentCmd = '';

  function evaluateStatement(
    this: REPLServer,
    evalCmd: string,
    context: Context,
    file: string,
    cb: (err: Error | null, result: any) => void
  ) {
    currentCmd += evalCmd;

    const counts = parenCounter(currentCmd);

    if (counts.curlies < 0) {
      currentCmd = '';
      cb(new Error('Unmatched closing curly bracket'), undefined);
      return;
    }
    if (counts.squares < 0) {
      currentCmd = '';
      cb(new Error('Unmatched closing square bracket'), undefined);
      return;
    }
    if (counts.parens < 0) {
      currentCmd = '';
      cb(new Error('Unmatched closing parenthesis'), undefined);
      return;
    }
    if (counts.parens || counts.squares || counts.curlies) {
      this.setPrompt('... ');
      this.displayPrompt();
      return;
    }
    this.setPrompt(prompt);
    try {
      const program = parseAST(currentCmd);
      currentCmd = '';
      if (!program.body.length) {
        cb(null, null);
        return;
      }
      for (const statement of program.body.slice(0, -1)) {
        const interrupt = visitor.visit(statement);
        if (interrupt) {
          throw new Error('Illegal statement');
        }
      }
      const finalStatement = program.body[program.body.length - 1];
      if (finalStatement.type === 'ExpressionStatement') {
        const subVisitor = visitor.createExpressionVisitor();
        const value = subVisitor.visit(finalStatement.expression);
        visitor.handleValue(value, subVisitor);
        cb(null, value);
      } else {
        const interrupt = visitor.visit(finalStatement);
        if (interrupt) {
          throw new Error('Illegal statement');
        }
        cb(null, null);
      }
    } catch (e) {
      currentCmd = '';
      if (typeof e === 'string') {
        // eslint-disable-next-line no-ex-assign
        e = new Error(e);
      }
      if (e instanceof Error) {
        cb(e, undefined);
      } else {
        throw e;
      }
    }
  }

  start({
    prompt,
    eval: evaluateStatement,
    writer: repr.bind(visitor.createExpressionVisitor()),
    terminal: true,
    completer: () => [],
  });
}
