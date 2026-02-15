import * as fs from 'fs/promises';

export interface Endpoint {
  method: string;
  path: string;
  file: string;
  line?: number;
  authRequired?: boolean;
  middleware?: string[];
}

/**
 * Extracts Express route endpoints from source files
 * Detects: router.get, router.post, router.put, router.delete, router.patch
 * Also detects: app.get, app.post, etc.
 */
export class EndpointExtractor {
  /**
   * Extract endpoints from a file
   * @param filePath Absolute path to the file
   * @returns Array of extracted endpoints
   */
  async extractFromFile(filePath: string): Promise<Endpoint[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const endpoints: Endpoint[] = [];

      // Extract router.* method calls
      const routerPattern = /router\.(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;
      let lineNumber = 1;

      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Check for router methods
        while ((match = routerPattern.exec(line)) !== null) {
          const method = match[1].toUpperCase();
          const routePath = match[2];

          endpoints.push({
            method,
            path: routePath,
            file: filePath,
            line: lineNum,
          });
        }

        // Reset regex for next line
        routerPattern.lastIndex = 0;

        // Check for app methods (direct Express app usage)
        const appPattern = /app\.(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;
        while ((match = appPattern.exec(line)) !== null) {
          const method = match[1].toUpperCase();
          const routePath = match[2];

          endpoints.push({
            method,
            path: routePath,
            file: filePath,
            line: lineNum,
          });
        }
      }

      // Detect authentication middleware
      this.detectAuthMiddleware(content, endpoints);

      return endpoints;
    } catch (error: any) {
      throw new Error(`Failed to extract endpoints from ${filePath}: ${error.message}`);
    }
  }

  /**
   * Detect if endpoints require authentication
   * Looks for common auth middleware patterns
   */
  private detectAuthMiddleware(content: string, endpoints: Endpoint[]): void {
    const authPatterns = [
      /authenticate/,
      /auth/,
      /jwt/,
      /verifyToken/,
      /requireAuth/,
      /isAuthenticated/,
      /passport\.authenticate/,
    ];

    const lines = content.split('\n');

    endpoints.forEach((endpoint) => {
      if (!endpoint.line) return;

      // Check the line and surrounding lines for auth middleware
      const startLine = Math.max(0, endpoint.line - 5);
      const endLine = Math.min(lines.length, endpoint.line + 5);

      for (let i = startLine; i < endLine; i++) {
        const line = lines[i];
        const hasAuth = authPatterns.some((pattern) => pattern.test(line));

        if (hasAuth) {
          endpoint.authRequired = true;

          // Try to extract middleware name
          const middlewareMatch = line.match(/(\w+)\s*\(/);
          if (middlewareMatch) {
            endpoint.middleware = endpoint.middleware || [];
            endpoint.middleware.push(middlewareMatch[1]);
          }
          break;
        }
      }
    });
  }

  /**
   * Normalize route paths
   * Handles Express route parameters and wildcards
   */
  static normalizePath(path: string): string {
    // Replace :param with {param} for consistency
    return path.replace(/:(\w+)/g, '{$1}');
  }
}
