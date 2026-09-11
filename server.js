import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables from .env or function.env
if (fs.existsSync('.env')) {
dotenv.config({ path: '.env' });
}

if (fs.existsSync('function.env')) {
dotenv.config({ path: 'function.env' });
}

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(__dirname));

// ============================================================
// EXCUSE GENERATOR
// ============================================================

app.post('/api/generate-excuse', async (req, res) => {
try {
const apiKey = (process.env.GEMINI_API_KEY || '').trim();

```
// Error handling: Missing or empty GEMINI_API_KEY
if (!apiKey) {
  return res.status(400).json({
    error:
      'GEMINI_API_KEY is missing or empty in your environment file. Please set GEMINI_API_KEY in .env or function.env!'
  });
}

const situation = req.body.situation || req.body.prompt;

// Error handling: Missing or empty situation
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

// Prompt for excuse generation
const promptText = `You are an excuse generator.
```

The user will describe a situation where they need an excuse.

Generate ONE excuse that is directly related to the situation provided by the user.

Rules:

* Understand what happened in the user's situation.
* Generate an excuse that specifically addresses that situation.
* Do not introduce a completely unrelated event.
* Make the excuse natural and conversational.
* Keep it reasonably believable.
* Keep it concise.
* Do not explain your reasoning.
* Return only the excuse.

User's situation:
${trimmedSituation}`;

```
// Currently supported Gemini model candidates
const candidateModels = [
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest'
];

let responseText = null;
let lastError = null;

// Try each model until one works
for (const modelName of candidateModels) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
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
      data.candidates?.[0]?.content?.parts?.[0]?.text
    ) {
      responseText =
        data.candidates[0].content.parts[0].text;

      break;
    } else {
      lastError =
        data.error?.message ||
        `HTTP ${response.status} for ${modelName}`;
    }

  } catch (err) {
    lastError = err.message;
  }
}

// Error handling: Unexpected AI response / API error
if (!responseText || responseText.trim() === '') {
  return res.status(500).json({
    error:
      lastError ||
      'Received an empty or invalid response from the Gemini API.'
  });
}

// Return exact response format
res.json({
  excuse: responseText.trim()
});
```

} catch (error) {
console.error(
'Error in /api/generate-excuse:',
error
);

```
res.status(500).json({
  error:
    error.message ||
    'An error occurred while generating the excuse using Gemini API.'
});
```

}
});

// ============================================================
// TEXT DEHUMANISER
// ============================================================

app.post('/api/dehumanise', async (req, res) => {
try {
const apiKey = (process.env.GEMINI_API_KEY || '').trim();

```
// Error handling: Missing or empty GEMINI_API_KEY
if (!apiKey) {
  return res.status(400).json({
    error:
      'GEMINI_API_KEY is missing or empty in your environment file.'
  });
}

const text = req.body.text;

// Error handling: Missing or empty text
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

// Prompt for text dehumanisation
const promptText = `You are a text dehumaniser.
```

Rewrite the user's text so that it sounds extremely cold, robotic,
bureaucratic, emotionally detached, and impersonal.

Rules:

* Preserve the original meaning.
* Do not add completely new information.
* Remove emotional and personal language where possible.
* Use formal, sterile, bureaucratic wording.
* Make the result sound like it was written by an automated administrative system.
* Keep the rewritten text concise.
* Do not explain what you changed.
* Return ONLY the rewritten text.

User's text:
${trimmedText}`;

```
// Use the same Gemini model fallback system
const candidateModels = [
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest'
];

let responseText = null;
let lastError = null;

// Try each model until one works
for (const modelName of candidateModels) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
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
      data.candidates?.[0]?.content?.parts?.[0]?.text
    ) {
      responseText =
        data.candidates[0].content.parts[0].text;

      break;
    } else {
      lastError =
        data.error?.message ||
        `HTTP ${response.status} for ${modelName}`;
    }

  } catch (err) {
    lastError = err.message;
  }
}

// Error handling: Unexpected AI response / API error
if (!responseText || responseText.trim() === '') {
  return res.status(500).json({
    error:
      lastError ||
      'Received an empty or invalid response from the Gemini API.'
  });
}

// Return the dehumanised text
res.json({
  result: responseText.trim()
});
```

} catch (error) {
console.error(
'Error in /api/dehumanise:',
error
);

```
res.status(500).json({
  error:
    error.message ||
    'An error occurred while dehumanising the text using Gemini API.'
});
```

}
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
console.log(
`🚀 UselessSuite server running at http://localhost:${PORT}`
);
});
