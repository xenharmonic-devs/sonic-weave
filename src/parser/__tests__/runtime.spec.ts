import {describe, it, expect} from 'vitest';
import {builtinNode} from '../../stdlib';

describe('Built-in node constructor', () => {
  it('survives cursed booleans produced by minifiers', () => {
    // XXX: Vitest insists on unminifying this.
    const cursed = eval(`
      function cursed(ohNo = !1) {
        if (ohNo) {
          return 'plz';
        }
        return 'smh';
      }
      cursed;
    `);
    cursed.__doc__ = 'Emote.';
    cursed.__node__ = builtinNode(cursed);
    expect(cursed.__node__).toEqual({
      type: 'FunctionDeclaration',
      name: {type: 'Identifier', id: 'cursed'},
      parameters: {
        type: 'Parameters',
        parameters: [{type: 'Parameter', id: 'ohNo', defaultValue: null}],
        defaultValue: null,
      },
      body: [],
      text: 'riff cursed { [native riff] }',
    });
  });

  it('makes subnodes for boolean defaults', () => {
    function xenMeme(spoob = true) {
      return spoob ? ':spoob:' : ':blackwoodup:';
    }
    xenMeme.__doc__ = 'Post an emoji.';
    xenMeme.__node__ = builtinNode(xenMeme);
    expect(xenMeme.__node__).toEqual({
      type: 'FunctionDeclaration',
      name: {type: 'Identifier', id: 'xenMeme'},
      parameters: {
        type: 'Parameters',
        parameters: [
          {
            type: 'Parameter',
            id: 'spoob',
            defaultValue: {type: 'TrueLiteral'},
          },
        ],
        defaultValue: null,
      },
      body: [],
      text: 'riff xenMeme { [native riff] }',
    });
  });
});
