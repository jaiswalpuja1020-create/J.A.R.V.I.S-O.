// lib/voice-service.ts - Browser Web Speech API Voice Recognition & Synthesis

export interface SpeechRecognitionResultPayload {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

// Check browser recognition support
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );
}

// Check browser synthesis support
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}

export class JarvisVoiceManager {
  private recognition: any = null;
  private isListening = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  public selectedLanguage = 'auto'; // 'auto', 'en-US', 'hi-IN', 'en-GB'
  public speechRate = 1.05;
  public speechPitch = 0.95;

  private onStateChange?: (state: VoiceState) => void;
  private onTranscriptUpdate?: (payload: SpeechRecognitionResultPayload) => void;
  private onErrorCallback?: (err: string) => void;

  constructor() {
    if (typeof window !== 'undefined' && isSpeechSynthesisSupported()) {
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !isSpeechSynthesisSupported()) return;
    this.voices = window.speechSynthesis.getVoices();
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && typeof window !== 'undefined' && isSpeechSynthesisSupported()) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return this.voices;
  }

  public setCallbacks(
    onState: (state: VoiceState) => void,
    onTranscript: (payload: SpeechRecognitionResultPayload) => void,
    onError: (err: string) => void
  ) {
    this.onStateChange = onState;
    this.onTranscriptUpdate = onTranscript;
    this.onErrorCallback = onError;
  }

  // Start listening via microphone
  public startListening(langOverride?: string): boolean {
    if (typeof window === 'undefined') return false;
    if (!isSpeechRecognitionSupported()) {
      if (this.onErrorCallback) {
        this.onErrorCallback('Speech recognition is not supported in this browser. Please use keyboard input.');
      }
      return false;
    }

    // Stop speaking if currently speaking
    this.stopSpeaking();

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionClass();

      // Configure language
      const targetLang = langOverride || (this.selectedLanguage === 'auto' ? 'en-US' : this.selectedLanguage);
      this.recognition.lang = targetLang;
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStateChange) this.onStateChange('listening');
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const text = finalTranscript || interimTranscript;
        const confidence = event.results[0]?.[0]?.confidence || 0.9;

        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate({
            transcript: text,
            isFinal: Boolean(finalTranscript),
            confidence,
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        let msg = 'Voice recognition error';
        if (event.error === 'not-allowed') {
          msg = 'Microphone access denied. Please grant permission in browser settings.';
        } else if (event.error === 'no-speech') {
          msg = 'No speech detected.';
        }
        if (this.onErrorCallback) this.onErrorCallback(msg);
        if (this.onStateChange) this.onStateChange('idle');
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      this.recognition.start();
      return true;
    } catch (err: unknown) {
      this.isListening = false;
      if (this.onErrorCallback) {
        this.onErrorCallback((err as Error).message || 'Failed to start speech recognition');
      }
      if (this.onStateChange) this.onStateChange('idle');
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.isListening = false;
    }
  }

  // Speak text using browser text-to-speech
  public speak(text: string, onEnd?: () => void) {
    if (typeof window === 'undefined' || !isSpeechSynthesisSupported()) return;

    this.stopSpeaking();

    // Strip markdown tags and code blocks for cleaner speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_~#]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    if (!cleanText) return;

    this.currentUtterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance.rate = this.speechRate;
    this.currentUtterance.pitch = this.speechPitch;

    // Pick best British / Jarvis or native voice
    const voices = this.getAvailableVoices();
    let bestVoice: SpeechSynthesisVoice | null = null;

    // Detect if text contains Hindi characters
    const isHindiText = /[\u0900-\u097F]/.test(cleanText);

    if (isHindiText) {
      bestVoice = voices.find((v) => v.lang.startsWith('hi')) || null;
      this.currentUtterance.lang = 'hi-IN';
    } else {
      // Look for British male / suave voice for true J.A.R.V.I.S. feel
      bestVoice =
        voices.find(
          (v) =>
            v.lang.includes('GB') ||
            v.name.includes('Daniel') ||
            v.name.includes('Oliver') ||
            v.name.includes('UK English Male')
        ) ||
        voices.find((v) => v.lang.startsWith('en') && v.name.includes('Male')) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        null;
    }

    if (bestVoice) {
      this.currentUtterance.voice = bestVoice;
    }

    this.currentUtterance.onstart = () => {
      if (this.onStateChange) this.onStateChange('speaking');
    };

    this.currentUtterance.onend = () => {
      this.currentUtterance = null;
      if (this.onStateChange) this.onStateChange('idle');
      if (onEnd) onEnd();
    };

    this.currentUtterance.onerror = () => {
      this.currentUtterance = null;
      if (this.onStateChange) this.onStateChange('idle');
    };

    window.speechSynthesis.speak(this.currentUtterance);
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
      if (this.onStateChange) this.onStateChange('idle');
    }
  }

  public isCurrentlySpeaking(): boolean {
    if (typeof window === 'undefined' || !isSpeechSynthesisSupported()) return false;
    return window.speechSynthesis.speaking;
  }
}

export const jarvisVoice = new JarvisVoiceManager();
