// Plays through every classic game and checks legality, mates and data fields.
import { Chess } from '../vendor/chess.js';
import { CLASSICS } from '../js/data/classics.js';
import { parseLine } from '../js/data/openings.js';
let bad = 0;
const ids = new Set();
for (const g of CLASSICS) {
  if (ids.has(g.id)) { console.log('DUPLICATE ID', g.id); bad++; }
  ids.add(g.id);
  for (const f of ['white', 'black', 'event', 'year', 'result', 'side', 'title', 'summary', 'lessons', 'moves']) {
    if (g[f] == null) { console.log('MISSING', f, g.id); bad++; }
  }
  const c = new Chess();
  const moves = parseLine(g.moves);
  let ok = true;
  for (const mv of moves) {
    try { c.move(mv.san); } catch { console.log('ILLEGAL', g.id, mv.san, 'after', c.history().length, 'plies'); bad++; ok = false; break; }
  }
  if (!ok) continue;
  const last = moves[moves.length - 1].san;
  if (last.endsWith('#') !== c.isCheckmate()) { console.log('MATE MISMATCH', g.id, last); bad++; }
  if (c.isCheckmate() && (c.turn() === 'w' ? '0-1' : '1-0') !== g.result) { console.log('RESULT MISMATCH', g.id); bad++; }
  if (!/[wb]/.test(g.side)) { console.log('BAD SIDE', g.id); bad++; }
}
console.log(CLASSICS.length, 'classic games,', bad, 'problems');
if (bad) process.exit(1);
