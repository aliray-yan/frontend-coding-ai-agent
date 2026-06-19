# Bundled llama.cpp Backend

Place a Windows `llama-server.exe` build from llama.cpp in this folder before creating the final packaged app.

Expected default path:

```text
vendor/llama.cpp/llama-server.exe
```

The app can also use a custom executable path from Settings. At runtime it starts `llama-server` with the selected `.gguf` model, connects to `http://127.0.0.1:<port>/v1/chat/completions`, streams responses, and stops the process when the app closes.

No GGUF model file is bundled. Choose a local model from Settings after first launch.
