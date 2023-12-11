import {MetricPrefix, bigLcm} from './utils';

export type IntegerLiteral = {
  type: 'IntegerLiteral';
  value: bigint;
};

export type DecimalLiteral = {
  type: 'DecimalLiteral';
  whole: bigint;
  fractional: string;
};

export type FractionLiteral = {
  type: 'FractionLiteral';
  numerator: bigint;
  denominator: bigint;
};

export type NedoLiteral = {
  type: 'NedoLiteral';
  numerator: bigint;
  denominator: bigint;
};

export type CentLiteral = {
  type: 'CentLiteral';
};

export type HertzLiteral = {
  type: 'HertzLiteral';
  prefix: MetricPrefix;
};

export type IntervalLiteral =
  | IntegerLiteral
  | DecimalLiteral
  | FractionLiteral
  | NedoLiteral
  | CentLiteral
  | HertzLiteral;

export function addNodes(
  a?: IntervalLiteral,
  b?: IntervalLiteral
): IntervalLiteral | undefined {
  if (!a || !b) {
    return undefined;
  }
  if (a.type === 'IntegerLiteral' && b.type === 'IntegerLiteral') {
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

export function subNodes(
  a?: IntervalLiteral,
  b?: IntervalLiteral
): IntervalLiteral | undefined {
  if (!a || !b) {
    return undefined;
  }
  if (a.type === 'IntegerLiteral' && b.type === 'IntegerLiteral') {
    return {
      type: a.type,
      value: a.value - b.value,
    };
  }
  if (a.type === 'NedoLiteral' && b.type === 'NedoLiteral') {
    const denominator = bigLcm(a.denominator, b.denominator);
    return {
      type: a.type,
      numerator:
        (denominator / a.denominator) * a.numerator -
        (denominator / b.denominator) * b.numerator,
      denominator,
    };
  }

  return undefined;
}

export function toString(literal: IntervalLiteral) {
  switch (literal.type) {
    case 'NedoLiteral':
      return `${literal.numerator}\\${literal.denominator}`;
    case 'FractionLiteral':
      return `${literal.numerator}/${literal.denominator}`;
    case 'DecimalLiteral':
      return `${literal.whole},${literal.fractional}`;
    case 'CentLiteral':
      return 'c';
    case 'HertzLiteral':
      return `${literal.prefix}Hz`;
    default:
      return literal.value.toString();
  }
}
