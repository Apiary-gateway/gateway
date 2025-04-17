import { LogEntry } from '../types/logs.types'; // Adjust the import path

interface LogsTableProps {
  logs: LogEntry[];
  pageNumbers: string[];
  currentPage: number;
  isNextButtonDisabled: boolean;
  onNext: () => void;
  onPageSelect: (page: number) => void;
  onDetailsClick: (log: LogEntry) => void; // Added for clickable details
}

function LogsTable({
  logs,
  pageNumbers,
  currentPage,
  isNextButtonDisabled,
  onNext,
  onPageSelect,
  onDetailsClick,
}: LogsTableProps) {
  // Format timestamp to human-readable local date and time
  const formatDateTime = (timestamp: string | null | undefined) => {
    if (!timestamp) {
      return 'NA';
    }
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    });
  };

  const getTokensAndCost = (log: LogEntry) => {
    const rawResponse = JSON.parse(log.raw_response || '{}');

    try {
      const usage = rawResponse.usage.total_tokens;
      const cost = ((rawResponse.usage.cost as number) * 100).toFixed(3);
      return `${usage} / ${cost} Cents`;
    } catch {
      return 'NA';
    }
  };

  return (
    <div>
      <table className="logs-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Thread ID</th>
            <th>Status</th>
            <th>Latency</th>
            <th>Model</th>
            <th>Provider</th>
            <th>Tokens / Cost</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{formatDateTime(log.timestamp)}</td>
              <td>{log.thread_id || 'NA'}</td>
              <td
                className={
                  !log.is_successful ? 'status-error' : 'status-success'
                }
              >
                {log.success_reason || log.error_reason || 'NA'}
              </td>
              <td>{log.latency || 'NA'}</td>
              <td>{log.model || 'NA'}</td>
              <td>{log.provider || 'NA'}</td>
              <td>{getTokensAndCost(log)}</td>
              <td>
                <button
                  className="details-button"
                  onClick={() => onDetailsClick(log)}
                >
                  Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        {pageNumbers.map((page) => (
          <button
            key={page}
            className={`page-button ${
              page === String(currentPage) ? 'active' : ''
            }`}
            onClick={() => onPageSelect(Number(page))}
          >
            {page}
          </button>
        ))}
        <button
          className="next-button"
          onClick={onNext}
          disabled={isNextButtonDisabled}
        >
          Next →
        </button>
        <span className="page-info">Page {currentPage}</span>
      </div>
    </div>
  );
}

export default LogsTable;
