// Opening courses. Moves are SAN; {curly comments} attach to the preceding move.
// `side` is the side the student plays. `level` is the suggested rating range.
export const OPENINGS = [
  {
    id: 'italian', name: 'Italian Game', side: 'w', eco: 'C50–C54', level: [400, 1400],
    summary: 'Fast development, a bishop aimed at f7 and quick castling. The classic first opening for 1.e4 players.',
    ideas: ['Develop knights before bishops', 'Bc4 eyes the weak f7 square', 'Build the centre slowly with c3 and d3/d4'],
    lines: [
      { name: 'Giuoco Pianissimo', moves: 'e4 e5 Nf3 Nc6 Bc4 {The Italian bishop targets f7.} Bc5 c3 {Preparing d4 and giving the bishop a retreat on c2.} Nf6 d3 {A calm setup: White keeps the centre solid.} d6 O-O O-O Nbd2 {The knight heads for f1–g3.} a6 Bb3 Ba7 h3 {Stops ...Bg4 pins.}' },
      { name: 'Fried Liver Attack', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 {Attacking f7 twice.} d5 exd5 Nxd5 {Natural, but risky.} Nxf7 {The sacrifice drags the king out.} Kxf7 Qf3+ Ke6 Nc3 {Piling up on the pinned d5-knight.}' },
      { name: 'Two Knights, 5...Na5', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 {The correct reply: hit the bishop.} Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 {Black has a pawn less but quick development.}' },
      { name: 'Evans Gambit', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 {A pawn for time and the centre.} Bxb4 c3 Ba5 d4 {Opening lines toward the black king.} exd4 O-O {White is ahead in development.}' },
    ],
  },
  {
    id: 'london', name: 'London System', side: 'w', eco: 'D02', level: [400, 1600],
    summary: 'A solid, low-theory setup with d4, Bf4, e3, c3 and Nbd2 that works against almost anything.',
    ideas: ['Bf4 goes out before e3', 'Pyramid of pawns c3–d4–e3', 'Ne5 and a kingside attack later'],
    lines: [
      { name: 'Main line vs ...d5', moves: 'd4 d5 Bf4 {Develop the dark-squared bishop before e3 locks it in.} Nf6 e3 e6 Nf3 c5 c3 {The London pyramid.} Nc6 Nbd2 Bd6 Bg3 {Keep the bishop instead of swapping on d6.} O-O Bd3' },
      { name: 'Against the King\'s Indian setup', moves: 'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 h3 {A safe square for the bishop on h2.} c5 c3' },
      { name: 'Against an early ...c5', moves: 'd4 d5 Bf4 c5 e3 Nc6 c3 {Calmly support d4.} Nf6 Nd2 e6 Ngf3 Bd6 Bg3 O-O Bd3' },
    ],
  },
  {
    id: 'qg', name: "Queen's Gambit", side: 'w', eco: 'D06–D69', level: [900, 2200],
    summary: 'Offer the c-pawn to deflect Black\'s d-pawn and gain central control. Among the most respected openings.',
    ideas: ['c4 challenges d5', 'Bg5 pins the f6 knight', 'Minority attack and central breaks'],
    lines: [
      { name: 'QGD Orthodox', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 {Pinning the defender of d5.} Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 {Capablanca\'s freeing manoeuvre.}' },
      { name: 'Queen\'s Gambit Accepted', moves: 'd4 d5 c4 dxc4 {Black gives up the centre for a while.} Nf3 Nf6 e3 e6 Bxc4 {White regains the pawn.} c5 O-O a6' },
      { name: 'Slav Defence', moves: 'd4 d5 c4 c6 {Supports d5 without blocking the c8-bishop.} Nf3 Nf6 Nc3 dxc4 a4 {Stops ...b5.} Bf5 e3 e6 Bxc4 Bb4 O-O' },
      { name: 'Albin Countergambit', moves: 'd4 d5 c4 e5 dxe5 d4 Nf3 {Avoid 4.e3?? and the Lasker Trap.} Nc6 g3 Be6 Nbd2' },
    ],
  },
  {
    id: 'ruy', name: 'Ruy Lopez', side: 'w', eco: 'C60–C99', level: [1300, 2400],
    summary: 'The "Spanish torture": pressure on e5 through the c6-knight. Rich strategic play favoured by world champions.',
    ideas: ['Bb5 pressures e5\'s defender', 'Slow c3–d4 central build-up', 'Long manoeuvres like Nbd2–f1–g3'],
    lines: [
      { name: 'Closed, Chigorin', moves: 'e4 e5 Nf3 Nc6 Bb5 {The Spanish bishop.} a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 {Stops ...Bg4 before d4.} Na5 Bc2 c5 d4' },
      { name: 'Berlin Defence', moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 {The "Berlin Wall".} O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8 {An early endgame where Black has the bishop pair.}' },
      { name: 'Exchange Variation', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 {White gives the bishop to damage Black\'s pawns.} dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1' },
      { name: 'Marshall Attack', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 {Marshall\'s pawn sacrifice.} exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4 g3 Qh3 {Black has a dangerous attack.}' },
    ],
  },
  {
    id: 'scotch', name: 'Scotch Game', side: 'w', eco: 'C44–C45', level: [800, 1800],
    summary: 'Strike in the centre immediately with 3.d4 and get open, active play.',
    ideas: ['Open the centre early', 'Pressure along the e-file', 'Avoid long Ruy Lopez theory'],
    lines: [
      { name: 'Mieses Variation', moves: 'e4 e5 Nf3 Nc6 d4 {Immediate central break.} exd4 Nxd4 Nf6 Nxc6 bxc6 e5 {Gaining space and kicking the knight.} Qe7 Qe2 Nd5 c4 Ba6 b3' },
      { name: 'Classical 4...Bc5', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 {Defending d4.} Qf6 c3 Nge7 Bc4' },
    ],
  },
  {
    id: 'vienna', name: 'Vienna Game', side: 'w', eco: 'C25–C29', level: [800, 1800],
    summary: 'Develop the queen\'s knight first and keep the option of a quick f4 for a kingside attack.',
    ideas: ['Nc3 supports e4 and d5', 'f4 opens the f-file', 'Bc4 combined with f4'],
    lines: [
      { name: 'Vienna Gambit', moves: 'e4 e5 Nc3 Nf6 f4 {The Vienna Gambit.} d5 {The best reply: hit the centre.} fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3' },
      { name: 'Bc4 setup', moves: 'e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 f4 {The f4 break with the bishop already on c4.} d6 Nf3' },
    ],
  },
  {
    id: 'sicilian-najdorf', name: 'Sicilian Najdorf', side: 'b', eco: 'B90–B99', level: [1600, 2600],
    summary: 'Fischer and Kasparov\'s weapon. 5...a6 keeps every option open and creates rich counter-attacking chances.',
    ideas: ['...a6 controls b5', 'Queenside counterplay with ...b5', 'Fight for d5 with ...e5 or ...e6'],
    lines: [
      { name: 'English Attack', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 {The Najdorf move.} Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4 b5 {Opposite-side castling: race to attack.}' },
      { name: '6.Bg5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7' },
      { name: '6.Be2', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 {Claiming space and kicking the knight.} Nb3 Be7 O-O O-O Be3 Be6' },
    ],
  },
  {
    id: 'sicilian-dragon', name: 'Sicilian Dragon', side: 'b', eco: 'B70–B79', level: [1200, 2200],
    summary: 'A fianchettoed bishop on g7 breathes fire down the long diagonal. Sharp, attacking chess.',
    ideas: ['Bg7 on the long diagonal', 'Rook to c8 and exchange sacrifices on c3', 'Knight jumps to e5 and c4'],
    lines: [
      { name: 'Yugoslav Attack', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 {The rook joins the queenside attack.} Bb3 Ne5' },
      { name: 'Classical', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be2 Bg7 O-O O-O Be3 Nc6 Nb3 Be6' },
      { name: 'vs Alapin 2.c3', moves: 'e4 c5 c3 {The Alapin, avoiding open Sicilians.} Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6' },
    ],
  },
  {
    id: 'french', name: 'French Defence', side: 'b', eco: 'C00–C19', level: [900, 2000],
    summary: 'Solid and counter-attacking: ...e6 and ...d5, then undermine White\'s centre with ...c5 and ...f6.',
    ideas: ['Attack the pawn chain at its base with ...c5', 'Queen to b6 pressures d4 and b2', 'The c8-bishop needs a plan'],
    lines: [
      { name: 'Advance Variation', moves: 'e4 e6 d4 d5 e5 c5 {Hit the base of the chain.} c3 Nc6 Nf3 Qb6 {Pressure on d4 and b2.} a3 c4 Nbd2 Na5' },
      { name: 'Winawer', moves: 'e4 e6 d4 d5 Nc3 Bb4 {Pinning the knight.} e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 O-O' },
      { name: 'Exchange Variation', moves: 'e4 e6 d4 d5 exd5 exd5 {Symmetrical; Black develops freely.} Nf3 Nf6 Bd3 Bd6 O-O O-O' },
      { name: 'Tarrasch', moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4 f6 {Undermining the e5 pawn.}' },
    ],
  },
  {
    id: 'caro', name: 'Caro-Kann Defence', side: 'b', eco: 'B10–B19', level: [700, 2000],
    summary: 'Rock-solid: ...c6 and ...d5 with a healthy pawn structure and the light-squared bishop developed outside the chain.',
    ideas: ['...c6 supports ...d5', 'Bishop out to f5 or g4 before ...e6', 'Comfortable endgames'],
    lines: [
      { name: 'Classical', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 {Develop the bishop before ...e6.} Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6' },
      { name: 'Advance Variation', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 {Striking at d4.} Be3' },
      { name: 'Exchange Variation', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7' },
      { name: 'Two Knights', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 {Solid, with a light-squared grip.}' },
    ],
  },
  {
    id: 'scandi', name: 'Scandinavian Defence', side: 'b', eco: 'B01', level: [400, 1500],
    summary: 'Challenge e4 on move one. Simple to learn, with clear development plans.',
    ideas: ['Recapture on d5 with the queen', 'Queen to a5 or d6 for safety', 'Bf5, e6, c6 setup'],
    lines: [
      { name: 'Main line 3...Qa5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 {Pinning the c3 knight and staying active.} d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 c6' },
      { name: 'Modern 3...Qd6', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 {A flexible square for the queen.} d4 Nf6 Nf3 a6' },
      { name: 'Marshall 2...Nf6', moves: 'e4 d5 exd5 Nf6 {Regain the pawn with the knight.} d4 Nxd5 Nf3 g6' },
    ],
  },
  {
    id: 'kid', name: "King's Indian Defence", side: 'b', eco: 'E60–E99', level: [1400, 2500],
    summary: 'Let White build a big centre, then strike back with ...e5 or ...c5 and launch a kingside pawn storm.',
    ideas: ['Fianchetto and castle quickly', 'Break with ...e5', 'Kingside pawn storm with ...f5'],
    lines: [
      { name: 'Classical', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 {The thematic central break.} O-O Nc6 d5 Ne7 Ne1 Nd7 {Preparing ...f5.}' },
      { name: 'Sämisch', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 c6' },
      { name: 'Four Pawns Attack', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 c5 {Hit the over-extended centre.} d5 e6' },
    ],
  },
  {
    id: 'qgd-black', name: "Queen's Gambit Declined", side: 'b', eco: 'D30–D69', level: [900, 2200],
    summary: 'The classical answer to 1.d4: hold the d5 point with ...e6 and develop harmoniously.',
    ideas: ['Keep the d5 point', 'Free your game with ...c5 or ...dxc4 + ...e5', 'The c8-bishop is the problem piece'],
    lines: [
      { name: 'Tartakower', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 {The bishop goes to b7.}' },
      { name: 'Exchange Variation', moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 Nbd7' },
    ],
  },
  {
    id: 'english', name: 'English Opening', side: 'w', eco: 'A10–A39', level: [1000, 2300],
    summary: 'Start with 1.c4 and control d5 from the flank. Flexible, positional and often a Sicilian with an extra tempo.',
    ideas: ['c4 grips the d5 square', 'Fianchetto on g2 for long-diagonal pressure', 'Choose the centre later with d3, d4 or e4'],
    lines: [
      { name: 'Symmetrical Variation', moves: 'c4 c5 Nc3 Nc6 g3 {The bishop will rake the long diagonal.} g6 Bg2 Bg7 Nf3 Nf6 O-O O-O d3 {A quiet set-up; b4 or a3–Rb1–b4 comes later.} d6' },
      { name: 'Reversed Sicilian', moves: 'c4 e5 {Black plays a Sicilian a tempo down.} Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7 d3 O-O a3 {Preparing b4 to expand on the queenside.}' },
      { name: 'Botvinnik set-up vs ...g6', moves: 'c4 Nf6 Nc3 g6 g3 Bg7 Bg2 O-O e4 {The Botvinnik formation: c4 and e4 clamp d5.} d6 Nge2 {The knight stays flexible and keeps the f-pawn free.} e5 O-O c6 d3' },
    ],
  },
  {
    id: 'kings-gambit', name: "King's Gambit", side: 'w', eco: 'C30–C39', level: [800, 1800],
    summary: 'The romantic 2.f4: give a pawn to open the f-file and race for the attack. Sharp and great for learning initiative.',
    ideas: ['f4 deflects the e5 pawn', 'Rapid development and the open f-file', 'Win the f4 pawn back when it is safe'],
    lines: [
      { name: 'Kieseritzky Gambit', moves: 'e4 e5 f4 exf4 {Gambit accepted.} Nf3 g5 {Black holds the extra pawn.} h4 {Undermining the pawn chain at once.} g4 Ne5 Nf6 d4 d6 Nd3 Nxe4 Bxf4 {White has regained the pawn with good piece play.}' },
      { name: 'Modern Defence 3...d5', moves: 'e4 e5 f4 exf4 Nf3 d5 {Black returns the pawn to free their game.} exd5 Nf6 Bb5+ c6 dxc6 bxc6 Bc4 Nd5 {The knight eyes e3 and blocks the bishop.} O-O Bd6' },
      { name: 'Classical Declined', moves: 'e4 e5 f4 Bc5 {Declining: the bishop stops White castling short.} Nf3 d6 c3 {Preparing d4 to blunt the bishop.} Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 {White has a big pawn centre.}' },
    ],
  },
  {
    id: 'catalan', name: 'Catalan Opening', side: 'w', eco: 'E01–E09', level: [1400, 2500],
    summary: 'Queen\'s Gambit plus a fianchetto: the g2 bishop presses on the long diagonal for the whole game.',
    ideas: ['Bg2 targets b7 and the queenside', 'Often regain the c4 pawn with Qc2 or Qa4', 'Long-term pressure rather than quick attacks'],
    lines: [
      { name: 'Open Catalan', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 {Black grabs the pawn.} Nf3 Be7 O-O O-O Qc2 a6 Qxc4 {The pawn is back.} b5 Qc2 Bb7 Bd2 {Ready for Ba5 or Rc1 against the queenside.}' },
      { name: 'Closed Catalan', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 Nbd2 {Supporting e4.} b6 e4 {White takes more of the centre.}' },
      { name: 'Against ...Bb4+', moves: 'd4 Nf6 c4 e6 g3 Bb4+ {The Bogo-style check.} Bd2 Be7 {Black lets the d2-bishop look misplaced.} Bg2 d5 Nf3 O-O O-O c6 Qc2 Nbd7 Bf4' },
    ],
  },
  {
    id: 'nimzo', name: 'Nimzo-Indian Defence', side: 'b', eco: 'E20–E59', level: [1200, 2500],
    summary: 'Pin the c3-knight with ...Bb4 and fight for e4. A top-level defence that gives Black active, flexible play.',
    ideas: ['...Bb4 pins the defender of e4', 'Give the bishop for doubled c-pawns', 'Control e4 with ...b6, ...Bb7 and ...Ne4'],
    lines: [
      { name: 'Rubinstein 4.e3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 {Striking at the centre.} O-O Nc6 a3 Bxc3 bxc3 dxc4 Bxc4 Qc7 {Eyeing e5 and the c3 pawn.}' },
      { name: 'Classical 4.Qc2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 {Avoiding doubled pawns.} O-O a3 Bxc3+ Qxc3 b6 {Fianchetto to fight for e4.} Bg5 Bb7 f3 h6 Bh4 d5' },
      { name: 'Sämisch 4.a3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3+ bxc3 c5 {Fixing the doubled pawns.} e3 Nc6 Bd3 O-O Ne2 b6 e4 Ne8 {Avoiding the pin by Bg5 and preparing ...f5.}' },
    ],
  },
  {
    id: 'grunfeld', name: 'Grünfeld Defence', side: 'b', eco: 'D70–D99', level: [1500, 2600],
    summary: 'Let White build a big centre, then attack it with ...c5, ...Bg7 and piece pressure. Dynamic and very concrete.',
    ideas: ['...d5 invites e4 and an exchange on c3', 'The g7 bishop hits d4', '...c5 and ...Nc6 pile on the centre'],
    lines: [
      { name: 'Exchange Variation', moves: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 {The bishop aims at c3 and d4.} Nf3 c5 Rb1 O-O Be2 cxd4 cxd4 Qa5+ {Trading queens or grabbing a2.} Bd2 Qxa2 O-O {White has gambited a pawn for activity.}' },
      { name: 'Russian System', moves: 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Bg4 {Smyslov\'s plan: pressure on d4.} Be3 Nfd7 {Heading for b6 to hit the queen.}' },
      { name: '5.Bf4', moves: 'd4 Nf6 c4 g6 Nc3 d5 Bf4 Bg7 e3 O-O Rc1 c5 {A gambit in the spirit of the Grünfeld.} dxc5 Be6 {Quick development for the pawn.}' },
    ],
  },
  {
    id: 'dutch', name: 'Dutch Defence', side: 'b', eco: 'A80–A99', level: [1000, 2100],
    summary: 'Answer 1.d4 with 1...f5 to control e4 and aim for a kingside attack. Unbalanced and fighting.',
    ideas: ['...f5 controls e4', 'Kingside attack with ...Qe8–h5', 'Choose Leningrad (...g6) or Stonewall (...d5, ...e6)'],
    lines: [
      { name: 'Leningrad', moves: 'd4 f5 g3 Nf6 Bg2 g6 {The Leningrad: a King\'s Indian bishop with ...f5.} Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8 {Preparing ...e5 and ...Qh5.} d5 Na6' },
      { name: 'Stonewall', moves: 'd4 f5 g3 Nf6 Bg2 e6 Nf3 d5 {The Stonewall: pawns on c6, d5, e6 and f5.} O-O Bd6 c4 c6 b3 Qe7 {Stops Ba3 swapping the good bishop.}' },
      { name: 'Staunton Gambit', moves: 'd4 f5 e4 {White gambits at once.} fxe4 Nc3 Nf6 Bg5 Nc6 d5 Ne5 Qd4 Nf7 {The knight defends and kicks the bishop.}' },
    ],
  },
  {
    id: 'pirc', name: 'Pirc Defence', side: 'b', eco: 'B07–B09', level: [1000, 2200],
    summary: 'Let White take the centre, then strike back with ...c5 or ...e5 from a compact fianchetto set-up.',
    ideas: ['...d6, ...Nf6 and ...g6 first', 'Counter-attack the centre with ...c5 or ...e5', 'Queenside play with ...c6 and ...b5'],
    lines: [
      { name: 'Austrian Attack', moves: 'e4 d6 d4 Nf6 Nc3 g6 f4 {The most aggressive answer.} Bg7 Nf3 O-O Bd3 Na6 {Heading for c5 or b4.} O-O c5 d5' },
      { name: 'Classical', moves: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 {Stops ...b5.} Nbd7' },
      { name: '150 Attack', moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 c6 {Preparing ...b5 against White\'s queenside castling.} Qd2 b5 f3 Nbd7' },
    ],
  },
  {
    id: 'petroff', name: 'Petroff Defence', side: 'b', eco: 'C42–C43', level: [1000, 2400],
    summary: 'Counter-attack e4 with 2...Nf6. Solid, symmetrical and famously hard to beat.',
    ideas: ['Mirror the attack on e4', 'Never take on e4 before ...d6 kicks the knight', 'Easy development and a safe king'],
    lines: [
      { name: 'Classical 5.d4', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 {Kick the knight first: 3...Nxe4? 4.Qe2 is bad for Black.} Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4 Nb4 Be2 O-O Nc3 Bf5' },
      { name: '5.Nc3', moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Nc3 Nxc3 dxc3 {White castles long and attacks.} Be7 Be3 Nc6 Qd2 Be6 O-O-O Qd7' },
      { name: 'Steinitz 3.d4', moves: 'e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7 {Challenging the strong knight.} Nxd7 Bxd7 O-O Bd6' },
    ],
  },
  {
    id: 'accel-dragon', name: 'Accelerated Dragon', side: 'b', eco: 'B34–B39', level: [1100, 2200],
    summary: 'A Dragon without ...d6, so Black can often play ...d5 in one go and avoid the Yugoslav Attack.',
    ideas: ['...g6 before ...d6', 'Look for ...d5 in one move', 'Against the Maroczy bind, trade pieces and play ...Be6 / ...a6–b5'],
    lines: [
      { name: 'Classical 5.Nc3', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6 Bc4 O-O Bb3 d6 f3 Bd7 Qd2 Nxd4 Bxd4 b5 {Fast queenside counterplay.}' },
      { name: 'Maroczy Bind', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 {The bind: c4 and e4 stop ...d5.} Nf6 Nc3 d6 Be2 Nxd4 Qxd4 Bg7 Be3 O-O Qd2 Be6 {Targeting c4.}' },
      { name: '5.Nxc6', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 Nxc6 bxc6 Qd4 {Attacking the rook on h8.} Nf6 e5 Nd5' },
    ],
  },
  {
    id: 'traps', name: 'Opening Traps', side: 'mixed', eco: '—', level: [400, 1300],
    summary: 'Classic tricks every player should know, from both sides of the board.',
    ideas: ['Watch f7 and f2', 'Count attackers before grabbing pawns', 'Pinned pieces cannot really defend'],
    lines: [
      { name: "Legal's Mate", side: 'w', moves: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 {A careless move.} Nxe5 {The queen is "hanging" but it is a trap.} Bxd1 Bxf7+ Ke7 Nd5# {Checkmate with three minor pieces.}' },
      { name: 'Blackburne Shilling Gambit', side: 'b', moves: 'e4 e5 Nf3 Nc6 Bc4 Nd4 {A trappy move.} Nxe5 {Greedy.} Qg5 Nxf7 Qxg2 Rf1 Qxe4+ Be2 Nf3# {A smothered-style mate.}' },
      { name: 'Englund Gambit Trap', side: 'b', moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Bc3 Bb4 {Pinning the bishop.} Qd2 Bxc3 Qxc3 Qc1# {Checkmate on the back rank.}' },
      { name: 'Elephant Trap', side: 'b', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5 Nxd5 {The d5 pawn looks free...} Nxd5 Bxd8 Bb4+ {The point: a check wins back the queen.} Qd2 Bxd2+ Kxd2 Kxd8 {Black is a piece up.}' },
      { name: 'Stopping Scholar\'s Mate', side: 'b', moves: 'e4 e5 Bc4 Nc6 Qh5 {Threatening Qxf7#.} g6 {Block the queen.} Qf3 Nf6 {Defend f7 and develop.}' },
      { name: 'Lasker Trap', side: 'b', moves: 'd4 d5 c4 e5 dxe5 d4 e3 {A natural mistake.} Bb4+ Bd2 dxe3 Bxb4 exf2+ Ke2 fxg1=N+ {Under-promotion with check!}' },
    ],
  },
];

export function parseLine(str) {
  const out = [];
  const re = /\{([^}]*)\}|(\S+)/g;
  let m;
  while ((m = re.exec(str))) {
    if (m[1] !== undefined) { if (out.length) out[out.length - 1].note = m[1].trim(); }
    else out.push({ san: m[2] });
  }
  return out;
}
