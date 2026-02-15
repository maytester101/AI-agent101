/**
 * Memory/Storage module for test history
 * In production, this would connect to a database (PostgreSQL, MongoDB, etc.)
 */

export interface TestSession {
  id: string;
  projectPath: string;
  baseURL: string;
  timestamp: Date;
  summary: {
    endpoints: number;
    tests: number;
    passed: number;
    failed: number;
    securityIssues: number;
    avgLatency: number;
  };
  results: any;
}

/**
 * In-memory storage (for demo purposes)
 * Replace with database in production
 */
class MemoryStore {
  private sessions: Map<string, TestSession> = new Map();

  /**
   * Save a test session
   */
  async saveSession(session: TestSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  /**
   * Get a test session by ID
   */
  async getSession(id: string): Promise<TestSession | null> {
    return this.sessions.get(id) || null;
  }

  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<TestSession[]> {
    return Array.from(this.sessions.values());
  }

  /**
   * Get recent sessions
   */
  async getRecentSessions(limit: number = 10): Promise<TestSession[]> {
    const sessions = Array.from(this.sessions.values());
    return sessions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Delete a session
   */
  async deleteSession(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }
}

export const memoryStore = new MemoryStore();
