<img align="right" width="150" src="https://raw.githubusercontent.com/ChurchApps/B1Admin/main/public/images/logo.png">

# B1Admin

[![License](https://img.shields.io/github/license/ChurchApps/B1Admin?style=flat-square)](https://github.com/ChurchApps/B1Admin/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/ChurchApps/B1Admin?style=flat-square&color=yellow)](https://github.com/ChurchApps/B1Admin/stargazers)
[![Last Commit](https://img.shields.io/github/last-commit/ChurchApps/B1Admin?style=flat-square)](https://github.com/ChurchApps/B1Admin/commits)
[![Sponsor](https://img.shields.io/badge/Sponsor-ea4aaa?style=flat-square&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/ChurchApps)
[![Slack](https://img.shields.io/badge/Slack-4A154B?style=flat-square&logo=slack&logoColor=white)](https://join.slack.com/t/livechurchsolutions/shared_invite/zt-i88etpo5-ZZhYsQwQLVclW12DKtVflg)

> **B1Admin** is completely free, open-source church management software that allows you to manage key data on church members and visitors. It offers comprehensive features including member and guest information tracking, attendance management with a self check-in app, group coordination, donation tracking with detailed reports, and custom form creation. Visit <a href="https://b1.church/">https://b1.church/</a> to learn more.

<p align="center">
    <img width="100%" alt="B1Admin demo — people, groups, attendance, and donations" src="https://raw.githubusercontent.com/ChurchApps/B1Admin/main/public/images/b1admin-demo.gif">
</p>

## 🚀 Self-Hosting (Beta)

Run your own private instance — B1Admin, the B1 member portal, the API, and a MySQL database.

### Docker

```bash
git clone https://github.com/ChurchApps/B1Admin.git
cd B1Admin
docker compose up -d
```

Then open http://localhost:3101 and register — the first account becomes the server admin. See the [Docker self-hosting guide](https://support.churchapps.org/docs/developer/deployment/docker) for custom domains, email, backups, and updating.

### Railway

Prefer managed hosting? Deploy the same stack with one click ([guide](https://support.churchapps.org/docs/developer/deployment/railway-template)):

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/b1-template)

## Get Involved

### 🤝 Help Support Us

The only reason this program is free is because of the generous support from users. If you want to support us to keep this free, please head over to [ChurchApps](https://churchapps.org/partner) or [sponsor us on GitHub](https://github.com/sponsors/ChurchApps/). Thank you so much!

### 🏘️ Join the Community

We have a great community for end-users on [Facebook](https://www.facebook.com/churchapps.org). It's a good way to ask questions, get tips and follow new updates. Come join us!

### ⚠️ Report an Issue

If you discover an issue or have a feature request, simply submit it to our [issues log](https://github.com/ChurchApps/ChurchAppsSupport/issues). Don't be shy, that's how the program gets better.

### 💬 Join us on Slack

If you would like to contribute in any way, head over to our [Slack Channel](https://join.slack.com/t/livechurchsolutions/shared_invite/zt-i88etpo5-ZZhYsQwQLVclW12DKtVflg) and introduce yourself. We'd love to hear from you.

### 🏗️ Start Coding

If you'd like to set up the project locally, see our [development guide](https://churchapps.org/dev). The short version is:

1. Copy `dotenv.sample.txt` to `.env` and updated it to point to the appropriate API urls.
2. Install the dependencies with: `npm install`
3. Run `npm run postinstall` to get language files
4. run `npm start` to launch the project.

### ⚙️ Payment Gateway Setup

To accept online donations you must first register for developer credentials with one of the supported payment providers:

- **Stripe**: Visit https://dashboard.stripe.com/register (or sign in at https://dashboard.stripe.com/login), then navigate to **Developers → API keys** to copy your Publishable Key and Secret Key for both test and live modes.
- **PayPal**: Go to https://developer.paypal.com/, log in or create an account, then under **My Apps & Credentials** create a new application to obtain your Sandbox and Live Client ID and Secret.
- **KingdomFunding**: Kingdom Funding is a payment processing option built with Christian values in mind! To get started:
  1. Visit the Kingdom Funding signup page (https://kingdomfunding.org/begin-registration/?sponsor=b1) and fill out the application form.
  2. Kingdom Funding will walk you through the account onboarding process, including identity verification and bank account setup.
  3. Once your account is approved, you will receive your API Source Key (private key) and Tokenization Key (public key) from the merchant portal.
  4. In B1Admin, go to **Settings → Giving Settings**, select **Kingdom Funding** as the provider, paste in your Public Key (Tokenization Key) and Private Key (API Source Key), and save.
  5. **Configure the webhook URL in your Kingdom Funding (NMI) merchant portal** so the system gets notified about transaction state changes (recurring charges, ACH settlements, returns):
     - URL: `https://api.churchapps.org/giving/donate/webhook/kingdomfunding?churchId={YOUR_CHURCH_ID}` (replace `{YOUR_CHURCH_ID}` with the church ID from B1Admin — the exact URL is also shown with a copy button in Giving Settings when Kingdom Funding is selected)
     - Kingdom Funding does not generate a signing key for you: choose your own secret, enter it on the webhook endpoint in the merchant portal, and paste the same value into the **Webhook Key** field in B1Admin's Giving Settings. Both sides must match — webhooks are rejected if the key is missing or wrong.
     - Subscribe at minimum to: `transaction.sale.success`, `transaction.auth.success`, the refund events, and the ACH `check.*` status events (e.g. `check.status.settled`, `check.status.returned`).

After obtaining your tokens, open **Settings → Giving Settings** in B1Admin, select the provider, paste in your Public and Private keys, and toggle "Pay Fees" as desired. Finally, configure your fee parameters in **Fee Options**.

[![B1Admin Dev Setup](https://img.youtube.com/vi/5zsEJEp6yMw/0.jpg)](https://www.youtube.com/watch?v=5zsEJEp6yMw)

### AWS Self-Hosting

To deploy B1Admin into your own AWS account, or update an existing AWS install, start with the [AWS self-hosting guide](./infrastructure/environments/start-here.md).
