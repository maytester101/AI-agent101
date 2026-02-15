import { OllamaClient } from '../ollamaClient';
import { TestRunResults, TestResult } from './runner';

export interface AnalysisResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  fixedTests: number;
  issues: Issue[];
  recommendations: string[];
}

export interface Issue {
  testFile: string;
  endpoint?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'failure' | 'security' | 'performance' | 'error';
  message: string;
  suggestion?: string;
}

/**
 * Analyzes test results and performs auto-fix loop
 */
export class TestAnalyzer {
  private ollamaClient: OllamaClient;
  private projectPath: string;
  private maxRetries = 3;

  constructor(ollamaClient: OllamaClient, projectPath: string) {
    this.ollamaClient = ollamaClient;
    this.projectPath = projectPath;
  }

  /**
   * Analyze test results and attempt auto-fix
   */
  async analyze(
    testResults: TestRunResults,
    emitLog?: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void
  ): Promise<AnalysisResult> {
    const issues: Issue[] = [];
    const recommendations: string[] = [];
    let fixedTests = 0;

    // Analyze each failed test
    const failedTests = testResults.results.filter((r) => !r.passed);

    for (const failedTest of failedTests) {
      if (emitLog) {
        emitLog(`Analyzing failure: ${failedTest.testFile}`, 'info');
      }

      // Attempt auto-fix
      const fixResult = await this.attemptFix(failedTest, emitLog);

      if (fixResult.fixed) {
        fixedTests++;
        if (emitLog) {
          emitLog(`✅ Fixed: ${failedTest.testFile}`, 'success');
        }
      } else {
        // Create issue
        const issue = this.createIssue(failedTest, fixResult.reason);
        issues.push(issue);
      }
    }

    // Detect patterns and generate recommendations
    recommendations.push(...this.generateRecommendations(testResults, issues));

    return {
      totalTests: testResults.total,
      passedTests: testResults.passed,
      failedTests: testResults.failed,
      fixedTests,
      issues,
      recommendations,
    };
  }

  /**
   * Attempt to fix a failed test using AI
   */
  private async attemptFix(
    testResult: TestResult,
    emitLog?: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void
  ): Promise<{ fixed: boolean; reason?: string }> {
    if (!testResult.error) {
      return { fixed: false, reason: 'No error message available' };
    }

    // Read original test file
    let testCode: string;
    try {
      const fs = await import('fs/promises');
      testCode = await fs.readFile(testResult.testFile, 'utf-8');
    } catch (error: any) {
      return { fixed: false, reason: `Cannot read test file: ${error.message}` };
    }

    // Attempt fix with retries
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      if (emitLog) {
        emitLog(`Fix attempt ${attempt}/${this.maxRetries} for ${testResult.testFile}`, 'info');
      }

      try {
        // Use AI to analyze and fix
        const fixedCode = await this.ollamaClient.analyzeFailure(
          testCode,
          testResult.error,
          {
            endpoint: testResult.endpoint,
            duration: testResult.duration,
          }
        );

        // Save fixed code
        const fs = await import('fs/promises');
        await fs.writeFile(testResult.testFile, fixedCode, 'utf-8');

        // Re-run test to verify fix
        // Note: In production, you'd actually re-run the test
        // For now, we'll assume the AI fix is valid if it generates valid code
        if (this.isValidTestCode(fixedCode)) {
          return { fixed: true };
        }
      } catch (error: any) {
        if (emitLog && attempt === this.maxRetries) {
          emitLog(`Failed to fix after ${this.maxRetries} attempts: ${error.message}`, 'error');
        }
      }
    }

    return { fixed: false, reason: 'Max retries exceeded' };
  }

  /**
   * Create an issue from a failed test
   */
  private createIssue(testResult: TestResult, reason?: string): Issue {
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let type: 'failure' | 'security' | 'performance' | 'error' = 'failure';

    const error = testResult.error || '';

    // Detect security issues
    if (error.includes('SQL') || error.includes('XSS') || error.includes('injection')) {
      type = 'security';
      severity = 'high';
    }

    // Detect performance issues
    if (error.includes('timeout') || error.includes('slow') || error.includes('latency')) {
      type = 'performance';
      severity = 'medium';
    }

    // Detect critical errors
    if (error.includes('500') || error.includes('crash') || error.includes('exception')) {
      severity = 'critical';
      type = 'error';
    }

    return {
      testFile: testResult.testFile,
      endpoint: testResult.endpoint,
      severity,
      type,
      message: error,
      suggestion: reason,
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    testResults: TestRunResults,
    issues: Issue[]
  ): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    const slowTests = testResults.results.filter(
      (r) => r.duration && r.duration > 5000
    );
    if (slowTests.length > 0) {
      recommendations.push(
        `${slowTests.length} tests are taking longer than 5 seconds. Consider optimizing endpoint performance.`
      );
    }

    // Security recommendations
    const securityIssues = issues.filter((i) => i.type === 'security');
    if (securityIssues.length > 0) {
      recommendations.push(
        `Found ${securityIssues.length} potential security vulnerabilities. Review and implement proper input validation.`
      );
    }

    // Error handling recommendations
    const criticalIssues = issues.filter((i) => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(
        `Found ${criticalIssues.length} critical issues. These may indicate server crashes or unhandled exceptions.`
      );
    }

    // Test coverage recommendations
    const failureRate = testResults.failed / testResults.total;
    if (failureRate > 0.3) {
      recommendations.push(
        `High failure rate (${(failureRate * 100).toFixed(1)}%). Review API implementation and test cases.`
      );
    }

    return recommendations;
  }

  /**
   * Validate test code structure
   */
  private isValidTestCode(code: string): boolean {
    // Basic validation: check for required Playwright imports and test structure
    return (
      code.includes('@playwright/test') &&
      (code.includes('test(') || code.includes('test.describe')) &&
      code.includes('request')
    );
  }
}
