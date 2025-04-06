import { useEffect, useState } from 'react';
import { getLogs } from './services/logs.service'; // Adjust the import path
import LogsTable from './components/LogsTable'; // Adjust the import path
import './index.css'; // Ensure CSS is imported
import { LogEntry } from './types/logs.types';

function App() {
  const [logsRecord, setLogsRecord] = useState<Record<number, LogEntry[]>>({});
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchLogs = async (token: string | null) => {
    setIsLoading(true);
    try {
      const logsResponse = await getLogs(token);
      setLogsRecord({ ...logsRecord, [currentPage]: logsResponse.logs });
      setNextToken(logsResponse.nextToken || null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(null);
  }, []);

  const handleNext = () => {
    if (nextToken) {
      fetchLogs(nextToken);
    }
  };

  const handlePageSelect = (page: number) => {
    setCurrentPage(page);
  };

  const handleDetailsClick = (log: LogEntry) => {
    console.log(log);
    // console.log({
    //   prompt: log.raw_request?.body.prompt,
    //   response: log.raw_response?.text,
    // });
  };

  const currentLogs = logsRecord[currentPage] || [];

  console.log(currentPage, nextToken);
  return (
    <div className="app-container">
      <h1>AI GATEWAY LOGS</h1>
      <LogsTable
        logs={currentLogs}
        pageNumbers={Array.from(Object.keys(logsRecord))}
        currentPage={currentPage}
        nextToken={nextToken}
        onNext={handleNext}
        onPageSelect={handlePageSelect}
        onDetailsClick={handleDetailsClick}
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
