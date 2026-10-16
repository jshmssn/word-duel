# Word Duel — Arena UI v2

A real-time multiplayer **word deduction game** with a refreshed, responsive React/Vite interface and a Node/Socket.IO game server. Includes 1v1 rooms, bot practice, timed turns, category roulette, chat, series play, and the existing Word Chain backend.

## Quick start

Requirements: **Node.js 22.5+** and npm. Use two separate terminals from the extracted project folder.

**Terminal 1 — game server**

```bash
cd word-duel-server
npm ci
npm start
```

**Terminal 2 — web client**

```bash
cd word-duel
npm ci
npm run dev
```

Visit `http://localhost:5173` in your browser. The server listens on port `3001` by default. Open another tab/browser, enter a name, and join the room using its **8-character code**, or choose **Practice vs bot**.

When deploying, specify the Socket.IO endpoint using an environment variable in `word-duel/.env`:

```dotenv
VITE_SERVER_URL=https://your-hosted-game-server.example
```

Restart the Vite dev server or rebuild the client after changing an environment variable.

## How to play

1. Create a private room and share its 8-character code, join an existing room, or practice with a bot.
2. The host can select an unlimited, 30-, 45-, or 60-second turn timer and choose a single-round, best-of-3, or best-of-5 match. Both players press **Ready**.
3. Each player receives a secret word from the same category. Don't reveal yours!
4. On your turn, ask whether a letter is present, ask **how many** of an already confirmed letter appear, or guess the whole opponent's word.
5. Confirmed letters are **unordered clues**, not revealed letter positions. Drag or tap tiles in the private letter workbench to hypothesize an order. That never modifies the actual word; guesses are evaluated server-side.
6. The first correct full-word guess wins the round; track your record in the results screen.

## Design & UX enhancements

- Unified dark arena visual system using Space Grotesk, DM Sans, JetBrains Mono, gradients, colored feedback, and responsive card layouts.
- Consistent header with live connection status, in-app instructions, and **opt-in persistent audio toggle**. Audio is OFF by default.
- Gamified room setup, player ready progress, letter discovery progress, scorecards, animated secret-word reveal, result confetti, and temporary reward popups.
- Accessible hover/focus states, keyboard/tap/drag tile rearrangement, semantic progressbars, and reduced-motion support.
- View entrance animations, efficient transform-driven motion, compositor-driven roulette spin, and reduced React update frequency during roulette.
- The room join flow now waits for the server acknowledgement so invalid/full-room codes display an error without losing the lobby.

## Project layout

```text
word-duel/                     React client
  src/App.jsx                  screen routing, Socket.IO, gameplay UI
  src/SlotMachine.jsx          animation-based category roulette
  src/components/Experience.jsx shared shell, modal, progress, confetti
  src/components/LetterWorkbench.jsx interactive clue arranging
  src/logic/letterWorkbench.js pure clue reconciliation
  src/audio.js                 opt-in Web Audio SFX
  src/index.css                legacy base styles
  src/redesign.css             arena UI visual system and responsive styles
  test/letterWorkbench.test.js client logic tests
word-duel-server/              Express + Socket.IO server
  index.js                     word duel room/game handlers
  src/                         existing Word Chain service and persistence
  test/                        server tests
  data/                        supplied Word Chain dictionary/database data
```

## Tests

```bash
cd word-duel && npm test
cd ../word-duel-server && npm test
```

To build a production client after dependencies are installed:

```bash
cd word-duel
npm run build
```

The build output appears in `word-duel/dist/`. The Socket.IO server must be deployed separately, with the Vite environment variable pointing to it.

## Notes

- **Word Duel** and the backend's additional **Word Chain** implementation are preserved. The UI refresh targets the Word Duel client; existing Word Chain backend tests and dictionary assets remain intact.
- No external audio files or extra runtime packages were introduced. Google Fonts are optional; system fonts are the fallback.
- Animations target smooth rendering by preferring transform/opacity and Web Animations, but real frame rates depend on device performance.
