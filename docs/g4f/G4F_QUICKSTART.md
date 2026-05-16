# Quick Start: G4F for FixMaCity (Windows)

## 📦 One-Time Setup (5 minutes)

### Step 1: Install Python (if not already installed)
Download from https://www.python.org/downloads/

Make sure to check **"Add Python to PATH"** during installation.

### Step 2: Install G4F
Open PowerShell or Command Prompt and run:

```powershell
pip install -U g4f
```

Or with extras (recommended):
```powershell
pip install -U "g4f[all]"
```

Verify it worked:
```powershell
python -c "import g4f; print('G4F installed!')"
```

---

## 🚀 Run Daily (2 terminals)

### Terminal 1: Start G4F Server
```powershell
# From the FixMaCity repository root
python -m g4f.api
```

Wait for the message:
```
Running on http://127.0.0.1:1337
```

### Terminal 2: Start Node.js Backend
```powershell
cd fixmacity-backend
npm run dev
```

Wait for:
```
Server running on http://localhost:5005
```

---

## ✅ Test It Works

1. Open the FixMaCity frontend
2. Open the chatbot
3. Send a message like: "Bonjour, comment soumettre un signalement?"
4. Check Terminal 1 (G4F) for logs like:
   ```
   [g4f] Trying model: gpt-4o-mini
   [g4f] Model gpt-4o-mini succeeded
   ```

If you see that, it's working! 🎉

---

## ❌ Troubleshooting

### Error: "ModuleNotFoundError: No module named 'g4f'"
```powershell
pip install -U g4f
```

### Error: "Connection refused" (port 1337)
Make sure G4F server is running in Terminal 1.

### Error: Port 1337 already in use
```powershell
# Find process on port 1337
netstat -ano | findstr :1337
# Kill it (replace <PID> with the number)
taskkill /PID <PID> /F
```

### No response or "All models exhausted"
The free providers can be unstable. Just retry your message.

---

## 📝 Configuration (Optional)

Edit `fixmacity-backend\.env`:

```env
# Use G4F (default: true)
USE_G4F=true

# Switch to Gemini only (if g4f is having issues)
USE_G4F=false

# Custom G4F server URL (if running elsewhere)
G4F_API_URL=http://localhost:1337
```

---

## 🔑 What Models Are Being Used?

The system tries in order:
1. GPT-4O Mini (fast, good quality)
2. GPT-4O (slower, better quality)
3. Llama 3.1 70B (reliable)

If all fail → automatically falls back to Gemini API

---

**Need help?** Check the backend logs or visit the GitHub issues page.
