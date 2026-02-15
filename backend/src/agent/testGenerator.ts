import * as fs from 'fs/promises';
import * as path from 'path';
import { OllamaClient } from '../ollamaClient';
import { Endpoint } from './endpointExtractor';
import { AuthInfo } from './authDetector';

export interface GeneratedTest {
  endpoint: Endpoint;
  testFile: string;
  testCode: string;
}

/**
 * Generates Playwright API tests for endpoints using AI
 */
export class TestGenerator {
  private ollamaClient: OllamaClient;
  private projectPath: string;
  private testsDir: string;

  constructor(ollamaClient: OllamaClient, projectPath: string) {
    this.ollamaClient = ollamaClient;
    this.projectPath = path.resolve(projectPath);
    this.testsDir = path.join(this.projectPath, 'playwright-tests', 'generated');
  }

  /**
   * Generate tests for all endpoints
   */
  async generateTests(
    endpoints: Endpoint[],
    authInfo: AuthInfo,
    emitLog?: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void
  ): Promise<GeneratedTest[]> {
    const generatedTests: GeneratedTest[] = [];

    // Ensure tests directory exists
    await fs.mkdir(this.testsDir, { recursive: true });

    for (const endpoint of endpoints) {
      try {
        if (emitLog) {
          emitLog(`Generating test for ${endpoint.method} ${endpoint.path}...`, 'info');
        }

        const testCode = await this.generateTestCode(endpoint, authInfo);
        const testFile = this.getTestFileName(endpoint);

        // Save test file
        const testFilePath = path.join(this.testsDir, testFile);
        await fs.writeFile(testFilePath, testCode, 'utf-8');

        generatedTests.push({
          endpoint,
          testFile: testFilePath,
          testCode,
        });

        if (emitLog) {
          emitLog(`✅ Generated test: ${testFile}`, 'success');
        }
      } catch (error: any) {
        if (emitLog) {
          emitLog(`❌ Failed to generate test for ${endpoint.method} ${endpoint.path}: ${error.message}`, 'error');
        }
        // Continue with other endpoints
      }
    }

    return generatedTests;
  }

  /**
   * Generate test code for a single endpoint
   */
  private async generateTestCode(endpoint: Endpoint, authInfo: AuthInfo): Promise<string> {
    // Build comprehensive test template
    const testTemplate = this.buildTestTemplate(endpoint, authInfo);

    // Use AI to enhance the test
    try {
      const aiEnhanced = await this.ollamaClient.generateTestCode({
        method: endpoint.method,
        path: endpoint.path,
        authRequired: endpoint.authRequired || false,
      });

      // Merge AI output with template (AI might provide better structure)
      return this.mergeTestCode(testTemplate, aiEnhanced);
    } catch (error) {
      // Fallback to template if AI fails
      return testTemplate;
    }
  }

  /**
   * Build base test template
   */
  private buildTestTemplate(endpoint: Endpoint, authInfo: AuthInfo): string {
    const testName = `${endpoint.method}_${endpoint.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const needsAuth = endpoint.authRequired || false;
    const hasLogin = authInfo.hasAuth && authInfo.loginRoute;

    return `import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('${endpoint.method} ${endpoint.path}', () => {
  let authToken: string | null = null;

  ${hasLogin ? this.getAuthSetup(authInfo) : ''}

  test('happy path - valid request', async ({ request }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    ${needsAuth ? "if (authToken) headers['Authorization'] = `Bearer ${authToken}`;" : ''}

    const response = await request.${endpoint.method.toLowerCase()}(
      \`\${BASE_URL}${endpoint.path}\`,
      {
        headers,
        ${this.getRequestBody(endpoint)}
      }
    );

    expect(response.status()).toBeLessThan(400);
    const body = await response.json();
    expect(body).toBeDefined();
  });

  test('invalid input - malformed data', async ({ request }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    ${needsAuth ? "if (authToken) headers['Authorization'] = `Bearer ${authToken}`;" : ''}

    const response = await request.${endpoint.method.toLowerCase()}(
      \`\${BASE_URL}${endpoint.path}\`,
      {
        headers,
        data: { invalid: 'data' },
      }
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('missing required fields', async ({ request }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    ${needsAuth ? "if (authToken) headers['Authorization'] = `Bearer ${authToken}`;" : ''}

    const response = await request.${endpoint.method.toLowerCase()}(
      \`\${BASE_URL}${endpoint.path}\`,
      {
        headers,
        data: {},
      }
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('wrong data types', async ({ request }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    ${needsAuth ? "if (authToken) headers['Authorization'] = `Bearer ${authToken}`;" : ''}

    const response = await request.${endpoint.method.toLowerCase()}(
      \`\${BASE_URL}${endpoint.path}\`,
      {
        headers,
        data: { id: 'not-a-number', name: 123 },
      }
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  ${needsAuth ? this.getExpiredTokenTest(endpoint) : ''}

  test('SQL injection attempt', async ({ request }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    ${needsAuth ? "if (authToken) headers['Authorization'] = `Bearer ${authToken}`;" : ''}

    const response = await request.${endpoint.method.toLowerCase()}(
      \`\${BASE_URL}${endpoint.path}\`,
      {
        headers,
        data: { query: "' OR 1=1 --" },
      }
    );

    // Should not return data or should sanitize
    const body = await response.text();
    expect(body.toLowerCase()).not.toContain('error');
  });

  test('XSS attempt', async ({ request }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    ${needsAuth ? "if (authToken) headers['Authorization'] = `Bearer ${authToken}`;" : ''}

    const response = await request.${endpoint.method.toLowerCase()}(
      \`\${BASE_URL}${endpoint.path}\`,
      {
        headers,
        data: { input: '<script>alert(1)</script>' },
      }
    );

    const body = await response.text();
    expect(body).not.toContain('<script>');
  });

  test('large payload', async ({ request }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    ${needsAuth ? "if (authToken) headers['Authorization'] = `Bearer ${authToken}`;" : ''}

    const largeData = {
      data: 'x'.repeat(10000),
    };

    const response = await request.${endpoint.method.toLowerCase()}(
      \`\${BASE_URL}${endpoint.path}\`,
      {
        headers,
        data: largeData,
      }
    );

    // Should handle gracefully (either accept or reject with proper error)
    expect([200, 400, 413, 422]).toContain(response.status());
  });

  test('concurrent requests', async ({ request }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    ${needsAuth ? "if (authToken) headers['Authorization'] = `Bearer ${authToken}`;" : ''}

    const requests = Array(10).fill(null).map(() =>
      request.${endpoint.method.toLowerCase()}(
        \`\${BASE_URL}${endpoint.path}\`,
        { headers }
      )
    );

    const responses = await Promise.all(requests);
    
    // All should complete without crashing
    responses.forEach((response) => {
      expect(response.status()).toBeLessThan(500);
    });
  });
});
`;
  }

  /**
   * Get authentication setup code
   */
  private getAuthSetup(authInfo: AuthInfo): string {
    const loginRoute = authInfo.loginRoute || '/api/login';
    const loginMethod = authInfo.loginMethod || 'POST';
    const tokenField = authInfo.tokenField || 'token';

    return `
  test.beforeAll(async ({ request }) => {
    try {
      const loginResponse = await request.${loginMethod.toLowerCase()}(
        \`\${BASE_URL}${loginRoute}\`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            email: 'test@example.com',
            password: 'testpassword',
          },
        }
      );

      if (loginResponse.ok()) {
        const loginBody = await loginResponse.json();
        authToken = loginBody.${tokenField} || loginBody.accessToken || loginBody.access_token;
      }
    } catch (error) {
      console.warn('Failed to authenticate:', error);
    }
  });
`;
  }

  /**
   * Get request body based on method
   */
  private getRequestBody(endpoint: Endpoint): string {
    if (['GET', 'DELETE'].includes(endpoint.method)) {
      return '';
    }

    // Try to infer body structure from path
    if (endpoint.path.includes('user') || endpoint.path.includes('users')) {
      return `data: {
        name: 'Test User',
        email: 'test@example.com',
      },`;
    }

    if (endpoint.path.includes('product') || endpoint.path.includes('products')) {
      return `data: {
        name: 'Test Product',
        price: 99.99,
        description: 'Test description',
      },`;
    }

    return `data: {
      // Add appropriate test data
    },`;
  }

  /**
   * Get expired token test
   */
  private getExpiredTokenTest(endpoint: Endpoint): string {
    return `
  test('expired token', async ({ request }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer expired_token_here',
    };

    const response = await request.${endpoint.method.toLowerCase()}(
      \`\${BASE_URL}${endpoint.path}\`,
      { headers }
    );

    expect([401, 403]).toContain(response.status());
  });
`;
  }

  /**
   * Merge AI-generated code with template
   */
  private mergeTestCode(template: string, aiCode: string): string {
    // If AI code looks complete, use it; otherwise use template
    if (aiCode.includes('test(') && aiCode.includes('@playwright/test')) {
      return aiCode;
    }
    return template;
  }

  /**
   * Generate test file name
   */
  private getTestFileName(endpoint: Endpoint): string {
    const sanitized = endpoint.path
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+|_+$/g, '');
    return `${endpoint.method.toLowerCase()}_${sanitized}.test.ts`;
  }
}
