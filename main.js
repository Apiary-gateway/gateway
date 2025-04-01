(function () {
  console.log('Logs Endpoint from config:', window.LOGS_ENDPOINT);

  fetch(window.LOGS_ENDPOINT)
    .then((response) => response.json())
    .then((data) => {
      // Attempt to parse the "body" field if it's a string
      let parsedBody;
      try {
        parsedBody =
          typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      } catch (e) {
        console.error('Error parsing data.body:', e);
        parsedBody = data.body;
      }

      // Reconstruct the output with the parsed body
      const output = {
        ...data,
        body: parsedBody,
      };

      // Pretty-print the JSON with 2-space indentation.
      const jsonPretty = JSON.stringify(output, null, 2);
      const root = document.getElementById('root');

      // Clear previous content and add a heading.
      root.innerHTML = '<h1>AI Gateway Logs</h1>';

      // Create a <pre> element and add the formatted JSON.
      const pre = document.createElement('pre');
      pre.style.whiteSpace = 'pre-wrap';
      pre.textContent = jsonPretty;
      root.appendChild(pre);
    })
    .catch((error) => {
      console.error('Error fetching logs:', error);
      const root = document.getElementById('root');
      root.innerHTML = `
        <h1>AI Gateway Logs</h1>
        <p>Error loading logs: ${error.message}</p>
      `;
    });
})();
