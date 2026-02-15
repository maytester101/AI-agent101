# Windows Setup Guide

## Step 1: Install Ollama

1. Download Ollama for Windows from: https://ollama.ai/download
2. Run the installer
3. After installation, Ollama should be available in your PATH

Verify installation:
```cmd
ollama --version
```

## Step 2: Pull AI Model

Open a new terminal and run:
```cmd
ollama pull deepseek-coder
```

This will download the AI model (may take a few minutes).

## Step 3: Setup Project

Run the Windows setup script:
```cmd
setup.bat
```

Or manually:
```cmd
cd backend
npm install
copy .env.example .env
cd ..\frontend
npm install
cd ..\sample-api
npm install
cd ..
```

## Step 4: Configure Backend

Edit `backend/.env` and set:
```
PORT=3001
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-coder
CORS_ORIGIN=http://localhost:3000
```

## Step 5: Start Services

Open **4 separate terminal windows**:

### Terminal 1: Ollama
```cmd
ollama serve
```

### Terminal 2: Backend
```cmd
cd backend
npm run dev
```

### Terminal 3: Frontend
```cmd
cd frontend
npm run dev
```

### Terminal 4: Sample API (Optional)
```cmd
cd sample-api
npm start
```

## Step 6: Access Application

Open your browser and go to: http://localhost:3000

## Troubleshooting

### Ollama not found
- Make sure Ollama is installed and added to PATH
- Restart your terminal after installation
- Try: `refreshenv` (if using Chocolatey) or restart your computer

### Port already in use
- Change ports in `.env` files if needed
- Check what's using the port: `netstat -ano | findstr :3000`

### Node modules issues
- Delete `node_modules` folders and run `npm install` again
- Make sure you have Node.js 20+ installed
