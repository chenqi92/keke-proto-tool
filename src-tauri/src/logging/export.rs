use super::{LogEntry, LogFilter, LogManager};
use anyhow::{Result, Context};
use chrono::Utc;
use csv::Writer;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    Json,
    Csv,
}

impl LogManager {
    /// Export logs to file based on filter and format
    pub async fn export_logs(
        &self,
        filter: LogFilter,
        format: ExportFormat,
        output_dir: Option<PathBuf>,
    ) -> Result<PathBuf> {
        let logs = self.get_logs(filter).await?;

        if logs.is_empty() {
            return Err(anyhow::anyhow!("没有符合条件的日志可以导出"));
        }

        let output_dir = output_dir.unwrap_or_else(|| {
            std::env::temp_dir()
        });

        // Ensure output directory exists
        tokio::fs::create_dir_all(&output_dir).await
            .context("Failed to create output directory")?;

        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        let filename = match format {
            ExportFormat::Json => format!("logs_{}.json", timestamp),
            ExportFormat::Csv => format!("logs_{}.csv", timestamp),
        };

        let output_path = output_dir.join(filename);

        match format {
            ExportFormat::Json => {
                self.export_json(&logs, &output_path).await?;
            }
            ExportFormat::Csv => {
                self.export_csv(&logs, &output_path).await?;
            }
        }

        Ok(output_path)
    }

    /// Export logs as JSON
    async fn export_json(&self, logs: &[LogEntry], output_path: &PathBuf) -> Result<()> {
        let json_content = serde_json::to_string_pretty(logs)
            .context("Failed to serialize logs to JSON")?;

        let mut file = File::create(output_path).await
            .context("Failed to create output file")?;

        file.write_all(json_content.as_bytes()).await
            .context("Failed to write JSON content")?;

        file.flush().await
            .context("Failed to flush file")?;

        Ok(())
    }

    /// Export logs as CSV
    async fn export_csv(&self, logs: &[LogEntry], output_path: &PathBuf) -> Result<()> {
        let mut csv_content = Vec::new();
        {
            let mut writer = Writer::from_writer(&mut csv_content);

            // Write CSV headers
            writer.write_record(&[
                "ID",
                "时间",
                "级别",
                "类别",
                "来源",
                "消息",
                "会话名称",
                "客户端ID",
                "协议",
                "数据大小",
                "方向",
                "连接类型",
                "详细信息",
            ])?;

            // Write log entries
            for log in logs {
                let details_str = log.details.as_ref()
                    .map(|d| serde_json::to_string(d).unwrap_or_default())
                    .unwrap_or_default();

                writer.write_record(&[
                    &log.id,
                    &log.timestamp.format("%Y-%m-%d %H:%M:%S%.3f UTC").to_string(),
                    &format!("{:?}", log.level),
                    &log.category.as_ref().map(|c| format!("{:?}", c)).unwrap_or_default(),
                    &log.source,
                    &log.message,
                    &log.session_name.clone().unwrap_or_default(),
                    &log.client_id.clone().unwrap_or_default(),
                    &log.protocol.clone().unwrap_or_default(),
                    &log.data_size.map(|s| s.to_string()).unwrap_or_default(),
                    &log.direction.as_ref().map(|d| format!("{:?}", d)).unwrap_or_default(),
                    &log.connection_type.as_ref().map(|ct| format!("{:?}", ct)).unwrap_or_default(),
                    &details_str,
                ])?;
            }

            writer.flush()?;
        }

        let mut file = File::create(output_path).await
            .context("Failed to create CSV output file")?;

        file.write_all(&csv_content).await
            .context("Failed to write CSV content")?;

        file.flush().await
            .context("Failed to flush CSV file")?;

        Ok(())
    }

    /// Get export statistics
    pub async fn get_export_stats(&self, filter: LogFilter) -> Result<ExportStats> {
        let logs = self.get_logs(filter).await?;
        
        let mut stats = ExportStats {
            total_entries: logs.len(),
            by_level: std::collections::HashMap::new(),
            by_category: std::collections::HashMap::new(),
            date_range: None,
            estimated_json_size: 0,
            estimated_csv_size: 0,
        };

        if logs.is_empty() {
            return Ok(stats);
        }

        // Calculate statistics
        for log in &logs {
            // Count by level
            let level_key = format!("{:?}", log.level);
            *stats.by_level.entry(level_key).or_insert(0) += 1;

            // Count by category
            if let Some(category) = &log.category {
                let category_key = format!("{:?}", category);
                *stats.by_category.entry(category_key).or_insert(0) += 1;
            }
        }

        // Calculate date range
        if let (Some(first), Some(last)) = (logs.last(), logs.first()) {
            stats.date_range = Some((first.timestamp, last.timestamp));
        }

        // Estimate file sizes
        if let Ok(json_content) = serde_json::to_string(&logs) {
            stats.estimated_json_size = json_content.len();
        }

        // Rough CSV size estimation
        stats.estimated_csv_size = logs.len() * 200; // Rough estimate of 200 bytes per row

        Ok(stats)
    }
}

#[derive(Debug, Serialize)]
pub struct ExportStats {
    pub total_entries: usize,
    pub by_level: std::collections::HashMap<String, i32>,
    pub by_category: std::collections::HashMap<String, i32>,
    pub date_range: Option<(chrono::DateTime<Utc>, chrono::DateTime<Utc>)>,
    pub estimated_json_size: usize,
    pub estimated_csv_size: usize,
}

impl std::fmt::Display for ExportFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExportFormat::Json => write!(f, "json"),
            ExportFormat::Csv => write!(f, "csv"),
        }
    }
}

impl std::str::FromStr for ExportFormat {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "json" => Ok(ExportFormat::Json),
            "csv" => Ok(ExportFormat::Csv),
            _ => Err(anyhow::anyhow!("Invalid export format: {}", s)),
        }
    }
}
