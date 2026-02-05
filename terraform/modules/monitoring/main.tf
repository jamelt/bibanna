variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "notification_email" {
  description = "Email address for alert notifications"
  type        = string
}

locals {
  name_prefix = "bibanna-${var.environment}"
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "${local.name_prefix}-email-alerts"
  type         = "email"
  
  labels = {
    email_address = var.notification_email
  }
}

resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "${local.name_prefix} - High Error Rate"
  combiner     = "OR"
  
  conditions {
    display_name = "HTTP 5xx Error Rate > 1%"
    
    condition_threshold {
      filter          = "resource.type=\"k8s_container\" AND metric.type=\"logging.googleapis.com/user/http_5xx_count\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.01
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
  
  alert_strategy {
    auto_close = "1800s"
  }
}

resource "google_monitoring_alert_policy" "high_latency" {
  display_name = "${local.name_prefix} - High API Latency"
  combiner     = "OR"
  
  conditions {
    display_name = "API Latency > 2s (p95)"
    
    condition_threshold {
      filter          = "resource.type=\"k8s_container\" AND metric.type=\"custom.googleapis.com/opencensus/http_request_duration_ms\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 2000
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MEAN"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
  
  alert_strategy {
    auto_close = "1800s"
  }
}

resource "google_monitoring_alert_policy" "database_connections" {
  display_name = "${local.name_prefix} - Database Connection Pool Exhaustion"
  combiner     = "OR"
  
  conditions {
    display_name = "Connection Pool > 80%"
    
    condition_threshold {
      filter          = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/postgresql/num_backends\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 160
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
}

resource "google_monitoring_alert_policy" "pod_restarts" {
  display_name = "${local.name_prefix} - Excessive Pod Restarts"
  combiner     = "OR"
  
  conditions {
    display_name = "Pod Restart Count > 3 in 10 minutes"
    
    condition_threshold {
      filter          = "resource.type=\"k8s_container\" AND metric.type=\"kubernetes.io/container/restart_count\""
      duration        = "600s"
      comparison      = "COMPARISON_GT"
      threshold_value = 3
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.pod_name"]
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
}

resource "google_monitoring_alert_policy" "memory_usage" {
  display_name = "${local.name_prefix} - High Memory Usage"
  combiner     = "OR"
  
  conditions {
    display_name = "Container Memory > 90%"
    
    condition_threshold {
      filter          = "resource.type=\"k8s_container\" AND metric.type=\"kubernetes.io/container/memory/used_bytes\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 460000000
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
}

resource "google_monitoring_dashboard" "main" {
  dashboard_json = jsonencode({
    displayName = "${local.name_prefix} Dashboard"
    
    gridLayout = {
      columns = 2
      widgets = [
        {
          title = "HTTP Request Rate"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"k8s_container\" AND metric.type=\"custom.googleapis.com/opencensus/http_request_total\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                  }
                }
              }
            }]
          }
        },
        {
          title = "HTTP Latency (p50, p95, p99)"
          xyChart = {
            dataSets = [
              {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"k8s_container\" AND metric.type=\"custom.googleapis.com/opencensus/http_request_duration_ms\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_PERCENTILE_50"
                    }
                  }
                }
                legendTemplate = "p50"
              },
              {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"k8s_container\" AND metric.type=\"custom.googleapis.com/opencensus/http_request_duration_ms\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_PERCENTILE_95"
                    }
                  }
                }
                legendTemplate = "p95"
              },
              {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"k8s_container\" AND metric.type=\"custom.googleapis.com/opencensus/http_request_duration_ms\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_PERCENTILE_99"
                    }
                  }
                }
                legendTemplate = "p99"
              }
            ]
          }
        },
        {
          title = "Error Rate by Endpoint"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"k8s_container\" AND metric.type=\"custom.googleapis.com/opencensus/http_request_total\" AND metric.label.status_code=monitoring.regex.full_match(\"5.+\")"
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["metric.label.path"]
                  }
                }
              }
            }]
          }
        },
        {
          title = "Database Query Duration"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"k8s_container\" AND metric.type=\"custom.googleapis.com/opencensus/db_query_duration_ms\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_PERCENTILE_95"
                    crossSeriesReducer = "REDUCE_MEAN"
                    groupByFields      = ["metric.label.operation"]
                  }
                }
              }
            }]
          }
        },
        {
          title = "AI API Latency"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"k8s_container\" AND metric.type=\"custom.googleapis.com/opencensus/ai_api_duration_ms\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_PERCENTILE_95"
                    crossSeriesReducer = "REDUCE_MEAN"
                    groupByFields      = ["metric.label.provider"]
                  }
                }
              }
            }]
          }
        },
        {
          title = "Pod Memory Usage"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"k8s_container\" AND metric.type=\"kubernetes.io/container/memory/used_bytes\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_MEAN"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["resource.label.pod_name"]
                  }
                }
              }
            }]
          }
        },
        {
          title = "Pod CPU Usage"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"k8s_container\" AND metric.type=\"kubernetes.io/container/cpu/core_usage_time\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["resource.label.pod_name"]
                  }
                }
              }
            }]
          }
        },
        {
          title = "Cloud SQL Connections"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/postgresql/num_backends\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      ]
    }
  })
}

output "notification_channel_id" {
  value = google_monitoring_notification_channel.email.name
}

output "dashboard_id" {
  value = google_monitoring_dashboard.main.id
}
