import {
  createCorsOriginDelegate,
  isDynamicDevOrigin,
  isOriginAllowed,
  parseCorsOrigins,
} from './cors.util';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function run() {
  assert(
    parseCorsOrigins('http://localhost:3000, https://x.app.github.dev/').length === 2,
    'parseCorsOrigins splits and trims',
  );

  assert(isDynamicDevOrigin('http://localhost:3000'), 'localhost allowed');
  assert(isDynamicDevOrigin('http://127.0.0.1:5173'), '127.0.0.1 any port');
  assert(
    isDynamicDevOrigin('https://fuzzy-space-3000.app.github.dev'),
    'codespaces origin allowed',
  );
  assert(!isDynamicDevOrigin('https://evil.example.com'), 'random host denied');

  const list = ['http://localhost:3000'];
  assert(
    isOriginAllowed('https://abc-3000.app.github.dev', list),
    'codespaces allowed even if not in env list',
  );
  assert(
    isOriginAllowed('http://localhost:3001', list),
    'localhost other port allowed dynamically',
  );
  assert(
    !isOriginAllowed('https://attacker.com', list),
    'unknown origin denied',
  );
  assert(isOriginAllowed(undefined, list), 'no origin (curl) allowed');

  const delegate = createCorsOriginDelegate(list);
  let reflected: string | boolean | undefined;
  delegate('https://name-3000.app.github.dev', (err, origin) => {
    if (err) throw err;
    reflected = origin;
  });
  assert(
    reflected === 'https://name-3000.app.github.dev',
    'delegate reflects codespaces origin for credentials',
  );

  let denied: string | boolean | undefined = 'unset';
  delegate('https://evil.com', (err, origin) => {
    if (err) throw err;
    denied = origin;
  });
  assert(denied === false, 'delegate denies unknown origin');

  // eslint-disable-next-line no-console
  console.log('cors.util.spec.ts: all assertions passed');
}

run();
