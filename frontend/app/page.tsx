'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Dashboard from '@/components/Dashboard';
import Console from '@/components/Console';
import Reports from '@/components/Reports';
import History from '@/components/History';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<Array<{ message: string; type: string; timestamp: string }>>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'console' | 'reports' | 'history'>('dashboard');
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Listen for logs
    newSocket.on('log', (data: { message: string; type: string; timestamp: string }) => {
      setLogs((prev) => [...prev, data]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            AI QA Engineer
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Autonomous API Testing Agent
          </p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'console', label: 'Live Console' },
              { id: 'reports', label: 'Reports' },
              { id: 'history', label: 'History' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard socket={socket} onDataUpdate={setDashboardData} />
        )}
        {activeTab === 'console' && <Console logs={logs} />}
        {activeTab === 'reports' && <Reports data={dashboardData} />}
        {activeTab === 'history' && <History />}
      </main>
    </div>
  );
}
