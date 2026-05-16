# FixMaCity Chatbot: G4F Integration Summary

## What Was Implemented

Your FixMaCity chatbot now supports **gpt4free (g4f)**, which allows free AI model access without API keys. The system intelligently falls back to Gemini API if g4f is unavailable.

---

## Files Added/Modified

### New Files Created:

1. **`fixmacity-backend/src/services/g4f.service.js`**
   - Wraps g4f API calls (http://localhost:1337)
   - Implements fallback model strategy (gpt-4o-mini → gpt-4o → llama-3.1-70b)
   - Handles timeouts and errors gracefully
   - Uses the same system prompt as Gemini (supports FR/EN/AR)

2. **`run_g4f_server.py`** (Repository root)
   - One-click script to install and run g4f API server
   - Checks for existing installation
   - Starts server on http://localhost:1337

3. **`G4F_SETUP.md`** (Repository root)
   - Complete setup and configuration guide
   - Troubleshooting section
   - Performance notes and deployment considerations

4. **`G4F_QUICKSTART.md`** (Repository root)
   - Windows-focused quick start guide
   - Step-by-step instructions
   - Daily usage workflow

### Modified Files:

1. **`fixmacity-backend/src/controllers/chatbot.controller.js`**
   - Added g4f service import
   - Added `USE_G4F` environment variable flag
   - Updated `sendMessage` to try g4f first, then fallback to Gemini
   - No breaking changes to existing API

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│               Frontend (React)                      │
│              /api/chatbot/message                   │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│         Node.js Backend (port 5005)                 │
│    chatbot.controller.js (sendMessage)              │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    ┌─────────┐           ┌─────────┐
    │  G4F    │           │ Gemini  │
    │ Service │           │  API    │
    └─────┬───┘           └────▲────┘
          │                    │
          │               (Fallback)
          │                    │
     ┌────▼──────────────┐     │
     │ http://localhost  │     │
     │      :1337        │────┘
     │  (Python Server)  │
     └───────────────────┘
```

---

## How It Works

### 1️⃣ User sends message via frontend
```
POST /api/chatbot/message
{ "message": "Bonjour, comment ça marche?" }
```

### 2️⃣ Backend checks if g4f is enabled
```javascript
if (USE_G4F) {
  // Try g4f first
  reply = await g4f.chat(history, message, context);
} else {
  // Or use Gemini directly
  reply = await gemini.chat(history, message, context);
}
```

### 3️⃣ g4f service tries models in order:
```
Try gpt-4o-mini (10s timeout)
  ├─ Success? → Return response
  └─ Failed? → Try gpt-4o
       ├─ Success? → Return response
       └─ Failed? → Try llama-3.1-70b
            ├─ Success? → Return response
            └─ Failed? → Fall back to Gemini
```

### 4️⃣ Response sent to frontend
```json
{
  "response": "Bonjour! Je suis Baladia, l'assistant de FixMaCity...",
  "session_id": "uuid-here"
}
```

---

## Environment Variables

Add to `fixmacity-backend/.env`:

```env
# Enable G4F integration (default: true)
USE_G4F=true

# Custom G4F server URL (default: http://localhost:1337)
G4F_API_URL=http://localhost:1337
```

---

## Running the System

**Terminal 1 — Start G4F Server:**
```bash
python -m g4f.api
# Or use the setup script:
python run_g4f_server.py
```

**Terminal 2 — Start Node.js Backend:**
```bash
cd fixmacity-backend
npm run dev
```

---

## Key Features

✅ **No API keys required** for GPT-4, Claude, Gemini (free tier)
✅ **Automatic fallback** to Gemini if all models fail
✅ **Multi-language support** (French, English, Arabic)
✅ **Smart retries** with model rotation
✅ **10-second timeout** per request to prevent hanging
✅ **Full backward compatibility** (existing Gemini integration unchanged)
✅ **Environment-based toggle** (easily switch between g4f and Gemini)

---

## Language Support

Both g4f and Gemini services use the same system prompt that automatically:
- 🇫🇷 Detects French and responds in French
- 🇬🇧 Detects English and responds in English
- 🇸🇦 Detects Arabic and responds in Arabic (Modern Standard or Tunisian Darija)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection refused" | Start G4F server in Terminal 1 |
| "All models exhausted" | Free providers are unstable; retry in a few seconds |
| "ModuleNotFoundError: g4f" | `pip install -U g4f` |
| Port 1337 in use | Kill existing process or set `G4F_API_URL` to different port |
| Want Gemini only | Set `USE_G4F=false` in `.env` |

---

## Next Steps

1. **Install g4f:**
   ```bash
   pip install -U g4f
   ```

2. **Read the quick start:**
   - Windows users: `G4F_QUICKSTART.md`
   - Full details: `G4F_SETUP.md`

3. **Run both servers** and test the chatbot

4. **Optional:** Adjust configuration in `.env`

---

## Notes

- **Development only:** g4f works best for development/testing. For production, consider using official APIs (OpenAI, Anthropic, Google).
- **Stability:** Free providers can be unstable. The fallback to Gemini ensures the chatbot always works.
- **No breaking changes:** Existing Gemini integration is fully preserved.
- **Backward compatible:** If g4f fails for any reason, the system automatically uses Gemini.

---

**Questions?** Refer to G4F_SETUP.md or the backend logs.
