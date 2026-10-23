// public/js/jarvis-client.js - Pure Vanilla JavaScript Frontend for J.A.R.V.I.S.-O

(function () {
  'use strict';

  // Client State
  const state = {
    sessionId: 'stark-client-' + Math.random().toString(36).substring(2, 9),
    conversationId: null,
    isListening: false,
    selectedProvider: 'openrouter',
    language: 'auto',
    speechSynth: window.speechSynthesis,
    speechRec: null,
    history: [],
  };

  // DOM Elements
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const micBtn = document.getElementById('micBtn');
  const statusStrip = document.getElementById('statusStrip');
  const chatMessages = document.getElementById('chatMessages');
  const timeDisplay = document.getElementById('starkTime');

  // Initialize Clock
  function updateClock() {
    if (timeDisplay) {
      const now = new Date();
      timeDisplay.textContent = now.toTimeString().split(' ')[0] + ' UTC';
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Initialize Speech Recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    state.speechRec = new SpeechRecognition();
    state.speechRec.continuous = false;
    state.speechRec.interimResults = true;
    state.speechRec.lang = 'en-US';

    state.speechRec.onstart = () => {
      state.isListening = true;
      if (micBtn) micBtn.classList.add('recording');
      if (statusStrip) statusStrip.textContent = 'Listening • Speak clearly into comms -------';
    };

    state.speechRec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          chatInput.value = event.results[i][0].transcript;
          sendMessage(event.results[i][0].transcript);
        } else {
          interim += event.results[i][0].transcript;
          chatInput.value = interim;
        }
      }
    };

    state.speechRec.onerror = () => {
      state.isListening = false;
      if (micBtn) micBtn.classList.remove('recording');
      if (statusStrip) statusStrip.textContent = 'Audio Comms Standby • Tap mic to speak';
    };

    state.speechRec.onend = () => {
      state.isListening = false;
      if (micBtn) micBtn.classList.remove('recording');
      if (statusStrip) statusStrip.textContent = 'Ready • Arc Reactor 100% Output';
    };
  }

  // Voice synthesis
  function speakResponse(text) {
    if (!state.speechSynth) return;
    state.speechSynth.cancel();

    // Clean markdown
    const clean = text.replace(/[*#`_~[\]()]/g, ' ').slice(0, 300);
    const utter = new SpeechSynthesisUtterance(clean);
    const voices = state.speechSynth.getVoices();
    const british = voices.find(v => v.lang.includes('en-GB') || v.name.toLowerCase().includes('british') || v.name.toLowerCase().includes('daniel'));
    if (british) utter.voice = british;
    utter.rate = 1.05;
    utter.pitch = 0.95;
    state.speechSynth.speak(utter);
  }

  // Append message to UI
  function appendMessage(role, text, provider) {
    if (!chatMessages) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `p-3 my-2 rounded-lg text-sm ${
      role === 'user'
        ? 'bg-blue-900/40 border border-blue-500/30 text-white ml-auto max-w-[80%]'
        : 'bg-[#06152b]/80 border border-cyan-500/30 text-[#8ae8ff] mr-auto max-w-[85%]'
    }`;

    let meta = role === 'assistant' ? `<div class="text-[10px] text-cyan-400 mb-1 font-mono">J.A.R.V.I.S.-O [${provider || 'CORE'}]</div>` : '';
    msgDiv.innerHTML = `${meta}<div>${escapeHtml(text)}</div>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // Send message
  async function sendMessage(text) {
    const prompt = (text || chatInput.value || '').trim();
    if (!prompt) return;

    appendMessage('user', prompt);
    chatInput.value = '';
    if (statusStrip) statusStrip.textContent = 'J.A.R.V.I.S.-O Processing Tactical Telemetry...';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': state.sessionId,
        },
        body: JSON.stringify({
          message: prompt,
          conversationId: state.conversationId,
          provider: state.selectedProvider,
          enableFallback: true,
          language: state.language,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.message) {
        state.conversationId = data.data.conversationId;
        appendMessage('assistant', data.data.message.content, data.data.provider);
        speakResponse(data.data.message.content);
      } else {
        const err = data.error?.message || 'Signal interference detected.';
        appendMessage('assistant', '⚠️ ' + err, 'FAILSAFE');
      }
    } catch (e) {
      appendMessage('assistant', '⚠️ Connection failed: ' + e.message, 'FAILSAFE');
    } finally {
      if (statusStrip) statusStrip.textContent = 'Ready • Arc Reactor 100% Output';
    }
  }

  // Event Listeners
  if (sendBtn) {
    sendBtn.addEventListener('click', () => sendMessage());
  }

  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (!state.speechRec) {
        alert('Web Speech Recognition not supported in this browser.');
        return;
      }
      if (state.isListening) {
        state.speechRec.stop();
      } else {
        state.speechRec.start();
      }
    });
  }

  // Capsule quick triggers
  document.querySelectorAll('[data-prompt]').forEach((el) => {
    el.addEventListener('click', () => {
      const prompt = el.getAttribute('data-prompt');
      if (prompt) sendMessage(prompt);
    });
  });

  console.log('J.A.R.V.I.S.-O Vanilla Client Core Initialized.');
})();
