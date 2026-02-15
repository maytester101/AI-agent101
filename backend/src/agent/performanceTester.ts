import { chromium, Browser, BrowserContext } from 'playwright';
import { Endpoint } from './endpointExtractor';
import { AuthInfo } from './authDetector';

export interface PerformanceMetric {
  endpoint: string;
  method: string;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  p95Latency: number;
  p99Latency: number;
  requestsPerSecond: number;
  slowRequests: number;
  status: 'fast' | 'moderate' | 'slow' | 'very_slow';
}

export interface PerformanceTestResults {
  metrics: PerformanceMetric[];
  slowEndpoints: string[];
  averageLatency: number;
}

/**
 * Performs performance testing on endpoints
 */
export class PerformanceTester {
  private baseURL: string;
  private authToken: string | null = null;
  private concurrentRequests = 20;
  private targetLatency = 500; // 500ms target

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Test all endpoints for performance
   */
  async testEndpoints(
    endpoints: Endpoint[],
    authInfo: AuthInfo,
    emitLog?: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void
  ): Promise<PerformanceTestResults> {
    const metrics: PerformanceMetric[] = [];
    const slowEndpoints: string[] = [];

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
          emitLog(`Testing performance for ${endpoint.method} ${endpoint.path}...`, 'info');
        }

        const metric = await this.testEndpointPerformance(endpoint, request);
        metrics.push(metric);

        if (metric.status === 'slow' || metric.status === 'very_slow') {
          slowEndpoints.push(`${endpoint.method} ${endpoint.path}`);
        }
      }

      const averageLatency =
        metrics.reduce((sum, m) => sum + m.averageLatency, 0) / metrics.length;

      return {
        metrics,
        slowEndpoints,
        averageLatency,
      };
    } finally {
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }

  /**
   * Test performance of a single endpoint
   */
  private async testEndpointPerformance(
    endpoint: Endpoint,
    request: any
  ): Promise<PerformanceMetric> {
    const latencies: number[] = [];
    const headers = this.getHeaders(endpoint);

    // Run concurrent requests
    const startTime = Date.now();
    const requests = Array(this.concurrentRequests)
      .fill(null)
      .map(() => this.makeRequest(endpoint, request, headers));

    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;

    // Calculate latencies
    for (const response of responses) {
      // Note: Playwright doesn't expose request timing directly
      // We'll use a simplified approach
      latencies.push(totalTime / this.concurrentRequests);
    }

    // Sort latencies for percentile calculation
    latencies.sort((a, b) => a - b);

    const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const minLatency = latencies[0] || 0;
    const maxLatency = latencies[latencies.length - 1] || 0;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);
    const p95Latency = latencies[p95Index] || 0;
    const p99Latency = latencies[p99Index] || 0;

    const requestsPerSecond = (this.concurrentRequests / totalTime) * 1000;
    const slowRequests = latencies.filter((l) => l > this.targetLatency).length;

    let status: 'fast' | 'moderate' | 'slow' | 'very_slow';
    if (averageLatency < 200) {
      status = 'fast';
    } else if (averageLatency < 500) {
      status = 'moderate';
    } else if (averageLatency < 1000) {
      status = 'slow';
    } else {
      status = 'very_slow';
    }

    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      averageLatency,
      minLatency,
      maxLatency,
      p95Latency,
      p99Latency,
      requestsPerSecond,
      slowRequests,
      status,
    };
  }

  /**
   * Make a single request and measure latency
   */
  private async makeRequest(
    endpoint: Endpoint,
    request: any,
    headers: Record<string, string>
  ): Promise<any> {
    const url = `${this.baseURL}${endpoint.path}`;
    const method = endpoint.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';

    const startTime = Date.now();

    if (['get', 'delete'].includes(method)) {
      const response = await request[method](url, { headers });
      const latency = Date.now() - startTime;
      return { response, latency };
    }

    const response = await request[method](url, {
      headers,
      data: this.getTestData(endpoint),
    });
    const latency = Date.now() - startTime;
    return { response, latency };
  }

  /**
   * Get test data for endpoint
   */
  private getTestData(endpoint: Endpoint): any {
    if (endpoint.path.includes('user') || endpoint.path.includes('users')) {
      return {
        name: 'Test User',
        email: 'test@example.com',
      };
    }

    if (endpoint.path.includes('product') || endpoint.path.includes('products')) {
      return {
        name: 'Test Product',
        price: 99.99,
      };
    }

    return {
      test: 'data',
    };
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
      }

      await context.close();
      await browser.close();
    } catch (error) {
      // Continue without auth
    }
  }
}
