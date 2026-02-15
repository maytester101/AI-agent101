'use client';

import { useState } from 'react';
import { Socket } from 'socket.io-client';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

type ScanMode = 'url' | 'local';

interface ManualEndpoint {
  method: string;
  path: string;
  authRequired: boolean;
}

export default function Dashboard({ socket, onDataUpdate }: DashboardProps) {
  const [mode, setMode] = useState<ScanMode>('url');
  const [projectPath, setProjectPath] = useState('');
  const [baseURL, setBaseURL] = useState('https://api.example.com');
  const [openApiUrl, setOpenApiUrl] = useState('');
  const [manualEndpoints, setManualEndpoints] = useState<ManualEndpoint[]>([]);
  const [newEndpointMethod, setNewEndpointMethod] = useState('GET');
  const [newEndpointPath, setNewEndpointPath] = useState('/');
  const [isScanning, setIsScanning] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalEndpoints: 0,
    passedTests: 0,
    failedTests: 0,
    securityIssues: 0,
    avgLatency: 0,
  });

  const handleDiscoverEndpoints = async () => {
    if (!openApiUrl.trim()) {
      alert('Please enter an OpenAPI/Swagger URL');
      return;
    }
    setIsDiscovering(true);
    try {
      const res = await axios.post(`${API_URL}/api/discover-endpoints`, {
        openApiUrl: openApiUrl.trim(),
      });
      const endpoints = (res.data.endpoints || []).map((e: { method: string; path: string; authRequired?: boolean }) => ({
        method: e.method,
        path: e.path,
        authRequired: !!e.authRequired,
      }));
      setManualEndpoints(endpoints);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setIsDiscovering(false);
    }
  };

  const addManualEndpoint = () => {
    const path = newEndpointPath.trim().startsWith('/') ? newEndpointPath.trim() : `/${newEndpointPath.trim()}`;
    if (!path) return;
    setManualEndpoints((prev) => [...prev, { method: newEndpointMethod, path, authRequired: false }]);
    setNewEndpointPath('/');
  };

  const removeManualEndpoint = (index: number) => {
    setManualEndpoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFullScan = async () => {
    if (mode === 'local') {
      if (!projectPath) {
        alert('Please enter a project path');
        return;
      }
    } else {
      if (!baseURL.trim()) {
        alert('Please enter the API Base URL');
        return;
      }
      const endpoints = manualEndpoints.length ? manualEndpoints : null;
      if (!endpoints?.length && !openApiUrl.trim()) {
        alert('Provide an OpenAPI URL and click "Discover endpoints", or add endpoints manually');
        return;
      }
    }

    setIsScanning(true);
    try {
      let endpointsToUse = manualEndpoints;
      if (mode === 'url' && openApiUrl.trim() && (!manualEndpoints.length || manualEndpoints.every(e => e.path === ''))) {
        const res = await axios.post(`${API_URL}/api/discover-endpoints`, { openApiUrl: openApiUrl.trim() });
        endpointsToUse = (res.data.endpoints || []).map((e: { method: string; path: string; authRequired?: boolean }) => ({
          method: e.method,
          path: e.path,
          authRequired: !!e.authRequired,
        }));
      }

      if (mode === 'url' && endpointsToUse.length > 0) {
        const response = await axios.post(`${API_URL}/api/full-scan-url`, {
          baseURL: baseURL.trim().replace(/\/$/, ''),
          endpoints: endpointsToUse,
          authInfo: { hasAuth: false },
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
      } else if (mode === 'local') {
        const response = await axios.post(`${API_URL}/api/full-scan`, {
          projectPath,
          baseURL: baseURL.trim() || 'http://localhost:3000',
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
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      alert(error.response?.data?.error || error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const canStartScan =
    mode === 'local'
      ? !!projectPath
      : !!baseURL.trim() && (manualEndpoints.length > 0 || !!openApiUrl.trim());

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">How do you want to test?</h2>
        <div className="flex gap-4 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === 'url'}
              onChange={() => setMode('url')}
              className="rounded-full border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="font-medium">Test a public API (by URL)</span>
            <span className="text-sm text-gray-500">— For everyone on the web</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === 'local'}
              onChange={() => setMode('local')}
              className="rounded-full border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="font-medium">Local project (path)</span>
            <span className="text-sm text-gray-500">— Scan code on your machine</span>
          </label>
        </div>

        {mode === 'url' ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Base URL *</label>
                <input
                  type="url"
                  value={baseURL}
                  onChange={(e) => setBaseURL(e.target.value)}
                  placeholder="https://your-api.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OpenAPI / Swagger URL (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={openApiUrl}
                    onChange={(e) => setOpenApiUrl(e.target.value)}
                    placeholder="https://api.example.com/openapi.json"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={handleDiscoverEndpoints}
                    disabled={isDiscovering || !openApiUrl.trim()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    {isDiscovering ? 'Fetching…' : 'Discover endpoints'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Or add endpoints manually</label>
                <div className="flex gap-2 mb-2">
                  <select
                    value={newEndpointMethod}
                    onChange={(e) => setNewEndpointMethod(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newEndpointPath}
                    onChange={(e) => setNewEndpointPath(e.target.value)}
                    placeholder="/users"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={addManualEndpoint}
                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
                {manualEndpoints.length > 0 && (
                  <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {manualEndpoints.map((e, i) => (
                      <li key={i} className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1 rounded">
                        <span><strong>{e.method}</strong> {e.path}</span>
                        <button
                          type="button"
                          onClick={() => removeManualEndpoint(i)}
                          className="text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Path</label>
              <input
                type="text"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                placeholder="C:\path\to\express\project or /path/to/project"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
              <input
                type="text"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="http://localhost:3000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleFullScan}
          disabled={isScanning || !canStartScan}
          className="mt-4 w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanning ? 'Scanning…' : 'Start Full Scan'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Endpoints" value={stats.totalEndpoints} icon="🔌" color="blue" />
        <StatCard title="Passed Tests" value={stats.passedTests} icon="✅" color="green" />
        <StatCard title="Failed Tests" value={stats.failedTests} icon="❌" color="red" />
        <StatCard title="Security Issues" value={stats.securityIssues} icon="🔒" color="orange" />
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
