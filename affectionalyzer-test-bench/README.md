# Affectionalyzer Test Bench

A standalone sandbox for exploring the math behind [Affectionalyzer](../affectionalyzer-hyperscanning)
without a Muse headset. It re-implements the formulas from `src/affect/model.ts` and
`src/affect/sync.ts` against synthetic signals driven by sliders, so you can see which
constants are safe to change and which ones matter before touching the real project.

**This folder is completely separate from the Affectionalyzer project.** It doesn't read
from, import, or write to it — it's a copy of the same logic, hand-typed to match, running
against fake data instead of a real daemon. If the real `model.ts` or `sync.ts` ever change,
this bench won't follow automatically; it would need a manual re-sync.

## Opening it

It's a single self-contained HTML file — no build step, no dependencies.

**Easiest:** double-click `index.html` and it opens in your default browser.

**If you'd rather serve it** (some browsers restrict local-file JavaScript):

```bash
cd affectionalyzer-test-bench
python3 -m http.server 8934
```

Then open <http://localhost:8934>.

There's also a hosted copy on claude.ai if you'd rather not run anything locally — ask in
the same conversation this was built in and it'll hand you the link back.

## What's inside

### Tab 1 — Single signal
Sliders for the fake daemon fields a real NeuroSkill frame would carry — mood, engagement,
cognitive load, drowsiness, wakefulness — plus the arousal-source dropdown, the composite
weights, smoothing τ, and the neutral deadzone. Moving a slider updates the mood number, the
quadrant label, and the live dot on the valence × arousal circumplex in real time, exactly
like the real app, just fed by your hand instead of a headset.

### Tab 2 — Two-person sync
Generates two synthetic "brains" from a coupling-strength, lag, noise, and drift slider,
then runs them through the actual correlation → detrend → surrogate-floor pipeline from
`sync.ts`. Shows live r-values, the surrogate floor bar, and the weak/moderate/strong
verdict — so you can watch, first-hand, why an unqualified correlation number is misleading
(turn noise up and coupling down and watch the floor rise to swallow a "real"-looking r).

### Constants strip
Every tunable constant from both files in one glance, tagged by risk:

| Badge | Meaning |
|---|---|
| 🟢 Low risk | Cosmetic or layout only — change freely |
| 🟡 Medium | Changes what a number *means*, but nothing breaks |
| 🔴 High care | Statistically load-bearing — the sync engine's honesty depends on these |

Each tile names its real file and line number in the Affectionalyzer source, so once you've
found a value worth changing here, you know exactly where to make it for real.

## Why this exists

Affectionalyzer needs a live EEG headset to show anything. This bench exists so the
constants — composite weights, smoothing time, correlation window, surrogate thresholds —
can be understood and experimented with before ever touching the real project or owning a
Muse.

See also: `docs/altering-values-guide.pdf` in the main project for the same constants as a
static reference document.
