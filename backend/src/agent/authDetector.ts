import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectScanner } from './scanner';

export interface AuthInfo {
  hasAuth: boolean;
  loginRoute?: string;
  loginMethod?: string;
  tokenField?: string;
  tokenHeader?: string;
  jwtSecret?: string;
  authMiddleware?: string;
}

/**
 * Detects authentication logic in the project
 * Looks for:
 * - Login routes
 * - JWT generation
 * - Token extraction
 * - Auth middleware
 */
export class AuthDetector {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath);
  }

  /**
   * Detect authentication configuration
   */
  async detect(): Promise<AuthInfo> {
    const authInfo: AuthInfo = {
      hasAuth: false,
    };

    try {
      // Scan for route files
      const scanner = new ProjectScanner(this.projectPath);
      const routeFiles = await scanner.scan();

      // Check each file for auth patterns
      for (const file of routeFiles) {
        const content = await fs.readFile(file, 'utf-8');
        const detected = this.analyzeFile(content, file);

        if (detected.hasAuth) {
          authInfo.hasAuth = true;
          Object.assign(authInfo, detected);
          break;
        }
      }

      // Also check main server file
      await this.checkMainServerFile(authInfo);

      // Check for JWT libraries in package.json
      await this.checkDependencies(authInfo);

      return authInfo;
    } catch (error: any) {
      throw new Error(`Failed to detect auth: ${error.message}`);
    }
  }

  /**
   * Analyze a file for auth patterns
   */
  private analyzeFile(content: string, filePath: string): AuthInfo {
    const authInfo: AuthInfo = {
      hasAuth: false,
    };

    // Detect login route
    const loginPatterns = [
      /router\.(get|post)\s*\(\s*['"`]([^'"`]*\/?(login|signin|auth)[^'"`]*)['"`]/i,
      /app\.(get|post)\s*\(\s*['"`]([^'"`]*\/?(login|signin|auth)[^'"`]*)['"`]/i,
    ];

    for (const pattern of loginPatterns) {
      const match = content.match(pattern);
      if (match) {
        authInfo.hasAuth = true;
        authInfo.loginMethod = match[1].toUpperCase();
        authInfo.loginRoute = match[2];
        break;
      }
    }

    // Detect JWT generation
    const jwtPatterns = [
      /jwt\.sign\s*\(/i,
      /jsonwebtoken\.sign\s*\(/i,
      /token\s*=\s*jwt\.sign/i,
    ];

    for (const pattern of jwtPatterns) {
      if (pattern.test(content)) {
        authInfo.hasAuth = true;

        // Try to extract token field name
        const tokenFieldMatch = content.match(/res\.(json|send)\s*\(\s*\{[^}]*(\w+)\s*:\s*token/);
        if (tokenFieldMatch) {
          authInfo.tokenField = tokenFieldMatch[2];
        } else {
          authInfo.tokenField = 'token'; // Default
        }
        break;
      }
    }

    // Detect token header
    const headerPatterns = [
      /req\.headers\[['"`]authorization['"`]\]/i,
      /req\.headers\.authorization/i,
      /Bearer\s+token/i,
    ];

    for (const pattern of headerPatterns) {
      if (pattern.test(content)) {
        authInfo.tokenHeader = 'Authorization';
        break;
      }
    }

    // Detect JWT secret
    const secretPatterns = [
      /JWT_SECRET['"`]\s*[:=]\s*['"`]([^'"`]+)['"`]/i,
      /jwtSecret['"`]\s*[:=]\s*['"`]([^'"`]+)['"`]/i,
      /process\.env\.JWT_SECRET/i,
    ];

    for (const pattern of secretPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        authInfo.jwtSecret = match[1];
        break;
      }
    }

    // Detect auth middleware
    const middlewarePatterns = [
      /function\s+(\w*authenticate\w*)\s*\(/i,
      /const\s+(\w*authenticate\w*)\s*=/i,
      /const\s+(\w*auth\w*)\s*=\s*\(/i,
    ];

    for (const pattern of middlewarePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        authInfo.authMiddleware = match[1];
        break;
      }
    }

    return authInfo;
  }

  /**
   * Check main server file (app.js, server.js, index.js)
   */
  private async checkMainServerFile(authInfo: AuthInfo): Promise<void> {
    const mainFiles = ['app.js', 'server.js', 'index.js', 'app.ts', 'server.ts', 'index.ts'];

    for (const mainFile of mainFiles) {
      const filePath = path.join(this.projectPath, mainFile);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const detected = this.analyzeFile(content, filePath);
        if (detected.hasAuth && !authInfo.hasAuth) {
          Object.assign(authInfo, detected);
        }
      } catch {
        // File doesn't exist, continue
      }
    }
  }

  /**
   * Check package.json for JWT libraries
   */
  private async checkDependencies(authInfo: AuthInfo): Promise<void> {
    const packageJsonPath = path.join(this.projectPath, 'package.json');

    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const jwtLibs = ['jsonwebtoken', 'jwt', 'passport', 'passport-jwt', 'express-jwt'];

      for (const lib of jwtLibs) {
        if (deps[lib]) {
          authInfo.hasAuth = true;
          break;
        }
      }
    } catch {
      // package.json doesn't exist or can't be read
    }
  }
}
