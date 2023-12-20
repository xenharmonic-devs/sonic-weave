import {TimeMonzo} from './monzo';
import {ZERO} from './utils';

export class RootContext {
  title: string;
  C4: TimeMonzo;
  unisonFrequency?: TimeMonzo;

  constructor() {
    this.title = '';
    this.C4 = new TimeMonzo(ZERO, []);
  }
}
