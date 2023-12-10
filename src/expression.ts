import {bigLcm} from './utils';

export type PlainLiteral = {
  type: 'PlainLiteral';
  value: bigint;
};

export type NedoLiteral = {
  type: 'NedoLiteral';
  numerator: bigint;
  denominator: bigint;
};

export type ColorLiteral = {
  type: 'ColorLiteral';
  value: string;
};

export type Primary = PlainLiteral | NedoLiteral | ColorLiteral;

export function addNodes(a?: Primary, b?: Primary): Primary | undefined {
  if (!a || !b) {
    return undefined;
  }
  if (a.type === 'PlainLiteral' && b.type === 'PlainLiteral') {
    return {
      type: a.type,
      value: a.value + b.value,
    };
  }
  if (a.type === 'NedoLiteral' && b.type === 'NedoLiteral') {
    const denominator = bigLcm(a.denominator, b.denominator);
    return {
      type: a.type,
      numerator:
        (denominator / a.denominator) * a.numerator +
        (denominator / b.denominator) * b.numerator,
      denominator,
    };
  }

  return undefined;
}

export function subNodes(a?: Primary, b?: Primary): Primary | undefined {
  if (!a || !b) {
    return undefined;
  }
  if (a.type === 'PlainLiteral' && b.type === 'PlainLiteral') {
    return {
      type: a.type,
      value: a.value - b.value,
    };
  }

  return undefined;
}

export function toString(primary: Primary) {
  switch (primary.type) {
    case 'NedoLiteral':
      return `${primary.numerator}\\${primary.denominator}`;
    default:
      return primary.value.toString();
  }
}
