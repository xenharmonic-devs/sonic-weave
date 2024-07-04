// Parenthesis counter for the repl

// Depends on base.pegjs

{{
  const empty = {parens: 0, squares: 0, curlies: 0};
}}

Start = _ content: Expression|.., _| _ EOF {
  const result = {parens: 0, squares: 0, curlies: 0};
  for (const counts of content) {
    result.parens += counts.parens;
    result.squares += counts.squares;
    result.curlies += counts.curlies;
  }
  return result;
}

Expression
  = RangeOrSlice
  / StringLiteral
  / MonzoLiteral
  / Array
  / ValLiteral
  / ParenthesizedExpression
  / Other

ParenthesizedExpression = '(' _ Expression _ closed: ')'? {
  if (closed) {
    return empty;
  }
  return {parens: 1, squares: 0, curlies: 0};
}

RangeOrSlice
  = '[' _ Expression _ '..' _ '<'? _ Expression _ closed: ']'? {
    if (closed) {
      return empty;
    }
    return {parens: 0, squares: 1, curlies: 0};
  }

Array
  = '[' _ Expression|.., _| _ closed: ']'? {
    if (closed) {
      return empty;
    }
    return {parens: 0, squares: 1, curlies: 0};
  }

StringLiteral
  = '"' chars: DoubleStringCharacter* '"' { return empty; }
  / "'" chars: SingleStringCharacter* "'" { return empty; }

MonzoLiteral
  = '[' _ VectorComponents _ [>⟩] {
    return empty;
  }

ValLiteral
  = [<⟨] _ VectorComponents _ ']' {
    return empty;
  }

Other = _ fragments: OtherFragment|1.., _| _ {
  const result = {parens: 0, squares: 0, curlies: 0};
  for (const counts of fragments) {
    result.parens += counts.parens;
    result.squares += counts.squares;
    result.curlies += counts.curlies;
  }
  return result;
}

OtherFragment = (!WhiteSpace !LineTerminatorSequence !Comment !'"' !"'" !'[' !']' !'(' !')' SourceCharacter)+ {
  const t = text();
  const parens = (t.match(/\(/g) ?? []).length - (t.match(/\)/g) ?? []).length;
  const squares = (t.match(/\[/g) ?? []).length - (t.match(/\]/g) ?? []).length;
  const curlies = (t.match(/{/g) ?? []).length - (t.match(/}/g) ?? []).length;
  return {parens, squares, curlies};
}
