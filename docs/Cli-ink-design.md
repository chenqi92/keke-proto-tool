# CLI (Ink) Design — keke-proto-tool / ProtoTool

**Status**: Draft v1.0
**Scope**: Add a full-featured CLI “command palette” and terminal UI using [Ink](https://github.com/vadimdemedes/ink), sharing the same Rust core (connections, transfers, edit-proxy) with the GUI app.
**Owners**: @you (PM/Dev), Core: Rust (backend), Node/TS (CLI-UI)
**Audience**: Contributors to ProtoTool (Rust + TS), reviewers, QA

---

## 1) Summary

We add a **terminal UI (TUI)** built with **Ink (React for Terminal)** to complement the existing Tauri-based GUI. The CLI provides:

* A discoverable **command palette** (search, fuzzy match, groups).
* **Connections** (SFTP/FTP/FTPS), **history**, **bookmarks**, **recent paths**.
* **Transfers** (upload/download, queue, progress, retry, cancel, concurrency control).
* **“Local edit → auto re-upload”** workflow (download temp → open system editor → watch file → upload on save → conflict policy).
* Secure storage (keychain), trusted host/Cert management, structured logs.

The CLI is a separate Node/TS app (Ink) talking to a Rust process (shared library/daemon) via **JSON-RPC over stdio** and **NDJSON event stream**. All persistence (SQLite) and secrets (keychain) remain in Rust.

---

## 2) Goals / Non‑Goals

### Goals

* Provide a **first-class terminal experience** that mirrors GUI capabilities.
* Reuse **one Rust backend** for network protocols, storage, and security.
* Ship **consistent UX** across GUI & CLI (terminology, actions, status, errors).
* Be friendly to **non-interactive** environments (CI/cron) by auto‑degrading to plain logs.

### Non-Goals (initial)

* Rich diff/merge editor for conflicts (v1.x).
* End-to-end content encryption of stored files (out of scope; use transport security and OS keychain for creds).
* Full ACL/permission UI (basic chmod/stat later).

---

## 3) Architecture Overview

```
apps/
  proto-gui/     (Tauri + React)
  proto-cli/     (Ink + Node/TS)  <— NEW
crates/
  proto-core/    (Rust lib: connections, transfers, edit proxy, DB, keyring)
  proto-daemon/  (Rust bin/daemon; optional if we prefer a separate process)
```

### Data/Control Flow

1. **Ink CLI** spawns or connects to **Rust backend**.
2. CLI sends **JSON-RPC** requests via stdin; backend replies via stdout.
3. Backend emits **events** (NDJSON) for progress/state/notifications.
4. CLI renders: lists, tables, progress bars, spinners, notifications.

### Why this split

* Single source of truth for **security, credentials, network, persistence**.
* Clear boundary: CLI ≙ view/controller, Rust ≙ model/executor.

---

## 4) Processes & Lifecycles

### Startup

* CLI parses args → determines **interactive** (TTY) vs **batch** mode.
* Start backend:

    * **Daemon mode** (if chosen): connect to existing `proto-daemon` via stdio/socket.
    * **Subprocess mode**: spawn Rust child; set up stdio pipes.
* Perform **handshake**: version, capabilities, feature flags.

### Shutdown

* CLI sends `shutdown` (graceful) or cancels tasks; backend drains queues, flushes logs, closes connections.

---

## 5) Security & Trust Model

* **Credentials**: Stored only in OS **Keychain/Credential Manager/Gnome Keyring**; DB stores only `secret_ref`.
* **SSH host key** & **FTPS certificate**: First‑use trust prompt → persisted; UI to list/revoke trust.
* **Least privilege**: CLI never receives raw secrets; only opaque refs. Temporary files in isolated dir; auto-clean policies.

---

## 6) Persistence & Data Model (SQLite)

Core tables (shared with GUI; no secrets here):

* `connections(id, name, protocol, host, port, username, auth, key_path?, created_at, updated_at)`
* `connection_secrets(connection_id, secret_ref)`
* `bookmarks(id, connection_id, path, label, tags, pin)`
* `history(id, connection_id, path, action, ts, duration_ms?, bytes?)`
* `transfers(id, batch_id, type, source, target, status, progress, speed_bps?, error?, created_at, finished_at?)`
* `settings(key, value)`
* `known_hosts`, `trusted_certs`

---

## 7) IPC Protocol (CLI ⇄ Backend)

### Transport

* **stdio** streams; messages are **JSON objects** delimited by `\n` (NDJSON).
* **Requests**: `{ "id": string, "method": string, "params": object }`
* **Responses**: `{ "id": string, "result": any }` or `{ "id": string, "error": { code, message, data? } }`
* **Events**: `{ "type": string, "payload": any }`

### Core Methods (selected)

* `connection.list/save/get/delete/test`
* `fs.list(connId, path)` → entries (name, kind, size?, mtime?, capabilities)
* `transfer.enqueue(tasks[])`, `transfer.cancel(id)`, `transfer.retry(id)`
* `edit.open(connId, remotePath)`, `edit.finish(token)`
* `bookmark.save/list/delete`
* `history.list(filters)`
* `settings.get/set`

### Event Types

* `transfer-progress` `{ id, transferred, total? }`
* `transfer-state` `{ id, status, speed_bps?, eta_sec?, error? }`
* `edit-sync` `{ token, state: "watching"|"changed"|"uploading"|"synced"|"conflict"|"error", remotePath }`
* `connection-state` `{ connId, state: "connecting"|"connected"|"disconnected"|"error", reason? }`
* `notification` `{ level: "info"|"warning"|"error", message, data? }`

---

## 8) CLI (Ink) UI/UX

### Components & Libraries

* **Ink** core: `<Box/>`, `<Text/>`, `useInput`, `useStdout`, `useStdin`, `useApp`.
* Inputs/Lists: `ink-text-input`, `ink-select-input`.
* Feedback: `ink-spinner`, `ink-progress-bar`.
* Tables: `ink-table` or equivalent.
* Optional cosmetics: `ink-big-text`, `ink-gradient` (banner only; keep default off).

### Layout

* **Top bar**: command palette input + context (conn/path/queue summary).
* **Main**: list/table of actions/history/bookmarks/entries (with fuzzy search).
* **Side/Bottom**: hints, error toasts, quick keys, event log.
* **Responsive**: wide → two columns; narrow → single column; truncate long text.

### Keybindings (default)

* `/` focus search • `↑/↓` navigate • `Enter` run • `Tab` next section
* `Esc` back/close • `r` rename • `d` delete • `n` new dir • Space multi‑select
* `Ctrl+R` retry • `Ctrl+C` exit (confirm if tasks running)

### Non‑TTY Degrade

* If not a TTY (CI/redirect), **disable Ink tree**. Print NDJSON logs and plain progress lines.

### Accessibility

* No color reliance (use symbols), monochrome fallback, avoid flicker. Provide `--no-emoji`, `--no-color` flags.

---

## 9) Features & Flows

### A) Command Palette

* Source: backend exposes **command registry** (id, title, category, keywords, danger level).
* Fuzzy: Fuse-like scoring on title+keywords; recent commands boosted.
* Confirmation: destructive commands require explicit confirm.

### B) Connections & Browsing

* Create/Test connection; store secret in keychain (CLI sees only ref).
* List directory (`fs.list`) with capabilities mask (rename/perm/etc.).
* Bookmarks & recent paths are first-class; jump via palette.

### C) Transfers

* Queue with concurrency limit and optional bandwidth cap.
* Unknown total → indeterminate progress; otherwise precise %.
* Errors show inline details with copy‑to‑clipboard in CLI.

### D) Local Edit → Auto Upload

* `edit.open` downloads to temp, opens system editor, starts watcher.
* On save, upload; show `edit-sync` states.
* Conflict policy: **Overwrite / Pull copy** (e.g., `*.conflict`) / (merge later).

---

## 10) Configuration & Policies

* `settings`: concurrency_limit, bandwidth_limit, editor_strategy (system/specify), temp_cleanup (immediate/delayed/on-exit), conflict_policy, tls_policy, ssh_hostkey_policy, theme (emoji/color), logging (level, ndjson).

---

## 11) Cross‑Platform Notes

* **Windows**: path separators, UTF‑8 filenames, default app open w/UAC nuances.
* **macOS**: first-run disk permission prompts; sandbox settings (if any) for temp/download dirs.
* **Linux**: file watch backends differ (inotify, etc.); debounce saves; terminal palette variety.

---

## 12) Observability & Logs

* Structured logs for operations & transfers (SQLite hot store).
* Large histories → periodic archive to Parquet (cold store).
* Events window in CLI; NDJSON mode for machine consumption.

---

## 13) Testing Strategy

* **Unit**: adapters (SFTP/FTP), error mapping, JSON-RPC framing/parsing.
* **Component**: Ink components with `ink-testing-library` (snapshot, input events).
* **Integration**: local SFTP/FTP servers (containers), list/upload/download/rename/delete/concurrency/interrupt.
* **E2E**: full edit‑proxy loop with common editors (write‑in‑place vs temp‑then‑rename).
* **Cross‑platform**: smoke tests across Win/macOS/Linux terminals.

---

## 14) Rollout & Compatibility

* Ship as `proto` binary with subcommand `proto cli` (Ink) and `proto gui` (Tauri); or separate `proto-cli` bin.
* Backward compatible DB schema changes gated by migrations.
* Feature flags for FTPS, conflict policies, NDJSON mode.

---

## 15) Risks & Mitigations

* **Editor save patterns** produce multiple file events → **debounce + stability check** before upload.
* **FTPS in corp networks** (active/passive/firewalls) → expose mode/port range settings.
* **Unknown content length** on some servers → indeterminate progress UI.
* **Credential leakage** → never print secrets; secrets only via keychain ref.

---

## 16) Open Questions

* Prefer **daemon** or **per‑invoke child**? (decide after perf test)
* Do we expose a **local socket** transport (JSON-RPC over TCP) besides stdio?
* Should CLI support **script subcommands** (no TUI) that still use backend?

---

## 17) Acceptance Criteria (Definition of Done)

* CLI launches in interactive terminal with command palette, lists connections/history/bookmarks, performs list/upload/download/rename/delete/mkdir.
* SFTP path end‑to‑end works; FTP/FTPS behind feature flag (optional for MVP).
* Local‑edit‑auto‑upload flow works with at least two mainstream editors.
* Non‑TTY mode prints NDJSON/plain logs; all actions invocable.
* No secrets leave the keychain; trust stores manageable.
* Cross‑platform smoke passes; basic CI job runs non‑TTY scenario.

---

## 18) Task Plan (Epics → Tasks → Acceptance)

> Use **P0/P1/P2** for priority; add assignee labels in issues. Avoid time estimates; sequence expresses dependency.

### EPIC A — IPC & Runtime Base (P0)

**A1** Define JSON-RPC/NDJSON schema; implement Node framing + Rust parser.
**A2** Backend handshake: version/capabilities; feature flags returned.
**A3** Error model (codes, messages, data) shared TS/Rust types.
**Acceptance**: CLI can call `ping`, receive `pong`; logs & events visible in terminal.

### EPIC B — Security & Persistence (P0)

**B1** Keychain integration (store/retrieve by `secret_ref`).
**B2** DB migrations for connections/history/bookmarks/transfers/settings.
**B3** Trust store (SSH host keys, FTPS certs) + list/revoke ops.
**Acceptance**: create/test connection without exposing secrets; trust recorded and revocable.

### EPIC C — SFTP Adapter & File Ops (P0)

**C1** `fs.list`, `stat` with capability bits.
**C2** Transfers: upload/download (single), progress + cancel + retry.
**C3** Mutations: mkdir/rename/delete.
**Acceptance**: browse and transfer small/large files; interruption handled; errors surfaced.

### EPIC D — Transfer Queue & Concurrency (P1)

**D1** Queue model, global and per‑conn concurrency.
**D2** Speed, ETA, retry with backoff.
**D3** Settings for limits; events for state changes.
**Acceptance**: multiple tasks execute with limits; progress accurate; retries visible.

### EPIC E — Edit Proxy (Local Edit → Auto Upload) (P1)

**E1** Temp path mapping (conn+remote→local).
**E2** Open with system default app; watcher with debounce & save stability.
**E3** Upload on save; conflict policy (overwrite/pull copy).
**Acceptance**: modify file in editor → auto upload; conflict path prompts user.

### EPIC F — CLI (Ink) UI (P0)

**F1** Shell scaffold with **Ink**; detect TTY; non‑TTY degrade.
**F2** Command palette (search, groups, recent, confirm dangerous).
**F3** Lists/tables: connections, history, bookmarks, directory entries.
**F4** Transfer center view: inline progress bars, retry/cancel.
**F5** Keybindings & hints, color/emoji toggles.
**Acceptance**: end-to-end tasks navigable entirely from keyboard; visuals stable across terminals.

### EPIC G — FTP/FTPS Adapter (Feature‑flagged) (P2)

**G1** Basic FTP adapter; **G2** FTPS with cert validation; **G3** active/passive & port range config.
**Acceptance**: list/upload/download on a test server; failures report clearly.

### EPIC H — Observability & Logs (P1)

**H1** Structured operation & transfer logs (SQLite).
**H2** NDJSON output for CI; `--ndjson` flag to force.
**H3** Copy diagnostics command.
**Acceptance**: logs queryable; CI job can parse output.

### EPIC I — Cross‑Platform QA (P0)

**I1** Windows/macOS/Linux smoke; default app open; path/encoding.
**I2** Terminal compatibility matrix (colors, emoji).
**I3** Installer/packaging validation.
**Acceptance**: core flows green on 3 OS; known limitations documented.

### EPIC J — Tests & CI (P0)

**J1** Unit tests (Rust adapters, TS framing).
**J2** Ink component tests (`ink-testing-library`).
**J3** Integration: containerized SFTP/FTP; scripted E2E for edit proxy.
**Acceptance**: CI passes; failures actionable.

---

## 19) CLI Arguments & Env Vars (Draft)

* `proto-cli` (or `proto cli`)

    * `--non-interactive` / `--ndjson` / `--no-emoji` / `--no-color`
    * `--connect <name>` / `--path <remote>` / `--upload <local>` / `--download <remote>`
    * `--daemon` (connect to running backend) / `--spawn` (start child)
    * `--log-level <info|debug|trace>`
* Env: `PROTO_HOME`, `PROTO_TEMP`, `PROTO_EDITOR`, proxies, etc.

---

## 20) References

* Ink core & hooks; community components: text-input, select-input, spinner, progress-bar, table.
* Node streams, stdio framing; JSON-RPC patterns.
* SSH2/SFTP, FTP/FTPS client crates; file watcher backends.

---

## Appendix A — Database Schema (SQLite DDL)

> Notes: enable foreign keys via `PRAGMA foreign_keys = ON;`. Timestamps are UTC. Secrets are stored in OS keychain; DB stores only references.

```sql
-- schema.sql (apply via migration tool of your choice)
PRAGMA foreign_keys = ON;

-- 1) Connections
CREATE TABLE IF NOT EXISTS connections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  protocol     TEXT NOT NULL CHECK (protocol IN ('sftp','ftp','ftps')),
  host         TEXT NOT NULL,
  port         INTEGER NOT NULL,
  username     TEXT NOT NULL,
  auth         TEXT NOT NULL CHECK (auth IN ('password','key','agent')),
  key_path     TEXT,                -- for 'key' auth; may be NULL for agent/password
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_name ON connections(name);
CREATE INDEX IF NOT EXISTS idx_connections_host ON connections(host, port);

-- keep updated_at fresh
CREATE TRIGGER IF NOT EXISTS tr_connections_updated
AFTER UPDATE ON connections
FOR EACH ROW BEGIN
  UPDATE connections SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- 2) Connection Secrets (reference into OS keychain)
CREATE TABLE IF NOT EXISTS connection_secrets (
  connection_id INTEGER PRIMARY KEY REFERENCES connections(id) ON DELETE CASCADE,
  secret_ref    TEXT NOT NULL         -- key to OS keychain/credential manager
);

-- 3) Bookmarks (favorite paths)
CREATE TABLE IF NOT EXISTS bookmarks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id INTEGER NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  path          TEXT NOT NULL,
  label         TEXT,
  tags          TEXT,                 -- comma-separated or JSON array
  pin           INTEGER,              -- for ordering in UI
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_unique ON bookmarks(connection_id, path);
CREATE INDEX IF NOT EXISTS idx_bookmarks_conn ON bookmarks(connection_id);

-- 4) History (audit of operations)
CREATE TABLE IF NOT EXISTS history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id INTEGER NOT NULL REFERENCES connections(id) ON DELETE SET NULL,
  path          TEXT NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('connect','list','download','upload','rename','delete','mkdir','edit','open')),
  ts            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duration_ms   INTEGER,
  bytes         INTEGER
);
CREATE INDEX IF NOT EXISTS idx_history_conn_ts ON history(connection_id, ts DESC);

-- 5) Transfers (queue + states)
CREATE TABLE IF NOT EXISTS transfers (
  id              TEXT PRIMARY KEY, -- UUID or ULID preferred
  batch_id        TEXT,
  connection_id   INTEGER REFERENCES connections(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN ('up','down')),
  source          TEXT NOT NULL,
  target          TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('queued','running','success','failed','canceled')),
  transferred_bytes INTEGER NOT NULL DEFAULT 0,
  total_bytes     INTEGER,           -- may be NULL when unknown
  speed_bps       REAL,
  error           TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at     DATETIME
);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_conn ON transfers(connection_id);

-- 6) Settings (key/value JSON)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL               -- JSON-encoded
);

-- 7) SSH known hosts
CREATE TABLE IF NOT EXISTS known_hosts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  host            TEXT NOT NULL,
  port            INTEGER NOT NULL,
  algorithm       TEXT NOT NULL,
  fingerprint     TEXT NOT NULL,
  first_trusted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  comment         TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_known_hosts_unique ON known_hosts(host, port, algorithm, fingerprint);

-- 8) FTPS trusted certs
CREATE TABLE IF NOT EXISTS trusted_certs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  host             TEXT NOT NULL,
  port             INTEGER NOT NULL,
  subject          TEXT,
  fingerprint      TEXT NOT NULL,
  not_before       DATETIME,
  not_after        DATETIME,
  first_trusted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  comment          TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trusted_certs_unique ON trusted_certs(host, port, fingerprint);
```

---

## Appendix B — Event & RPC Schemas (JSON)

> JSON Schema draft-07 style; events are emitted as NDJSON lines. Requests/responses follow a simple JSON-RPC‑like envelope.

### B.1 Envelopes

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "proto.rpc.envelope",
  "definitions": {
    "Request": {
      "type": "object",
      "required": ["id", "method", "params"],
      "properties": {
        "id": {"type": "string"},
        "method": {"type": "string"},
        "params": {"type": "object"}
      },
      "additionalProperties": false
    },
    "Response": {
      "type": "object",
      "required": ["id"],
      "properties": {
        "id": {"type": "string"},
        "result": {},
        "error": {
          "type": "object",
          "required": ["code", "message"],
          "properties": {
            "code": {"type": "integer"},
            "message": {"type": "string"},
            "data": {}
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "Event": {
      "type": "object",
      "required": ["type", "payload"],
      "properties": {
        "type": {"type": "string"},
        "payload": {"type": "object"}
      },
      "additionalProperties": false
    }
  }
}
```

### B.2 Events

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "proto.events",
  "definitions": {
    "TransferProgress": {
      "type": "object",
      "required": ["id", "transferred"],
      "properties": {
        "id": {"type": "string"},
        "transferred": {"type": "integer", "minimum": 0},
        "total": {"type": ["integer","null"], "minimum": 0}
      },
      "additionalProperties": false
    },
    "TransferState": {
      "type": "object",
      "required": ["id", "status"],
      "properties": {
        "id": {"type": "string"},
        "status": {"type": "string", "enum": ["queued","running","success","failed","canceled"]},
        "speed_bps": {"type": ["number","null"], "minimum": 0},
        "eta_sec": {"type": ["number","null"], "minimum": 0},
        "error": {"type": ["string","null"]}
      },
      "additionalProperties": false
    },
    "EditSync": {
      "type": "object",
      "required": ["token", "state", "remotePath"],
      "properties": {
        "token": {"type": "string"},
        "state": {"type": "string", "enum": ["watching","changed","uploading","synced","conflict","error"]},
        "remotePath": {"type": "string"},
        "error": {"type": ["string","null"]}
      },
      "additionalProperties": false
    },
    "ConnectionState": {
      "type": "object",
      "required": ["connId", "state"],
      "properties": {
        "connId": {"type": "integer"},
        "state": {"type": "string", "enum": ["connecting","connected","disconnected","error"]},
        "reason": {"type": ["string","null"]}
      },
      "additionalProperties": false
    },
    "Notification": {
      "type": "object",
      "required": ["level", "message"],
      "properties": {
        "level": {"type": "string", "enum": ["info","warning","error"]},
        "message": {"type": "string"},
        "data": {}
      },
      "additionalProperties": false
    }
  }
}
```

### B.3 Methods (Params/Results — excerpt)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "proto.methods",
  "definitions": {
    "FsListParams": {
      "type": "object",
      "required": ["connId","path"],
      "properties": {
        "connId": {"type": "integer"},
        "path": {"type": "string"}
      },
      "additionalProperties": false
    },
    "FsListResult": {
      "type": "object",
      "required": ["entries"],
      "properties": {
        "entries": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name","path","kind"],
            "properties": {
              "name": {"type": "string"},
              "path": {"type": "string"},
              "kind": {"type": "string", "enum": ["file","dir","symlink"]},
              "size": {"type": ["integer","null"]},
              "mtime": {"type": ["integer","null"]},
              "capabilities": {"type": "array", "items": {"type": "string"}}
            },
            "additionalProperties": false
          }
        }
      },
      "additionalProperties": false
    },

    "TransferTask": {
      "type": "object",
      "required": ["id","type","connId","source","target"],
      "properties": {
        "id": {"type": "string"},
        "type": {"type": "string", "enum": ["up","down"]},
        "connId": {"type": "integer"},
        "source": {"type": "string"},
        "target": {"type": "string"}
      },
      "additionalProperties": false
    }
  }
}
```

### B.4 NDJSON Examples

```json
{"id":"1","method":"fs.list","params":{"connId":12,"path":"/var/log"}}
{"id":"1","result":{"entries":[{"name":"syslog","path":"/var/log/syslog","kind":"file","size":12345}]}}
{"type":"transfer-progress","payload":{"id":"t-abc","transferred":1048576,"total":4194304}}
{"type":"transfer-state","payload":{"id":"t-abc","status":"running","speed_bps":524288}}
{"type":"transfer-state","payload":{"id":"t-abc","status":"success"}}
```

---

## Appendix C — GitHub Issue Templates

> Place under `.github/ISSUE_TEMPLATE/`. Copy/paste the YAML below to create three templates: Epic, Feature Task, Bug.

### epic.yml

```yaml
name: "Epic: <Title>"
description: Track a product epic composed of multiple tasks
labels: ["epic", "P0"]
title: "EPIC: <Title>"
body:
  - type: textarea
    id: goals
    attributes:
      label: Goals
      description: What outcomes should be achieved?
      placeholder: |
        - 
    validations:
      required: true
  - type: textarea
    id: non_goals
    attributes:
      label: Non-Goals
  - type: textarea
    id: scope
    attributes:
      label: Scope & Deliverables
  - type: checkboxes
    id: milestones
    attributes:
      label: Milestones
      options:
        - label: Design approved
        - label: Backend landed
        - label: CLI UI landed
        - label: QA complete
  - type: textarea
    id: risks
    attributes:
      label: Risks & Mitigations
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance Criteria
      description: What proves this epic is done?
```

### feature_task.yml

```yaml
name: "Task: <Title>"
description: Implement a feature-sized task under an epic
labels: ["task", "P1"]
title: "TASK: <Title>"
body:
  - type: input
    id: epic
    attributes:
      label: Parent Epic
      placeholder: EPIC issue URL or number
  - type: textarea
    id: desc
    attributes:
      label: Description
  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      options:
        - label: API/IPC finalized
        - label: Unit tests added
        - label: Integration tests added
        - label: Docs updated
        - label: Telemetry/logging added
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance Criteria
```

### bug.yml

```yaml
name: "Bug: <Title>"
description: Report a defect with steps to reproduce
labels: ["bug", "P0"]
title: "BUG: <Title>"
body:
  - type: textarea
    id: repro
    attributes:
      label: Steps to Reproduce
      placeholder: 1) ... 2) ... 3) ...
      render: bash
  - type: textarea
    id: expected
    attributes:
      label: Expected
  - type: textarea
    id: actual
    attributes:
      label: Actual
  - type: dropdown
    id: platform
    attributes:
      label: Platforms
      options: [Windows, macOS, Linux]
      multiple: true
  - type: input
    id: version
    attributes:
      label: App/CLI Version
  - type: checkboxes
    id: attachments
    attributes:
      label: Attachments
      options:
        - label: Logs included
        - label: Screenshots included
```

---

## Appendix D — Seed Issues (copy/paste)

> Create issues quickly by copy/pasting. Replace `@owner` and fill details.

* **EPIC**: IPC & Runtime Base (P0) — #new

    * TASK: Define JSON-RPC envelopes + TS/Rust types — @owner
    * TASK: Implement stdio framing (child process) — @owner
    * TASK: Handshake (version/capabilities) — @owner

* **EPIC**: SFTP Adapter & File Ops (P0) — #new

    * TASK: `fs.list` + capabilities mask — @owner
    * TASK: upload/download + progress — @owner
    * TASK: mkdir/rename/delete — @owner

* **EPIC**: Edit Proxy (P1) — #new

    * TASK: temp mapping + open-with — @owner
    * TASK: watcher (debounce, stability) — @owner
    * TASK: conflict policy (overwrite/pull copy) — @owner

* **EPIC**: CLI (Ink) UI (P0) — #new

    * TASK: scaffold + TTY detection + degrade — @owner
    * TASK: command palette (search/groups/recent) — @owner
    * TASK: directory list & transfer center — @owner

* **EPIC**: Observability & Logs (P1) — #new

    * TASK: structured logs → SQLite — @owner
    * TASK: `--ndjson` non‑TTY mode — @owner
    * TASK: diagnostics copy helper — @owner

---

**End of Document**
