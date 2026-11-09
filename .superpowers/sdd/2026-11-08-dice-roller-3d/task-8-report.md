# Task 8 implementation report

Implemented `src/store.ts` with Zustand v5 `create`, the requested state/defaults and actions. The gesture reducer remains the source of phase transitions. Selection changes invalidate throws, clear launch/fixture/results/force, and increment the throw ID. Release creates one seed and a launch containing copied aim and hand vectors plus the reducer's release force. Missing optional hand motion uses the configured hand center and zero angular velocity. Fixture poses and published results are copied as well.

Publication accepts only the current ID while rolling. It applies the reducer's `published` event in the same state update as results, so subscribers receive an atomic settled/result snapshot. This uses the same reducer transition as `input({ type: 'published' })` directly rather than issuing two store updates. Return effects retain results. Readiness is state for the future UI to enforce; the pure gesture action is not readiness-gated.

## Red / green evidence

- Before implementation: `npm test -- tests/store.test.ts` exited 1, failing to import the missing `../src/store` (one failed suite).
- After implementation: `npm test -- tests/store.test.ts` exited 0, all five exact brief tests passed.
- Added three regression tests for release-vector isolation and stable launch force/seed, fixture/selection stale-publication invalidation, and copied results retained through return then cleared on a new throw.
- Final `npm test` exited 0: eight suites, 95 tests passed.
- Final `npm run lint` exited 0.
- Final `npm run build` exited 0: TypeScript and Vite production build passed.

## Self review

Scope is the new store, its tests, and this report; no existing runtime modules or dependency/configuration files changed. Reviewed against gesture reducer behavior, Launch, Vec3/Quat, DieKind, and HAND interfaces. External vector mutation and subsequent aim/force updates cannot rewrite launch snapshots. Results/phase publish atomically and old throw IDs cannot publish after a selection or new fixture. Existing gesture and physics suites remain green. Count clamping follows the requested numeric range; UI validation of noninteger/nonfinite input is outside this typed action contract. No browser checks were needed for this pure store task; integration and UI readiness wiring belong to later tasks.

Commit uses the configured local identity, the prescribed Task 8 subject, and no coauthor trailer. No push performed.
