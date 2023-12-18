import {relin} from './builtin';
import {Interval} from './interval';
import {ExpressionVisitor, evaluateSource} from './parser';

export function toScalaScl(source: string) {
  const visitor = evaluateSource(source);
  const lines = ['!Created using SonicWeave v0.0.0 alpha', '!'];
  if (visitor.context.has('"')) {
    lines.push(visitor.context.get('"') as string);
  }
  const scale = visitor.context.get('$') as Interval[];
  lines.push(` ${scale.length}`);
  lines.push('!');
  const rel = relin.bind(visitor as unknown as ExpressionVisitor);
  for (const interval of scale) {
    const relative = rel(interval);
    const value = relative.value;
    let sclValue: string;
    if (value.isFractional()) {
      sclValue = value.toFraction().abs().toFraction();
    } else {
      sclValue = value.totalCents().toFixed(6);
    }
    const label = interval.label ? ' ' + interval.label : '';
    lines.push(` ${sclValue}${label}`);
  }
  lines.push('');
  return lines.join('\n');
}
