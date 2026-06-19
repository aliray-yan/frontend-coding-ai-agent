# Frontend Coding AI Agent

Offline desktop/web GUI assistant for frontend development practice and project building.

The app uses:

- Electron + React + Vite + TypeScript
- Tailwind CSS renderer UI
- Node.js services inside Electron
- Local SQLite database through SQL.js
- Local RAG with SQLite-stored chunks and deterministic local hash embeddings
- Local llama.cpp backend with GGUF models
- No ChatGPT, OpenAI, Codex, Claude, Gemini, telemetry, analytics, or cloud AI API calls at runtime

## What It Does

- Runs as a Windows desktop app.
- Lets you select a local `.gguf` coding model.
- Starts and stops a local `llama.cpp` `llama-server` process automatically.
- Streams chat responses from `http://127.0.0.1:<port>`.
- Stores chats, settings, projects, snapshots, and RAG data locally.
- Imports the UI UX Pro Max skill repo into the local knowledge base.
- Imports bundled frontend docs and any local docs folder.
- Searches local knowledge chunks and cites source names in answers.
- Opens, reads, edits, previews, snapshots, and rolls back frontend project files.

## Install Dependencies

```powershell
npm install
```

## llama.cpp Setup

This app does not use Ollama. It expects a local llama.cpp server executable.

Place a Windows `llama-server.exe` build here:

```text
vendor/llama.cpp/llama-server.exe
```

You can also select a different server executable in Settings.

Recommended GGUF models:

- Qwen2.5-Coder GGUF
- DeepSeek-Coder GGUF
- CodeLlama GGUF
- StarCoder2 GGUF
- Phi or other small coding GGUF models for weaker laptops

The app does not bundle a GGUF model. First launch flow:

1. Open Settings.
2. Click Browse next to Local model path.
3. Select your `.gguf` file.
4. Confirm the llama.cpp server path.
5. Click Save settings.
6. Click Start or Test local inference.

If no model is selected, chat shows:

```text
No local GGUF model selected. Please choose a local coding model file before chatting.
```

## Import Knowledge

From the GUI:

1. Open Knowledge Base.
2. Click Import UI UX Pro Max.
3. Click Import frontend docs.
4. Use Search RAG to verify retrieval.

From the terminal:

```powershell
npm run import:uiux
npm run import:docs
npm run build:index
```

The UI UX Pro Max skill repo is imported from:

```text
https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
```

Useful Markdown, JSON, CSV, and text-like files are chunked and indexed. Large lockfiles and generated folders are skipped.

You can import a local docs folder:

```powershell
npm run import:docs -- --folder=C:\path\to\docs
```

You can download and index a public docs URL once during setup:

```powershell
npm run import:docs -- --url=https://example.com/docs-page
```

## Run In Development

```powershell
npm run dev
```

This starts:

- Vite renderer dev server
- Main/preload TypeScript watcher
- Electron app

## Build Production Assets

```powershell
npm run build
```

## Build Windows Executable

```powershell
npm run package:win
```

Outputs are written to:

```text
release/
```

Expected artifacts include a portable executable and an NSIS installer, named like:

```text
release/Frontend Coding AI Agent-0.1.0-x64-portable.exe
release/Frontend Coding AI Agent-0.1.0-x64-setup.exe
```

Both Windows artifacts use the app icon from `build/icon.ico`. The build uses a local `rcedit` hook to stamp the icon onto the executable while keeping the personal build unsigned.

## Data Locations

In development:

```text
data/app.db
knowledge/raw/
knowledge/processed/
projects/
```

In packaged builds, writable app data is stored under the Windows user data folder for the app.

## Screens

- Home: setup wizard, recent projects, model/knowledge status
- Chat: chat history, local streaming, model modes, project context, RAG citations
- Project: file tree, editor, HTML preview, search, snapshots, rollback, project-aware AI prompt
- Knowledge Base: indexed sources, import buttons, folder import, local vector search
- Settings: GGUF model path, llama.cpp server path, context size, temperature, max tokens, GPU layers, CPU threads, theme, offline mode, privacy note

## Scripts

```powershell
npm run check:llama
npm run import:uiux
npm run import:docs
npm run build:index
npm run typecheck
npm run build
npm run package:win
```

## Troubleshooting

`llama.cpp server executable not found`

- Put `llama-server.exe` in `vendor/llama.cpp/`.
- Or choose the executable in Settings.

`No local GGUF model selected`

- Select a `.gguf` model file in Settings.

`Backend did not become ready`

- Try fewer GPU layers.
- Try a smaller quantized model.
- Increase available RAM.
- Check that the selected file is a valid GGUF model.
- Make sure no other process is using the configured port.

`Knowledge search returns no results`

- Import frontend docs or the UI UX Pro Max skill.
- Run `npm run build:index`.
- Search for specific frontend terms such as `product card`, `hero spacing`, `contrast`, or `responsive grid`.

`Packaging downloads fail`

- Electron and electron-builder may download platform binaries during the first build.
- Run `npm install` and `npm run package:win` with internet access once.
- After dependencies and model files are present, normal app runtime is local.
- If Electron download cache is damaged, delete `.electron-cache/` and run `npm run package:win` again.

## Privacy

The chat path sends prompts only to `127.0.0.1` for the local llama.cpp backend. The app does not upload prompts, files, code, chats, embeddings, or project data. There is no telemetry or analytics.
