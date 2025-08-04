import { TextLineStream } from 'https://deno.land/std@0.224.0/streams/text_line_stream.ts';

type Token =
  | { tag: 'true' }
  | { tag: 'false' }
  | { tag: 'if' }
  | { tag: 'then' }
  | { tag: 'else' }
  | { tag: '0' }
  | { tag: 'succ' }
  | { tag: 'pred' }
  | { tag: 'iszero' };

type Term =
  | { tag: 'true' }
  | { tag: 'false' }
  | { tag: 'if'; t1: Term; t2: Term; t3: Term }
  | { tag: '0' }
  | { tag: 'succ'; t1: Term }
  | { tag: 'pred'; t1: Term }
  | { tag: 'iszero'; t1: Term };

type Value = { tag: 'true' } | { tag: 'false' } | NValue;
type NValue = { tag: '0' } | { tag: 'succ'; t1: NValue };

const lex = (src: string): Token[] => {
  const tokens: Token[] = [];

  let i = 0;
  while (true) {
    if (i === src.length) {
      break;
    }

    if (/\s/.test(src[i])) {
      i++;
      continue;
    }

    if (/[a-z0-9]/.test(src[i])) {
      const begin = i;
      while (true) {
        if (i === src.length) {
          break;
        }
        if (!/[a-z0-9]/.test(src[i])) {
          break;
        }
        i++;
      }
      const str = src.substring(begin, i);
      tokens.push(
        ((): Token => {
          switch (str) {
            case 'true': {
              return { tag: 'true' };
            }
            case 'false': {
              return { tag: 'false' };
            }
            case 'if': {
              return { tag: 'if' };
            }
            case 'then': {
              return { tag: 'then' };
            }
            case 'else': {
              return { tag: 'else' };
            }
            case '0': {
              return { tag: '0' };
            }
            case 'succ': {
              return { tag: 'succ' };
            }
            case 'pred': {
              return { tag: 'pred' };
            }
            case 'iszero': {
              return { tag: 'iszero' };
            }
            default: {
              throw new Error(`invalid str: ${str}`);
            }
          }
        })()
      );
      continue;
    }

    throw new Error(`invalid char: ${src[i]}`);
  }

  return tokens;
};

const parse = (tokens: Token[]): Term => {
  const ts = [...tokens];

  const consume = (): Token => {
    const token = ts.shift();
    if (!token) {
      throw new Error('no token');
    }
    return token;
  };

  const expect = (tag: Token['tag']) => {
    const token = consume();
    if (token.tag !== tag) {
      throw new Error(`invalid token. ${tag} expected, but got ${token.tag}`);
    }
  };

  const parse1 = (): Term => {
    const token = consume();
    switch (token.tag) {
      case 'true': {
        return { tag: 'true' };
      }
      case 'false': {
        return { tag: 'false' };
      }
      case 'if': {
        const t1 = parse1();
        expect('then');
        const t2 = parse1();
        expect('else');
        const t3 = parse1();
        return { tag: 'if', t1, t2, t3 };
      }
      case 'then': {
        throw new Error('unreachable then');
      }
      case 'else': {
        throw new Error('unreachable else');
      }
      case '0': {
        return { tag: '0' };
      }
      case 'succ': {
        return { tag: 'succ', t1: parse1() };
      }
      case 'pred': {
        return { tag: 'pred', t1: parse1() };
      }
      case 'iszero': {
        return { tag: 'iszero', t1: parse1() };
      }
    }
  };

  const term = parse1();
  if (ts.length > 0) {
    throw new Error('extra token');
  }
  return term;
};

const evaluate = (term: Term): Value => {
  const step = (term: Term): Term | null => {
    switch (term.tag) {
      case 'true':
        return null;
      case 'false':
        return null;
      case 'if': {
        switch (term.t1.tag) {
          case 'true':
            // E-IfTrue
            return term.t2;
          case 'false':
            // E-IfFalse
            return term.t3;
          default: {
            // E-If
            const t = step(term.t1);
            if (!t) {
              return null;
            }
            return { ...term, t1: t };
          }
        }
      }
      case '0':
        return null;
      case 'succ': {
        // E-Succ
        const t1 = step(term.t1);
        if (!t1) {
          return null;
        }
        return { ...term, t1 };
      }
      case 'pred': {
        switch (term.t1.tag) {
          case '0':
            // E-PredZero
            return term.t1;
          default: {
            // E-PredSucc
            if (term.t1.tag === 'succ' && isNValue(term.t1.t1)) {
              return term.t1.t1;
            }
            // E-Pred
            const t1 = step(term.t1);
            if (!t1) {
              return null;
            }
            return { ...term, t1 };
          }
        }
      }
      case 'iszero':
        switch (term.t1.tag) {
          case '0':
            // E-IszeroZero
            return { tag: 'true' };
          default: {
            // E-IszeroSucc
            if (term.t1.tag === 'succ' && isNValue(term.t1.t1)) {
              return { tag: 'false' };
            }
            // E-Iszero
            const t1 = step(term.t1);
            if (!t1) {
              return null;
            }
            return { ...term, t1 };
          }
        }
    }
  };

  const isNValue = (term: Term): term is NValue => {
    return term.tag === '0' || (term.tag === 'succ' && isNValue(term.t1));
  };

  const isValue = (term: Term): term is Value => {
    return term.tag === 'true' || term.tag === 'false' || isNValue(term);
  };

  // evaluate by small-step
  let cur = term;
  while (true) {
    const next = step(cur);
    if (!next) {
      break;
    }
    cur = next;
  }

  // assert value
  if (!isValue(cur)) {
    throw new Error(`stuck term: ${JSON.stringify(cur)}`);
  }

  return cur;
};

const main = (src: string) => {
  console.log('-- src --');
  console.log(src);
  console.log('-- tokens --');
  const tokens = lex(src);
  console.dir(tokens, { depth: null });
  console.log('-- term --');
  const term = parse(tokens);
  console.dir(term, { depth: null });
  console.log('-- value --');
  const value = evaluate(term);
  console.dir(value, { depth: null });
};

(async () => {
  async function runOnce() {
    const text = await new Response(Deno.stdin.readable).text();
    main(text.trim());
  }

  async function repl() {
    const enc = new TextEncoder();
    const it = Deno.stdin.readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream())
      [Symbol.asyncIterator]();
    while (true) {
      await Deno.stdout.write(enc.encode('> '));
      const { value: line, done } = await it.next();
      if (done) break;

      const src = line.trim();
      if (src === 'exit' || src === 'quit') break;

      try {
        main(src);
      } catch (e) {
        console.error(e);
      }
    }
  }

  if (Deno.stdin.isTerminal()) {
    await repl();
  } else {
    await runOnce();
  }
})();
