# AI QA Engineer – Autonomous API Testing Agent

A production-ready web-based AI agent that autonomously scans Node.js Express projects, extracts endpoints, detects authentication logic, generates comprehensive Playwright API tests, executes them, analyzes failures with auto-fix capabilities, and performs security and performance testing.

## 🚀 Features

### Core Capabilities
- **Automatic Project Scanning**: Scans local Node.js Express projects to find route files
- **Endpoint Extraction**: Automatically extracts all API endpoints (GET, POST, PUT, DELETE, PATCH)
- **Authentication Detection**: Detects JWT authentication logic and login routes
- **AI-Powered Test Generation**: Uses Ollama (local AI) to generate comprehensive Playwright tests
- **Test Execution**: Runs generated tests using Playwright's API testing mode
- **Auto-Fix Loop**: Analyzes failures and automatically fixes tests (max 3 retries)
- **Security Testing**: Tests for SQL injection, XSS, path traversal, unauthorized access, and more
- **Performance Testing**: Measures latency, concurrent requests, and identifies slow endpoints
- **Real-Time Logs**: Web UI with Socket.io for live test execution logs
- **Dashboard Analytics**: Comprehensive dashboard with test results, security findings, and performance metrics
- **Test History**: Stores and compares test sessions (database integration ready)

## 📋 Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS**
- **Socket.io Client** (real-time logs)
- **Recharts** (analytics visualization)

### Backend
- **Node.js + Express**
- **TypeScript**
- **Socket.io** (real-time communication)
- **Playwright** (API testing)
- **Ollama Integration** (local AI model)

### AI Model
- **Ollama** with `deepseek-coder` or `codellama` model

## 🏗️ Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── agent/
│   │   │   ├── scanner.ts           # Project scanner
│   │   │   ├── endpointExtractor.ts # Endpoint extraction
│   │   │   ├── authDetector.ts      # Auth detection
│   │   │   ├── testGenerator.ts     # AI test generation
│   │   │   ├── runner.ts            # Test execution
│   │   │   ├── analyzer.ts          # Failure analysis & auto-fix
│   │   │   ├── securityTester.ts    # Security testing
│   │   │   └── performanceTester.ts # Performance testing
│   │   ├── ollamaClient.ts          # Ollama AI client
│   │   ├── server.ts                # Express server
│   │   └── routes.ts                # API routes
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # Main page
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Global styles
│   ├── components/
│   │   ├── Dashboard.tsx            # Main dashboard
│   │   ├── Console.tsx              # Live console
│   │   ├── Reports.tsx              # Test reports
│   │   └── History.tsx              # Test history
│   ├── package.json
│   └── tsconfig.json
├── sample-api/
│   ├── server.js                    # Vulnerable Express API for testing
│   └── package.json
├── playwright-tests/
│   └── generated/                   # Generated test files
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites

1. **Node.js** (v20 or higher)
2. **Ollama** installed and running
3. **Docker** (optional, for containerized deployment)

### Step 1: Install Ollama

**Windows:**
- Download from [https://ollama.ai/download](https://ollama.ai/download)
- Run the installer
- Restart your terminal after installation

**Linux/Mac:**
- Follow instructions at [https://ollama.ai](https://ollama.ai)

**Verify installation:**
```bash
ollama --version
```

**Pull the AI model:**
```bash
ollama pull deepseek-coder
# or
ollama pull codellama
```

**Start Ollama:**
```bash
ollama serve
```

> **Note for Windows users:** See [SETUP_WINDOWS.md](./SETUP_WINDOWS.md) for detailed Windows-specific instructions.

### Step 2: Setup Backend

**Windows:**
```cmd
cd backend
npm install
copy .env.example .env
REM Edit .env with your configuration
npm run dev
```

**Linux/Mac:**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

Backend will run on `http://localhost:3001`

**Or use the setup script:**
- Windows: `setup.bat`
- Linux/Mac: `chmod +x setup.sh && ./setup.sh`

### Step 3: Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:3000`

### Step 4: Setup Sample API (Optional)

```bash
cd sample-api
npm install
npm start
```

Sample API will run on `http://localhost:3000` (or change port if frontend is using 3000)

## 🐳 Docker Setup

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

This will start:
- Ollama service on port 11434
- Backend on port 3001
- Frontend on port 3000
- Sample API on port 3000 (if configured)

### Manual Docker Build

```bash
# Build backend
cd backend
docker build -t ai-qa-backend .

# Build frontend
cd frontend
docker build -t ai-qa-frontend .
```

## 📖 Usage

### 1. Start the Application

1. Ensure Ollama is running: `ollama serve`
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `cd frontend && npm run dev`
4. (Optional) Start sample API: `cd sample-api && npm start`

### 2. Access the Web UI

Open `http://localhost:3000` in your browser.

### 3. Run a Full Scan

1. Enter the path to your Express project (e.g., `./sample-api`)
2. Enter the base URL (e.g., `http://localhost:3000`)
3. Click "Start Full Scan"

The system will:
1. Scan the project for route files
2. Extract all endpoints
3. Detect authentication logic
4. Generate Playwright tests using AI
5. Execute all tests
6. Analyze failures and attempt auto-fix
7. Run security tests
8. Run performance tests
9. Display results in the dashboard

### 4. View Results

- **Dashboard**: Overview of endpoints, test results, security issues, and performance metrics
- **Live Console**: Real-time logs of test execution
- **Reports**: Detailed security and performance reports
- **History**: Previous test sessions (requires database integration)

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
PORT=3001
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-coder
CORS_ORIGIN=http://localhost:3000
```

### Frontend Configuration

The frontend connects to the backend at `http://localhost:3001` by default. Update `components/Dashboard.tsx` if needed.

## 🧪 Test Generation

The AI generates comprehensive tests for each endpoint:

- ✅ Happy path tests
- ❌ Invalid input tests
- ⚠️ Missing field tests
- 🔢 Wrong type tests
- 🔐 Expired token tests (if auth required)
- 🛡️ SQL injection tests
- 🚨 XSS tests
- 📦 Large payload tests
- 🔄 Concurrency tests

## 🔒 Security Testing

The security tester checks for:

- **SQL Injection**: Tests with `' OR 1=1 --` and similar payloads
- **XSS**: Tests with `<script>alert(1)</script>` and similar payloads
- **Path Traversal**: Tests with `../../../etc/passwd` patterns
- **Large Payloads**: Tests with 100KB+ payloads
- **Negative Values**: Tests with negative numbers
- **Unauthorized Access**: Tests endpoints without authentication tokens

## ⚡ Performance Testing

The performance tester:

- Measures average latency
- Calculates P95 and P99 percentiles
- Tests with 20 concurrent requests
- Flags endpoints slower than 500ms
- Calculates requests per second

## 🔄 Auto-Fix Loop

When a test fails:

1. The analyzer extracts the error message
2. Sends failure details to Ollama AI
3. AI generates improved test code
4. Test is retried (max 3 attempts)
5. If still failing, issue is logged for manual review

## 📊 API Endpoints

### Backend API

- `POST /api/scan` - Scan project and extract endpoints
- `POST /api/detect-auth` - Detect authentication logic
- `POST /api/generate-tests` - Generate Playwright tests
- `POST /api/run-tests` - Execute tests
- `POST /api/analyze` - Analyze test results
- `POST /api/security-test` - Run security tests
- `POST /api/performance-test` - Run performance tests
- `POST /api/full-scan` - Complete workflow (all steps)

## 🐛 Troubleshooting

### Ollama Connection Issues

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve
```

### Playwright Issues

```bash
# Install Playwright browsers
npx playwright install chromium
```

### Port Conflicts

If port 3000 or 3001 is already in use:

- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/package.json` scripts
- Sample API: Change port in `sample-api/server.js`

## 🚧 Future Enhancements

- [ ] Database integration for test history
- [ ] Support for GraphQL APIs
- [ ] REST API documentation generation
- [ ] CI/CD integration
- [ ] Test coverage reports
- [ ] Custom test templates
- [ ] Multi-project support
- [ ] Email notifications
- [ ] Slack/Teams integration

## 📝 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js, Express, Playwright, and Ollama**
