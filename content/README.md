# content/ — authored episodes

Each `episodes/<slug>.json` is one episode in the book-message-expert `Episode` contract
(title, author, domain, message, summaryMd, script, takeaways, caveat…) plus an optional
`performedScript`: the script rewritten for the ear, with sparse `eleven_v3` expression tags
(`[warm]`, `[pause]`, `[thoughtful]`, `[softly]`, `[curious]`, `[serious]`).

The file name is the slug and the stable key: re-running ingest updates the authored fields
of an existing episode and keeps the listener's state (favorite, notes, ticks, progress).

```bash
npm run voices                 # rank the account's voices + render 20s Hebrew samples to data/previews/samples/
npm run set-voice -- <voiceId> # choose the narrator
npm run ingest                 # validate + upsert every episode into the library
npm run ingest -- --produce    # …and narrate the ones whose audio is missing or stale
```

Rules for the text (from the skills): own words only, at most one quote of up to 12 words,
opinions marked ("להערכתי"), a "מצב הידע היום" line for health/money claims, no unmarked
spoilers for fiction, numbers may stay as digits (the preprocessor spells them out).
