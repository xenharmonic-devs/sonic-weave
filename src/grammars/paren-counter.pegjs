// Parenthesis counter for the repl

// Depends on base.pegjs

{{
  const empty = { parens: 0, squares: 0, curlies: 0 };
}}

Start = _ content: Expression |.., _| _ EOF {
  const result = { parens: 0, squares: 0, curlies: 0 };
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

ParenthesizedExpression
  = '(' _ content: Expression |.., _| _ closed: ')'? {
  const result = { parens: 0, squares: 0, curlies: 0 };
  for (const counts of content) {
    result.parens += counts.parens;
    result.squares += counts.squares;
    result.curlies += counts.curlies;
  }
  if (!closed) {
    result.parens += 1;
  }
  return result;
}

RangeOrSlice
  = '[' _ lower: Expression _ '..' _ '<'? _ upper: Expression _ closed: ']'? {
    const result = {
      parens: lower.parens + upper.parens,
      squares: lower.squares + upper.squares,
      curlies: lower.curlies + upper.curlies,
    };
    if (!closed) {
      result.squares += 1;
    }
    return result;
  }

Array
  = '[' _ content: Expression |.., _| _ closed: ']'? {
    const result = { parens: 0, squares: 0, curlies: 0 };
    for (const counts of content) {
      result.parens += counts.parens;
      result.squares += counts.squares;
      result.curlies += counts.curlies;
    }
    if (!closed) {
      result.squares += 1;
    }
    return result;
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
  const result = { parens: 0, squares: 0, curlies: 0 };
  for (const counts of fragments) {
    result.parens += counts.parens;
    result.squares += counts.squares;
    result.curlies += counts.curlies;
  }
  return result;
}

OtherFragment
  = (!WhiteSpace !LineTerminatorSequence !Comment !'"' !"'" !'[' !']' !'(' !')' SourceCharacter)+ {
  const t = text();
  let parens = 0;
  let squares = 0;
  let curlies = 0;
  for (const c of t) {
    if (c === '(') {
      ++parens;
    } else if (c === ')') {
      --parens;
    } else if (c === '[') {
      ++squares;
    } else if (c === ']') {
      --squares;
    } else if (c === '{') {
      ++curlies;
    } else if (c === '}') {
      --curlies;
    }
  }
  return { parens, squares, curlies };
}
