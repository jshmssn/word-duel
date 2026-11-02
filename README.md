# Word Duel — Arena UI v2

A real-time multiplayer lobby with **Word Duel**, **Color Card**, and **Finish the Word**, a responsive React/Vite interface, and a Node/Socket.IO game server. All modes support room limits of 2–8 players. Word Duel retains its deduction rules, bot practice, timed turns, category roulette, chat, and series play. The existing Word Chain backend is preserved.

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

1. Choose a game mode and max players (2–8), create a private room, and share its 8-character code. Joining players inherit the host's mode and room limit. Bot practice remains a two-player Word Duel match.
2. For Word Duel and Color Card, all joined players press **Ready**; at least two players are needed. The room starts after the existing countdown, without needing to fill every available seat. Word Duel hosts can select an unlimited, 30-, 45-, or 60-second turn timer and a single-round, best-of-3, or best-of-5 match.
3. Each player receives a secret word from the same category. Don't reveal yours!
4. On your turn, ask whether a letter is present, ask **how many** of an already confirmed letter appear, or guess the whole opponent's word. Each player investigates the next player in lobby order, and turns rotate through everyone. Two-player matches work as before.
5. Confirmed letters are **unordered clues**, not revealed letter positions. Drag or tap tiles in the private letter workbench to hypothesize an order. That never modifies the actual word; guesses are evaluated server-side.
6. The first correct full-word guess wins the round; track your record in the results screen.

### Finish the Word

Choose **Finish the Word** in the game hub. In the character lobby, every player picks one of eight exclusive SVG characters and readies up, then the shared five-second countdown starts the match automatically with a randomly chosen first player. Changing characters clears readiness. Each player has three hearts and fifteen seconds per turn to submit a dictionary word of at least two letters. Words start with the previous word's final letter and cannot repeat. After ten accepted words, follow the final two letters. Invalid words clear the input and live bubble, shake the input, and play a wrong sound (when sound is enabled). Players can retry within the original time limit. Only a timeout costs one heart and passes the turn; the final survivor wins. If every remaining player times out without an accepted word, the server chooses a different dictionary-backed prefix, preserving hard mode and used words. Mobile notifications appear at the bottom so the timer and starting letters remain visible. The arena focuses on the active character and broadcasts their live typing in a speech bubble.

The server uses `better-sqlite3` and seeds an indexed single-column `words` table from the bundled `word-duel-server/clean-words.txt` at startup. The supplied list contains **89,239 words**. See [the complete setup and implementation guide](../word-duel-server/FINISH_WORD_SETUP.md) for the importer CLI, file map, socket protocol, and configuration. Matches support the existing session restoration, paused countdowns, and majority kick votes after 45 seconds.

### Color Card

The host chooses **1–100 cards** (default **5**) and **30 seconds, 45 seconds, or 1 minute** to answer each card. Both settings are available when creating the room and in the waiting-room settings. The server generates **unique random six-digit HEX targets**, with no repeated color within a match. Everyone plays the same card, sees the same color values, and shares the same deadlines. Future targets stay on the server until their preview begins. Each color appears for **5 seconds**, with a countdown overlay in the card's top-right corner, then disappears and is replaced by a **blank white card**.

The three-column panel provides **hue**, **saturation**, and **brightness/value** controls, with a live preview. Press the arrow to submit early, or **Edit answer** to revise it. **Everyone, including the host, keeps the entire answer window**, even after all players have submitted. The server saves selections as they change and finalizes everyone's latest color at the shared deadline. Answers still being edited are **auto-submitted**; an untouched card submits white.

After the deadline, each player has **5 seconds to review their own result**: selected color versus original, accuracy in the top-right, and feedback ranging from absurd roasts to high praise. The server then reveals **card rankings to everyone for 10 seconds** before starting the next card automatically. There is no host advance button. The final card leads to final rankings instead of another card. Disconnecting pauses the match and its timers while the player reconnects. A majority of active players can vote to remove them after 45 seconds.

RGB Euclidean distance determines each card's closest match; equal distances share the win. Accuracy is `100 × (1 − distance / sqrt(3 × 255²))`. Standings track average accuracy across completed cards. After the configured card count, the highest average accuracy wins the match and **Play again** returns everyone to the lobby.

### Lobby and Color Card socket events

| Event | Direction | Payload / behavior |
| --- | --- | --- |
| `CREATE_ROOM` | Client → server | `{ username, gameMode: "word-duel" \| "color-card" \| "finish-word", maxPlayers: 2..8, colorDuration?: 30 \| 45 \| 60, colorCardCount?: 1..100 }`. Replies with `room-created`; optional acknowledgement returns `{ success, ...room }`. |
| `JOIN_ROOM` | Client → server | `{ code, username }`. Server enforces capacity and waiting state, then emits `room-joined` and `player-joined`. |
| `START_GAME` | Client → server | `{ code }`, host only, all joined players ready. The normal ready countdown also starts the selected mode automatically. |
| `START_GAME` | Server → client | Color Card: `{ code, gameMode, matchId, roundNumber, totalRounds, roundId, targetColor, phase: "memorizing", serverNow, memorizeEndsAt, memorizeDuration, roundEndsAt, roundDuration, players, submittedPlayerIds }`. Emitted automatically for every card. |
| `COLOR_PICKING_STARTED` | Server → room | `{ code, roundId, phase: "picking", roundEndsAt, serverNow }`. Removes the target; the local preview deadline also hides it if this event is delayed. Server timestamps account for different device clocks. |
| `SET_COLOR_DURATION` | Host → server | `{ code, duration: 30 \| 45 \| 60 }`, waiting rooms only. Broadcasts `COLOR_DURATION_UPDATED` with `{ code, colorDuration }`. |
| `SET_COLOR_CARD_COUNT` | Host → server | `{ code, count: 1..100 }`, waiting rooms only. Broadcasts `COLOR_CARD_COUNT_UPDATED` with `{ code, colorCardCount }`. |
| `UPDATE_COLOR_DRAFT` | Client → server | `{ code, roundId, hex }`. Saves the latest picker value for automatic submission at the deadline. |
| `SUBMIT_COLOR` | Client → server | `{ code, roundId, hex }`, acknowledged with `{ success, hex }` or `{ success: false, message }`. Revisions are allowed while active. Early, invalid, stale, late, and non-member requests are rejected. |
| `EDIT_COLOR` | Client → server | `{ code, roundId }`. Reopens a submitted answer and marks it pending while the player edits. |
| `SUBMISSION_UPDATE` | Server → room | `{ code, roundId, submittedPlayerIds }`; guesses stay private until results. |
| `ROUND_RESULTS` | Server → each player | Personal result, `phase: "review"`, `reviewEndsAt`, and `serverNow`. Only that player's entry is included. Entries contain `submittedColor`, `distance`, `accuracy`, and `autoSubmitted`. |
| `COLOR_RANKINGS` | Server → room | All card results plus `{ matchId, roundNumber, totalRounds, matchComplete, standings, matchWinnerIds, phase: "ranking", rankingEndsAt, serverNow }`. Sent after the review; the next card starts automatically 10 seconds later, except after the final card. |

Existing lowercase `create-room` / `join-room` events remain available. Word Duel retains its existing gameplay events (`game-start`, `ask-letter`, `guess-word`, etc.); its start payload also identifies the assigned `opponentId`. Game modes dispatch through a server registry, and the React view switcher mounts separate Word Duel and Color Card components.

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
  src/components/ColorCard.jsx  live split card, color picker, results
  src/components/ColorCard.css  responsive Color Card styling
  src/logic/letterWorkbench.js pure clue reconciliation
  src/logic/colorCard.js        HSV/HEX conversion, contrast, score feedback
  src/audio.js                 opt-in Web Audio SFX
  src/index.css                legacy base styles
  src/redesign.css             arena UI visual system and responsive styles
  test/letterWorkbench.test.js client logic tests
word-duel-server/              Express + Socket.IO server
  index.js                     word duel room/game handlers
  src/config/gameModes.js      supported modes and room option validation
  src/services/ColorCardGame.js pure round rules and RGB scoring
  src/socket/ColorCardSocket.js Color Card timers and socket submissions
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

Responsive browser checks cover the lobby, host/guest waiting rooms, countdown,
category roulette, game controls, letter prompts, winning/losing results, and chat.
They run in Chromium and WebKit at thirteen phone, landscape, tablet, and desktop sizes,
including chat rotation, simulated keyboard resizing, and overlapping dialogs:

```bash
npx playwright install chromium webkit
npm run test:mobile
```

Browser checks simulate Socket.IO events and do not require a live server. They cover host settings, the countdown overlay, target hiding, blank card, three-column HSV controls, editable answers, personal review, automatic rankings/advancement, feedback, and rematches. Server tests verify unique HEX generation, configurable card counts, the full phase sequence, cancellation cleanup, and final match scoring with a deterministic clock. Real Socket.IO tests exercise a complete timed card through review, ranking, and automatic advancement, and check two- and eight-player Word Duel rounds. Allow about 80 seconds for `npm test` in the server directory.

The build output appears in `word-duel/dist/`. The Socket.IO server must be deployed separately, with the Vite environment variable pointing to it.

## Notes

- **Word Duel** retains its gameplay with the additions needed for 2–8 participants. Existing Word Chain backend tests and dictionary assets remain intact.
- No external audio files or extra runtime packages were introduced. Google Fonts are optional; system fonts are the fallback.
- Animations target smooth rendering by preferring transform/opacity and Web Animations, but real frame rates depend on device performance.
