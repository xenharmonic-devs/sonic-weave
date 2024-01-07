import {TimeMonzo} from './monzo';
import {ZERO} from './utils';

export class RootContext {
  title: string;
  C4: TimeMonzo;
  up: TimeMonzo;
  lift: TimeMonzo;
  unisonFrequency?: TimeMonzo;
  gas: number;

  constructor(gas?: number) {
    this.title = '';
    this.C4 = new TimeMonzo(ZERO, []);
    this.up = new TimeMonzo(ZERO, [], undefined, 1);
    this.lift = new TimeMonzo(ZERO, [], undefined, 5);
    this.gas = gas ?? Infinity;
  }

  spendGas() {
    if (this.gas-- <= 0) {
      throw new Error('Out of gas. (Infinite loop?)');
    }
  }
}
