# Task 9 implementation report

Implemented the R3F gem scene, visible wooden/wine velvet tray, procedural environment, explicit Rapier colliders and a test-mode observation hook. All seven selections use `bodiesFor`; percentile selections create paired tens/units bodies. Bodies remain `kinematicPosition`, with CCD, one explicit convex hull each, fixed 1/60 physics and interpolation disabled. The existing `main.tsx` already wires App, CSS and StrictMode, so no unnecessary change there. Existing title/lang already matched the brief; index now includes an inline SVG favicon to eliminate Chrome's `/favicon.ico` 404.

The nonindexed gem geometries use flat triangle normals and dispose explicitly on unmount/selection. Text uses the local licensed 800 font, exact gold `#D4A93F`, the model's position/normal/up, a cloned position offset by normal × 0.002, and depthOffset −1. The polyhedron's arrays are never mutated. Marked numerals follow the existing model's `marked` boolean: d6 uses `6`; d10 plain, d12 and d20 use `6.`/`9.`; percentile tens remain `00`–`90`.

One external `useFBO` is shared by all transmission materials. A default-priority frame callback hides the entire dice group (including numerals), captures the scene, and restores render target, tone mapping and visibility in `finally`. The material's external buffer bypasses drei's per-die capture branch. PerformanceMonitor halves the external target size down to 256 and samples down to 2, and restores them up to 1024/6. Three Lightformers render into the 256px procedural Environment; no HDRI or font CDN is used.

The hook is installed only in Vite `MODE === 'test'`. Body observations come from Rapier; mesh quaternions and label text/world positions/world normals come from the actual gem and Text objects. No result-reading function or synthesized label transform is used. Keys contain kind/count/index, preserving bodies through same-selection state updates. `tsconfig.test.json` adds `vite/client` because the e2e global declaration imports the hook's ImportMeta.env guard.

## Validation

- RED: `npm run e2e -- e2e/smoke.spec.ts --timeout=10000 --max-failures=1` exited 1 after the expected missing-hook readiness timeout. Stopped after that first failure.
- Initial implementation: all three original smoke scenarios passed on installed Chrome. No `--enable-unsafe-swiftshader` was needed; Playwright configuration is unchanged.
- Final `npm run build`: exit 0, TypeScript and Vite passed (580 modules). Vite reports the expected large 3D/WASM bundle warning, approximately 3.60 MB / 1.23 MB gzip.
- Final `npm run lint`: exit 0, no warnings. The specified GEM export has a narrow Fast Refresh lint exception; Three camera changes use its object methods.
- Final `npm test`: exit 0, 8 suites / 95 tests passed.
- `npm run e2e -- e2e/smoke.spec.ts e2e/screens.spec.ts --max-failures=1`: all 10 screenshot tests (30 captures) and the first 5 smoke tests passed. The 20→2 regression exposed stale body registration, fixed as described below.
- Final `npm run e2e -- e2e/smoke.spec.ts --max-failures=1`: exit 0, all 6 smoke tests passed in 24.0s after the registry fix, including the 20→2 regression. Build and lint were rerun afterward and passed. The cleanup-only fix does not change rendered output, so the 30 successful screenshots were retained.
- `git diff --check`: exit 0; only Windows line-ending notices.

Browser checks cover context/renderer reporting, nonuniform canvas pixels and no console/page errors, d6 identity top/bottom, all seven shape selections and marked glyph sets, rotated actual Text anchors/normals, physical/render quaternion agreement, twenty percentile bodies, same-selection body reuse and cleanup when reducing count. Screenshot tests assert successful colored render, visible gold pixels, expected labels, quaternion convergence, no console/page errors, and nonbackground pixel bounds inside all four viewport edges.

During verification, exact float equality in the screenshot test was replaced with a 1e-5 tolerance for normalized world quaternions. A rotated-label test initially captured the pre-pose identity position; it now waits for the actual Text centroid. These were test synchronization/precision fixes. A genuinely coplanar wood/velvet top was also fixed by lowering the wooden base beneath the velvet.

The final capacity regression found that installed Rapier's callback ref fires on creation but never with null on disposal. Reducing count therefore left removed body handles in the Stage registry. Die now uses a stable registration callback and an explicit passive-effect unregister cleanup. React runs old passive cleanups before new passive setups; the wrapper creates/registers new bodies during those setups. StrictMode is enabled throughout the successful browser tests. Repeated same-selection updates preserve all 20 handles, and changing to two d6 leaves exactly two bodies and meshes, with no stale WASM reads.

## Visual review and approved adjustments

Captured and inspected all 30 requested images: d4, d6, d10, d20 and d10 tens × identity, X35°, Y120° × 1440×900 and 390×844. They are saved under `screens/one-<shape>-<orientation>-<width>.png` (ignored generated artifacts). Full-frame and magnified detail contact sheets cover every image:

- [Desktop frames](../../../screens/contact-full-1440.png) and [desktop details](../../../screens/contact-detail-1440.png).
- [390px frames](../../../screens/contact-full-390.png) and [390px details](../../../screens/contact-detail-390.png).

All glyphs stay on their faces, without clipping into the gem or depth fighting. Desktop numerals are readable. The tray fits completely at both widths. Mobile shapes and gold markings remain visible; the d4 corner values, d20 two-digit faces and percentile tens are still physically small at 390px, especially on oblique faces. Do not treat a magnified contact sheet as evidence that every mobile numeral is comfortably readable at native size. This residual scale limit is reported to the controller for the final whole-app visual gate.

P9 / spec 3.1: literal camera [0,14,10] with fov40 clips the tray in portrait. Desktop retains that pose. Below aspect1.6, a corner-fit calculation increases camera distance along the same fixed viewing direction, preserving fov40 and the target [0,0,0]. It includes the visible rim and the maximum 20-body hand envelope and uses a 6% framing margin. The 390px tray uses approximately 365px of the viewport, improving on the initial overly distant framing. There are no orbit controls and selection does not change the camera.

P10: transmission is 0.9, retaining the exact gem palette, material type, thickness0.6, ior1.6, chromaticAberration0.06 and roughness0.05. The small diffuse contribution and broader procedural highlights reveal the gem colors above dark wine velvet. Per the brief's visual adjustment allowance, final FONT values are d4 .23, d6 .48, d8 .36, d10 .32, d12 .34, d20 .27; tens .25. Gold and depthOffset remain exact.

## Self review and scope

Reviewed spec 3.1/3.2/4.6/4.7, the local Three.js references from CLAUDE.md, and installed drei MeshTransmissionMaterial/Text/useFBO/PerformanceMonitor and Rapier sources. Only scene/test integration is implemented; throwing, hand interaction, settlement orchestration and UI remain Tasks 10–12. Dependency manifests/lockfiles and Playwright launch flags are unchanged. Upstream deprecation console warnings (Three Clock/shadow mode and Rapier init signature) are informational; no console errors occurred in successful browser checks. No provider sessions were touched. Local commit uses the configured identity and prescribed subject, with no coauthor trailer or push.

## Review fix round 1

Addressed the mobile legibility review by using substantially more of the existing face area: d4 font .33, d20 .42 and percentile tens .39. Other sizes remain unchanged. A very thin outline, 2% of font size in ink `#140E10`, separates the unchanged gold fill from bright gem reflections. Surface anchors, up/normal basis, depth offset, camera and gem material remain unchanged; no zoom feature was added. These values supersede the earlier visual adjustment values above.

Reviewed every affected shape at identity, X35° and Y120° in native 390×844 captures, and used desktop details to inspect face edges. Face-on d4 digits, d20 values and percentile tens are now distinguishable at native size, with no visible glyph overlap or spill across face edges in the three orientations. The controller independently inspected the same native sheets and agreed that face-on values are distinguishable. Values on narrow, oblique faces remain small and foreshortened; this is an honest residual of fitting the entire tray, rather than an assertion that every visible face reads equally well.

Native sheets preserve each screenshot's 390px width without resizing:

- [d4 native three angles](../../../screens/native-d4-390.png)
- [d20 native three angles](../../../screens/native-d20-390.png)
- [percentile tens native three angles](../../../screens/native-d10-tens-390.png)

The underlying `screens/one-{d4,d20,d10-tens}-{identity,x35,y120}-{1440,390}.png` captures and desktop/detail contact sheets were updated. Screenshot color/gold checks establish rendering, not readable values; the native visual inspection provides that assessment.

The quaternion smoke assertion now checks `abs(dot(body.q, mesh.q)) ≈ 1`, accepting the equivalent whole-quaternion sign reversal while rejecting unrelated component sign changes.

Commands/output for this fix:

- `npm run e2e -- e2e/screens.spec.ts --grep "d4|d20|d10-tens" --max-failures=1` → exit 0, 6 passed (39.0s), 18 affected captures.
- `npm run e2e -- e2e/smoke.spec.ts --max-failures=1` → exit 0, 6 passed (23.6s), including body reuse/cleanup and the revised quaternion assertion.
- `npm run build` → exit 0, 580 modules transformed; same informational large-bundle warning.
- `npm run lint` → exit 0, no warnings.
- `git diff --check` → exit 0, Windows line-ending notices only.

No new test scenarios, physics logic, dependency changes or future-task work were introduced in this fix. The 95 unit tests from the initial task gate remain applicable; this review wave changes only Text sizing/outline and the smoke assertion.
