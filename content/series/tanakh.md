# סדרת התנ"ך — Tanakh series rules

A special series inside Pagecast: one episode per book of the Hebrew Bible, twenty-four
books in the traditional Jewish count, in canonical order. Every book gets the same two
formats as the rest of the library: a narrated episode (`content/episodes/tanakh-<id>.json`)
and a podcast (`content/dialogues/tanakh-<id>.json`). The order and the three parts live in
`content/series/tanakh.json`.

These rules extend, and never relax, the library rules in
`.claude/skills/book-message-expert/references/accuracy-and-copyright.md` and the podcast
format in `content/dialogues/_FORMAT.md`. Where they differ, the Tanakh rule below wins.

## Who the episodes are for

An Israeli adult who last opened a Tanakh in school, secular or traditional or religious.
Nobody should feel the episode is talking down to them, recruiting them, or mocking them.

**Accessible Hebrew.** Living, spoken, modern Hebrew. Explain as if to a smart person who does
not know the text. No yeshiva jargon without a one-line explanation, no academic jargon without
one either. Short sentences. The story first, the ideas through the story.

## The text is sacred to many listeners — pluralism is not optional

1. **Tell the book on its own terms first.** What happens, who speaks, what the book says. Quote it.
2. **Tradition and scholarship both, clearly labelled, neither mocked.**
   - The traditional Jewish view in its own voice: "לפי המסורת…", "חז"ל מספרים…", the
     authorship traditions of the Talmud (Bava Batra 14b–15a) where relevant.
   - The academic view in its own voice: "חוקרי המקרא מציעים…", "רוב החוקרים מתארכים…" —
     e.g. the documentary hypothesis for the Torah, the later dating of Daniel, the view that
     Isaiah from chapter forty on is a later prophet.
   - Present both where they genuinely differ. **Never tell the listener which to believe.**
     Never present either as the only truth, and never frame faith as naïve or scholarship as
     an attack.
3. **Classic commentators by name.** Rashi, Ramban, Ibn Ezra, Radak, Malbim, Nechama
   Leibowitz, and midrash. Attribute every interpretation to its source. Kabbalah only where it
   is genuinely central to how the book was read (Song of Songs, the creation account), and
   always as "במסורת הקבלה…", never as fact.
4. **Hard passages are told honestly, not skipped and not sensationalised.** Violence, the
   conquest and destruction commands, sexual violence (Dinah, the concubine at Gibeah, Tamar),
   slavery, harsh punishments: say what the text says, without graphic detail, acknowledge the
   moral difficulty plainly, and give the range of traditional and modern responses to it.
5. **No present-day politics.** Land, conquest, Amalek, Jerusalem: textual and historical
   framing only.
6. **Archaeology and history** stated with honest uncertainty, the evidence named, the debate
   named (e.g. the maximalist and minimalist positions on the united monarchy). Never "science
   proved the Bible false" and never "archaeology proved it true".

## Researching without stalling

A whole book of the Bible is an enormous page. Fetching one is never necessary and will hang
the run — eight agents died this way on the first attempt, mid-sentence, losing their work.

- **Never fetch a whole biblical book, chapter list or concordance.** Fetch a specific chapter
  when you need its flow, and a specific verse when you need its words.
- **Use the project's helper for verses.** `npm run verse -- "Genesis 1.1"` (Hebrew refs work
  too: `npm run verse -- "בראשית 1.1"`) prints the verse from Sefaria's Masoretic edition twice:
  as written with vowels, and as plain letters ready for a narration script, with the divine
  name already rendered "אדוני". It takes one reference or a short range.
- Keep every other fetch small: an encyclopaedia entry, a commentary page, a reference article.
- **Save the episode file as soon as you have a complete draft**, then improve it in place. A
  file on disk survives a crash; a draft in your head does not.

## Quoting the text

The Hebrew Bible is in the public domain, so verses may be quoted — and should be, because the
text is the point. But:

- **Every quotation verbatim**, checked with `npm run verse` before it is written into a file.
  A misquoted verse is a factual error. Copy the "לקריינות" line into the scripts and the plain
  wording into `summaryMd`.
- In `summaryMd`: cite every quotation as book chapter:verse (e.g. בראשית א, א).
- In the scripts: **at most three short quotations**, each under about twelve words, because
  they are for the ear. Say the reference in words ("בפרק הראשון"). No nikkud, no
  cantillation marks.
- **The divine name.** Never write the four-letter name, and never write the abbreviation that
  stands for it. In narration say "אלוהים". When a quoted verse contains the name, write it as
  "אדוני", the way it is read aloud in study.

## Tone matched to the situation — the twelve registers

This is what makes the series listenable. Before writing, decide the emotional register of each
section of the book, and let the performed script carry it. A lament is read as a lament, irony
as irony. Do not sweeten and do not solemnise. (Adapted from the tanakh-retold skill.)

| #   | Register                 | For example                                          | `eleven_v3` tags to reach for |
| --- | ------------------------ | ---------------------------------------------------- | ----------------------------- |
| 1   | Love, longing            | Jacob and Rachel, Ruth 3, Song of Songs              | `[softly]` `[warm]`           |
| 2   | Desire                   | Song of Songs 4–7 (restrained, never explicit)       | `[softly]`                    |
| 3   | Joy, celebration         | the Song at the Sea, David dancing, Nehemiah 8       | `[excited]` `[warm]`          |
| 4   | Drama, conflict          | Jacob and Esau, the golden calf, David and Saul      | `[serious]`                   |
| 5   | Suspense, dread          | the Binding of Isaac, Endor, Esther 5–7              | `[whispers]` `[serious]`      |
| 6   | Betrayal, disappointment | Joseph sold, Absalom                                 | `[sad]`                       |
| 7   | Grief, lament            | David over Saul and Absalom, Lamentations, Job 3     | `[sad]` `[sighs]` `[pause]`   |
| 8   | Humour, irony            | Sarah laughing, Balaam's donkey, Jonah, Esther 6     | `[laughs]` `[curious]`        |
| 9   | Awe, the sublime         | the burning bush, Sinai, Isaiah 6, Ezekiel 1, Job 38 | `[whispers]` `[thoughtful]`   |
| 10  | Wisdom, reflection       | Kohelet, Proverbs, Psalm 90                          | `[thoughtful]`                |
| 11  | Wrath, judgement         | Amos, Nahum, Jeremiah 7                              | `[serious]`                   |
| 12  | Comfort, hope            | Isaiah 40, Jeremiah 31, Ezekiel 37, Psalm 23         | `[warm]` `[softly]`           |

Rules for tags: only the tags in this table, plus `[pause]` and `[curious]`. One tag at the head
of a paragraph, never two stacked, never mid-sentence. Roughly one paragraph in three carries
one. Grief and awe want the most space and the fewest words; humour wants timing.

## Hebrew for the ear

- Numbers, years and chapter numbers **spelled out in words**: "בפרק עשרים ושתיים", not
  "כב" or "22". Digits and Hebrew-letter numerals are mispronounced.
- Biblical names in their common modern Israeli pronunciation.
- No parentheses, abbreviations or bullet characters in the scripts. "חז"ל" and "רש"י" are fine
  in `summaryMd`; in the scripts write "חכמינו" and "רש"י" as the narrator would say them.

## Episode fields

Match `content/episodes/man-search-for-meaning.json`, with these Tanakh specifics:

- `slug`: `tanakh-<id>` — the id list is in `tanakh.json`.
- `title`: the Hebrew book name as printed ("בראשית", "תרי עשר", "עזרא ונחמיה").
- `titleEn`: the common English name ("Genesis", "The Twelve Minor Prophets").
- `author`: the traditional attribution in the Talmud's words where one exists, otherwise "אנונימי".
  For the Torah: "המסורת: משה". Keep it short; the summary carries the nuance.
- `year`: omit. Dating is contested and belongs in the text, with both views.
- `domain`: `tanakh`. `kind`: `nonfiction`.
- `message`: what the book is about and what it asks of its reader, in one sentence.
- `summaryMd`: 800 to 1,100 Hebrew words, in the deep-summary format with these sections:
  **המסר במשפט אחד**, **על הספר** (where it sits in the Tanakh, its structure, tradition and
  research on authorship and date), **העלילה / המהלך** (the arc), **הרעיונות והרגעים המרכזיים**
  (six to seven, each anchored to a quoted verse with its reference), **איך קראו אותו**
  (commentators, midrash, liturgy, how it lives in Jewish life today), **הקטעים הקשים** (honest
  treatment of what troubles modern readers), **מסורת ומחקר** (where they meet and where they
  part), **שאלות לדיון**, **הפסוק שנשאר** (one verse, verbatim, with its reference).
- `script`: 4,200 to 4,500 characters. `performedScript`: 4,300 to 4,600 characters, carrying the
  register tags. A hard budget: every character is paid for when it is recorded.
- `takeaways`: three things to take into the week — a practice, a question, a passage to read
  in the original.
- `caveat`: that this is a summary of a sacred text that is read in many ways, and what the
  episode necessarily leaves out.
- `knowledgeToday`: the state of research and archaeology on the book, stated with its
  uncertainty. The app labels this field "מסורת ומחקר" for the Tanakh series.

## The podcast

Follow `content/dialogues/_FORMAT.md` exactly (55 to 65 turns, 3,700 to 4,000 characters,
strict alternation, no digits, host opens and signs off). For this series:

- **The guest** is a Bible teacher who has lived with the text for years, loves it, and knows
  both the commentators and the scholarship. She is at home with religious and secular readers.
- **The host** asks what a curious Israeli asks, including the uncomfortable questions: did it
  happen, how can a sacred book command that, why the contradictions, what does it say to
  someone who does not believe.
- **The disagreement stays real and respectful.** At least twice the host presses a question the
  guest cannot close. She answers with the range of traditional and scholarly responses, and
  says honestly what remains open — never by dismissing faith and never by dismissing the question.
- Tone tags follow the register table. A podcast about Lamentations does not sound like one
  about Esther.
