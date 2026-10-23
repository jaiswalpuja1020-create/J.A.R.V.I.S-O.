// server.js - Standalone Node.js & Express REST Backend for J.A.R.V.I.S.-O

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fallback in-memory storage for standalone mode
const inMemoryConversations = new Map();

// Standalone Chat API Route
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId, provider = 'openrouter' } = req.body;
    const sessionId = req.headers['x-session-id'] || 'default-session';

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Message is required.' },
      });
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return res.status(503).json({
        success: false,
        error: { code: 'UNCONFIGURED', message: 'OPENROUTER_API_KEY is not set.' },
      });
    }

    // Call OpenRouter API with verified free model
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openrouterKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://jarvis-o.stark',
        'X-Title': 'J.A.R.V.I.S.-O',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3.5-lightning:free',
        messages: [
          {
            role: 'system',
            content: 'You are J.A.R.V.I.S.-O, created by Tony Stark. Speak with calm, refined British wit and supreme intelligence.',
          },
          { role: 'user', content: message },
        ],
      }),
    });

    const data = await aiRes.json();
    const reply = data.choices?.[0]?.message?.content || 'Telemetry received, Sir.';

    const convId = conversationId || 'conv-' + Date.now();
    const savedMsg = {
      id: 'msg-' + Date.now(),
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString(),
    };

    return res.json({
      success: true,
      data: {
        conversationId: convId,
        message: savedMsg,
        provider: 'openrouter',
        model: 'nvidia/nemotron-3.5-lightning:free',
      },
      error: null,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OPERATIONAL',
      name: 'J.A.R.V.I.S.-O Standalone Core',
      timestamp: new Date().toISOString(),
      arcReactorOutput: '100% - SYNCHRONIZED',
    },
  });
});

// Serve vanilla.html as primary standalone interface
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vanilla.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[J.A.R.V.I.S.-O Standalone Core running on port ${PORT}]`);
  });
}

module.exports = app;
