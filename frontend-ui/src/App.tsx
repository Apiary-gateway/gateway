import { useEffect, useState, useRef } from 'react';
import { getLogsFromAthena, getLogsFromDynamo } from './services/logs.service'; // Adjust the import path
import LogsTable from './components/LogsTable'; // Adjust the import path
import { LogEntry } from './types/logs.types';
import Modal from './components/Modal';
import LogDetail from './components/LogDetails';
import Guardrails from './components/Guardrails';
import Config from './components/Config';
// import logo from './assets/apiary-logo-black-bg.png';

function App() {
  const [showAthenaLogs, setShowAthenaLogs] = useState<boolean>(false);
  const [dynamoLogsRecord, setDynamoLogsRecord] = useState<
    Record<number, LogEntry[]>
  >({});
  const [athenaLogsRecord, setAthenaLogsRecord] = useState<
    Record<number, LogEntry[]>
  >({});
  const [athenaNextToken, setAthenaNextToken] = useState<string | null>(null);
  const [dynamoNextToken, setDynamoNextToken] = useState<string | null>(null);
  const [athenaQueryExecutionId, setAthenaQueryExecutionId] = useState<
    string | null
  >(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isGuardrailsModalOpen, setIsGuardrailsModalOpen] =
    useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchLogsFromAthena = async () => {
    setIsLoading(true);
    try {
      const logsResponse = await getLogsFromAthena(
        athenaNextToken,
        athenaQueryExecutionId
      );
      setAthenaLogsRecord({
        ...athenaLogsRecord,
        [currentPage + 1]: logsResponse.logs,
      });
      setCurrentPage(currentPage + 1);
      setAthenaNextToken(logsResponse.nextToken || null);
      setAthenaQueryExecutionId(logsResponse.queryExecutionId || null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogsFromDynamo = async () => {
    setIsLoading(true);
    try {
      const logsResponse = await getLogsFromDynamo(dynamoNextToken);
      setDynamoLogsRecord({
        ...dynamoLogsRecord,
        [currentPage + 1]: logsResponse.logs,
      });
      setCurrentPage(currentPage + 1);
      setDynamoNextToken(logsResponse.nextToken || null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showAthenaLogs && !athenaLogsRecord[1]) {
      fetchLogsFromAthena();
    } else if (!showAthenaLogs && !dynamoLogsRecord[1]) {
      fetchLogsFromDynamo();
    }
  }, [showAthenaLogs]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePageSelect = (page: number) => {
    setCurrentPage(page);
  };

  const handleToggleLogs = () => {
    if (!showAthenaLogs && !athenaLogsRecord[1]) {
      setCurrentPage(0);
    }
    setShowAthenaLogs(!showAthenaLogs);
  };

  const handleNext = async () => {
    if (showAthenaLogs) {
      await fetchLogsFromAthena();
    } else {
      await fetchLogsFromDynamo();
    }
  };

  const handleDetailsClick = (log: LogEntry) => {
    console.log(log.model_routing_history);
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLog(null);
  };

  const currentLogs = showAthenaLogs
    ? athenaLogsRecord[currentPage]
    : dynamoLogsRecord[currentPage];

  const pageNumbers = showAthenaLogs
    ? Array.from(Object.keys(athenaLogsRecord))
    : Array.from(Object.keys(dynamoLogsRecord));

  const isNextButtonDisabled = showAthenaLogs
    ? !athenaNextToken
    : !dynamoNextToken;

  return (
    <div className="app-container">
      <header className="app-header">
<<<<<<< Updated upstream
        <img src={logo} alt="AI Gateway Logo" className="logo" />
        <h1>AI GATEWAY LOGS ({showAthenaLogs ? 'Athena' : 'Dynamo'})</h1>
=======
        {/* <img src={logo} alt="AI Gateway Logo" className="logo" /> */}
        <div className="app-header-title-container">
          <h1>AI GATEWAY LOGS </h1>
          <span className="app-header-title-subtext">
            {showAthenaLogs ? 'Long Term ' : ' Short Term'}
          </span>
        </div>
>>>>>>> Stashed changes
        <div ref={menuRef}>
          <div
            className="hamburger-menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className="hamburger-line"></div>
            <div className="hamburger-line"></div>
            <div className="hamburger-line"></div>
          </div>
          <div className={`menu-dropdown ${isMenuOpen ? 'active' : ''}`}>
            <button
              className="menu-button"
              onClick={() => {
                handleToggleLogs();
                setIsMenuOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
              </svg>
              {showAthenaLogs ? 'Show Dynamo Logs' : 'Show Athena Logs'}
            </button>
            <button
              className="menu-button"
              onClick={() => {
                setIsGuardrailsModalOpen(true);
                setIsMenuOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.06 13.54L7.4 12l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41-5.64 5.66z" />
              </svg>
              Manage Guardrails
            </button>
            <button
              className="menu-button"
              onClick={() => {
                setIsConfigModalOpen(true);
                setIsMenuOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
              Manage Gateway Configuration
            </button>
          </div>
        </div>
      </header>
      <LogsTable
        logs={currentLogs || []}
        pageNumbers={pageNumbers}
        currentPage={currentPage}
        isNextButtonDisabled={isNextButtonDisabled}
        onNext={handleNext}
        onPageSelect={handlePageSelect}
        onDetailsClick={handleDetailsClick}
      />
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
      {isModalOpen && selectedLog && (
        <Modal onClose={handleCloseModal}>
          <LogDetail log={selectedLog} />
        </Modal>
      )}
      {isGuardrailsModalOpen && (
        <Modal onClose={() => setIsGuardrailsModalOpen(false)}>
          <Guardrails />
        </Modal>
      )}
      {isConfigModalOpen && (
        <Modal onClose={() => setIsConfigModalOpen(false)}>
          <Config onClose={() => setIsConfigModalOpen(false)} />
        </Modal>
      )}
    </div>
  );
}

export default App;
