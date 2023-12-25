import {describe, it, expect} from 'vitest';
import {evaluateExpression} from '../../parser';
import {Color, Interval} from '../../interval';

function parseSingle(source: string) {
  const value = evaluateExpression(source);
  expect(value).toBeInstanceOf(Interval);
  return value as Interval;
}

describe('SonicWeave expression evaluator', () => {
  it('evaluates a single number', () => {
    const value = parseSingle('3');
    expect(value.value.toBigInteger()).toBe(3n);
  });

  it('adds two nedos with denominator preference', () => {
    const interval = parseSingle('4\\12 + 2\\12');
    expect(interval.toString()).toBe('6\\12');
  });

  it('adds a number to nedo (left preference)', () => {
    const interval = parseSingle('2 ~+ 3\\3');
    expect(interval.toString()).toBe('4');
  });

  it('adds a number to nedo (right preference)', () => {
    const interval = parseSingle('2 +~ 3\\3');
    expect(interval.toString()).toBe('6\\3');
  });

  it('adds a number to nedo (impossible right preference)', () => {
    const interval = parseSingle('1 +~ 3\\3');
    expect(interval.toString()).toBe('1\\1<3>');
  });

  it('accesses variables', () => {
    const interval = parseSingle('TAU');
    // The correct value is actually 6.283185307179586, but it gets mushed a bit along the way.
    expect(interval.toString()).toBe('6.283185307179587!');
  });

  it('evaluates a color', () => {
    const purple = evaluateExpression('#dc12ab');
    expect(purple).instanceOf(Color);
    expect((purple as Color).value).toBe('#dc12ab');
  });

  it('adds hertz', () => {
    const interval = parseSingle('69 mHz + 420 Hz + 9 kHz');
    expect(interval.toString()).toBe('9420.069 Hz');
  });

  it('subtracts cents', () => {
    const interval = parseSingle('1.955 - c');
    expect(interval.value.totalCents()).toBeCloseTo(0.955);
  });

  it('supports pythagorean relative notation', () => {
    const sixth = parseSingle('M6');
    expect(sixth.value.toFraction().toFraction()).toBe('27/16');
    expect(sixth.toString()).toBe('M6');
  });

  it('supports neutral intervals', () => {
    const halfFifth = parseSingle('n3');
    expect(halfFifth.value.valueOf()).toBeCloseTo(Math.sqrt(1.5));
  });

  it('supports quarter-augmented intervals', () => {
    const fourthFifth = parseSingle('sM2');
    expect(fourthFifth.value.valueOf()).toBeCloseTo(1.5 ** 0.25);
  });

  it('supports tone-splitter interordinal', () => {
    const splitTone = parseSingle('n1.5');
    expect(splitTone.value.valueOf()).toBeCloseTo(Math.sqrt(9 / 8));
  });

  it('supports semiquartal interordinals', () => {
    const semifourth = parseSingle('m2.5');
    expect(semifourth.value.valueOf()).toBeCloseTo(Math.sqrt(4 / 3));
  });

  it("has mid from ups-and-downs but it's spelled 'n' and mixes with NFJS", () => {
    const undecimalMidFourth = parseSingle('n4^11');
    expect(undecimalMidFourth.value.toFraction().toFraction()).toBe('11/8');
    const undecimalMidFifth = parseSingle('n5_11');
    expect(undecimalMidFifth.value.toFraction().toFraction()).toBe('16/11');
  });

  it("doesn't have '~8' like ups-and-downs doesn't", () => {
    expect(() => parseSingle('n8')).toThrow();
  });

  it('parses monzos', () => {
    const monzo = parseSingle('[+7, 11e-1, 1.4>');
    expect(monzo.domain).toBe('logarithmic');
    const pe = monzo.value.primeExponents;
    expect(pe[0].toFraction()).toBe('7');
    expect(pe[1].toFraction()).toBe('11/10');
    expect(pe[2].toFraction()).toBe('7/5');
    expect(monzo.toString()).toBe('[7 11e-1 1.4>');
  });

  it('parses vals', () => {
    const val = parseSingle('<5/3 , -1.001e1]');
    expect(val.domain).toBe('cologarithmic');
    const pe = val.value.primeExponents;
    expect(pe[0].toFraction()).toBe('5/3');
    expect(pe[1].toFraction()).toBe('-1001/100');
    expect(val.toString()).toBe('<5/3 -1.001e1]');
  });

  it('has reversed ranges', () => {
    const scale = evaluateExpression('[5, 4..1]');
    expect(Array.isArray(scale)).toBe(true);
    expect(scale).toHaveLength(5);
    expect((scale as Interval[]).map(i => i.toString()).join(';')).toBe(
      '5;4;3;2;1'
    );
  });

  it('has a reciprocal cent', () => {
    const one = parseSingle('c dot €');
    expect(one.toString()).toBe('1');
  });

  it('supports relative FJS', () => {
    const third = parseSingle('M3^5');
    expect(third.value.toFraction().toFraction()).toBe('5/4');
    expect(third.toString()).toBe('M3^5');
  });

  it('supports neutral FJS', () => {
    const sixth = parseSingle('n6_11');
    expect(sixth.value.toFraction().toFraction()).toBe('18/11');
    expect(sixth.toString()).toBe('n6_11');
  });

  it('can convert time to frequency', () => {
    const freq = parseSingle('ablin(2ms)');
    expect(freq.value.valueOf()).toBe(500);
  });

  it('parses the cursed tritone', () => {
    const tritone = parseSingle('14E-1');
    expect(tritone.value.toFraction().toFraction()).toBe('7/5');
    expect(tritone.toString()).toBe('14e-1');
  });

  it('parses nedji', () => {
    const darkFifth = parseSingle('7\\5<4/3>');
    const {fractionOfEquave, equave} = darkFifth.value.toEqualTemperament();
    expect(fractionOfEquave.toFraction()).toBe('7/5');
    expect(equave.toFraction()).toBe('4/3');
    expect(darkFifth.toString()).toBe('7\\5<4/3>');
  });

  it('has a nominal for a fourth split in four', () => {
    const deeSemiAt = parseSingle('C0 = 1/1; D½@0');
    expect(deeSemiAt.value.pow(4).toFraction().toFraction()).toBe('4/3');
  });

  it('can color and label an interval directly', () => {
    const greenFifth = parseSingle('1.5e0 green "fifth"');
    expect(greenFifth.color?.value).toBe('#008000');
    expect(greenFifth.label).toBe('fifth');
  });

  it('can format the half eleventh', () => {
    const neutralSixth = parseSingle('P11 % 2');
    expect(neutralSixth.toString()).toBe('n6');
  });

  it('can format the double tone', () => {
    const majorThird = parseSingle('M2 * 2');
    expect(majorThird.toString()).toBe('M3');
  });

  it('can format the half twelfth', () => {
    const majorSixAndAHalfth = parseSingle('P12 % 2');
    expect(majorSixAndAHalfth.toString()).toBe('M6.5');
  });

  it("bails out when there's no Pythagorean to match", () => {
    const thirdFifth = parseSingle('P5 % 3');
    expect(thirdFifth.toString()).toBe('1\\3<3/2>');
  });

  it('can format a decimal', () => {
    const minorThird = parseSingle('1,2');
    expect(minorThird.toString()).toBe('1.2e0');
  });

  it('has a constant structure calculator', () => {
    // 6\12 is ambiguous as a fourth and a fifth
    const no = parseSingle('hasConstantStructure(mos(5, 2))');
    expect(no.toString()).toBe('false');
    // Augmented fourth and diminished fifth are distinct in 19 edo
    const yes = parseSingle('hasConstantStructure(mos(5, 2, 3, 2))');
    expect(yes.toString()).toBe('true');
  });

  it('can average absolute pitches', () => {
    const beeSemiflat = parseSingle('C4 = 261Hz; absoluteFJS((B4 + Bb4) % 2)');
    expect(beeSemiflat.toString()).toBe('Bd4');
  });

  it('can convert monzo to absolute FJS', () => {
    const downMajorSixth = parseSingle(
      'C4 = 261Hz = 1/1; absoluteFJS(v[0 -1 1>)'
    );
    expect(downMajorSixth.toString()).toBe('vA♮4^5');
  });

  it('can convert FJS to monzo', () => {
    const monzo = parseSingle('monzo(vm6_5)');
    expect(monzo.toString()).toBe('v[3 0 -1>');
  });

  it('can convert cents to boolean', () => {
    const yes = parseSingle('bool(0.0 red_)');
    expect(yes.color?.value).toBe('#FF0000');
    expect(yes.toString()).toBe('true');
  });

  it('can convert boolean to cents', () => {
    const zeroCents = parseSingle('cents(true "yes")');
    expect(zeroCents.label).toBe('yes');
    expect(zeroCents.toString()).toBe('0.');
  });

  it('converts pi to an integer', () => {
    const three = parseSingle('int(PI)');
    expect(three.toString()).toBe('3');
  });

  it('converts pi to a hard decimal', () => {
    const pi = parseSingle('decimal(PI)');
    expect(pi.toString()).toBe('3.141592653589793!');
  });

  it('converts pi to a soft decimal', () => {
    const pi = parseSingle('decimal(PI, 5)');
    expect(pi.toString()).toBe('3.14159e0');
  });

  it('converts pi to a fraction', () => {
    const approximation = parseSingle('fraction(PI)');
    expect(approximation.toString()).toBe('333/106');
  });

  it('converts pi to a radical (outside of prime limit)', () => {
    const approximation = parseSingle('radical(PI)');
    expect(approximation.toString()).toBe('355/113');
  });

  it('converts pi to a radical (within prime limit)', () => {
    const approximation = parseSingle('radical(PI, 10, 1000)');
    expect(approximation.toString()).toBe('306^1/5');
  });

  it('converts pi to soft cents', () => {
    const approximation = parseSingle('cents(PI, 3)');
    expect(approximation.toString()).toBe('1981.795');
  });
});
