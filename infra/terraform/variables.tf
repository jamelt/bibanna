variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

variable "zones" {
  description = "The GCP zones for the cluster"
  type        = list(string)
  default     = ["us-central1-a", "us-central1-b", "us-central1-c"]
}

variable "environment" {
  description = "The environment (staging, production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production."
  }
}

variable "app_name" {
  description = "The application name used in all resource naming"
  type        = string
  default     = "annobib"
}

variable "domain" {
  description = "The application domain (leave empty if not yet purchased)"
  type        = string
  default     = ""
}

variable "node_machine_type" {
  description = "The machine type for GKE nodes"
  type        = string
  default     = "e2-medium"
}

variable "node_min_count" {
  description = "Minimum number of nodes in the node pool"
  type        = number
  default     = 1
}

variable "node_max_count" {
  description = "Maximum number of nodes in the node pool"
  type        = number
  default     = 5
}

variable "use_spot_instances" {
  description = "Whether to use spot instances for cost savings"
  type        = bool
  default     = false
}

variable "db_tier" {
  description = "The Cloud SQL instance tier"
  type        = string
  default     = "db-f1-micro"
}

variable "db_password" {
  description = "The database password for the app user"
  type        = string
  sensitive   = true
}

variable "notification_email" {
  description = "Email address for alert notifications"
  type        = string
}

variable "monthly_budget_amount" {
  description = "Monthly budget alert threshold in USD"
  type        = number
  default     = 400
}

variable "billing_account_id" {
  description = "The billing account ID for budget alerts"
  type        = string
}

variable "regional_cluster" {
  description = "Whether to create a regional (multi-zone) GKE cluster. Zonal is free, regional costs ~$73/mo."
  type        = bool
  default     = true
}

variable "enable_private_nodes" {
  description = "Whether GKE nodes use private IPs only. Requires Cloud NAT for outbound internet."
  type        = bool
  default     = true
}
