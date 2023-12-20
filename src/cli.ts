import {relin} from './builtin';
import {Interval} from './interval';
import {ExpressionVisitor, evaluateSource} from './parser';

export function toScalaScl(source: string) {
  const visitor = evaluateSource(source);
  const keyColors = [];
  let useColors = false;
  const lines = ['!Created using SonicWeave v0.0.0 alpha', '!'];
  lines.push(visitor.rootContext.title || 'Untitled tuning');
  const scale = visitor.context.get('$') as Interval[];
  lines.push(` ${scale.length}`);
  lines.push('!');
  const rel = relin.bind(visitor as unknown as ExpressionVisitor);
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
      sclValue = value.totalCents().toFixed(6);
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
