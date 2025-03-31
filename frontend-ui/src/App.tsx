import { useEffect, useState } from 'react';
import { getLogs } from './services/logs.service';

function App() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    getLogs().then((logs) => setLogs(logs));
  }, []);

  return (
    <>
      <h1>Hello World</h1>
      <pre>{JSON.stringify(logs, null, 2)}</pre>
    </>
  );
}

export default App;
