'use client';

interface ReportsProps {
  data: any;
}

export default function Reports({ data }: ReportsProps) {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No report data available. Run a scan first.</p>
      </div>
    );
  }

  const security = data.security || {};
  const performance = data.performance || {};
  const analysis = data.analysis || {};

  return (
    <div className="space-y-6">
      {/* Security Report */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Security Report</h2>
        {security.issues && security.issues.length > 0 ? (
          <div className="space-y-3">
            {security.issues.map((issue: any, index: number) => (
              <div
                key={index}
                className={`p-4 rounded border-l-4 ${
                  issue.severity === 'critical'
                    ? 'border-red-500 bg-red-50'
                    : issue.severity === 'high'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-yellow-500 bg-yellow-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{issue.endpoint}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {issue.type} - {issue.payload}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      issue.severity === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : issue.severity === 'high'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {issue.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No security issues found.</p>
        )}
      </div>

      {/* Performance Report */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Performance Report</h2>
        {performance.metrics && performance.metrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Endpoint
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg Latency
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    P95 Latency
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {performance.metrics.map((metric: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm">{metric.endpoint}</td>
                    <td className="px-4 py-3 text-sm">{metric.averageLatency.toFixed(0)}ms</td>
                    <td className="px-4 py-3 text-sm">{metric.p95Latency.toFixed(0)}ms</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          metric.status === 'fast'
                            ? 'bg-green-100 text-green-800'
                            : metric.status === 'moderate'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {metric.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No performance data available.</p>
        )}
      </div>

      {/* Analysis Report */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
          <ul className="list-disc list-inside space-y-2">
            {analysis.recommendations.map((rec: string, index: number) => (
              <li key={index} className="text-gray-700">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
