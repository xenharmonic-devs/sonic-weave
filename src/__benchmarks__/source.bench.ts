import {describe, bench} from 'vitest';
import {parseAST} from '../parser';

describe('String parsing', () => {
  bench('one (doubles)', () => {
    parseAST('"hello"');
  });
  bench('one (singles)', () => {
    parseAST("'hello'");
  });
  bench('two', () => {
    parseAST('"hello" "world"');
  });
  bench('three', () => {
    parseAST('"hello" "world" "!"');
  });
  bench('four', () => {
    parseAST('"hello" "," "world" "!"');
  });
});

describe('Source parsing', () => {
  bench('SWI monzos only', () => {
    parseAST(`
      "Raga Bhairavi"
      1 = [1 3 1 1>@Hz.2.5.11

      [4 -1 -1>
      [-3 2>
      [1 1 -1>
      [-2 3 -1>
      [-1 1>
      [3 0 -1>
      [0 2 -1>
      [1>
    `);
  });

  bench('SWI monzos with labels', () => {
    parseAST(`
      "Raga Bhairavi"
      1 = [1 3 1 1>@Hz.2.5.11

      [4 -1 -1> ""
      [-3 2> ""
      [1 1 -1> ""
      [-2 3 -1> ""
      [-1 1> ""
      [3 0 -1> ""
      [0 2 -1> ""
      [1> ""
    `);
  });

  bench('SWI monzos with colors and semicolons', () => {
    parseAST(`
      "Raga Bhairavi";
      1 = [1 3 1 1>@Hz.2.5.11;

      [4 -1 -1> black;
      [-3 2> white;
      [1 1 -1> black;
      [-2 3 -1> black;
      [-1 1> white;
      [3 0 -1> black;
      [0 2 -1> black;
      [1> white;
    `);
  });

  bench('SonicWeave Interchange', () => {
    parseAST(`
      "Raga Bhairavi"
      1 = [1 3 1 1>@Hz.2.5.11

      [4 -1 -1> "" black
      [-3 2> "" white
      [1 1 -1> "" black
      [-2 3 -1> "" black
      [-1 1> "" white
      [3 0 -1> "" black
      [0 2 -1> "" black
      [1> "" white
    `);
  });
});
