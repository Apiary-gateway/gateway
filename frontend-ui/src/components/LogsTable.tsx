import { LogEntry } from '../types/logs.types'; // Adjust the import path

interface LogsTableProps {
  logs: LogEntry[];
  pageNumbers: number[];
  currentPage: number;
  nextToken: string | null;
  onNext: () => void;
  onPageSelect: (page: number) => void;
  onDetailsClick: (log: LogEntry) => void; // Added for clickable details
}

function LogsTable({
  logs,
  pageNumbers,
  currentPage,
  nextToken,
  onNext,
  onPageSelect,
  onDetailsClick,
}: LogsTableProps) {
  // Format timestamp to human-readable local date and time
  const formatDateTime = (timestamp: string | null | undefined) => {
    if (!timestamp) {
      return 'NA';
    }
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div>
      <table className="logs-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Thread ID</th>
            <th>Status</th>
            <th>Model</th>
            <th>Provider</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{formatDateTime(log.timestamp)}</td>
              <td>{log.thread_id || 'NA'}</td>
              <td className={log.is_successful ? 'status-error' : ''}>
                {log.success_reason || log.error_reason || 'NA'}
              </td>
              <td>{log.model || 'NA'}</td>
              <td>{log.provider || 'NA'}</td>
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
            className={`page-button ${page === currentPage ? 'active' : ''}`}
            onClick={() => onPageSelect(page)}
          >
            {page}
          </button>
        ))}
        <button className="next-button" onClick={onNext} disabled={!nextToken}>
          Next →
        </button>
        <span className="page-info">Page {currentPage}</span>
      </div>
    </div>
  );
}

export default LogsTable;
