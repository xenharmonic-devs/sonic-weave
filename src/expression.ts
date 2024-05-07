/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  ABSURD_EXPONENT,
  BinaryPrefix,
  MetricPrefix,
  validateBigInt,
} from './utils';
import {Pythagorean, AbsolutePitch} from './pythagorean';
import {Fraction, bigAbs, lcm} from 'xen-dev-utils';

/**
 * Comma sets for Functional Just System.
 *
 * '': FloraC's tweak to FJS
 *
 * 'c': Classic FJS
 *
 * 'f': FloraC's version of FJS with semiapotomic radius of tolerance
 *
 * 'n': Neutral FJS expanded to generic bridging commas by Lumi Pakkanen
 *
 * 'l': Lumi's irrational self-insert. Hi there! <3 Happy coding! <3
 *
 * 'h': Helmholtz-Ellis 2020
 *
 * 'm': Helmholtz-Ellis-Wolf-(M)onzo 53-limit
 *
 * 's': Syntonic rastmic subchroma commas by Aura
 *
 * 'q': Semiquartal analogue of Neutral FJS by Lumi Pakkanen
 *
 * 't': Tone-splitter analogue of Neutral FJS by Lumi Pakkanen
 */
export type FJSFlavor =
  | ''
  | 'n'
  | 'l'
  | 'h'
  | 'm'
  | 's'
  | 'c'
  | 'f'
  | 'q'
  | 't';

export type FJSInflection = [number, FJSFlavor];

/**
 * Numeric flavor of a {@link DecimalLiteral}.
 *
 * '': Rational number with a power of ten denominator. (Requires a decimal comma or an explicit exponent to use.)
 *
 * 'r': Real (non-algebraic) number.
 *
 * 'e': Rational number with a power of ten denominator. (Indicates an exponent of 0.)
 *
 * 'E': Rational number with a power of ten denominator. (Indicates an exponent of 0.)
 *
 * 'z': Absolute frequency that is a decimal multiple of 1 Hz.
 */
export type NumericFlavor = '' | 'r' | 'e' | 'E' | 'z';

export type Sign = '' | '+' | '-';

export type BasisFraction = {
  radical: boolean;
  numerator: number;
  denominator: number | null;
};

export type WartBasisElement = BasisFraction | '';

export type ValBasisElement = WartBasisElement | 's' | 'Hz' | 'hz';

export type BasisElement = ValBasisElement | 'rc' | 'r¢' | '1°';

export type IntegerLiteral = {
  type: 'IntegerLiteral';
  value: bigint;
};

export type DecimalLiteral = {
  type: 'DecimalLiteral';
  sign: Sign;
  whole: bigint;
  fractional: string;
  exponent: number | null;
  flavor: NumericFlavor;
};

export type FractionLiteral = {
  type: 'FractionLiteral';
  numerator: bigint;
  denominator: bigint;
};

/**
 * A synthetic AST node for formatting expressions like 2^3/5.
 */
export type RadicalLiteral = {
  type: 'RadicalLiteral';
  argument: Fraction;
  exponent: Fraction;
};

export type StepLiteral = {
  type: 'StepLiteral';
  count: number;
};

export type NedjiLiteral = {
  type: 'NedjiLiteral';
  numerator: number;
  denominator: number;
  equaveNumerator: number | null;
  equaveDenominator: number | null;
};

export type CentsLiteral = {
  type: 'CentsLiteral';
  sign: Sign;
  whole: bigint;
  fractional: string;
  exponent: number | null;
  real: boolean;
};

export type CentLiteral = {
  type: 'CentLiteral';
  real: boolean;
};

export type ReciprocalCentLiteral = {
  type: 'ReciprocalCentLiteral';
};

export type HertzLiteral = {
  type: 'HertzLiteral';
  prefix: MetricPrefix | BinaryPrefix;
};

export type SecondLiteral = {
  type: 'SecondLiteral';
  prefix: MetricPrefix | BinaryPrefix;
};

export type ReciprocalLogarithmicHertzLiteral = {
  type: 'ReciprocalLogarithmicHertzLiteral';
};

export type FJS = {
  type: 'FJS';
  ups: number;
  lifts: number;
  pythagorean: Pythagorean;
  superscripts: FJSInflection[];
  subscripts: FJSInflection[];
};

/**
 * Placeholder AST node for FJS of unknown formatting.
 * The result of FJS addition or a context shift caused by up or lift declaration.
 */
export type AspiringFJS = {
  type: 'AspiringFJS';
  flavor: FJSFlavor;
};

export type AbsoluteFJS = {
  type: 'AbsoluteFJS';
  ups: number;
  lifts: number;
  pitch: AbsolutePitch;
  superscripts: FJSInflection[];
  subscripts: FJSInflection[];
};

/**
 * Placeholder AST node for AbsoluteFJS of unknown formatting.
 * The result of FJS addition or a context shift caused by up or lift declaration.
 */
export type AspiringAbsoluteFJS = {
  type: 'AspiringAbsoluteFJS';
  flavor: FJSFlavor;
};

export type WartsLiteral = {
  type: 'WartsLiteral';
  equave: string;
  divisions: number;
  warts: string[];
  basis: WartBasisElement[];
};

export type PatentTweak = {
  element: BasisFraction;
  tweak: number;
};

export type SparseOffsetVal = {
  type: 'SparseOffsetVal';
  equave: BasisFraction;
  divisions: number;
  tweaks: PatentTweak[];
  basis: WartBasisElement[];
};

export type VectorComponent = {
  sign: Sign;
  left: number;
  separator?: '/' | '.';
  right: string;
  exponent: number | null;
};

export type MonzoLiteral = {
  type: 'MonzoLiteral';
  components: VectorComponent[];
  ups: number;
  lifts: number;
  basis: BasisElement[];
};

export type ValLiteral = {
  type: 'ValLiteral';
  components: VectorComponent[];
  basis: ValBasisElement[];
};

export type SquareSuperparticular = {
  type: 'SquareSuperparticular';
  start: bigint;
  end: bigint | null;
};

export type IntervalLiteral =
  | IntegerLiteral
  | DecimalLiteral
  | FractionLiteral
  | RadicalLiteral
  | StepLiteral
  | NedjiLiteral
  | CentsLiteral
  | CentLiteral
  | ReciprocalCentLiteral
  | FJS
  | AspiringFJS
  | AbsoluteFJS
  | AspiringAbsoluteFJS
  | HertzLiteral
  | SecondLiteral
  | ReciprocalLogarithmicHertzLiteral
  | MonzoLiteral
  | ValLiteral
  | SparseOffsetVal
  | WartsLiteral
  | SquareSuperparticular;

/**
 * Validate AST literal for display formatting.
 * @param node Interval literal to validate.
 * @throws An error if the literal is too complex to display.
 * @hidden
 */
export function validateNode(node?: IntervalLiteral) {
  if (!node) {
    return;
  }
  if (node.type === 'IntegerLiteral') {
    validateBigInt(node.value);
  } else if (node.type === 'FractionLiteral') {
    validateBigInt(node.numerator);
    validateBigInt(node.denominator);
  } else if (node.type === 'DecimalLiteral') {
    validateBigInt(node.whole);
  } else if (node.type === 'CentsLiteral') {
    validateBigInt(node.whole);
  }
}

/**
 * Infer the FJS flavor of an AST node or a pair of AST nodes.
 * @param a First node.
 * @param b Second node (optional).
 * @returns The FJS flavor that best corresponds to the input(s).
 */
export function inferFJSFlavor(
  a: FJS | AspiringFJS | AbsoluteFJS | AspiringAbsoluteFJS,
  b?: FJS | AspiringFJS | AbsoluteFJS | AspiringAbsoluteFJS
): FJSFlavor {
  let result: FJSFlavor | undefined = undefined;
  if (a.type === 'FJS' || a.type === 'AbsoluteFJS') {
    for (const [_, flavor] of a.superscripts.concat(a.subscripts)) {
      if (result === undefined) {
        result = flavor;
      } else if (result !== flavor) {
        return '';
      }
    }
  } else {
    result = a.flavor;
  }
  if (b === undefined) {
    return result ?? '';
  }
  if (b.type === 'FJS' || b.type === 'AbsoluteFJS') {
    for (const [_, flavor] of b.superscripts.concat(b.subscripts)) {
      if (result === undefined) {
        result = flavor;
      } else if (result !== flavor) {
        return '';
      }
    }
  } else {
    if (result === undefined) {
      result = b.flavor;
    } else if (result !== b.flavor) {
      return '';
    }
  }
  return result ?? '';
}

/**
 * Compute the node corresponding to the multiplicative inverse of the input (ignoring domain).
 * @param node AST node to find the inverse of.
 * @returns The inverse node or `undefined` if default formatting is enough.
 * @hidden
 */
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
    case 'NedjiLiteral':
      return {
        ...node,
        numerator: -node.numerator,
      };
  }
  return undefined;
}

const OPPOSITE_SIGN: Record<Sign, Sign> = {'': '-', '+': '-', '-': ''};

/** @hidden */
export function negNode(node?: IntervalLiteral): IntervalLiteral | undefined {
  if (!node) {
    return undefined;
  }
  switch (node.type) {
    case 'IntegerLiteral':
      return {
        ...node,
        value: -node.value,
      };
    case 'DecimalLiteral':
      return {
        ...node,
        sign: OPPOSITE_SIGN[node.sign],
      };
    case 'FractionLiteral':
      return {
        ...node,
        numerator: -node.numerator,
      };
    case 'CentsLiteral':
      return {
        ...node,
        sign: OPPOSITE_SIGN[node.sign],
      };
    case 'StepLiteral':
      return {
        ...node,
        count: -node.count,
      };
    case 'NedjiLiteral':
      return {
        ...node,
        numerator: -node.numerator,
      };
    case 'FJS':
    case 'AspiringFJS':
      return {type: 'AspiringFJS', flavor: inferFJSFlavor(node)};
    case 'AbsoluteFJS':
    case 'AspiringAbsoluteFJS':
      return {type: 'AspiringAbsoluteFJS', flavor: inferFJSFlavor(node)};
    case 'MonzoLiteral':
      return {
        ...node,
        ups: -node.ups,
        lifts: -node.lifts,
        components: node.components.map(c => ({
          ...c,
          sign: OPPOSITE_SIGN[c.sign],
        })),
      };
  }

  return undefined;
}

/** @hidden */
export function invertNode(node?: IntervalLiteral) {
  if (!node) {
    return undefined;
  }
  if (node.type === 'IntegerLiteral' || node.type === 'FractionLiteral') {
    return uniformInvertNode(node);
  }
  return undefined;
}

/** @hidden */
export function absNode(node?: IntervalLiteral): IntervalLiteral | undefined {
  if (!node) {
    return undefined;
  }
  switch (node.type) {
    case 'IntegerLiteral':
      return {type: 'IntegerLiteral', value: bigAbs(node.value)};
    case 'FractionLiteral':
      return {
        type: 'FractionLiteral',
        numerator: bigAbs(node.numerator),
        denominator: bigAbs(node.denominator),
      };
    case 'DecimalLiteral':
      return {
        ...node,
        sign: '',
      };
    case 'StepLiteral':
      return {
        ...node,
        count: Math.abs(node.count),
      };
    case 'CentsLiteral':
      return {
        ...node,
        sign: '',
      };
    case 'FJS':
    case 'AspiringFJS':
      return {type: 'AspiringFJS', flavor: inferFJSFlavor(node)};
    case 'AbsoluteFJS':
    case 'AspiringAbsoluteFJS':
      return {type: 'AspiringAbsoluteFJS', flavor: inferFJSFlavor(node)};
    case 'NedjiLiteral':
      return {
        ...node,
        numerator: Math.abs(node.numerator),
        denominator: Math.abs(node.denominator),
      };
  }
  return undefined;
}

/** @hidden */
export function sqrtNode(node?: IntervalLiteral): IntervalLiteral | undefined {
  if (!node) {
    return undefined;
  }
  switch (node.type) {
    case 'StepLiteral':
      if (node.count % 2) {
        return undefined;
      }
      return {
        ...node,
        count: node.count / 2,
      };
    case 'NedjiLiteral':
      return {
        ...node,
        numerator: node.numerator % 2 ? node.numerator : node.numerator / 2,
        denominator:
          node.numerator % 2 ? node.denominator * 2 : node.denominator,
      };
    case 'FJS':
    case 'AspiringFJS':
      return {type: 'AspiringFJS', flavor: inferFJSFlavor(node)};
    case 'AbsoluteFJS':
    case 'AspiringAbsoluteFJS':
      return {type: 'AspiringAbsoluteFJS', flavor: inferFJSFlavor(node)};
  }

  return undefined;
}

function aspireNodes(
  a: IntervalLiteral,
  b: IntervalLiteral
): IntervalLiteral | undefined {
  if (a.type === 'AbsoluteFJS' || a.type === 'AspiringAbsoluteFJS') {
    if (b.type === 'FJS' || b.type === 'AspiringFJS') {
      return {type: 'AspiringAbsoluteFJS', flavor: inferFJSFlavor(a, b)};
    }
    if (b.type === 'SquareSuperparticular') {
      return {type: 'AspiringAbsoluteFJS', flavor: inferFJSFlavor(a)};
    }
  }
  if (a.type === 'FJS' || a.type === 'AspiringFJS') {
    if (b.type === 'AbsoluteFJS' || b.type === 'AspiringAbsoluteFJS') {
      return {type: 'AspiringAbsoluteFJS', flavor: inferFJSFlavor(a, b)};
    }
    if (b.type === 'FJS' || b.type === 'AspiringFJS') {
      return {type: 'AspiringFJS', flavor: inferFJSFlavor(a, b)};
    }
    if (b.type === 'SquareSuperparticular') {
      return {type: 'AspiringFJS', flavor: inferFJSFlavor(a)};
    }
  }

  return undefined;
}

/** @hidden */
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
  if (a.type === 'NedjiLiteral' && b.type === 'NedjiLiteral') {
    if (
      a.equaveNumerator !== b.equaveNumerator ||
      a.equaveDenominator !== b.equaveDenominator
    ) {
      return undefined;
    }
    const denominator = lcm(a.denominator, b.denominator);
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
  if (a.type === 'StepLiteral' && b.type === 'StepLiteral') {
    return {
      type: a.type,
      count: a.count + b.count,
    };
  }

  return aspireNodes(a, b);
}

/** @hidden */
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
  if (a.type === 'NedjiLiteral' && b.type === 'NedjiLiteral') {
    const negB = {...b};
    negB.numerator = -b.numerator;
    return addNodes(a, negB);
  }
  if (a.type === 'AbsoluteFJS' || a.type === 'AspiringAbsoluteFJS') {
    if (b.type === 'AbsoluteFJS' || b.type === 'AspiringAbsoluteFJS') {
      return {type: 'AspiringFJS', flavor: inferFJSFlavor(a, b)};
    }
  }
  if (a.type === 'StepLiteral' && b.type === 'StepLiteral') {
    return {
      type: a.type,
      count: a.count - b.count,
    };
  }

  return aspireNodes(a, b);
}

/** @hidden */
export function modNodes(
  a?: IntervalLiteral,
  b?: IntervalLiteral
): IntervalLiteral | undefined {
  if (!a || !b) {
    return undefined;
  }
  if (
    (a.type === 'FJS' || a.type === 'AspiringFJS') &&
    (b.type === 'FJS' || b.type === 'AspiringFJS')
  ) {
    return {type: 'AspiringFJS', flavor: inferFJSFlavor(a, b)};
  }
  return undefined;
}

/** @hidden */
export function roundToNodes(
  a?: IntervalLiteral,
  b?: IntervalLiteral
): IntervalLiteral | undefined {
  if (!a || !b) {
    return undefined;
  }
  if (
    (a.type === 'FJS' || a.type === 'AspiringFJS') &&
    (b.type === 'FJS' || b.type === 'AspiringFJS')
  ) {
    return {type: 'AspiringFJS', flavor: inferFJSFlavor(a, b)};
  }
  return undefined;
}

/** @hidden */
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

/** @hidden */
export function mulNodes(
  a?: IntervalLiteral,
  b?: IntervalLiteral
): IntervalLiteral | undefined {
  if (!a || !b) {
    return undefined;
  }
  if (a.type === 'IntegerLiteral') {
    if (b.type === 'NedjiLiteral') {
      return {
        type: 'NedjiLiteral',
        numerator: Number(a.value) * b.numerator,
        denominator: b.denominator,
        equaveNumerator: b.equaveNumerator,
        equaveDenominator: b.equaveDenominator,
      };
    } else if (b.type === 'FJS' || b.type === 'AspiringFJS') {
      return {type: 'AspiringFJS', flavor: inferFJSFlavor(b)};
    } else if (b.type === 'CentLiteral') {
      return {
        type: 'CentsLiteral',
        sign: a.value < 0n ? '-' : '',
        whole: bigAbs(a.value),
        fractional: '',
        exponent: null,
        real: b.real,
      };
    } else if (b.type === 'StepLiteral') {
      return {
        type: 'StepLiteral',
        count: Number(a.value) * b.count,
      };
    }
    return undefined;
  }
  if (a.type === 'DecimalLiteral') {
    if (a.flavor === 'z') {
      return undefined;
    }
    if (b.type === 'CentLiteral') {
      return {
        type: 'CentsLiteral',
        sign: a.sign,
        whole: a.whole,
        fractional: a.fractional,
        exponent: a.exponent,
        real: b.real || a.flavor === 'r',
      };
    }
    return undefined;
  }
  if (b.type === 'IntegerLiteral' || b.type === 'DecimalLiteral') {
    return mulNodes(b, a);
  }
  return undefined;
}

/** @hidden */
export function projectNodes(
  octaves?: IntervalLiteral,
  base?: IntervalLiteral
): IntervalLiteral | undefined {
  if (!octaves || !base) {
    return undefined;
  }
  if (octaves.type === 'NedjiLiteral' && octaves.equaveNumerator === null) {
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

/** @hidden */
export function powNodes(
  a?: IntervalLiteral,
  b?: IntervalLiteral
): IntervalLiteral | undefined {
  if (!a || !b) {
    return undefined;
  }
  if (b.type === 'IntegerLiteral') {
    const exponent = b.value;
    if (exponent >= 0n) {
      if (exponent > ABSURD_EXPONENT) {
        return undefined;
      }
      if (a.type === 'IntegerLiteral') {
        return {type: 'IntegerLiteral', value: a.value ** exponent};
      } else if (a.type === 'FractionLiteral') {
        return {
          type: 'FractionLiteral',
          numerator: a.numerator ** exponent,
          denominator: a.denominator ** exponent,
        };
      }
    } else {
      if (-exponent > ABSURD_EXPONENT) {
        return undefined;
      }
      if (a.type === 'IntegerLiteral') {
        return {
          type: 'FractionLiteral',
          numerator: 1n,
          denominator: a.value ** -exponent,
        };
      } else if (a.type === 'FractionLiteral') {
        return {
          type: 'FractionLiteral',
          numerator: a.denominator ** -exponent,
          denominator: a.numerator ** -exponent,
        };
      }
    }
  }
  return undefined;
}

// == Placeholders for future implementation ==

/** @hidden */
export function ipowNodes(a?: IntervalLiteral, b?: IntervalLiteral) {
  return undefined;
}

/** @hidden */
export function logNodes(a?: IntervalLiteral, b?: IntervalLiteral) {
  return undefined;
}

/** @hidden */
export function reduceNodes(a?: IntervalLiteral, b?: IntervalLiteral) {
  return undefined;
}

/** @hidden */
export function lensAddNodes(a?: IntervalLiteral, b?: IntervalLiteral) {
  return undefined;
}

/** @hidden */
export function lensSubNodes(a?: IntervalLiteral, b?: IntervalLiteral) {
  return undefined;
}

/** @hidden */
export function pitchRoundToNodes(a?: IntervalLiteral, b?: IntervalLiteral) {
  return undefined;
}

function formatUps(literal: MonzoLiteral | FJS | AbsoluteFJS) {
  let result: string;
  if (literal.lifts < 0) {
    result = '\\'.repeat(-literal.lifts);
  } else {
    result = '/'.repeat(literal.lifts);
  }
  if (literal.ups < 0) {
    result += 'v'.repeat(-literal.ups);
  } else {
    result += '^'.repeat(literal.ups);
  }
  return result;
}

function tailFJS(literal: FJS | AbsoluteFJS) {
  let result = '';
  if (literal.superscripts.length) {
    result += '^' + literal.superscripts.map(i => i.join('')).join(',');
  }
  if (literal.subscripts.length) {
    result += '_' + literal.subscripts.map(i => i.join('')).join(',');
  }
  return result;
}

function formatFJS(literal: FJS) {
  const base = formatUps(literal);
  const d = literal.pythagorean.degree;
  const q = literal.pythagorean.quality;
  const aa = (literal.pythagorean.augmentations ?? []).join('');
  return `${base}${q.fraction}${q.quality}${aa}${d.negative ? '-' : ''}${
    d.base + 7 * d.octaves
  }${tailFJS(literal)}`;
}

/** @hidden */
export function formatAbsoluteFJS(literal: AbsoluteFJS, octaves = true) {
  const base = formatUps(literal);
  const p = literal.pitch;
  const acs = p.accidentals
    .map(ac => `${ac.fraction}${ac.accidental}`)
    .join('');
  if (octaves) {
    return `${base}${p.nominal}${acs}${p.octave}${tailFJS(literal)}`;
  }
  return `${base}${p.nominal}${acs}${tailFJS(literal)}`;
}

function formatDecimal(literal: DecimalLiteral) {
  let result = literal.sign + literal.whole.toString();
  if (literal.fractional) {
    result += '.' + literal.fractional;
  }
  const exponent =
    literal.exponent !== null
      ? 'e' + literal.exponent.toString()
      : literal.flavor
        ? ''
        : 'e';
  return `${result}${exponent}${literal.flavor}`;
}

function formatCents(literal: CentsLiteral) {
  const result =
    literal.sign + literal.whole.toString() + '.' + literal.fractional;
  const exponent =
    literal.exponent !== null ? 'e' + literal.exponent.toString() : '';
  if (literal.real) {
    return `${result}${exponent}r¢`;
  } else if (exponent) {
    return `${result}${exponent}¢`;
  }
  return result;
}

/** @hidden */
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
  if (literal.equaveNumerator === null) {
    return `${literal.numerator}\\${literal.denominator}`;
  }
  let equave = literal.equaveNumerator.toString();
  if (literal.equaveDenominator !== null) {
    equave += '/' + literal.equaveDenominator.toString();
  }
  return `${literal.numerator}\\${literal.denominator}<${equave}>`;
}

function formatBasisFraction(fraction: BasisFraction) {
  const radical = fraction.radical ? '√' : '';
  if (fraction.denominator) {
    return `${radical}${fraction.numerator}/${fraction.denominator}`;
  }
  return `${radical}${fraction.numerator}`;
}

function formatSubgroupBasis(basis: BasisElement[]) {
  return basis
    .map(b => (typeof b === 'string' ? b : formatBasisFraction(b)))
    .join('.');
}

function formatPatentTweak(tweak: PatentTweak) {
  if (tweak.tweak > 0) {
    return '^'.repeat(tweak.tweak) + formatBasisFraction(tweak.element);
  }
  return 'v'.repeat(-tweak.tweak) + formatBasisFraction(tweak.element);
}

function formatSparseOffsetVal(literal: SparseOffsetVal) {
  let result = '';
  if (literal.equave) {
    result += '[' + literal.equave + ']';
  }
  result += literal.divisions.toString();
  if (literal.tweaks) {
    result += '[' + literal.tweaks.map(formatPatentTweak).join(',') + ']';
  }
  return result + '@' + formatSubgroupBasis(literal.basis);
}

function formatMonzo(literal: MonzoLiteral) {
  let result = `${formatUps(literal)}[${formatComponents(literal.components)}>`;
  if (literal.basis.length) {
    result += `@${formatSubgroupBasis(literal.basis)}`;
  }
  return result;
}

function formatVal(literal: ValLiteral) {
  let result = `<${formatComponents(literal.components)}]`;
  if (literal.basis.length) {
    result += `@${formatSubgroupBasis(literal.basis)}`;
  }
  return result;
}

function formatSquareSuperparticular(literal: SquareSuperparticular) {
  if (literal.end) {
    return `S${literal.start}..${literal.end}`;
  }
  return `S${literal.start}`;
}

/**
 * Convert an AST node to a string representation.
 * @param literal Interval literal to convert.
 * @returns Text representation of the literal.
 */
export function literalToString(literal: IntervalLiteral) {
  switch (literal.type) {
    case 'NedjiLiteral':
      return formatNedji(literal);
    case 'StepLiteral':
      return `${literal.count}°`;
    case 'FractionLiteral':
      return `${literal.numerator}/${literal.denominator}`;
    case 'RadicalLiteral':
      return `${literal.argument.toFraction()}^${literal.exponent.toFraction()}`;
    case 'DecimalLiteral':
      return formatDecimal(literal);
    case 'CentsLiteral':
      return formatCents(literal);
    case 'CentLiteral':
      return `${literal.real ? 'r' : ''}¢`;
    case 'ReciprocalCentLiteral':
      return '€';
    case 'ReciprocalLogarithmicHertzLiteral':
      return '¶';
    case 'FJS':
      return formatFJS(literal);
    case 'AbsoluteFJS':
      return formatAbsoluteFJS(literal);
    case 'WartsLiteral':
      return `${literal.equave}${literal.divisions}${literal.warts.join(
        ''
      )}@${formatSubgroupBasis(literal.basis)}`;
    case 'SparseOffsetVal':
      return formatSparseOffsetVal(literal);
    case 'HertzLiteral':
      return `${literal.prefix}Hz`;
    case 'SecondLiteral':
      return `${literal.prefix}s`;
    case 'MonzoLiteral':
      return formatMonzo(literal);
    case 'ValLiteral':
      return formatVal(literal);
    case 'IntegerLiteral':
      return literal.value.toString();
    case 'SquareSuperparticular':
      return formatSquareSuperparticular(literal);
    default:
      throw new Error(`Cannot format ${literal.type}`);
  }
}

/**
 * Convert a floating point number or a Fraction instance to a decimal literal.
 * @param num Number to convert. Fractions should have a power of ten denominator unless flavor is 'r'.
 * @param flavor Numeric flavor of the literal.
 * @returns Virtual AST node representing a decimal literal.
 */
export function numberToDecimalLiteral(
  num: number | Fraction,
  flavor: NumericFlavor
): DecimalLiteral {
  let [wholeStr, fractional] = num.toString().split('.');
  let sign: Sign = '';
  let whole = BigInt(wholeStr);
  let exponent: number | null = null;
  fractional ??= '';
  if (whole < 0n) {
    sign = '-';
    whole = -whole;
  }
  if (fractional.includes('e')) {
    let expStr: string;
    [fractional, expStr] = fractional.split('e');
    exponent = parseInt(expStr, 10);
  }
  return {
    type: 'DecimalLiteral',
    flavor,
    sign,
    whole,
    fractional,
    exponent,
  };
}

export function fractionToVectorComponent(fraction: Fraction): VectorComponent {
  const right = fraction.d === 1 ? '' : fraction.d.toString();
  const separator = fraction.d === 1 ? undefined : '/';
  return {
    sign: fraction.s < 0 ? '-' : '',
    left: fraction.n,
    right,
    separator,
    exponent: null,
  };
}

export function integerToVectorComponent(num: number): VectorComponent {
  return {
    sign: num < 0 ? '-' : '',
    left: Math.abs(num),
    right: '',
    exponent: null,
  };
}

export function literalToJSON(literal?: IntervalLiteral) {
  if (!literal) {
    return undefined;
  }
  const type = literal.type;
  switch (literal.type) {
    case 'IntegerLiteral':
      return {type, value: literal.value.toString()};
    case 'DecimalLiteral':
      return {...literal, whole: literal.whole.toString()};
    case 'FractionLiteral':
      return {
        type,
        numerator: literal.numerator.toString(),
        denominator: literal.denominator.toString(),
      };
    case 'RadicalLiteral':
      return {
        type,
        argument: literal.argument.toJSON(),
        exponent: literal.exponent.toJSON(),
      };
    case 'CentsLiteral':
      return {
        ...literal,
        whole: literal.whole.toString(),
      };
    case 'SquareSuperparticular':
      return {
        type,
        start: literal.start.toString(),
        end: literal.end && literal.end.toString(),
      };
    case 'StepLiteral':
    case 'NedjiLiteral':
    case 'CentLiteral':
    case 'ReciprocalCentLiteral':
    case 'FJS':
    case 'AspiringFJS':
    case 'AbsoluteFJS':
    case 'AspiringAbsoluteFJS':
    case 'HertzLiteral':
    case 'SecondLiteral':
    case 'ReciprocalLogarithmicHertzLiteral':
    case 'MonzoLiteral':
    case 'ValLiteral':
    case 'SparseOffsetVal':
    case 'WartsLiteral':
      return literal;
  }
}

export function literalFromJSON(object: any): IntervalLiteral | undefined {
  if (object === undefined) {
    return undefined;
  }
  const type: IntervalLiteral['type'] = object.type;
  switch (type) {
    case 'IntegerLiteral':
      return {type, value: BigInt(object.value)};
    case 'DecimalLiteral':
      return {...object, whole: BigInt(object.whole)};
    case 'FractionLiteral':
      return {
        type,
        numerator: BigInt(object.numerator),
        denominator: BigInt(object.denominator),
      };
    case 'RadicalLiteral':
      return {
        type,
        argument: Fraction.reviver('argument', object.argument),
        exponent: Fraction.reviver('exponent', object.exponent),
      };
    case 'CentsLiteral':
      return {...object, whole: BigInt(object.whole)};
    case 'SquareSuperparticular':
      return {
        type,
        start: BigInt(object.start),
        end: object.end && BigInt(object.end),
      };
    case 'StepLiteral':
    case 'NedjiLiteral':
    case 'CentLiteral':
    case 'ReciprocalCentLiteral':
    case 'FJS':
    case 'AspiringFJS':
    case 'AbsoluteFJS':
    case 'AspiringAbsoluteFJS':
    case 'HertzLiteral':
    case 'SecondLiteral':
    case 'ReciprocalLogarithmicHertzLiteral':
    case 'MonzoLiteral':
    case 'ValLiteral':
    case 'SparseOffsetVal':
    case 'WartsLiteral':
      return object;
  }
}
