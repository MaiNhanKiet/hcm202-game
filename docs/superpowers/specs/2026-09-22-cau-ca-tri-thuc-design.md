# Câu Cá Tri Thức — Design Spec

Date: 2026-09-22  
Status: draft for review  
Repo: Next.js app (`hcm202-game`), currently a default create-next-app shell plus `question.json`

## 1. Purpose

A single-player web game for an HCM202 in-class presentation. The presenter plays on one machine and projector while the class reviews course content.

Players pick a character, then complete four fishing rounds. Each round’s questions come from `question.json`. Catching a fish submits that option as an answer. Completing all four rounds wins and reveals four code fragments (“mảnh mã”).

Success looks like: a classmate who has not seen the repo can follow the loop (cast → hook → bite → explanation) without a tutorial, finish a full run in about 20 minutes, and hear every explanation.

## 2. Constraints (agreed)

- Classroom review during a live talk, not a homework portal.
- Full run: 4 rounds × 5 questions + explanation overlay. Ignore `questionsPerPlay` in JSON (value is 3; the agreed play is all 5).
- Lives: start at 3. Wrong catch costs 1 life. At 0 lives the current round fails and can be replayed. Earlier fragments stay.
- Characters: cosmetic plus one light ability, usable once per run.
- Approach: quiz loop from `question.json` (Approach A) plus a real fishing scene (cast, line, hook, fish AI). No real water-physics simulation.
- No backend, no login, no leaderboard, no cloud save. Refresh resets to the title screen.

## 3. Out of scope

- Multiplayer or class-wide controllers
- Persistence across refresh
- Box2D / fluid sim / 3D
- Editing or randomizing question text at runtime
- Sound design beyond optional later polish (not required for demo)

## 4. Content source

`question.json` is the only content source. The app loads it at build or startup and does not mutate it.

Required shape (already present):

- `game.title`, `game.subtitle`, `game.totalRounds`
- `rounds[]`: `id`, `order`, `title`, `subtitle`, `reward`, `questions[]`
- Each question: `id`, `type` (`single` | `multiple`), `difficulty`, `question`, `instruction`, `options[]` (`id`, `text`), `correctAnswerIds[]`, `explanation`

Rules:

- Play every question in each round, in file order.
- `game.totalRounds` must equal `rounds.length` (4).
- `correctAnswerIds` must be a subset of that question’s option ids. If not, treat the question as invalid data (see Errors).

## 5. Screens and flow

```
title → character-select → round-intro → fishing ⇄ explain
                              ↑              ↓
                              └── round-fail ←┘
                              ↓
                         round-clear → next round-intro
                              ↓ (after round 4)
                             win
```

1. **Title** — *Câu Cá Tri Thức / Giải mã quyền lực*, start.
2. **Character select** — pick one of three; ability locks for the run.
3. **Round intro** — round title, subtitle, lives, fragments already earned.
4. **Fishing** — one question; options spawn as fish.
5. **Explain** — after a question is resolved correctly; show `explanation`, then next question.
6. **Round fail** — 0 lives; “Thử lại vòng này” restarts that round at question 1 with 3 lives.
7. **Round clear** — grant that round’s `reward`.
8. **Win** — all four fragments; end of the demo.

One player, one screen. No host/player split.

## 6. Architecture

Two layers. The fishing loop must not drive React re-renders every frame.

### 6.1 Game session (React)

Owns the run: current screen, character, ability use, round/question index, lives, caught-correct ids for `multiple`, unlocked rewards, and the last catch waiting to be scored.

Reads `question.json`. Decides correct/wrong, life loss, overlays, and round/win transitions.

### 6.2 Fishing scene (render loop)

Owns visual/sim state: rod, aim angle, charge, projectile, hook/bobber, line, waterline, fish array, ripples/bubbles.

Runs at about 60fps (canvas or equivalent `requestAnimationFrame`). Emits events only:

- `cast-landed` — hook hit water (for splash)
- `fish-bite(optionId)` — a fish entered hook range and bit
- `reeled-in` — line fully reeled, ready to recast

Session handles scoring. Scene never reads `correctAnswerIds` to change hitch chance in a hidden way except the agreed “correct fish are slightly hungrier” tuning (wider detect / faster approach). That tuning uses a flag session passes in when spawning (`isCorrect`), not live answer-key lookups inside the loop.

## 7. Mapping questions to fish

On each fishing screen:

- Spawn one fish per option.
- Fish carry `optionId` and the option text (for HUD after bite).
- Do not paint the full answer on the swimming body in a way that clutters the pond. Show the question and instruction on a HUD. After a bite (or on a secondary HUD list), show which option was caught so the projector can read it.

`single`: first hooked fish is scored immediately.

`multiple`: player must hook every id in `correctAnswerIds`. Correct catches stay on a HUD counter (`2/3`). A wrong catch costs a life and does **not** reset already-correct catches. When the set is complete, show explanation and advance.

## 8. Fishing simulation

Demo-grade 2D. Axis: `x` left→right, `y` down. Constant `waterY`. Air/shore above; water and fish below.

### 8.1 Rod and cast

- Pointer aims **cast angle**. Hold charges **power** (0–1). Release casts.
- Hook follows a simple ballistic arc. Flight ends at `waterY` or at **max cast distance**.
- Rod **bends** with charge and while reeling.
- **Line** is a polyline or quadratic from rod tip to hook/bobber, updated every frame.
- Only one hook at a time. Recast after full reel or after a bite is processed.

### 8.2 Hook, bobber, depth

- On water hit: ripple + a few bubbles. Bobber stays near `waterY`. Hook **sinks over time**.
- Player can **reel up** or **drop deeper** (vertical drag or arrow keys). Hook cannot go above water except when fully reeled out.
- **Catch radius**: circle around the hook.
- Light **current** slowly shifts hook `x`, clamped to pond bounds.
- On bite: bobber **shakes** and may dip one beat + ripple. **Bite = catch** (no strike QTE) so the talk does not stall.

### 8.3 Water

- Light sine waves on the surface.
- Fish exist only at `y > waterY`.
- No heavy water particles or fluid shaders.

### 8.4 Fish

Each fish has:

| Field | Meaning |
|---|---|
| `x`, `y` | Position; `y` below waterline |
| `speed` | Swim speed |
| `heading` | Direction; turns at edges or when changing mind |
| `depth` | Preferred depth |
| `detectRadius` | Bait notice range |
| `state` | `swim` → `notice` → `bite` → `hooked` or `flee` |

- `swim` — patrol.
- `notice` — bait inside `detectRadius` and near preferred depth; swim toward hook.
- `bite` — inside hook radius; emit `fish-bite`.
- `hooked` — caught; session scores `optionId`.
- `flee` — wrong fish after a miss, or leftover fish when the question ends.

Correct fish are slightly hungrier (larger detect and/or faster approach) so 20 questions fit ~20 minutes.

### 8.5 Controls

- Pointer: aim + hold to charge, release to cast
- Vertical drag or ↑↓: hook depth
- R or on-screen button: reel fully to recast

## 9. Characters, lives, scoring

### 9.1 Characters

Chosen once, cannot change mid-run. Same fishing rules; one ability, **once per run**:

| Id | Display name | Ability |
|---|---|---|
| `observer` | Người quan sát | Hint: mark one definitely-wrong fish (fade or despawn) |
| `persistent` | Người kiên trì | +1 life immediately (cap 4) |
| `careful` | Người sâu sát | Re-read the last wrong question’s explanation without losing another life |

Second use is disabled. Names may change in UI; ids and effects stay.

### 9.2 Lives

- Start at 3. HUD shows lives, current round, earned fragments.
- Wrong fish: −1 life. Question stays open; that fish `flee`s; player recasts.
- 0 lives: `round-fail`. Retry resets that round to question 1 and 3 lives. Previous rounds’ fragments remain. Ability stays consumed if already used.

### 9.3 Round and win

- Five questions cleared → grant `reward`, `round-clear`.
- Four rewards → `win`.

## 10. Session state

Held in memory only:

- `screen`: `title` | `character` | `round-intro` | `fishing` | `explain` | `round-fail` | `round-clear` | `win`
- `characterId`, `abilityUsed`
- `roundIndex`, `questionIndex`
- `lives` (0–4)
- `caughtCorrectIds` (current `multiple` question)
- `unlockedRewards[]`
- `pendingCatch` (option id from the last bite, until scored)

Fishing-scene state stays inside the render loop (rod, hook, fish, water), not in React state per frame.

## 11. Errors and edges

- Invalid question (missing options, `correctAnswerIds` not in options): do not spawn that question; show a short “Lỗi dữ liệu” state. In production play, skip the bad question and continue the round if any valid questions remain; if the round has zero valid questions, block start of that round.
- Refresh / closed tab: lose the run; back to title.
- Hidden tab: pause the render loop; do not drain lives.
- Hook or rod leaving the pond: clamp to bounds.
- Ability already used: control disabled, no effect.

## 12. Testing

**Unit (pure session logic, no canvas):**

- `single` correct advances; `single` wrong decrements life
- `multiple` accumulates correct ids; wrong does not clear them
- 0 lives → round fail; retry restores 3 lives and question 0 of that round
- Four round clears → win
- Each ability fires once and then no-ops

**Manual (browser, projector-sized window):**

- Full round of 5 questions with explanations
- Cast: angle, power, line, rod bend, max distance
- Hook sink, reel, drop, current drift
- Fish states `swim` / `notice` / `bite`
- Correct and wrong bites; overlay; fail-and-retry; win

No water-physics tests.

## 13. Tech notes (implementation guidance, not extra scope)

- Next.js App Router already in repo; game is client-side.
- Session: React state or a small store. Scene: canvas (or equivalent) + `requestAnimationFrame`.
- Types for JSON live next to a loader; validate once at load.

## 14. Decisions already locked

- Hybrid A + arcade fishing, not slideshow-quiz and not physics-heavy water.
- Bite automatically catches; no timing minigame after the nibble.
- All 5 questions per round.
- 3 lives, retry current round only.
- Three characters, one-shot abilities as in §9.1.
- No save game.
