import {
  BIG_INT_PRIMES,
  Fraction,
  PRIMES,
  applyWeights,
  kCombinations,
  primeLimit,
  unapplyWeights,
} from 'xen-dev-utils';
import {
  Interval,
  Temperament,
  Val,
  ValBasis,
  intervalValueAs,
} from '../../interval';
import {TimeMonzo, TimeReal} from '../../monzo';
import {ExpressionVisitor} from '../../parser/expression';
import {
  SonicWeaveFunction,
  SonicWeaveValue,
  builtinNode,
  fromInteger,
  isArrayOrRecord,
  requireParameters,
  sonicTruth,
  unaryBroadcast,
  upcastBool,
} from '../runtime';
import {repr, relative as pubRelative} from '../public';
import {ONE, ZERO} from '../../utils';
import {valToSparseOffset, valToWarts} from '../../warts';
import {intCombineTuningMaps} from '../../temper';

function builtinTemperament(
  this: ExpressionVisitor,
  vals: SonicWeaveValue,
  weights?: SonicWeaveValue,
  pureEquaves?: SonicWeaveValue
) {
  if (vals instanceof Val) {
    vals = [vals];
  }
  if (!Array.isArray(vals)) {
    throw new Error('An array of vals is required.');
  }
  for (const val of vals) {
    if (!(val instanceof Val)) {
      throw new Error('An array of vals is required.');
    }
  }
  if (weights instanceof Interval) {
    weights = [weights];
  }
  let ws: number[] | undefined;
  if (weights !== undefined) {
    if (!Array.isArray(weights)) {
      throw new Error('An array of weights is required.');
    }
    ws = weights.map(w => upcastBool(w).valueOf());
  }
  return Temperament.fromVals(vals as Val[], ws, sonicTruth(pureEquaves));
}
Object.defineProperty(builtinTemperament, 'name', {
  value: 'Temperament',
  enumerable: false,
});
builtinTemperament.__doc__ =
  'Construct a Temperament instance from an array of vals. Optional weights are applied multiplicatively on top of Tenney weights. Optionally equaves are normalized to pure.';
builtinTemperament.__node__ = builtinNode(builtinTemperament);

function commaList(
  this: ExpressionVisitor,
  commas: SonicWeaveValue,
  basisOrLimit: SonicWeaveValue,
  weights: SonicWeaveValue,
  pureEquaves: SonicWeaveValue,
  fullPrimeLimit: SonicWeaveValue
) {
  if (commas instanceof Interval) {
    commas = [commas];
  }
  if (!Array.isArray(commas)) {
    throw new Error('An array of intervals is required.');
  }
  const cs: TimeMonzo[] = [];
  for (let comma of commas) {
    comma = upcastBool(comma);
    if (comma.value instanceof TimeReal) {
      throw new Error('Real values not supported as commas.');
    }
    cs.push(comma.value);
  }
  if (weights instanceof Interval) {
    weights = [weights];
  }
  let ws: number[] | undefined;
  if (weights !== undefined) {
    if (!Array.isArray(weights)) {
      throw new Error('An array of weights is required.');
    }
    ws = weights.map(w => upcastBool(w).valueOf());
  }
  if (basisOrLimit !== undefined) {
    if (basisOrLimit instanceof Interval) {
      const limit = PRIMES.indexOf(basisOrLimit.toInteger()) + 1;
      if (!limit) {
        throw new Error('A prime limit is required.');
      }
      basisOrLimit = new ValBasis(limit);
    }
    if (!(basisOrLimit instanceof ValBasis)) {
      throw new Error('A basis is required.');
    }
  }
  return Temperament.fromCommas(
    cs,
    basisOrLimit,
    ws,
    sonicTruth(pureEquaves),
    sonicTruth(fullPrimeLimit)
  );
}
commaList.__doc__ =
  'Construct a Temperament instance from an array of commas. Optional weights are applied multiplicatively on top of Tenney weights. Optionally equaves are normalized to pure. Optionally the full prime limit is assumed based on the commas.';
commaList.__node__ = builtinNode(commaList);

function tail(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  index: Interval
): SonicWeaveValue {
  requireParameters({interval, index});
  if (interval instanceof Interval || typeof interval === 'boolean') {
    interval = upcastBool(interval);
    return new Interval(
      interval.value.tail(index.toInteger()),
      interval.domain,
      interval.steps,
      undefined,
      interval
    );
  }
  const t = tail.bind(this);
  return unaryBroadcast.bind(this)(interval, i => t(i, index));
}
tail.__doc__ =
  'Return the higher prime tail of an interval starting from the given index. Prime 2 has index 0.';
tail.__node__ = builtinNode(tail);

function complexityOf(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  countZeros = false
): SonicWeaveValue {
  if (isArrayOrRecord(interval)) {
    const c = complexityOf.bind(this);
    return unaryBroadcast.bind(this)(interval, i => c(i, countZeros));
  }
  let pe: Fraction[];
  if (interval instanceof Val) {
    if (countZeros) {
      return fromInteger(interval.value.numberOfComponents);
    }
    if (!interval.value.residual.isUnity()) {
      throw new Error('Non-standard val encountered.');
    }
    pe = interval.value.primeExponents;
  } else {
    const monzo = upcastBool(interval).value;
    if (monzo instanceof TimeReal) {
      return new Interval(new TimeReal(0, Infinity), 'linear');
    }
    if (!monzo.residual.isUnity()) {
      const result = primeLimit(monzo.residual, true);
      if (Number.isInteger(result)) {
        return fromInteger(result);
      }
      return new Interval(new TimeReal(0, result), 'linear');
    }
    if (countZeros) {
      return fromInteger(monzo.numberOfComponents);
    }
    pe = monzo.primeExponents;
  }
  for (let i = pe.length - 1; i >= 0; --i) {
    if (pe[i].n) {
      return fromInteger(i + 1);
    }
  }
  return fromInteger(0);
}
complexityOf.__doc__ =
  'Compute the prime limit ordinal of an interval or val. 1/1 has a complexity of 0, 2/1 has complexity 1, 3/1 has complexity 2, 5/1 has complexity 3, etc.. If `countZeros` is true, measure the complexity of the internal representation instead.';
complexityOf.__node__ = builtinNode(complexityOf);

function basisOf(
  this: ExpressionVisitor,
  val: SonicWeaveValue
): SonicWeaveValue {
  if (isArrayOrRecord(val)) {
    const e = basisOf.bind(this);
    return unaryBroadcast.bind(this)(val, e);
  }
  if (val instanceof Val || val instanceof Temperament) {
    return val.basis;
  }
  throw new Error('A val is required.');
}
basisOf.__doc__ = 'Return the basis of a val or a temperament.';
basisOf.__node__ = builtinNode(basisOf);

function withBasis(
  this: ExpressionVisitor,
  val: SonicWeaveValue,
  basis: ValBasis
): SonicWeaveValue {
  requireParameters({val, basis});
  if (isArrayOrRecord(val)) {
    const w = withBasis.bind(this);
    return unaryBroadcast.bind(this)(val, v => w(v, basis));
  }
  if (val instanceof Val) {
    return new Val(val.value.clone(), basis);
  }
  throw new Error('A val is required.');
}
withBasis.__doc__ = 'Change the basis of the val.';
withBasis.__node__ = builtinNode(withBasis);

function warts(this: ExpressionVisitor, val: SonicWeaveValue): SonicWeaveValue {
  requireParameters({val});
  if (val instanceof Val) {
    if (val.node?.type === 'WartsLiteral') {
      return val;
    }
    const basis = val.basis.toWartBasis();
    const node = valToWarts(val.value, basis);
    return new Val(val.value, val.basis, node);
  }
  return unaryBroadcast.bind(this)(val, warts.bind(this));
}
warts.__doc__ = 'Format a val using warts shorthand notation.';
warts.__node__ = builtinNode(warts);

function SOV(this: ExpressionVisitor, val: SonicWeaveValue): SonicWeaveValue {
  requireParameters({val});
  if (val instanceof Val) {
    if (val.node?.type === 'SparseOffsetVal') {
      return val;
    }
    const basis = val.basis.toWartBasis();
    const node = valToSparseOffset(val.value, basis);
    return new Val(val.value, val.basis, node);
  }
  return unaryBroadcast.bind(this)(val, SOV.bind(this));
}
SOV.__doc__ = 'Format a val using Sparse Offset Val notation.';
SOV.__node__ = builtinNode(SOV);

function generatorsOf(
  this: ExpressionVisitor,
  temperament: SonicWeaveValue
): SonicWeaveValue {
  if (temperament instanceof Val) {
    const divisions = temperament.divisions;
    return [
      new Interval(temperament.equave.pow(divisions.inverse()), 'logarithmic'),
    ];
  }
  if (!(temperament instanceof Temperament)) {
    throw new Error('A temperament is required.');
  }
  return temperament.preimage.value.map(
    gen => new Interval(temperament.temper(gen), 'logarithmic')
  );
}
generatorsOf.__doc__ =
  'Obtain the generators of a temperament with period first. See `mappingBasis` for the untempered mapping generators.';
generatorsOf.__node__ = builtinNode(generatorsOf);

function periodsOf(this: ExpressionVisitor, temperament: SonicWeaveValue) {
  if (temperament instanceof Val) {
    return fromInteger(temperament.divisions.valueOf());
  }
  if (!(temperament instanceof Temperament)) {
    throw new Error('A temperament is required.');
  }
  return fromInteger(temperament.canonicalMapping[0][0]);
}
periodsOf.__doc__ = 'Obtain the number of periods per equave in a temperament.';
periodsOf.__node__ = builtinNode(periodsOf);

function mappingBasis(this: ExpressionVisitor, temperament: SonicWeaveValue) {
  if (!(temperament instanceof Temperament)) {
    throw new Error('A temperament is required.');
  }
  return temperament.preimage;
}
mappingBasis.__doc__ =
  'Obtain the mapping generators (preimage) of a temperament with period first. See `generatorsOf` for the tempered generators.';
mappingBasis.__node__ = builtinNode(mappingBasis);

function commaBasis(this: ExpressionVisitor, temperament: SonicWeaveValue) {
  if (!(temperament instanceof Temperament)) {
    throw new Error('A temperament is required.');
  }
  return temperament.commaBasis;
}
commaBasis.__doc__ = 'Obtain the comma basis (null space) of a temperament.';
commaBasis.__node__ = builtinNode(commaBasis);

function PrimeMapping(
  this: ExpressionVisitor,
  ...newPrimes: (Interval | undefined)[]
) {
  const rel = pubRelative.bind(this);
  const np = newPrimes.map((p, i) =>
    p ? rel(p).value : TimeMonzo.fromBigInt(BIG_INT_PRIMES[i])
  );

  function mapper(
    this: ExpressionVisitor,
    interval: SonicWeaveValue
  ): SonicWeaveValue {
    if (isArrayOrRecord(interval)) {
      const m = mapper.bind(this);
      return unaryBroadcast.bind(this)(interval, m);
    }
    interval = upcastBool(interval);
    const monzo = pubRelative.bind(this)(interval).value;
    if (monzo instanceof TimeReal) {
      return new Interval(
        monzo,
        'logarithmic',
        0,
        monzo.asCentsLiteral(),
        interval
      );
    }
    monzo.numberOfComponents = np.length;
    let mapped: TimeMonzo | TimeReal = new TimeMonzo(ZERO, [], monzo.residual);
    while (mapped.primeExponents.length < np.length) {
      mapped.primeExponents.push(ZERO);
    }
    for (let i = 0; i < np.length; ++i) {
      mapped = mapped.mul(np[i].pow(monzo.primeExponents[i]));
    }
    let node = mapped.asCentsLiteral();
    if (!node) {
      mapped = TimeReal.fromCents(mapped.totalCents());
      node = mapped.asCentsLiteral();
    }
    return new Interval(mapped, 'logarithmic', 0, node, interval);
  }
  const r = repr.bind(this);
  Object.defineProperty(mapper, 'name', {
    value: `PrimeMapping(${newPrimes.map(r).join(', ')})`,
    enumerable: false,
  });
  mapper.__doc__ = 'Prime re-mapper.';
  mapper.__node__ = builtinNode(mapper);
  return mapper;
}
PrimeMapping.__doc__ =
  'Construct a prime mapping for tempering intervals to specified cents. Remaining primes are left untempered.';
PrimeMapping.__node__ = builtinNode(PrimeMapping);

function valWeights(weights: SonicWeaveValue, size: number) {
  const ws: number[] = [];
  if (weights instanceof Interval) {
    ws.push(weights.valueOf());
  } else if (weights) {
    if (!Array.isArray(weights)) {
      throw new Error('Weights must be an array if given.');
    }
    ws.push(...weights.map(i => upcastBool(i).valueOf()));
  }
  while (ws.length < size) {
    ws.push(1);
  }
  return ws;
}

// TODO: Optimize by pre-calculating stuff that gets re-used during tuning.
function errorTE(
  this: ExpressionVisitor,
  val: SonicWeaveValue,
  weights: SonicWeaveValue,
  unnormalized = false
): SonicWeaveValue {
  if (val instanceof Val) {
    const ws = valWeights(weights, val.basis.size);
    this.spendGas(5 * ws.length);
    unnormalized = sonicTruth(unnormalized);
    if (unnormalized) {
      return Interval.fromValue(val.errorTE(ws, unnormalized));
    }
    return new Interval(TimeReal.fromCents(val.errorTE(ws)), 'logarithmic');
  }
  if (val instanceof Temperament) {
    if (weights !== undefined) {
      throw new Error('No additional weights may be given for temperaments.');
    }
    if (sonicTruth(unnormalized)) {
      throw new Error('Only RMS error supported with temperaments.');
    }
    return new Interval(TimeReal.fromCents(val.errorTE()), 'logarithmic');
  }
  const e = errorTE.bind(this);
  return unaryBroadcast.bind(this)(val, v => e(v, weights));
}
errorTE.__doc__ =
  'Calculate Tenney-Euclid error w.r.t the vals basis. Weights are applied multiplicatively on top of Tenney weights if given. Unnormalized values are slightly faster to compute and are in the linear domain instead of (logarithmic) cents.';
errorTE.__node__ = builtinNode(errorTE);

function nextGPV(
  this: ExpressionVisitor,
  val: SonicWeaveValue,
  weights: SonicWeaveValue
): SonicWeaveValue {
  if (val instanceof Val) {
    const ws = valWeights(weights, val.basis.size);
    return val.nextGPV(ws);
  }
  const n = nextGPV.bind(this);
  return unaryBroadcast.bind(this)(val, v => n(v, weights));
}
nextGPV.__doc__ = 'Obtain the next generalized patent val in the sequence.';
nextGPV.__node__ = builtinNode(nextGPV);

function tune(
  this: ExpressionVisitor,
  vals: SonicWeaveValue,
  searchRadius: SonicWeaveValue,
  weights: SonicWeaveValue
) {
  if (!Array.isArray(vals)) {
    throw new Error('An array of vals is required.');
  }
  if (!vals.length) {
    throw new Error('At least one val is required.');
  }
  for (const val of vals) {
    if (!(val instanceof Val)) {
      throw new Error('An array of vals is required.');
    }
  }
  const vs = vals as Val[];
  const basis = vs[0].basis;
  for (const val of vs.slice(1)) {
    if (!val.basis.equals(basis)) {
      throw new Error('Vals bases must agree in tuning.');
    }
  }
  const radius =
    searchRadius === undefined ? 1 : upcastBool(searchRadius).toInteger();
  this.spendGas(
    0.25 * basis.numberOfComponents * (2 * radius + 1) ** vals.length
  );
  const jip = basis.value.map(m => m.totalCents());
  const ws = valWeights(weights, basis.size);
  const wvals = vs.map(val =>
    applyWeights(
      unapplyWeights(
        basis.value.map(m => m.dot(val.value).valueOf()),
        jip
      ),
      ws
    )
  );
  const coeffs = intCombineTuningMaps(ws, wvals, radius);
  let result = vs[0].mul(fromInteger(coeffs[0]));
  for (let i = 1; i < coeffs.length; ++i) {
    result = result.add(vs[i].mul(fromInteger(coeffs[i])));
  }
  return result.abs();
}
tune.__doc__ =
  'Attempt to combine the given vals into a more Tenney-Euclid optimal val. Weights are applied multiplicatively on top of Tenney weights of the subgroup basis.';
tune.__node__ = builtinNode(tune);

function basis(this: ExpressionVisitor, ...intervals: SonicWeaveValue[]) {
  const subgroup: TimeMonzo[] = [];
  for (let interval of intervals) {
    interval = upcastBool(interval);
    if (interval.value instanceof TimeReal) {
      throw new Error('Can only create basis from radicals.');
    }
    subgroup.push(interval.value);
  }
  return new ValBasis(subgroup);
}
basis.__doc__ = 'Construct a subgroup basis from intervals.';
basis.__node__ = builtinNode(basis);

function basisToArray(this: ExpressionVisitor, basis: ValBasis) {
  return basis.value.map(monzo => new Interval(monzo, 'linear'));
}
basisToArray.__doc__ =
  'Convert a subgroup basis to an array of basis elements.';
basisToArray.__node__ = builtinNode(basisToArray);

function respellWithCommas(
  this: ExpressionVisitor,
  interval: SonicWeaveValue,
  commas: TimeMonzo[]
): SonicWeaveValue {
  if (typeof interval === 'boolean' || interval instanceof Interval) {
    interval = upcastBool(interval);
    let value = interval.value;
    let exponent = ONE;
    if (!value.isFractional()) {
      if (value instanceof TimeReal) {
        return interval;
      }
      try {
        const et = value.toEqualTemperament();
        value = TimeMonzo.fromFraction(et.equave);
        exponent = et.fractionOfEquave;
      } catch {
        /* empty */
      }
    }
    let height = value.tenneyHeight();
    let improvement: TimeMonzo | TimeReal | undefined = value;
    while (improvement) {
      value = improvement;
      improvement = undefined;
      for (const comma of commas) {
        this.spendGas();
        const candidate = value.mul(comma);
        let candidateHeight = candidate.tenneyHeight();
        if (!exponent.isUnity() && candidate.pow(exponent).isFractional()) {
          // Favor elimination of radicals
          // The bonus is much larger in size than Math.log(Number.MAX_VALUE)
          candidateHeight -= 10000;
        }
        if (candidateHeight < height) {
          improvement = candidate;
          height = candidateHeight;
        }
      }
    }
    if (exponent.isUnity()) {
      return new Interval(
        value,
        interval.domain,
        interval.steps,
        intervalValueAs(value, interval.node, true),
        interval
      );
    }
    return new Interval(
      value.pow(exponent),
      interval.domain,
      interval.steps,
      intervalValueAs(value, interval.node, true),
      interval
    );
  }
  const r = respellWithCommas.bind(this);
  return unaryBroadcast.bind(this)(interval, i => r(i, commas));
}

function respell(
  this: ExpressionVisitor,
  commaBasis: SonicWeaveValue,
  searchRadius: SonicWeaveValue
) {
  if (commaBasis instanceof Interval || commaBasis instanceof Val) {
    commaBasis = [commaBasis];
  }
  if (Array.isArray(commaBasis)) {
    if (!commaBasis.length) {
      throw new Error('At least one comma or val is required.');
    }
    if (commaBasis[0] instanceof Interval) {
      commaBasis = basis.bind(this)(...commaBasis);
    } else {
      commaBasis = builtinTemperament.bind(this)(commaBasis);
    }
  }
  if (commaBasis instanceof Temperament) {
    const temperament = commaBasis;
    if (searchRadius === undefined) {
      // eslint-disable-next-line no-inner-declarations
      function mapper(interval: SonicWeaveValue) {
        interval = upcastBool(interval);
        if (interval.value instanceof TimeReal) {
          return interval;
        }
        const value = temperament.respell(interval.value);
        return new Interval(
          value,
          interval.domain,
          interval.steps,
          intervalValueAs(value, interval.node, true),
          interval
        );
      }
      mapper.__doc__ = 'Respeller';
      mapper.__node__ = builtinNode(mapper);
      return mapper;
    }
    commaBasis = temperament.commaBasis;
  }
  if (!(commaBasis instanceof ValBasis)) {
    throw new Error('A basis is required.');
  }
  this.spendGas(0.3 * commaBasis.numberOfComponents * commaBasis.size ** 2);
  commaBasis = commaBasis.lll('tenney');
  const r = respellWithCommas.bind(this);
  const commas = [...commaBasis.value];
  for (const comma of commaBasis.value) {
    commas.push(comma.inverse());
  }
  if (searchRadius !== undefined) {
    const radius = upcastBool(searchRadius).toInteger();
    const cs = [...commas];
    for (let k = 2; k <= radius; ++k) {
      for (const combo of kCombinations(cs, k)) {
        const comma = combo.reduce((a, b) => a.mul(b) as TimeMonzo);
        commas.push(comma);
      }
    }
  }
  const mapper = (i: SonicWeaveValue) => r(i, commas);
  mapper.__doc__ = 'Respeller';
  mapper.__node__ = builtinNode(mapper);
  return mapper;
}
respell.__doc__ =
  'Respell i.e. simplify fractions in the the current scale treating intervals separated by the given commas as the same. Search radius (default 1) is an integer for discovering harder-to-find simplifications. (Creates a respelling function.)';
respell.__node__ = builtinNode(respell);

export const TEMPER_BUILTINS: Record<string, Interval | SonicWeaveFunction> = {
  Temperament: builtinTemperament,
  commaList,
  tail,
  complexityOf,
  basisOf,
  withBasis,
  warts,
  SOV,
  generatorsOf,
  periodsOf,
  mappingBasis,
  commaBasis,
  PrimeMapping,
  errorTE,
  nextGPV,
  tune,
  basis,
  basisToArray,
  respell,
};
