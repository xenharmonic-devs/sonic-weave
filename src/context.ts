import {TimeMonzo} from './monzo';
import {ZERO} from './utils';

export class RootContext {
  title: string;
  C4: TimeMonzo;
  up: TimeMonzo;
  lift: TimeMonzo;
  unisonFrequency?: TimeMonzo;

  constructor() {
    this.title = '';
    this.C4 = new TimeMonzo(ZERO, []);
    this.up = new TimeMonzo(ZERO, [], undefined, 1);
    this.lift = new TimeMonzo(ZERO, [], undefined, 5);
  }
}
