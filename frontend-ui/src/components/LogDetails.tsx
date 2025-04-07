import { LogEntry } from '../types/logs.types';
import { useState } from 'react';

interface LogDetailProps {
  log: LogEntry;
}

const CollapsibleField = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = value.split('\n');
  const showMore = lines.length > 2;

  return (
    <div className="log-detail-row">
      <div className="log-detail-label">{label}</div>
      <div className="log-detail-value">
        <div className="collapsible-content">
          {isExpanded ? (
            lines.map((line, i) => <div key={i}>{line}</div>)
          ) : (
            <>
              {lines.slice(0, 2).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {showMore && <div>...</div>}
            </>
          )}
        </div>
        {showMore && (
          <button
            className="collapsible-toggle-button"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▼' : '▶'} {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>
    </div>
  );
};

const JsonField = ({ value }: { value: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  let parsedValue;

  try {
    // First parse to handle any escape characters
    const unescapedValue = JSON.parse(value);
    // Then stringify and parse again to get clean JSON
    parsedValue = JSON.parse(JSON.stringify(unescapedValue, null, 2));
  } catch {
    return <div className="log-detail-value">{value}</div>;
  }

  return (
    <div className="json-field">
      <button
        className="json-toggle-button"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '▼' : '▶'} {'{ ... }'}
      </button>
      {isExpanded && (
        <pre className="json-content">
          {JSON.stringify(parsedValue, null, 2)}
        </pre>
      )}
    </div>
  );
};

const ModelRoutingHistory = ({ history }: { history: any }) => {
  if (!history) return null;

  try {
    let events;
    if (Array.isArray(history)) {
      events = history;
    } else if (typeof history === 'string') {
      try {
        events = JSON.parse(history);
      } catch {
        // If it's a string but not JSON, try to parse it as a comma-separated list
        events = history.split('→').map((item: string) => {
          const [provider, model] = item.trim().split(':');
          return {
            type: 'routed_to_specified',
            provider: provider?.trim(),
            model: model?.trim(),
          };
        });
      }
    } else {
      events = [history];
    }

    if (!Array.isArray(events)) {
      events = [events];
    }

    // Filter out any invalid events
    events = events
      .map((e) => JSON.parse(e))
      .filter((event) => event && (event.type || event.provider));

    if (events.length === 0) return null;

    return (
      <div className="log-detail-row">
        <div className="log-detail-label">Model Routing History</div>
        <div className="log-detail-value">
          <div className="routing-history">
            {events.map((event, index) => (
              <div key={index} className="routing-event">
                <span className="event-type">{event.type || 'routed'}</span>
                {event.provider && (
                  <span className="event-detail">
                    {event.provider}:{event.model || 'default'}
                  </span>
                )}
                {index < events.length - 1 && (
                  <span className="event-arrow">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error parsing model routing history:', error, history);
    return null;
  }
};

const LogDetail = ({ log }: LogDetailProps) => {
  const getPrompt = () => {
    try {
      const request = JSON.parse(log.raw_request || '{}');
      const body = JSON.parse(request.body || '{}');
      return body.prompt;
    } catch {
      return null;
    }
  };

  const getResponse = () => {
    try {
      const response = JSON.parse(log.raw_response || '{}');
      return response.text;
    } catch {
      return null;
    }
  };

  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined || value === '') return null;

    if (key === 'timestamp' && typeof value === 'string') {
      return new Date(value).toLocaleString();
    }

    if (key === 'raw_request' || key === 'raw_response' || key === 'metadata') {
      return <JsonField value={value} />;
    }

    return String(value);
  };

  const logFields = [
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'latency', label: 'Latency (ms)' },
    { key: 'is_successful', label: 'Status' },
    { key: 'success_reason', label: 'Success Reason' },
    { key: 'error_reason', label: 'Error Reason' },
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

  const prompt = getPrompt();
  const response = getResponse();

  return (
    <div className="log-detail-container">
      <h2>Log Details</h2>
      <div className="log-detail-content">
        <div className="log-detail-row">
          <div className="log-detail-label">ID</div>
          <div className="log-detail-value">{log.id || 'N/A'}</div>
        </div>

        {prompt && <CollapsibleField label="Prompt" value={prompt} />}
        {response && <CollapsibleField label="Response" value={response} />}
        {log.model_routing_history && (
          <ModelRoutingHistory history={log.model_routing_history} />
        )}

        {logFields.map(({ key, label }) => {
          const value = formatValue(key, log[key as keyof LogEntry]);
          if (value === null) return null;

          return (
            <div key={key} className="log-detail-row">
              <div className="log-detail-label">{label}</div>
              <div className="log-detail-value">{value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LogDetail;
