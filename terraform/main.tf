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
    bucket = "bibanna-terraform-state"
    prefix = "terraform/state"
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
  env_name = var.environment
  name     = "bibanna-${local.env_name}"
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
      name      = "bibanna"
      charset   = "UTF8"
      collation = "en_US.UTF8"
    }
  ]

  additional_users = [
    {
      name     = "bibanna_app"
      password = var.db_password
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

  cors {
    origin          = ["https://bibanna.dev"]
    method          = ["GET", "HEAD", "PUT", "POST"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "bibanna" {
  location      = var.region
  repository_id = "bibanna"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }
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
  value = google_artifact_registry_repository.bibanna.name
}
