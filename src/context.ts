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

  clone() {
    const result = new RootContext(this.gas);
    result.title = this.title;
    result.C4 = this.C4.clone();
    result.up = this.up.clone();
    result.lift = this.lift.clone();
    if (this.unisonFrequency) {
      result.unisonFrequency = this.unisonFrequency.clone();
    }
    return result;
  }

  spendGas() {
    if (this.gas-- <= 0) {
      throw new Error('Out of gas. (Infinite loop?)');
    }
  }

  expand(defaults: RootContext) {
    const lines: string[] = [];
    if (this.title) {
      lines.push(JSON.stringify(this.title));
    }
    if (this.C4.compare(defaults.C4)) {
      lines.push(`C4 = ${this.C4.toString()}`);
    }
    if (this.unisonFrequency) {
      if (
        !defaults.unisonFrequency ||
        this.unisonFrequency.compare(defaults.unisonFrequency)
      ) {
        lines.push(`1/1 = ${this.unisonFrequency.toString()}`);
      }
    }
    if (this.up.compare(defaults.up)) {
      lines.push(`^ = ${this.up.toString('logarithmic')}`);
    }
    if (this.lift.compare(defaults.lift)) {
      lines.push(`/ = ${this.lift.toString('logarithmic')}`);
    }
    return lines.join('\n');
  }
}
