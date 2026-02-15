import { chromium, Browser, BrowserContext } from 'playwright';
import { Endpoint } from './endpointExtractor';
import { AuthInfo } from './authDetector';

export interface SecurityIssue {
  endpoint: string;
  method: string;
  payload: string;
  type: 'sql_injection' | 'xss' | 'path_traversal' | 'large_payload' | 'negative_value' | 'unauthorized';
  severity: 'low' | 'medium' | 'high' | 'critical';
  response: {
    status: number;
    body?: string;
    vulnerable: boolean;
  };
}

export interface SecurityTestResults {
  totalTests: number;
  issues: SecurityIssue[];
  vulnerableEndpoints: string[];
}

/**
 * Performs security testing on endpoints
 */
export class SecurityTester {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Test all endpoints for security vulnerabilities
   */
  async testEndpoints(
    endpoints: Endpoint[],
    authInfo: AuthInfo,
    emitLog?: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void
  ): Promise<SecurityTestResults> {
    const issues: SecurityIssue[] = [];
    const vulnerableEndpoints: Set<string> = new Set();

    // Authenticate if needed
    if (authInfo.hasAuth && authInfo.loginRoute) {
      await this.authenticate(authInfo, emitLog);
    }

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext();
      const request = context.request;

      for (const endpoint of endpoints) {
        if (emitLog) {
          emitLog(`Testing security for ${endpoint.method} ${endpoint.path}...`, 'info');
        }

        // SQL Injection tests
        const sqlIssues = await this.testSQLInjection(endpoint, request);
        issues.push(...sqlIssues);
        sqlIssues.forEach((issue) => {
          if (issue.response.vulnerable) {
            vulnerableEndpoints.add(`${endpoint.method} ${endpoint.path}`);
          }
        });

        // XSS tests
        const xssIssues = await this.testXSS(endpoint, request);
        issues.push(...xssIssues);
        xssIssues.forEach((issue) => {
          if (issue.response.vulnerable) {
            vulnerableEndpoints.add(`${endpoint.method} ${endpoint.path}`);
          }
        });

        // Path traversal tests
        const pathIssues = await this.testPathTraversal(endpoint, request);
        issues.push(...pathIssues);
        pathIssues.forEach((issue) => {
          if (issue.response.vulnerable) {
            vulnerableEndpoints.add(`${endpoint.method} ${endpoint.path}`);
          }
        });

        // Large payload tests
        const largePayloadIssues = await this.testLargePayload(endpoint, request);
        issues.push(...largePayloadIssues);

        // Negative value tests
        const negativeIssues = await this.testNegativeValues(endpoint, request);
        issues.push(...negativeIssues);

        // Unauthorized access tests
        if (endpoint.authRequired) {
          const authIssues = await this.testUnauthorizedAccess(endpoint, request);
          issues.push(...authIssues);
        }
      }

      return {
        totalTests: issues.length,
        issues,
        vulnerableEndpoints: Array.from(vulnerableEndpoints),
      };
    } finally {
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }

  /**
   * Authenticate and get token
   */
  private async authenticate(
    authInfo: AuthInfo,
    emitLog?: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void
  ): Promise<void> {
    try {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const request = context.request;

      const loginRoute = authInfo.loginRoute || '/api/login';
      const loginMethod = authInfo.loginMethod || 'POST';
      const tokenField = authInfo.tokenField || 'token';

      const response = await request[loginMethod.toLowerCase() as 'post'](
        `${this.baseURL}${loginRoute}`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            email: 'test@example.com',
            password: 'testpassword',
          },
        }
      );

      if (response.ok()) {
        const body = await response.json();
        this.authToken =
          body[tokenField] || body.accessToken || body.access_token || null;

        if (this.authToken && emitLog) {
          emitLog('✅ Authentication successful', 'success');
        }
      }

      await context.close();
      await browser.close();
    } catch (error) {
      if (emitLog) {
        emitLog('⚠️ Authentication failed, continuing without token', 'warning');
      }
    }
  }

  /**
   * Test SQL injection vulnerabilities
   */
  private async testSQLInjection(
    endpoint: Endpoint,
    request: any
  ): Promise<SecurityIssue[]> {
    const payloads = [
      "' OR 1=1 --",
      "' OR '1'='1",
      "1' OR '1'='1",
      "admin'--",
      "' UNION SELECT NULL--",
    ];

    const issues: SecurityIssue[] = [];

    for (const payload of payloads) {
      try {
        const headers = this.getHeaders(endpoint);
        const response = await this.makeRequest(endpoint, request, headers, {
          query: payload,
          id: payload,
          search: payload,
        });

        const body = await response.text();
        const isVulnerable = this.detectSQLInjectionVulnerability(body, response.status());

        issues.push({
          endpoint: endpoint.path,
          method: endpoint.method,
          payload,
          type: 'sql_injection',
          severity: isVulnerable ? 'high' : 'low',
          response: {
            status: response.status(),
            body: body.substring(0, 500), // Limit body size
            vulnerable: isVulnerable,
          },
        });
      } catch (error) {
        // Continue with next payload
      }
    }

    return issues;
  }

  /**
   * Test XSS vulnerabilities
   */
  private async testXSS(
    endpoint: Endpoint,
    request: any
  ): Promise<SecurityIssue[]> {
    const payloads = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)',
      '<svg onload=alert(1)>',
    ];

    const issues: SecurityIssue[] = [];

    for (const payload of payloads) {
      try {
        const headers = this.getHeaders(endpoint);
        const response = await this.makeRequest(endpoint, request, headers, {
          input: payload,
          name: payload,
          content: payload,
        });

        const body = await response.text();
        const isVulnerable = body.includes(payload) && !body.includes('&lt;script&gt;');

        issues.push({
          endpoint: endpoint.path,
          method: endpoint.method,
          payload,
          type: 'xss',
          severity: isVulnerable ? 'high' : 'low',
          response: {
            status: response.status(),
            body: body.substring(0, 500),
            vulnerable: isVulnerable,
          },
        });
      } catch (error) {
        // Continue with next payload
      }
    }

    return issues;
  }

  /**
   * Test path traversal vulnerabilities
   */
  private async testPathTraversal(
    endpoint: Endpoint,
    request: any
  ): Promise<SecurityIssue[]> {
    const payloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
    ];

    const issues: SecurityIssue[] = [];

    for (const payload of payloads) {
      try {
        const headers = this.getHeaders(endpoint);
        const response = await this.makeRequest(endpoint, request, headers, {
          file: payload,
          path: payload,
          filename: payload,
        });

        const body = await response.text();
        const isVulnerable = body.includes('root:') || body.includes('[boot loader]');

        issues.push({
          endpoint: endpoint.path,
          method: endpoint.method,
          payload,
          type: 'path_traversal',
          severity: isVulnerable ? 'critical' : 'low',
          response: {
            status: response.status(),
            body: body.substring(0, 500),
            vulnerable: isVulnerable,
          },
        });
      } catch (error) {
        // Continue with next payload
      }
    }

    return issues;
  }

  /**
   * Test large payload handling
   */
  private async testLargePayload(
    endpoint: Endpoint,
    request: any
  ): Promise<SecurityIssue[]> {
    if (['GET', 'DELETE'].includes(endpoint.method)) {
      return [];
    }

    const largePayload = {
      data: 'x'.repeat(100000), // 100KB
    };

    try {
      const headers = this.getHeaders(endpoint);
      const response = await this.makeRequest(endpoint, request, headers, largePayload);

      const isVulnerable = response.status() === 500 || response.status() === 413;

      return [
        {
          endpoint: endpoint.path,
          method: endpoint.method,
          payload: 'Large payload (100KB)',
          type: 'large_payload',
          severity: isVulnerable ? 'medium' : 'low',
          response: {
            status: response.status(),
            vulnerable: isVulnerable,
          },
        },
      ];
    } catch (error) {
      return [];
    }
  }

  /**
   * Test negative values
   */
  private async testNegativeValues(
    endpoint: Endpoint,
    request: any
  ): Promise<SecurityIssue[]> {
    if (['GET', 'DELETE'].includes(endpoint.method)) {
      return [];
    }

    const negativePayload = {
      id: -1,
      price: -100,
      quantity: -999,
    };

    try {
      const headers = this.getHeaders(endpoint);
      const response = await this.makeRequest(endpoint, request, headers, negativePayload);

      const body = await response.text();
      const isVulnerable = response.status() < 400 && !body.includes('error');

      return [
        {
          endpoint: endpoint.path,
          method: endpoint.method,
          payload: JSON.stringify(negativePayload),
          type: 'negative_value',
          severity: isVulnerable ? 'medium' : 'low',
          response: {
            status: response.status(),
            vulnerable: isVulnerable,
          },
        },
      ];
    } catch (error) {
      return [];
    }
  }

  /**
   * Test unauthorized access
   */
  private async testUnauthorizedAccess(
    endpoint: Endpoint,
    request: any
  ): Promise<SecurityIssue[]> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      // Intentionally not adding auth token

      const response = await this.makeRequest(endpoint, request, headers, {});

      const isVulnerable = response.status() < 400;

      return [
        {
          endpoint: endpoint.path,
          method: endpoint.method,
          payload: 'No authentication token',
          type: 'unauthorized',
          severity: isVulnerable ? 'critical' : 'low',
          response: {
            status: response.status(),
            vulnerable: isVulnerable,
          },
        },
      ];
    } catch (error) {
      return [];
    }
  }

  /**
   * Make HTTP request
   */
  private async makeRequest(
    endpoint: Endpoint,
    request: any,
    headers: Record<string, string>,
    data?: any
  ) {
    const url = `${this.baseURL}${endpoint.path}`;
    const method = endpoint.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';

    if (['get', 'delete'].includes(method)) {
      return await request[method](url, { headers });
    }

    return await request[method](url, {
      headers,
      data,
    });
  }

  /**
   * Get headers with auth if needed
   */
  private getHeaders(endpoint: Endpoint): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (endpoint.authRequired && this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Detect SQL injection vulnerability in response
   */
  private detectSQLInjectionVulnerability(body: string, status: number): boolean {
    const sqlErrorPatterns = [
      /sql syntax/i,
      /mysql/i,
      /postgresql/i,
      /sqlite/i,
      /ora-\d+/i,
      /sqlstate/i,
      /syntax error.*sql/i,
    ];

    // If status is 200 but contains SQL errors, it's vulnerable
    if (status === 200) {
      return sqlErrorPatterns.some((pattern) => pattern.test(body));
    }

    // If status is 500 and contains SQL errors, might be vulnerable
    if (status === 500) {
      return sqlErrorPatterns.some((pattern) => pattern.test(body));
    }

    return false;
  }
}
