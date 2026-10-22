# Assignment confirmation workflow preview

Requires the companion Api change and Doing migration `2026-10-22_assignment_confirmation_workflows` before deploying this Admin change. No shared Packages release is required. The new API fields are augmented locally to keep rollout independent of package publishing.

Create the **Serving Assignment Confirmation** workflow from the template (Tasks Admin + Texting Send), edit its steps/default call assignee, and select it in the plan's settings. Publish and Notify starts one case for each new unconfirmed request. Existing app alerts remain; confirmation email/SMS uses the workflow. Recording a call as done keeps the case open and assigned until a response or follow-up deadline. Acceptance or decline ends that case; an unanswered response deadline produces a coordinator review task. Native service reminders take over after acceptance.

The preview uses the actual plan editor, workflow action editor, plan issuance UI and card drawer with synthetic fixtures. It needs no login, church data, database or providers. Every API method is replaced locally, and the browser tests reject non-local network requests. A transitive apphelper import can attempt to load Stripe.js; the test blocks it and the unused loader logs a warning.

```sh
yarn exec playwright install chromium
yarn exec playwright test -c playwright.confirmation.config.ts
```

The dedicated configuration deliberately avoids the main suite's authenticated global setup and database reset. It serves on port 3312, preserving other previews.

For interactive review:

```sh
yarn start --host 127.0.0.1 --port 3312
```

Open `http://127.0.0.1:3312/tests/fixtures/assignment-confirmation/`. All names, addresses, phone numbers, IDs and activity are synthetic. The browser suite captures the action editor and assignment card under ignored `test-results/`.
