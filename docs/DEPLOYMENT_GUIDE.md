# AnnoBib Deployment Guide

Step-by-step instructions for setting up the production infrastructure on Google Cloud Platform.

**Prerequisites:**

- A Google account with billing enabled
- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- `terraform` CLI installed (>= 1.5.0)
- `kubectl` installed
- `helm` installed (v3)
- Domain `annobib.com` registered and DNS accessible

---

## Step 1: Create GCP Projects

You need two separate projects for blast-radius isolation.

```bash
# Create the staging project
gcloud projects create annobib-staging --name="AnnoBib Staging"

# Create the production project
gcloud projects create annobib-prod --name="AnnoBib Production"
```

Link both projects to your billing account:

```bash
# List your billing accounts to get the ID
gcloud billing accounts list

# Link billing (replace BILLING_ACCOUNT_ID)
gcloud billing projects link annobib-staging --billing-account=BILLING_ACCOUNT_ID
gcloud billing projects link annobib-prod --billing-account=BILLING_ACCOUNT_ID
```

**Write down your billing account ID** -- you'll need it for the Terraform tfvars files.

---

## Step 2: Enable Required APIs

Run these for **both** projects:

```bash
for PROJECT in annobib-staging annobib-prod; do
  gcloud services enable \
    container.googleapis.com \
    sqladmin.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    monitoring.googleapis.com \
    compute.googleapis.com \
    servicenetworking.googleapis.com \
    iam.googleapis.com \
    cloudresourcemanager.googleapis.com \
    billingbudgets.googleapis.com \
    --project=$PROJECT
done
```

---

## Step 3: Create Terraform State Bucket

Terraform needs a GCS bucket to store its state files. Create it in the production project:

```bash
gcloud storage buckets create gs://annobib-terraform-state \
  --project=annobib-prod \
  --location=us-central1 \
  --uniform-bucket-level-access

# Enable versioning for safety
gcloud storage buckets update gs://annobib-terraform-state --versioning
```

---

## Step 4: Update Terraform Variables

Edit the tfvars files with your actual values:

**`infra/terraform/environments/staging.tfvars`:**

```hcl
notification_email    = "your-email@example.com"
billing_account_id    = "YOUR_BILLING_ACCOUNT_ID"
```

**`infra/terraform/environments/production.tfvars`:**

```hcl
notification_email    = "your-email@example.com"
billing_account_id    = "YOUR_BILLING_ACCOUNT_ID"
```

You also need to set the database password. Create a file that won't be committed:

```bash
# Generate a strong password
export DB_PASSWORD=$(openssl rand -base64 24)
echo "Save this password somewhere secure: $DB_PASSWORD"
```

---

## Step 5: Provision Staging Infrastructure

```bash
# Initialize Terraform for staging (note the backend-config for state isolation)
pnpm ops:tf:init -- staging

# Review what will be created
pnpm ops:tf:plan -- staging

# Apply (you'll be prompted for the db_password -- paste the one you generated)
pnpm ops:tf:apply -- staging
```

This will take 10-15 minutes. It provisions:

- VPC network with private subnets and Cloud NAT
- GKE cluster (1-3 spot e2-medium nodes)
- Cloud SQL PostgreSQL (db-f1-micro)
- Artifact Registry for Docker images
- Cloud Storage bucket for uploads
- IAM service accounts with Workload Identity
- Monitoring alerts and budget alerts
- Cloud Build service account IAM roles
- **Cluster add-ons** (all managed as IaC via Terraform Helm provider):
  - nginx-ingress-controller with LoadBalancer
  - cert-manager with Let's Encrypt ClusterIssuer
  - External Secrets Operator with GCP ClusterSecretStore
  - Application namespace (`annobib-staging`)

After completion, note the outputs:

```bash
cd infra/terraform && terraform output
```

Get the ingress external IP (needed for DNS):

```bash
gcloud container clusters get-credentials annobib-staging-gke \
  --region us-central1 \
  --project annobib-staging

kubectl get svc -n ingress-nginx ingress-nginx-controller
```

**Write down this IP address** -- you'll need it for DNS.

---

## Step 6: Configure DNS

Go to your domain registrar (wherever you registered annobib.com) and create these DNS records:

| Type | Name      | Value                  | TTL |
| ---- | --------- | ---------------------- | --- |
| A    | `staging` | `<staging-ingress-ip>` | 300 |

**Note:** Production DNS records (`@` and `www`) will be added after provisioning production in Step 10.

After DNS propagates (5-30 minutes), the TLS ingress is already defined in `infra/k8s/overlays/staging/` and will be applied during the first deploy.

---

## Step 7: Populate Secret Manager (Staging)

Store your secrets in GCP Secret Manager for the staging environment:

```bash
PROJECT=annobib-staging

# Database URL (Cloud SQL Proxy runs as sidecar, so localhost)
echo -n "postgresql://annobib_app:YOUR_DB_PASSWORD@localhost:5432/annobib" | \
  gcloud secrets create DATABASE_URL --data-file=- --project=$PROJECT

# Auth0 (use a separate staging application/tenant)
echo -n "your-staging-tenant.auth0.com" | \
  gcloud secrets create NUXT_AUTH0_DOMAIN --data-file=- --project=$PROJECT

echo -n "your-staging-client-id" | \
  gcloud secrets create NUXT_AUTH0_CLIENT_ID --data-file=- --project=$PROJECT

echo -n "your-staging-client-secret" | \
  gcloud secrets create NUXT_AUTH0_CLIENT_SECRET --data-file=- --project=$PROJECT

# Stripe (use test mode keys for staging)
echo -n "sk_test_..." | \
  gcloud secrets create NUXT_STRIPE_SECRET_KEY --data-file=- --project=$PROJECT

echo -n "whsec_..." | \
  gcloud secrets create NUXT_STRIPE_WEBHOOK_SECRET --data-file=- --project=$PROJECT

echo -n "pk_test_..." | \
  gcloud secrets create NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --data-file=- --project=$PROJECT

# OpenAI
echo -n "sk-..." | \
  gcloud secrets create NUXT_OPENAI_API_KEY --data-file=- --project=$PROJECT

# Session secret
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create NUXT_SESSION_SECRET --data-file=- --project=$PROJECT

# Google Books API
echo -n "your-google-books-key" | \
  gcloud secrets create NUXT_GOOGLE_BOOKS_API_KEY --data-file=- --project=$PROJECT
```

---

## Step 8: Connect Cloud Build to GitHub

1. Go to the [Cloud Build Triggers page](https://console.cloud.google.com/cloud-build/triggers) in the **annobib-staging** project
2. Click **Connect Repository**
3. Select **GitHub** and authenticate
4. Select your repository
5. Create three triggers:

### Trigger 1: CI (runs on pull requests)

- **Name:** `annobib-ci`
- **Event:** Pull request
- **Source:** Your repo, any branch
- **Config:** Cloud Build config file: `infra/cloudbuild/ci.yaml`

### Trigger 2: Staging Deploy (runs on push to main)

- **Name:** `annobib-staging-deploy`
- **Event:** Push to branch
- **Branch:** `^main$`
- **Config:** Cloud Build config file: `infra/cloudbuild/staging.yaml`
- **Substitution variables:**
  - `_STAGING_DATABASE_URL` = (create via Secret Manager reference)
  - `_STAGING_URL` = `https://staging.annobib.com`

### Trigger 3: Production Deploy (runs on tags)

- **Name:** `annobib-production-deploy`
- **Event:** Push new tag
- **Tag:** `^v.*$`
- **Config:** Cloud Build config file: `infra/cloudbuild/production.yaml`
- **Substitution variables:**
  - `_PROD_DATABASE_URL` = (create via Secret Manager reference)

---

## Step 9: First Staging Deploy

Push your code to main. Cloud Build will automatically:

1. Lint, typecheck, and run unit tests
2. Build the Docker image and push to Artifact Registry
3. Run database migrations against staging
4. Deploy to the staging GKE cluster
5. Run E2E tests

Monitor the build:

```bash
gcloud builds list --project=annobib-staging --limit=5
gcloud builds log LATEST_BUILD_ID --project=annobib-staging --stream
```

After the first successful deploy, seed the staging database with test data:

```bash
pnpm ops:seed -- staging
```

Verify the app is running:

```bash
pnpm ops:health -- staging

# Or via the domain once DNS is set up
curl https://staging.annobib.com/api/health
```

### Test a rollback

```bash
pnpm ops:rollback -- staging
# Verify the previous version is running
pnpm ops:health -- staging
```

---

## Step 10: Provision Production Infrastructure

```bash
pnpm ops:tf:init -- production
pnpm ops:tf:plan -- production
pnpm ops:tf:apply -- production
```

This provisions the same infrastructure as staging (including all cluster add-ons) for production.

After completion, get the production ingress IP:

```bash
gcloud container clusters get-credentials annobib-production-gke \
  --region us-central1 \
  --project annobib-prod

kubectl get svc -n ingress-nginx ingress-nginx-controller
```

**Update your DNS records** with the production IP (the `@` and `www` A records from Step 6).

---

## Step 11: Populate Secret Manager (Production)

Same as Step 7, but targeting `annobib-prod` project and using **live** credentials:

- Stripe: live mode keys (`sk_live_...`, `pk_live_...`)
- Auth0: production tenant/application
- OpenAI: same key (or a separate one if you prefer billing separation)

```bash
PROJECT=annobib-prod
# Repeat all the gcloud secrets create commands from Step 7 with production values
```

---

## Step 12: First Production Deploy

Create your first release tag:

```bash
pnpm ops:deploy:production -- v1.0.0
```

Monitor the build:

```bash
gcloud builds list --project=annobib-staging --limit=5
```

Verify production:

```bash
pnpm ops:health -- production
curl https://annobib.com/api/health
```

---

## Step 13: Configure External Services

### Stripe Webhooks

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint for **staging**: `https://staging.annobib.com/api/webhooks/stripe`
   - Select events: `customer.subscription.*`, `invoice.*`, `checkout.session.completed`
   - Copy the webhook signing secret -> update `NUXT_STRIPE_WEBHOOK_SECRET` in Secret Manager for staging
3. Add endpoint for **production**: `https://annobib.com/api/webhooks/stripe`
   - Same events, copy the signing secret -> update in Secret Manager for production

### Auth0

1. Create two Auth0 applications (or tenants), each set to **Regular Web Application** type
2. Enable the **Google** social connection under Authentication > Social in the Auth0 Dashboard
3. Configure Allowed Callback URLs for each application:
   - **Staging**: `https://staging.annobib.com/api/auth/google`
   - **Production**: `https://annobib.com/api/auth/google`
   - **Local development**: `http://localhost:3000/api/auth/google`
4. Update the Auth0 secrets (`NUXT_AUTH0_DOMAIN`, `NUXT_AUTH0_CLIENT_ID`, `NUXT_AUTH0_CLIENT_SECRET`) in Secret Manager for each environment

---

## Ongoing Operations

### Common commands

```bash
# View staging logs
pnpm ops:logs -- staging

# View production logs
pnpm ops:logs -- production

# Exec into a staging pod
pnpm ops:shell -- staging

# Check detailed health
pnpm ops:health -- production

# View cluster status
pnpm ops:cluster:info -- staging

# Trigger a database backup
pnpm ops:db:backup -- production

# Run a backup restore test
pnpm ops:db:restore-test -- production
```

### Deploying changes

```bash
# 1. Develop on a feature branch
git checkout -b feature/my-feature

# 2. Push and create a PR (triggers CI pipeline -- lint, typecheck, unit tests)
git push -u origin feature/my-feature

# 3. Merge to main (auto-deploys to staging)
# Monitor: gcloud builds list --project=annobib-staging --limit=3

# 4. Verify staging is healthy
pnpm ops:health -- staging

# 5. When ready, tag a release (deploys to production)
pnpm ops:deploy:production -- v1.1.0

# 6. Verify production
pnpm ops:health -- production
```

### Rolling back

```bash
# Undo the last deployment
pnpm ops:rollback -- production

# Or deploy a specific previous version
# (check Artifact Registry for available tags)
gcloud artifacts docker tags list \
  us-central1-docker.pkg.dev/annobib-staging/annobib/annobib-app \
  --project=annobib-staging
```

### Database migrations

Migrations run automatically in the CI/CD pipeline (staging on merge to main, production on tag). To run manually:

```bash
pnpm ops:migrate -- staging
pnpm ops:migrate:rollback -- staging
```

### Terraform changes

```bash
pnpm ops:tf:plan -- staging    # Review changes
pnpm ops:tf:apply -- staging   # Apply changes
pnpm ops:tf:plan -- production
pnpm ops:tf:apply -- production
```

---

## Cost Monitoring

Budget alerts are configured at $200/mo for staging and $500/mo for production. You'll receive email alerts at 50%, 80%, and 100% of these thresholds.

To check current spend:

```bash
gcloud billing projects describe annobib-staging --format="value(billingAccountName)"
```

Or visit the [GCP Billing Console](https://console.cloud.google.com/billing).
