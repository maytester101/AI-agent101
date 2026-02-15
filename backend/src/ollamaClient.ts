import axios from 'axios';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface OllamaClientConfig {
  baseURL: string;
  model: string;
}

/**
 * Client for interacting with Ollama API
 * Handles AI model communication for test generation and analysis
 */
export class OllamaClient {
  private baseURL: string;
  private model: string;

  constructor(config: OllamaClientConfig) {
    this.baseURL = config.baseURL;
    this.model = config.model;
  }

  /**
   * Generate a completion using Ollama
   * @param prompt The prompt to send to the model
   * @param systemPrompt Optional system prompt for context
   * @returns The generated response
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await axios.post<OllamaResponse>(
        `${this.baseURL}/api/generate`,
        {
          model: this.model,
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
          stream: false,
        },
        {
          timeout: 120000, // 2 minutes timeout
        }
      );

      if (!response.data.done) {
        throw new Error('Ollama response incomplete');
      }

      return response.data.response.trim();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Ollama API error: ${error.message}. Make sure Ollama is running and the model is installed.`
        );
      }
      throw error;
    }
  }

  /**
   * Generate test code based on endpoint information
   * @param endpointInfo Information about the endpoint to test
   * @returns Generated Playwright test code
   */
  async generateTestCode(endpointInfo: {
    method: string;
    path: string;
    authRequired: boolean;
    sampleBody?: any;
  }): Promise<string> {
    const systemPrompt = `You are an expert QA engineer. Generate comprehensive Playwright API tests in TypeScript.
Rules:
- Use test() from '@playwright/test'
- Use request context from playwright
- Test happy path, invalid input, missing fields, wrong types
- Include security tests (SQL injection, XSS)
- Include performance tests
- Return ONLY valid TypeScript code, no explanations`;

    const prompt = `Generate a Playwright API test for:
Method: ${endpointInfo.method}
Path: ${endpointInfo.path}
Auth Required: ${endpointInfo.authRequired}
${endpointInfo.sampleBody ? `Sample Body: ${JSON.stringify(endpointInfo.sampleBody)}` : ''}

Generate complete test code:`;

    return this.generate(prompt, systemPrompt);
  }

  /**
   * Analyze test failure and suggest fixes
   * @param testCode The original test code
   * @param errorMessage The error message from the test failure
   * @param responseDetails Response details if available
   * @returns Improved test code
   */
  async analyzeFailure(
    testCode: string,
    errorMessage: string,
    responseDetails?: any
  ): Promise<string> {
    const systemPrompt = `You are an expert QA engineer. Analyze test failures and fix them.
Rules:
- Fix the test code based on the error
- Maintain all test cases
- Return ONLY valid TypeScript code, no explanations`;

    const prompt = `Original test code:
\`\`\`typescript
${testCode}
\`\`\`

Error message:
${errorMessage}

${responseDetails ? `Response details: ${JSON.stringify(responseDetails)}` : ''}

Fix the test code:`;

    return this.generate(prompt, systemPrompt);
  }
}
