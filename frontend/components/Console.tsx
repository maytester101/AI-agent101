'use client';

import { useEffect, useRef } from 'react';

interface Log {
  message: string;
  type: string;
  timestamp: string;
}

interface ConsoleProps {
  logs: Log[];
}

export default function Console({ logs }: ConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Live Console</h2>
        <p className="text-sm text-gray-600 mt-1">
          Real-time test execution logs
        </p>
      </div>
      <div
        ref={consoleRef}
        className="h-96 overflow-y-auto p-4 font-mono text-sm space-y-2"
      >
        {logs.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No logs yet. Start a scan to see live logs.
          </p>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`p-2 rounded ${getLogColor(log.type)}`}
            >
              <span className="text-xs text-gray-500">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="ml-2">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
