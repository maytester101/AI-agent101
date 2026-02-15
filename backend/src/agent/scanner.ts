import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Scans a Node.js Express project to find route files
 * Looks for common patterns: routes/, controllers/, api/, etc.
 */
export class ProjectScanner {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath);
  }

  /**
   * Scan the project for route files
   * @returns Array of absolute paths to route files
   */
  async scan(): Promise<string[]> {
    const routeFiles: string[] = [];

    try {
      await this.scanDirectory(this.projectPath, routeFiles);
    } catch (error: any) {
      throw new Error(`Failed to scan project: ${error.message}`);
    }

    return routeFiles;
  }

  /**
   * Recursively scan directory for route files
   */
  private async scanDirectory(dirPath: string, routeFiles: string[]): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // Skip node_modules, dist, build, .git, etc.
        if (this.shouldSkip(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, routeFiles);
        } else if (entry.isFile() && this.isRouteFile(entry.name)) {
          routeFiles.push(fullPath);
        }
      }
    } catch (error: any) {
      // Skip directories we can't read
      if (error.code !== 'EACCES' && error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Check if a file/directory should be skipped
   */
  private shouldSkip(name: string): boolean {
    const skipPatterns = [
      'node_modules',
      'dist',
      'build',
      '.git',
      '.next',
      'coverage',
      '.vscode',
      '.idea',
      'playwright-tests',
      'tests',
      'test',
      '__tests__',
      '.env',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
    ];

    return skipPatterns.some((pattern) => name.includes(pattern));
  }

  /**
   * Check if a file is likely a route file
   */
  private isRouteFile(filename: string): boolean {
    const routePatterns = [
      /route/i,
      /router/i,
      /api/i,
      /controller/i,
      /endpoint/i,
      /handler/i,
    ];

    // Must be .js, .ts, .jsx, or .tsx
    const isSourceFile = /\.(js|ts|jsx|tsx)$/.test(filename);

    if (!isSourceFile) {
      return false;
    }

    // Check if filename matches route patterns
    const matchesPattern = routePatterns.some((pattern) => pattern.test(filename));

    // Also check common route directory names
    const parentDir = path.dirname(filename);
    const dirName = path.basename(parentDir).toLowerCase();
    const isInRouteDir = ['routes', 'routers', 'api', 'controllers', 'endpoints'].includes(dirName);

    return matchesPattern || isInRouteDir;
  }
}
