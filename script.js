// Excuse Generator Frontend Script

document.addEventListener('DOMContentLoaded', () => {
  const userInput = document.getElementById('userInput');
  const generateBtn = document.getElementById('generateBtn');
  const excuseOutput = document.getElementById('excuseOutput');

  generateBtn.addEventListener('click', async () => {
    const promptText = userInput.value.trim();

    // UI Loading state
    generateBtn.disabled = true;
    generateBtn.textContent = 'Thinking...';
    excuseOutput.textContent = 'Generating a believable excuse... 💭';

    try {
      // Send situation payload to backend route
      const response = await fetch('/api/generate-excuse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ situation: promptText })
      });

      const data = await response.json();

      if (response.ok && data.excuse) {
        excuseOutput.textContent = data.excuse;
      } else {
        excuseOutput.textContent = `⚠️ ${data.error || 'Failed to generate excuse.'}`;
      }
    } catch (error) {
      console.error('API Error:', error);
      excuseOutput.textContent = '⚠️ Network Error: Could not connect to backend server. Make sure the Node server is running!';
    } finally {
      // Restore UI state
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate Excuse';
    }
  });
});
