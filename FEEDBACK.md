# Code Review: PR #332 — Fix status panel flickering with in-place updates

**Reviewer:** Senior Fullstack Code Reviewer
**PR:** https://github.com/alexjaniak/DACL/pull/332
**Branch:** `worker-01/315-fix-status-flicker`
**File reviewed:** `apps/cli/src/forge/status_panel.py`

---

## Executive Summary

This is a clean, well-scoped fix. The approach is correct: structural key comparison gates the fast in-place update path, and the full rebuild is preserved for the cases that actually need it. No regressions were found. There are two medium-priority issues and two low-priority polish items worth addressing before merge.

---

## Checklist Results

### 1. Uses Static.update() for in-place updates

**PASS.** `update_data()` calls `Static.update()` on both `.agent-info` and `.agent-countdown`, and `ProgressBar.update()` on the bar. No widget is torn down or remounted on the fast path.

### 2. Only rebuilds cards when agent list structure changes

**PASS with one caveat.** The guard condition is:

```python
if current_keys == self._last_structural_keys and agents:
```

This correctly skips rebuild when structure is unchanged and the list is non-empty. The `and agents` guard prevents an edge case where an empty-list tick would be treated as "no change" and skip the "No agents configured." mount. That logic is correct.

However, there is a subtle ordering issue: `self._last_structural_keys` is only updated on the rebuild path. If the fast path is taken, the cached keys are never refreshed. This is fine today because the keys come from `_structural_key()` fields that only change on a rebuild trigger anyway — but it means the cache is stale on the fast path by design, which is slightly fragile. A comment would help.

### 3. _structural_key() is sensible

**PASS.** The tuple `(id, role, repo, interval)` captures the four fields that define card identity. `since`, `until`, `progress`, `state`, and `running` are all timer/runtime values that legitimately change every tick and are correctly excluded. The function has a clear docstring.

One minor note: `role` is derived from the `contexts` array in `_load_agents()`, not stored directly in `cron-jobs.json`. If a job's contexts list changes (e.g. someone adds PLANNER.md to a worker), `role` will change but the structural key will not reflect the underlying config change until `id`, `repo`, or `interval` also changes. This is unlikely in practice and acceptable for now, but worth noting.

### 4. No regressions in status panel behavior

**PASS.** The rebuild path is unchanged from the previous implementation. The fast path is additive. One scenario to verify manually:

- **State transition (idle -> running -> overdue):** `state` is excluded from `_structural_key()`, so a transition between states will NOT trigger a rebuild — it will be handled by `update_data()` via `_info_text()`. This is correct: `_info_text()` reads `a["state"]` and renders the appropriate indicator. The state change will be reflected on the next tick via in-place update. No regression here.

### 5. Code quality

**Good overall.** Specific findings below.

---

## Findings by Severity

### Medium

**M1: ProgressBar.update() call signature may not reset position correctly**

In `update_data()`:

```python
bar.update(total=100, progress=pct)
```

`ProgressBar.update()` in Textual sets `progress` as an absolute value, but the bar was originally populated using `bar.advance(pct)` in `compose()`. Using `update(progress=pct)` after prior `advance()` calls should work correctly since `update()` sets the absolute progress value — but this is different from `advance()` which is additive. The semantics are correct here, but the asymmetry between `compose()` using `advance()` and `update_data()` using `update()` is a subtle inconsistency. It should be documented with a comment, or `compose()` should also use `update()` for consistency.

**M2: zip() silently truncates if card count diverges from agent count**

```python
cards = container.query(_AgentCard)
for card, agent in zip(cards, agents):
    card.update_data(agent)
```

`zip()` stops at the shorter sequence with no error. If `cards` and `agents` are ever out of sync (e.g. a previous mount failed partway through, or a Textual query returns stale results), some cards will silently not be updated. This is unlikely given that `_last_structural_keys` is only set after a full rebuild, but a defensive `assert len(list(cards)) == len(agents)` or at minimum `zip(cards, agents, strict=True)` (Python 3.10+) would make failures visible rather than silent.

### Low

**L1: _info_text() docstring is missing**

`_info_text()` is a module-level helper but has no docstring, while `_structural_key()` has one. Given that `_info_text()` is shared between `compose()` and `update_data()` (the core reason it was extracted), a one-line docstring would make the intent clear.

**L2: Tick interval changed from 5s to 1s without comment**

The base branch had `self.set_interval(5, self._tick)`. The PR branch sets it to `self.set_interval(1, self._tick)`. This change is implicitly justified by the fix (1s ticks are now cheap because they hit the fast path), but there is no comment or mention in the PR description. `_load_agents()` reads two JSON files from disk on every tick. At 1s intervals, that is 60 file reads per minute per agent list. On a typical dev machine this is trivially fast, but the change deserves a brief comment noting that the in-place update path makes the tighter interval acceptable.

---

## Positive Notes

- Extracting `_info_text()` as a shared helper is the right approach. It eliminates the previous duplication between `compose()` and the would-be `update_data()` path cleanly.
- `_structural_key()` is placed at module level rather than as a method, which is correct since it does not need any instance state.
- `_last_structural_keys` is initialized in `on_mount()` rather than `__init__()`, which is the correct Textual lifecycle point.
- The fast path returns early before any DOM queries on the rebuild path — the control flow is easy to follow.
- The "No agents configured." fallback is preserved and correctly handled on the rebuild path.

---

## Recommendations (prioritized)

1. **(M2 — before merge)** Switch to `zip(cards, agents, strict=True)` or add an assertion to catch count mismatches loudly rather than silently skipping updates.
2. **(M1 — before merge)** Add a comment in `compose()` noting that `update_data()` uses `bar.update(progress=...)` (absolute) while `compose()` uses `bar.advance()` (additive), confirming the semantics are intentionally different and both are correct.
3. **(L1 — minor)** Add a one-line docstring to `_info_text()`.
4. **(L2 — minor)** Add an inline comment on `set_interval(1, ...)` explaining why 1s is now acceptable.

---

**Verdict: Approve with M1 and M2 addressed.** The core approach is sound and the implementation is correct. The two medium items are defensive hygiene rather than correctness bugs given the current code paths, but they are easy fixes and worth doing before merge.
