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

import {NEGATIVE_ONE, ONE, TWO, ZERO, bigGcd} from './utils';
import {
  NedjiLiteral,
  FractionLiteral,
  CentsLiteral,
  IntegerLiteral,
  MonzoLiteral,
  VectorComponent,
  DecimalLiteral,
  RadicalLiteral,
} from './expression';

export type FractionalMonzo = Fraction[];

export type Domain = 'linear' | 'logarithmic' | 'cologarithmic';

const MAX_POW_DENOMINATOR = 10000;

let NUMBER_OF_COMPONENTS = 9; // Primes 2, 3, 5, 7, 11, 13, 17, 19 and 23

/**
 * Set the default number of components in the vector part of extended monzos.
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
    if (isNaN(cents)) {
      throw new Error('Invalid cents value');
    }
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
      ZERO,
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
    return new TimeMonzo(ZERO, vector, undefined, cents);
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
      equave = new Fraction(2);
    }
    if (numberOfComponents === undefined) {
      numberOfComponents = Math.max(
        primeLimit(equave, true),
        NUMBER_OF_COMPONENTS
      );
    }
    if (primeLimit(equave, true) > numberOfComponents) {
      throw new Error(`Not enough components to represent equave ${equave}`);
    }
    const [equaveVector, residual] = toMonzoAndResidual(
      equave,
      numberOfComponents
    );
    if (!residual.equals(ONE)) {
      throw new Error('Unable to convert equave to monzo');
    }
    const fractionOfEquave_ = new Fraction(fractionOfEquave);
    const vector = equaveVector.map(component =>
      fractionOfEquave_.mul(component)
    );
    return new TimeMonzo(ZERO, vector);
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
      return new TimeMonzo(ZERO, vector, ZERO);
    }
    const residual = new Fraction(1);
    if (value < 0) {
      residual.s = -1;
      value = -value;
    }
    return new TimeMonzo(ZERO, vector, residual, valueToCents(value));
  }

  static fromFractionalFrequency(
    frequency: FractionValue,
    numberOfComponents?: number
  ) {
    const result = TimeMonzo.fromFraction(frequency, numberOfComponents);
    result.timeExponent = NEGATIVE_ONE;
    return result;
  }

  static fromArbitraryFrequency(
    frequency: number,
    numberOfComponents?: number
  ) {
    const result = TimeMonzo.fromValue(frequency, numberOfComponents);
    result.timeExponent = NEGATIVE_ONE;
    return result;
  }

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
      const index = this.primeExponents.length;
      const pe = this.primeExponents.pop()!;
      if (pe.d === 1) {
        this.residual = this.residual.mul(new Fraction(PRIMES[index]).pow(pe)!);
      } else {
        this.cents += PRIME_CENTS[index];
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
    const vector: FractionalMonzo = [];
    this.primeExponents.forEach(component => {
      vector.push(new Fraction(component));
    });
    return new TimeMonzo(
      new Fraction(this.timeExponent),
      vector,
      new Fraction(this.residual),
      this.cents
    );
  }

  /**
   * Convert the time monzo to a fraction in linear space.
   * @returns Musical ratio as a fraction in linear space corresponding to the unit of time.
   * @throws An error if the time monzo cannot be represented as a ratio.
   */
  toFraction() {
    if (this.cents !== 0) {
      throw new Error('Unable to convert irrational number to fraction');
    }
    let result = this.residual;
    this.primeExponents.forEach((component, i) => {
      const factor = new Fraction(PRIMES[i]).pow(component);
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
    if (this.cents !== 0) {
      throw new Error('Unable to convert irrational number to fraction');
    }
    let numerator = BigInt(this.residual.n * this.residual.s);
    let denominator = BigInt(this.residual.d);
    this.primeExponents.forEach((component, i) => {
      if (component.d !== 1) {
        throw new Error('Unable to convert irrational number to fraction');
      }
      const n = BigInt(component.n);
      if (component.s > 0) {
        numerator *= BIG_INT_PRIMES[i] ** n;
      } else if (component.s < 0) {
        denominator *= BIG_INT_PRIMES[i] ** n;
      }
    });
    return {numerator, denominator};
  }

  /**
   * Convert the time monzo to an integer in linear space.
   * @returns Musical ratio as an integer in linear space corresponding to the unit of time.
   * @throws An error if the time monzo cannot be represented as an integer.
   */
  toBigInteger() {
    if (this.cents !== 0) {
      throw new Error('Unable to convert irrational number to integer');
    }
    if (this.residual.d !== 1) {
      throw new Error('Unable to convert fractional number to integer');
    }
    let result = BigInt(this.residual.n * this.residual.s);
    this.primeExponents.forEach((component, i) => {
      if (component.d !== 1) {
        throw new Error('Unable to convert irrational number to integer');
      }
      if (component.s < 0) {
        throw new Error('Unable to convert fractional number to integer');
      }
      result *= BIG_INT_PRIMES[i] ** BigInt(component.n);
    });
    return result;
  }

  /**
   * Convert the time monzo to cents.
   * @returns Size of the time monzo in cents.
   */
  toCents() {
    if (this.timeExponent.n !== 0) {
      throw new Error('Unable to convert a non-scalar to cents');
    }
    return this.totalCents();
  }

  /**
   * Convert the time monzo to pitch-space fraction of a frequency-space fraction.
   * @returns Pair of the pitch-space fraction and the equave as a frequency-space fraction.
   * @throws An error if the time monzo cannot be represented as an EDJI interval.
   */
  toEqualTemperament() {
    if (this.cents !== 0) {
      throw new Error(
        'Unable to convert non-algebraic number to equal temperament'
      );
    }
    if (!this.residual.equals(ONE)) {
      throw new Error(
        'Unable to convert non-representable fraction to equal temperament'
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
      return {fractionOfEquave: this.primeExponents[0], equave: TWO};
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
   * @throws An error if the time monzo cannot be represented as sufficiently simple ratio in frequency-space.
   */
  toIntegerMonzo(): number[] {
    if (!this.residual.equals(ONE)) {
      throw new Error('Cannot convert monzo with residual to integers');
    }
    if (this.cents) {
      throw new Error('Cannot convert monzo with offset to integers');
    }
    const result: number[] = [];
    for (const component of this.primeExponents) {
      if (component.d !== 1) {
        throw new Error('Cannot convert fractional monzo to integers');
      }
      result.push(component.valueOf());
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

  isIntegral() {
    if (this.cents !== 0) {
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

  isDecimal() {
    if (this.cents !== 0) {
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
   * Check if the time monzo represents a musical fraction or fractional amount of time/frequency.
   * @returns `true` if the time monzo can be interpreted as a ratio in frequency-space.
   */
  isFractional() {
    if (this.cents !== 0) {
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
    if (this.cents !== 0) {
      return false;
    }
    if (!this.residual.equals(ONE)) {
      return false;
    }
    return true;
  }

  /**
   * Check if the time monzo is expressed solely in terms of hard cents.
   * @returns `true` if the time monzo is a plain real number.
   */
  isHardCents() {
    if (this.timeExponent.n) {
      return false;
    }
    for (const pe of this.primeExponents) {
      if (pe.n) {
        return false;
      }
    }
    if (this.residual.compare(ONE)) {
      return false;
    }
    return true;
  }

  /**
   * Check if the time monzo is a power of two in frequency space.
   * @returns `true` if the time monzo is a power of two.
   */
  isPowerOfTwo() {
    if (this.cents !== 0) {
      return false;
    }
    if (!this.primeExponents.length) {
      return isPowerOfTwo(this.residual.n) && isPowerOfTwo(this.residual.d);
    }
    if (!this.residual.equals(ONE)) {
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
    if (this.timeExponent.compare(other.timeExponent)) {
      throw new Error(
        `Cannot add time monzos with disparate units. Have s^${this.timeExponent.toFraction()} + s^${other.timeExponent.toFraction()}`
      );
    }
    let result: TimeMonzo;
    if (this.isFractional() && other.isFractional()) {
      result = TimeMonzo.fromFraction(
        this.toFraction().add(other.toFraction()),
        Math.max(this.numberOfComponents, other.numberOfComponents)
      );
      result.timeExponent = this.timeExponent;
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
        `Cannot subtract time monzos with disparate units. Have s^${this.timeExponent.toFraction()} + s^${other.timeExponent.toFraction()}`
      );
    }
    let result: TimeMonzo;
    if (this.isFractional() && other.isFractional()) {
      result = TimeMonzo.fromFraction(
        this.toFraction().sub(other.toFraction()),
        Math.max(this.numberOfComponents, other.numberOfComponents)
      );
      result.timeExponent = this.timeExponent;
    } else {
      result = TimeMonzo.fromValue(this.valueOf() - other.valueOf());
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
    const residual = this.residual.mul(other.residual);
    return new TimeMonzo(
      this.timeExponent.add(other.timeExponent),
      vector,
      residual,
      this.cents + other.cents
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
    let self = this as TimeMonzo;
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
    const residual = self.residual.div(other.residual);
    return new TimeMonzo(
      self.timeExponent.sub(other.timeExponent),
      vector,
      residual,
      self.cents - other.cents
    );
  }

  pow(other: FractionValue | TimeMonzo) {
    if (other instanceof TimeMonzo) {
      if (other.timeExponent.n !== 0) {
        throw new Error('Can only raise to a scalar power');
      }
      if (other.isFractional()) {
        other = other.toFraction();
      } else {
        if (this.timeExponent.n !== 0) {
          throw new Error('Cannot raise time units to an irrational power');
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
      throw new Error('Cannot raise time units to an irrational power');
    }
    return TimeMonzo.fromCents(this.totalCents() * scalar.valueOf());
  }

  /**
   * Calculate the logarithm in the given base if it exists.
   * @param other Base of the logarithm.
   * @returns `x` such that `other ** x === this`.
   */
  log(other: FractionValue | TimeMonzo) {
    if (this.timeExponent.n !== 0) {
      if (other instanceof TimeMonzo) {
        if (other.timeExponent.n === 0) {
          throw new Error(
            'Cannot take a scalar logarithm of a value with time units'
          );
        }
      } else {
        throw new Error(
          'Cannot take a scalar logarithm of a value with time units'
        );
      }
      const solution = this.timeExponent.div(other.timeExponent);
      const n = this.numberOfComponents;
      const m = other.numberOfComponents;
      for (let i = 0; i < Math.min(n, m); ++i) {
        if (
          !this.primeExponents[i].equals(other.primeExponents[i].mul(solution))
        ) {
          throw new Error("Solution doesn't exist");
        }
      }
      if (n < m) {
        for (let i = n; i < m; ++i) {
          if (other.primeExponents[i].n) {
            throw new Error("Solution doesn't exist");
          }
        }
      } else if (n > m) {
        for (let i = m; i < n; ++i) {
          if (this.primeExponents[i].n) {
            throw new Error("Solution doesn't exist");
          }
        }
      }
      const respow = other.residual.pow(solution);
      if (!respow || respow.compare(this.residual)) {
        throw new Error("Solution doesn't exist");
      }
      return TimeMonzo.fromFraction(solution);
    }
    if (other instanceof TimeMonzo) {
      const copout = TimeMonzo.fromValue(
        Math.log(this.valueOf()) / Math.log(other.valueOf())
      );
      if (this.cents || other.cents) {
        return copout;
      }
      const n = this.numberOfComponents;
      const m = other.numberOfComponents;
      if (n < m) {
        for (let i = n; i < m; ++i) {
          if (other.primeExponents[i].n) {
            return copout;
          }
        }
      } else if (n > m) {
        for (let i = m; i < n; ++i) {
          if (this.primeExponents[i].n) {
            return copout;
          }
        }
      }
      let solution: Fraction | undefined;
      for (let i = 0; i < Math.min(n, m); ++i) {
        if (solution !== undefined) {
          if (
            !this.primeExponents[i].equals(
              other.primeExponents[i].mul(solution)
            )
          ) {
            return copout;
          }
        } else if (other.primeExponents[i].n) {
          solution = this.primeExponents[i].div(other.primeExponents[i]);
        }
      }
      if (solution === undefined) {
        return copout;
      }
      const respow = other.residual.pow(solution);
      if (respow === null || !respow.equals(this.residual)) {
        return copout;
      }
      return TimeMonzo.fromFraction(solution);
    }
    if (typeof other === 'number') {
      return TimeMonzo.fromValue(Math.log(this.valueOf()) / Math.log(other));
    }
    return TimeMonzo.fromValue(
      Math.log(this.valueOf()) / Math.log(new Fraction(other).valueOf())
    );
  }

  /**
   * Calculate the dot product of the vector parts of two time monzos.
   * @param other Another time monzo.
   * @returns The sum of the pairwise products of the vector parts.
   */
  dot(other: TimeMonzo): Fraction {
    if (this.primeExponents.length > other.primeExponents.length) {
      return other.dot(this);
    }

    if (!other.residual.equals(ONE)) {
      throw new Error('Residuals prevent calculating the dot product');
    }
    if (!this.residual.equals(ONE)) {
      const fix = TimeMonzo.fromFraction(
        this.residual,
        other.numberOfComponents
      );
      if (!fix.residual.equals(ONE)) {
        throw new Error('Residuals prevent calculating the dot product');
      }
      const clone = this.clone();
      clone.residual = ONE;
      return clone.mul(fix).dot(other);
    }

    // Including hard cents doesn't really make sense.
    // In any sensible context one of them is zero anyway.
    // Real cents are simply co-opted for ups-and-downs by giving vals a unity cents component.
    let result = new Fraction(this.cents * other.cents).simplify(1e-8);
    // Not sure if time should have zero metric or not.
    result.add(this.timeExponent.mul(other.timeExponent));
    for (let i = 0; i < this.primeExponents.length; ++i) {
      result = result.add(this.primeExponents[i].mul(other.primeExponents[i]));
    }
    return result;
  }

  /**
   * Calculate the geometric inverse of the time monzo.
   * @returns a time monzo whose dot product with this one is unitary.
   */
  geometricInverse(): TimeMonzo {
    const magnitude = this.dot(this);
    if (magnitude.n === 0) {
      throw new Error('No geometric inverse exists');
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
    if (this.timeExponent.n !== 0) {
      throw new Error('Only scalars can be stretched');
    }
    const offset = this.totalCents() * (scalar - 1);
    return new TimeMonzo(
      ZERO,
      this.primeExponents,
      this.residual,
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
    if (this.totalCents() < 0) {
      return this.inverse();
    }
    return this.clone();
  }

  // Consistent with Fraction.js
  /**
   * Calculate truncated modulus with respect to another time monzo.
   * @param other Another time monzo.
   * @returns This modulo the other truncated towards zero cents.
   */
  /*
  mod(other: ExtendedMonzo) {
    const truncDiv = Math.trunc(this.totalCents() / other.totalCents());
    return this.sub(other.mul(truncDiv));
  }
  */

  // Consistent with Mathematics
  /**
   * Calculate modulus with respect to another time monzo.
   * @param other Another time monzo.
   * @returns This modulo the other.
   */
  mmod(other: TimeMonzo) {
    if (this.timeExponent.compare(other.timeExponent)) {
      throw new Error(
        `Cannot mod time monzos with disparate units. Have s^${this.timeExponent.toFraction()} mod s^${other.timeExponent.toFraction()}`
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
    result.timeExponent = this.timeExponent;
    return result;
  }

  /**
   * Calculate modulus in pitch space with respect to another time monzo.
   * @param other Another time monzo.
   * @returns This reduced by the other.
   */
  reduce(other: TimeMonzo) {
    const otherCents = other.totalCents();
    if (otherCents === 0) {
      throw Error('Reduction by unison');
    }
    const floorDiv = Math.floor(this.totalCents() / otherCents);
    return this.div(other.pow(floorDiv));
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
   * Convert the time monzo to cents.
   * @returns Size of the time monzo in cents ignoring the time units.
   */
  totalCents() {
    let total = this.cents + valueToCents(this.residual.valueOf());
    this.primeExponents.forEach(
      (component, i) => (total += component.valueOf() * PRIME_CENTS[i])
    );
    return total;
  }

  /**
   * Convert the time monzo to frequency-space ratio.
   * @returns The frequency-space multiplier corresponding to this time monzo.
   */
  valueOf() {
    if (this.residual.n === 0) {
      return 0;
    }
    if (this.residual.s < 0) {
      const clone = this.clone();
      clone.residual = clone.residual.neg();
      return -centsToValue(clone.totalCents());
    }
    return centsToValue(this.totalCents());
  }

  /**
   * Gets an array of the time monzo representing a continued fraction. The first element always contains the whole part.
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

  roundTo(other: TimeMonzo) {
    const multiplier = Math.round(this.div(other).valueOf());
    return other.mul(TimeMonzo.fromFraction(multiplier));
  }

  pitchRoundTo(other: TimeMonzo) {
    const multiplier = Math.round(this.log(other).valueOf());
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
   * Simplify the time monzo under the given threshold
   * @param eps Error threshold, default = 0.001
   * @returns Simple approximant of the time monzo.
   */
  approximateSimple(eps?: number) {
    const fraction = new Fraction(this.valueOf()).simplify(eps);
    return TimeMonzo.fromFraction(fraction, this.numberOfComponents);
  }

  /**
   * Obtain a convergent of this time monzo.
   * @param depth How many continued fraction coefficients to use after the whole part.
   * @returns Approximant of the time monzo.
   */
  getConvergent(depth: number) {
    const continuedFraction = this.toContinued().slice(0, depth + 1);
    let result = new Fraction(continuedFraction[continuedFraction.length - 1]);
    for (let i = continuedFraction.length - 2; i >= 0; i--) {
      result = result.inverse().add(continuedFraction[i]);
    }
    return TimeMonzo.fromFraction(result, this.numberOfComponents);
  }

  asDecimalLiteral(): DecimalLiteral {
    if (this.isDecimal()) {
      // eslint-disable-next-line prefer-const
      let [whole, fractional] = this.toFraction().toString().split('.');
      fractional ??= '';
      return {
        type: 'DecimalLiteral',
        whole: BigInt(whole),
        fractional,
        exponent: null,
        hard: false,
      };
    }
    // eslint-disable-next-line prefer-const
    let [numeric, exponent] = this.valueOf().toString().split('e');
    exponent ??= '0';
    // eslint-disable-next-line prefer-const
    let [whole, fractional] = numeric.split('.');
    fractional ??= '';
    return {
      type: 'DecimalLiteral',
      whole: BigInt(whole),
      fractional,
      exponent: BigInt(exponent),
      hard: true,
    };
  }

  asRadicalLiteral(): RadicalLiteral | undefined {
    if (!this.isEqualTemperament()) {
      return undefined;
    }
    const {fractionOfEquave, equave} = this.toEqualTemperament();
    return {
      type: 'RadicalLiteral',
      argument: equave,
      exponent: fractionOfEquave,
    };
  }

  asCentsLiteral(): CentsLiteral {
    if (this.isPowerOfTwo()) {
      const cents = this.octaves.mul(1200);
      if (isDecimal(cents)) {
        // eslint-disable-next-line prefer-const
        let [whole, fractional] = cents.toString().split('.');
        fractional ??= '';
        return {type: 'CentsLiteral', whole: BigInt(whole), fractional};
      }
    }
    const cents = this.totalCents();
    const whole = Math.trunc(cents);
    // Note: This abuses the grammar
    const fractional = ((cents - whole).toString().split('.')[1] ?? '') + '!c';
    return {type: 'CentsLiteral', whole: BigInt(whole), fractional};
  }

  asIntegerLiteral(): IntegerLiteral | undefined {
    if (this.isIntegral()) {
      return {type: 'IntegerLiteral', value: this.toBigInteger()};
    }
    return undefined;
  }

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
      let factor = bigGcd(node.numerator, node.denominator);
      if (factor === 1n && node.denominator % denominator === 0n) {
        factor = node.denominator / denominator;
      }
      return {
        ...node,
        numerator: numerator * factor,
        denominator: denominator * factor,
      };
    }
    return undefined;
  }

  asNedjiLiteral(node: NedjiLiteral): NedjiLiteral | undefined {
    if (this.isEqualTemperament()) {
      try {
        const {fractionOfEquave, equave} = this.toEqualTemperament();
        if (node.equaveNumerator === undefined) {
          if (equave.compare(TWO)) {
            return undefined;
          }
        } else if (
          equave.n !== node.equaveNumerator ||
          equave.d !== (node.equaveDenominator ?? 1)
        ) {
          return undefined;
        }
        const denominator = lcm(fractionOfEquave.d, Number(node.denominator));
        if (denominator === Number(node.denominator)) {
          return {
            ...node,
            numerator: (denominator / fractionOfEquave.d) * fractionOfEquave.n,
          };
        }
        return {
          ...node,
          numerator: fractionOfEquave.n,
          denominator: fractionOfEquave.d,
        };
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  asMonzoLiteral(): MonzoLiteral | undefined {
    if (this.cents) {
      return undefined;
    }
    if (this.residual.compare(ONE)) {
      return undefined;
    }
    const components: VectorComponent[] = [];
    for (const pe of this.primeExponents) {
      const right = pe.d === 1 ? '' : pe.d.toString();
      const separator = pe.d === 1 ? undefined : '/';
      const component: VectorComponent = {
        sign: pe.s < 0 ? '-' : '',
        left: BigInt(pe.n),
        right,
        separator,
        exponent: null,
      };
      components.push(component);
    }
    while (components.length && components[components.length - 1].left === 0n) {
      components.pop();
    }
    return {type: 'MonzoLiteral', components, ups: 0, lifts: 0};
  }

  /**
   * Faithful string representation of the monzo.
   * @param domain Domain of representation.
   * @returns String that evaluates to the same value as this monzo.
   */
  toString(domain: Domain = 'linear') {
    if (domain === 'linear') {
      if (this.isScalar()) {
        if (this.isIntegral()) {
          return this.toBigInteger().toString();
        } else if (this.isFractional()) {
          return this.toFraction().toFraction();
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
            return `${this.toFraction().toFraction()} Hz`;
          } else if (this.isEqualTemperament()) {
            try {
              const {fractionOfEquave, equave} = this.toEqualTemperament();
              return `${equave.toFraction()}^${fractionOfEquave.toFraction()} * Hz`;
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
        factors.push(centsToValue(this.cents) + '!');
      }
      if (this.timeExponent.equals(NEGATIVE_ONE)) {
        factors.push('Hz');
      } else if (this.timeExponent.n) {
        factors.push(`s^${this.timeExponent.toFraction()}`);
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
            return this.cents.toString() + '!c';
          }
          return '0c';
        }
      }
      const terms: string[] = [];
      if (this.timeExponent.equals(NEGATIVE_ONE)) {
        terms.push('logarithmic(Hz)');
      } else if (this.timeExponent.n) {
        terms.push(`${this.timeExponent.toFraction()}*logarithmic(s)`);
      }
      const pe = [...this.primeExponents];
      while (pe.length && !pe[pe.length - 1].n) {
        pe.pop();
      }
      terms.push('[' + pe.map(f => f.toFraction()).join(' ') + '>');
      if (this.residual.compare(ONE)) {
        terms.push(`relog(${this.residual.toFraction()})`);
      }
      const steps = Math.round(this.cents);
      if (steps) {
        terms.push(`${steps}\\`);
      }
      const cents = this.cents - steps;
      if (cents) {
        terms.push(`${cents}!c`);
      }
      return [terms[0]]
        .concat(terms.slice(1).map(t => (t.startsWith('-') ? t : '+' + t)))
        .join('');
    }
    const terms: string[] = [];
    if (this.timeExponent.equals(NEGATIVE_ONE)) {
      terms.push('cologarithmic(Hz)');
    } else if (this.timeExponent.n) {
      terms.push(`${this.timeExponent.toFraction()}*cologarithmic(s)`);
    }
    const pe = [...this.primeExponents];
    while (pe.length && !pe[pe.length - 1].n) {
      pe.pop();
    }
    terms.push('<' + pe.map(f => f.toFraction()).join(' ') + ']');
    if (this.residual.compare(ONE)) {
      terms.push(`cologarithmic(${this.residual.toFraction()})`);
    }
    const steps = Math.round(this.cents - 1);
    if (steps) {
      terms.push(`cologarithmic(${steps}\\)`);
    }
    const cents = this.cents - 1 - steps;
    if (cents) {
      terms.push(`${cents}!€`);
    }
    return [terms[0]]
      .concat(terms.slice(1).map(t => (t.startsWith('-') ? t : '+' + t)))
      .join('');
  }
}
