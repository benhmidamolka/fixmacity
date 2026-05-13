# G4F Integration for FixMaCity Chatbot

## Overview

The chatbot now supports **gpt4free (g4f)**, allowing you to use free AI models (GPT-4, Claude, Gemini, etc.) without API keys. If g4f is unavailable, the system automatically falls back to Gemini API.

## Architecture

```
Frontend (React)
    ↓
Node.js Backend (port 5005)
    ├─→ G4F API Server (http://localhost:1337) [Primary]
    └─→ Gemini API (fallback)
```

## Setup Instructions

### 1️⃣ Install G4F (One-time)

Run the setup script from the repository root:

```bash
python run_g4f_server.py
```

This will:
- Upgrade pip
- Install g4f library
- Start the API server

**Or manually:**

```bash
pip install -U g4f
# Or with all extras (recommended):
pip install -U "g4f[all]"
```

### 2️⃣ Run Both Servers

You need **two terminal windows**:

**Terminal 1 — Start G4F API Server:**
```bash
# From repository root
python run_g4f_server.py
# Or directly:
python -m g4f.api
```

You should see:
```
INFO:g4f.Provider:Starting server
Running on http://127.0.0.1:1337
```

**Terminal 2 — Start Node.js Backend:**
```bash
cd fixmacity-backend
npm run dev
```

You should see:
```
[Chatbot] G4F integration enabled
Server running on http://localhost:5005
```

### 3️⃣ Test the Integration

Send a message via the frontend chatbot and check the backend logs:

```
[g4f] Trying model: gpt-4o-mini
[g4f] Model gpt-4o-mini succeeded
[g4f] Success with gpt-4o-mini: Bonjour! Je suis Baladia...
```

If you see `[Gemini] Sending message:`, then g4f was unavailable and it fell back to Gemini.

## Configuration

### Enable/Disable G4F

In your `.env` file:

```env
# Use G4F as primary (default: true)
USE_G4F=true

# Switch back to Gemini only
USE_G4F=false

# Custom G4F server URL (default: http://localhost:1337)
G4F_API_URL=http://localhost:1337
```

## Model Fallback Strategy

The chatbot tries models in this order:

1. **gpt-4o-mini** — Fast, good quality (recommended)
2. **gpt-4o** — Slower but smarter
3. **llama-3.1-70b** — Open source, reliable

If all fail → Falls back to **Gemini API** → Returns generic error message

## Troubleshooting

### ❌ "Failed to connect to G4F server"

**Solution:** Make sure the G4F server is running in Terminal 1:
```bash
python -m g4f.api
```

Then wait 2-3 seconds and retry your message.

### ❌ "All models exhausted"

**Meaning:** All free providers temporarily failed (they can be unstable).

**Solutions:**
1. Retry your message in a few seconds
2. Check if G4F server is still running
3. Switch to Gemini by setting `USE_G4F=false` in `.env`

### ❌ "ModuleNotFoundError: No module named 'g4f'"

**Solution:** Install g4f:
```bash
pip install -U g4f
# If that fails, try with extras:
pip install -U "g4f[all]"
```

### ❌ Port 1337 already in use

**Solution:** Kill the existing process:
```bash
# Windows:
netstat -ano | findstr :1337
taskkill /PID <PID> /F

# Or use a different port and set in .env:
G4F_API_URL=http://localhost:1338
```

## Performance Notes

| Model | Speed | Quality | Best For |
|-------|-------|---------|----------|
| gpt-4o-mini | ⚡ Fast | 🟢 Good | Chatbot responses |
| gpt-4o | 🟡 Medium | 🟢 Great | Complex queries |
| llama-3.1-70b | 🟡 Medium | 🟢 Good | Reliable fallback |
| Gemini (fallback) | 🟢 Good | 🟢 Great | Always available |

## Switching Back to Gemini Only

If you want to remove g4f and use only Gemini:

1. Set in `.env`:
   ```env
   USE_G4F=false
   ```

2. No need to stop the G4F server — the backend will ignore it

## Deployment Notes

For production:

1. **Do NOT run g4f on shared servers** — it uses reverse-engineered APIs
2. **Consider commercial alternatives:**
   - OpenAI API (GPT-4)
   - Anthropic (Claude)
   - Google Cloud (Gemini API)
3. **For local testing only**, g4f is perfect
4. The fallback to Gemini ensures the chatbot always works if g4f fails

## Language Support

The system maintains the original system prompt that supports:
- 🇫🇷 French (Français)
- 🇬🇧 English
- 🇸🇦 Arabic (Modern Standard & Tunisian Darija)

---

**Questions?** Check the backend logs or contact support.
