import {describe, bench, beforeAll} from 'vitest';
import {getSourceVisitor, sw} from '../parser';

beforeAll(() => {
  getSourceVisitor();
});

describe('Counter incrementing', () => {
  bench('Rational', () => {
    sw`
      let i = 0;
      while (++i < 1000) niente;
      i;
    `;
  });

  bench('Real', () => {
    sw`
      let i = 0r;
      while (++i < 1000r) niente;
      i;
    `;
  });
});

describe('Counter decrementing', () => {
  bench('Rational', () => {
    sw`
      let i = 1000;
      while (--i) niente;
      i;
    `;
  });

  bench('Real', () => {
    sw`
      let i = 1000r;
      while (--i) niente;
      i;
    `;
  });
});
