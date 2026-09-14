# Podcast format (`content/dialogues/<slug>.json`)

The conversation version of an episode. A fixed interviewer ("host") talks to a guest who
has read the book. `scripts/produce-dialogue.ts` renders it with the ElevenLabs
text-to-dialogue endpoint, so both voices are recorded in one pass and react to each other.

## The file

```json
{
  "note": "one line saying this is a podcast episode and that the accuracy rules match the narrated one",
  "turns": [
    { "speaker": "host", "text": "…" },
    { "speaker": "guest", "text": "…" }
  ]
}
```

`speaker` is `"host"` or `"guest"` and nothing else. Turns strictly alternate; two turns by
the same speaker in a row read as a glitch.

## Size

- **55 to 65 turns**, **3,700 to 4,000 characters** of `text` in total. That renders as
  roughly six minutes, which clears the five-minute floor with room to spare.
- Most turns are one to three sentences. The host's turns are usually shorter than the
  guest's: a question, a challenge, a nudge.
- No single turn over about 330 characters. Long turns come back flat, and the provider is
  likelier to drop them.

Character budget is the constraint that matters: the whole library is produced against a
monthly ElevenLabs quota, so a script that runs long costs a book somewhere else.

## The two people

**Host** — the same interviewer in every episode. Curious, warm, unafraid to push back. He
has not read the book; he asks what a smart listener would ask. He is allowed to disagree,
to say a claim sounds overstated, and to ask for evidence. He never lectures.

**Guest** — has read the book closely and likes it, but is not its publicist. She concedes
the weak parts without being asked, marks her own opinions, and distinguishes what the
author demonstrates from what the author asserts.

The disagreement has to be real. A guest who agrees with every challenge is worse than no
podcast: it reads as an advertisement. At least twice per episode the host should press a
point the guest cannot fully answer, and she should say so.

## Shape

1. Open with the host naming the podcast, the book, the author and the year.
2. Establish why this book, and who wrote it, in a few exchanges.
3. Work through four to six real ideas, each with the author's own example.
4. A section of genuine pushback: what is contested, what failed to replicate, what the
   author overstates.
5. Who it is for and who it is not for.
6. One small thing to try this week, then the line that stays. The host signs off with the
   title, the author and a thank-you.

## Expression tags

`eleven_v3` reads bracketed tags. Use them sparingly, on maybe a fifth of the turns:
`[warm]`, `[curious]`, `[thoughtful]`, `[serious]`, `[softly]`, `[laughs]`, `[pause]`.
Never stack two tags on one turn. A tag at the head of the turn only.

## Hebrew for the ear

Modern spoken Hebrew, not written Hebrew read aloud. Numbers and years spelled out in
words (`אלפיים וארבע עשרה`, not `2014`), because the model mispronounces digits. No
abbreviations, no parentheses, no bullet characters. Foreign names transliterated into
Hebrew. Short sentences. Full stops where a speaker would breathe.

## Accuracy

The same rules as the narrated episode, and they are not negotiable:

- Everything in our own words. At most one quotation of up to twelve words per episode, and
  only if the wording is certain.
- Invent nothing: no studies, numbers, dates, chapter details or anecdotes that are not in
  the book. An example the author used in a talk is not an example from the book.
- Mark opinions as opinions (`להערכתי`, `לדעתי`, `אני חושבת ש`).
- Contested science is presented as contested, including failed replications.
- Fiction: no spoilers, and say in the episode that the ending is being withheld.
- Health, money and psychology: say plainly that this is a book summary and not advice.
- Substances: no dose, no source, no method, no encouragement; keep the note that some are
  illegal in Israel and that the risks are real.

**Verify before producing.** Every claim is checked against outside sources before the audio
is rendered. Fixing a line afterwards means paying to re-record the whole episode.

## Producing

```bash
npm run dialogue -- <slug>
npm run dialogue -- <slug> --force
npm run dialogue -- --all                  # every script with no current audio
npm run dialogue -- --all --reserve 20000  # keep more of the quota back
```

Writes `site/audio/<slug>.dialogue.mp3` and `content/dialogues/<slug>.meta.json`. The meta
file carries a hash of the turns and the voices, so an unchanged script is skipped.

Before each episode the script checks the account's remaining quota and refuses to start one
it cannot finish, holding a reserve back. Episodes it declined are listed at the end and the
run exits non-zero, so the rest can be produced after the quota renews.
