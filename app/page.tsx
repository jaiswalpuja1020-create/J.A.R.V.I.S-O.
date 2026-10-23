'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  MessageSquare,
  Search,
  FileText,
  Wrench,
  Settings,
  Plus,
  Upload,
  Clock,
  Mic,
  MicOff,
  Send,
  Paperclip,
  Globe,
  Sliders,
  Menu,
  X,
  MoreVertical,
  Check,
  Copy,
  Volume2,
  VolumeX,
  Code2,
  Plane,
  Calculator,
  ChevronDown,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  ArrowRight,
  Database,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  playHudClick,
  playVoiceListeningChime,
  playConfirmTone,
  playArcReactorPulse,
  playRepulsorBlast,
  playWarningTone,
  setSoundEnabled,
  isSoundEnabled,
} from '@/lib/audio-effects';
import {
  jarvisVoice,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  VoiceState,
} from '@/lib/voice-service';
import { SAFE_TOOLS } from '@/tools/registry';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: string;
  model?: string;
  toolCalls?: Array<{ tool: string; result: any }>;
}

export default function JarvisOCommandCenter() {
  // Navigation & View State
  const [activeNav, setActiveNav] = useState<'home' | 'chat' | 'search' | 'files' | 'tools' | 'settings'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Session & Conversations
  const [sessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('jarvis_session_id');
      if (stored) return stored;
      const created = `stark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('jarvis_session_id', created);
      return created;
    }
    return 'stark-user-session';
  });

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      role: 'assistant',
      content:
        'At your service, Sir. J.A.R.V.I.S.-O neural matrix is online and fully synchronized. How may I assist you today?',
      timestamp: 'ONLINE',
      provider: 'gemini',
      model: 'gemini-3.8-flash',
    },
  ]);

  const [recentConversations, setRecentConversations] = useState([
    {
      id: 'conv-1',
      title: 'AI kya hai?',
      time: 'Today, 10:24 AM',
      type: 'chat',
      prompt: 'AI kya hai aur yeh kaise kaam karta hai?',
    },
    {
      id: 'conv-2',
      title: 'Best laptop under 60k',
      time: 'Today, 9:15 AM',
      type: 'search',
      prompt: 'What are the best gaming and coding laptops under 60,000 INR in 2026?',
    },
    {
      id: 'conv-3',
      title: 'Python code explanation',
      time: 'Yesterday, 6:45 PM',
      type: 'code',
      prompt: 'Explain how async/await and event loops work in Python with examples.',
    },
    {
      id: 'conv-4',
      title: 'Travel plan for Himachal',
      time: 'Yesterday, 4:20 PM',
      type: 'travel',
      prompt: 'Create a 5-day scenic travel itinerary for Himachal Pradesh with budget details.',
    },
    {
      id: 'conv-5',
      title: 'Convert 5 kg to pounds',
      time: 'Yesterday, 2:10 PM',
      type: 'calc',
      prompt: 'convert 5 kg to pounds and show precision metrics',
    },
  ]);

  // Providers & Connection
  const [activeProvider, setActiveProvider] = useState<'gemini' | 'nvidia' | 'llm7' | 'openrouter'>('gemini');
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'auto' | 'hi' | 'en' | 'hinglish'>('auto');
  const [systemConnected, setSystemConnected] = useState(true);
  const [providersStatus, setProvidersStatus] = useState<Record<string, any>>({
    gemini: { configured: true, active: true },
    nvidia: { configured: true, active: true },
    llm7: { configured: true, active: true },
    openrouter: { configured: true, active: true },
  });

  // Voice & Audio
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceSupported] = useState<boolean>(() => isSpeechRecognitionSupported());
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [inputValue, setInputValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals & Drawers
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Tactical Tools local state
  const [calcInput, setCalcInput] = useState('sqrt(144) * 5 + 12^2');
  const [calcResult, setCalcResult] = useState<any>(null);
  const [toolTab, setToolTab] = useState<'calc' | 'convert' | 'notes' | 'tasks'>('calc');
  const [convertVal, setConvertVal] = useState(500);
  const [convertFrom, setConvertFrom] = useState('km');
  const [convertTo, setConvertTo] = useState('miles');
  const [convertResult, setConvertResult] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // Search local state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Files local state
  const [filesList, setFilesList] = useState<any[]>([]);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [fileMatches, setFileMatches] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial load
  useEffect(() => {
    // Configure voice callbacks
    jarvisVoice.setCallbacks(
      (state) => setVoiceState(state),
      (payload) => {
        if (payload.transcript) {
          setInputValue(payload.transcript);
          if (payload.isFinal) {
            handleSendMessage(payload.transcript);
          }
        }
      },
      () => {
        playWarningTone();
      }
    );

    // Initial API checks
    fetchHealth();
    fetchProviders();
    fetchConversations(sessionId);
    fetchNotes(sessionId);
    fetchTasks(sessionId);
    fetchFiles(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (activeNav === 'chat' || messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, voiceState, activeNav]);

  // Hoisted API functions
  async function fetchHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.success) {
        setSystemConnected(true);
      }
    } catch {
      setSystemConnected(false);
    }
  }

  async function fetchProviders() {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      if (data.success && data.data?.providers) {
        const provMap: Record<string, any> = {};
        data.data.providers.forEach((p: any) => {
          provMap[p.id] = { configured: p.configured, active: true, model: p.defaultModel };
        });
        setProvidersStatus(provMap);
        if (data.data.defaultProvider) {
          setActiveProvider(data.data.defaultProvider);
        }
      }
    } catch {
      // Keep default
    }
  }

  async function fetchConversations(sess: string) {
    try {
      const res = await fetch('/api/conversations', {
        headers: { 'x-session-id': sess },
      });
      const data = await res.json();
      if (data.success && data.data?.conversations && data.data.conversations.length > 0) {
        setRecentConversations(
          data.data.conversations.slice(0, 5).map((c: any) => ({
            id: c.id,
            title: c.title,
            time: 'Active Session',
            type: 'chat',
            prompt: c.title,
          }))
        );
      }
    } catch {
      // fallback
    }
  }

  async function fetchNotes(sess: string) {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sess },
        body: JSON.stringify({ message: 'list notes', provider: activeProvider }),
      });
      const data = await res.json();
      if (data.data?.toolInvocations) {
        const noteCall = data.data.toolInvocations.find((t: any) => t.tool === 'notes');
        if (noteCall?.result?.notes) setNotes(noteCall.result.notes);
      }
    } catch {
      // ignore
    }
  }

  async function fetchTasks(sess: string) {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sess },
        body: JSON.stringify({ message: 'list tasks', provider: activeProvider }),
      });
      const data = await res.json();
      if (data.data?.toolInvocations) {
        const taskCall = data.data.toolInvocations.find((t: any) => t.tool === 'tasks');
        if (taskCall?.result?.tasks) setTasks(taskCall.result.tasks);
      }
    } catch {
      // ignore
    }
  }

  async function fetchFiles(sess: string) {
    try {
      const res = await fetch('/api/files/search', {
        headers: { 'x-session-id': sess },
      });
      const data = await res.json();
      if (data.success && data.data?.files) {
        setFilesList(data.data.files);
      }
    } catch {
      // ignore
    }
  }

  // Send message
  async function handleSendMessage(textToSend?: string) {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    playHudClick();
    setInputValue('');
    jarvisVoice.stopSpeaking();

    // Ensure we switch to chat or keep chat visible
    if (activeNav === 'home') {
      setActiveNav('chat');
    }

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setVoiceState('thinking');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          message: text,
          conversationId,
          provider: activeProvider,
          enableFallback: true,
          language: selectedLanguage,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        playConfirmTone();
        if (json.data.conversationId) {
          setConversationId(json.data.conversationId);
        }

        const assistantMsg: Message = {
          id: json.data.message?.id || `ast-${Date.now()}`,
          role: 'assistant',
          content: json.data.message?.content || json.data.text || '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: json.data.provider,
          model: json.data.model,
          toolCalls: json.data.toolInvocations,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setVoiceState('speaking');

        // Speak aloud
        jarvisVoice.speak(assistantMsg.content, () => {
          setVoiceState('idle');
        });

        // Add to recent conversations
        setRecentConversations((prev) => [
          {
            id: `conv-${Date.now()}`,
            title: text.slice(0, 32) + (text.length > 32 ? '...' : ''),
            time: 'Just now',
            type: 'chat',
            prompt: text,
          },
          ...prev.filter((p) => p.title !== text).slice(0, 4),
        ]);
      } else {
        playWarningTone();
        setVoiceState('error');
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ [SYSTEM ALERT]: ${json.error?.message || 'Unable to connect to AI provider core.'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setTimeout(() => setVoiceState('idle'), 3000);
      }
    } catch (err: unknown) {
      playWarningTone();
      setVoiceState('error');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ [COMMUNICATION ERROR]: ${(err as Error).message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setTimeout(() => setVoiceState('idle'), 3000);
    }
  }

  // Voice Interaction
  function toggleListening() {
    if (voiceState === 'listening') {
      jarvisVoice.stopListening();
      setVoiceState('idle');
      playHudClick();
    } else {
      playVoiceListeningChime();
      const langParam = selectedLanguage === 'hi' ? 'hi-IN' : selectedLanguage === 'en' ? 'en-US' : undefined;
      jarvisVoice.startListening(langParam);
    }
  }

  // File Upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    playHudClick();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'x-session-id': sessionId },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        playConfirmTone();
        fetchFiles(sessionId);
        setActiveNav('chat');
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            role: 'assistant',
            content: `📂 **Document Uploaded & Indexed**: \`${file.name}\` (${(file.size / 1024).toFixed(1)} KB) is now ready in the J.A.R.V.I.S.-O neural database. Ask me any question about its contents!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        playWarningTone();
      }
    } catch {
      playWarningTone();
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Web Search Query
  async function handleWebSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    playHudClick();
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (data.success && data.data?.results) {
        setSearchResults(data.data.results);
        playConfirmTone();
      } else {
        setSearchResults([]);
        playWarningTone();
      }
    } catch {
      setSearchResults([]);
      playWarningTone();
    } finally {
      setSearching(false);
    }
  }

  // Start new chat
  function handleNewChat() {
    playArcReactorPulse();
    setConversationId(null);
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: 'New tactical buffer initialized, Sir. J.A.R.V.I.S.-O standing by for instructions.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setActiveNav('chat');
  }

  return (
    <div className="relative min-h-screen bg-[#030712] text-[#e0f2fe] flex flex-col font-sans select-none overflow-x-hidden">
      {/* Background radial glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,163,255,0.15),rgba(255,255,255,0))] pointer-events-none" />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[#050f22]/90 backdrop-blur-md border-b border-[#00f3ff]/20 px-4 lg:px-6 py-2.5 flex items-center justify-between">
        {/* Left: Logo & Tagline */}
        <div className="flex items-center gap-3">
          {/* Reactor Logo */}
          <div className="relative w-9 h-9 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#00f3ff] animate-spin-slow" />
            <div className="w-5 h-5 rounded-full bg-[#00f3ff] shadow-[0_0_15px_#00f3ff] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white shadow-inner" />
            </div>
          </div>

          <div>
            <h1 className="font-orbitron font-extrabold text-base tracking-wider text-white flex items-center gap-1.5">
              J.A.R.V.I.S.<span className="text-[#00f3ff]">-O</span>
            </h1>
            <p className="text-[11px] font-mono text-cyan-300/80 -mt-0.5">
              Your AI Assistant. Always With You.
            </p>
          </div>
        </div>

        {/* Center / Right: Status, Provider, Language & Settings */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono">
          {/* Online status indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#07162c] border border-cyan-500/20 text-cyan-200">
            <span className={`w-2 h-2 rounded-full ${systemConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="underline decoration-cyan-400 font-semibold">{systemConnected ? 'Online' : 'Offline'}</span>
          </div>

          <span className="hidden sm:inline text-cyan-500/40">|</span>

          {/* Provider Selector dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                playHudClick();
                setProviderMenuOpen(!providerMenuOpen);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#07172e] hover:bg-[#0c2447] border border-[#00f3ff]/30 text-cyan-200 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00f3ff]" />
              <span>Provider: <strong className="text-white capitalize">{activeProvider}</strong></span>
              <ChevronDown className="w-3 h-3 text-cyan-400" />
            </button>

            {providerMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-[#061426] border border-[#00f3ff]/40 rounded-lg shadow-2xl py-1 z-50">
                {(['gemini', 'nvidia', 'llm7', 'openrouter'] as const).map((prov) => (
                  <button
                    key={prov}
                    onClick={() => {
                      playConfirmTone();
                      setActiveProvider(prov);
                      setProviderMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#0c2547] ${
                      activeProvider === prov ? 'text-[#00f3ff] font-bold bg-[#0c2547]/60' : 'text-slate-300'
                    }`}
                  >
                    <span className="capitalize">{prov === 'llm7' ? 'LLM7.io' : prov}</span>
                    {activeProvider === prov && <Check className="w-3.5 h-3.5 text-[#00f3ff]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="hidden md:inline text-cyan-500/40">|</span>

          {/* Language selector display */}
          <div className="hidden md:flex items-center gap-1.5 text-cyan-300">
            <Globe className="w-3.5 h-3.5 text-[#00f3ff]" />
            <span>Hindi / English / Hinglish</span>
          </div>

          <span className="hidden lg:inline text-cyan-500/40">|</span>

          {/* Settings icon */}
          <button
            onClick={() => {
              playHudClick();
              setShowSettingsModal(true);
            }}
            className="p-1.5 rounded hover:bg-[#0c2447] text-cyan-300 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-cyan-300" />
          </button>

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded hover:bg-[#0c2447] text-cyan-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* THREE-COLUMN COMMAND-CENTER BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR (Desktop & Tablet Drawer) */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 w-64' : 'hidden lg:flex w-60'
          } flex-col bg-[#050f22]/95 border-r border-[#00f3ff]/20 p-4 space-y-6 backdrop-blur-xl shrink-0 transition-all`}
        >
          {/* Main Navigation */}
          <nav className="space-y-1 font-mono text-xs">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'search', label: 'Web Search', icon: Search },
              { id: 'files', label: 'Files', icon: FileText },
              { id: 'tools', label: 'Tools', icon: Wrench },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    playHudClick();
                    if (item.id === 'settings') {
                      setShowSettingsModal(true);
                    } else {
                      setActiveNav(item.id as any);
                    }
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0080ff] to-[#00f3ff] text-black font-bold shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                      : 'text-cyan-200 hover:text-white hover:bg-[#0c2547]/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-[#00f3ff]'}`} />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Actions Section */}
          <div className="space-y-2 border-t border-[#00f3ff]/15 pt-4">
            <h3 className="text-[11px] font-mono tracking-wider text-cyan-400/70 font-semibold px-2">
              Quick Actions
            </h3>
            <div className="space-y-1.5 font-mono text-xs">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#07172c] hover:bg-[#0c2547] border border-[#00f3ff]/20 hover:border-[#00f3ff]/60 text-cyan-200 transition-all"
              >
                <Plus className="w-4 h-4 text-[#00f3ff]" />
                <span>New Chat</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#07172c] hover:bg-[#0c2547] border border-[#00f3ff]/20 hover:border-[#00f3ff]/60 text-cyan-200 transition-all"
              >
                <Upload className="w-4 h-4 text-[#00f3ff]" />
                <span>Upload File</span>
              </button>

              <button
                onClick={() => {
                  playHudClick();
                  setActiveNav('search');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#07172c] hover:bg-[#0c2547] border border-[#00f3ff]/20 hover:border-[#00f3ff]/60 text-cyan-200 transition-all"
              >
                <Search className="w-4 h-4 text-[#00f3ff]" />
                <span>Search Web</span>
              </button>

              <button
                onClick={() => {
                  playHudClick();
                  setShowHistoryModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#07172c] hover:bg-[#0c2547] border border-[#00f3ff]/20 hover:border-[#00f3ff]/60 text-cyan-200 transition-all"
              >
                <Clock className="w-4 h-4 text-[#00f3ff]" />
                <span>View History</span>
              </button>
            </div>
          </div>

          {/* Bottom Branding Badge */}
          <div className="mt-auto border-t border-[#00f3ff]/15 pt-4 flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-full border border-[#00f3ff]/60 flex items-center justify-center shrink-0">
              <div className="w-3.5 h-3.5 rounded-full bg-[#00f3ff] shadow-[0_0_10px_#00f3ff]" />
            </div>
            <div>
              <div className="font-orbitron font-bold text-xs text-white">J.A.R.V.I.S.-O</div>
              <div className="text-[10px] text-cyan-400/70 font-mono">
                Futuristic • Professional<br />Helpful • Intelligent
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER MAIN ASSISTANT PANEL */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto px-4 lg:px-8 py-5 relative">
          {/* VIEW: HOME DASHBOARD (Exact Match to Screenshot) */}
          {activeNav === 'home' && (
            <div className="flex-1 flex flex-col items-center justify-between max-w-4xl mx-auto w-full space-y-6 pb-4">
              {/* Title Header */}
              <div className="text-center space-y-1">
                <h2 className="font-orbitron font-black text-2xl sm:text-3xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-[#00f3ff] drop-shadow-[0_0_20px_rgba(0,243,255,0.4)]">
                  J.A.R.V.I.S.-O
                </h2>
                <p className="text-xs sm:text-sm font-mono text-cyan-300/80">
                  Your Intelligent AI Assistant
                </p>
              </div>

              {/* CENTRAL HOLOGRAPHIC AI REACTOR WITH 6 CALLOUT ACTIONS */}
              <div className="relative w-full max-w-3xl py-6 flex flex-col sm:flex-row items-center justify-center">
                {/* 3 Callouts on Left (Desktop & Tablet) */}
                <div className="absolute left-2 lg:left-6 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-20 hidden sm:flex">
                  {/* Callout 1: Ask me anything */}
                  <button
                    onClick={() => {
                      playHudClick();
                      setActiveNav('chat');
                    }}
                    className="callout-bubble-left flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#04162e]/95 border border-[#00bfff] hover:border-[#66ddff] text-[#e8f5ff] hover:text-white text-xs font-mono shadow-[0_0_15px_rgba(0,191,255,0.25)] transition-all hover:scale-105 group"
                  >
                    <MessageSquare className="w-4 h-4 text-[#00bfff] group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Ask me anything...</span>
                  </button>

                  {/* Callout 2: Search the web */}
                  <button
                    onClick={() => {
                      playHudClick();
                      setActiveNav('search');
                    }}
                    className="callout-bubble-left flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#04162e]/95 border border-[#00bfff] hover:border-[#66ddff] text-[#e8f5ff] hover:text-white text-xs font-mono shadow-[0_0_15px_rgba(0,191,255,0.25)] transition-all hover:scale-105 group"
                  >
                    <Globe className="w-4 h-4 text-[#00bfff] group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Search the web...</span>
                  </button>

                  {/* Callout 3: Upload a file */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="callout-bubble-left flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#04162e]/95 border border-[#00bfff] hover:border-[#66ddff] text-[#e8f5ff] hover:text-white text-xs font-mono shadow-[0_0_15px_rgba(0,191,255,0.25)] transition-all hover:scale-105 group"
                  >
                    <FileText className="w-4 h-4 text-[#00bfff] group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Upload a file...</span>
                  </button>
                </div>

                {/* Central Multi-ring 3D Holographic Arc Reactor Sphere */}
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 flex items-center justify-center my-4 sm:my-0">
                  {/* Outer Pulsing Ambient Halo */}
                  <div className="absolute inset-0 rounded-full bg-[#00bfff]/20 blur-3xl animate-pulse pointer-events-none" />

                  {/* Horizontal Laser Flare Beam */}
                  <div className="reactor-flare-beam" />

                  {/* SVG Multi-Layered Technical Reactor */}
                  <svg className="w-full h-full drop-shadow-[0_0_20px_rgba(0,191,255,0.35)]" viewBox="0 0 280 280" fill="none">
                    <defs>
                      <radialGradient id="reactorCoreGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                        <stop offset="30%" stopColor="#66ddff" stopOpacity="0.9" />
                        <stop offset="70%" stopColor="#00bfff" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#031326" stopOpacity="0.1" />
                      </radialGradient>
                      <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Outer Calibration Tick Ring */}
                    <circle cx="140" cy="140" r="134" stroke="#00bfff" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 6" className="animate-spin-slow origin-center" />
                    
                    {/* Secondary Precision Ring */}
                    <circle cx="140" cy="140" r="122" stroke="#19cfff" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="18 4 6 4" className="animate-spin-reverse-slow origin-center" />

                    {/* Outer Segmented Border */}
                    <circle cx="140" cy="140" r="110" stroke="#00bfff" strokeOpacity="0.6" strokeWidth="2" strokeDasharray="40 12" className="animate-spin-slow origin-center" />

                    {/* 8 Curved Palladium Mechanical Magnet Coils */}
                    <g className="animate-spin-reverse-slow origin-center">
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => (
                        <g key={idx} transform={`rotate(${angle} 140 140)`}>
                          {/* Coil body block */}
                          <path
                            d="M 124 45 A 95 95 0 0 1 156 45 L 152 70 A 70 70 0 0 0 128 70 Z"
                            fill="#061c35"
                            stroke="#00bfff"
                            strokeWidth="1.5"
                            filter="url(#cyanGlow)"
                          />
                          {/* Inner coil winding line */}
                          <path
                            d="M 130 52 A 88 88 0 0 1 150 52"
                            stroke="#66ddff"
                            strokeWidth="1.5"
                            strokeOpacity="0.8"
                          />
                        </g>
                      ))}
                    </g>

                    {/* Middle Optical Aperture Ring with 8 Lens Holes */}
                    <circle cx="140" cy="140" r="62" stroke="#00bfff" strokeOpacity="0.7" strokeWidth="2" />
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => (
                      <circle
                        key={idx}
                        cx={140 + 62 * Math.cos((angle * Math.PI) / 180)}
                        cy={140 + 62 * Math.sin((angle * Math.PI) / 180)}
                        r="3.5"
                        fill="#00bfff"
                        filter="url(#cyanGlow)"
                      />
                    ))}

                    {/* Inner Palladium Core Housing */}
                    <circle cx="140" cy="140" r="44" stroke="#19cfff" strokeOpacity="0.9" strokeWidth="2.5" />
                    <circle cx="140" cy="140" r="38" stroke="#00bfff" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 2" className="animate-spin-medium origin-center" />

                    {/* Central Luminous Singularity Core */}
                    <circle cx="140" cy="140" r="28" fill="url(#reactorCoreGlow)" filter="url(#cyanGlow)" className="animate-arc-glow origin-center" />
                    <circle cx="140" cy="140" r="10" fill="#ffffff" />
                  </svg>
                </div>

                {/* 3 Callouts on Right (Desktop & Tablet) */}
                <div className="absolute right-2 lg:right-6 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-20 hidden sm:flex">
                  {/* Callout 4: Use my tools */}
                  <button
                    onClick={() => {
                      playHudClick();
                      setActiveNav('tools');
                    }}
                    className="callout-bubble-right flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#04162e]/95 border border-[#00bfff] hover:border-[#66ddff] text-[#e8f5ff] hover:text-white text-xs font-mono shadow-[0_0_15px_rgba(0,191,255,0.25)] transition-all hover:scale-105 group"
                  >
                    <Wrench className="w-4 h-4 text-[#00bfff] group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Use my tools...</span>
                  </button>

                  {/* Callout 5: Switch language */}
                  <button
                    onClick={() => {
                      playHudClick();
                      setLanguageMenuOpen(!languageMenuOpen);
                    }}
                    className="callout-bubble-right flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#04162e]/95 border border-[#00bfff] hover:border-[#66ddff] text-[#e8f5ff] hover:text-white text-xs font-mono shadow-[0_0_15px_rgba(0,191,255,0.25)] transition-all hover:scale-105 group"
                  >
                    <Globe className="w-4 h-4 text-[#00bfff] group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Switch language...</span>
                  </button>

                  {/* Callout 6: Let's get started */}
                  <button
                    onClick={() => {
                      handleSendMessage('Hello J.A.R.V.I.S.-O, initialize system diagnostics and report status.');
                    }}
                    className="callout-bubble-right flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#04162e]/95 border border-[#00bfff] hover:border-[#66ddff] text-[#e8f5ff] hover:text-white text-xs font-mono shadow-[0_0_15px_rgba(0,191,255,0.25)] transition-all hover:scale-105 group"
                  >
                    <Zap className="w-4 h-4 text-[#00bfff] group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Let&apos;s get started...</span>
                  </button>
                </div>

                {/* Mobile Grid for 6 Actions (When on small screens) */}
                <div className="grid grid-cols-2 gap-2 w-full sm:hidden pt-2">
                  <button
                    onClick={() => {
                      playHudClick();
                      setActiveNav('chat');
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#04162e] border border-[#00bfff] text-xs font-mono text-[#e8f5ff]"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#00bfff]" />
                    <span className="truncate">Ask anything...</span>
                  </button>
                  <button
                    onClick={() => {
                      playHudClick();
                      setActiveNav('search');
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#04162e] border border-[#00bfff] text-xs font-mono text-[#e8f5ff]"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#00bfff]" />
                    <span className="truncate">Search web...</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#04162e] border border-[#00bfff] text-xs font-mono text-[#e8f5ff]"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#00bfff]" />
                    <span className="truncate">Upload file...</span>
                  </button>
                  <button
                    onClick={() => {
                      playHudClick();
                      setActiveNav('tools');
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#04162e] border border-[#00bfff] text-xs font-mono text-[#e8f5ff]"
                  >
                    <Wrench className="w-3.5 h-3.5 text-[#00bfff]" />
                    <span className="truncate">Use tools...</span>
                  </button>
                  <button
                    onClick={() => {
                      playHudClick();
                      setLanguageMenuOpen(!languageMenuOpen);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#04162e] border border-[#00bfff] text-xs font-mono text-[#e8f5ff]"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#00bfff]" />
                    <span className="truncate">Language...</span>
                  </button>
                  <button
                    onClick={() => {
                      handleSendMessage('Hello J.A.R.V.I.S.-O, initialize system diagnostics and report status.');
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#04162e] border border-[#00bfff] text-xs font-mono text-[#e8f5ff]"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#00bfff]" />
                    <span className="truncate">Get started...</span>
                  </button>
                </div>
              </div>

              {/* FOUR FEATURE CARDS (Direct Match to Screenshot) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
                {/* Card 1: AI Chat */}
                <div
                  onClick={() => {
                    playHudClick();
                    setActiveNav('chat');
                  }}
                  className="p-4 rounded-xl bg-[#061326]/80 hover:bg-[#091b36] border border-[#00f3ff]/30 hover:border-[#00f3ff] cursor-pointer transition-all shadow-[0_0_15px_rgba(0,243,255,0.08)] group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#07192f] border border-[#00f3ff]/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-4 h-4 text-[#00f3ff]" />
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">AI Chat</h3>
                  <p className="text-xs text-cyan-200/70 leading-relaxed font-mono">
                    Smart conversations with context & memory
                  </p>
                </div>

                {/* Card 2: Web Search */}
                <div
                  onClick={() => {
                    playHudClick();
                    setActiveNav('search');
                  }}
                  className="p-4 rounded-xl bg-[#061326]/80 hover:bg-[#091b36] border border-[#00f3ff]/30 hover:border-[#00f3ff] cursor-pointer transition-all shadow-[0_0_15px_rgba(0,243,255,0.08)] group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#07192f] border border-[#00f3ff]/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Globe className="w-4 h-4 text-[#00f3ff]" />
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">Web Search</h3>
                  <p className="text-xs text-cyan-200/70 leading-relaxed font-mono">
                    Real-time information from the web
                  </p>
                </div>

                {/* Card 3: File Search */}
                <div
                  onClick={() => {
                    playHudClick();
                    setActiveNav('files');
                  }}
                  className="p-4 rounded-xl bg-[#061326]/80 hover:bg-[#091b36] border border-[#00f3ff]/30 hover:border-[#00f3ff] cursor-pointer transition-all shadow-[0_0_15px_rgba(0,243,255,0.08)] group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#07192f] border border-[#00f3ff]/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FileText className="w-4 h-4 text-[#00f3ff]" />
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">File Search</h3>
                  <p className="text-xs text-cyan-200/70 leading-relaxed font-mono">
                    Ask questions from your documents
                  </p>
                </div>

                {/* Card 4: Tools */}
                <div
                  onClick={() => {
                    playHudClick();
                    setActiveNav('tools');
                  }}
                  className="p-4 rounded-xl bg-[#061326]/80 hover:bg-[#091b36] border border-[#00f3ff]/30 hover:border-[#00f3ff] cursor-pointer transition-all shadow-[0_0_15px_rgba(0,243,255,0.08)] group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#07192f] border border-[#00f3ff]/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Wrench className="w-4 h-4 text-[#00f3ff]" />
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">Tools</h3>
                  <p className="text-xs text-cyan-200/70 leading-relaxed font-mono">
                    Calculator, notes, converter & more
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: CONVERSATION STREAM (When in chat or viewing thread) */}
          {activeNav === 'chat' && (
            <div className="flex-1 flex flex-col space-y-4 max-w-4xl mx-auto w-full pb-4">
              <div className="flex items-center justify-between border-b border-[#00f3ff]/20 pb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#00f3ff]" />
                  <h2 className="font-orbitron font-bold text-sm text-white">ACTIVE TELEMETRY STREAM</h2>
                </div>
                <button
                  onClick={() => setActiveNav('home')}
                  className="text-xs font-mono text-cyan-300 hover:text-white flex items-center gap-1"
                >
                  <span>RETURN TO REACTOR</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-mono">
                      {msg.role === 'user' ? (
                        <span className="text-cyan-300 font-semibold">TONY STARK</span>
                      ) : (
                        <span className="text-[#00f3ff] font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> J.A.R.V.I.S.-O
                          {msg.provider && (
                            <span className="text-[10px] text-cyan-400/60 uppercase">
                              • {msg.provider}
                            </span>
                          )}
                        </span>
                      )}
                      <span className="text-slate-500 text-[10px]" suppressHydrationWarning>
                        {msg.timestamp}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] p-3.5 rounded-xl font-mono text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#091f3d] border border-cyan-500/40 text-cyan-100 shadow-[0_0_15px_rgba(0,180,255,0.15)]'
                          : 'bg-[#061426] border border-[#00f3ff]/30 text-white shadow-[0_0_20px_rgba(0,243,255,0.08)]'
                      }`}
                    >
                      <div className="prose prose-invert prose-cyan max-w-none text-sm break-words">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {msg.role === 'assistant' && (
                        <div className="mt-2 pt-2 border-t border-cyan-900/40 flex items-center justify-between text-[11px] text-cyan-400/60">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                playHudClick();
                                jarvisVoice.speak(msg.content);
                              }}
                              className="hover:text-white flex items-center gap-1"
                            >
                              <Volume2 className="w-3 h-3 text-[#00f3ff]" />
                              <span>SPEAK</span>
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                setCopiedId(msg.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              className="hover:text-white flex items-center gap-1"
                            >
                              {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === msg.id ? 'COPIED' : 'COPY'}</span>
                            </button>
                          </div>
                          <span>ENCRYPTED</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* VIEW: WEB SEARCH PANEL */}
          {activeNav === 'search' && (
            <div className="flex-1 flex flex-col space-y-4 max-w-4xl mx-auto w-full pb-4">
              <div className="flex items-center justify-between border-b border-[#00f3ff]/20 pb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#00f3ff]" />
                  <h2 className="font-orbitron font-bold text-sm text-white">EXTERNAL WEB RETRIEVAL (TAVILY / SERPAPI)</h2>
                </div>
                <button onClick={() => setActiveNav('home')} className="text-xs font-mono text-cyan-300 hover:text-white">
                  BACK TO CORE
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter web search query..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleWebSearch()}
                  className="flex-1 bg-[#061426] border border-[#00f3ff]/40 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00f3ff]"
                />
                <button
                  onClick={handleWebSearch}
                  disabled={searching}
                  className="px-5 py-2 rounded-lg bg-[#00f3ff] text-black font-bold font-mono text-xs flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5 text-black" />
                  <span>{searching ? 'SEARCHING...' : 'SEARCH'}</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs">
                {searchResults.length === 0 && !searching && (
                  <div className="p-8 text-center text-cyan-300/60 border border-dashed border-[#00f3ff]/20 rounded-xl">
                    Search for live weather, news, stock telemetry, or real-time web facts.
                  </div>
                )}
                {searchResults.map((r, i) => (
                  <div key={i} className="p-3.5 rounded-lg bg-[#061426] border border-[#00f3ff]/20 space-y-1">
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-cyan-300 font-bold hover:underline block text-sm">
                      {r.title}
                    </a>
                    <p className="text-slate-300 text-xs leading-relaxed">{r.snippet}</p>
                    <span className="text-[10px] text-cyan-500/60 truncate block">{r.url}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: FILE SEARCH & VAULT */}
          {activeNav === 'files' && (
            <div className="flex-1 flex flex-col space-y-4 max-w-4xl mx-auto w-full pb-4">
              <div className="flex items-center justify-between border-b border-[#00f3ff]/20 pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00f3ff]" />
                  <h2 className="font-orbitron font-bold text-sm text-white">NEURAL DOCUMENT VAULT</h2>
                </div>
                <button onClick={() => setActiveNav('home')} className="text-xs font-mono text-cyan-300 hover:text-white">
                  BACK TO CORE
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-[#061426] border border-[#00f3ff]/30">
                <div>
                  <h3 className="font-bold text-white text-sm">Upload & Index Document</h3>
                  <p className="text-xs text-cyan-200/70 font-mono">Supports TXT, MD, JSON, CSV, PDF, DOCX (Max 10MB)</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="px-4 py-2 rounded-lg bg-[#00f3ff] text-black font-bold font-mono text-xs flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploadingFile ? 'INDEXING...' : 'SELECT FILE'}</span>
                </button>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <h3 className="text-cyan-400 font-bold">INDEXED ARCHIVES ({filesList.length})</h3>
                {filesList.length === 0 ? (
                  <p className="text-slate-500 py-4 text-center">No documents indexed in current session memory.</p>
                ) : (
                  filesList.map((f) => (
                    <div key={f.id} className="p-3 rounded-lg bg-[#061426] border border-[#00f3ff]/20 flex items-center justify-between">
                      <div>
                        <span className="text-white font-bold">{f.filename}</span>
                        <div className="text-[10px] text-slate-400">
                          {f.chunksCount} chunks • {(f.sizeBytes / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendMessage(`Analyze the indexed document ${f.filename} and summarize its key insights.`)}
                        className="px-2.5 py-1 rounded bg-[#00f3ff]/20 border border-[#00f3ff] text-[#00f3ff] hover:bg-[#00f3ff]/40"
                      >
                        ANALYZE
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VIEW: TACTICAL TOOLS */}
          {activeNav === 'tools' && (
            <div className="flex-1 flex flex-col space-y-4 max-w-4xl mx-auto w-full pb-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#00f3ff]/20 pb-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#00f3ff]" />
                  <h2 className="font-orbitron font-bold text-sm text-white">DETERMINISTIC TOOLS REGISTRY</h2>
                </div>
                <button onClick={() => setActiveNav('home')} className="text-xs font-mono text-cyan-300 hover:text-white">
                  BACK TO CORE
                </button>
              </div>

              <div className="flex gap-2 p-1 bg-[#061426] rounded border border-[#00f3ff]/20">
                {(['calc', 'convert', 'notes', 'tasks'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      playHudClick();
                      setToolTab(t);
                    }}
                    className={`flex-1 py-1.5 rounded uppercase font-bold transition-all ${
                      toolTab === t ? 'bg-[#00f3ff] text-black' : 'text-cyan-300 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {toolTab === 'calc' && (
                <div className="p-4 rounded-xl bg-[#061426] border border-[#00f3ff]/30 space-y-3">
                  <h3 className="font-bold text-white text-sm">Deterministic Mathematical Evaluator</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={calcInput}
                      onChange={(e) => setCalcInput(e.target.value)}
                      className="flex-1 bg-[#040c17] border border-[#00f3ff]/40 rounded px-3 py-2 text-white"
                    />
                    <button
                      onClick={() => {
                        const res = SAFE_TOOLS.calculator.execute({ expression: calcInput });
                        setCalcResult(res);
                        playConfirmTone();
                      }}
                      className="px-4 py-2 bg-[#00f3ff] text-black font-bold rounded"
                    >
                      EVALUATE
                    </button>
                  </div>
                  {calcResult && (
                    <div className="p-3 bg-[#030912] rounded border border-cyan-500/30 text-white font-orbitron text-lg font-bold">
                      {calcResult.success ? `Result: ${calcResult.formatted}` : `Error: ${calcResult.error}`}
                    </div>
                  )}
                </div>
              )}

              {toolTab === 'convert' && (
                <div className="p-4 rounded-xl bg-[#061426] border border-[#00f3ff]/30 space-y-3">
                  <h3 className="font-bold text-white text-sm">Unit Converter</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={convertVal}
                      onChange={(e) => setConvertVal(Number(e.target.value))}
                      className="bg-[#040c17] border border-[#00f3ff]/40 rounded px-3 py-1.5 text-white"
                    />
                    <input
                      type="text"
                      value={convertFrom}
                      onChange={(e) => setConvertFrom(e.target.value)}
                      placeholder="from (e.g. km)"
                      className="bg-[#040c17] border border-[#00f3ff]/40 rounded px-3 py-1.5 text-white"
                    />
                    <input
                      type="text"
                      value={convertTo}
                      onChange={(e) => setConvertTo(e.target.value)}
                      placeholder="to (e.g. miles)"
                      className="bg-[#040c17] border border-[#00f3ff]/40 rounded px-3 py-1.5 text-white"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const res = SAFE_TOOLS.unitConversion.execute({
                        value: convertVal,
                        from: convertFrom,
                        to: convertTo,
                      });
                      setConvertResult(res);
                      playConfirmTone();
                    }}
                    className="w-full py-2 bg-[#00f3ff] text-black font-bold rounded"
                  >
                    CONVERT
                  </button>
                  {convertResult && (
                    <div className="p-3 bg-[#030912] rounded border border-cyan-500/30 text-white font-orbitron text-base font-bold">
                      {convertResult.success ? `${convertResult.convertedValue} ${convertResult.targetUnit}` : convertResult.error}
                    </div>
                  )}
                </div>
              )}

              {toolTab === 'notes' && (
                <div className="p-4 rounded-xl bg-[#061426] border border-[#00f3ff]/30 space-y-2">
                  <h3 className="font-bold text-white text-sm">Tactical Logbook</h3>
                  <div className="space-y-1.5">
                    {notes.map((n) => (
                      <div key={n.id} className="p-2.5 rounded bg-[#040c17] border border-[#00f3ff]/20">
                        <div className="font-bold text-white">{n.title}</div>
                        <p className="text-cyan-200/80 text-[11px] mt-0.5">{n.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {toolTab === 'tasks' && (
                <div className="p-4 rounded-xl bg-[#061426] border border-[#00f3ff]/30 space-y-2">
                  <h3 className="font-bold text-white text-sm">Defense Directives</h3>
                  <div className="space-y-1.5">
                    {tasks.map((t) => (
                      <div key={t.id} className="p-2 rounded bg-[#040c17] border border-[#00f3ff]/20 flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${t.completed ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span className={`text-xs ${t.completed ? 'line-through text-slate-500' : 'text-white'}`}>{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LARGE ROUNDED CHAT COMPOSER AT BOTTOM (Exact Match to Screenshot) */}
          <div className="w-full max-w-3xl mx-auto pt-3">
            <div className="relative rounded-2xl bg-[#061326]/90 border border-[#00f3ff]/40 p-2 sm:p-2.5 shadow-[0_0_25px_rgba(0,243,255,0.12)]">
              {/* Text Input Row */}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message or use voice..."
                className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-cyan-400/50 focus:outline-none font-mono"
              />

              {/* Bottom Controls Row inside Composer */}
              <div className="flex items-center justify-between mt-1 px-1">
                {/* Left controls: Mic + Equalizer Waves + Auto Language Pill */}
                <div className="flex items-center gap-2">
                  {/* Glowing Blue Circular Mic Button */}
                  <button
                    onClick={toggleListening}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      voiceState === 'listening'
                        ? 'bg-amber-500 text-black shadow-[0_0_20px_#f59e0b] scale-105 animate-pulse'
                        : 'bg-[#0077ff] hover:bg-[#00f3ff] text-white hover:text-black shadow-[0_0_15px_#0080ff]'
                    }`}
                    title={voiceState === 'listening' ? 'Click to stop voice' : 'Push to talk'}
                  >
                    {voiceState === 'listening' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Equalizer Audio Waves */}
                  <div className="flex items-center gap-0.5 h-5 px-1">
                    {[10, 16, 22, 14, 8].map((h, i) => (
                      <span
                        key={i}
                        className="w-0.5 rounded-full bg-[#00f3ff] transition-all duration-150"
                        style={{
                          height:
                            voiceState === 'listening' || voiceState === 'speaking'
                              ? `${Math.max(4, h * (((i % 3) + 1) / 3))}px`
                              : '4px',
                        }}
                      />
                    ))}
                  </div>

                  {/* Language Selector Pill: Auto ▾ */}
                  <button
                    onClick={() => {
                      playHudClick();
                      setSelectedLanguage((prev) =>
                        prev === 'auto' ? 'hi' : prev === 'hi' ? 'en' : prev === 'en' ? 'hinglish' : 'auto'
                      );
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#07192f] hover:bg-[#0c2547] border border-[#00f3ff]/30 text-cyan-200 text-xs font-mono transition-all"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#00f3ff]" />
                    <span className="capitalize">{selectedLanguage}</span>
                    <ChevronDown className="w-3 h-3 text-cyan-400" />
                  </button>
                </div>

                {/* Right controls: Attachment + Blue Glowing Send Button */}
                <div className="flex items-center gap-2">
                  {/* File Attachment Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="p-2 rounded-full hover:bg-[#0c2547] text-cyan-300 hover:text-white transition-colors"
                    title="Attach File"
                  >
                    <Paperclip className="w-4 h-4 text-[#00f3ff]" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".txt,.md,.json,.csv,.pdf,.docx,.log,.js,.py"
                  />

                  {/* Send Button with Paper Airplane */}
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim()}
                    className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#0080ff] to-[#00f3ff] hover:from-[#0099ff] hover:to-white text-black font-bold flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_15px_#00f3ff] transition-all active:scale-95"
                    title="Send"
                  >
                    <Send className="w-4 h-4 text-black fill-current" />
                  </button>
                </div>
              </div>
            </div>

            {/* Listening Indicator below Composer */}
            <div className="flex items-center justify-center gap-2 mt-2 text-xs font-mono text-cyan-300/80">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00f3ff] animate-ping" />
                Listening
              </span>
              <span>•</span>
              <span className="text-slate-400">Click to speak</span>
              <div className="flex items-center gap-1 text-cyan-500/60 font-mono tracking-tighter">
                <span>━━━━━━━</span>
              </div>
            </div>
          </div>

          {/* STATUS FOOTER (Exact Match to Screenshot) */}
          <footer className="mt-auto pt-4 flex items-center justify-center gap-3 text-[11px] font-mono tracking-widest text-cyan-400/80">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#00f3ff]/40" />
            <span>THINK</span>
            <span>•</span>
            <span>SEARCH</span>
            <span>•</span>
            <span>ANALYZE</span>
            <span>•</span>
            <span>ASSIST</span>
            <span>•</span>
            <span className="text-white font-bold">J.A.R.V.I.S.-O</span>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#00f3ff]/40" />
          </footer>
        </main>

        {/* RIGHT SIDEBAR (Exact Match to Screenshot) */}
        <aside className="hidden xl:flex w-72 flex-col bg-[#050f22]/95 border-l border-[#00f3ff]/20 p-4 space-y-4 backdrop-blur-xl shrink-0 overflow-y-auto">
          {/* Card 1: Recent Conversations */}
          <div className="p-3.5 rounded-xl bg-[#061326] border border-[#00f3ff]/30 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Recent Conversations</h3>
              <button
                onClick={() => {
                  playHudClick();
                  setShowHistoryModal(true);
                }}
                className="text-[11px] font-mono text-[#00f3ff] hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              {recentConversations.map((c) => {
                const Icon =
                  c.type === 'search'
                    ? Search
                    : c.type === 'code'
                    ? Code2
                    : c.type === 'travel'
                    ? Plane
                    : c.type === 'calc'
                    ? Calculator
                    : MessageSquare;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      playHudClick();
                      handleSendMessage(c.prompt);
                    }}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#07192f] hover:bg-[#0c2547] border border-cyan-500/10 hover:border-[#00f3ff]/40 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded bg-[#092240] flex items-center justify-center shrink-0 text-[#00f3ff]">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-white truncate group-hover:text-[#00f3ff]">
                          {c.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.time}</div>
                      </div>
                    </div>
                    <MoreVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: System Status */}
          <div className="p-3.5 rounded-xl bg-[#061326] border border-[#00f3ff]/30 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white font-sans">System Status</h3>
              <button
                onClick={() => {
                  playHudClick();
                  setShowStatusModal(true);
                }}
                className="text-[11px] text-[#00f3ff] hover:underline"
              >
                View Details
              </button>
            </div>

            <div className="space-y-1.5">
              {[
                { name: 'Gemini', status: 'Active', color: 'bg-emerald-400' },
                { name: 'NVIDIA', status: 'Active', color: 'bg-emerald-400' },
                { name: 'LLM7.io', status: 'Active', color: 'bg-emerald-400' },
                { name: 'OpenRouter', status: 'Active', color: 'bg-amber-400' },
              ].map((p, idx) => (
                <div key={idx} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${p.color}`} />
                    <span className="text-slate-300">{p.name}</span>
                  </div>
                  <span className="text-emerald-400 font-bold">{p.status}</span>
                </div>
              ))}

              <div className="border-t border-cyan-900/40 my-2 pt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-slate-300">Web Search (Tavily)</span>
                  </div>
                  <span className="text-emerald-400 font-bold">Active</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-slate-300">File Search</span>
                  </div>
                  <span className="text-emerald-400 font-bold">Active</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </span>
                    <span className="text-slate-300">Memory</span>
                  </div>
                  <span className="text-emerald-400 font-bold">Enabled</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Supported Languages */}
          <div className="p-3.5 rounded-xl bg-[#061326] border border-[#00f3ff]/30 space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#00f3ff]" />
              <h3 className="font-bold text-sm text-white font-sans">Supported Languages</h3>
            </div>

            <div className="flex items-center justify-between pt-1">
              {/* Hindi */}
              <button
                onClick={() => {
                  setSelectedLanguage('hi');
                  playConfirmTone();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                  selectedLanguage === 'hi' ? 'bg-[#00f3ff]/20 border-[#00f3ff] text-white font-bold' : 'bg-[#07192f] border-cyan-500/20 text-slate-300'
                }`}
              >
                <span>🇮🇳</span>
                <span>हिन्दी</span>
              </button>

              {/* English */}
              <button
                onClick={() => {
                  setSelectedLanguage('en');
                  playConfirmTone();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                  selectedLanguage === 'en' ? 'bg-[#00f3ff]/20 border-[#00f3ff] text-white font-bold' : 'bg-[#07192f] border-cyan-500/20 text-slate-300'
                }`}
              >
                <span>🇺🇸</span>
                <span>English</span>
              </button>

              {/* Hinglish */}
              <button
                onClick={() => {
                  setSelectedLanguage('hinglish');
                  playConfirmTone();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                  selectedLanguage === 'hinglish' ? 'bg-[#00f3ff]/20 border-[#00f3ff] text-white font-bold' : 'bg-[#07192f] border-cyan-500/20 text-slate-300'
                }`}
              >
                <span>🌐</span>
                <span>Hinglish</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-cyan-400/80 pt-1">
              <div className="w-2.5 h-2.5 rounded-full border border-cyan-400 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-cyan-400" />
              </div>
              <span>Auto-detection enabled</span>
            </div>
          </div>
        </aside>
      </div>

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#050f22] border border-[#00f3ff] rounded-2xl p-5 space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#00f3ff]/30 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#00f3ff]" />
                <h3 className="font-orbitron font-bold text-base text-white">SYSTEM CONFIGURATION</h3>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-cyan-300 font-bold block mb-1">DEFAULT AI PROVIDER</label>
                <select
                  value={activeProvider}
                  onChange={(e) => setActiveProvider(e.target.value as any)}
                  className="w-full bg-[#07192f] border border-[#00f3ff]/40 rounded-lg px-3 py-2 text-white"
                >
                  <option value="gemini">Google Gemini (Default Core)</option>
                  <option value="nvidia">NVIDIA NIM API</option>
                  <option value="llm7">LLM7.io API</option>
                  <option value="openrouter">OpenRouter API</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">HUD SOUND EFFECTS</div>
                  <div className="text-[10px] text-slate-400">Synthesized Web Audio beeps and reactor tones</div>
                </div>
                <input
                  type="checkbox"
                  checked={soundOn}
                  onChange={(e) => {
                    setSoundOn(e.target.checked);
                    setSoundEnabled(e.target.checked);
                  }}
                  className="w-4 h-4 accent-[#00f3ff]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#00f3ff]/20 flex justify-end">
              <button
                onClick={() => {
                  playConfirmTone();
                  setShowSettingsModal(false);
                }}
                className="px-5 py-2 rounded-lg bg-[#00f3ff] text-black font-bold font-orbitron"
              >
                APPLY & CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM STATUS DETAILS MODAL */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#050f22] border border-[#00f3ff] rounded-2xl p-5 space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#00f3ff]/30 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00f3ff]" />
                <h3 className="font-orbitron font-bold text-base text-white">APPROVED PROVIDERS & HEALTH</h3>
              </div>
              <button onClick={() => setShowStatusModal(false)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { id: 'gemini', name: 'Google Gemini', model: 'gemini-3.8-flash', role: 'Default Primary Core' },
                { id: 'nvidia', name: 'NVIDIA NIM API', model: 'meta/llama-3.3-70b-instruct', role: 'Accelerated Tactical Inference' },
                { id: 'llm7', name: 'LLM7.io API', model: 'claude-3-5-sonnet', role: 'High-Speed Proxy Bridge' },
                { id: 'openrouter', name: 'OpenRouter API', model: 'meta-llama/llama-3.3-70b-instruct:free', role: 'Open Weights Gateway' },
              ].map((prov) => (
                <div key={prov.id} className="p-3 rounded-lg bg-[#07192f] border border-[#00f3ff]/20 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{prov.name}</div>
                    <div className="text-[11px] text-cyan-300/80">{prov.role}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Model: {prov.model}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-bold">
                    ACTIVE
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#00f3ff]/20 flex justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-5 py-2 rounded-lg bg-[#00f3ff] text-black font-bold font-orbitron"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#050f22] border border-[#00f3ff] rounded-2xl p-5 space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#00f3ff]/30 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#00f3ff]" />
                <h3 className="font-orbitron font-bold text-base text-white">CONVERSATION ARCHIVES</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {recentConversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    handleSendMessage(c.prompt);
                    setShowHistoryModal(false);
                  }}
                  className="p-3 rounded-lg bg-[#07192f] hover:bg-[#0c2547] border border-[#00f3ff]/20 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-white text-sm">{c.title}</div>
                    <div className="text-[10px] text-slate-400">{c.time}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#00f3ff]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
