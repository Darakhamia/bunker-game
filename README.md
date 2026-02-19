# ☢️ Bunker Online

An online real-time multiplayer version of the social deduction board game **Bunker**.
Players compete for limited spots in a post-apocalyptic bunker by revealing hidden character traits one by one.

## Tech Stack

| Layer     | Technology                                |
|-----------|-------------------------------------------|
| Frontend  | Next.js 14 (App Router) + TypeScript      |
| Backend   | Node.js custom server + Socket.IO 4       |
| State     | In-memory (server-authoritative, no DB)   |
| Styling   | Tailwind CSS                              |
| Data      | `/data/decks.json` (8 categories, 18 cards each) |

---

## Quick Start

```bash
# Install dependencies
npm install

# Development (hot-reload on server + Next.js HMR)
npm run dev

# Production build + start
npm run build
npm start
```

The app runs on **http://localhost:3000** by default.
Set `PORT` or `HOSTNAME` environment variables to override.

---

## Project Structure

```
/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root HTML layout
│   ├── page.tsx                # / — Create or Join lobby
│   ├── homeHelpers.ts          # Shared category constants
│   ├── lobby/[roomCode]/
│   │   └── page.tsx            # /lobby/:code — Waiting room
│   └── game/[roomCode]/
│       └── page.tsx            # /game/:code  — Game screen
│
├── components/                 # Reusable client components
│   ├── AttributeCard.tsx       # Revealed / hidden attribute tiles
│   ├── PlayerBoard.tsx         # Per-player card grid
│   ├── OwnCharacterPanel.tsx   # Private full-character view
│   └── Toast.tsx               # Error / info notifications
│
├── server/                     # Node.js backend
│   ├── index.ts                # Custom HTTP server (Next.js + Socket.IO)
│   ├── socket.ts               # All Socket.IO event handlers
│   ├── gameManager.ts          # Pure game-state logic (no I/O)
│   └── types.ts                # Shared TypeScript interfaces
│
├── lib/                        # Client-side utilities
│   ├── socket.ts               # Singleton socket.io-client
│   └── storage.ts              # localStorage session helpers
│
└── data/
    └── decks.json              # 8 categories × 18 cards each
```

---

## How to Play

1. **Host** opens the app, enters a nickname, configures max players and enabled card categories, then clicks **Create Room**.
2. A 6-character room code is generated. Share it with friends.
3. **Players** click **Join Room**, enter the code and a nickname.
4. Host clicks **Start Game** once everyone is ready.
5. Each player receives their full character **privately** (other players cannot see it).
6. Host clicks **Reveal Next** to expose one attribute category for all players simultaneously.
7. Players discuss who deserves a spot in the bunker based on revealed traits.
8. When all attributes are revealed, the game enters **Voting Phase** — players vote on who to eliminate.

---

## Security / Anti-Cheat

- **Private character data is never broadcast to other players.**
  The server sends each player's character directly to their own socket connection only.
- The `PublicGameState` type exposes only `revealedCharacter` (a subset of the full character).
- All game phase transitions and reveal actions are **server-authoritative**.

---

## Reconnect / Disconnect Handling

- Player's `roomCode` + `nickname` are stored in `localStorage` on successful join.
- On page refresh, the client attempts a `reconnect:attempt` event.
- The server matches by nickname, updates the socket ID, and re-sends the player's private character.
- If the **host** disconnects, host status transfers to the next connected player automatically.
- Disconnected players are marked with a grey indicator; they can rejoin at any time.

---

## Extending the Game

| Feature            | Where to add                                       |
|--------------------|----------------------------------------------------|
| Voting mechanics   | `server/gameManager.ts` → add `castVote()`         |
| Persistent state   | Replace `Map<string, GameState>` with a DB adapter |
| Auth / accounts    | Add JWT middleware in `server/index.ts`            |
| Custom reveal order| Expose `revealOrder` in lobby settings             |
| New card categories | Add a new deck in `data/decks.json`               |

---

## Environment Variables

| Variable   | Default     | Description             |
|------------|-------------|-------------------------|
| `PORT`     | `3000`      | Server port             |
| `HOSTNAME` | `localhost` | Bind address            |
| `NODE_ENV` | —           | Set to `production` for production mode |
