import { LogEntry } from '../types/logs.types';
interface LogsTableProps {
    logs: LogEntry[];
    pageNumbers: string[];
    currentPage: number;
    isNextButtonDisabled: boolean;
    onNext: () => void;
    onPageSelect: (page: number) => void;
    onDetailsClick: (log: LogEntry) => void;
}
declare function LogsTable({ logs, pageNumbers, currentPage, isNextButtonDisabled, onNext, onPageSelect, onDetailsClick, }: LogsTableProps): import("react").JSX.Element;
export default LogsTable;
