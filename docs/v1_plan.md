# Acture v1 — Tentative Plan

**Status:** TENTATIVE — written before deep research is complete. Designed to be amended after research, not rewritten from scratch. Sections marked **🔬 RESEARCH-GATED** are placeholders where findings from [`research_prompts.md`](research_prompts.md) should refine specifics.

**Reading order:** This plan assumes the reader has read [`command_dispatch_journal_article.md`](command_dispatch_journal_article.md), [`reference_notes.md`](reference_notes.md), and [`redesign_takeaways.md`](redesign_takeaways.md). It does not re-argue decisions already settled there.

---

## 0. How to amend this plan

When deep research is complete, an agent should:

1. Read the research findings.
2. For each section marked **🔬 RESEARCH-GATED**, check whether the corresponding prompt(s) in [`research_prompts.md`](research_prompts.md) have been answered.
3. Modify those sections with concrete specifics, replacing the placeholder text.
4. Update the **Decisions** table at the top of each section if the research overturned a strong-default decision.
5. Promote this file from **TENTATIVE** to **FINALIZED** in the front matter once all research-gated sections have been resolved (or explicitly deferred to post-v1).

The plan is structured so that **the minimal v0** (Phase 0–1) can proceed even before research lands. Phases 2+ require research findings to be specified concretely.

---

## 1. Settled decisions (from user, [`redesign_takeaways.md`](redesign_takeaways.md), and references)

These are **strong defaults**, not locks. Research can override; without research findings, this is what we build.

| Question | Decision | Source |
| --- | --- | --- |
| Library name | **`acture`** (single name for greenfield + migration) | User, 2026-05-12 |
| Target purity is library-level concern? | No — same core serves all three modes; differences live in adapters and docs | Takeaways §0 |
| `when`-clauses: DSL or function? | **Both.** Small DSL primary; `(ctx) => boolean` allowed as escape hatch | User |
| State management library | **Agnostic.** No bundled state lib. User picks; agent wires up via adapter interface | User. 🔬 *Refine via prompt 2* |
| Migration package | **Real package** (`acture/migration`), but framed as "tools the AI agent uses to assemble a command-dispatch architecture in an existing codebase" | User |
| Undo subsystem | **Post-v1.** Reserve `execute` return-shape hook so adding `@acture/undo` later is non-breaking | User |
| Schema as SSOT | **JSON Schema as wire format**; Zod is recommended authoring layer; Standard Schema accepted at boundary | Takeaways §1.3 |
| Single dispatch entry point | **`dispatch(id, args, ctx?)`** for all surfaces | Takeaways §1.4 |
| Owner-scoped lifecycle | **Disposable pattern.** Every `register*` returns a disposable | Takeaways §1.5 |
| Errors as data | Discriminated-union result; no thrown exceptions across consumer boundaries | Takeaways §1.8 |
| Keybindings | **tinykeys string DSL** (`"$mod+K"`, `"g i"`, regex groups) | Takeaways §1.7 |
| Sandboxing | **Not in v1.** Trusted-extension model; add membrane later if real third-party ecosystem emerges | Takeaways §2.6 |

---

## 2. Naming & rename

### 2.1 Verify name availability

Before any rename work begins, verify:
- `npm view acture` returns "not found" (or only an empty stub).
- `pip index versions acture` returns no result, and a PyPI search confirms no conflicting package.
- A GitHub organization/user `acture` is either available or already owned by the user.

If `acture` is taken on npm or pypi: stop, raise it with the user, do not improvise an alternative.

### 2.2 Rename mechanics

Once availability is confirmed:

1. Choose the canonical names:
   - **npm:** `acture` (drops the `command-` prefix that was a workaround for `wrapex` being taken).
   - **GitHub:** rename the repository.
   - **pypi:** `acture` (for the Python companion, if/when it ships — see §6.4).
2. Search-and-replace across the codebase: `command-wrapex` → `acture`, `wrapex` → `acture`. Be careful of:
   - References to historical commit messages (don't rewrite git history).
   - The directory `docs/command_dispatch_journal_article -- fetched/` (rename in a separate commit; agents must update all references).
   - The directory `.claude/skills/` — rename the skills package context if it carries `wrapex` in the path.
3. Update package.json, pyproject.toml, README front matter, all import paths.
4. Update the three docs files just produced ([`reference_notes.md`](reference_notes.md), [`redesign_takeaways.md`](redesign_takeaways.md), [`research_prompts.md`](research_prompts.md)) — they currently say `wrapex` throughout.
5. Add a deprecation note in `command-wrapex` on npm pointing at `acture` (publish once, then leave).
6. **Do not split** into separate "pure" and "migration" packages. One library, one canonical name, with `acture/migration` as a sub-export.

### 2.3 What stays named `wrapex`

Nothing. The rename is total. The "wrap" framing was always an artifact of mode-2 thinking; carrying it into the name forever would nag.

---

## 3. Acture's user-facing positioning

A reminder of what the library is *for*, framed concretely (per [ref_30: don't be an architecture astronaut](command_dispatch_journal_article%20--%20fetched/ref_30_j-spolsky-don-t-let-architecture-astronauts-scare-you-joelonsoftware-com-2001.md)):

**One-liner (README headline):** *"One schema. Palette, hotkeys, AI tools, MCP, and tests — for free."*

**Three branching paths** (top of README points to one of these):

1. **Greenfield-pure** — "Starting from scratch? Design your app command-dispatch-first." → links to `getting-started/greenfield.md`.
2. **Strangler-fig migration** — "Have an existing app? Use Claude Code with `acture/migration` to incrementally introduce command dispatch." → links to `getting-started/migration.md`.
3. **Footprint-minimizer** — "Just want a command palette + MCP server bolted onto your existing app? 5-minute drop-in." → links to `getting-started/drop-in.md`.

All three paths use the same core. They differ in (a) which adapters they pull in, (b) which skills they invoke, (c) which examples they crib from.

---

## 4. Package layout (strawman)

🔬 RESEARCH-GATED — prompts 1 (convergent evidence), 2 (state substrate), 3 (migration patterns) may refine which packages exist and where seams fall.

```
acture                    # Default barrel = core + most-used adapters re-exported.
acture/core               # Registry, dispatch, schemas, when-clause DSL, owner lifecycle.
                          # ZERO React/UI/framework deps. ZERO bundled state lib.
acture/palette-react      # cmdk-based default palette UI. Depends on core.
acture/hotkeys            # tinykeys binding. Plain DOM, optional React hook.
acture/forms-autoform     # Zod → form (autoform). Optional.
acture/forms-rjsf         # JSON Schema → form (rjsf). Optional.
acture/ai-vercel          # Adapter to Vercel AI SDK tools.
acture/mcp                # Adapter to MCP TS SDK (server + client).
acture/test-property      # fast-check arbitraries derived from command schemas. (May defer to v1.1.)
acture/migration          # wrapMutation, divertHandler, event-interception. Tools for Claude Code
                          # to assemble a command-dispatch architecture in an existing codebase.
acture/devtools           # Inspector: registry, dispatch log, when-clause evaluator. (Likely v1.1.)

acture/experimental       # Opt-in, unstable, per-feature flag. Not exported from `acture` barrel.
acture/internal           # No SemVer guarantee.
```

**State-management adapters** (🔬 RESEARCH-GATED — prompt 2):
- The exact shape of the state adapter interface is TBD pending research.
- Strong default: a minimal interface `{getState, setState, subscribe}` that any of zustand / Redux Toolkit / Jotai / MobX / Valtio can implement.
- Ship one or two example adapters (likely `acture/state-zustand` and one other) as separate packages.
- The agent installing acture in a user's codebase picks the adapter that matches the user's existing stack.

---

## 5. The Command Record (closed surface)

```ts
type CommandRecord<P = unknown, R = unknown> = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  params?: StandardSchema<P>;          // Zod / JSON Schema as const / Valibot
  when?: string | ((ctx: Context) => boolean);  // DSL string primary, function escape hatch
  keybinding?: string | string[];     // tinykeys DSL
  aliases?: string[];
  kind?: "atomic" | "handoff";        // ref_50: palette completes in-place vs. opens UI surface
  defaultScore?: number | ((ctx: Context) => number);
  scale?: number | ((ctx: Context) => number);
  follow?: string[];
  execute: (params: P, ctx: Context) => Result<R> | Promise<Result<R>>;
};
```

Where `Result<R>` is:
```ts
type Result<R> =
  | { ok: true; value: R; patches?: Patch[]; effects?: Effect[] }
  | { ok: false; error: { code: string; message: string; details?: unknown } };
```

The `patches?` and `effects?` fields are **reserved hooks for `@acture/undo` (post-v1)**. v1 of core ignores them. They are present so adding undo later is non-breaking.

**The metadata surface is closed.** Don't add fields without a real consumer asking. Compose new capabilities via wrapper functions (`palettable(cmd, ...)`, `toolCallable(cmd, ...)`) [ref_29: The Wrong Abstraction](command_dispatch_journal_article%20--%20fetched/ref_29_s-metz-the-wrong-abstraction-sandimetz-com-2016.md).

---

## 6. Phased delivery

### Phase 0 — Rename & re-frame (no architecture changes)

**Goal:** All files, code, and docs use `acture`. Nothing else changes.

- Verify name availability on npm/pypi/GitHub.
- Rename per §2.2.
- Update three existing docs files to use `acture`.
- Update README with the three-branching-path headline (§3).
- Publish a final `command-wrapex` deprecation pointer on npm.

**Why first:** Everything downstream references the library by name. Renaming after package layout is settled means renaming everywhere twice.

**Agent suitability:** High. This is mechanical search-replace plus a README rewrite.

---

### Phase 1 — v0 minimal core (research-independent)

**Goal:** A working `acture/core` that can be imported and used end-to-end with one consumer adapter, validating the shape against a real toy app.

Scope:

- `acture/core`:
  - Command registry (`Map<string, CommandRecord>`) + `defineCommand`, `register`, `unregister`.
  - Dispatcher (`dispatch(id, params, ctx?)`) with schema validation and `when`-clause evaluation.
  - When-clause DSL: parser + evaluator for the operator set from [ref_10](command_dispatch_journal_article%20--%20fetched/ref_10_vs-code-when-clause-contexts.md): `!`, `&&`, `||`, `==`, `!=`, `>=`, `<=`, `=~`, `in`, `not in`.
  - Context-key store (plain reactive object). State-adapter interface (🔬 *refine via prompt 2*).
  - Owner-scoped disposables.
  - `commandsChanged` event emitter.
  - Schema bridge: `toJsonSchema(command)` and `toMcpTool(command)` helpers.
  - Result type (`Result<R>`) with the reserved undo hooks.

- **One** consumer adapter to validate the shape end-to-end. Default choice: `acture/palette-react` (cmdk-based). Rationale: it exercises both metadata-only consumption (palette population) and dispatch (selection).

- One worked example in `examples/greenfield/`: a tiny graph editor where 6–8 actions are commands. This is the validation target — if the API feels right for this app, the shape is plausible.

- Property-based test scaffolding: a single fast-check test that asserts registry invariants (no duplicate IDs, `dispatch` of an unknown ID returns an error result, etc.).

**Defer to Phase 2:** AI/MCP adapters, hotkeys, param-collector UI, migration package, forms.

**Why this scope:** It validates the **commit-once decisions** (command record shape, dispatcher signature, schema bridge) against one real consumer. Everything else can be added without changing these.

**Agent suitability:** High. Self-contained, well-specified, with the worked example as the acceptance criterion.

**Acceptance criteria:**
- The graph editor example uses no `setState` outside `execute` handlers.
- A second agent, given only the API docs, can write a 7th command without reading the source.
- The property test passes.

---

### Phase 2 — Adapter buildout (research-informed)

**Goal:** Ship the adapter packages that make acture useful across all three positioning paths.

🔬 RESEARCH-GATED — specifics in this phase should be refined by:
- **Prompt 1** (convergent evidence): may surface missing fields on the command record, or different conventions for parameterized commands.
- **Prompt 5** (parameterized palette UX): determines default behavior of the param-collector for 1, 2, 3, 4+ args.

Scope:

- `acture/hotkeys` — tinykeys integration.
- `acture/palette-react` — extended with parameterized-command support (param-collector). Use AutoForm or rjsf adapter pattern.
- `acture/forms-autoform` and/or `acture/forms-rjsf` — pick based on prompt 5 findings.
- `acture/mcp` — server adapter, registry → MCP tools, errors-as-data.
- `acture/ai-vercel` — registry → Vercel AI SDK tools.

**Adapter discipline rule** [ref_14]: adapter packages contain *no business logic*. They translate. Enforce via code review.

**Worked examples to ship:**
- `examples/drop-in/` — minimal mode-1 demo: existing-app skeleton + 5-minute palette + MCP bolt-on.
- `examples/greenfield/` — extend the Phase 1 graph editor with palette, hotkeys, MCP, AI tools.

**Acceptance criteria:**
- Both worked examples run.
- An MCP client can list and call commands from `examples/greenfield/`.
- An LLM (Claude or GPT-4) can invoke commands via the Vercel AI adapter.

---

### Phase 3 — Migration package & skills

**Goal:** Ship `acture/migration` plus the agent skills that use it to assemble a command-dispatch architecture in an existing codebase.

🔬 RESEARCH-GATED — specifics here should be refined by:
- **Prompt 3** (transitional architecture as concrete API): determines exact shape of `wrapMutation`, `divertHandler`, event-interception middleware.
- **Prompt 7** (codemods and AI-assisted migration): determines whether to ship `acture/codemods` and what the agent workflow looks like.

Scope:

- `acture/migration`:
  - `wrapMutation(legacyHandler, spec)` — wrap an existing function as a command without changing it.
  - `divertHandler(commandId, { legacy, modern, predicate })` — per-command routing between old and new implementations.
  - Event-interception middleware: let some DOM/store events transparently become command dispatches.
  - **The intent** [user, 2026-05-12]: these are tools for Claude Code (or another coding agent) to use when assembling a command-dispatch architecture in a user's existing codebase. Defaults exist, but the agent adapts them to what the user's codebase actually has.

- Skills (in `.claude/skills/`):
  - `00-greenfield-bootstrap.md` — NEW. For mode-3 users.
  - `01-diagnose.md` through `04-wrap.md` — existing, relabel as migration-track.
  - `05-enrich.md` through `13-*.md` — existing, universal.
  - `99-graduation.md` — NEW. For mode-2 teams retiring transitional adapters.
  - All skills reference `acture` (not `wrapex`).

**Worked examples:**
- `examples/migration/` — the four existing `wrap-*` examples, updated.

**Acceptance criteria:**
- Given a small, existing React app (a fixture, not a real codebase), an agent following the migration skills can introduce acture and have at least 5 commands working without breaking existing behavior.

---

### Phase 4 — Stability and devtools

**Goal:** Move from "works" to "production-ready."

🔬 RESEARCH-GATED — refine via:
- **Prompt 6** (schema versioning): determines whether `acture compare-schemas` ships.

Scope:

- API tier system: `@stable`, `@experimental`, `@internal` JSDoc tags + runtime guards. `acture/experimental` sub-export.
- `acture/devtools`: inspector UI for the registry, dispatch log, when-clause evaluator state.
- Schema-versioning tooling (🔬 *conditional on prompt 6*): if it ships, a `acture compare-schemas` CLI that diffs two snapshots and flags breaking changes.
- Hardening: error messages, edge cases, JSDoc.
- v1.0 release.

---

### Post-v1 (deferred, not committed)

These are explicitly deferred. None ships until a real user requests it (rule of three, [ref_27: YAGNI](command_dispatch_journal_article%20--%20fetched/ref_27_m-fowler-yagni-you-aren-t-gonna-need-it-martinfowler-com-2015.md)):

- `acture/undo` — patch-based undo, transactions, effect queue. Hooks reserved in Phase 1.
- `acture/macros` — record/replay of command sequences.
- `acture/telemetry` — middleware for logging every dispatch.
- `acture/sandbox` — membrane-pattern third-party extension sandboxing (if a real third-party ecosystem emerges).
- Python companion package (`acture` on pypi) — 🔬 *refine via prompt 4 (cross-language story)*.
- `acture/test-property` — fast-check property tests derived from command schemas (could ship in Phase 2 if cheap).

---

## 7. Cross-cutting workstreams

Acknowledged but not specified in detail (per user's "mention but defer"):

- **Agent rails** (auto-loaded architecture doc, ESLint rules enforcing the "hard don'ts" from Takeaways §3, PR size guidance, property-test scaffolding). Important for long-term coherence under agent maintenance. To be specified as a separate workstream after Phase 1 lands. See Takeaways §3 for the hard "don'ts" that should become enforced rails.

- **Trunk-based development discipline** [ref_25]: small PRs, feature flags for in-progress work, fast builds.

- **Skills directory consistency**: every skill should reference `acture` (not `wrapex`), and should fit cleanly into either the greenfield track, the migration track, or the universal pool.

---

## 8. Open questions awaiting research

Repeated here so an agent finalizing the plan knows exactly what to look for. Each maps to one or more prompts in [`research_prompts.md`](research_prompts.md).

| Open question | Resolved by prompt(s) | Phase blocked |
| --- | --- | --- |
| Is the `CommandRecord` shape convergent with shipped products? Missing fields? | 1 | Phase 2 |
| State-adapter interface design; which state libs ship with example adapters | 2 | Phase 1 (partially), Phase 2 (fully) |
| Exact shape of `wrapMutation`, `divertHandler`, event-interception | 3 | Phase 3 |
| Whether/how a Python companion package fits | 4 | Post-v1 |
| Default param-collector behavior for N parameters | 5 | Phase 2 |
| Whether `acture compare-schemas` ships in v1 | 6 | Phase 4 |
| Whether `acture/codemods` ships, and the agent migration workflow | 7 | Phase 3 |
| Deeper references (Gamma, Buschmann, Meyer, Kohavi) — stylistic refinements | 8 | None (polish) |

---

## 9. Why this plan is conservative

Per the user's request for a research-gated, minimal-v0 plan:

1. **Phase 1 is the only phase that requires nothing further to start.** Everything in Phase 1 is grounded in convergent evidence already in the references.
2. **Phases 2, 3, 4 each have explicit research dependencies.** Starting them before the research lands risks committing to shapes that the research overturns. Phase 2 specifically depends on prompts 1 and 5 — both about how shipped products actually feel.
3. **The plan does not over-specify Phase 1.** It deliberately leaves room for the Phase 1 implementing agent to make local decisions (e.g., how exactly the when-clause parser is structured), constrained by the references and the takeaways doc.
4. **Every package in §4 has a justification path back to a settled decision or a research prompt.** No speculative packages.

The deepest commitment in Phase 1 is the **command record shape** (§5) and the **dispatcher signature**. Both are well-supported by the references and the user's settled decisions. Everything else is amendable without breaking Phase 1's worked example.

---

## 10. What to do next (handover to a finalizing agent)

After the user completes their deep research:

1. Read the research findings (likely a new file at `docs/research_findings.md` or similar).
2. For each research-gated section in this plan, locate the corresponding finding and update the section with concrete specifics.
3. Update the Decisions table in §1 if the research overturned a strong default.
4. Update §8 (Open questions) — strike resolved questions, surface new ones.
5. Promote the front-matter status from **TENTATIVE** to **FINALIZED**.
6. Notify the user of any decisions where the research diverged from the strong defaults — those are worth discussing before implementation.
