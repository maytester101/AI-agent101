import { chromium, Browser, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface TestResult {
  testFile: string;
  passed: boolean;
  error?: string;
  duration?: number;
  endpoint?: string;
}

export interface TestRunResults {
  passed: number;
  failed: number;
  total: number;
  results: TestResult[];
  duration: number;
}

/**
 * Executes generated Playwright tests
 */
export class TestRunner {
  private projectPath: string;
  private baseURL: string;
  private testsDir: string;

  constructor(projectPath: string, baseURL: string) {
    this.projectPath = path.resolve(projectPath);
    this.baseURL = baseURL;
    this.testsDir = path.join(this.projectPath, 'playwright-tests', 'generated');
  }

  /**
   * Run all generated tests
   */
  async runTests(
    emitLog?: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void
  ): Promise<TestRunResults> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    try {
      // Find all test files
      const testFiles = await this.findTestFiles();

      if (testFiles.length === 0) {
        if (emitLog) {
          emitLog('No test files found', 'warning');
        }
        return {
          passed: 0,
          failed: 0,
          total: 0,
          results: [],
          duration: 0,
        };
      }

      if (emitLog) {
        emitLog(`Found ${testFiles.length} test files`, 'info');
      }

      // Run each test file
      for (const testFile of testFiles) {
        if (emitLog) {
          emitLog(`Running ${path.basename(testFile)}...`, 'info');
        }

        const result = await this.runTestFile(testFile);
        results.push(result);

        if (result.passed) {
          if (emitLog) {
            emitLog(`✅ ${path.basename(testFile)} passed`, 'success');
          }
        } else {
          if (emitLog) {
            emitLog(`❌ ${path.basename(testFile)} failed: ${result.error}`, 'error');
          }
        }
      }

      const duration = Date.now() - startTime;
      const passed = results.filter((r) => r.passed).length;
      const failed = results.filter((r) => !r.passed).length;

      return {
        passed,
        failed,
        total: results.length,
        results,
        duration,
      };
    } catch (error: any) {
      throw new Error(`Test execution failed: ${error.message}`);
    }
  }

  /**
   * Find all test files in the tests directory
   */
  private async findTestFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.testsDir);
      return files
        .filter((file) => file.endsWith('.test.ts') || file.endsWith('.test.js'))
        .map((file) => path.join(this.testsDir, file));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Run a single test file
   */
  private async runTestFile(testFile: string): Promise<TestResult> {
    const startTime = Date.now();
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      // Read test file content
      const testContent = await fs.readFile(testFile, 'utf-8');

      // Extract endpoint info from test file
      const endpointMatch = testContent.match(/test\.describe\(['"`]([^'"`]+)['"`]/);
      const endpoint = endpointMatch ? endpointMatch[1] : undefined;

      // Launch browser
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext();

      // Create a temporary test file with environment setup
      const tempTestFile = await this.createTempTestFile(testFile, testContent);

      // Execute test using Playwright's test runner
      // Note: In a real implementation, you'd use Playwright's programmatic API
      // For now, we'll use a simplified approach
      const request = context.request;
      const testResult = await this.executeTestCode(testContent, request);

      const duration = Date.now() - startTime;

      return {
        testFile,
        passed: testResult.passed,
        error: testResult.error,
        duration,
        endpoint,
      };
    } catch (error: any) {
      return {
        testFile,
        passed: false,
        error: error.message,
        duration: Date.now() - startTime,
      };
    } finally {
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }

  /**
   * Execute test code dynamically
   * This is a simplified version - in production, you'd use Playwright's test runner
   */
  private async executeTestCode(
    testCode: string,
    request: any
  ): Promise<{ passed: boolean; error?: string }> {
    try {
      // Replace BASE_URL in test code
      const modifiedCode = testCode.replace(
        /process\.env\.BASE_URL/g,
        `'${this.baseURL}'`
      );

      // Create a test function
      const testFunction = new Function(
        'request',
        'expect',
        `
        const test = { describe: (name, fn) => fn() };
        const expect = (actual) => ({
          toBe: (expected) => {
            if (actual !== expected) throw new Error(\`Expected \${actual} to be \${expected}\`);
          },
          toBeLessThan: (expected) => {
            if (actual >= expected) throw new Error(\`Expected \${actual} to be less than \${expected}\`);
          },
          toBeGreaterThanOrEqual: (expected) => {
            if (actual < expected) throw new Error(\`Expected \${actual} to be greater than or equal to \${expected}\`);
          },
          toBeDefined: () => {
            if (actual === undefined) throw new Error('Expected value to be defined');
          },
          toContain: (expected) => {
            if (!actual.includes(expected)) throw new Error(\`Expected \${actual} to contain \${expected}\`);
          },
          not: {
            toContain: (expected) => {
              if (actual.includes(expected)) throw new Error(\`Expected \${actual} not to contain \${expected}\`);
            },
          },
        });
        ${modifiedCode}
        return true;
      `
      );

      await testFunction(request, expect);
      return { passed: true };
    } catch (error: any) {
      return { passed: false, error: error.message };
    }
  }

  /**
   * Create temporary test file with environment setup
   */
  private async createTempTestFile(originalFile: string, content: string): Promise<string> {
    const tempDir = path.join(this.projectPath, 'playwright-tests', 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const tempFile = path.join(tempDir, path.basename(originalFile));
    await fs.writeFile(tempFile, content, 'utf-8');
    return tempFile;
  }
}
