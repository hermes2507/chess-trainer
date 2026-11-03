// Classic games to replay and to practise with "guess the move".
// Moves are SAN; {curly comments} attach to the preceding move (see parseLine).
// `side` is the side the student guesses for (usually the winner).
// `openings` lists ids of opening courses (js/data/openings.js) the game illustrates.
export const CLASSICS = [
  {
    id: 'legal', white: 'Kermur de Legall', black: 'Saint Brie', event: 'Paris', year: 1750, result: '1-0', side: 'w',
    era: 'Romantic', level: 400, title: "Légal's Mate", openings: [],
    summary: 'A seven-move classic: White gives up the queen to deliver mate with three minor pieces.',
    lessons: ['A pin is only real if breaking it loses something', 'Count the attackers on f7 before grabbing material', 'Minor pieces working together can mate'],
    moves: 'e4 e5 Bc4 d6 Nf3 Bg4 {Pinning the knight to the queen.} Nc3 g6 Nxe5 {Breaking the pin! The queen is offered.} Bxd1 {Greed.} Bxf7+ Ke7 Nd5# {Three minor pieces deliver mate.}',
  },
  {
    id: 'immortal', white: 'Adolf Anderssen', black: 'Lionel Kieseritzky', event: 'London (casual)', year: 1851, result: '1-0', side: 'w',
    era: 'Romantic', level: 1200, title: 'The Immortal Game', openings: ['kings-gambit'],
    summary: 'Anderssen sacrifices a bishop, both rooks and the queen, then mates with his three remaining minor pieces.',
    lessons: ['Development and initiative can outweigh huge amounts of material', 'Grabbing pawns and rooks with the queen costs time', 'Look for mates when the enemy king is stuck in the centre'],
    moves: 'e4 e5 f4 {The King\'s Gambit.} exf4 Bc4 Qh4+ Kf1 b5 Bxb5 Nf6 Nf3 Qh6 d3 Nh5 Nh4 Qg5 Nf5 c6 g4 Nf6 Rg1 {The first offer: the bishop is left hanging.} cxb5 h4 Qg6 h5 Qg5 Qf3 Ng8 {Black\'s pieces are going backwards.} Bxf4 Qf6 Nc3 Bc5 Nd5 Qxb2 Bd6 {Offering both rooks!} Bxg1 e5 {Cutting the black queen off from defence.} Qxa1+ Ke2 Na6 Nxg7+ Kd8 Qf6+ {The final queen sacrifice.} Nxf6 Be7# {Mate with bishop and two knights.}',
  },
  {
    id: 'evergreen', white: 'Adolf Anderssen', black: 'Jean Dufresne', event: 'Berlin (casual)', year: 1852, result: '1-0', side: 'w',
    era: 'Romantic', level: 1300, title: 'The Evergreen Game', openings: ['italian'],
    summary: 'An Evans Gambit that ends in a stunning queen sacrifice and a mating net with two bishops.',
    lessons: ['Open lines toward an uncastled king', 'Use checks to drive the king into a net', 'A pinned piece is a poor defender'],
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 {The Evans Gambit.} Bxb4 c3 Ba5 d4 exd4 O-O d3 Qb3 Qf6 e5 Qg6 Re1 Nge7 Ba3 {Pinning the e7-knight against the king.} b5 Qxb5 Rb8 Qa4 Bb6 Nbd2 Bb7 Ne4 Qf5 Bxd3 Qh5 Nf6+ {Opening the g-file in front of the king.} gxf6 exf6 Rg8 Rad1 {Black now threatens mate himself, but White is first.} Qxf3 Rxe7+ Nxe7 Qxd7+ {The famous queen sacrifice.} Kxd7 Bf5+ Ke8 Bd7+ Kf8 Bxe7#',
  },
  {
    id: 'opera', white: 'Paul Morphy', black: 'Duke of Brunswick & Count Isouard', event: 'Paris Opera', year: 1858, result: '1-0', side: 'w',
    era: 'Romantic', level: 800, title: 'The Opera Game', openings: [],
    summary: 'Played during an opera performance, it is the textbook example of fast development and attacking a king left in the centre.',
    lessons: ['Develop a new piece with each move', 'Give material to keep the opponent\'s king in the centre', 'Bring every piece into the attack'],
    moves: 'e4 e5 Nf3 d6 {Philidor Defence.} d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 {Attacking f7 and b7 at once.} Qe7 Nc3 c6 Bg5 b5 Nxb5 {Morphy sacrifices to open lines.} cxb5 Bxb5+ Nbd7 O-O-O {All his pieces join in.} Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ {A queen sacrifice to deflect the knight.} Nxb8 Rd8# {Mate with the last two pieces.}',
  },
  {
    id: 'steinitz-bardeleben', white: 'Wilhelm Steinitz', black: 'Curt von Bardeleben', event: 'Hastings', year: 1895, result: '1-0', side: 'w',
    era: 'Classical', level: 1500, title: 'The Rook That Would Not Be Taken', openings: ['italian'],
    summary: 'Steinitz\'s rook checks the king up the board; any capture leads to mate. Von Bardeleben left the hall rather than resign.',
    lessons: ['Keep the opponent\'s king from castling', 'Back-rank weaknesses decide games', 'A rook on the seventh rank can be deadly'],
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Nc3 d5 exd5 Nxd5 O-O Be6 Bg5 Be7 Bxd5 Bxd5 Nxd5 Qxd5 Bxe7 Nxe7 Re1 {The pin on the e-file stops Black castling.} f6 Qe2 Qd7 Rac1 c6 d5 {A pawn sacrifice to open lines.} cxd5 Nd4 Kf7 Ne6 Rhc8 Qg4 g6 Ng5+ Ke8 Rxe7+ {The famous rook.} Kf8 Rf7+ Kg8 Rg7+ {Taking the rook at any point loses to a mating attack.} Kh8 Rxh7+ {Black resigned: mate follows by force.}',
  },
  {
    id: 'rotlewi-rubinstein', white: 'Georg Rotlewi', black: 'Akiba Rubinstein', event: 'Łódź', year: 1907, result: '0-1', side: 'b',
    era: 'Classical', level: 1600, title: "Rubinstein's Immortal", openings: [],
    summary: 'Two bishops aimed at the white king and a cascade of sacrifices, finishing with a rook offer that cannot be declined.',
    lessons: ['Bishops on long diagonals pointed at the king', 'Open the position when you are better developed', 'Calculate forcing lines: checks, captures, threats'],
    moves: 'd4 d5 Nf3 e6 e3 c5 c4 Nc6 Nc3 Nf6 dxc5 Bxc5 a3 a6 b4 Bd6 Bb2 O-O Qd2 Qe7 Bd3 dxc4 Bxc4 b5 Bd3 Rd8 Qe2 Bb7 O-O Ne5 Nxe5 Bxe5 f4 Bc7 e4 Rac8 e5 Bb6+ Kh1 Ng4 {Opening the long diagonal toward g2.} Be4 Qh4 {The queen sacrifice.} g3 Rxc3 {Removing the defender.} gxh4 Rd2 {The second rook joins in.} Qxd2 Bxe4+ Qg2 Rh3 {Mate on h2 cannot be stopped.}',
  },
  {
    id: 'reti-tartakower', white: 'Richard Réti', black: 'Savielly Tartakower', event: 'Vienna (casual)', year: 1910, result: '1-0', side: 'w',
    era: 'Classical', level: 900, title: 'Réti\'s Queen Sacrifice', openings: ['caro'],
    summary: 'A Caro-Kann that ends on move 11 with a queen sacrifice and a double-check mate.',
    lessons: ['Castling long puts a rook on the open d-file', 'Double check forces the king to move', 'Watch for discovered attacks when your king is in the centre'],
    moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Qd3 e5 dxe5 Qa5+ Bd2 Qxe5 O-O-O {Offering a knight, but the d-file is now open.} Nxe4 Qd8+ {The queen sacrifice.} Kxd8 Bg5+ {Double check.} Kc7 Bd8# {Mate.}',
  },
  {
    id: 'lasker-thomas', white: 'Edward Lasker', black: 'George Thomas', event: 'London', year: 1912, result: '1-0', side: 'w',
    era: 'Classical', level: 1100, title: 'The King Hunt', openings: ['dutch'],
    summary: 'A queen sacrifice on h7 drags the black king all the way to g1, where it is mated.',
    lessons: ['Qxh7+ sacrifices work when knights can follow up', 'Keep checking: a king in the open rarely survives', 'Even your own king can deliver the final blow'],
    moves: 'd4 e6 Nf3 f5 Nc3 Nf6 Bg5 Be7 Bxf6 Bxf6 e4 fxe4 Nxe4 b6 Ne5 O-O Bd3 Bb7 Qh5 Qe7 Qxh7+ {The queen sacrifice.} Kxh7 Nxf6+ {Double check.} Kh6 Neg4+ Kg5 h4+ Kf4 g3+ Kf3 Be2+ Kg2 Rh2+ Kg1 Kd2# {Mate by the king walking to d2.}',
  },
  {
    id: 'botvinnik-capablanca', white: 'Mikhail Botvinnik', black: 'José Raúl Capablanca', event: 'AVRO, Netherlands', year: 1938, result: '1-0', side: 'w',
    era: 'Modern', level: 1800, title: 'The AVRO Combination', openings: ['nimzo'],
    summary: 'Botvinnik pushes his centre pawns into Capablanca\'s king, then finishes with a bishop sacrifice and a queen invasion.',
    lessons: ['A pawn centre that advances can smother the defender', 'Trade the opponent\'s best defender', 'A passed pawn on the seventh rank is worth a lot'],
    moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 d5 a3 Bxc3+ bxc3 c5 cxd5 exd5 Bd3 O-O Ne2 b6 O-O Ba6 Bxa6 Nxa6 Bb2 Qd7 a4 Rfe8 Qd3 c4 Qc2 Nb8 Rae1 Nc6 Ng3 Na5 f3 Nb3 e4 {The central pawns start to roll.} Qxa4 e5 Nd7 Qf2 g6 f4 f5 exf6 Nxf6 f5 Rxe1 Rxe1 Re8 Re6 Rxe6 fxe6 Kg7 Qf4 Qe8 Qe5 Qe7 Ba3 {The famous bishop sacrifice.} Qxa3 Nh5+ gxh5 Qg5+ Kf8 Qxf6+ Kg8 e7 {The pawn will queen.} Qc1+ Kf2 Qc2+ Kg3 Qd3+ Kh4 Qe4+ Kxh5 Qe2+ Kh4 Qe4+ g4 Qe1+ Kh5 {Black has run out of checks.}',
  },
  {
    id: 'game-of-century', white: 'Donald Byrne', black: 'Bobby Fischer', event: 'Rosenwald Memorial, New York', year: 1956, result: '0-1', side: 'b',
    era: 'Modern', level: 1800, title: 'The Game of the Century', openings: ['grunfeld'],
    summary: 'Thirteen-year-old Fischer gives up his queen for a whirlwind of minor pieces that hunts down the white king.',
    lessons: ['Keep the enemy king in the centre', 'A queen sacrifice is fine if the pieces you get back coordinate', 'Windmill checks can collect lots of material'],
    moves: 'Nf3 Nf6 c4 g6 Nc3 Bg7 d4 O-O Bf4 d5 Qb3 dxc4 Qxc4 c6 e4 Nbd7 Rd1 Nb6 Qc5 Bg4 Bg5 Na4 {A brilliant knight offer.} Qa3 Nxc3 bxc3 Nxe4 Bxe7 Qb6 Bc4 Nxc3 Bc5 Rfe8+ Kf1 Be6 {The famous queen sacrifice.} Bxb6 Bxc4+ Kg1 Ne2+ Kf1 Nxd4+ {The windmill begins.} Kg1 Ne2+ Kf1 Nc3+ Kg1 axb6 Qb4 Ra4 Qxb6 Nxd1 h3 Rxa2 Kh2 Nxf2 Re1 Rxe1 Qd8+ Bf8 Nxe1 Bd5 Nf3 Ne4 Qb8 b5 h4 h5 Ne5 Kg7 Kg1 Bc5+ Kf1 Ng3+ Ke1 Bb4+ Kd1 Bb3+ Kc1 Ne2+ Kb1 Nc3+ Kc1 Rc2#',
  },
  {
    id: 'fischer-spassky-6', white: 'Bobby Fischer', black: 'Boris Spassky', event: 'World Championship, Reykjavík (game 6)', year: 1972, result: '1-0', side: 'w',
    era: 'Modern', level: 2000, title: 'Fischer\'s Queen\'s Gambit', openings: ['qg', 'qgd-black'],
    summary: 'Fischer, a lifelong 1.e4 player, opens with 1.c4 and wins a model positional game. Spassky applauded.',
    lessons: ['Create hanging pawns, then attack them', 'Advance a central pawn to cramp the opponent', 'Switch from positional pressure to a kingside attack at the right moment'],
    moves: 'c4 e6 Nf3 d5 d4 Nf6 Nc3 Be7 Bg5 O-O e3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6 Qa4 c5 Qa3 Rc8 Bb5 a6 dxc5 bxc5 {Black has hanging pawns on c5 and d5.} O-O Ra7 Be2 Nd7 Nd4 Qf8 Nxe6 fxe6 e4 {Breaking up the pawn centre.} d4 f4 Qe7 e5 Rb8 Bc4 Kh8 Qh3 Nf8 b3 a5 f5 {The kingside attack starts.} exf5 Rxf5 Nh7 Rcf1 Qd8 Qg3 Re7 h4 Rbb7 e6 Rbc7 Qe5 Qe8 a4 Qd8 R1f2 Qe8 R2f3 Qd8 Bd3 Qe8 Qe4 Nf6 Rxf6 {The exchange sacrifice breaks through.} gxf6 Rxf6 Kg8 Bc4 Kh8 Qf4',
  },
  {
    id: 'short-timman', white: 'Nigel Short', black: 'Jan Timman', event: 'Tilburg', year: 1991, result: '1-0', side: 'w',
    era: 'Contemporary', level: 2000, title: 'The King Walk', openings: [],
    summary: 'With the board locked down, Short walks his king from g1 to h6 in the middle of the game to support a mate on g7.',
    lessons: ['In a closed position the king can be an attacking piece', 'Tie the opponent\'s pieces down before you strike', 'A queen on f6 with a piece on h6 means mate on g7'],
    moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 g6 Bc4 Nb6 Bb3 Bg7 Qe2 Nc6 O-O O-O h3 a5 a4 dxe5 dxe5 Nd4 Nxd4 Qxd4 Re1 e6 Nd2 Nd5 Nf3 Qc5 Qe4 Qb4 Bc4 Nb6 b3 Nxc4 bxc4 Re8 Rd1 Qc5 Qh4 b6 Be3 Qc6 Bh6 Bh8 Rd8 Bb7 Rad1 Bg7 R8d7 Rf8 Bxg7 Kxg7 R1d4 Rae8 Qf6+ Kg8 h4 h5 Kh2 {The king walk begins.} Rc8 Kg3 Rce8 Kf4 Bc8 Kg5 {Kh6 and Qg7# cannot be stopped.}',
  },
  {
    id: 'kasparov-topalov', white: 'Garry Kasparov', black: 'Veselin Topalov', event: 'Wijk aan Zee', year: 1999, result: '1-0', side: 'w',
    era: 'Contemporary', level: 2200, title: "Kasparov's Immortal", openings: ['pirc'],
    summary: 'A rook sacrifice on d4 starts a king hunt that drives Topalov\'s king from b8 all the way to d1.',
    lessons: ['A king on the open queenside can be hunted', 'Sacrifice to open files and diagonals around the king', 'Calculate deeply when every move is a check'],
    moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5 Nge2 Nbd7 Bh6 Bxh6 Qxh6 Bb7 a3 e5 O-O-O Qe7 Kb1 a6 Nc1 O-O-O Nb3 exd4 Rxd4 c5 Rd1 Nb6 g3 Kb8 Na5 Ba8 Bh3 d5 Qf4+ Ka7 Rhe1 d4 Nd5 Nbxd5 exd5 Qd6 Rxd4 {The famous rook sacrifice.} cxd4 Re7+ Kb6 Qxd4+ Kxa5 b4+ Ka4 Qc3 Qxd5 Ra7 Bb7 Rxb7 Qc4 Qxf6 Kxa3 Qxa6+ Kxb4 c3+ Kxc3 Qa1+ Kd2 Qb2+ Kd1 Bf1 {A quiet move in the middle of the hunt.} Rd2 Rd7 Rxd7 Bxc4 bxc4 Qxh8 Rd3 Qa8 c3 Qa4+ Ke1 f4 f5 Kc1 Rd2 Qa7 {Black resigned.}',
  },
];
