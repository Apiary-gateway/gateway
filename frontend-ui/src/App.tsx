import { useEffect, useState } from 'react';
import { getLogsFromAthena, getLogsFromDynamo } from './services/logs.service'; // Adjust the import path
import LogsTable from './components/LogsTable'; // Adjust the import path
import { LogEntry } from './types/logs.types';
import Modal from './components/Modal';
import LogDetail from './components/LogDetails';
import Guardrails from './components/Guardrails';
import Config from './components/Config';

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
  const [isConfigModalOpen, setIsConfigModalOpen] =
    useState<boolean>(false);

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
        <h1>AI GATEWAY LOGS ({showAthenaLogs ? 'Athena' : 'Dynamo'})</h1>
        <div className="header-buttons">
          <button className="toggle-button" onClick={handleToggleLogs}>
            {showAthenaLogs ? 'Show Dynamo Logs' : 'Show Athena Logs'}
          </button>
          <button
            className="guardrails-button"
            onClick={() => setIsGuardrailsModalOpen(true)}
          >
            Manage Guardrails
          </button>
          <button
            className="config-button"
            onClick={() => setIsConfigModalOpen(true)}
          >
            Manage Gateway Configuration
          </button>
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
          <Guardrails onClose={() => setIsGuardrailsModalOpen(false)} />
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
