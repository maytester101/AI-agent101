'use client';

import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import axios from 'axios';

interface DashboardProps {
  socket: Socket | null;
  onDataUpdate: (data: any) => void;
}

interface Stats {
  totalEndpoints: number;
  passedTests: number;
  failedTests: number;
  securityIssues: number;
  avgLatency: number;
}

export default function Dashboard({ socket, onDataUpdate }: DashboardProps) {
  const [projectPath, setProjectPath] = useState('');
  const [baseURL, setBaseURL] = useState('http://localhost:3000');
  const [isScanning, setIsScanning] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalEndpoints: 0,
    passedTests: 0,
    failedTests: 0,
    securityIssues: 0,
    avgLatency: 0,
  });

  const handleFullScan = async () => {
    if (!projectPath) {
      alert('Please enter a project path');
      return;
    }

    setIsScanning(true);
    try {
      const response = await axios.post('http://localhost:3001/api/full-scan', {
        projectPath,
        baseURL,
      });

      const summary = response.data.summary;
      setStats({
        totalEndpoints: summary.endpoints || 0,
        passedTests: summary.testResults?.passed || 0,
        failedTests: summary.testResults?.failed || 0,
        securityIssues: summary.security?.issues?.length || 0,
        avgLatency: summary.performance?.averageLatency || 0,
      });

      onDataUpdate(response.data);
    } catch (error: any) {
      console.error('Scan error:', error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scan Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Project Scanner</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Path
            </label>
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="/path/to/express/project"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base URL
            </label>
            <input
              type="text"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="http://localhost:3000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleFullScan}
            disabled={isScanning}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? 'Scanning...' : 'Start Full Scan'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Endpoints"
          value={stats.totalEndpoints}
          icon="🔌"
          color="blue"
        />
        <StatCard
          title="Passed Tests"
          value={stats.passedTests}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Failed Tests"
          value={stats.failedTests}
          icon="❌"
          color="red"
        />
        <StatCard
          title="Security Issues"
          value={stats.securityIssues}
          icon="🔒"
          color="orange"
        />
        <StatCard
          title="Avg Latency"
          value={`${stats.avgLatency.toFixed(0)}ms`}
          icon="⚡"
          color="purple"
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    orange: 'bg-orange-50 border-orange-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className={`bg-white rounded-lg shadow p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
