import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
}

if (fs.existsSync('function.env')) {
    dotenv.config({ path: 'function.env' });
}

// Server setup
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(__dirname));

// Gemini models
const candidateModels = [
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest'
];

// ============================================================
// EXCUSE GENERATOR
// ============================================================

app.post('/api/generate-excuse', async (req, res) => {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || '').trim();

        if (!apiKey) {
            return res.status(400).json({
                error: 'GEMINI_API_KEY is missing or empty in function.env.'
            });
        }

        const situation = req.body.situation || req.body.prompt;

        if (
            !situation ||
            typeof situation !== 'string' ||
            situation.trim() === ''
        ) {
            return res.status(400).json({
                error: 'Please provide a valid situation for the excuse.'
            });
        }

        const trimmedSituation = situation.trim();

        const promptText =
            'You are an excuse generator.\n\n' +
            'The user will describe a situation where they need an excuse.\n\n' +
            'Generate ONE excuse that is directly related to the situation provided by the user.\n\n' +
            'Rules:\n' +
            '- Understand what happened in the user situation.\n' +
            '- Generate an excuse that specifically addresses that situation.\n' +
            '- Do not introduce a completely unrelated event.\n' +
            '- Make the excuse natural and conversational.\n' +
            '- Keep it reasonably believable.\n' +
            '- Keep it concise.\n' +
            '- Do not explain your reasoning.\n' +
            '- Return only the excuse.\n\n' +
            'User situation:\n' +
            trimmedSituation;

        let responseText = null;
        let lastError = null;

        for (const modelName of candidateModels) {
            try {
                const response = await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models/' +
                    modelName +
                    ':generateContent?key=' +
                    encodeURIComponent(apiKey),
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [
                                        {
                                            text: promptText
                                        }
                                    ]
                                }
                            ]
                        })
                    }
                );

                const data = await response.json();

                if (
                    response.ok &&
                    data.candidates &&
                    data.candidates[0] &&
                    data.candidates[0].content &&
                    data.candidates[0].content.parts &&
                    data.candidates[0].content.parts[0] &&
                    data.candidates[0].content.parts[0].text
                ) {
                    responseText =
                        data.candidates[0].content.parts[0].text;

                    break;
                }

                lastError =
                    (data.error && data.error.message) ||
                    'HTTP ' + response.status + ' for ' + modelName;

            } catch (error) {
                lastError = error.message;
            }
        }

        if (!responseText || responseText.trim() === '') {
            return res.status(500).json({
                error:
                    lastError ||
                    'Received an empty response from Gemini.'
            });
        }

        return res.json({
            excuse: responseText.trim()
        });

    } catch (error) {
        console.error('Error in excuse generator:', error);

        return res.status(500).json({
            error:
                error.message ||
                'An error occurred while generating the excuse.'
        });
    }
});

// ============================================================
// TEXT DEHUMANISER
// ============================================================

app.post('/api/dehumanise', async (req, res) => {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || '').trim();

        if (!apiKey) {
            return res.status(400).json({
                error: 'GEMINI_API_KEY is missing or empty in function.env.'
            });
        }

        const text = req.body.text;

        if (
            !text ||
            typeof text !== 'string' ||
            text.trim() === ''
        ) {
            return res.status(400).json({
                error: 'Please provide some text to dehumanise.'
            });
        }

        const trimmedText = text.trim();

        const promptText =
            'You are a text dehumaniser.\n\n' +
            'Rewrite the user text so that it sounds extremely cold, robotic, bureaucratic, emotionally detached, and impersonal.\n\n' +
            'Rules:\n' +
            '- Preserve the original meaning.\n' +
            '- Do not add completely new information.\n' +
            '- Remove emotional and personal language where possible.\n' +
            '- Use formal, sterile, bureaucratic wording.\n' +
            '- Make the result sound like it was written by an automated administrative system.\n' +
            '- Keep the rewritten text concise.\n' +
            '- Do not explain what you changed.\n' +
            '- Return ONLY the rewritten text.\n\n' +
            'User text:\n' +
            trimmedText;

        let responseText = null;
        let lastError = null;

        for (const modelName of candidateModels) {
            try {
                const response = await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models/' +
                    modelName +
                    ':generateContent?key=' +
                    encodeURIComponent(apiKey),
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [
                                        {
                                            text: promptText
                                        }
                                    ]
                                }
                            ]
                        })
                    }
                );

                const data = await response.json();

                if (
                    response.ok &&
                    data.candidates &&
                    data.candidates[0] &&
                    data.candidates[0].content &&
                    data.candidates[0].content.parts &&
                    data.candidates[0].content.parts[0] &&
                    data.candidates[0].content.parts[0].text
                ) {
                    responseText =
                        data.candidates[0].content.parts[0].text;

                    break;
                }

                lastError =
                    (data.error && data.error.message) ||
                    'HTTP ' + response.status + ' for ' + modelName;

            } catch (error) {
                lastError = error.message;
            }
        }

        if (!responseText || responseText.trim() === '') {
            return res.status(500).json({
                error:
                    lastError ||
                    'Received an empty response from Gemini.'
            });
        }

        return res.json({
            result: responseText.trim()
        });

    } catch (error) {
        console.error('Error in text dehumaniser:', error);

        return res.status(500).json({
            error:
                error.message ||
                'An error occurred while dehumanising the text.'
        });
    }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
    console.log(
        'UselessSuite server running at http://localhost:' + PORT
    );
});
