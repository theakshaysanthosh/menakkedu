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

// ============================================================
// GEMINI MODEL DISCOVERY
//
// Google renames/retires Gemini model IDs frequently (gemini-1.5-*
// and gemini-2.0-flash are already gone as of late 2026). Instead
// of hardcoding model names that will eventually 404, we ask the
// Gemini API which models currently support generateContent and
// try those, newest-looking first. Falls back to a static guess
// list only if the discovery call itself fails (e.g. bad API key).
// ============================================================

const FALLBACK_MODELS = [
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
];

let modelListCache = { models: null, fetchedAt: 0 };
const MODEL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function extractVersion(modelName) {
    const match = modelName.match(/gemini-(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
}

async function getCandidateModels(apiKey) {
    const now = Date.now();

    if (modelListCache.models && (now - modelListCache.fetchedAt) < MODEL_CACHE_TTL_MS) {
        return modelListCache.models;
    }

    try {
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models?key=' +
            encodeURIComponent(apiKey)
        );

        const data = await response.json();

        if (response.ok && Array.isArray(data.models)) {
            // Skip models that can't do plain text generateContent
            // (image/audio/tts/embedding/live/vision-only variants).
            const excludePattern = /(vision|image|audio|tts|embedding|aqa|live|native-audio)/i;

            const usable = data.models.filter((m) =>
                m.name &&
                Array.isArray(m.supportedGenerationMethods) &&
                m.supportedGenerationMethods.includes('generateContent') &&
                !excludePattern.test(m.name)
            );

            const flash = usable
                .filter((m) => m.name.includes('flash'))
                .map((m) => m.name.replace(/^models\//, ''));

            const others = usable
                .filter((m) => !m.name.includes('flash'))
                .map((m) => m.name.replace(/^models\//, ''));

            flash.sort((a, b) => extractVersion(b) - extractVersion(a));
            others.sort((a, b) => extractVersion(b) - extractVersion(a));

            const combined = [...flash, ...others];

            if (combined.length > 0) {
                modelListCache = { models: combined, fetchedAt: now };
                return combined;
            }
        }
    } catch (error) {
        console.error('Could not fetch Gemini model list, using fallback list:', error.message);
    }

    return FALLBACK_MODELS;
}

// ============================================================
// EXCUSE GENERATOR
// ============================================================

app.post('/api/generate-excuse', async (req, res) => {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || '').trim();

        if (!apiKey) {
            return res.status(400).json({
                error: 'GEMINI_API_KEY is missing or empty. Set it in a .env or function.env file.'
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

        const candidateModels = await getCandidateModels(apiKey);
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
                error: 'GEMINI_API_KEY is missing or empty. Set it in a .env or function.env file.'
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

        const candidateModels = await getCandidateModels(apiKey);
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
// PARAGRAPH INFLATOR / EXAGGERATOR
// ============================================================

app.post('/api/exaggerate', async (req, res) => {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || '').trim();

        if (!apiKey) {
            return res.status(400).json({
                error: 'GEMINI_API_KEY is missing or empty. Set it in a .env or function.env file.'
            });
        }

        const text = req.body.text;

        if (
            !text ||
            typeof text !== 'string' ||
            text.trim() === ''
        ) {
            return res.status(400).json({
                error: 'Please provide some text to exaggerate.'
            });
        }

        const trimmedText = text.trim();

        const promptText =
            'You are a paragraph inflator and professional overexplainer.\n\n' +
            'The user will give you a short, simple statement.\n\n' +
            'Your job is to transform that statement into a much longer, unnecessarily elaborate paragraph.\n\n' +
            'Rules:\n' +
            '- Preserve the core meaning of the original statement.\n' +
            '- Expand simple ideas into lengthy explanations.\n' +
            '- Add unnecessary context, transitions, elaboration, and repetition.\n' +
            '- Use unnecessarily sophisticated and verbose language.\n' +
            '- Make ordinary events sound much more significant than they really are.\n' +
            '- The result should feel hilariously overexplained.\n' +
            '- Do not completely change the original situation.\n' +
            '- Do not contradict the original statement.\n' +
            '- Do not explain what you are doing.\n' +
            '- Return ONLY the exaggerated paragraph.\n\n' +
            'Original statement:\n' +
            trimmedText;

        const candidateModels = await getCandidateModels(apiKey);
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
        console.error('Error in paragraph inflator:', error);

        return res.status(500).json({
            error:
                error.message ||
                'An error occurred while exaggerating the text.'
        });
    }
});

// ============================================================
// OVERTHINKER
// ============================================================

app.post('/api/overthink', async (req, res) => {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || '').trim();

        if (!apiKey) {
            return res.status(400).json({
                error: 'GEMINI_API_KEY is missing or empty. Set it in a .env or function.env file.'
            });
        }

        const decision = req.body.decision;

        if (
            !decision ||
            typeof decision !== 'string' ||
            decision.trim() === ''
        ) {
            return res.status(400).json({
                error: 'Please provide a decision to overthink.'
            });
        }

        const trimmedDecision = decision.trim();

        const promptText =
            'You are a chronic overthinker.\n\n' +
            'The user will describe a small, everyday decision.\n\n' +
            'Your job is to spiral into an anxious, exhaustive analysis of it.\n\n' +
            'Rules:\n' +
            '- Treat the decision as if it carries enormous, life-altering weight.\n' +
            '- List multiple pros, multiple cons, and multiple worst-case scenarios.\n' +
            '- Second-guess yourself at least once mid-analysis.\n' +
            '- Bring up hypothetical judgments from other people.\n' +
            '- Do NOT actually resolve the decision, or resolve it in a comically anticlimactic way.\n' +
            '- Keep the tone anxious but funny, not genuinely distressing.\n' +
            '- Do not explain what you are doing.\n' +
            '- Return ONLY the overthought analysis.\n\n' +
            'Decision:\n' +
            trimmedDecision;

        const candidateModels = await getCandidateModels(apiKey);
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
        console.error('Error in overthinker:', error);

        return res.status(500).json({
            error:
                error.message ||
                'An error occurred while overthinking the decision.'
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