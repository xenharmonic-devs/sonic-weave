import {SonicWeaveValue} from './stdlib';
import {Interval} from './interval';
import {TimeMonzo} from './monzo';
import {ZERO} from './utils';

/**
 * Root context of a SonicWeave runtime containing the scale title, root pitch, value of the 'up' inflection etc.
 */
export class RootContext {
  /**
   * Title of the scale.
   */
  title: string;
  /**
   * Absolute frequency associated with 1/1 (linear) or P1 (logarithmic perfect unison).
   */
  unisonFrequency?: TimeMonzo;
  /**
   * The remaining computational budget.
   */
  gas: number;
  /**
   * Values that depend on the current root pitch or up/lift inflections.
   */
  fragiles: Interval[];
  /**
   * Current tracking ID.
   */
  trackingIndex: number;
  /**
   * Values passed to a [tagged template literal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) converted to types understood by the SonicWeave runtime.
   */
  templateArguments: SonicWeaveValue[];

  private C4_: TimeMonzo;
  private up_: Interval;
  private lift_: Interval;

  /**
   * Create a new root context.
   * @param gas Computational budget for evaluating the program.
   */
  constructor(gas?: number) {
    this.title = '';
    this.C4_ = new TimeMonzo(ZERO, []);
    this.up_ = new Interval(new TimeMonzo(ZERO, []), 'logarithmic', 1);
    this.lift_ = new Interval(new TimeMonzo(ZERO, []), 'logarithmic', 5);
    this.gas = gas ?? Infinity;
    this.fragiles = [];
    this.trackingIndex = 0;
    this.templateArguments = [];
  }

  /**
   * Current value of middle C. With respect to the unison frequency if relative or with respect to 1 Hz if absolute.
   */
  get C4() {
    return this.C4_;
  }
  set C4(value: TimeMonzo) {
    this.C4_ = value;
    this.breakFragiles();
  }

  /**
   * Current value of the 'up' `^` inflection and conversely of the 'down' `v` inflection.
   */
  get up() {
    return this.up_;
  }
  set up(value: Interval) {
    this.up_ = value;
    this.breakFragiles();
  }

  // TypeDoc can't do markdown of a single backslash.
  /**
   * Current value of the 'lift' `/` inflection and conversely of the 'drop' `\ ` inflection.
   */
  get lift() {
    return this.lift_;
  }
  set lift(value: Interval) {
    this.lift_ = value;
    this.breakFragiles();
  }

  /**
   * Create an independent  clone of the context useable as a cache of runtime state.
   * @returns A {@link RootContext} in the same state as this one.
   */
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

  /**
   * Update the internal counter when spending computational resources.
   * @param amount How many ticks to spend.
   * @throws An error if the context runs out of gas.
   */
  spendGas(amount = 1) {
    if (isNaN(amount)) {
      return;
    }
    if (amount < 0) {
      throw new Error('Cannot refill gas.');
    }
    this.gas -= amount;
    if (this.gas <= 0) {
      throw new Error('Out of gas. (Infinite loop?)');
    }
  }

  private breakFragiles() {
    for (const fragile of this.fragiles) {
      fragile.break();
    }
    this.fragiles = [];
  }

  /**
   * Convert the state of this context into a block of text in the SonicWeave DSL.
   * @param defaults Root context for determining if the root pitch etc. has changed.
   * @returns A string that when evaluated should recreate the same runtime context.
   */
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
    if (!this.up.strictEquals(defaults.up)) {
      lines.push(`^ = ${this.up.toString()}`);
    }
    if (!this.lift.strictEquals(defaults.lift)) {
      lines.push(`/ = ${this.lift.toString()}`);
    }
    return lines.join('\n');
  }

  /**
   * Obtain the next free tracking ID and advance the counter.
   * @returns An identifier for tracking the evolution of a {@link Interval} instance.
   */
  nextTrackingId() {
    this.trackingIndex++;
    return this.trackingIndex;
  }
}
