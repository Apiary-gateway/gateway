import { LogEntry } from '../types/logs.types';

interface LogDetailProps {
  log: LogEntry;
}

const LogDetail = ({ log }: LogDetailProps) => {
  const formatJSON = (value: string | null | undefined) => {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  };

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined) return 'N/A';

    if (key === 'timestamp' && typeof value === 'string') {
      return new Date(value).toLocaleString();
    }

    if (key === 'raw_request' || key === 'raw_response' || key === 'metadata') {
      const formatted = formatJSON(value);
      return formatted ? (
        <pre className="json-content">{formatted}</pre>
      ) : (
        'N/A'
      );
    }

    return String(value);
  };

  const logFields = [
    { key: 'id', label: 'ID' },
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'latency', label: 'Latency (ms)' },
    { key: 'is_successful', label: 'Status' },
    { key: 'success_reason', label: 'Success Reason' },
    { key: 'error_reason', label: 'Error Reason' },
    { key: 'model_routing_history', label: 'Model Routing History' },
    { key: 'user_id', label: 'User ID' },
    { key: 'thread_id', label: 'Thread ID' },
    { key: 'provider', label: 'Provider' },
    { key: 'model', label: 'Model' },
    { key: 'cost', label: 'Cost' },
    { key: 'metadata', label: 'Metadata' },
    { key: 'raw_request', label: 'Raw Request' },
    { key: 'raw_response', label: 'Raw Response' },
    { key: 'error_message', label: 'Error Message' },
  ];

  return (
    <div className="log-detail-container">
      <h2>Log Details</h2>
      <div className="log-detail-content">
        {logFields.map(({ key, label }) => (
          <div key={key} className="log-detail-row">
            <div className="log-detail-label">{label}</div>
            <div className="log-detail-value">
              {formatValue(key, log[key as keyof LogEntry])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogDetail;
