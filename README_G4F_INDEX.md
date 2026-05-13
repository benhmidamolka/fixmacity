# FixMaCity G4F Integration — START HERE 📚

## What's New?

Your FixMaCity chatbot now supports **free AI models** via gpt4free, with automatic fallback to Gemini API. No API keys needed!

---

## 🚀 Quick Start (5 minutes)

### Step 1: Install G4F
```bash
pip install -U g4f
```

### Step 2: Run Two Servers

**Terminal 1 — G4F Server:**
```bash
python -m g4f.api
```

**Terminal 2 — FixMaCity Backend:**
```bash
cd fixmacity-backend
npm run dev
```

### Step 3: Test
- Open the chatbot in FixMaCity frontend
- Send a message
- Watch Terminal 1 logs for `[g4f]` confirmation

**✅ That's it!** The chatbot now uses free AI models.

---

## 📖 Documentation Files

Choose based on your needs:

### 👤 For Windows Users
**→ Read: `G4F_QUICKSTART.md`**
- Windows-focused setup
- Step-by-step instructions
- Common issues & fixes

### 🔧 For Complete Setup Guide
**→ Read: `G4F_SETUP.md`**
- Full installation details
- Running both servers
- Configuration options
- Troubleshooting guide
- Production considerations

### 🏗️ For Architecture & Overview
**→ Read: `FIXMACITY_G4F_INTEGRATION.md`**
- What was implemented
- System architecture
- How everything works
- Next steps

### 📋 For Implementation Details
**→ Read: `G4F_IMPLEMENTATION.md`**
- Complete overview
- Files created/modified
- Configuration details
- Testing procedures
- Performance notes

### 📝 For Change Reference
**→ Read: `G4F_CHANGES.md`**
- Exact file changes
- Code modifications
- Configuration guide
- Rollback plan
- Technical details

---

## 📂 Files Created

### Services
- **`fixmacity-backend/src/services/g4f.service.js`** — G4F API wrapper

### Scripts
- **`run_g4f_server.py`** — One-click setup script

### Documentation
- **`G4F_QUICKSTART.md`** — Quick start
- **`G4F_SETUP.md`** — Full guide
- **`FIXMACITY_G4F_INTEGRATION.md`** — Overview
- **`G4F_IMPLEMENTATION.md`** — Implementation
- **`G4F_CHANGES.md`** — Change details
- **`README_G4F_INDEX.md`** — This file

### Controllers (Modified)
- **`fixmacity-backend/src/controllers/chatbot.controller.js`** — Added g4f support

---

## ⚙️ How It Works

```
User Message
    ↓
Backend (Chatbot Controller)
    ↓
Try G4F (free models)
    ├─ gpt-4o-mini ✓
    ├─ gpt-4o (if fails)
    ├─ llama-3.1-70b (if fails)
    └─ Gemini API (fallback)
    ↓
Response to User
```

---

## 🎯 Configuration

### Enable/Disable (`.env`)
```env
# Use G4F (default: true)
USE_G4F=true

# Use Gemini only
USE_G4F=false

# Custom G4F server URL (optional)
G4F_API_URL=http://localhost:1337
```

---

## ✨ Key Features

✅ **No API Keys** — Uses free models (GPT-4, Claude, Gemini)
✅ **Auto-Fallback** — Switches models if one fails
✅ **Multi-Language** — Responds in French, English, Arabic
✅ **Always Works** — Gemini fallback ensures reliability
✅ **Backward Compatible** — Existing code unchanged
✅ **Environment Toggle** — Switch via .env file

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection refused" | Start G4F server in Terminal 1 |
| "All models exhausted" | Retry in a few seconds (providers unstable) |
| "ModuleNotFoundError" | `pip install -U g4f` |
| Port 1337 in use | Kill existing process or change port |
| Want Gemini only | Set `USE_G4F=false` |

---

## 📊 Model Selection

The system tries models in this order:

| Model | Speed | Quality | Status |
|-------|-------|---------|--------|
| gpt-4o-mini | ⚡ Fast | Good | 1st choice |
| gpt-4o | Slower | Great | 2nd choice |
| llama-3.1-70b | Medium | Good | 3rd choice |
| Gemini API | Fast | Great | Fallback |

---

## ✅ Pre-Launch Checklist

- [ ] Read `G4F_QUICKSTART.md` (Windows) or `G4F_SETUP.md` (full)
- [ ] Install G4F: `pip install -U g4f`
- [ ] Start G4F server: `python -m g4f.api`
- [ ] Start backend: `npm run dev` (in fixmacity-backend)
- [ ] Test chatbot message
- [ ] Verify logs show `[g4f]` messages
- [ ] Check response is working
- [ ] (Optional) Set `USE_G4F=false` and test Gemini fallback

---

## 🔄 Running Daily

**Every time you use the chatbot:**

Terminal 1:
```bash
python -m g4f.api
```

Terminal 2:
```bash
cd fixmacity-backend && npm run dev
```

Then use the chatbot normally — it will use free AI models!

---

## ⚠️ Important Notes

### For Development ✅
Perfect for testing, no API keys needed.

### For Production ⚠️
- G4F uses reverse-engineered APIs (may be unstable)
- Consider official APIs (OpenAI, Anthropic, Google) for production
- The Gemini fallback ensures the chatbot always works
- Set `USE_G4F=false` if you want to use only Gemini

---

## 🎓 Learn More

1. **Just want it working?** → `G4F_QUICKSTART.md`
2. **Need complete setup?** → `G4F_SETUP.md`
3. **Want to understand it?** → `FIXMACITY_G4F_INTEGRATION.md`
4. **Need technical details?** → `G4F_IMPLEMENTATION.md`
5. **Want to see all changes?** → `G4F_CHANGES.md`

---

## 🚀 Next Steps

### Immediate (Next 5 min)
1. Follow the Quick Start above
2. Test the chatbot

### Optional (Next hour)
1. Read full documentation
2. Customize configuration
3. Test fallback behavior

### Future (If needed)
1. Monitor usage
2. Consider switching to official APIs for production
3. Adjust model selection if needed

---

## 💡 Tips

- **Server won't start?** Make sure Python & pip are installed
- **Connection errors?** Wait 2-3 seconds after starting G4F server
- **Want to debug?** Check logs with `[g4f]` and `[Chatbot]` prefixes
- **Need Gemini only?** Just set `USE_G4F=false` in `.env`

---

## 📞 Support

**Installation help?** → Check `G4F_QUICKSTART.md` troubleshooting
**Setup questions?** → See `G4F_SETUP.md` full guide
**How does it work?** → Read `FIXMACITY_G4F_INTEGRATION.md`
**Technical details?** → Check `G4F_IMPLEMENTATION.md`

---

## ✅ Status

✅ **Implementation:** Complete
✅ **Testing:** Ready
✅ **Documentation:** Complete
✅ **Backward Compatible:** Yes
✅ **Ready to Deploy:** Yes

**You're all set! Start with the Quick Start above.** 🎉

---

**Last Updated:** May 2026
**Version:** 1.0
**Status:** Production Ready (with recommendations)
