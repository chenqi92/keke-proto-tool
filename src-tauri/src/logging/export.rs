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
    Markdown,
}

impl LogManager {
    /// Export logs to file based on filter and format
    pub async fn export_logs(
        &self,
        filter: LogFilter,
        format: ExportFormat,
        output_dir: Option<PathBuf>,
        custom_filename: Option<String>,
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

        let filename = if let Some(custom_name) = custom_filename {
            custom_name
        } else {
            let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
            match format {
                ExportFormat::Json => format!("logs_{}.json", timestamp),
                ExportFormat::Csv => format!("logs_{}.csv", timestamp),
                ExportFormat::Markdown => format!("logs_{}.md", timestamp),
            }
        };

        let output_path = output_dir.join(filename);

        match format {
            ExportFormat::Json => {
                self.export_json(&logs, &output_path).await?;
            }
            ExportFormat::Csv => {
                self.export_csv(&logs, &output_path).await?;
            }
            ExportFormat::Markdown => {
                self.export_markdown(&logs, &output_path).await?;
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

    /// Export logs as Markdown
    async fn export_markdown(&self, logs: &[LogEntry], output_path: &PathBuf) -> Result<()> {
        let mut markdown_content = String::new();

        // Add title and metadata
        markdown_content.push_str("# 日志导出报告\n\n");
        markdown_content.push_str(&format!("**导出时间**: {}\n", Utc::now().format("%Y-%m-%d %H:%M:%S UTC")));
        markdown_content.push_str(&format!("**日志条数**: {}\n\n", logs.len()));

        // Add table of contents
        markdown_content.push_str("## 目录\n\n");
        markdown_content.push_str("- [日志统计](#日志统计)\n");
        markdown_content.push_str("- [详细日志](#详细日志)\n\n");

        // Add statistics section
        markdown_content.push_str("## 日志统计\n\n");

        // Count by level
        let mut level_counts = std::collections::HashMap::new();
        let mut category_counts = std::collections::HashMap::new();

        for log in logs {
            let level_key = format!("{:?}", log.level);
            *level_counts.entry(level_key).or_insert(0) += 1;

            if let Some(category) = &log.category {
                let category_key = format!("{:?}", category);
                *category_counts.entry(category_key).or_insert(0) += 1;
            }
        }

        markdown_content.push_str("### 按级别统计\n\n");
        markdown_content.push_str("| 级别 | 数量 |\n");
        markdown_content.push_str("|------|------|\n");
        for (level, count) in level_counts {
            markdown_content.push_str(&format!("| {} | {} |\n", level, count));
        }
        markdown_content.push_str("\n");

        if !category_counts.is_empty() {
            markdown_content.push_str("### 按类别统计\n\n");
            markdown_content.push_str("| 类别 | 数量 |\n");
            markdown_content.push_str("|------|------|\n");
            for (category, count) in category_counts {
                markdown_content.push_str(&format!("| {} | {} |\n", category, count));
            }
            markdown_content.push_str("\n");
        }

        // Add detailed logs section
        markdown_content.push_str("## 详细日志\n\n");

        for (index, log) in logs.iter().enumerate() {
            markdown_content.push_str(&format!("### 日志 #{}\n\n", index + 1));

            // Basic information table
            markdown_content.push_str("| 字段 | 值 |\n");
            markdown_content.push_str("|------|----|\n");
            markdown_content.push_str(&format!("| **时间** | {} |\n", log.timestamp.format("%Y-%m-%d %H:%M:%S%.3f UTC")));
            markdown_content.push_str(&format!("| **级别** | `{:?}` |\n", log.level));
            markdown_content.push_str(&format!("| **来源** | {} |\n", log.source));

            if let Some(category) = &log.category {
                markdown_content.push_str(&format!("| **类别** | `{:?}` |\n", category));
            }

            if let Some(session_name) = &log.session_name {
                markdown_content.push_str(&format!("| **会话** | {} |\n", session_name));
            }

            if let Some(client_id) = &log.client_id {
                markdown_content.push_str(&format!("| **客户端ID** | {} |\n", client_id));
            }

            if let Some(protocol) = &log.protocol {
                markdown_content.push_str(&format!("| **协议** | {} |\n", protocol));
            }

            if let Some(data_size) = log.data_size {
                markdown_content.push_str(&format!("| **数据大小** | {} bytes |\n", data_size));
            }

            if let Some(direction) = &log.direction {
                markdown_content.push_str(&format!("| **方向** | `{:?}` |\n", direction));
            }

            if let Some(connection_type) = &log.connection_type {
                markdown_content.push_str(&format!("| **连接类型** | `{:?}` |\n", connection_type));
            }

            markdown_content.push_str("\n");

            // Message content
            markdown_content.push_str("**消息内容**:\n\n");
            markdown_content.push_str("```\n");
            markdown_content.push_str(&log.message);
            markdown_content.push_str("\n```\n\n");

            // Details if available
            if let Some(details) = &log.details {
                markdown_content.push_str("**详细信息**:\n\n");
                markdown_content.push_str("```json\n");
                if let Ok(pretty_json) = serde_json::to_string_pretty(details) {
                    markdown_content.push_str(&pretty_json);
                } else {
                    markdown_content.push_str(&format!("{:?}", details));
                }
                markdown_content.push_str("\n```\n\n");
            }

            markdown_content.push_str("---\n\n");
        }

        let mut file = File::create(output_path).await
            .context("Failed to create Markdown output file")?;

        file.write_all(markdown_content.as_bytes()).await
            .context("Failed to write Markdown content")?;

        file.flush().await
            .context("Failed to flush Markdown file")?;

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
            estimated_markdown_size: 0,
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

        // Add estimated markdown size
        stats.estimated_markdown_size = logs.len() * 500; // Rough estimate of 500 bytes per log entry

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
    pub estimated_markdown_size: usize,
}

impl std::fmt::Display for ExportFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExportFormat::Json => write!(f, "json"),
            ExportFormat::Csv => write!(f, "csv"),
            ExportFormat::Markdown => write!(f, "md"),
        }
    }
}

impl std::str::FromStr for ExportFormat {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "json" => Ok(ExportFormat::Json),
            "csv" => Ok(ExportFormat::Csv),
            "md" | "markdown" => Ok(ExportFormat::Markdown),
            _ => Err(anyhow::anyhow!("Invalid export format: {}", s)),
        }
    }
}
