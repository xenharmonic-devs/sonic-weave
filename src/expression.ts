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
  exponent: bigint | null;
  hard: boolean;
};

export type FractionLiteral = {
  type: 'FractionLiteral';
  numerator: bigint;
  denominator: bigint;
};

export type NedjiLiteral = {
  type: 'NedoLiteral';
  numerator: bigint;
  denominator: bigint;
  // These synthetic fields are not found in the AST
  equaveNumerator?: number;
  equaveDenominator?: number;
};

export type CentsLiteral = {
  type: 'CentsLiteral';
  whole: bigint;
  fractional: string;
};

export type CentLiteral = {
  type: 'CentLiteral';
};

export type ReciprocalCentLiteral = {
  type: 'ReciprocalCentLiteral';
};

export type TrueLiteral = {
  type: 'TrueLiteral';
};

export type FalseLiteral = {
  type: 'FalseLiteral';
};

export type HertzLiteral = {
  type: 'HertzLiteral';
  prefix: MetricPrefix;
};

export type SecondLiteral = {
  type: 'SecondLiteral';
  prefix: MetricPrefix;
};

export type FJS = {
  type: 'FJS';
  downs: number;
  pythagorean: Pythagorean;
  superscripts: bigint[];
  subscripts: bigint[];
};

export type AbsoluteFJS = {
  type: 'AbsoluteFJS';
  downs: number;
  pitch: AbsolutePitch;
  superscripts: bigint[];
  subscripts: bigint[];
};

export type WartsLiteral = {
  type: 'WartsLiteral';
  equave: string;
  divisions: bigint;
  warts: string[];
  basis: string[];
};

export type VectorComponent = {
  sign: '' | '+' | '-';
  left: bigint;
  separator?: '/' | '.';
  right: string;
  exponent: bigint | null;
};

export type MonzoLiteral = {
  type: 'MonzoLiteral';
  components: VectorComponent[];
  downs: number;
};

export type ValLiteral = {
  type: 'ValLiteral';
  components: VectorComponent[];
};

export type IntervalLiteral =
  | IntegerLiteral
  | DecimalLiteral
  | FractionLiteral
  | NedjiLiteral
  | CentsLiteral
  | CentLiteral
  | ReciprocalCentLiteral
  | TrueLiteral
  | FalseLiteral
  | FJS
  | AbsoluteFJS
  | HertzLiteral
  | SecondLiteral
  | MonzoLiteral
  | ValLiteral
  | WartsLiteral;

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

export function upNode(node?: IntervalLiteral): IntervalLiteral | undefined {
  if (!node) {
    return undefined;
  }
  switch (node.type) {
    case 'FJS':
      return {
        ...node,
        downs: node.downs - 1,
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
    if (
      a.equaveNumerator !== b.equaveNumerator ||
      a.equaveDenominator !== b.equaveDenominator
    ) {
      return undefined;
    }
    const denominator = bigLcm(a.denominator, b.denominator);
    return {
      type: a.type,
      numerator:
        (denominator / a.denominator) * a.numerator +
        (denominator / b.denominator) * b.numerator,
      denominator,
      equaveNumerator: a.equaveNumerator,
      equaveDenominator: a.equaveDenominator,
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
    const negB = {...b};
    negB.numerator = -b.numerator;
    return addNodes(a, negB);
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

export function mulNodes(
  a?: IntervalLiteral,
  b?: IntervalLiteral
): IntervalLiteral | undefined {
  if (!a || !b) {
    return undefined;
  }
  if (a.type === 'IntegerLiteral' && b.type === 'NedoLiteral') {
    return {
      type: 'NedoLiteral',
      numerator: a.value * b.numerator,
      denominator: b.denominator,
      equaveNumerator: b.equaveNumerator,
      equaveDenominator: b.equaveDenominator,
    };
  }
  return undefined;
}

export function projectNodes(
  octaves?: IntervalLiteral,
  base?: IntervalLiteral
): IntervalLiteral | undefined {
  if (!octaves || !base) {
    return undefined;
  }
  if (octaves.type === 'NedoLiteral' && octaves.equaveNumerator === undefined) {
    if (base.type === 'IntegerLiteral') {
      return {
        ...octaves,
        equaveNumerator: Number(base.value),
      };
    } else if (base.type === 'FractionLiteral') {
      return {
        ...octaves,
        equaveNumerator: Number(base.numerator),
        equaveDenominator: Number(base.denominator),
      };
    }
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

function formatUps(literal: FJS | AbsoluteFJS | MonzoLiteral) {
  if (literal.downs > 0) {
    return 'v'.repeat(literal.downs);
  } else {
    return '^'.repeat(-literal.downs);
  }
}

function formatFJS(literal: FJS) {
  const ups = formatUps(literal);
  const d = literal.pythagorean.degree;
  return `${ups}${literal.pythagorean.quality}${d.negative ? '-' : ''}${
    d.base + 7 * d.octaves
  }${tailFJS(literal)}`;
}

function formatAbsoluteFJS(literal: AbsoluteFJS) {
  const ups = formatUps(literal);
  const p = literal.pitch;
  return `${ups}${p.nominal}${p.accidentals.join('')}${p.octave}${tailFJS(
    literal
  )}`;
}

function formatDecimal(literal: DecimalLiteral) {
  let result = literal.whole.toString();
  if (literal.fractional) {
    result += '.' + literal.fractional;
  }
  return `${result}e${literal.exponent ?? '0'}`;
}

export function formatComponent(component: VectorComponent) {
  const {sign, left, separator, right, exponent} = component;
  const exponentPart = exponent ? `e${exponent}` : '';
  return `${sign === '-' ? '-' : ''}${left}${
    separator ?? ''
  }${right}${exponentPart}`;
}

function formatComponents(components: VectorComponent[]) {
  return components.map(formatComponent).join(' ');
}

function formatNedji(literal: NedjiLiteral) {
  if (literal.equaveNumerator === undefined) {
    return `${literal.numerator}\\${literal.denominator}`;
  }
  let equave = literal.equaveNumerator.toString();
  if (literal.equaveDenominator !== undefined) {
    equave += '/' + literal.equaveDenominator.toString();
  }
  return `${literal.numerator}\\${literal.denominator}<${equave}>`;
}

export function toString(literal: IntervalLiteral) {
  switch (literal.type) {
    case 'NedoLiteral':
      return formatNedji(literal);
    case 'FractionLiteral':
      return `${literal.numerator}/${literal.denominator}`;
    case 'DecimalLiteral':
      return formatDecimal(literal);
    case 'CentsLiteral':
      return `${literal.whole}.${literal.fractional}`;
    case 'CentLiteral':
      return 'c';
    case 'ReciprocalCentLiteral':
      return '€';
    case 'TrueLiteral':
      return 'true';
    case 'FalseLiteral':
      return 'false';
    case 'FJS':
      return formatFJS(literal);
    case 'AbsoluteFJS':
      return formatAbsoluteFJS(literal);
    case 'WartsLiteral':
      return `${literal.equave}${literal.divisions}${literal.warts.join(
        ''
      )}@${literal.basis.join('.')}`;
    case 'HertzLiteral':
      return `${literal.prefix}Hz`;
    case 'SecondLiteral':
      return `${literal.prefix}s`;
    case 'MonzoLiteral':
      return `${formatUps(literal)}[${formatComponents(literal.components)}>`;
    case 'ValLiteral':
      return `<${formatComponents(literal.components)}]`;
    default:
      return literal.value.toString();
  }
}
