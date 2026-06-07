# Word Duel 🎯

A real-time 1v1 word guessing game. Ask for letters, collect clues, guess the secret word!

## How to Play

1. **Create a Room** — share the 5-letter room code with your opponent
2. **Both players get a secret word** from the same category (5–10 letters)
3. **Take turns** — on your turn, choose one action:
   - **Ask a Letter** → "Does your word have 'O'?" → Yes/No
   - **Guess the Word** → Type your guess
4. **Confirmed letters** pile up as clues (you know they exist, not where)
5. **First to correctly guess** their opponent's word wins!

## Rules
- One action per turn (ask OR guess)
- Turn always passes after your action (even on a YES answer)
- Wrong guess = turn passes, game continues
- Wrong guess does NOT eliminate you

## Setup

### Server
```bash
cd server
npm install
npm start
# Runs on port 3001
```

### Client
```bash
cd client
npm install
npm run dev
# Runs on port 5173
```

Open two browser windows/tabs, create a room in one, join with the code in the other.

## Tech Stack
- **Frontend**: React + Vite
- **Backend**: Node.js + Express + Socket.IO
- **Word Bank**: JSON (8 categories, words 5–10 letters)

## Categories
- Traditional Games (Filipino)
- Countries
- Animals
- Food (Filipino dishes)
- Sports
- Fruits
- Occupations
- Nature

## Adding More Words
Edit `server/words.json` — just add words to any category array.
Words are auto-filtered to 5–10 letters (non-letter characters like spaces/hyphens are excluded from count).

## Project Structure
```
word-duel/
├── server/
│   ├── index.js       ← Socket.IO game server
│   ├── words.json     ← Word bank
│   └── package.json
└── client/
    ├── src/
    │   ├── App.jsx    ← All screens + game logic
    │   └── index.css  ← Dark arcade aesthetic
    ├── index.html
    └── package.json
```
