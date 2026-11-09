# Last Minute Bites: instructions for coding agents

These instructions apply to this repository. Read this file and README.md before
editing. This is a working course prototype with persistent live users and food
records. Keep changes proportional to the user's task; preserve unrelated work.

## Start here

- The current application is `static/` + `web/`, deployed as a Cloudflare Worker
  with a SQLite-backed Durable Object. It is plain JavaScript, HTML and CSS.
- The source integration branch is `codex/last-minute-bites-prototype`.
  Check the current branch and worktree first. Use the user's selected branch;
  new teammate feature branches should start from the integration branch.
  Do not assume `main` contains the latest prototype. Never force-push.
- `server.py`, WSGI, legacy deployment scripts and their tests are legacy
  compatibility/reference code. Editing them alone does not change the current
  live app. Do not migrate the product back to that backend as a shortcut.
- `docs/VALIDATION.md` contains dated historical results. `design/` contains older
  mockups, including obsolete fixed recipes. Use current code, README.md and the
  user's latest requirements to resolve differences.
- Keep documentation and UI focused on Last Minute Bites. Refer to deployment
  dependencies by their role, such as the private AI service; do not introduce
  unrelated project names, features or validation results. Preserve the actual
  runtime identifiers in configuration so this wording cleanup cannot break
  deployed services.
- Communicate with the team in clear Traditional Chinese by default. The UI is
  bilingual English / Traditional Chinese; add both translations through the
  existing `words` / `t()` mechanism rather than hardcoding one language.

## Architecture and ownership

| Area | Entry points |
| --- | --- |
| UI, hash routes, forms, selection and viewport / keyboard behavior | `static/app.js`, `static/index.html`, `static/style.css` |
| Installation, QR tools, browser notifications and shell cache | `static/mobile.js`, `static/notifications.js`, `static/sw.js` |
| HTTP API, authentication, CSRF, actor locks, SQL and AI snapshots | `web/worker.js` |
| Multi-kitchen migration, membership context, party grants / expiry | `web/kitchens.js` |
| Date / quantity / consumption / password primitives | `web/domain.js` |
| Recipe prompt, schema validation and one-dish replacement | `web/ai.js` |
| Food-name rules and classification validation | `web/food-classifier.js` |
| Real DeepSeek adapter, exported as a private RPC from another Worker | `web/ai-gateway.js` |
| Notification persistence / scheduling and Web Push cryptography | `web/push-service.js`, `web/web-push.js` |

All users and kitchens currently share the same Durable Object; isolation is
implemented through server-side membership and kitchen checks, not separate
objects per account. Preserve those checks for every read, write and AI result.

## Product invariants

### Food, quantities and dates

- Food records represent purchase batches. Never merge same-named food across
  batches, dates or kitchens implicitly. Preserve unknown legacy quantities.
- Use existing quantity validation and thousandth-unit arithmetic. Check record
  versions and permissions before mutation. Multi-food consumption is atomic:
  any invalid, stale or excessive item rolls back the entire operation.
- Viewing / generating / replacing a recipe never changes stock. Consumption
  requires the user's explicit confirmation of actual quantities.
- Keep category separate from storage location. Automatic category suggestions
  must still allow manual correction; reject obvious non-food entries.
- Preserve date provenance: package Use by, Best before, production calculation,
  personal reminder, and unknown dates are distinct. Past Use by is excluded
  from recipes. Do not describe every past date as unsafe.
- Classification and photo recognition do not certify safety, freshness, expiry
  or quantity. Recognition is a suggestion and does not save food automatically.

### Recipes

Preserve the displayed order and default UI recommendation:

1. `stock_first`: selected stock anchors each dish; approved pantry seasonings
   are allowed; at most two distinct purchased ingredient types for the meal,
   including retained purchases during replacement.
2. `plan`: selected stock anchors the meal when present; extra purchases and
   complementary sides are allowed, without the two-type cap. Empty selections
   may be used to plan purchases.
3. `use_up`: recorded stock and tap water only. No unrecorded pantry ingredients,
   even for a single selected food.

- `uses`, `seasonings`, and `additional` have different meanings; validate all
  three. Never invent food IDs, units, stock quantities or pantry availability.
- Keep the user's people / portions / time / avoid / taste settings and food
  selection visible and stable. Dietary exclusions override pantry defaults.
- A one-dish replacement reserves the stock and purchases used by retained
  dishes. Preserve those dishes and reject stale inventory or changed access.
- Call AI only after explicit generation / replacement / relevant classification
  or photo actions. Background polling, navigation and typing rule lookups must
  not generate paid recipes. On failure retain existing results / manual entry;
  do not disguise fixed or fixture recipes as real AI output.
- AI calls run outside the actor's short lock. Recheck session, membership,
  party validity, source grants and inventory versions after the provider returns.

### Multiple kitchens and parties

- Membership uniqueness is `(user_id, kitchen_id)`. Roles are per kitchen.
  Leaving or removing a member must not delete their other memberships.
- Browser mutations carry explicit `X-Kitchen-ID` context. Do not let a different
  tab's session-default switch redirect a pending write into another kitchen.
- **Cross-kitchen recipe generation belongs only to party mode.** Ordinary
  kitchens remain isolated. A party is a temporary kitchen, not a fourth recipe
  generation strategy; all three strategies can be used within a party.
- Only a source kitchen's owner can grant its stock to a party they have joined.
  Sharing must be explicit. Refer to original batches rather than copying stock;
  confirmed consumption updates those original quantities transactionally.
- Party members cannot edit/delete borrowed source records through party CRUD.
  Follow existing endpoint permissions for consumption and undo operations.
- Revocation, departure and member removal must stop sharing immediately.
  Rejoining requires a fresh source grant. Expired/ended parties stop live source
  access, invitations, new generation and food changes; retain saved history and
  original stock. Do not auto-delete source food or reverse prior consumption.

### Mobile / PWA / notifications

- Preserve the existing scroll-container, fixed dock and visualViewport behavior.
  Test narrow and short viewports, large text, wrapped labels and focused inputs.
  Do not rerender active forms on every poll or lose input, IME state or caret.
- Keep food source / batch labels visible in party selection and consumption.
  Do not add large introductory copy that pushes the primary interface away.
- Notification permission requires an explicit action. Preserve iOS Home Screen
  guidance, opt-out, authenticated subscription ownership and generic lock-screen
  payloads. The current subscription follows one kitchen per device.
- Respect account timezone, daily deduplication, active membership and party
  expiry in both schedule selection and delivery rechecks.
- Service worker caches the public shell only, never API results or private user
  data. Bump its shell cache version when changing cached UI assets.

## Data and secrets

- Preserve production accounts, memberships, food and active sessions. Do not
  reseed, clear live data, or silently create a replacement storage namespace.
- Stable production identities: Worker `last-minute-bites-demo`, binding
  `KITCHENS`, class `KitchenStore`, object `shared-kitchens-v1`. Treat changes as
  data/architecture changes, not cosmetic renames.
- Keep SQLite migrations atomic and idempotent. Test existing data preservation
  and rollback; leave existing migration markers intact when adding migrations.
- Never commit `.env`, `.data`, `.wrangler`, databases, credentials, session
  cookies, push private keys or private screenshots. Existing trial passwords
  must stay out of documentation, source and course packages.
- DeepSeek secrets stay in the existing private RPC host. Do not put API keys in
  the browser, copy them between projects, or bypass server validation via a new
  public proxy endpoint. Preserve TLS verification and normal network settings.
- Use synthetic data for testing. Live AI and push tests can consume quota or
  affect real services; keep routine validation local with fixtures. Do not add
  a paid provider or billing merely to make a local test run.

## Local development and verification

Use Node.js 24 and Python 3.12. Setup and two-terminal startup commands are in
README.md. The maintained test environment runs the fixture on port 8791 and
`web/wrangler.test.jsonc` on port 8790. Both Wrangler processes must be running.
The fixture is a fake AI/push transport, not evidence of model quality or phone
receipt. Never deploy it or change production configuration to bind to it.

Run appropriate checks for the actual change:

```sh
npm --prefix web run check
npm --prefix web test
node --check static/app.js
node --check static/mobile.js
node --check static/notifications.js
node --check static/sw.js
```

For behavioral changes, add meaningful regressions to the corresponding Worker
unit / API / browser tests. Set `LMB_WEB_BASE_URL=http://127.0.0.1:8790` for local
API/browser tests. Set `LMB_TEST_CHROMIUM` to Playwright's installed executable
if `/usr/bin/chromium` is absent; README.md gives the command. Examples:

| Change | Relevant acceptance files under `tests/` |
| --- | --- |
| Kitchens, grants, session context, migrations | `web/kitchens.test.mjs`, `multi_kitchen_api.py`, `multi_kitchen_browser.py` |
| Recipe modes / selection / replacement | `recipe_modes_api.py`, `recipe_modes_browser.py`, `recipe_builder_api.py`, `recipe_builder_browser.py` |
| Food amounts / use / restore | `stock_api_contract.py`, `stock_browser.py`, `consume_browser.py` |
| Classification / dates / expiry | `classification_api.py`, `classification_browser.py`, `personal_dates_browser.py`, `expiry_alert_browser.py` |
| Keyboard and responsive UI | `auth_keyboard_browser.py`, `user_fixes_browser.py`; also relevant feature browser test with `LMB_WEB_ENGINE=webkit` |
| Notifications | `push_api_contract.py`, `push_browser.py`, `push_service_worker.py`, `web/push.test.mjs` |
| Auth / sharing / baseline app | `web_api_contract.py`, `web_browser.py` |

The full maintained suite and its order are in `.github/workflows/checks.yml`.
`python -m unittest discover -s tests -v` checks the legacy Python backend and is
also included in CI; it does not replace Worker verification. Do not use the
old standalone `tests/browser_smoke.py` flow as the current feature acceptance
suite (its helpers are still reused). Do not send synthetic `CF-Connecting-IP`
headers to public Cloudflare hosts; local tests guard those headers by hostname.

Documentation-only changes need link / command / diff review, not new behavior
tests or live redeployment. Do not rerun paid live model tests just to verify docs.
Distinguish local fixtures, browser emulation, real provider calls and physical
phone receipt in reports; never claim one proves another.

## Source, deployment and delivery

- This source repository's CI does not deploy the website. The maintainer manages
  a production mirror with this application's files under `apps/last-minute-bites/`
  and a `last-minute-bites.yml` deployment workflow. Confirm its authorized
  location with the maintainer when deployment access is needed.
- When a task authorizes a live product update, sync relevant production files
  to that mirror and follow its own AGENTS.md too. Preserve existing service
  bindings, stored data and the private `FoodAI` export/import dependencies.
  Deploy the AI service before the food Worker. Do not deploy test configuration.
- Use existing configured credentials and workflows. If deployment access is
  missing, finish local work and report the specific remaining step without
  requesting secret values in chat or pretending the source push deployed it.
- Verify authorized deployments with `/healthz` and relevant live behavior,
  preserving existing data. Do not change repository visibility or invite GitHub
  collaborators unless the user requests that separately.
- Keep README.md aligned when setup, architecture, deployment, scope or product
  rules change. Do not create surveys or a formal user guide unless requested.
- `python3 scripts/package.py` builds `submission/S01G10.zip` from Git-tracked
  source. Stage new files first, regenerate the package when updating the course
  handoff, and inspect it for runtime data/credentials. Never hand-edit the ZIP.
- Report what changed, what was actually checked, where it was pushed, and any
  remaining limitation. Do not claim a merge or deployment that did not occur.
