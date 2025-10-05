# ProtoShell (Ink) — Full‑Featured Shell Design for keke‑proto‑tool

**Status**: Draft v1.0
**Scope**: A cross‑platform, full‑featured shell embedded as a sub‑feature of keke‑proto‑tool. Interactive UI rendered with **Ink** (React for Terminal). Execution core in **Rust** for performance, security, and portability. GUI app can host the same core via an embedded terminal tab.

---

## 1) Objectives & Principles

* **Feature‑complete**: modern interactive shell experience (prompt, history, completion, suggestions, pipes, redirects, jobs, scripts, config, plugins).
* **Separation of concerns**: **Ink (Node/TS)** handles input, rendering, overlays; **Rust** handles parsing, expansion, execution, job control, persistence.
* **Compatibility first**: POSIX‑ish grammar on Unix; pragmatic fallbacks on Windows.
* **Interoperability**: shell can act as a front‑end to external TUIs (vim, less, top) via PTY pass‑through.
* **Security**: secrets never echo; sandboxed plugin API; least‑privilege FS and process spawning.

---

## 2) User Stories

* As a developer, I want a fast, pretty shell with **fish‑like suggestions**, **fuzzy history (Ctrl‑R)**, and **rich prompt**.
* As a power user, I want **tab completion** (files, commands, git, custom), **aliases/functions**, **pipes/redirects**, and **background jobs**.
* As a project user, I want built‑in commands to interact with ProtoTool (**proto:** commands), e.g., `proto connect`, `proto sftp`, `proto open`.
* As an admin, I want it to **run full‑screen TUIs** (vim, htop) cleanly and return to the shell without visual glitches.

---

## 3) Modes & High‑Level Flow

**Mode A — Structured Shell (Ink UI)**:

* Inline input line with syntax highlighting, completions list, ghost suggestions.
* Output scrollback managed by Ink (paged when large).

**Mode B — PTY Pass‑Through**:

* For commands that require direct terminal control (vim/less/top), temporarily **suspend Ink layout** and attach the child PTY to the terminal.
* On process exit, **resume** Ink UI with preserved history.

**Mode C — Batch**: non‑interactive (NDJSON/plain logs), for scripting/CI use.

---

## 4) Architecture Overview

```
apps/
  proto-cli/        (Ink + Node/TS — TUI front-end)
crates/
  proto-shell-core/ (Rust lib — parser, executor, jobs, state, persistence)
  proto-shelld/     (Rust bin — optional daemon for reuse by GUI/CLI)

IPC: JSON-RPC over stdio (interactive) + NDJSON event stream
PTY: portable-pty (Rust) for cross-platform pseudo-terminals
```

**Responsibilities**

* **Ink Front‑End** (Node/TS): line editor, keybindings, completion UI, history overlay, progress toasts, statusline/prompt rendering, TTY detection, pass‑through switching.
* **Shell Core (Rust)**: lexical analysis → parse → expansions → plan → execute; process pipeline orchestration; job control/signals; redirections; glob; env/vars; aliases/functions; history; config; persistence (SQLite).
* **PTY Manager**: create/manage PTYs for interactive children; detect "TUI intent" and request pass‑through.

---

## 5) Grammar & Semantics (v1)

**Tokens & Quoting**: words, single quotes, double quotes, backslash escapes.
**Expansions**: `$VAR`, `${VAR}`, `~user`, command substitution `$(...)` (v1.1), glob `* ? [] **` (globset), arithmetic `$(( ))` (v1.1).
**Pipelines**: `cmd1 | cmd2 | cmd3` (pipe chains).
**Lists**: `;`, `&&`, `||` with short‑circuit.
**Redirections**: `>`, `>>`, `<`, `2>`, `&>`, `2>&1`, here‑doc `<<EOF` (v1.1).
**Backgrounding**: trailing `&` creates background job.
**Subshell**: `( command list )` executes in child env.
**Variables**: env and shell vars, `export`, `set`, `unset`.
**Aliases**: `alias ll='ls -al'`, expanded pre‑parse (cycle detection).
**Functions (v1.1)**: `fn name { ... }` or `name() { ... }`.

Windows specifics: prefer direct exec where possible; where builtins are cmd.exe only (e.g., `dir`), provide shell builtins or map to powershell equivalents. Job control is best‑effort.

---

## 6) Built‑Ins (v1)

* **Filesystem**: `cd`, `pwd`, `ls` (simple cross‑platform), `mkdir`, `rm`, `mv`, `cp` (thin wrappers; external tools still available).
* **Shell**: `alias`, `unalias`, `set`, `unset`, `export`, `which`/`type`, `history`, `source`/`.` , `echo`, `true`, `false`, `test`/`[ ]`, `time`.
* **Dirs**: `dirs`, `pushd`, `popd`.
* **Jobs**: `jobs`, `fg`, `bg`, `kill` (signal mapping).
* **ProtoTool**: `proto connect`, `proto sftp`, `proto open`, `proto edit`, `proto settings` — bridge into existing features.
* **Help**: `help <cmd>` (from internal registry + `tldr`/`man` fallback).

v1.1: functions, arithmetic, here‑doc, arrays.

---

## 7) Execution & Job Control

* **Resolver**: PATH lookup (respect PATHEXT on Windows); `which` resolves to absolute.
* **Pipelines**: spawn processes with piped stdio; set process group; wire signals.
* **TTY & Signals** (Unix): foreground job owns TTY (`tcsetpgrp`), SIGINT/SIGTSTP flows; background jobs blocked from reading TTY.
* **Windows**: emulate jobs with process handles; `Ctrl+C` via GenerateConsoleCtrlEvent; no SIGTSTP — `bg/fg` limited.
* **PTY Pass‑Through**: children flagged as TUI (allow‑list + heuristic based on CSI density) get dedicated PTY; Ink UI hides; upon exit, PTY destroyed and UI resumes.

---

## 8) UI/UX with Ink

* **Prompt line**: syntax highlight (tokens, errors), **ghost suggestion** (right‑aligned), **inline diagnostics** (e.g., unmatched quote).
* **Completions panel**: scrollable grid with icons (file/dir/cmd/git), filter via fuzzy search; Tab cycles; Right arrow accepts.
* **History search**: Ctrl‑R overlay with incremental fuzzy (recent boosted), preview of full command, arrow to accept.
* **Statusline**: cwd breadcrumbs, git branch/status, last exit code, job count, time; optional right prompt (RPROMPT).
* **Toasts**: transfer/job finish, errors, tips.
* **Pager**: long output can be viewed in a built‑in pager overlay (less‑like keys) or auto pipe to `less` in pass‑through.
* **Themes**: monochrome fallback; disable emoji/colors via flags/env.

Libraries: `ink`, `ink-text-input`, `ink-select-input`, `ink-table`, `ink-spinner`, minimal custom renderer for syntax.

---

## 9) Completion & Suggestions

* **File system**: path‑aware completion; expands `~`, respects hidden files toggle.
* **Commands**: PATH scan + cache; prefer executables; include built‑ins and functions.
* **Arguments**: per‑command completers via a registry (Rust side), e.g., `git` subcommands/branches, `kill` → PIDs, `cd` → dirs.
* **History‑based suggestions**: fish‑like inline ghost text based on prefix + cwd context.
* **Plugin completers**: WASM or Rust plugins can register completion hooks by pattern.

---

## 10) Persistence (SQLite)

Tables (shell‑scoped; separate from connection/transfer tables):

* `shell_history(id, ts, cwd, command, exit_code)`
* `shell_aliases(name PRIMARY KEY, body, created_at, updated_at)`
* `shell_functions(name PRIMARY KEY, body, created_at, updated_at)`
* `shell_vars(key PRIMARY KEY, value_json)`
* `shell_sessions(id, started_at, ended_at, last_cwd)`

History retention policy and VACUUM schedule configurable.

---

## 11) Configuration & Startup

* **Config files**: `~/.proto-shellrc` and project‑local `.proto-shellrc` (cwd).
* **Env**: `PROTO_SHELL_THEME`, `PROTO_SHELL_EDITOR`, `PROTO_SHELL_EMOJI`, `PROTO_SHELL_PAGER`, `PROTO_SHELL_RC`.
* **Flags**: `--non-interactive`, `--ndjson`, `--no-color`, `--no-emoji`, `--rc <file>`, `--cwd <dir>`.
* **Profiles**: quick switch between **POSIX profile** and **PowerShell‑friendly profile** on Windows.

---

## 12) Plugin System

* **Built‑in plugins**: git completer, tldr/man provider, ProtoTool bridge commands.
* **WASM plugins**: describe commands, completions, prompts; sandboxed (no direct FS unless permitted).
* **Lifecycle**: plugins load at startup; can be toggled via `proto settings` or `plugin enable/disable` built‑ins.

---

## 13) IPC Protocol (CLI ⇄ Core)

* `shell.eval { line, cwd, env_delta } → { result: exit_code, background_job_id? }`
* `shell.complete { line, cursor, cwd } → { suggestions[] }`
* `shell.history { query?, limit? } → { items[] }`
* `shell.config.get/set`
* Events: `print` (stdout/stderr chunk), `prompt` (PS1 string parts), `job-state`, `toast`, `pager-start/stop`, `pass-through-enter/exit`.

---

## 14) Integration with GUI App

* GUI hosts a **Terminal tab**. When user opens it, the GUI connects to **proto-shelld** (daemon) and renders via xterm.js (GUI) or mirroring Ink output.
* File manager and SFTP views can **inject commands** into the shell (`cd`, `proto sftp edit ...`).

---

## 15) Testing & QA

* **Unit**: parser (valid/invalid), expansion, pipeline builder, globbing, redirection, alias recursion.
* **Integration**: spawn executables; pipelines; background jobs; Windows/Unix parity; PTY pass‑through with `vim`/`less`.
* **UI**: Ink components with `ink-testing-library`; keybinding matrix; snapshot prompts.
* **E2E**: history search, suggestions accuracy, pager overlay, large outputs.
* **Perf**: prompt under 5ms; suggestion under 10ms for 50k history; scrollback memory cap.

---

## 16) Risks & Mitigations

* **PTY + Ink conflicts**: pass‑through explicitly disables Ink layout; resume with redraw.
* **Windows job control**: document limitations; provide alternative (`Start-Process`‑like backgrounding).
* **Parser complexity**: stage features (v1 baseline; v1.1 advanced).
* **Huge outputs**: auto‑pipe to pager; cap scrollback; stream to temp file.

---

## 17) Acceptance Criteria (DoD)

* Prompt, history, completions, suggestions, pipes, redirects OK on Unix; equivalent behavior on Windows with documented deltas.
* Run external TUIs cleanly; return to prompt without corruption.
* Built‑ins (list above) behave as specified; `proto` built‑ins bridge to project features.
* Non‑interactive mode usable in CI; exit codes correct.

---

## 18) Roadmap — Epics & Tasks

### EPIC A — Core Engine (Rust) [P0]

* A1 Lexer + parser (words, quotes, ops).
* A2 Expansions (vars, tilde, glob).
* A3 Executor (pipelines, redirects, cwd, env).
* A4 Job control (Unix fg/bg, signals; Windows best‑effort).
* A5 Built‑ins (cd, export, alias, history, which, dirs, pushd/popd, echo, test, time).
* **Acceptance**: run `echo`, `ls | grep x`, `cat < in > out`, `sleep 5 & jobs`, `fg`, `cd ..`, `alias ll`, history persists.

### EPIC B — PTY Management & Pass‑Through [P0]

* B1 portable‑pty integration; detect TUI via allowlist + CSI heuristic.
* B2 Pass‑through enter/exit; redraw shell state.
* **Acceptance**: `vim`, `less`, `top` work without layout issues.

### EPIC C — Ink Front‑End [P0]

* C1 Line editor with syntax highlight; ghost suggestion.
* C2 Completions panel & keybindings.
* C3 History (Ctrl‑R) overlay; fuzzy.
* C4 Statusline + toasts; pager overlay.
* **Acceptance**: keyboard‑only operation; stable rendering across popular terminals.

### EPIC D — Persistence & Config [P1]

* D1 SQLite schema (history, aliases, functions, vars, sessions).
* D2 Config loader (`~/.proto-shellrc`).
* D3 Settings commands (`set`, `proto settings`).
* **Acceptance**: alias/functions survive restarts; configurable theme/editor/pager.

### EPIC E — Completions & Plugins [P1]

* E1 PATH & file completions.
* E2 Command‑aware completers (git, kill, cd).
* E3 Plugin API + sample WASM completer.
* **Acceptance**: context‑aware suggestions; plugin toggling.

### EPIC F — Windows Parity [P1]

* F1 PATHEXT; `where` integration; PowerShell profile.
* F2 Ctrl‑C/ctrl‑break behavior; backgrounding notes.
* **Acceptance**: core flows usable on Windows with docs.

### EPIC G — Docs & Help [P1]

* G1 `help` system; `tldr` integration.
* G2 Man page preview (pass‑through fallback).
* **Acceptance**: `help cd`/`help proto` shows rich help.

---

## 19) Keybindings (Default)

* **Navigation**: Left/Right, Home/End, Alt‑B/F (word), Ctrl‑A/E.
* **Edit**: Ctrl‑W (del word), Ctrl‑U/K (cut to BOL/EOL), Ctrl‑Y (yank).
* **History**: Up/Down, Ctrl‑R (reverse search).
* **Completions**: Tab (cycle), Shift‑Tab (reverse), Right (accept).
* **Jobs**: Ctrl‑C (SIGINT), Ctrl‑Z (SIGTSTP on Unix), `fg`/`bg`.
* **Misc**: Ctrl‑L (clear), Ctrl‑D (EOF/exit when empty), F1 (help).

---

## 20) SQLite DDL (Shell Tables)

```sql
CREATE TABLE IF NOT EXISTS shell_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cwd TEXT NOT NULL,
  command TEXT NOT NULL,
  exit_code INTEGER
);
CREATE INDEX IF NOT EXISTS idx_shell_history_ts ON shell_history(ts DESC);

CREATE TABLE IF NOT EXISTS shell_aliases (
  name TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER IF NOT EXISTS tr_shell_aliases_upd AFTER UPDATE ON shell_aliases
BEGIN UPDATE shell_aliases SET updated_at=CURRENT_TIMESTAMP WHERE name=OLD.name; END;

CREATE TABLE IF NOT EXISTS shell_functions (
  name TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER IF NOT EXISTS tr_shell_functions_upd AFTER UPDATE ON shell_functions
BEGIN UPDATE shell_functions SET updated_at=CURRENT_TIMESTAMP WHERE name=OLD.name; END;

CREATE TABLE IF NOT EXISTS shell_vars (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shell_sessions (
  id TEXT PRIMARY KEY,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  last_cwd TEXT
);
```

---

## 21) Open Questions

* Do we target **function definitions** in v1 or v1.1?
* Should we support **here‑docs** at launch or stage later?
* Which **Windows profile** is default (cmd.exe vs pwsh)?
* How large should **scrollback** be before auto‑pagering (configurable)?

---

## 22) Task Board — Roadmap & Scheduling (EPIC → Tasks → Acceptance)

> Priorities: **P0 (must‑have for v1)**, **P1 (nice‑to‑have for v1.0)**, **P2 (post‑1.0)**. Dependencies are explicit. Replace `@owner` with assignees.

### Milestones & Suggested Sprints

* **Sprint 0 (Infra & IPC)** — IPC scaffolding, logging, CI smoke.
* **Sprint 1 (Core Shell + Basic UI)** — Parser/executor baseline; prompt, history, simple completions.
* **Sprint 2 (PTY + Pass‑Through + Pipelines)** — Run TUIs; robust pipelines/redirects; jobs.
* **Sprint 3 (Completions/Plugins/Config)** — Context‑aware completion; rc config; persistence polish.
* **Hardening (Cross‑Platform & Docs)** — Windows parity, help, man/tldr, packaging.

---

### EPIC A — Core Engine (Rust) [P0]

**A1 Lexer/Scanner** — tokens, quoting, escapes. **Acceptance**: unit tests for edge cases; invalid tokens flagged.

**A2 Parser** — words, lists (`; && ||`), pipelines (`|`), background (`&`), subshell `(...)`. **Acceptance**: AST snapshot tests; error recovery on unmatched quotes.

**A3 Expansions** — env vars, tilde, glob (`* ? [] **`). **Acceptance**: path/glob tests; `$VAR` precedence; `~user` fallback.

**A4 Executor** — PATH resolve (PATHEXT on Win), spawn, cwd/env, pipelines/stdio, redirects (`> >> < 2> &>`). **Acceptance**: `echo x >f && cat f`; `ls | grep y` success codes propagate.

**A5 Job Control (Unix)** — fg/bg, process groups, signals (SIGINT/SIGTSTP). **Acceptance**: `sleep 5 &`, `jobs`, `fg` works; Ctrl‑C interrupts fg job only.

**A6 Built‑ins (phase 1)** — `cd`, `pwd`, `echo`, `true/false`, `alias/unalias`, `set/unset/export`, `which/type`, `history`, `dirs/pushd/popd`, `time`. **Acceptance**: behavioral parity documented; unit tests per builtin.

**Dependencies**: A1→A2→A3→A4; A5 needs A4; A6 may parallel A3/A4.

---

### EPIC B — PTY Management & Pass‑Through [P0]

**B1 PTY Layer** — cross‑platform PTY create/attach; stream pump. **Acceptance**: echo server verifies raw mode + resize.

**B2 TUI Detection** — allowlist (vim, less, top) + CSI heuristic. **Acceptance**: detection rate > 95% on test matrix.

**B3 Pass‑Through Lifecycle** — enter/exit; save/restore terminal modes; redraw Ink UI. **Acceptance**: `vim`, `less`, `htop` run cleanly; return to prompt without artifacts.

**Dependencies**: A4; Ink shell scaffold ready (C1).

---

### EPIC C — Ink Front‑End (Node/TS) [P0]

**C1 Shell Scaffold** — Ink app, TTY detection, non‑TTY degrade to plain logs. **Acceptance**: runs in interactive and CI.

**C2 Line Editor** — cursor moves, word ops, Home/End, delete/yank; syntax highlight (basic). **Acceptance**: keymap test table; unmatched quote warning inline.

**C3 History UI** — Ctrl‑R fuzzy search; preview + accept. **Acceptance**: search across 50k entries under 10ms median.

**C4 Completions Panel** — Tab cycle, Shift‑Tab reverse, Right accept; icons for file/dir/cmd. **Acceptance**: file/cmd completion in cwd and PATH.

**C5 Statusline & Toasts** — cwd, git branch, exit code, job count; transient notifications. **Acceptance**: visual update latency < 1 frame.

**C6 Pager Overlay** — page long outputs; fallback auto‑pipe to `less` when configured. **Acceptance**: smooth scroll; exit returns to prompt.

**Dependencies**: A* engine for real execution; B* for pass‑through.

---

### EPIC D — Persistence & Config [P1]

**D1 SQLite Shell Tables** — history/aliases/functions/vars/sessions (see §20). **Acceptance**: migrations applied; vacuum schedule.

**D2 RC Loader** — `~/.proto-shellrc` + project `.proto-shellrc`; env overrides. **Acceptance**: alias/function loads at startup.

**D3 Settings Commands** — `set`, `proto settings` to persist theme/editor/pager/limits. **Acceptance**: restart retains settings.

**Dependencies**: C1; A6 for built‑ins.

---

### EPIC E — Completions & Plugins [P1]

**E1 PATH & File Completion** — cache PATH executables; hide dupes; case sensitivity policy per OS. **Acceptance**: latency < 10ms typical.

**E2 Command‑Aware Completers** — git (subcommands/branches), `kill` (PIDs), `cd` (dirs). **Acceptance**: correctness vs ground truth.

**E3 Plugin API** — register completers/prompts/commands; sample WASM plugin. **Acceptance**: enable/disable at runtime; sandbox respected.

**Dependencies**: D1/D2; A3 for expansions.

---

### EPIC F — Windows Parity [P1]

**F1 Resolution & PATHEXT** — `where` parity; `.EXE/.BAT/.CMD` rules. **Acceptance**: `which`/`type` results correct.

**F2 Signals & Ctrl‑C** — GenerateConsoleCtrlEvent; background semantics documented. **Acceptance**: ctrl‑c stops fg job, shell survives.

**F3 Profile & Aliases** — PowerShell‑friendly defaults; path quoting. **Acceptance**: quickstart works out‑of‑box.

**Dependencies**: A4/A6, B1.

---

### EPIC G — Docs & Help [P1]

**G1 `help` System** — builtin registry; examples; exit codes. **Acceptance**: `help <cmd>` prints structured help.

**G2 TLDR/Man Integration** — try tldr first; fallback to `man` via pass‑through. **Acceptance**: `help ls` shows tldr when available.

**G3 Troubleshooting Guide** — PTY issues, Windows quirks, color/emoji. **Acceptance**: docs linked from `help`.

---

### EPIC H — GUI Integration [P1]

**H1 Terminal Tab** — mount shell core in GUI (xterm.js or mirror Ink). **Acceptance**: GUI tab runs same commands; copy/paste/resize OK.

**H2 Feature Bridge** — `proto` built‑ins trigger project features (connect/sftp/edit). **Acceptance**: round‑trip tested.

**Dependencies**: A*, B*, C*.

---

### Cross‑Epic Quality Gates

* **Perf**: prompt render < 5ms; completion < 10ms; no GC pauses > 50ms in TTY.
* **Memory**: scrollback cap; large output auto‑pager; no leaks under stress.
* **Security**: no secrets in logs; pass‑through disables Ink intercept cleanly.
* **Accessibility**: monochrome theme passes; no color‑only cues.

---

### Milestone Exit Criteria

* **M0 (Sprint 0)**: IPC online; `echo hello` via engine; CI non‑TTY smoke.
* **M1 (Sprint 1)**: Parser/executor + prompt/history/completion basic; simple pipelines; redirects.
* **M2 (Sprint 2)**: PTY pass‑through with `vim/less/top`; jobs on Unix; pager overlay.
* **M3 (Sprint 3)**: Context completers; RC config; persistence polish; Windows parity checklist done.
* **GA Hardening**: Docs/help complete; packaging; cross‑platform regression green.

---

### Labels & Workflow

* Labels: `epic`, `task`, `bug`, `P0/P1/P2`, `windows`, `unix`, `pty`, `ui`, `engine`, `docs`.
* PR checks: unit + integration + snapshot tests; cross‑platform matrix.
* Definition of Ready: problem statement, API sketch, tests outlined, owner assigned.
* Definition of Done: acceptance met; docs & tests updated; telemetry/logs added where relevant.

---

**End of Document**
