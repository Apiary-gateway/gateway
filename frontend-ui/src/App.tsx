import { useEffect, useState } from 'react';
import { getLogs } from './services/logs.service'; // Adjust the import path
import LogsTable from './components/LogsTable'; // Adjust the import path
import './index.css'; // Ensure CSS is imported
import { LogEntry } from './types/logs.types';

function App() {
  const [logsMap, setLogsMap] = useState<Map<number, LogEntry[]>>(new Map());
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchLogs = async (token: string | null) => {
    setIsLoading(true);
    try {
      const logsResponse = await getLogs(token);
      console.log(logsResponse.logs);
      const pageNumber = logsResponse.page;
      setLogsMap((prev) => new Map(prev).set(pageNumber, logsResponse.logs));
      setNextToken(logsResponse.nextToken || null);
      setCurrentPage(pageNumber);
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

  const currentLogs = logsMap.get(currentPage) || [];

  return (
    <div className="app-container">
      <h1>AI GATEWAY LOGS</h1>
      <LogsTable
        logs={currentLogs}
        pageNumbers={Array.from(logsMap.keys())}
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
