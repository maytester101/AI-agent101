#!/bin/bash

echo "🚀 Setting up AI QA Engineer..."

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Please install from https://ollama.ai"
    exit 1
fi

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "⚠️  Ollama is not running. Starting Ollama..."
    ollama serve &
    sleep 3
fi

# Pull AI model
echo "📥 Pulling AI model (deepseek-coder)..."
ollama pull deepseek-coder

# Setup backend
echo "📦 Setting up backend..."
cd backend
npm install
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created backend/.env file"
fi
cd ..

# Setup frontend
echo "📦 Setting up frontend..."
cd frontend
npm install
cd ..

# Setup sample API
echo "📦 Setting up sample API..."
cd sample-api
npm install
cd ..

echo "✅ Setup complete!"
echo ""
echo "To start:"
echo "  1. Start Ollama: ollama serve"
echo "  2. Start backend: cd backend && npm run dev"
echo "  3. Start frontend: cd frontend && npm run dev"
echo "  4. (Optional) Start sample API: cd sample-api && npm start"
