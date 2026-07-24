# Customer Values Worksheet

Collect these values before configuring prod or optional staging.

The guided installer stores these values in `../b1admin-deploy/customer-values.json`.
You do not need to edit that JSON file by hand.

The normal setup command creates the file when it does not already exist:

```bash
yarn installer:init -- --deploy-repo-dir=../b1admin-deploy --output=markdown
```

Then answer the customer setup questions:

```bash
yarn installer:customer-values -- --customer-file=../b1admin-deploy/customer-values.json --write=true --output=markdown
```

Keep `customer-values.json` local. Do not commit it.

Required:

- AWS account ID
- AWS region, normally `us-east-1`
- private deployment repository name, for example `your-org/b1admin-deploy`
- root domain, for example `example.com`
- support email address, for example `support@example.com`
- support phone number
- first admin email address
- temporary first admin password
- first church name

Recommended:

- B1Admin source repo and branch, normally `ChurchApps/B1Admin` and `main`
- Api source repo and branch, normally `ChurchApps/Api` and `main`

Optional frontend custom domain:

- frontend hostname, for example `admin.example.com`
- ACM certificate ARN for that hostname
- Route53 hosted zone ID

The frontend ACM certificate must be in `us-east-1` because CloudFront requires it there.

You may leave frontend custom-domain values blank. In that case the first deploy uses a generated CloudFront URL. After that first deploy, the guided runner will ask you to adopt that generated frontend URL so the backend accepts it for browser login.

Leave API custom-domain values blank for the normal install. The stack will use the generated API Gateway URL.

[Back to Start Here](../start-here.md)
