export type PlainLiteral = {
  type: 'PlainLiteral';
  value: bigint;
};

export type ColorLiteral = {
  type: 'ColorLiteral';
  value: string;
};

export type Primary = PlainLiteral | ColorLiteral;

export function addNodes(a?: Primary, b?: Primary): Primary | undefined {
  if (!a || !b) {
    return undefined;
  }
  if (a.type === 'PlainLiteral' && b.type === 'PlainLiteral') {
    return {
      type: a.type,
      value: a.value + b.value,
    };
  }

  return undefined;
}

export function subNodes(a?: Primary, b?: Primary): Primary | undefined {
  if (!a || !b) {
    return undefined;
  }
  if (a.type === 'PlainLiteral' && b.type === 'PlainLiteral') {
    return {
      type: a.type,
      value: a.value - b.value,
    };
  }

  return undefined;
}
