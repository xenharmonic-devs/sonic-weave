import {MetricPrefix, bigLcm} from './utils';
import {Pythagorean, AbsolutePitch} from './pythagorean';

export type IntegerLiteral = {
  type: 'IntegerLiteral';
  value: bigint;
};

export type DecimalLiteral = {
  type: 'DecimalLiteral';
  whole: bigint;
  fractional: string;
  hard: boolean;
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

export type CentsLiteral = {
  type: 'CentsLiteral';
  whole: bigint;
  fractional: string;
};

export type CentLiteral = {
  type: 'CentLiteral';
};

export type HertzLiteral = {
  type: 'HertzLiteral';
  prefix: MetricPrefix;
};

export type FJS = {
  type: 'FJS';
  pythagorean: Pythagorean;
  superscripts: bigint[];
  subscripts: bigint[];
};

export type AbsoluteFJS = {
  type: 'AbsoluteFJS';
  pitch: AbsolutePitch;
  superscripts: bigint[];
  subscripts: bigint[];
};

export type IntervalLiteral =
  | IntegerLiteral
  | DecimalLiteral
  | FractionLiteral
  | NedoLiteral
  | CentsLiteral
  | CentLiteral
  | FJS
  | AbsoluteFJS
  | HertzLiteral;

export function uniformInvertNode(
  node?: IntervalLiteral
): IntervalLiteral | undefined {
  if (!node) {
    return undefined;
  }
  switch (node.type) {
    case 'IntegerLiteral':
      return {
        type: 'FractionLiteral',
        numerator: 1n,
        denominator: node.value,
      };
    case 'FractionLiteral':
      return {
        type: 'FractionLiteral',
        numerator: node.denominator,
        denominator: node.numerator,
      };
  }
  return undefined;
}

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

export function divNodes(
  a?: IntervalLiteral,
  b?: IntervalLiteral
): IntervalLiteral | undefined {
  if (!a || !b) {
    return undefined;
  }
  if (a.type === 'IntegerLiteral' && b.type === 'IntegerLiteral') {
    return {
      type: 'FractionLiteral',
      numerator: a.value,
      denominator: b.value,
    };
  }
  return undefined;
}

function tailFJS(literal: FJS | AbsoluteFJS) {
  let result = '';
  if (literal.superscripts.length) {
    result += '^' + literal.superscripts.join(',');
  }
  if (literal.subscripts.length) {
    result += '_' + literal.subscripts.join(',');
  }
  return result;
}

export function toString(literal: IntervalLiteral) {
  switch (literal.type) {
    case 'NedoLiteral':
      return `${literal.numerator}\\${literal.denominator}`;
    case 'FractionLiteral':
      return `${literal.numerator}/${literal.denominator}`;
    case 'DecimalLiteral':
      return `${literal.whole},${literal.fractional}`;
    case 'CentsLiteral':
      return `${literal.whole}.${literal.fractional}`;
    case 'CentLiteral':
      return 'c';
    case 'FJS':
      // eslint-disable-next-line no-case-declarations
      const d = literal.pythagorean.degree;
      return `${literal.pythagorean.quality}${d.negative ? '-' : ''}${
        d.base + 7 * d.octaves
      }${tailFJS(literal)}`;
    case 'AbsoluteFJS':
      // eslint-disable-next-line no-case-declarations
      const p = literal.pitch;
      return `${p.nominal}${p.accidentals.join('')}${p.octave}${tailFJS(
        literal
      )}`;
    case 'HertzLiteral':
      return `${literal.prefix}Hz`;
    default:
      return literal.value.toString();
  }
}
