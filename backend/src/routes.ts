import { Express, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { rm, mkdir } from 'fs/promises';
import { ProjectScanner } from './agent/scanner';
import { EndpointExtractor } from './agent/endpointExtractor';
import { AuthDetector } from './agent/authDetector';
import { TestGenerator } from './agent/testGenerator';
import { TestRunner } from './agent/runner';
import { TestAnalyzer } from './agent/analyzer';
import { SecurityTester } from './agent/securityTester';
import { PerformanceTester } from './agent/performanceTester';
import { OllamaClient } from './ollamaClient';
import { discoverEndpointsFromOpenApi } from './openApiService';

/**
 * Setup all API routes
 */
export function setupRoutes(app: Express, io: SocketIOServer) {
  const ollamaClient = new OllamaClient({
    baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'deepseek-coder',
  });

  // Emit log to connected clients
  const emitLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    io.emit('log', {
      message,
      type,
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * POST /api/scan
   * Scan a Node.js Express project and extract endpoints
   */
  app.post('/api/scan', async (req: Request, res: Response) => {
    try {
      const { projectPath } = req.body;

      if (!projectPath) {
        return res.status(400).json({ error: 'projectPath is required' });
      }

      emitLog(`🔍 Scanning project at: ${projectPath}`, 'info');

      const scanner = new ProjectScanner(projectPath);
      const routeFiles = await scanner.scan();

      emitLog(`📁 Found ${routeFiles.length} route files`, 'success');

      const extractor = new EndpointExtractor();
      const endpoints = [];

      for (const file of routeFiles) {
        emitLog(`📖 Reading ${file}`, 'info');
        const fileEndpoints = await extractor.extractFromFile(file);
        endpoints.push(...fileEndpoints);
      }

      emitLog(`✅ Extracted ${endpoints.length} endpoints`, 'success');

      res.json({
        success: true,
        routeFiles,
        endpoints,
      });
    } catch (error: any) {
      emitLog(`❌ Scan error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/detect-auth
   * Detect authentication logic in the project
   */
  app.post('/api/detect-auth', async (req: Request, res: Response) => {
    try {
      const { projectPath } = req.body;

      if (!projectPath) {
        return res.status(400).json({ error: 'projectPath is required' });
      }

      emitLog('🔐 Detecting authentication logic...', 'info');

      const detector = new AuthDetector(projectPath);
      const authInfo = await detector.detect();

      if (authInfo.hasAuth) {
        emitLog(`✅ Found auth: ${authInfo.loginRoute}`, 'success');
      } else {
        emitLog('ℹ️ No authentication detected', 'info');
      }

      res.json({
        success: true,
        authInfo,
      });
    } catch (error: any) {
      emitLog(`❌ Auth detection error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/generate-tests
   * Generate Playwright tests for endpoints
   */
  app.post('/api/generate-tests', async (req: Request, res: Response) => {
    try {
      const { endpoints, authInfo, projectPath } = req.body;

      if (!endpoints || !Array.isArray(endpoints)) {
        return res.status(400).json({ error: 'endpoints array is required' });
      }

      emitLog(`🧪 Generating tests for ${endpoints.length} endpoints...`, 'info');

      const generator = new TestGenerator(ollamaClient, projectPath);
      const tests = await generator.generateTests(endpoints, authInfo, emitLog);

      emitLog(`✅ Generated ${tests.length} test files`, 'success');

      res.json({
        success: true,
        tests,
      });
    } catch (error: any) {
      emitLog(`❌ Test generation error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/run-tests
   * Execute generated tests
   */
  app.post('/api/run-tests', async (req: Request, res: Response) => {
    try {
      const { projectPath, baseURL } = req.body;

      if (!projectPath) {
        return res.status(400).json({ error: 'projectPath is required' });
      }

      const baseUrl = baseURL || 'http://localhost:3000';

      emitLog('🏃 Running tests...', 'info');

      const runner = new TestRunner(projectPath, baseUrl);
      const results = await runner.runTests(emitLog);

      emitLog(`✅ Tests completed: ${results.passed} passed, ${results.failed} failed`, 'success');

      res.json({
        success: true,
        results,
      });
    } catch (error: any) {
      emitLog(`❌ Test execution error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/analyze
   * Analyze test results and perform auto-fix
   */
  app.post('/api/analyze', async (req: Request, res: Response) => {
    try {
      const { testResults, projectPath } = req.body;

      if (!testResults) {
        return res.status(400).json({ error: 'testResults is required' });
      }

      emitLog('🔬 Analyzing test results...', 'info');

      const analyzer = new TestAnalyzer(ollamaClient, projectPath);
      const analysis = await analyzer.analyze(testResults, emitLog);

      res.json({
        success: true,
        analysis,
      });
    } catch (error: any) {
      emitLog(`❌ Analysis error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/security-test
   * Perform security testing on endpoints
   */
  app.post('/api/security-test', async (req: Request, res: Response) => {
    try {
      const { endpoints, authInfo, baseURL } = req.body;

      if (!endpoints || !Array.isArray(endpoints)) {
        return res.status(400).json({ error: 'endpoints array is required' });
      }

      const baseUrl = baseURL || 'http://localhost:3000';

      emitLog('🔒 Running security tests...', 'info');

      const securityTester = new SecurityTester(baseUrl);
      const results = await securityTester.testEndpoints(endpoints, authInfo, emitLog);

      emitLog(`✅ Security tests completed: ${results.issues.length} issues found`, 'success');

      res.json({
        success: true,
        results,
      });
    } catch (error: any) {
      emitLog(`❌ Security test error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/performance-test
   * Perform performance testing on endpoints
   */
  app.post('/api/performance-test', async (req: Request, res: Response) => {
    try {
      const { endpoints, authInfo, baseURL } = req.body;

      if (!endpoints || !Array.isArray(endpoints)) {
        return res.status(400).json({ error: 'endpoints array is required' });
      }

      const baseUrl = baseURL || 'http://localhost:3000';

      emitLog('⚡ Running performance tests...', 'info');

      const performanceTester = new PerformanceTester(baseUrl);
      const results = await performanceTester.testEndpoints(endpoints, authInfo, emitLog);

      emitLog(`✅ Performance tests completed`, 'success');

      res.json({
        success: true,
        results,
      });
    } catch (error: any) {
      emitLog(`❌ Performance test error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/full-scan
   * Complete workflow: scan, detect auth, generate tests, run tests, analyze
   */
  app.post('/api/full-scan', async (req: Request, res: Response) => {
    try {
      const { projectPath, baseURL } = req.body;

      if (!projectPath) {
        return res.status(400).json({ error: 'projectPath is required' });
      }

      const baseUrl = baseURL || 'http://localhost:3000';

      emitLog('🚀 Starting full scan workflow...', 'info');

      // Step 1: Scan project
      emitLog('Step 1/6: Scanning project...', 'info');
      const scanner = new ProjectScanner(projectPath);
      const routeFiles = await scanner.scan();
      emitLog(`Found ${routeFiles.length} route files`, 'success');

      // Step 2: Extract endpoints
      emitLog('Step 2/6: Extracting endpoints...', 'info');
      const extractor = new EndpointExtractor();
      const endpoints = [];
      for (const file of routeFiles) {
        const fileEndpoints = await extractor.extractFromFile(file);
        endpoints.push(...fileEndpoints);
      }
      emitLog(`Extracted ${endpoints.length} endpoints`, 'success');

      // Step 3: Detect auth
      emitLog('Step 3/6: Detecting authentication...', 'info');
      const detector = new AuthDetector(projectPath);
      const authInfo = await detector.detect();

      // Step 4: Generate tests
      emitLog('Step 4/6: Generating tests...', 'info');
      const generator = new TestGenerator(ollamaClient, projectPath);
      const tests = await generator.generateTests(endpoints, authInfo, emitLog);

      // Step 5: Run tests
      emitLog('Step 5/6: Running tests...', 'info');
      const runner = new TestRunner(projectPath, baseUrl);
      const testResults = await runner.runTests(emitLog);

      // Step 6: Analyze
      emitLog('Step 6/6: Analyzing results...', 'info');
      const analyzer = new TestAnalyzer(ollamaClient, projectPath);
      const analysis = await analyzer.analyze(testResults, emitLog);

      // Security tests
      emitLog('Running security tests...', 'info');
      const securityTester = new SecurityTester(baseUrl);
      const securityResults = await securityTester.testEndpoints(endpoints, authInfo, emitLog);

      // Performance tests
      emitLog('Running performance tests...', 'info');
      const performanceTester = new PerformanceTester(baseUrl);
      const performanceResults = await performanceTester.testEndpoints(endpoints, authInfo, emitLog);

      emitLog('✅ Full scan completed!', 'success');

      res.json({
        success: true,
        summary: {
          endpoints: endpoints.length,
          tests: tests.length,
          testResults,
          analysis,
          security: securityResults,
          performance: performanceResults,
        },
      });
    } catch (error: any) {
      emitLog(`❌ Full scan error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/discover-endpoints
   * Fetch endpoints from an OpenAPI/Swagger URL (for web/public API testing)
   */
  app.post('/api/discover-endpoints', async (req: Request, res: Response) => {
    try {
      const { openApiUrl } = req.body;

      if (!openApiUrl || typeof openApiUrl !== 'string') {
        return res.status(400).json({ error: 'openApiUrl is required' });
      }

      emitLog(`📡 Fetching OpenAPI spec from: ${openApiUrl}`, 'info');

      const endpoints = await discoverEndpointsFromOpenApi(openApiUrl);

      emitLog(`✅ Discovered ${endpoints.length} endpoints`, 'success');

      res.json({
        success: true,
        endpoints,
      });
    } catch (error: any) {
      emitLog(`❌ Discover error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/full-scan-url
   * Full workflow using only base URL + endpoints (no local project path).
   * For web deployment: users provide API URL and OpenAPI URL or manual endpoints.
   */
  app.post('/api/full-scan-url', async (req: Request, res: Response) => {
    let workspaceDir: string | null = null;

    try {
      const { baseURL, endpoints: bodyEndpoints, authInfo: bodyAuthInfo } = req.body;

      if (!baseURL || typeof baseURL !== 'string') {
        return res.status(400).json({ error: 'baseURL is required' });
      }
      if (!bodyEndpoints || !Array.isArray(bodyEndpoints) || bodyEndpoints.length === 0) {
        return res.status(400).json({ error: 'endpoints array is required and must not be empty' });
      }

      const baseUrl = baseURL.trim().replace(/\/$/, '');
      const authInfo = bodyAuthInfo && typeof bodyAuthInfo === 'object'
        ? {
            hasAuth: !!bodyAuthInfo.hasAuth,
            loginRoute: bodyAuthInfo.loginRoute,
            loginMethod: bodyAuthInfo.loginMethod,
            tokenField: bodyAuthInfo.tokenField,
            tokenHeader: bodyAuthInfo.tokenHeader || 'Authorization',
          }
        : { hasAuth: false };

      const endpoints = bodyEndpoints.map((e: any) => ({
        method: (e.method || 'GET').toUpperCase(),
        path: typeof e.path === 'string' ? e.path : String(e.path),
        file: e.file || 'manual',
        authRequired: !!e.authRequired,
      }));

      workspaceDir = path.join(os.tmpdir(), 'ai-qa-engineer', randomUUID());
      await rm(workspaceDir, { recursive: true }).catch(() => {});
      await mkdir(workspaceDir, { recursive: true });

      emitLog('🚀 Starting full scan (URL mode)...', 'info');
      emitLog(`📡 Base URL: ${baseUrl}`, 'info');
      emitLog(`📌 Endpoints: ${endpoints.length}`, 'success');

      // Generate tests (write to workspace)
      emitLog('Step 1/5: Generating tests...', 'info');
      const generator = new TestGenerator(ollamaClient, workspaceDir);
      const tests = await generator.generateTests(endpoints, authInfo, emitLog);

      // Run tests
      emitLog('Step 2/5: Running tests...', 'info');
      const runner = new TestRunner(workspaceDir, baseUrl);
      const testResults = await runner.runTests(emitLog);

      // Analyze
      emitLog('Step 3/5: Analyzing results...', 'info');
      const analyzer = new TestAnalyzer(ollamaClient, workspaceDir);
      const analysis = await analyzer.analyze(testResults, emitLog);

      // Security tests
      emitLog('Step 4/5: Running security tests...', 'info');
      const securityTester = new SecurityTester(baseUrl);
      const securityResults = await securityTester.testEndpoints(endpoints, authInfo, emitLog);

      // Performance tests
      emitLog('Step 5/5: Running performance tests...', 'info');
      const performanceTester = new PerformanceTester(baseUrl);
      const performanceResults = await performanceTester.testEndpoints(endpoints, authInfo, emitLog);

      emitLog('✅ Full scan (URL mode) completed!', 'success');

      res.json({
        success: true,
        summary: {
          endpoints: endpoints.length,
          tests: tests.length,
          testResults,
          analysis,
          security: securityResults,
          performance: performanceResults,
        },
      });
    } catch (error: any) {
      emitLog(`❌ Full scan (URL) error: ${error.message}`, 'error');
      res.status(500).json({ error: error.message });
    } finally {
      if (workspaceDir) {
        await rm(workspaceDir, { recursive: true }).catch(() => {});
      }
    }
  });
}
