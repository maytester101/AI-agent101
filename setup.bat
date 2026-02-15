@echo off
echo 🚀 Setting up AI QA Engineer...

REM Check if Ollama is installed (optional check)
where ollama >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Ollama is not installed yet. You can install it later from https://ollama.ai
    echo    Continuing with project setup...
    echo.
)

REM Setup backend
echo 📦 Setting up backend...
cd backend
call npm install
if not exist .env (
    copy .env.example .env
    echo ✅ Created backend/.env file
)
cd ..

REM Setup frontend
echo 📦 Setting up frontend...
cd frontend
call npm install
cd ..

REM Setup sample API
echo 📦 Setting up sample API...
cd sample-api
call npm install
cd ..

echo ✅ Setup complete!
echo.
echo To start:
echo   1. Start Ollama: ollama serve
echo   2. Start backend: cd backend ^&^& npm run dev
echo   3. Start frontend: cd frontend ^&^& npm run dev
echo   4. (Optional) Start sample API: cd sample-api ^&^& npm start
