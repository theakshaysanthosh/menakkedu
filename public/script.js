// UselessSuite Frontend Script

document.addEventListener('DOMContentLoaded', () => {

    // ============================================================
    // EXCUSE GENERATOR
    // ============================================================

    const excuseInput = document.getElementById('excuseInput');
    const excuseButton = document.getElementById('excuseButton');
    const excuseResult = document.getElementById('excuseResult');

    excuseButton.addEventListener('click', async () => {
        const situation = excuseInput.value.trim();

        if (!situation) {
            excuseResult.innerHTML = '<p>Please describe a situation first.</p>';
            return;
        }

        excuseButton.disabled = true;
        excuseButton.textContent = 'Thinking...';
        excuseResult.innerHTML = '<p>Generating a believable excuse... 💭</p>';

        try {
            const response = await fetch('/api/generate-excuse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ situation: situation })
            });

            const data = await response.json();

            if (response.ok && data.excuse) {
                excuseResult.innerHTML = '<p>' + escapeHtml(data.excuse) + '</p>';
            } else {
                excuseResult.innerHTML = '<p>⚠️ ' + escapeHtml(data.error || 'Failed to generate excuse.') + '</p>';
            }
        } catch (error) {
            console.error('Excuse Generator Error:', error);
            excuseResult.innerHTML = '<p>⚠️ Network Error: Could not connect to backend server. Make sure the Node server is running!</p>';
        } finally {
            excuseButton.disabled = false;
            excuseButton.textContent = 'Generate Excuse';
        }
    });

    // ============================================================
    // TEXT DEHUMANISER
    // ============================================================

    const dehumaniserInput = document.getElementById('dehumaniserInput');
    const dehumaniseButton = document.getElementById('dehumaniseButton');
    const dehumaniserResult = document.getElementById('dehumaniserResult');

    dehumaniseButton.addEventListener('click', async () => {
        const text = dehumaniserInput.value.trim();

        if (!text) {
            dehumaniserResult.innerHTML = '<p>Please enter some text first.</p>';
            return;
        }

        dehumaniseButton.disabled = true;
        dehumaniseButton.textContent = 'Dehumanising...';
        dehumaniserResult.innerHTML = '<p>Processing... 🤖</p>';

        try {
            const response = await fetch('/api/dehumanise', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            });

            const data = await response.json();

            if (response.ok && data.result) {
                dehumaniserResult.innerHTML = '<p>' + escapeHtml(data.result) + '</p>';
            } else {
                dehumaniserResult.innerHTML = '<p>⚠️ ' + escapeHtml(data.error || 'Failed to dehumanise text.') + '</p>';
            }
        } catch (error) {
            console.error('Dehumaniser Error:', error);
            dehumaniserResult.innerHTML = '<p>⚠️ Network Error: Could not connect to backend server.</p>';
        } finally {
            dehumaniseButton.disabled = false;
            dehumaniseButton.textContent = 'Dehumanise';
        }
    });

    // ============================================================
    // PARAGRAPH INFLATOR / EXAGGERATOR
    // ============================================================

    const exaggeratorInput = document.getElementById('exaggeratorInput');
    const exaggerateButton = document.getElementById('exaggerateButton');
    const exaggeratorResult = document.getElementById('exaggeratorResult');

    exaggerateButton.addEventListener('click', async () => {
        const text = exaggeratorInput.value.trim();

        if (!text) {
            exaggeratorResult.innerHTML = '<p>Please enter a statement first.</p>';
            return;
        }

        exaggerateButton.disabled = true;
        exaggerateButton.textContent = 'Inflating...';
        exaggeratorResult.innerHTML = '<p>Exaggerating... 🎈</p>';

        try {
            const response = await fetch('/api/exaggerate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            });

            const data = await response.json();

            if (response.ok && data.result) {
                exaggeratorResult.innerHTML = '<p>' + escapeHtml(data.result) + '</p>';
            } else {
                exaggeratorResult.innerHTML = '<p>⚠️ ' + escapeHtml(data.error || 'Failed to exaggerate text.') + '</p>';
            }
        } catch (error) {
            console.error('Exaggerator Error:', error);
            exaggeratorResult.innerHTML = '<p>⚠️ Network Error: Could not connect to backend server.</p>';
        } finally {
            exaggerateButton.disabled = false;
            exaggerateButton.textContent = 'Exaggerate';
        }
    });

    // ============================================================
    // OVERTHINKER
    // ============================================================

    const overthinkInput = document.getElementById('overthinkInput');
    const overthinkButton = document.getElementById('overthinkButton');
    const overthinkResult = document.getElementById('overthinkResult');

    overthinkButton.addEventListener('click', async () => {
        const decision = overthinkInput.value.trim();

        if (!decision) {
            overthinkResult.innerHTML = '<p>Please give us a decision to spiral about first.</p>';
            return;
        }

        overthinkButton.disabled = true;
        overthinkButton.textContent = 'Overthinking...';
        overthinkResult.innerHTML = '<p>Considering every possible angle... 🌀</p>';

        try {
            const response = await fetch('/api/overthink', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ decision: decision })
            });

            const data = await response.json();

            if (response.ok && data.result) {
                overthinkResult.innerHTML = '<p>' + escapeHtml(data.result) + '</p>';
            } else {
                overthinkResult.innerHTML = '<p>⚠️ ' + escapeHtml(data.error || 'Failed to overthink this.') + '</p>';
            }
        } catch (error) {
            console.error('Overthinker Error:', error);
            overthinkResult.innerHTML = '<p>⚠️ Network Error: Could not connect to backend server.</p>';
        } finally {
            overthinkButton.disabled = false;
            overthinkButton.textContent = 'Overthink It';
        }
    });

    // ============================================================
    // UTILITY: Escape HTML to prevent XSS
    // ============================================================

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

});
