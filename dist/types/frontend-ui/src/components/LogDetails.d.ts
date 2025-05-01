import { LogEntry } from '../types/logs.types';
interface LogDetailProps {
    log: LogEntry;
}
declare const LogDetail: ({ log }: LogDetailProps) => import("react").JSX.Element;
export default LogDetail;
