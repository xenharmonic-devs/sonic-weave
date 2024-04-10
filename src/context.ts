import {SonicWeaveValue} from './builtin';
import {Val, type Interval} from './interval';
import {TimeMonzo} from './monzo';
import {ZERO} from './utils';

export class RootContext {
  title: string;
  C4_: TimeMonzo;
  up_: TimeMonzo;
  lift_: TimeMonzo;
  unisonFrequency?: TimeMonzo;
  gas: number;
  fragiles: (Interval | Val)[];
  trackingIndex: number;
  templateArguments: SonicWeaveValue[];

  constructor(gas?: number) {
    this.title = '';
    this.C4_ = new TimeMonzo(ZERO, []);
    this.up_ = new TimeMonzo(ZERO, [], undefined, 1);
    this.lift_ = new TimeMonzo(ZERO, [], undefined, 5);
    this.gas = gas ?? Infinity;
    this.fragiles = [];
    this.trackingIndex = 0;
    this.templateArguments = [];
  }

  get C4() {
    return this.C4_;
  }
  set C4(value: TimeMonzo) {
    this.C4_ = value;
    this.breakFragiles();
  }

  get up() {
    return this.up_;
  }
  set up(value: TimeMonzo) {
    this.up_ = value;
    this.breakFragiles();
  }

  get lift() {
    return this.lift_;
  }
  set lift(value: TimeMonzo) {
    this.lift_ = value;
    this.breakFragiles();
  }

  clone() {
    const result = new RootContext(this.gas);
    result.title = this.title;
    result.C4_ = this.C4.clone();
    result.up_ = this.up.clone();
    result.lift_ = this.lift.clone();
    if (this.unisonFrequency) {
      result.unisonFrequency = this.unisonFrequency.clone();
    }
    return result;
  }

  spendGas(amount = 1) {
    if (amount < 0) {
      throw new Error('Cannot refill gas.');
    }
    this.gas -= amount;
    if (this.gas <= 0) {
      throw new Error('Out of gas. (Infinite loop?)');
    }
  }

  breakFragiles() {
    for (const fragile of this.fragiles) {
      fragile.break();
    }
    this.fragiles = [];
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

  nextTrackingId() {
    this.trackingIndex++;
    return this.trackingIndex;
  }
}
