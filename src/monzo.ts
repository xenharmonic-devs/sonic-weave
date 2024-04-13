import {
  centsToValue,
  Fraction,
  FractionValue,
  gcd,
  lcm,
  primeLimit,
  PRIMES,
  PRIME_CENTS,
  toMonzoAndResidual,
  valueToCents,
  mmod,
  BIG_INT_PRIMES,
} from 'xen-dev-utils';

import {
  ABSURD_EXPONENT,
  FRACTION_PRIMES,
  NEGATIVE_ONE,
  ONE,
  TWO,
  ZERO,
  bigGcd,
  validateBigInt,
} from './utils';
import {
  NedjiLiteral,
  FractionLiteral,
  CentsLiteral,
  IntegerLiteral,
  MonzoLiteral,
  VectorComponent,
  DecimalLiteral,
  RadicalLiteral,
  numberToDecimalLiteral,
  BasisElement,
  fractionToVectorComponent,
  literalToString,
  ValLiteral,
} from './expression';

/**
 * Fractional prime exponents of rational numbers for exact representation of square roots etc.
 */
export type FractionalMonzo = Fraction[];

/**
 * Interval domain. The operator '+' means addition in the linear domain. In the logarithmic domain '+' correspond to multiplication of the underlying values instead.
 * Cologarithmic values are meant for mapping between values, usually just intonation and steps of equal temperaments.
 */
export type Domain = 'linear' | 'logarithmic' | 'cologarithmic';

const MAX_POW_DENOMINATOR = 10000;

let NUMBER_OF_COMPONENTS = 9; // Primes 2, 3, 5, 7, 11, 13, 17, 19 and 23

/**
 * Set the default number of components in the vector part of time monzos.
 * @param n New default length of the vector part.
 */
export function setNumberOfComponents(n: number) {
  NUMBER_OF_COMPONENTS = n;
}

/**
 * Get the default number of components in the vector part of extended monzos.
 * @returns The default length of the vector part.
 */
export function getNumberOfComponents() {
  return NUMBER_OF_COMPONENTS;
}

/**
 * Check if two fractional monzos are equal.
 * @param a The first monzo.
 * @param b The second monzo.
 * @returns `true` if the two values are equal.
 */
function monzosEqual(a: FractionalMonzo, b: FractionalMonzo): boolean {
  if (a === b) {
    return true;
  }
  if (a.length > b.length) {
    return monzosEqual(b, a);
  }
  for (let i = 0; i < a.length; ++i) {
    if (!a[i].equals(b[i])) {
      return false;
    }
  }
  for (let i = a.length; i < b.length; ++i) {
    if (b[i].n !== 0) {
      return false;
    }
  }
  return true;
}

/**
 * Check if a number is a power of two.
 * @param n Real number to check.
 * @returns `true` if `n` is a power of two.
 */
function isPowerOfTwo(n: number) {
  if (n >= 1 && n < 0x100000000) {
    return n && !(n & (n - 1));
  }
  return Math.log2(n) % 1 === 0;
}

function isDecimal(fraction: Fraction) {
  let d = fraction.d;
  while (d % 2 === 0) {
    d /= 2;
  }
  while (d % 5 === 0) {
    d /= 5;
  }
  return d === 1;
}

function max(a: Fraction, b: Fraction) {
  if (a.compare(b) < 0) {
    return b;
  }
  return a;
}

function min(a: Fraction, b: Fraction) {
  if (a.compare(b) > 0) {
    return b;
  }
  return a;
}

/**
 * Fractional monzo with multiplicative residue and arbitrary cents offset measured in time-related units (usually Hz).
 *
 * Used to represent the value of musical objects like 432Hz, 5/3, 7\12 (N-of-EDO) or arbitrary intervals measured in cents.
 */
export class TimeMonzo {
  timeExponent: Fraction;
  primeExponents: FractionalMonzo;
  residual: Fraction;
  cents: number;

  /**
   * Construct a fractional monzo with multiplicative residue and arbitrary cents offset.
   * @param timeExponent Exponent of the seconds unit.
   * @param primeExponents Fractional monzo part.
   * @param residual Multiplicative residue that is too complex to fit in the vector part.
   * @param cents Cents offset.
   */
  constructor(
    timeExponent: Fraction,
    primeExponents: FractionalMonzo,
    residual?: Fraction,
    cents = 0
  ) {
    if (residual === undefined) {
      residual = new Fraction(1);
    }
    this.timeExponent = timeExponent;
    this.primeExponents = primeExponents;
    this.residual = residual;
    this.cents = cents;
  }

  /**
   * Construct a time monzo from a rational number.
   * @param fraction Rational number to convert.
   * @param numberOfComponents Number of components in the monzo vector part.
   * @returns Time monzo representing the just intonation interval.
   */
  static fromFraction(fraction: FractionValue, numberOfComponents?: number) {
    const [vector, residual] = toMonzoAndResidual(
      fraction,
      numberOfComponents ?? NUMBER_OF_COMPONENTS
    );
    return new TimeMonzo(
      new Fraction(0),
      vector.map(c => new Fraction(c)),
      residual
    );
  }

  /**
   * Construct a time monzo from an interval measured in cents.
   * @param cents The amount of cents to convert. An octave (2/1) divided into 12 semitones 100 cents each.
   * @param numberOfComponents Number of components in the monzo vector part.
   * @returns Time monzo with a zero vector part and the specified cents offset.
   */
  static fromCents(cents: number, numberOfComponents?: number) {
    numberOfComponents ??= NUMBER_OF_COMPONENTS;
    const vector: FractionalMonzo = [];
    while (vector.length < numberOfComponents) {
      vector.push(new Fraction(0));
    }
    const residual = new Fraction(1);
    // Normalize representation of zero.
    if (cents === -Infinity) {
      residual.s = 0;
      residual.n = 0;
      cents = 0;
    }
    return new TimeMonzo(new Fraction(0), vector, residual, cents);
  }

  /**
   * Construct a time monzo from a pitch-space fraction of a frequency-space fraction.
   * @param fractionOfEquave Fraction of the equave measured in pitch-space.
   * @param equave Equave measured in frequency-space. Defaults to the octave (2/1).
   * @param numberOfComponents Number of components in the monzo vector part.
   * @returns Time monzo representing N-of-EDO (default) or a generic EDJI interval.
   */
  static fromEqualTemperament(
    fractionOfEquave: FractionValue,
    equave?: FractionValue,
    numberOfComponents?: number
  ) {
    if (equave === undefined) {
      equave = TWO;
    }
    if (numberOfComponents === undefined) {
      numberOfComponents = Math.max(
        primeLimit(equave, true),
        NUMBER_OF_COMPONENTS
      );
    } else if (primeLimit(equave, true) > numberOfComponents) {
      throw new Error(`Not enough components to represent equave ${equave}.`);
    }
    const [equaveVector, residual] = toMonzoAndResidual(
      equave,
      numberOfComponents
    );
    if (!residual.isUnity()) {
      throw new Error('Unable to convert equave to monzo.');
    }
    const fractionOfEquave_ = new Fraction(fractionOfEquave);
    const vector = equaveVector.map(component =>
      fractionOfEquave_.mul(component)
    );
    return new TimeMonzo(new Fraction(0), vector);
  }

  /**
   * Constuct a time monzo from a value measured in frequency ratio space.
   * @param value Musical ratio in frequency-space.
   * @param numberOfComponents Number of components in the monzo vector part.
   * @returns Time monzo with a zero vector part and the specified value converted to a cents offset.
   */
  static fromValue(value: number, numberOfComponents?: number) {
    numberOfComponents ??= NUMBER_OF_COMPONENTS;
    const vector: FractionalMonzo = [];
    while (vector.length < numberOfComponents) {
      vector.push(new Fraction(0));
    }
    if (value === 0) {
      return new TimeMonzo(new Fraction(0), vector, new Fraction(0));
    }
    const residual = new Fraction(1);
    if (value < 0) {
      residual.s = -1;
      value = -value;
    }
    return new TimeMonzo(
      new Fraction(0),
      vector,
      residual,
      valueToCents(value)
    );
  }

  /**
   * Construct a time monzo from a value that's a rational multiple of 1 Hz.
   * @param frequency Frequency measured in oscillations per second.
   * @param numberOfComponents Number of components in the monzo vector part.
   * @returns Time monzo representing the frequency.
   */
  static fromFractionalFrequency(
    frequency: FractionValue,
    numberOfComponents?: number
  ) {
    const result = TimeMonzo.fromFraction(frequency, numberOfComponents);
    result.timeExponent = new Fraction(-1);
    return result;
  }

  /**
   * Construct a time monzo from a value measured in Hz.
   * @param frequency Frequency measured in oscillations per second.
   * @param numberOfComponents Number of components in the monzo vector part.
   * @returns Time monzo representing the frequency.
   */
  static fromArbitraryFrequency(
    frequency: number,
    numberOfComponents?: number
  ) {
    const result = TimeMonzo.fromValue(frequency, numberOfComponents);
    result.timeExponent = new Fraction(-1);
    return result;
  }

  /**
   * Construct a time monzo from a harmonic.
   * @param value Index of the harmonic with 1/1 starting from 1.
   * @param numberOfComponents Number of components in the monzo vector part.
   * @returns Time monzo representing the harmonic.
   */
  static fromBigInt(value: bigint, numberOfComponents?: number) {
    const [vector, residual] = toMonzoAndResidual(
      value,
      numberOfComponents ?? NUMBER_OF_COMPONENTS
    );
    const intResidual = Number(residual);
    if (Math.abs(intResidual) > Number.MAX_SAFE_INTEGER) {
      throw new Error('Residual exceeds safe limit');
    }
    return new TimeMonzo(
      ZERO,
      vector.map(c => new Fraction(c)),
      new Fraction(intResidual)
    );
  }

  /**
   * Construct a time monzo from a rational number.
   * @param numerator Numerator of the number.
   * @param denominator Denominator of the number.
   * @param numberOfComponents Number of components in the monzo vector part.
   * @returns Time monzo representing the just intonation interval.
   */
  static fromBigNumeratorDenominator(
    numerator: bigint,
    denominator: bigint,
    numberOfComponents?: number
  ) {
    if (denominator === 0n) {
      throw new Error('Division by zero');
    }
    numberOfComponents ??= NUMBER_OF_COMPONENTS;
    const [positiveVector, numeratorResidual] = toMonzoAndResidual(
      numerator,
      numberOfComponents
    );
    const [negativeVector, denominatorResidual] = toMonzoAndResidual(
      denominator,
      numberOfComponents
    );
    const commonFactor = bigGcd(numeratorResidual, denominatorResidual);
    const residual = new Fraction(
      Number(numeratorResidual / commonFactor),
      Number(denominatorResidual / commonFactor)
    );
    return new TimeMonzo(
      ZERO,
      positiveVector.map((p, i) => new Fraction(p - negativeVector[i])),
      residual
    );
  }

  /**
   * Number of components in the monzo vector part.
   */
  get numberOfComponents() {
    return this.primeExponents.length;
  }

  set numberOfComponents(value: number) {
    while (this.primeExponents.length > value) {
      const index = this.primeExponents.length - 1;
      const pe = this.primeExponents.pop()!;
      if (pe.d === 1) {
        this.residual = this.residual.mul(FRACTION_PRIMES[index].pow(pe)!);
      } else {
        this.cents += PRIME_CENTS[index] * pe.valueOf();
      }
    }
    if (this.primeExponents.length < value) {
      const [residualMonzo, newResidual] = toMonzoAndResidual(
        this.residual,
        value
      );
      while (this.primeExponents.length < value) {
        this.primeExponents.push(
          new Fraction(residualMonzo[this.primeExponents.length])
        );
      }
      this.residual = newResidual;
    }
  }

  /**
   * The first monzo component. The exponent of 2.
   */
  get octaves() {
    if (this.numberOfComponents > 0) {
      return this.primeExponents[0];
    }
    let result = new Fraction(0);
    let n = this.residual.n;
    while (n % 2) {
      n /= 2;
      result = result.add(1);
    }
    let d = this.residual.d;
    while (d % 2) {
      d /= 2;
      result = result.sub(1);
    }
    return result;
  }

  /**
   * Create a deep copy of this time monzo.
   * @returns A clone with independent vector part.
   */
  clone() {
    const vector: FractionalMonzo = [
      ...this.primeExponents.map(c => c.clone()),
    ];
    return new TimeMonzo(
      this.timeExponent.clone(),
      vector,
      this.residual.clone(),
      this.cents
    );
  }

  /**
   * Convert the time monzo to a fraction in linear space.
   * @returns Musical ratio as a fraction in linear space corresponding to the unit of time of the original time monzo.
   * @throws An error if the time monzo cannot be represented as a ratio.
   */
  toFraction() {
    if (this.isNonAlgebraic()) {
      throw new Error('Unable to convert irrational number to fraction');
    }
    if (!this.primeExponents.length) {
      return this.residual.clone();
    }
    let result = this.residual;
    this.primeExponents.forEach((component, i) => {
      const factor = FRACTION_PRIMES[i].pow(component);
      if (factor === null) {
        throw new Error('Unable to convert irrational number to fraction');
      }
      result = result.mul(factor);
    });
    return result;
  }

  /**
   * Convert the time monzo to a BigInt numerator and denominator in linear space.
   * @returns Musical ratio as a fraction in linear space corresponding to the unit of time.
   * @throws An error if the time monzo cannot be represented as a ratio.
   */
  toBigNumeratorDenominator() {
    if (this.isNonAlgebraic()) {
      throw new Error('Unable to convert irrational number to fraction.');
    }
    let numerator = BigInt(this.residual.n * this.residual.s);
    let denominator = BigInt(this.residual.d);
    this.primeExponents.forEach((component, i) => {
      if (component.d !== 1) {
        throw new Error('Unable to convert irrational number to fraction.');
      }
      const n = BigInt(component.n);
      if (n > ABSURD_EXPONENT) {
        throw new Error('Integer overflow.');
      }
      if (component.s > 0) {
        numerator *= BIG_INT_PRIMES[i] ** n;
      } else if (component.s < 0) {
        denominator *= BIG_INT_PRIMES[i] ** n;
      }
    });
    // Validate the actual result.
    validateBigInt(numerator);
    validateBigInt(denominator);
    return {numerator, denominator};
  }

  /**
   * Convert the time monzo to an integer in linear space.
   * @returns Musical ratio as an integer in linear space corresponding to the unit of time of the time monzo.
   * @throws An error if the time monzo cannot be represented as an integer.
   */
  toBigInteger() {
    if (this.isNonAlgebraic()) {
      throw new Error('Unable to convert irrational number to integer.');
    }
    if (this.residual.d !== 1) {
      throw new Error('Unable to convert fractional number to integer.');
    }
    let result = BigInt(this.residual.n * this.residual.s);
    this.primeExponents.forEach((component, i) => {
      if (component.d !== 1) {
        throw new Error('Unable to convert irrational number to integer.');
      }
      if (component.s < 0) {
        throw new Error('Unable to convert fractional number to integer.');
      }
      const n = BigInt(component.n);
      if (n > 3322n) {
        throw new Error('Integer overflow.');
      }
      result *= BIG_INT_PRIMES[i] ** n;
    });
    validateBigInt(result);
    return result;
  }

  /**
   * Convert the time monzo to cents.
   * @param ignoreSign Compute the size of the absolute value.
   * @returns Size of the time monzo in cents.
   */
  toCents(ignoreSign = false) {
    if (this.timeExponent.n) {
      throw new Error('Unable to convert a non-scalar to cents.');
    }
    return this.totalCents(ignoreSign);
  }

  /**
   * Convert the time monzo to pitch-space fraction of a frequency-space fraction.
   * @returns Pair of the pitch-space fraction and the equave as a frequency-space fraction.
   * @throws An error if the time monzo cannot be represented as an EDJI interval.
   */
  toEqualTemperament() {
    if (this.isNonAlgebraic()) {
      throw new Error(
        'Unable to convert non-algebraic number to equal temperament.'
      );
    }
    if (!this.residual.isUnity()) {
      throw new Error(
        'Unable to convert non-representable fraction to equal temperament.'
      );
    }
    if (this.primeExponents.length === 0) {
      // At this point we know it's the zero monzo.
      return {
        fractionOfEquave: new Fraction(0),
        equave: new Fraction(1),
      };
    }
    // Shortcut for edos
    if (this.primeExponents.slice(1).every(pe => !pe.n)) {
      return {
        fractionOfEquave: this.primeExponents[0].clone(),
        equave: new Fraction(2),
      };
    }

    let denominator = 1;
    for (const component of this.primeExponents) {
      denominator = lcm(denominator, component.d);
    }
    let numerator = 0;
    for (const component of this.primeExponents) {
      numerator = gcd(numerator, component.mul(denominator).n);
    }
    if (numerator === 0) {
      // Equave is unity for formatting compatibility.
      return {
        fractionOfEquave: new Fraction(0),
        equave: new Fraction(1),
      };
    }
    const fractionOfEquave = new Fraction(numerator, denominator);
    const equave = this.pow(fractionOfEquave.inverse()).toFraction();

    if (equave.compare(ONE) < 0) {
      return {
        fractionOfEquave: fractionOfEquave.neg(),
        equave: equave.inverse(),
      };
    }

    return {
      fractionOfEquave,
      equave,
    };
  }

  /**
   * Convert the time monzo to a simple monzo with integer coefficients.
   * @returns Array of prime exponents.
   * @param trim If `true` trim zero components from the tail.
   * @throws An error if the time monzo cannot be represented as sufficiently simple ratio in frequency-space.
   */
  toIntegerMonzo(trim?: boolean): number[] {
    if (!this.residual.isUnity()) {
      throw new Error('Cannot convert monzo with residual to integers.');
    }
    if (this.isNonAlgebraic()) {
      throw new Error('Cannot convert monzo with offset to integers.');
    }
    const result: number[] = [];
    for (const component of this.primeExponents) {
      if (component.d !== 1) {
        throw new Error('Cannot convert fractional monzo to integers.');
      }
      result.push(component.valueOf());
    }
    while (trim && result.length && !result[result.length - 1]) {
      result.pop();
    }
    return result;
  }

  /**
   * Check if the time monzo lacks units of time/frequency.
   * @return `true` if the time monzo isn't expressed in units of time.
   */
  isScalar() {
    return this.timeExponent.n === 0;
  }

  /**
   * Check if the time monzo is not algebraic.
   * @returns `true` if the time monzo has a non-zero real cents offset.
   */
  isNonAlgebraic() {
    // This form has the intended behavior with NaN.
    return !(this.cents === 0);
  }

  /**
   * Check if the time monzo represents a whole number.
   * @returns `true` if the time monzo represents an integer ignoring units of time.
   */
  isIntegral() {
    if (this.isNonAlgebraic()) {
      return false;
    }
    if (this.residual.d !== 1) {
      return false;
    }
    for (const component of this.primeExponents) {
      if (component.s < 0 || component.d !== 1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if the time monzo represents a finite sum of powers of ten.
   * @returns `true` if the time monzo represents a decimal number ignoring units of time.
   */
  isDecimal() {
    if (this.isNonAlgebraic()) {
      return false;
    }
    if (!isDecimal(this.residual)) {
      return false;
    }
    for (const component of this.primeExponents) {
      if (component.d !== 1) {
        return false;
      }
    }
    if (this.primeExponents.length < 2) {
      return true;
    }
    if (this.primeExponents[1].s < 0) {
      return false;
    }
    for (let i = 3; i < this.primeExponents.length; ++i) {
      if (this.primeExponents[i].s < 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if the time monzo represents a musical fraction or fractional amount of time or frequency.
   * @returns `true` if the time monzo can be interpreted as a ratio in frequency-space.
   */
  isFractional() {
    if (this.isNonAlgebraic()) {
      return false;
    }
    for (const component of this.primeExponents) {
      if (component.d !== 1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if the time monzo represents a generic EDJI interval.
   * @returns `true` if the time monzo can be interpreted as pitch-space fraction of a frequency-space fraction.
   */
  isEqualTemperament() {
    if (this.isNonAlgebraic()) {
      return false;
    }
    return this.residual.isUnity();
  }

  /**
   * Check if the time monzo is expressed solely in terms of real cents.
   * @returns `true` if the time monzo is a plain real number.
   */
  isRealCents() {
    if (this.timeExponent.n) {
      return false;
    }
    for (const pe of this.primeExponents) {
      if (pe.n) {
        return false;
      }
    }
    return this.residual.isUnity();
  }

  /**
   * Check if the time monzo is a power of two in frequency space.
   * @returns `true` if the time monzo is a power of two.
   */
  isPowerOfTwo() {
    if (this.isNonAlgebraic()) {
      return false;
    }
    if (!this.primeExponents.length) {
      return isPowerOfTwo(this.residual.n) && isPowerOfTwo(this.residual.d);
    }
    if (!this.residual.isUnity()) {
      return false;
    }
    for (let i = 1; i < this.primeExponents.length; ++i) {
      if (this.primeExponents[i].n) {
        return false;
      }
    }
    return true;
  }

  /**
   * Return the frequency-space negative of the time monzo.
   * @returns The frequency-space negative of the time monzo.
   */
  neg() {
    const result = this.clone();
    result.residual = this.residual.neg();
    return result;
  }

  /**
   * Return a pitch-space negative of the time monzo.
   * @returns The frequency-space inverse of the time monzo.
   */
  inverse() {
    const timeExponent = this.timeExponent.neg();
    const vector = this.primeExponents.map(component => component.neg());
    const residual = this.residual.inverse();
    return new TimeMonzo(timeExponent, vector, residual, -this.cents);
  }

  /**
   * Combine the time monzo with another in linear space.
   * @param other Another time monzo.
   * @returns The linear sum of the time monzos.
   */
  add(other: TimeMonzo): TimeMonzo {
    if (!this.timeExponent.equals(other.timeExponent)) {
      throw new Error(
        `Cannot add time monzos with disparate units. Have s^${this.timeExponent.toFraction()} + s^${other.timeExponent.toFraction()}.`
      );
    }
    let result: TimeMonzo;
    if (this.isFractional() && other.isFractional()) {
      result = TimeMonzo.fromFraction(
        this.toFraction().add(other.toFraction()),
        Math.max(this.numberOfComponents, other.numberOfComponents)
      );
    } else {
      result = TimeMonzo.fromValue(this.valueOf() + other.valueOf());
    }
    result.timeExponent = this.timeExponent;
    return result;
  }

  /**
   * Subrtact another time monzo from this one in linear space.
   * @param other Another time monzo.
   * @returns The linear difference of the time monzos.
   */
  sub(other: TimeMonzo): TimeMonzo {
    if (this.timeExponent.compare(other.timeExponent)) {
      throw new Error(
        `Cannot subtract time monzos with disparate units. Have s^${this.timeExponent.toFraction()} + s^${other.timeExponent.toFraction()}.`
      );
    }
    let result: TimeMonzo;
    if (this.isFractional() && other.isFractional()) {
      result = TimeMonzo.fromFraction(
        this.toFraction().sub(other.toFraction()),
        Math.max(this.numberOfComponents, other.numberOfComponents)
      );
    } else {
      result = TimeMonzo.fromValue(this.valueOf() - other.valueOf());
    }
    result.timeExponent = this.timeExponent;
    return result;
  }

  /**
   * Perform harmonic addition according to the thin lens equation f⁻¹ = u⁻¹ + v⁻¹.
   * @param other Another time monzo.
   * @returns The reciprocal of the sum of the reciprocals.
   */
  lensAdd(other: TimeMonzo): TimeMonzo {
    if (this.timeExponent.compare(other.timeExponent)) {
      throw new Error(
        `Cannot lens add time monzos with disparate units. Have s^${this.timeExponent.toFraction()} + s^${other.timeExponent.toFraction()}.`
      );
    }
    let result: TimeMonzo;
    if (this.isFractional() && other.isFractional()) {
      result = TimeMonzo.fromFraction(
        this.toFraction().lensAdd(other.toFraction()),
        Math.max(this.numberOfComponents, other.numberOfComponents)
      );
    } else {
      const t = this.valueOf();
      if (t) {
        const o = other.valueOf();
        result = TimeMonzo.fromValue((t * o) / (t + o));
      } else {
        result = TimeMonzo.fromValue(0);
      }
    }
    result.timeExponent = this.timeExponent;
    return result;
  }

  /**
   * Perform harmonic subtraction f⁻¹ = u⁻¹ - v⁻¹ (a variation of the thin lens equation).
   * @param other Another time monzo.
   * @returns The reciprocal of the difference of the reciprocals.
   */
  lensSub(other: TimeMonzo): TimeMonzo {
    if (this.timeExponent.compare(other.timeExponent)) {
      throw new Error(
        `Cannot lens subtract time monzos with disparate units. Have s^${this.timeExponent.toFraction()} + s^${other.timeExponent.toFraction()}.`
      );
    }
    let result: TimeMonzo;
    if (this.isFractional() && other.isFractional()) {
      result = TimeMonzo.fromFraction(
        this.toFraction().lensSub(other.toFraction()),
        Math.max(this.numberOfComponents, other.numberOfComponents)
      );
    } else {
      const t = this.valueOf();
      if (t) {
        const o = other.valueOf();
        result = TimeMonzo.fromValue((t * o) / (o - t));
      } else {
        result = TimeMonzo.fromValue(0);
      }
    }
    result.timeExponent = this.timeExponent;
    return result;
  }

  /**
   * Multiply the time monzo with another in linear space i.e. add in logarithmic space.
   * @param other Another time monzo.
   * @returns The product of the time monzos in linear space.
   */
  mul(other: TimeMonzo): TimeMonzo {
    if (this.primeExponents.length < other.primeExponents.length) {
      return other.mul(this);
    }
    if (other.primeExponents.length < this.primeExponents.length) {
      other = other.clone();
      other.numberOfComponents = this.primeExponents.length;
    }
    const vector = [];
    for (let i = 0; i < other.primeExponents.length; ++i) {
      vector.push(this.primeExponents[i].add(other.primeExponents[i]));
    }
    let residual = new Fraction(1);
    let cents = this.cents + other.cents;
    try {
      residual = this.residual.mul(other.residual);
    } catch {
      cents += valueToCents(
        (this.residual.n * other.residual.n) /
          (this.residual.d * other.residual.d)
      );
      residual.s = this.residual.s * other.residual.s;
    }
    return new TimeMonzo(
      this.timeExponent.add(other.timeExponent),
      vector,
      residual,
      cents
    );
  }

  /**
   * Compute the greatest common divisor between this and another time monzo.
   * @param other Another time monzo.
   * @returns The largest multiplicative factor shared by both monzos.
   */
  gcd(other: TimeMonzo): TimeMonzo {
    if (this.primeExponents.length < other.primeExponents.length) {
      return other.gcd(this);
    }
    if (!this.residual.n) {
      return other.clone();
    }
    if (!other.residual.n) {
      return this.clone();
    }
    if (other.primeExponents.length < this.primeExponents.length) {
      other = other.clone();
      other.numberOfComponents = this.primeExponents.length;
    }
    const vector = [];
    for (let i = 0; i < other.primeExponents.length; ++i) {
      vector.push(min(this.primeExponents[i], other.primeExponents[i]));
    }
    const residual = this.residual.gcd(other.residual);
    return new TimeMonzo(
      min(this.timeExponent, other.timeExponent),
      vector,
      residual,
      Math.min(this.cents, other.cents)
    );
  }

  /**
   * Compute the least common multiple between this and another time monzo.
   * @param other Another time monzo.
   * @returns The smallest monzo that has both monzos as factors.
   */
  lcm(other: TimeMonzo): TimeMonzo {
    if (this.primeExponents.length < other.primeExponents.length) {
      return other.lcm(this);
    }
    if (other.primeExponents.length < this.primeExponents.length) {
      other = other.clone();
      other.numberOfComponents = this.primeExponents.length;
    }
    const vector = [];
    for (let i = 0; i < other.primeExponents.length; ++i) {
      vector.push(max(this.primeExponents[i], other.primeExponents[i]));
    }
    const residual = this.residual.lcm(other.residual);
    return new TimeMonzo(
      max(this.timeExponent, other.timeExponent),
      vector,
      residual,
      Math.max(this.cents, other.cents)
    );
  }

  /**
   * Divide the time monzo with another in linear space i.e. subtract in logarithmic space.
   * @param other Another time monzo.
   * @returns This monzo divided by the other monzo in linear space.
   */
  div(other: TimeMonzo) {
    if (!other.residual.n) {
      throw new Error('Division by zero.');
    }
    let self: TimeMonzo = this;
    if (self.primeExponents.length < other.primeExponents.length) {
      self = self.clone();
      self.numberOfComponents = other.primeExponents.length;
    }
    if (other.primeExponents.length < self.primeExponents.length) {
      other = other.clone();
      other.numberOfComponents = self.primeExponents.length;
    }
    const vector = [];
    for (let i = 0; i < other.primeExponents.length; ++i) {
      vector.push(self.primeExponents[i].sub(other.primeExponents[i]));
    }
    let residual = new Fraction(1);
    let cents = self.cents - other.cents;
    try {
      residual = self.residual.div(other.residual);
    } catch {
      cents += valueToCents(
        (self.residual.n * other.residual.d) /
          (self.residual.d * other.residual.n)
      );
      residual.s = self.residual.s * other.residual.s;
    }
    return new TimeMonzo(
      self.timeExponent.sub(other.timeExponent),
      vector,
      residual,
      cents
    );
  }

  pow(other: FractionValue | TimeMonzo) {
    if (other instanceof TimeMonzo) {
      if (other.timeExponent.n !== 0) {
        throw new Error('Can only raise to a scalar power.');
      }
      if (other.isFractional()) {
        other = other.toFraction();
      } else {
        if (this.timeExponent.n) {
          throw new Error('Cannot raise time units to an irrational power.');
        }
        return TimeMonzo.fromCents(this.totalCents() * other.valueOf());
      }
    }
    const scalar = new Fraction(other);
    if (scalar.d < MAX_POW_DENOMINATOR) {
      const vector = this.primeExponents.map(component =>
        component.mul(scalar)
      );
      let residual: Fraction | null | undefined = this.residual.pow(scalar);
      let cents = this.cents;
      if (residual === null) {
        cents += valueToCents(this.residual.valueOf());
        residual = undefined;
      }
      cents *= scalar.valueOf();
      return new TimeMonzo(
        this.timeExponent.mul(scalar),
        vector,
        residual,
        cents
      );
    }
    if (this.timeExponent.n !== 0) {
      throw new Error('Cannot raise time units to an irrational power.');
    }
    return TimeMonzo.fromCents(this.totalCents() * scalar.valueOf());
  }

  /**
   * Calculate the logarithm in the given base if it exists.
   * @param other Base of the logarithm.
   * @returns `x` such that `this ** x === other`.
   */
  log(other: FractionValue | TimeMonzo): Fraction | number {
    if (this.timeExponent.n !== 0) {
      if (other instanceof TimeMonzo) {
        if (other.timeExponent.n === 0) {
          throw new Error(
            'Cannot take a scalar logarithm of a value with time units.'
          );
        }
      } else {
        throw new Error(
          'Cannot take a scalar logarithm of a value with time units.'
        );
      }
      const solution = this.timeExponent.div(other.timeExponent);
      const n = this.numberOfComponents;
      const m = other.numberOfComponents;
      for (let i = 0; i < Math.min(n, m); ++i) {
        if (
          !this.primeExponents[i].equals(other.primeExponents[i].mul(solution))
        ) {
          throw new Error("Logarithm doesn't exist.");
        }
      }
      if (n < m) {
        for (let i = n; i < m; ++i) {
          if (other.primeExponents[i].n) {
            throw new Error("Logarithm doesn't exist.");
          }
        }
      } else if (n > m) {
        for (let i = m; i < n; ++i) {
          if (this.primeExponents[i].n) {
            throw new Error("Logarithm doesn't exist.");
          }
        }
      }
      const respow = other.residual.pow(solution);
      if (!respow || respow.compare(this.residual)) {
        throw new Error("Logarithm doesn't exist.");
      }
      return solution;
    }
    if (other instanceof TimeMonzo) {
      if (this.isNonAlgebraic() || other.isNonAlgebraic()) {
        return this.totalCents() / other.totalCents();
      }
      let self: TimeMonzo = this;
      if (self.numberOfComponents < other.numberOfComponents) {
        self = this.clone();
        self.numberOfComponents = other.numberOfComponents;
      }
      if (other.numberOfComponents < self.numberOfComponents) {
        other = other.clone();
        other.numberOfComponents = self.numberOfComponents;
      }
      let solution: Fraction | undefined;
      for (let i = 0; i < self.numberOfComponents; ++i) {
        if (solution === undefined) {
          if (other.primeExponents[i].n) {
            solution = self.primeExponents[i].div(other.primeExponents[i]);
          } else if (this.primeExponents[i].n) {
            return this.totalCents() / other.totalCents();
          }
        } else if (solution !== undefined) {
          if (
            !self.primeExponents[i].equals(
              other.primeExponents[i].mul(solution)
            )
          ) {
            return this.totalCents() / other.totalCents();
          }
        }
      }
      if (solution === undefined) {
        const residualLog = this.residual.log(other.residual);
        if (residualLog === null) {
          return this.totalCents() / other.totalCents();
        }
        return residualLog;
      }
      const residualPow = other.residual.pow(solution);
      if (residualPow === null || !residualPow.equals(this.residual)) {
        return this.totalCents() / other.totalCents();
      }
      return solution;
    }
    if (typeof other === 'number') {
      return this.totalCents() / valueToCents(other);
    }
    other = new Fraction(other);
    if (this.isFractional()) {
      const solution = this.toFraction().log(other);
      if (solution === null) {
        return this.totalCents() / valueToCents((other as Fraction).valueOf());
      }
      return solution;
    }
    return this.totalCents() / valueToCents((other as Fraction).valueOf());
  }

  /**
   * Calculate the dot product of the vector parts of two time monzos.
   * @param other Another time monzo.
   * @returns The sum of the pairwise products of the vector parts.
   */
  dot(other: TimeMonzo): Fraction {
    if (this.numberOfComponents < other.numberOfComponents) {
      return other.dot(this);
    }
    if (other.numberOfComponents < this.numberOfComponents) {
      other = other.clone();
      other.numberOfComponents = this.numberOfComponents;
    }

    if (this.residual.isUnity() || other.residual.isUnity()) {
      // Including real cents doesn't really make sense.
      // In any sensible context one of them is zero anyway.
      // Real cents are simply co-opted for ups-and-downs by giving vals a unity cents component.
      let result = new Fraction(this.cents * other.cents).simplify(1e-8);
      // Not sure if time should have zero metric or not.
      result = result.add(this.timeExponent.mul(other.timeExponent));
      for (let i = 0; i < this.primeExponents.length; ++i) {
        result = result.add(
          this.primeExponents[i].mul(other.primeExponents[i])
        );
      }
      return result;
    }
    throw new Error('Residuals prevent calculating the dot product.');
  }

  /**
   * Calculate the geometric inverse of the time monzo.
   * @returns A time monzo whose dot product with this one is unitary.
   */
  geometricInverse(): TimeMonzo {
    const magnitude = this.dot(this);
    if (magnitude.n === 0) {
      throw new Error('No geometric inverse exists.');
    }
    return this.pow(magnitude.inverse());
  }

  // Same as pow, but the offset is accumulated in cents
  /**
   * Rescale the time monzo in pitch-space and store the offset as cents.
   * @param scalar Scaling factor.
   * @returns The rescaled time monzo where only the cents offset differs from the original.
   */
  stretch(scalar: number): TimeMonzo {
    if (this.timeExponent.n) {
      throw new Error('Only scalars can be stretched.');
    }
    const offset = this.totalCents() * (scalar - 1);
    return new TimeMonzo(
      new Fraction(0),
      this.primeExponents.map(c => c.clone()),
      this.residual.clone(),
      this.cents + offset
    );
  }

  /**
   * Linear space absolute value of the time monzo.
   * @returns The time monzo unchanged or negated if negative originally.
   */
  abs() {
    if (this.residual.s < 0) {
      return this.neg();
    }
    return this.clone();
  }

  /**
   * Pitch space absolute value of the time monzo.
   * @returns The time monzo unchanged or inverted if less than one originally.
   */
  pitchAbs() {
    const result = this.clone();
    if (!result.residual.n) {
      return result;
    }
    result.residual.s = 1;
    if (result.totalCents() < 0) {
      return result.inverse();
    }
    return result;
  }

  // Consistent with Mathematics not with JS x % y.
  /**
   * Calculate modulus with respect to another time monzo.
   * @param other Another time monzo.
   * @param ceiling If `true` `x.mmod(x)` evaluates to `x`.
   * @returns This modulo the other.
   */
  mmod(other: TimeMonzo, ceiling = false) {
    if (!this.timeExponent.equals(other.timeExponent)) {
      throw new Error(
        `Cannot mod time monzos with disparate units. Have s^${this.timeExponent.toFraction()} mod s^${other.timeExponent.toFraction()}.`
      );
    }
    let result: TimeMonzo;
    if (this.isFractional() && other.isFractional()) {
      result = TimeMonzo.fromFraction(
        this.toFraction().mmod(other.toFraction()),
        Math.max(this.numberOfComponents, other.numberOfComponents)
      );
    } else {
      result = TimeMonzo.fromValue(mmod(this.valueOf(), other.valueOf()));
    }
    if (ceiling && !result.residual.n) {
      return other.clone();
    }
    result.timeExponent = this.timeExponent;
    return result;
  }

  /**
   * Calculate modulus in pitch space with respect to another time monzo.
   * @param other Another time monzo.
   * @param ceiling If `true` `x.reduce(x)` evaluates to `x`.
   * @returns This reduced by the other.
   */
  reduce(other: TimeMonzo, ceiling = false) {
    const log = this.log(other);
    if (typeof log === 'number') {
      if (ceiling) {
        return this.mul(other.pow(1 - Math.ceil(log)));
      }
      return this.div(other.pow(Math.floor(log)));
    }
    if (ceiling) {
      return this.mul(other.pow(ONE.sub(log.ceil())));
    }
    return this.div(other.pow(log.floor()));
  }

  /**
   * Project the exponent of two to the given base.
   * @param base New base to replace prime two.
   * @returns N steps of equal divisions of the new base assuming this time monzo was N steps of an equally divided octave.
   */
  project(base: TimeMonzo) {
    return base.pow(this.octaves);
  }

  /**
   * Check for strict equality between this and another time monzo.
   * @param other Another time monzo.
   * @returns `true` if the time monzos share the same time exponent, prime exponents, residual and cents offset.
   */
  strictEquals(other: TimeMonzo): boolean {
    if (this.numberOfComponents < other.numberOfComponents) {
      return other.strictEquals(this);
    }
    if (this.numberOfComponents > other.numberOfComponents) {
      other = other.clone();
      other.numberOfComponents = this.numberOfComponents;
    }
    return (
      this.timeExponent.equals(other.timeExponent) &&
      monzosEqual(this.primeExponents, other.primeExponents) &&
      this.residual.equals(other.residual) &&
      this.cents === other.cents
    );
  }

  /**
   * Convert a relative time monzo to cents.
   * Conert an absosulte time monzo to the size in cents of the scalar of its time unit.
   * @param ignoreSign Compute the size of the absolute value.
   * @returns Size of the time monzo in cents.
   */
  totalCents(ignoreSign = false) {
    let residualValue = this.residual.valueOf();
    if (ignoreSign) {
      residualValue = Math.abs(residualValue);
    }
    let total = this.cents + valueToCents(residualValue);
    for (let i = 0; i < this.primeExponents.length; ++i) {
      total += this.primeExponents[i].valueOf() * PRIME_CENTS[i];
    }
    return total;
  }

  /**
   * Convert a relative time monzo to a real number representing a ratio of frequencies.
   * Convert an absolute time monzo to the scalar of its time unit.
   * @returns A real number.
   */
  valueOf() {
    if (!this.residual.n) {
      return 0;
    }
    if (this.residual.s < 0) {
      return -centsToValue(this.totalCents(true));
    }
    return centsToValue(this.totalCents());
  }

  /**
   * Obtain an array of the time monzo representing a continued fraction. The first element always contains the whole part.
   * @returns Array of continued fraction coefficients.
   */
  toContinued() {
    if (this.isFractional()) {
      return this.toFraction().toContinued();
    }
    return new Fraction(this.valueOf()).toContinued();
  }

  /**
   * Check if this time monzo has the same size as another.
   * @param other Another time monzo.
   * @returns `true` if the time monzos are of equal size.
   */
  equals(other: TimeMonzo) {
    return this.valueOf() === other.valueOf();
  }

  /**
   * Compare this time monzo with another.
   * @param other Another time monzo.
   * @returns Result < 0 if other is larger than this. Result > 0 if other is smaller than this. Result == 0 if other is equal to this in size.
   */
  compare(other: TimeMonzo) {
    if (this.strictEquals(other)) {
      return 0;
    }
    return this.valueOf() - other.valueOf();
  }

  /**
   * Round the time monzo to a multiple of another.
   * @param other Another time monzo.
   * @returns The closest multiple of the other to this one.
   */
  roundTo(other: TimeMonzo) {
    const multiplier = Math.round(this.div(other).valueOf());
    return other.mul(TimeMonzo.fromFraction(multiplier));
  }

  /**
   * Round the time monzo to a power of another.
   * @param other Another time monzo.
   * @returns The closest power of the other to this one.
   */
  pitchRoundTo(other: TimeMonzo) {
    const multiplier = Math.round(this.totalCents() / other.totalCents());
    return other.pow(multiplier);
  }

  /**
   * Find the closest approximation of the time monzo in a harmonic series.
   * @param denominator Denominator of the harmonic series.
   * @returns The closest approximant in the series.
   */
  approximateHarmonic(denominator: number) {
    const numerator = Math.round(this.valueOf() * denominator);
    return TimeMonzo.fromFraction(
      new Fraction(numerator, denominator),
      this.numberOfComponents
    );
  }

  /**
   * Find the closest approximation of the time monzo in a subharmonic series.
   * @param numerator Numerator of the subharmonic series.
   * @returns The closest approximant in the series.
   */
  approximateSubharmonic(numerator: number) {
    const denominator = Math.round(numerator / this.valueOf());
    return TimeMonzo.fromFraction(
      new Fraction(numerator, denominator),
      this.numberOfComponents
    );
  }

  /**
   * Simplify the time monzo using the given threshold.
   * @param eps Error threshold. Defaults to `0.001`.
   * @returns Simple approximation of the time monzo.
   */
  approximateSimple(eps?: number) {
    const fraction = new Fraction(this.valueOf()).simplify(eps);
    return TimeMonzo.fromFraction(fraction, this.numberOfComponents);
  }

  /**
   * Obtain a convergent of this time monzo.
   * @param depth How many continued fraction coefficients to use after the whole part.
   * @returns Approximation of the time monzo.
   */
  getConvergent(depth: number) {
    const continuedFraction = this.toContinued().slice(0, depth + 1);
    let result = new Fraction(continuedFraction[continuedFraction.length - 1]);
    for (let i = continuedFraction.length - 2; i >= 0; i--) {
      result = result.inverse().add(continuedFraction[i]);
    }
    return TimeMonzo.fromFraction(result, this.numberOfComponents);
  }

  /**
   * Obtain a higher prime tail of this time monzo.
   * @param index Prime index with 2 at #0.
   * @returns Multiplicative tail above the given limit.
   */
  tail(index: number) {
    const result = this.clone();
    result.numberOfComponents = Math.max(result.numberOfComponents, index);
    for (let i = 0; i < index; ++i) {
      result.primeExponents[i] = ZERO;
    }
    result.cents = 0;
    return result;
  }

  /**
   * Obtain an AST node representing the time monzo as a decimal.
   * @returns Decimal literal or a real decimal literal if necessary.
   */
  asDecimalLiteral(): DecimalLiteral {
    if (this.isDecimal()) {
      return numberToDecimalLiteral(this.toFraction(), 'e');
    }
    return numberToDecimalLiteral(this.valueOf(), 'r');
  }

  /**
   * Obtain a pseudo-AST node representing the time monzo as a radical.
   * @returns Radical literal or `undefined` if representation fails.
   */
  asRadicalLiteral(): RadicalLiteral | undefined {
    if (!this.isEqualTemperament()) {
      return undefined;
    }
    try {
      const {fractionOfEquave, equave} = this.toEqualTemperament();
      return {
        type: 'RadicalLiteral',
        argument: equave,
        exponent: fractionOfEquave,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Obtain an AST node representing the time monzo as a cents literal.
   * @returns Cents literal or a hacky real cents literal if necessary.
   */
  asCentsLiteral(): CentsLiteral {
    if (this.isPowerOfTwo()) {
      const cents = this.octaves.mul(1200);
      if (isDecimal(cents)) {
        const {sign, whole, fractional} = numberToDecimalLiteral(cents, 'e');
        return {type: 'CentsLiteral', sign, whole, fractional};
      }
    }
    const cents = this.totalCents();
    if (isNaN(cents)) {
      throw new Error('Cannot represent NaN in cents.');
    }
    if (!isFinite(cents)) {
      throw new Error('Cannot represent Infinity in cents.');
    }
    let {sign, whole, fractional} = numberToDecimalLiteral(cents, 'r');
    // Note: This abuses the grammar
    fractional += 'rc';
    return {type: 'CentsLiteral', sign, whole, fractional};
  }

  /**
   * Obtain an AST node representing the time monzo as an integer literal.
   * @returns Integer literal or `undefined` if representation fails.
   */
  asIntegerLiteral(): IntegerLiteral | undefined {
    if (this.isIntegral()) {
      return {type: 'IntegerLiteral', value: this.toBigInteger()};
    }
    return undefined;
  }

  /**
   * Obtain an AST node representing the time monzo as a fraction literal.
   * @param node Reference node to infer formatting from.
   * @returns Fraction literal or `undefined` if representation fails.
   */
  asFractionLiteral(node?: FractionLiteral): FractionLiteral | undefined {
    if (this.isFractional()) {
      const {numerator, denominator} = this.toBigNumeratorDenominator();
      if (node === undefined) {
        return {
          type: 'FractionLiteral',
          numerator,
          denominator,
        };
      }
      // XXX: Using the gcd might be reasonable in some special cases but not in general.
      // let factor = bigGcd(node.numerator, node.denominator);
      if (node.denominator % denominator === 0n) {
        const factor = node.denominator / denominator;
        return {
          ...node,
          numerator: numerator * factor,
          denominator: denominator * factor,
        };
      }
      return {
        type: 'FractionLiteral',
        numerator,
        denominator,
      };
    }
    return undefined;
  }

  /**
   * Obtain an AST node representing the time monzo as a NEDJI literal.
   * @param node Reference node to infer formatting from.
   * @returns NEDJI literal or `undefined` if representation fails.
   */
  asNedjiLiteral(node?: NedjiLiteral): NedjiLiteral | undefined {
    if (this.isEqualTemperament()) {
      try {
        const {fractionOfEquave, equave} = this.toEqualTemperament();
        let {s, n, d} = fractionOfEquave;
        n *= s;
        if (!node) {
          if (equave.equals(TWO)) {
            return {
              type: 'NedjiLiteral',
              numerator: n,
              denominator: d,
              equaveNumerator: null,
              equaveDenominator: null,
            };
          } else {
            return {
              type: 'NedjiLiteral',
              numerator: n,
              denominator: d,
              equaveNumerator: equave.s * equave.n,
              equaveDenominator: equave.d,
            };
          }
        }
        if (node.equaveNumerator === null) {
          if (!equave.equals(TWO)) {
            return undefined;
          }
        } else if (
          equave.n * (node.equaveDenominator ?? 1) !==
          equave.d * node.equaveNumerator
        ) {
          return undefined;
        }
        const denominator = lcm(d, node.denominator);
        if (denominator === node.denominator) {
          return {
            ...node,
            numerator: (denominator / d) * n,
          };
        }
        return {
          ...node,
          numerator: n,
          denominator: d,
        };
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Obtain an AST node representing the time monzo as a monzo literal.
   * @returns Monzo literal.
   */
  asMonzoLiteral(trimTail = true): MonzoLiteral {
    const components: VectorComponent[] = [];
    const basis: BasisElement[] = [];
    if (this.timeExponent.equals(NEGATIVE_ONE)) {
      basis.push('Hz');
      components.push({sign: '', left: 1, right: '', exponent: null});
    } else if (this.timeExponent.n) {
      basis.push('s');
      components.push(fractionToVectorComponent(this.timeExponent));
    }
    if (this.cents) {
      basis.push('rc');
      const {sign, whole, fractional, exponent} = numberToDecimalLiteral(
        this.cents,
        'r'
      );
      components.push({
        sign,
        left: Number(whole),
        separator: '.',
        right: fractional,
        exponent,
      });
    }
    if (!this.residual.isUnity()) {
      const {s, n, d} = this.residual;
      if (d === 1) {
        basis.push({numerator: s * n, denominator: null});
        components.push({sign: '', left: 1, right: '', exponent: null});
      } else if (n === 1) {
        basis.push({numerator: s * d, denominator: null});
        components.push({sign: '-', left: 1, right: '', exponent: null});
      } else {
        basis.push({numerator: s * n, denominator: d});
        components.push({sign: '', left: 1, right: '', exponent: null});
      }
    }
    const pe = [...this.primeExponents];
    if (trimTail) {
      while (pe.length && !pe[pe.length - 1].n) {
        pe.pop();
      }
    }
    if (pe.length && basis.length) {
      let index = 0;
      while (!pe[0].n) {
        pe.shift();
        index++;
      }
      basis.push({numerator: PRIMES[index], denominator: null});
      if (pe.length > 1) {
        // Two dots looks better IMO...
        basis.push('');
        basis.push('');
      }
      for (const e of pe) {
        components.push(fractionToVectorComponent(e));
      }
    } else {
      for (const e of pe) {
        components.push(fractionToVectorComponent(e));
      }
    }
    return {type: 'MonzoLiteral', components, ups: 0, lifts: 0, basis};
  }

  asValLiteral(): ValLiteral {
    return {...this.asMonzoLiteral(false), type: 'ValLiteral'};
  }

  /**
   * Faithful string representation of the time monzo.
   * @param domain Domain of representation.
   * @returns String that evaluates to the same value as this time monzo.
   */
  toString(domain: Domain = 'linear') {
    if (isNaN(this.cents)) {
      switch (domain) {
        case 'linear':
          return 'NaN';
        case 'logarithmic':
          return 'logarithmic(NaN)';
        case 'cologarithmic':
          return 'cologarithmic(NaN)';
      }
    }
    if (!isFinite(this.cents)) {
      const value = this.residual.s < 0 ? '-Infinity' : 'Infinity';
      switch (domain) {
        case 'linear':
          return value;
        case 'logarithmic':
          return `logarithmic(${value})`;
        case 'cologarithmic':
          return `cologarithmic(${value})`;
      }
    }
    if (domain === 'linear') {
      if (this.isScalar()) {
        if (this.isIntegral()) {
          return this.toBigInteger().toString();
        } else if (this.isFractional()) {
          try {
            const {numerator, denominator} = this.toBigNumeratorDenominator();
            return `${numerator}/${denominator}`;
          } catch {
            /* Fall through */
          }
        } else if (this.isEqualTemperament()) {
          try {
            const {fractionOfEquave, equave} = this.toEqualTemperament();
            return `${equave.toFraction()}^${fractionOfEquave.toFraction()}`;
          } catch {
            /* Fall through */
          }
        }
      } else {
        if (this.timeExponent.equals(NEGATIVE_ONE)) {
          if (this.isDecimal()) {
            return `${this.toFraction().toString()} Hz`;
          } else if (this.isFractional()) {
            try {
              const {numerator, denominator} = this.toBigNumeratorDenominator();
              return `${numerator}/${denominator} Hz`;
            } catch {
              /* Fall through */
            }
          } else if (this.isEqualTemperament()) {
            try {
              const {fractionOfEquave, equave} = this.toEqualTemperament();
              return `${equave.toFraction()}^${fractionOfEquave.toFraction()} * 1Hz`;
            } catch {
              /* Fall through */
            }
          }
        }
      }
      const factors = [];
      for (let i = 0; i < this.primeExponents.length; ++i) {
        const pe = this.primeExponents[i];
        if (pe.equals(ONE)) {
          factors.push(`${PRIMES[i]}`);
        } else if (pe.n) {
          factors.push(`${PRIMES[i]}^${pe.toFraction()}`);
        }
      }
      if (this.residual.compare(ONE)) {
        factors.push(this.residual.toFraction());
      }
      if (this.cents) {
        factors.push(centsToValue(this.cents) + 'r');
      }
      if (this.timeExponent.equals(NEGATIVE_ONE)) {
        factors.push('1Hz');
      } else if (this.timeExponent.n) {
        factors.push(`(1s)^${this.timeExponent.toFraction()}`);
      }
      return factors.join('*');
    } else if (domain === 'logarithmic') {
      if (this.isScalar()) {
        if (this.isEqualTemperament()) {
          try {
            const {fractionOfEquave, equave} = this.toEqualTemperament();
            let backslashed = fractionOfEquave.toFraction().replace('/', '\\');
            if (!backslashed.includes('\\')) {
              backslashed += '\\1';
            }
            if (equave.compare(TWO)) {
              return `${backslashed}<${equave.toFraction()}>`;
            }
            return backslashed;
          } catch {
            /* Fall through */
          }
        } else if (
          this.residual.equals(ONE) &&
          this.primeExponents.every(pe => !pe.n)
        ) {
          if (this.cents) {
            if (this.cents === Math.round(this.cents)) {
              return this.cents.toString() + '\\';
            }
            return this.cents.toString() + 'rc';
          }
          return '0c';
        }
      }
      return literalToString(this.asMonzoLiteral());
    }
    return literalToString(this.asValLiteral());
  }
}
