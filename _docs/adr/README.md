# Architecture Decision Records (ADRs)

ADRs are the source of truth for **cross-plan decisions**: constraints and choices that outlive the ExecPlan that produced them and that any future session must know regardless of which feature it is working on.

They exist to solve a specific failure mode: ExecPlans are immutable history (never retrofitted after completion), and `CLAUDE.md` is a mutable snapshot with no history. Neither can say "this was believed for a month, then found false." ADRs add the missing lifecycle. Without one, a decision that has no recorded provenance is unauditable — nothing says who decided it or on what evidence, so no future session re-examines it; each one just inherits it with more confidence, and a stale or outright false constraint can quietly shape work for weeks.

## The three-gate test

Record an ADR only when **all three** are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful.
2. **Surprising without context** — a future reader will look at the code and wonder "why on earth did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and one was picked for specific reasons.

If any gate fails, skip the ADR — the decision belongs in the ExecPlan's Decision Log (plan-scoped narrative) or nowhere. This filter is what keeps the ADR set small enough that keeping `CLAUDE.md` in sync with it stays trivial; a healthy project accumulates ADRs in the single digits per year, not per month.

## Format

One file per decision in `_docs/adr/`, numbered sequentially: `0001-slug.md`, `0002-slug.md`. Scan for the highest existing number and increment. Keep each ADR to a few sentences — the value is in recording *that* a decision was made, *why*, and *on what evidence*, not in filling out sections.

```md
---
status: accepted
---

# {Short title of the decision}

{1-3 sentences: context, what was decided, and why. Name the genuine
alternatives if the rejection is non-obvious.}

Source: {provenance — which ExecPlan/session/PR produced this, and the
evidence level: e.g. "confirmed by 1200-row field replay
(_docs/execplan-x.md M4)" vs. "user decision, session 2026-07-05" vs.
"asserted by agent, unconfirmed".}
```

The `Source:` line is mandatory. It is what makes a decision auditable later: a claim backed by field evidence and one that was merely asserted look identical without it.

## Lifecycle (`status`)

- `proposed` — under discussion, not yet binding.
- `accepted` — current truth. `CLAUDE.md` may cite it.
- `superseded-by-NNNN` — was right at the time, replaced by a newer decision. Add one sentence saying what changed.
- `rescinded` — found to have been **false all along** (not replaced — invalidated). Add one sentence explaining the error, so readers know to distrust anything downstream of it.

Never delete or rewrite an ADR's original content when its status changes; append. The history is the point.

## Sync contract with CLAUDE.md and ExecPlans

- `CLAUDE.md` is an **index, not a home**: one line per active constraint with a pointer (`per _docs/adr/0001-...`). Every non-obvious claim in `CLAUDE.md` cites its source — an ADR or an ExecPlan path — so the snapshot is auditable and rebuildable from the log.
- Completed ExecPlans are **immutable**; when an ADR rescinds or supersedes something a plan asserted, the correction lives in the ADR and `CLAUDE.md`, never as edits to the old plan.
- Sync happens at three checkpoints, where an agent is already holding the pen: during a `/grill-me` session (a three-gate decision crystallises → write the ADR and index line immediately), at ExecPlan close-out (`/close-out` sweeps the plan's Decision Log for three-gate survivors), and occasional audit passes.
