import { TextLineStream } from 'https://deno.land/std@0.224.0/streams/text_line_stream.ts';

type Token =
  | { tag: 'true' }
  | { tag: 'false' }
  | { tag: 'if' }
  | { tag: 'then' }
  | { tag: 'else' };

type Term =
  | { tag: 'true' }
  | { tag: 'false' }
  | { tag: 'if'; t1: Term; t2: Term; t3: Term };

type Value = Extract<Term, { tag: 'true' } | { tag: 'false' }>;

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

    if (/[a-z]/.test(src[i])) {
      const begin = i;
      while (true) {
        if (i === src.length) {
          break;
        }
        if (!/[a-z]/.test(src[i])) {
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
      case 'if': {
        switch (term.t1.tag) {
          case 'true':
            return term.t2;
          case 'false':
            return term.t3;
          default: {
            const t = step(term.t1);
            if (!t) {
              throw new Error(`stuck: ${JSON.stringify(term.t1)}`);
            }
            return { ...term, t1: t };
          }
        }
      }
      default:
        return null;
    }
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
  if (!(cur.tag === 'true' || cur.tag === 'false')) {
    throw new Error(`eval wrong: ${JSON.stringify(cur)}`);
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
