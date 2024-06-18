import {describe, it, expect} from 'vitest';
import {evaluateExpression} from '../parser';

function evaluate(source: string) {
  return evaluateExpression(source, false);
}

describe('Angle brackets vs. comparisons', () => {
  it('rejects nedji with trailing garbage', () => {
    expect(() => evaluate('1\\2<3>4')).toThrow();
  });

  it('knows that sqrt(2) is smaller than 3 and that true is not larger than 4: (1°2 < 3) > 4', () => {
    const no = evaluate('1 \\2<3>4');
    expect(no).toBe(false);
  });

  it('knows that a double step is smaller than 3 etc. ((1° * 2) < 3) > 4', () => {
    const no = evaluate('1\\ 2<3>4');
    expect(no).toBe(false);
  });

  it('features the return of (1°2 < 3) > 4', () => {
    const no = evaluate('1\\2 <3>4');
    expect(no).toBe(false);
  });

  it('features the persistence of (1°2 < 3) > 4', () => {
    const no = evaluate('1\\2< 3>4');
    expect(no).toBe(false);
  });

  it('features the obstinence of (1°2 < 3) > 4', () => {
    const no = evaluate('1\\2<3 >4');
    expect(no).toBe(false);
  });

  it('parses deprecated quadruple semitwelfth', () => {
    expect(() => evaluate('1\\2<3> 4')).toThrow('Undefined intrinsic call.');
  });
});

describe('Unit shadowing', () => {
  it('lets you shadow Hz (unit)', () => {
    // XXX: Too much time spent on XA Discord server.
    const spongeBobIsHurting = evaluate('const Hz = "pain"; 432 Hz');
    expect(spongeBobIsHurting?.toString()).toBe('432 Hz');
  });

  it('lets you shadow Hz (identifier)', () => {
    const stillHertz = evaluate('const Hz = "pain"; 432 (Hz)');
    expect(stillHertz?.toString()).toBe('(432 "pain")');
  });
});

describe('Overloaded tokens', () => {
  it('confuses minimum and minor', () => {
    expect(() => evaluate('1 min2')).toThrow('Undefined intrinsic call');
    expect(evaluate('1 min 2')?.toString()).toBe('1');
  });
});
