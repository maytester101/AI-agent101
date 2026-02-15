# Quick Start Guide for Windows

## ✅ Step 1: Install Ollama (Required)

1. Download Ollama for Windows: https://ollama.ai/download/windows
2. Run the installer
3. **Restart your terminal/PowerShell** after installation
4. Verify installation:
   ```cmd
   ollama --version
   ```

## ✅ Step 2: Pull AI Model

```cmd
ollama pull deepseek-coder
```

This downloads the AI model (takes a few minutes, ~2-3GB).

## ✅ Step 3: Start Ollama Server

Open a **new terminal window** and run:
```cmd
ollama serve
```

Keep this terminal open. Ollama must be running for the AI features to work.

## ✅ Step 4: Start Backend

Open a **new terminal window**:
```cmd
cd "F:\shahandeh agent\backend"
npm run dev
```

Backend will start on `http://localhost:3001`

## ✅ Step 5: Start Frontend

Open a **new terminal window**:
```cmd
cd "F:\shahandeh agent\frontend"
npm run dev
```

Frontend will start on `http://localhost:3000`

## ✅ Step 6: (Optional) Start Sample API

Open a **new terminal window**:
```cmd
cd "F:\shahandeh agent\sample-api"
npm start
```

Sample API will start on `http://localhost:3000` (or change port if frontend uses 3000)

## 🎯 Step 7: Use the Application

1. Open browser: http://localhost:3000
2. Enter project path: `F:\shahandeh agent\sample-api` (or any Express project)
3. Enter base URL: `http://localhost:3000`
4. Click "Start Full Scan"

## 🔧 Troubleshooting

### "ollama is not recognized"
- Make sure Ollama is installed
- Restart your terminal
- Check if Ollama is in PATH: `where ollama`

### Port already in use
- Change port in `backend/.env`: `PORT=3002`
- Or stop the service using the port

### Backend can't connect to Ollama
- Make sure `ollama serve` is running
- Check `backend/.env` has: `OLLAMA_BASE_URL=http://localhost:11434`

### Frontend can't connect to backend
- Make sure backend is running on port 3001
- Check browser console for errors

## 📝 Summary

You need **4 terminal windows** running:
1. ✅ Ollama server (`ollama serve`)
2. ✅ Backend (`cd backend && npm run dev`)
3. ✅ Frontend (`cd frontend && npm run dev`)
4. ⚪ Sample API (optional: `cd sample-api && npm start`)

Then open: **http://localhost:3000**
