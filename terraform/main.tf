terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }

  backend "gcs" {
    bucket = "annobib-terraform-state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

locals {
  env_name    = var.environment
  name        = "${var.app_name}-${local.env_name}"
  cors_origin = var.domain != "" ? ["https://${var.domain}"] : ["*"]
}

# VPC Network
module "vpc" {
  source  = "terraform-google-modules/network/google"
  version = "~> 9.0"

  project_id   = var.project_id
  network_name = "${local.name}-vpc"
  routing_mode = "GLOBAL"

  subnets = [
    {
      subnet_name           = "${local.name}-subnet"
      subnet_ip             = "10.0.0.0/20"
      subnet_region         = var.region
      subnet_private_access = true
    }
  ]

  secondary_ranges = {
    "${local.name}-subnet" = [
      {
        range_name    = "pods"
        ip_cidr_range = "10.1.0.0/16"
      },
      {
        range_name    = "services"
        ip_cidr_range = "10.2.0.0/20"
      },
    ]
  }
}

# GKE Cluster
module "gke" {
  source  = "terraform-google-modules/kubernetes-engine/google//modules/private-cluster"
  version = "~> 29.0"

  project_id         = var.project_id
  name               = "${local.name}-gke"
  region             = var.region
  zones              = var.zones
  network            = module.vpc.network_name
  subnetwork         = module.vpc.subnets_names[0]
  ip_range_pods      = "pods"
  ip_range_services  = "services"

  enable_private_endpoint = false
  enable_private_nodes    = true
  master_ipv4_cidr_block  = "172.16.0.0/28"

  release_channel = "REGULAR"

  maintenance_start_time = "2025-01-01T02:00:00Z"
  maintenance_end_time   = "2025-01-01T06:00:00Z"
  maintenance_recurrence = "FREQ=WEEKLY;BYDAY=SU"

  node_pools = [
    {
      name               = "default-pool"
      machine_type       = var.node_machine_type
      min_count          = var.node_min_count
      max_count          = var.node_max_count
      local_ssd_count    = 0
      disk_size_gb       = 100
      disk_type          = "pd-standard"
      image_type         = "COS_CONTAINERD"
      auto_repair        = true
      auto_upgrade       = true
      preemptible        = false
      spot               = var.use_spot_instances
    }
  ]

  node_pools_oauth_scopes = {
    all = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
  }

  node_pools_labels = {
    all = {
      environment = local.env_name
    }
  }
}

# Cloud SQL PostgreSQL
module "cloudsql" {
  source  = "GoogleCloudPlatform/sql-db/google//modules/postgresql"
  version = "~> 18.0"

  project_id       = var.project_id
  name             = "${local.name}-db"
  database_version = "POSTGRES_18"
  region           = var.region
  zone             = var.zones[0]
  tier             = var.db_tier

  deletion_protection = var.environment == "production"

  ip_configuration = {
    ipv4_enabled        = false
    private_network     = module.vpc.network_self_link
    require_ssl         = true
    allocated_ip_range  = null
    authorized_networks = []
  }

  maintenance_window_day          = 7
  maintenance_window_hour         = 2
  maintenance_window_update_track = "stable"

  database_flags = [
    {
      name  = "cloudsql.enable_pgvector"
      value = "on"
    },
    {
      name  = "max_connections"
      value = "200"
    }
  ]

  additional_databases = [
    {
      name      = var.app_name
      charset   = "UTF8"
      collation = "en_US.UTF8"
    }
  ]

  additional_users = [
    {
      name            = "${var.app_name}_app"
      password        = var.db_password
      random_password = false
    }
  ]

  backup_configuration = {
    enabled                        = true
    start_time                     = "03:00"
    location                       = var.region
    point_in_time_recovery_enabled = var.environment == "production"
    transaction_log_retention_days = 7
    retained_backups               = 7
    retention_unit                 = "COUNT"
  }
}

# Cloud Storage bucket for uploads
resource "google_storage_bucket" "uploads" {
  name          = "${local.name}-uploads"
  location      = var.region
  force_destroy = var.environment != "production"

  uniform_bucket_level_access = true

  versioning {
    enabled = var.environment == "production"
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  dynamic "cors" {
    for_each = var.domain != "" ? [1] : []
    content {
      origin          = local.cors_origin
      method          = ["GET", "HEAD", "PUT", "POST"]
      response_header = ["*"]
      max_age_seconds = 3600
    }
  }
}

# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = var.app_name
  format        = "DOCKER"

  docker_config {
    immutable_tags = false
  }

  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }
}

# Workload Identity - GCP Service Account for application pods
resource "google_service_account" "app" {
  account_id   = "${var.app_name}-app"
  display_name = "${var.app_name} Application Service Account"
}

resource "google_project_iam_member" "app_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.app.email}"
}

resource "google_project_iam_member" "app_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.app.email}"
}

resource "google_project_iam_member" "app_trace_agent" {
  project = var.project_id
  role    = "roles/cloudtrace.agent"
  member  = "serviceAccount:${google_service_account.app.email}"
}

resource "google_project_iam_member" "app_monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.app.email}"
}

resource "google_project_iam_member" "app_storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.app.email}"
}

resource "google_service_account_iam_binding" "workload_identity" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "serviceAccount:${var.project_id}.svc.id.goog[${var.app_name}-${local.env_name}/${var.app_name}-app]",
  ]
}

# Cloud Build Service Account IAM
resource "google_project_iam_member" "cloudbuild_gke" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_artifact_registry" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

data "google_project" "current" {
  project_id = var.project_id
}

# Monitoring
module "monitoring" {
  source = "./modules/monitoring"

  project_id         = var.project_id
  environment        = var.environment
  notification_email = var.notification_email
}

# Budget Alert
resource "google_billing_budget" "monthly" {
  billing_account = var.billing_account_id
  display_name    = "${local.name}-monthly-budget"

  budget_filter {
    projects = ["projects/${data.google_project.current.number}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = var.monthly_budget_amount
    }
  }

  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.8
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = [module.monitoring.notification_channel_id]
  }
}

# External Uptime Check
resource "google_monitoring_uptime_check_config" "app_health" {
  display_name = "${local.name}-health-check"
  timeout      = "10s"
  period       = "300s"

  http_check {
    path         = "/api/health/detailed"
    port         = 443
    use_ssl      = true
    validate_ssl = var.domain != ""
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.domain != "" ? var.domain : ""
    }
  }

  lifecycle {
    ignore_changes = [monitored_resource[0].labels["host"]]
  }

  count = var.domain != "" ? 1 : 0
}

# Outputs
output "gke_cluster_name" {
  value = module.gke.name
}

output "gke_cluster_endpoint" {
  value     = module.gke.endpoint
  sensitive = true
}

output "database_connection_name" {
  value = module.cloudsql.instance_connection_name
}

output "database_private_ip" {
  value = module.cloudsql.private_ip_address
}

output "uploads_bucket" {
  value = google_storage_bucket.uploads.name
}

output "artifact_registry" {
  value = google_artifact_registry_repository.app.name
}

output "app_service_account_email" {
  value = google_service_account.app.email
}
