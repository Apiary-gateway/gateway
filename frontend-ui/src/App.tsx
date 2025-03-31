import { useEffect, useState } from 'react';
import { getLogs } from './services/logs.service'; // Adjust the import path
import LogsTable from './components/LogsTable'; // Adjust the import path
import './index.css'; // Import CSS (if not already imported globally)

// Define the type for a single log entry
export interface LogEntry {
  id: string;
  thread_ts: string;
  timestamp: string;
  latency: number;
  provider: string;
  model: string;
  tokens_used: number;
  cost: number;
}

function App() {
  const [logsMap, setLogsMap] = useState<Map<number, LogEntry[]>>(new Map());
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch logs with an optional nextToken
  const fetchLogs = async (token: string | null) => {
    setIsLoading(true);
    try {
      const logsResponse = await getLogs(token);
      const pageNumber = logsResponse.page;
      setLogsMap((prev) => new Map(prev).set(pageNumber, logsResponse.logs));
      setNextToken(logsResponse.nextToken);
      setCurrentPage(pageNumber);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchLogs();
  }, []);

  // Handle "Next" button click
  const handleNext = () => {
    if (nextToken) {
      fetchLogs(nextToken);
    }
  };

  // Handle page selection
  const handlePageSelect = (page: number) => {
    setCurrentPage(page);
  };

  const currentLogs = logsMap.get(currentPage) || [];

  return (
    <div className="app-container">
      <h1>AI Gateway Logs</h1>
      <LogsTable
        logs={currentLogs}
        pageNumbers={Array.from(logsMap.keys())}
        currentPage={currentPage}
        nextToken={nextToken}
        onNext={handleNext}
        onPageSelect={handlePageSelect}
      />
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
}

export default App;
