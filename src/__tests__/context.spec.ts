import {describe, it, expect} from 'vitest';
import {RootContext} from '../context';

const SERIALIZED =
  '{"num":7,"str":"hi","context":{"type":"RootContext","title":"","unisonFrequency":null,"C4":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[],"r":{"n":1,"d":1}},"up":{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[],"r":{"n":1,"d":1}},"d":1,"s":1,"l":"","t":[]},"lift":{"type":"Interval","v":{"type":"TimeMonzo","t":{"n":0,"d":1},"p":[],"r":{"n":1,"d":1}},"d":1,"s":5,"l":"","t":[]},"gas":null,"trackingIndex":0,"mosConfig":null}}';

describe('Evaluation context', () => {
  it('can be serialized alongside other data', () => {
    const data = {
      num: 7,
      str: 'hi',
      context: new RootContext(),
    };
    const serialized = JSON.stringify(data);
    expect(serialized).toBe(SERIALIZED);
  });

  it('can be deserialized alongside other data', () => {
    const data = JSON.parse(SERIALIZED, RootContext.reviver);
    const context = data.context;
    expect(data.num).toBe(7);
    expect(data.str).toBe('hi');
    expect(context.gas).toBe(Infinity);
    expect(context.unisonFrequency).toBe(undefined);
    expect(context.C4.isUnity()).toBe(true);
  });
});
