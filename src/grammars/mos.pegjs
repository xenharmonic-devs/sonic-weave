// Depends on base.pegjs and forward-references sonic-weave.pegjs

MosToken = @'MOS' !IdentifierPart

MosDeclaration
  = MosToken _ body: MosStatement {
    return {
      type: 'MosDeclaration',
      body,
    };
  }

MosUndeclaration
  = MosToken _ NoneToken EOS {
    return {
      type: 'MosDeclaration',
      body: [],
    };
  }

MosExpression
  = HardnessDeclaration
  / LargeDeclaration
  / SmallDeclaration
  / EquaveDeclaration
  / AbstractStepPattern
  / PatternUpDownPeriod
  / LargeIntegerPattern
  / SmallIntegerPattern

MosStatement
  = expression: (_ @MosExpression EOS) {
    return [expression];
  }
  / MosBlock

MosBlock
  = '{' _ expressions: (_ @MosExpression EOS)|1..| _ '}' EOS {
    return expressions;
  }

RationalEquave
  = '<' numerator: PositiveBasicInteger denominator: ('/' @PositiveBasicInteger)? '>' {
    return {
      type: 'RationalEquave',
      numerator,
      denominator: denominator ?? 1,
    };
  }

AbstractStepPattern
  = pattern: [Ls]+ __ equave: RationalEquave? {
    return {
      type: 'AbstractStepPattern',
      pattern,
      equave,
    }
  }

SmallIntegerPattern
  = pattern: [0-9]+ __ equave: RationalEquave? {
    return {
      type: 'IntegerPattern',
      pattern: pattern.map(d => parseInt(d, 10)),
      equave,
    };
  }

LargeIntegerPattern
  = pattern: BasicInteger|2.., _ ',' _| equave: (__ ','? __ @RationalEquave?) {
    return {
      type: 'IntegerPattern',
      pattern,
      equave,
    };
  }

UpDownPeriod
  = up: BasicInteger __ '|' __ down: BasicInteger __ period: ('(' __ @PositiveBasicInteger __ ')')? {
    return {
      type: 'UDP',
      up,
      down,
      period,
    };
  }

PatternUpDownPeriod
  = countLarge: PositiveBasicInteger 'L' __ countSmall: PositiveBasicInteger 's' __ udp: UpDownPeriod? __ equave: RationalEquave? {
    return {
      type: 'PatternUpDownPeriod',
      countLarge,
      countSmall,
      udp,
      equave,
    };
  }

HardnessDeclaration
  = 'hardness' __ '=' __ value: Expression {
    return {
      type: 'HardnessDeclaration',
      value,
    };
  }

LargeDeclaration
  = 'L' __ '=' __ value: Expression {
    return {
      type: 'LargeDeclaration',
      value,
    };
  }

SmallDeclaration
  = 's' __ '=' __ value: Expression {
    return {
      type: 'SmallDeclaration',
      value,
    };
  }

EquaveDeclaration
  = 'equave' __ '=' __ value: Expression {
    return {
      type: 'EquaveDeclaration',
      value,
    };
  }
