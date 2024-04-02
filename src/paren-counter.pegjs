// Parenthesis counter for the repl

// Depends on base.pegjs

{{
  const empty = {parens: 0, squares: 0, curlies: 0};
}}

Start = _ content: (StringLiteral / MonzoLiteral / ValLiteral / Other)|.., _| _ EOF {
  const result = {parens: 0, squares: 0, curlies: 0};
  for (const counts of content) {
    result.parens += counts.parens;
    result.squares += counts.squares;
    result.curlies += counts.curlies;
  }
  return result;
}

StringLiteral
  = '"' chars: DoubleStringCharacter* '"' { return empty; }
  / "'" chars: SingleStringCharacter* "'" { return empty; }

VectorComponent
  = sign: SignPart left: BasicInteger separator: '/' right: $(PositiveBasicInteger) {
    return {sign, left, separator, right, exponent: null};
  }
  / sign: SignPart left: BasicInteger separator: '.' right: UnderscoreDigits exponent: ExponentPart? {
    return {sign, left, separator, right, exponent};
  }
  / sign: SignPart left: BasicInteger exponent: ExponentPart? {
    return {sign, left, separator: '', right: '', exponent};
  }

VectorComponents
  = VectorComponent|.., _ ','? _|

Rational = $(PositiveInteger ('/' PositiveInteger)?)

MonzoLiteral
  = '[' _ VectorComponents _ '>' {
    return empty;
  }

ValLiteral
  = '<' _ VectorComponents _ ']' {
    return empty;
  }

Other = (!WhiteSpace !LineTerminatorSequence !Comment SourceCharacter)+ {
  const t = text();
  const parens = (t.match(/\(/g) ?? []).length - (t.match(/\)/g) ?? []).length;
  const squares = (t.match(/\[/g) ?? []).length - (t.match(/\]/g) ?? []).length;
  const curlies = (t.match(/{/g) ?? []).length - (t.match(/}/g) ?? []).length;
  return {parens, squares, curlies};
}
