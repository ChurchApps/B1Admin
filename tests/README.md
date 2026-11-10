# Tests

Three tiers, picked by when they run:

| Tier | When | Command |
|---|---|---|
| Smoke | After every demo deploy (`deploy-demo.yml`) | `SMOKE_BASE_URL=https://demo.b1.church SMOKE_EMAIL=demo@b1.church SMOKE_PASSWORD=password SMOKE_CHURCH="Grace Community Church" yarn test:smoke` |
| Affected | Before pushing a PR branch | `yarn test:affected` |
| Full | Nightly | `yarn test` |

**Smoke** (`tests/smoke/`, `playwright.smoke.config.ts`) runs against the demo site as the demo user and only reads. It opens each main section with a real login, waits for the request that loads the section's data, and fails on any uncaught page error or a 5xx from our API. Without `SMOKE_EMAIL`/`SMOKE_PASSWORD` only the public checks run; set `SMOKE_REQUIRE_AUTH=1` to make that an error. `SMOKE_CHURCH` picks the church when the account has several. Smoke never runs against production: `playwright.smoke.config.ts` refuses any host that is not a demo or local host.

**Affected** runs the specs for the areas your branch changed, from `tests/areas.json`, plus any spec you edited and `always` (navigation). A changed file in no area is treated as shared code and runs the whole suite. `yarn test:affected --list` shows the selection; anything after `--` goes to Playwright (`yarn test:affected -- --workers=1`). It needs the local demo stack like `yarn test`.

**Naming.** Name specs after the area and behavior (`serving-plans-breadcrumb.spec.ts`), not the issue number, and add new files to an area in `tests/areas.json`. `yarn test:areas` (also a PR check) fails if a spec is in no area.
