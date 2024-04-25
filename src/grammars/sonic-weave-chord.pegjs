// Lexer for chords separated by spaces or other separators

// Depends on base.pegjs

Start = _ @(MonzoLiteral / ValLiteral / FunctionCall / ParenthesizedExpression / ArrayExpression / Other)|.., Separator| _ EOF

Separator = _ [|&:;,]? _

Prefix = (!WhiteSpace ![<|&:;,] !'[' SourceCharacter)*

MonzoLiteral
  = prefix: Prefix '[' _ components: VectorComponents _ [>⟩] basis: ('@' @SubgroupBasis)? {
    return text();
  }

ValLiteral
  = prefix: Prefix [<⟨] _ components: VectorComponents _ ']' basis: ('@' @ValBasis)? {
    return text();
  }

FunctionCall
  = IdentifierName '(' (!')' SourceCharacter)* ')' {
    return text();
  }

ParenthesizedExpression
  = '(' (!')' SourceCharacter)* ')' {
    return text();
  }

ArrayExpression
  = '[' (!']' SourceCharacter)* ']' {
    return text();
  }

Other = (!WhiteSpace ![|&:;,] SourceCharacter)+ {
  return text();
}
