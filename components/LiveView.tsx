import React, { useEffect, useRef, useState } from 'react';
import { getLiveClient } from '../services/geminiService';
import { Mic2, Loader2, PhoneOff, Mic, AlertCircle } from 'lucide-react';
import { Modality } from "@google/genai";

const LiveView: React.FC = () => {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  
  // Refs for cleanup
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<any>(null); 
  const nextStartTimeRef = useRef<number>(0);

  // Stop everything on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const connect = async () => {
    disconnect(); // Ensure clean slate
    setStatus('connecting');
    
    try {
        const ai = getLiveClient();
        
        // 1. Setup Output Audio Context
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext({ sampleRate: 24000 });
        audioContextRef.current = ctx;
        nextStartTimeRef.current = 0;

        // 2. Get Input Stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        // 3. Setup Input Audio Context & Processing
        // Use a separate context for input to match the 16kHz requirement usually expected or just for separation
        const inputCtx = new AudioContext({ sampleRate: 16000 });
        inputAudioContextRef.current = inputCtx;
        
        const source = inputCtx.createMediaStreamSource(stream);
        inputSourceRef.current = source;
        
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(inputCtx.destination);

        // 4. Start Gemini Live Session
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    setStatus('connected');
                    setActive(true);
                    
                    // Stream audio data
                    processor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        
                        // Convert Float32 to PCM Int16
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        
                        // Create Base64 string
                        const binary = String.fromCharCode(...new Uint8Array(int16.buffer));
                        const base64 = btoa(binary);

                        sessionPromise.then(session => {
                            session.sendRealtimeInput({
                                media: {
                                    mimeType: 'audio/pcm;rate=16000',
                                    data: base64
                                }
                            });
                        });
                    };
                },
                onmessage: async (msg) => {
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && audioContextRef.current) {
                        const binaryString = atob(audioData);
                        const len = binaryString.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }

                        // Decode raw PCM 24kHz
                        const dataInt16 = new Int16Array(bytes.buffer);
                        // Create buffer (1 channel, length, sampleRate)
                        const buffer = audioContextRef.current.createBuffer(1, dataInt16.length, 24000);
                        const channelData = buffer.getChannelData(0);
                        for(let i=0; i<dataInt16.length; i++) {
                            channelData[i] = dataInt16[i] / 32768.0;
                        }

                        const source = audioContextRef.current.createBufferSource();
                        source.buffer = buffer;
                        source.connect(audioContextRef.current.destination);
                        
                        const currentTime = audioContextRef.current.currentTime;
                        if (nextStartTimeRef.current < currentTime) {
                            nextStartTimeRef.current = currentTime;
                        }
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += buffer.duration;
                    }
                },
                onclose: () => {
                    if (status !== 'idle') {
                         disconnect();
                    }
                },
                onerror: (e) => {
                    console.error("Live API Error:", e);
                    setStatus('error');
                    disconnect();
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                },
                systemInstruction: "Você é o Dr. Cláudio Sityá AI em uma consulta por voz. Seja breve, acolhedor e profissional."
            }
        });

        // Save session reference to close it later
        sessionPromise.then(session => {
            sessionRef.current = session;
        }).catch(err => {
            console.error("Session connection failed:", err);
            setStatus('error');
        });

    } catch (e: any) {
        console.error("Initialization failed", e);
        setStatus('error');
        if (e?.message?.includes('API Key')) {
            window.dispatchEvent(new Event('endo-open-settings'));
            alert("A consulta por voz requer uma chave de API válida. Configurações abertas.");
        }
    }
  };

  const disconnect = () => {
    // 1. Close the Live Session
    if (sessionRef.current) {
        try {
            sessionRef.current.close();
        } catch (e) {
            console.warn("Error closing session:", e);
        }
        sessionRef.current = null;
    }

    // 2. Stop ScriptProcessor (Audio Input Processing)
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    
    // 3. Disconnect Input Source
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }

    // 4. Close Input Context
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }

    // 5. Stop Microphone Stream
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }

    // 6. Close Output Context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    
    setActive(false);
    setStatus('idle');
  };

  return (
    <div className="flex flex-col h-full w-full bg-medical-bg items-center justify-center">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
            <div className="w-24 h-24 bg-medical-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <Mic2 size={40} className={`text-medical-primary ${status === 'connected' ? 'animate-pulse' : ''}`} />
                {status === 'connected' && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
                )}
            </div>
            <h2 className="text-2xl font-bold text-medical-text">Consulta Live</h2>
            <p className="text-medical-muted mt-2">Converse naturalmente com a IA em tempo real.</p>
        </div>

        <div className="flex justify-center">
            {status === 'idle' || status === 'error' ? (
                <button 
                    onClick={connect}
                    className="px-8 py-4 bg-medical-primary text-white rounded-full font-bold shadow-lg hover:bg-medical-primaryDark transition-all flex items-center gap-3"
                >
                    <Mic size={24} /> Iniciar Conversa
                </button>
            ) : status === 'connecting' ? (
                <button disabled className="px-8 py-4 bg-gray-200 text-gray-500 rounded-full font-bold flex items-center gap-3 cursor-wait">
                    <Loader2 className="animate-spin" size={24} /> Conectando...
                </button>
            ) : (
                <button 
                    onClick={disconnect}
                    className="px-8 py-4 bg-red-500 text-white rounded-full font-bold shadow-lg hover:bg-red-600 transition-all flex items-center gap-3"
                >
                    <PhoneOff size={24} /> Encerrar
                </button>
            )}
        </div>

        {status === 'error' && (
            <div className="flex items-center justify-center gap-2 text-red-500 text-sm font-medium mt-4 bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} />
                <p>Serviço indisponível ou Chave de API ausente.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default LiveView;