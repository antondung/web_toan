# Math Quest — Dev Notes

## File sync requirement

The Flask server runs from the **`.app` bundle**, not the root files.
After editing any of these root files, sync them to the bundle:

```bash
cp app.py      "Math Quest.app/Contents/Resources/app/app.py"
cp templates/* "Math Quest.app/Contents/Resources/app/templates/"
```

Copy all of `templates/` rather than naming files — the list went stale twice
(`display.html`, then `teacher_login.html`), and `templates/` now holds `.js`
and `.css` partials as well as `.html`, so an `*.html` glob is not enough.

## Layout of index.html

`index.html` is assembled at render time from partials in `templates/`:

| File | Contents |
|---|---|
| `index.html` | markup, app logic, screens, game loop (~1,890 lines) |
| `_explanations.js` | `withWhy()`, the `STRATEGY` hints, `explanationFor()` |
| `_generators.js` | question generators, `genQ`, math helpers (~2,130 lines) |
| `_i18n.js` | the `STRINGS` table, EN + ES |
| `_styles.css` | all CSS |

They are pulled in with `{% include %}`, so they are concatenated into the same
single `<script>`/`<style>` block. Global scope and load order are unchanged, and
the partials must stay free of Jinja syntax (`{{`, `{%`, `{#`).

Two values are injected from `app.py` and must stay in `index.html` itself:
`LEVELS` and `COSMETIC_XP`.

## Tests

```bash
node tests/fuzz_generators.js          # ~60k questions, a few seconds
node tests/fuzz_generators.js 2000     # slower, more thorough
```

Fuzzes every question generator for the bugs that have actually shipped:
duplicate options, a missing answer, float artifacts in distractors, and Spanish
labels that do not match the option they grade. It also verifies explanations:
every "A op B = C" claim inside one must actually be true, a worked line must
name its own answer, and nothing may be missing its Spanish.

## Practice targeting

`student_topic_stats` records attempts/misses per **sub-topic**; the older
`student_unit_stats` stays keyed by **parent unit** because the teacher
diagnostics are built on it and hold real class history. Both are written from
the same event in `question_result`, so they cannot drift.

`GET /api/character/<name>/practice` returns per-sub-topic accuracy and a `weak`
list. A sub-topic only counts as weak after `PRACTICE_MIN_ATTEMPTS` (6) attempts,
so one unlucky miss does not brand a topic. That list drives three things:

- a "worth another go" flag on the topic cards
- a bias in the `mix` draw (weak ids are entered twice, so ~2x as likely)
- nothing forced — the student still chooses

Missed questions also come back **within the same round**: `session.retry` holds
up to two, served from question 9 onward and marked "Second look".

## Explanations

A wrong answer shows a "why" panel, in two layers:

1. `withWhy(q, en, es)` attaches a **worked line carrying the real numbers** —
   best where the maths is mechanical. Prototyped across all of u5 (decimals).
2. `STRATEGY[subTopicId]` in `_explanations.js` is a **hand-written strategy
   hint** used when a question has no worked line of its own.

To extend to another unit: add its `STRATEGY` entries first (instant coverage
for the whole unit), then attach `withWhy()` to individual generators over time.
`_explanations.js` must be included **before** `_generators.js`. To confirm the harness still
detects real bugs rather than passing vacuously, point it at an older copy:

```bash
GENERATORS_SRC=/tmp/old_generators.js node tests/fuzz_generators.js
```

**Always edit the root files** (they're the source of truth in git), then run the sync.
