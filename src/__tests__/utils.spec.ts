import {describe, it, expect} from 'vitest';
import {deltaRationalize} from '../utils';

describe('Chord delta rationalizer', () => {
  it('delta rationalizes with max root = 4', () => {
    const result = deltaRationalize([1, 1.26, 1.498], 4);
    expect(result.error).toBeLessThan(0.008);
    expect(result.signature).toHaveLength(2); // It's broken, plz fix.
  });
});
