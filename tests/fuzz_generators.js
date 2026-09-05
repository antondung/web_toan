#!/usr/bin/env node
//
// Fuzzes the question generators in templates/_generators.js.
//
// Every invariant here corresponds to a bug that actually shipped:
//   #4  duplicate options graded a correct answer wrong
//   #6  "which is greater" with two equal operands
//   #7  histogram ties  ·  #8  ambiguous mode questions
//   #9  genQ reshuffled `choices` without `choices_es`, so Spanish players saw
//       button labels that graded as a different option; plus duplicate options
//       and padding that could collide with the answer
//   #10 float artifacts (0.6000000000000001) that appeared only on distractors
//
// Run: node tests/fuzz_generators.js [rounds-per-generator]
//
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// GENERATORS_SRC lets this run against an older copy of the file, which is how
// you confirm the harness still detects a bug rather than passing vacuously.
const SRC = process.env.GENERATORS_SRC ||
            path.join(__dirname, '..', 'templates', '_generators.js');
const EXPL = path.join(__dirname, '..', 'templates', '_explanations.js');
const ROUNDS = parseInt(process.argv[2], 10) || 400;

// The partial is browser code with no module system — it is concatenated into
// index.html's single <script> block. Evaluate it in a sandbox and grab the
// top-level bindings via an epilogue, since `const` does not attach to the
// context object.
const sandbox = { console, Math, JSON, String, Number, Array, Object, Set, Map,
                  isNaN, parseInt, parseFloat,
                  powerup: {}, enabledUnits: [], IM_UNITS: [] };
vm.createContext(sandbox);
vm.runInContext(
  (fs.existsSync(EXPL) ? fs.readFileSync(EXPL, 'utf8') + '\n' : '') +
  fs.readFileSync(SRC, 'utf8') +
  '\n;globalThis.__x = {GENERATORS, genQ, CMAS_GEN, nearWrongs,' +
  ' explanationFor: typeof explanationFor === "function" ? explanationFor : null};',
  sandbox
);
const { GENERATORS, genQ, CMAS_GEN, explanationFor } = sandbox.__x;

// Force the plain-generator path; the CMAS branch returns short-answer
// questions with no `choices` and is fuzzed separately below.
const cmasSaved = { ...CMAS_GEN };
Object.keys(CMAS_GEN).forEach(k => delete CMAS_GEN[k]);

const ARTIFACT = /\.\d{4,}/;
// For validating arithmetic asserted inside an explanation.
const EQ = /(-?\d+(?:\.\d+)?)\s*([+−\-×÷])\s*(-?\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)/g;
const applyOp = (a, op, b) =>
  op === '+' ? a + b : (op === '−' || op === '-') ? a - b : op === '×' ? a * b : a / b;
const failures = [];
const fail = (unit, diff, what, q) =>
  failures.push({ unit, diff, what, en: q && q.en, answer: q && q.answer,
                  choices: q && q.choices, choices_es: q && q.choices_es });

let checked = 0;
for (const uid of Object.keys(GENERATORS)) {
  for (const diff of [0, 1, 2]) {
    for (let i = 0; i < ROUNDS; i++) {
      // Capture the generator's own EN->ES pairing before genQ reorders it.
      const raw = GENERATORS[uid][diff]();
      if (!raw || !raw.choices) continue;
      const pairing = new Map();
      if (Array.isArray(raw.choices_es) && raw.choices_es.length === raw.choices.length)
        raw.choices.forEach((c, j) => pairing.set(String(c), String(raw.choices_es[j])));

      const orig = GENERATORS[uid][diff];
      GENERATORS[uid][diff] = () => raw;
      const q = genQ(uid, diff);
      GENERATORS[uid][diff] = orig;
      checked++;

      const cs = q.choices.map(String);
      if (cs.length !== 4)                     fail(uid, diff, 'not four choices', q);
      if (new Set(cs).size !== cs.length)      fail(uid, diff, 'duplicate option', q);
      if (!cs.includes(String(q.answer)))      fail(uid, diff, 'answer missing from choices', q);
      if (cs.some(c => ARTIFACT.test(c)))      fail(uid, diff, 'float artifact in choices', q);
      if (ARTIFACT.test(String(q.answer)))     fail(uid, diff, 'float artifact in answer', q);

      // Explanations: any "A op B = C" claim inside one must actually be true,
      // and a question that carries its own worked line must name its answer.
      if (explanationFor) {
        const en = explanationFor(q, 'en'), es = explanationFor(q, 'es');
        if (en) {
          if (!es)                                  fail(uid, diff, 'explanation has no Spanish', q);
          if (/NaN|undefined|Infinity/.test(en + es)) fail(uid, diff, 'explanation contains NaN/undefined', q);
          EQ.lastIndex = 0;
          let m;
          while ((m = EQ.exec(en))) {
            const got = applyOp(parseFloat(m[1]), m[2], parseFloat(m[3]));
            if (Math.abs(got - parseFloat(m[4])) > 1e-6)
              fail(uid, diff, `explanation states a false equation: "${m[0]}"`, q);
          }
          if (q.why && !en.includes(String(q.answer)))
            fail(uid, diff, 'worked explanation never names the answer', q);
        }
      }

      if (q.choices_es) {
        if (q.choices_es.length !== cs.length) fail(uid, diff, 'choices_es length mismatch', q);
        else if (pairing.size && !cs.every((c, j) =>
                 !pairing.has(c) || pairing.get(c) === String(q.choices_es[j])))
          fail(uid, diff, 'Spanish label does not match the option it grades', q);
      }
    }
  }
}

// CMAS-format questions: multiple-select and short-answer.
Object.assign(CMAS_GEN, cmasSaved);
let cmasChecked = 0;
for (const uid of Object.keys(CMAS_GEN)) {
  for (const diff of [0, 1, 2]) {
    for (let i = 0; i < ROUNDS; i++) {
      const q = CMAS_GEN[uid](diff);
      if (!q) { fail(uid, diff, 'CMAS generator returned nothing', q); continue; }
      cmasChecked++;
      if (q.choices) {
        const cs = q.choices.map(String);
        if (new Set(cs).size !== cs.length)  fail(uid, diff, 'CMAS duplicate option', q);
        if (cs.some(c => ARTIFACT.test(c)))  fail(uid, diff, 'CMAS float artifact', q);
      }
      const answers = q.answers || (q.answer !== undefined ? [q.answer] : []);
      if (!answers.length)                   fail(uid, diff, 'CMAS question has no answer', q);
      if (q.choices && q.type === 'multi' &&
          !answers.every(a => q.choices.map(String).includes(String(a))))
        fail(uid, diff, 'CMAS multi-select answer not among choices', q);
    }
  }
}

console.log(`fuzzed ${checked} multiple-choice + ${cmasChecked} CMAS questions ` +
            `across ${Object.keys(GENERATORS).length} generators (${ROUNDS}/difficulty)`);

if (!failures.length) { console.log('OK — all invariants hold'); process.exit(0); }

const grouped = {};
for (const f of failures) grouped[f.what] = (grouped[f.what] || 0) + 1;
console.error(`\nFAILED — ${failures.length} problems:`);
for (const [what, n] of Object.entries(grouped).sort((a, b) => b[1] - a[1]))
  console.error(`  ${String(n).padStart(6)}  ${what}`);
console.error('\nExamples:');
for (const f of failures.slice(0, 5))
  console.error(`  [${f.unit}/${f.diff}] ${f.what}\n     ${f.en}\n     answer=${JSON.stringify(f.answer)} choices=${JSON.stringify(f.choices)}` +
                (f.choices_es ? ` choices_es=${JSON.stringify(f.choices_es)}` : ''));
process.exit(1);
