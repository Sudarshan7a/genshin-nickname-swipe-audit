// Go-live outside verification. Reads codes from .env, prints only PASS/FAIL.
// Leaves the DB clean: deletes its own vote and voter at the end.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}

const BASE = 'https://nicknameswipe.mkgw5rnc5pej.opentunnel.xyz';
const INV = process.env.INVITE_CODE;
const ADM = process.env.ADMIN_CODE;
const VOTER = 'golive-check-voter';
const H = { 'x-invite-code': INV, 'x-voter-id': VOTER, 'Content-Type': 'application/json' };
const results = [];
const check = (name, ok, detail = '') => {
  results.push([ok ? 'PASS' : 'FAIL', name, detail]);
  if (!ok) process.exitCode = 1;
};

async function F(name, url, opts) {
  try {
    const r = await fetch(url, opts);
    return r;
  } catch (e) {
    check(name, false, 'fetch threw: ' + e.message);
    return null;
  }
}

(async () => {
  // 1. bare URL serves the app shell (gate renders client-side); no card markup
  const bareRes = await F('bare URL reachable', BASE + '/');
  if (bareRes) {
    const bare = await bareRes.text();
    check('bare URL 200 + app shell, no card markup', bareRes.status === 200 && bare.includes('<div id="root">') && !bare.includes('card-nick'));
  }

  // 2. wrong code rejected, no code rejected
  const noCode = await F('no-code request reachable', BASE + '/api/entities');
  if (noCode) check('no code -> 401', noCode.status === 401, 'status=' + noCode.status);
  const wrong = await F('wrong-code request reachable', BASE + '/api/entities', { headers: { 'x-invite-code': 'nope' } });
  if (wrong) check('wrong code -> 401', wrong.status === 401, 'status=' + wrong.status);

  // 3. correct code works
  const ent = await F('entities request reachable', BASE + '/api/entities', { headers: { 'x-invite-code': INV } });
  if (!ent) return void done();
  const { entities } = await ent.json();
  check('correct code -> entities', ent.status === 200 && entities.length === 442, 'count=' + (entities && entities.length));
  const deck0 = entities.find((e) => (e.nicknames || []).length > 0);
  const nick = deck0.nicknames[0];

  // 4. one vote persists (forwarded-IP header passes through the tunnel)
  const v = await F('vote request reachable', BASE + '/api/vote', {
    method: 'POST',
    headers: { ...H, 'X-Forwarded-For': '198.51.100.23' },
    body: JSON.stringify({ nicknameId: nick.id, entityId: deck0.id, answer: 'heard' }),
  });
  if (v) check('vote accepted via tunnel', v.status === 200, 'status=' + v.status);
  const myRes = await F('my-votes request reachable', BASE + '/api/my-votes', { headers: H });
  if (myRes) {
    const mine = await myRes.json();
    check('vote visible in my-votes', mine.votes.some((x) => x.nicknameId === nick.id && x.answer === 'heard'));
  }

  // 5. admin gate
  const noAdm = await F('results request reachable', BASE + '/api/results', { headers: { 'x-invite-code': INV } });
  if (noAdm) check('admin without code -> 403', noAdm.status === 403, 'status=' + noAdm.status);
  const admH = { 'x-invite-code': INV, 'x-admin-code': ADM };
  const res = await F('admin results reachable', BASE + '/api/results', { headers: admH });
  if (res) check('admin with code -> 200', res.status === 200, 'status=' + res.status);
  const exp = await F('export reachable', BASE + '/api/export', { headers: admH });
  if (exp) {
    const expJ = await exp.json();
    check('export verified:false + counts', expJ.verified === false && expJ.results[nick.id].heard >= 1);
  }

  // 6. cleanup: delete vote + voter, confirm DB clean
  await F('retract reachable', BASE + '/api/vote', { method: 'DELETE', headers: H, body: JSON.stringify({ nicknameId: nick.id }) });
  const Database = require('better-sqlite3');
  const db = new Database(path.join(root, 'data', 'votes.db'));
  db.prepare('DELETE FROM voters WHERE voter_id = ?').run(VOTER);
  const left = db.prepare('select (select count(*) from votes) v, (select count(*) from voters) vt, (select count(*) from suggestions) s').get();
  check('db clean after cleanup', left.v === 0 && left.vt === 0 && left.s === 0, JSON.stringify(left));
  db.close();
  done();
})().catch((e) => { console.error('FAIL - harness error', e.stack || e.message); process.exit(1); });

function done() {
  for (const [s, n, d] of results) console.log(s, '-', n, d);
}
