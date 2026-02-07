# Deployment Guide

This document describes how to deploy Bibanna to Google Cloud Platform using Kubernetes.

## Overview

Bibanna uses:
- **GKE** (Google Kubernetes Engine) for container orchestration
- **Cloud SQL** for managed PostgreSQL
- **Cloud Storage** for file uploads
- **Artifact Registry** for Docker images
- **Cloud Build** for CI/CD
- **Terraform** for infrastructure provisioning

---

## Architecture

```
                        Internet
                            │
                            ▼
                    ┌───────────────┐
                    │ Cloud Load    │
                    │ Balancer      │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Ingress     │
                    │   Controller  │
                    └───────┬───────┘
                            │
                            ▼
            ┌───────────────────────────┐
            │         GKE Cluster       │
            │  ┌─────────────────────┐  │
            │  │   Bibanna Pods      │  │
            │  │   (autoscaled)      │  │
            │  └──────────┬──────────┘  │
            └─────────────┼─────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐
    │   Cloud SQL     │     │  Cloud Storage  │
    │   (PostgreSQL)  │     │  (Files)        │
    └─────────────────┘     └─────────────────┘
```

---

## Prerequisites

1. **GCP Project** with billing enabled
2. **gcloud CLI** installed and configured
3. **kubectl** installed
4. **Terraform** 1.0+ installed
5. **Docker** for local image building

```bash
# Authenticate with GCP
gcloud auth login
gcloud auth application-default login

# Set project
gcloud config set project your-project-id
```

---

## Infrastructure Setup (Terraform)

### Directory Structure

```
terraform/
├── main.tf               # Main resource definitions
├── variables.tf          # Input variables
├── outputs.tf            # Output values
└── environments/
    ├── staging.tfvars    # Staging configuration
    └── production.tfvars # Production configuration
```

### Initialize Terraform

```bash
cd terraform

# Initialize with GCS backend
terraform init \
  -backend-config="bucket=your-terraform-state-bucket" \
  -backend-config="prefix=bibanna/production"
```

### Deploy Infrastructure

```bash
# Plan changes
terraform plan -var-file="environments/production.tfvars"

# Apply changes
terraform apply -var-file="environments/production.tfvars"
```

### Key Resources Created

| Resource | Purpose |
|----------|---------|
| GKE Cluster | Container orchestration |
| Cloud SQL Instance | PostgreSQL database |
| VPC Network | Private networking |
| Service Account | Workload identity |
| Artifact Registry | Docker images |
| Cloud Storage Bucket | File uploads |
| Secret Manager | Sensitive configuration |

---

## Database Setup

### Cloud SQL Configuration

Terraform creates a Cloud SQL instance with:
- PostgreSQL 18
- Private IP only
- Automated backups
- Point-in-time recovery

### Initialize Database

```bash
# Connect to Cloud SQL via proxy
cloud_sql_proxy -instances=project:region:instance=tcp:5432

# Run initialization script
psql -h 127.0.0.1 -U postgres -d bibanna < scripts/init-db.sql

# Run migrations
DATABASE_URL="postgresql://postgres:password@127.0.0.1:5432/bibanna" \
  npx tsx scripts/migrate.ts
```

### Database Secrets

Store credentials in Secret Manager:

```bash
echo -n "postgresql://user:pass@host:5432/bibanna" | \
  gcloud secrets create bibanna-database-url --data-file=-
```

---

## Docker Build

### Dockerfile

The multi-stage Dockerfile in the project root:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.output .output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

### Build and Push

```bash
# Build image
docker build -t gcr.io/your-project/bibanna:v1.0.0 .

# Or use Artifact Registry
docker build -t us-central1-docker.pkg.dev/your-project/bibanna/app:v1.0.0 .

# Push to registry
docker push us-central1-docker.pkg.dev/your-project/bibanna/app:v1.0.0
```

---

## Kubernetes Deployment

### Directory Structure

```
k8s/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── hpa.yaml
│   └── kustomization.yaml
└── overlays/
    ├── staging/
    │   ├── kustomization.yaml
    │   └── patches/
    └── production/
        ├── kustomization.yaml
        ├── namespace.yaml
        ├── deployment-patch.yaml
        ├── configmap-patch.yaml
        └── hpa-patch.yaml
```

### Connect to Cluster

```bash
gcloud container clusters get-credentials bibanna-cluster \
  --region us-central1 \
  --project your-project-id
```

### Deploy with Kustomize

```bash
# Deploy to staging
kubectl apply -k k8s/overlays/staging

# Deploy to production
kubectl apply -k k8s/overlays/production
```

### Key Kubernetes Resources

#### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bibanna-app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: app
        image: us-central1-docker.pkg.dev/project/bibanna/app:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: bibanna-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bibanna-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

#### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bibanna-ingress
  annotations:
    kubernetes.io/ingress.global-static-ip-name: bibanna-ip
    networking.gke.io/managed-certificates: bibanna-cert
spec:
  rules:
  - host: app.bibanna.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bibanna-app
            port:
              number: 80
```

---

## CI/CD with Cloud Build

### cloudbuild.yaml

```yaml
steps:
  # Run tests
  - name: 'node:20'
    entrypoint: npm
    args: ['ci']
  - name: 'node:20'
    entrypoint: npm
    args: ['run', 'test']

  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/bibanna/app:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/bibanna/app:latest'
      - '.'

  # Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '--all-tags'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/bibanna/app'

  # Deploy to GKE
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--filename=k8s/overlays/production'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/bibanna/app:$SHORT_SHA'
      - '--location=us-central1'
      - '--cluster=bibanna-cluster'
```

### Trigger Setup

```bash
# Create trigger for main branch
gcloud builds triggers create github \
  --repo-name=bibanna \
  --repo-owner=your-org \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

---

## Environment Configuration

### ConfigMap (Non-sensitive)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bibanna-config
data:
  NODE_ENV: "production"
  NUXT_PUBLIC_APP_URL: "https://app.bibanna.io"
  LOG_LEVEL: "info"
```

### Secrets (Sensitive)

Secrets are stored in Secret Manager and mounted via Workload Identity:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: bibanna-secrets
type: Opaque
stringData:
  DATABASE_URL: "sm://project-id/bibanna-database-url/latest"
  STRIPE_SECRET_KEY: "sm://project-id/stripe-secret-key/latest"
  OPENAI_API_KEY: "sm://project-id/openai-api-key/latest"
```

### Required Environment Variables

| Variable | Description | Source |
|----------|-------------|--------|
| DATABASE_URL | PostgreSQL connection string | Secret Manager |
| NUXT_PUBLIC_APP_URL | Public application URL | ConfigMap |
| STRIPE_SECRET_KEY | Stripe API key | Secret Manager |
| STRIPE_WEBHOOK_SECRET | Stripe webhook signing secret | Secret Manager |
| OPENAI_API_KEY | OpenAI API key | Secret Manager |
| NUXT_SESSION_SECRET | Session encryption key | Secret Manager |

---

## Zero-Downtime Deployments

### Rolling Update Strategy

The deployment uses rolling updates with:
- `maxSurge: 1` - One extra pod during update
- `maxUnavailable: 0` - Always maintain full capacity

### Health Checks

- **Liveness Probe**: Restarts unhealthy pods
- **Readiness Probe**: Removes pods from service during startup

### PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: bibanna-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: bibanna-app
```

---

## Database Migrations

### Migration Strategy

Use expand-contract pattern for zero-downtime migrations:

1. **Expand**: Add new columns/tables (backward compatible)
2. **Deploy**: Roll out new application version
3. **Contract**: Remove old columns/tables (cleanup)

### Running Migrations

```bash
# Via Cloud Build (recommended)
# Add migration step to cloudbuild.yaml

# Manual migration
kubectl exec -it deployment/bibanna-app -- \
  npx tsx scripts/migrate.ts
```

### Rollback

```bash
# Revert deployment
kubectl rollout undo deployment/bibanna-app

# For database, restore from backup
gcloud sql backups restore BACKUP_ID \
  --restore-instance=bibanna-db \
  --backup-instance=bibanna-db
```

---

## Monitoring

### Health Check Endpoint

```
GET /api/health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### Cloud Monitoring

Key metrics to monitor:
- Request latency (p50, p95, p99)
- Error rate
- CPU/Memory utilization
- Database connections
- Queue depth (if applicable)

### Alerting

Configure alerts in Cloud Monitoring for:
- Error rate > 1%
- Latency p95 > 2s
- Pod restarts > 5/hour
- Database CPU > 80%

---

## Scaling

### Horizontal Pod Autoscaling

Automatically scales based on CPU utilization:
- Min replicas: 2 (production)
- Max replicas: 10 (production)
- Target CPU: 70%

### Vertical Scaling

Adjust resource requests/limits in deployment patch:

```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

### Database Scaling

Scale Cloud SQL instance:

```bash
gcloud sql instances patch bibanna-db \
  --tier=db-custom-4-16384
```

---

## Troubleshooting

### View Logs

```bash
# Application logs
kubectl logs -f deployment/bibanna-app

# All pods
kubectl logs -l app=bibanna-app --all-containers

# Cloud Logging
gcloud logging read "resource.type=k8s_container AND resource.labels.container_name=bibanna-app"
```

### Debug Pod

```bash
# Shell into running pod
kubectl exec -it deployment/bibanna-app -- /bin/sh

# Debug crashed pod
kubectl debug -it pod/bibanna-app-xxx --image=busybox
```

### Common Issues

| Issue | Check | Solution |
|-------|-------|----------|
| Pod CrashLoopBackOff | `kubectl describe pod` | Check logs, fix app error |
| ImagePullBackOff | Image name, credentials | Verify image exists, check IAM |
| Connection refused | Service, Ingress | Check service selector, endpoints |
| Database timeout | Network, credentials | Check VPC, verify connection string |

---

## Security

### Network Policies

Restrict pod-to-pod communication:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: bibanna-network-policy
spec:
  podSelector:
    matchLabels:
      app: bibanna-app
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
```

### Workload Identity

Pods use Workload Identity to access GCP services without service account keys:

```yaml
serviceAccountName: bibanna-sa
```

### Secret Rotation

Rotate secrets regularly:

```bash
# Rotate database password
gcloud sql users set-password postgres \
  --instance=bibanna-db \
  --password=NEW_PASSWORD

# Update Secret Manager
echo -n "new-connection-string" | \
  gcloud secrets versions add bibanna-database-url --data-file=-
```
