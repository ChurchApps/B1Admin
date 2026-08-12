# Operations After Launch

This page covers what to do after B1Admin is live: updates, backups, secrets, and cost control. It assumes the guided installer path from [Start Here](./start-here.md).

## Routine Updates

Run updates from the same operator machine, on your schedule:

```bash
yarn installer:update -- --environment=prod --output=markdown
```

Before updating production:

- Pick a quiet time. Updates are not guaranteed to be zero-downtime.
- Confirm a recent database backup exists (see Backups below).
- If you run staging, update and check staging first.

## Pin Versions Instead of `main`

By default the installer deploys the latest `main` branch of both the B1Admin and Api repositories. That is convenient but means every deploy may pick up untested changes, and the two repositories are not guaranteed to have been tested together on any given day.

For a production install you plan to keep stable, pin both to a release tag or a specific commit:

1. Run `yarn installer:customer-values` and set "B1Admin source branch or tag" and "Api source branch or tag" to the same release tag (or a commit SHA you have verified together).
2. When you want new features, update both values deliberately, deploy to staging or verify carefully, then update prod.

Avoid mixing a pinned frontend with an unpinned `main` backend or vice versa; the two move together.

## Backups and Restore

The Aurora database is the only place your data lives. Everything else (Lambda functions, the website files) is rebuilt from source on every deploy.

- Aurora takes automated daily backups. You can also take a manual snapshot any time from the AWS console: RDS > Databases > select the `b1admin-prod-cluster` > Actions > Take snapshot. Take one before every production update.
- To restore: RDS > Snapshots > select the snapshot > Actions > Restore snapshot. This creates a NEW cluster; restoring into the running stack is an advanced operation — if you are not comfortable with it, restore the snapshot, verify the data, and ask for help re-pointing the stack before deleting anything.
- Never delete the running cluster to "clean up." Use `yarn reset:prod -- --dry-run=true` first for any teardown, and read what it plans to do.

## Secrets

The application secrets (JWT signing key, encryption key, third-party API keys) live in AWS Secrets Manager under `b1admin/<environment>/app-config`.

- To change a value (for example, a new payment-gateway key): edit the local `app-config-secret.json`, run `yarn installer:app-config-secret` / the sync step, and then **run a deploy**. Secret values are applied to the running functions at deploy time, so editing the secret alone does not change the running system.
- Rotating `jwtSecret` signs everyone out; rotating `encryptionKey` can make previously encrypted values unreadable. Do not rotate those two casually — treat them as "only if compromised."
- The first-admin temporary password should have been changed at first sign-in. If not, change it now in the app.

## Cost Control

- Create a billing alert once: AWS console > Billing and Cost Management > Budgets > Create budget. A monthly cost budget with an email alert at your expected amount (see [What Costs Money?](./start-here.md#what-costs-money)) catches surprises.
- After any `reset:staging` / `reset:prod`, Aurora leaves a final snapshot by design. Snapshots cost money monthly. When you are sure you do not need one: RDS > Snapshots > select it > Actions > Delete snapshot.
- The NAT gateway (about $33/month) is required for outbound connections to non-AWS services: payment gateways (Stripe/PayPal), Mautic, YouTube lookups, and outgoing email through SES's API. Only set `CreateNatGateway` to `"false"` if you use none of those; AWS-internal features (database, secrets, file storage, text-to-speech, WebSocket pushes) keep working through private endpoints, which have their own smaller cost (roughly $8/month per endpoint).

## Logs and Troubleshooting

- Application logs: AWS console > CloudWatch > Log groups > `/aws/lambda/b1admin-prod-api` (and the other `b1admin-prod-*` groups).
- Deploy history and logs: your private repository on GitHub > Actions.
- Local readiness report any time: `yarn installer:doctor -- --output=markdown`.

[Back to Start Here](./start-here.md)
