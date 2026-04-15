import {describe, expect, it} from 'vitest';
import {ternaryBroadcast} from '../runtime.js';

type BroadcastContext = {
  gasSpent: number;
  spendGas(amount?: number): void;
};

function createContext(): BroadcastContext {
  return {
    gasSpent: 0,
    spendGas(amount = 1) {
      this.gasSpent += amount;
    },
  };
}

describe('ternaryBroadcast', () => {
  it('broadcasts three arrays elementwise', () => {
    const context = createContext();
    const result = ternaryBroadcast.call(
      context as unknown,
      ['a', 'b'],
      ['x', 'y'],
      ['1', '2'],
      (left, middle, right) => `${left}${middle}${right}`,
    );

    expect(result).toEqual(['ax1', 'by2']);
    expect(context.gasSpent).toBe(2);
  });

  it('broadcasts a scalar pair over an array operand', () => {
    const context = createContext();
    const result = ternaryBroadcast.call(
      context as unknown,
      'L',
      'M',
      ['1', '2'],
      (left, middle, right) => `${left}${middle}${right}`,
    );

    expect(result).toEqual(['LM1', 'LM2']);
    expect(context.gasSpent).toBe(2);
  });

  it('rejects incompatible array lengths', () => {
    const context = createContext();

    expect(() =>
      ternaryBroadcast.call(
        context as unknown,
        ['a', 'b'],
        ['x'],
        ['1', '2'],
        (left, middle, right) => `${left}${middle}${right}`,
      ),
    ).toThrow('Unable to broadcast arrays together with lengths 1, 2 and 2.');
  });
});
