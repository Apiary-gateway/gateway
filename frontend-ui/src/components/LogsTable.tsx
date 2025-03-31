import { LogEntry } from '../types/logs.types';

interface LogsTableProps {
  logs: LogEntry[];
  pageNumbers: number[];
  currentPage: number;
  nextToken: string | null;
  onNext: () => void;
  onPageSelect: (page: number) => void;
}

function LogsTable({
  logs,
  pageNumbers,
  currentPage,
  nextToken,
  onNext,
  onPageSelect,
}: LogsTableProps) {
  return (
    <div>
      <table className="logs-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Thread TS</th>
            <th>Timestamp</th>
            <th>Latency (ms)</th>
            <th>Provider</th>
            <th>Model</th>
            <th>Tokens Used</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.id}</td>
              <td>{log.thread_ts}</td>
              <td>{log.timestamp}</td>
              <td>{log.latency}</td>
              <td>{log.provider}</td>
              <td>{log.model}</td>
              <td>{log.tokens_used}</td>
              <td>{log.cost}</td>
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
