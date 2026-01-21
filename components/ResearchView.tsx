import React, { useState, useRef, useEffect } from 'react';
import { performMedicalResearch, transcribeAudio, checkUsageLimit, fileToGenerativePart } from '../services/geminiService';
import { ChatMessage, ChatSession, UserProfile } from '../types';
import { Send, Bot, User, ExternalLink, Loader2, Copy, Check, Download, FileText, Sparkles, Plus, Mic, MicOff, Share2, Zap, BrainCircuit, ChevronDown, ChevronUp, Globe, FileDown, CheckCircle2, Lock, ArrowUpRight, Stethoscope, Pill, Dna, FileHeart, ShieldCheck, Microscope, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ResearchViewProps {
  sessionId: string;
  onNewSession: () => void;
}

// Sub-component to handle source verification visual effect
const SourceList: React.FC<{ sources: NonNullable<ChatMessage['sources']> }> = ({ sources }) => {
  const [verifying, setVerifying] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVerifying(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'web';
    }
  };

  return (
    <div className="mt-4 bg-white dark:bg-dark-surface rounded-xl border border-medical-border dark:border-dark-border w-full shadow-soft overflow-hidden animate-fadeInUp">
      <div className="px-4 py-3 bg-medical-bg/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5 tracking-wider">
          <FileText size={12} className="text-medical-primary" /> 
          Fontes Verificadas ({sources.length})
        </p>
        {verifying && (
           <div className="flex items-center gap-1.5 fade-in">
              <Loader2 size={10} className="text-medical-primary animate-spin" />
              <span className="text-[10px] text-gray-400 font-medium">Validando...</span>
           </div>
        )}
      </div>

      <div className={`flex flex-col transition-all duration-700 ${verifying ? 'opacity-50 blur-[0.5px]' : 'opacity-100 blur-0'}`}>
        {sources.map((source, idx) => {
          const isExpanded = expandedIndex === idx;
          const hostname = getHostname(source.uri);

          return (
            <div key={idx} className="border-b border-medical-border/50 dark:border-gray-700 last:border-0">
              <button 
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-medical-bg dark:hover:bg-gray-800 transition-colors text-left group ${isExpanded ? 'bg-medical-bg/80 dark:bg-gray-800/80' : ''}`}
              >
                <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center text-[10px] font-bold rounded transition-colors
                  ${isExpanded ? 'bg-medical-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 group-hover:bg-medical-primary/20 group-hover:text-medical-primary'}`}>
                  {idx + 1}
                </span>

                {!verifying && (
                  <CheckCircle2 
                    size={14} 
                    className="text-medical-accent flex-shrink-0 animate-in zoom-in duration-300" 
                    strokeWidth={2.5}
                  />
                )}
                
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate flex-1">
                  {source.title}
                </span>

                {isExpanded ? (
                  <ChevronUp size={14} className="text-gray-400" />
                ) : (
                  <ChevronDown size={14} className="text-gray-400" />
                )}
              </button>

              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out bg-medical-bg/40 dark:bg-gray-800/40 ${isExpanded ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="p-3 ml-12 mr-4 mb-3 rounded-lg bg-white dark:bg-dark-surface border border-medical-border dark:border-dark-border shadow-sm">
                   <div className="flex items-center gap-2 mb-2 pb-2 border-b border-medical-border/30 dark:border-gray-700">
                      <div className="p-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-300">
                         <Globe size={10} />
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{hostname}</p>
                   </div>

                   <div className="space-y-2">
                       <p className="text-xs text-gray-800 dark:text-gray-200 font-semibold leading-relaxed">
                          {source.title}
                       </p>
                   </div>
                   
                   <div className="mt-3 flex justify-end">
                      <a 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-medical-primary hover:text-white bg-medical-primary/10 hover:bg-medical-primary px-3 py-1.5 rounded-md transition-all group/link"
                      >
                        Ler Artigo Completo 
                        <ArrowUpRight size={10} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                      </a>
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Medical Quotes Collection
const MEDICAL_QUOTES = [
  { text: "A medicina é a arte de curar a incerteza.", author: "Autor Desconhecido" },
  { text: "Onde há amor pela arte da medicina, há também amor pela humanidade.", author: "Hipócrates" },
  { text: "O bom médico trata a doença; o grande médico trata o paciente que tem a doença.", author: "William Osler" },
  { text: "Observe, registre, tabule, comunique. Use seus cinco sentidos.", author: "William Osler" },
  { text: "A ciência da medicina consiste em fazer o paciente se sentir bem enquanto a natureza cura a doença.", author: "Voltaire" },
  { text: "Conhecer todas as teorias, dominar todas as técnicas, mas ao tocar uma alma humana, seja apenas outra alma humana.", author: "Carl Jung" },
  { text: "O diagnóstico é o começo da cura.", author: "Provérbio Médico" },
];

const ResearchView: React.FC<ResearchViewProps> = ({ sessionId, onNewSession }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [quote, setQuote] = useState(MEDICAL_QUOTES[0]);
  
  // Image Upload State
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null); // For Web Speech API

  // Mode state
  const [useThinking, setUseThinking] = useState(false);
  const [useFast, setUseFast] = useState(false);

  // Usage Limits State
  const [limits, setLimits] = useState({ 
    search: { remaining: 0, limit: 0, isCustom: false }, 
    deepThink: { remaining: 0, limit: 0, isCustom: false } 
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const welcomeMessage: ChatMessage = {
    id: 'welcome',
    role: 'model',
    text: 'Olá. Sou a inteligência clínica do Dr. Cláudio Sityá. Para iniciar, você pode descrever um caso, anexar exames, fazer uma pergunta sobre interações medicamentosas ou solicitar diretrizes de tratamento.',
    timestamp: new Date()
  };

  const refreshLimits = () => {
    const s = checkUsageLimit('SEARCH');
    const d = checkUsageLimit('DEEP_THINK');
    setLimits({
      search: { remaining: s.remaining, limit: s.limit, isCustom: s.isCustomKey },
      deepThink: { remaining: d.remaining, limit: d.limit, isCustom: d.isCustomKey }
    });
  };

  const loadProfile = () => {
    const saved = localStorage.getItem('endo_user_profile');
    if (saved) {
      setProfile(JSON.parse(saved));
    }
  };

  useEffect(() => {
    refreshLimits();
    loadProfile();
    // Select random quote
    setQuote(MEDICAL_QUOTES[Math.floor(Math.random() * MEDICAL_QUOTES.length)]);

    window.addEventListener('endo-usage-updated', refreshLimits);
    window.addEventListener('endo-key-updated', refreshLimits); 
    window.addEventListener('endo-profile-updated', loadProfile);
    
    const handleStorage = () => {
      refreshLimits();
      loadProfile();
    };
    window.addEventListener('storage', handleStorage); 
    
    const interval = setInterval(refreshLimits, 2000); 

    return () => {
      window.removeEventListener('endo-usage-updated', refreshLimits);
      window.removeEventListener('endo-key-updated', refreshLimits);
      window.removeEventListener('endo-profile-updated', loadProfile);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const savedMessages = localStorage.getItem(`endo_chat_${sessionId}`);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        const hydrated = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(hydrated);
      } catch (e) {
        console.error("Error loading chat", e);
        setMessages([welcomeMessage]);
      }
    } else {
      setMessages([welcomeMessage]);
    }
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, imagePreviews]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (messages.length === 1 && messages[0].id === 'welcome') return;

    localStorage.setItem(`endo_chat_${sessionId}`, JSON.stringify(messages));

    const indexStr = localStorage.getItem('endo_chat_index');
    let index: ChatSession[] = indexStr ? JSON.parse(indexStr) : [];
    
    const existingSessionIndex = index.findIndex(s => s.id === sessionId);
    
    const firstUserMsg = messages.find(m => m.role === 'user');
    const title = firstUserMsg 
      ? (firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '')) 
      : 'Nova Consulta';

    const lastMsg = messages[messages.length - 1];
    const preview = lastMsg.text.slice(0, 50);

    const sessionData: ChatSession = {
      id: sessionId,
      title,
      lastMessageAt: new Date().toISOString(),
      preview
    };

    if (existingSessionIndex >= 0) {
      index[existingSessionIndex] = sessionData;
    } else {
      index.push(sessionData);
    }

    localStorage.setItem('endo_chat_index', JSON.stringify(index));
    window.dispatchEvent(new Event('endo-history-updated'));

  }, [messages, sessionId]);

  // Image Handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as File[];
      // Validate images
      const validFiles = newFiles.filter(f => f.type.startsWith('image/'));
      
      if (validFiles.length !== newFiles.length) {
          alert('Apenas arquivos de imagem são permitidos neste momento.');
      }

      if (validFiles.length > 0) {
        setSelectedImages(prev => [...prev, ...validFiles]);
        
        // Create previews
        const newPreviews = validFiles.map(f => URL.createObjectURL(f));
        setImagePreviews(prev => [...prev, ...newPreviews]);
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    
    // Revoke URL to prevent leak
    if (imagePreviews[index]) {
        URL.revokeObjectURL(imagePreviews[index]);
    }
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async (text: string, id: string) => {
    const formattedText = `*${profile?.name || 'Dr. Cláudio Sityá AI'} - Insight Clínico*\n\n${text}\n\n_Gerado via EndoAcolhe App_`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Relatório Clínico - EndoAcolhe',
          text: formattedText,
        });
        setSharedId(id);
        setTimeout(() => setSharedId(null), 2000);
      } catch (error) {
        console.log('Share cancelled or failed', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(formattedText);
        setSharedId(id);
        setTimeout(() => setSharedId(null), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  const handleSaveSingleResponse = (text: string, sources: ChatMessage['sources'], id: string) => {
    let content = `${profile?.name ? profile.name : 'Dr. Cláudio Sityá AI'}\n`;
    if (profile?.crm) content += `CRM: ${profile.crm} | ${profile.specialty || ''}\n`;
    if (profile?.clinic) content += `Local: ${profile.clinic}\n`;
    content += `Data: ${new Date().toLocaleString()}\n`;
    content += `----------------------------------------\n\n`;
    content += `RESPOSTA:\n${text}\n\n`;

    if (sources && sources.length > 0) {
      content += `----------------------------------------\n`;
      content += `FONTES VERIFICADAS:\n`;
      sources.forEach((s, i) => {
        content += `${i + 1}. ${s.title}\n   Link: ${s.uri}\n`;
      });
    }

    content += `\n----------------------------------------\n`;
    content += `Gerado via EndoAcolhe App`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EndoAcolhe-Resposta-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSavedId(id);
    setTimeout(() => setSavedId(null), 2000);
  };

  const handleSaveConversation = () => {
    const jsonString = JSON.stringify(messages, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EndoAcolhe-Relatorio-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const startRecording = async () => {
    // Check transcription mode preference
    if (profile?.transcriptionMode === 'browser' && 'webkitSpeechRecognition' in window) {
      // BROWSER NATIVE API
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = (e: any) => {
        console.error("Speech Error", e);
        setIsRecording(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };
      
      recognitionRef.current = recognition;
      recognition.start();

    } else {
      // GEMINI API (Default or if browser doesn't support native)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' }); 
          setIsRecording(false);
          try {
            const text = await transcribeAudio(audioBlob);
            if (text) {
              setQuery((prev) => (prev ? `${prev} ${text}` : text));
            }
          } catch (e) {
            console.error("Transcription failed", e);
            alert("Erro na transcrição de áudio via Gemini.");
          }
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone", err);
        alert("Erro ao acessar microfone.");
      }
    }
  };

  const stopRecording = () => {
    // Native Browser Stop
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      return;
    }
    // Gemini Stop
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    e?.preventDefault();
    const txt = overrideQuery || query;
    if ((!txt.trim() && selectedImages.length === 0) || loading) return;

    if (useThinking) {
      if (!limits.deepThink.isCustom && limits.deepThink.remaining <= 0) {
         window.dispatchEvent(new Event('endo-limit-reached'));
         setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "🔒 **Limite 'Deep Think' Atingido**\n\nSua cota gratuita para raciocínio profundo acabou. Adicione sua chave de API nas configurações para continuar.",
            timestamp: new Date()
         }]);
         return;
      }
    } else {
       if (!limits.search.isCustom && limits.search.remaining <= 0) {
         window.dispatchEvent(new Event('endo-limit-reached'));
         setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "🔒 **Limite Mensal Atingido**\n\nVocê utilizou todas as suas pesquisas gratuitas do plano Standard.\n\nPara continuar utilizando sem limites, insira sua **Chave de API Pessoal** na tela de configurações que acabou de abrir.",
            timestamp: new Date()
         }]);
         return;
      }
    }

    // Prepare images for display in chat
    const displayImages: string[] = [];
    let imageParts: { mimeType: string, data: string }[] = [];

    if (selectedImages.length > 0) {
        try {
            // Convert to base64 for API and for storing in chat history
            imageParts = await Promise.all(selectedImages.map(fileToGenerativePart));
            displayImages.push(...imageParts.map(p => `data:${p.mimeType};base64,${p.data}`));
        } catch (err) {
            console.error("Error processing images", err);
            alert("Erro ao processar imagens.");
            return;
        }
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: txt,
      timestamp: new Date(),
      images: displayImages.length > 0 ? displayImages : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setSelectedImages([]);
    setImagePreviews([]); // Clear previews
    setLoading(true);

    try {
      // Filter history to only include text parts for context (saving tokens)
      // Unless we want full multimodal history, which can get heavy. 
      // Current implementation of performMedicalResearch handles new images in 'options.images'
      const history = messages.filter(m => m.id !== 'welcome').map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const result = await performMedicalResearch(userMsg.text, history, {
        useThinking,
        useFast,
        images: imageParts // Send actual image data to API
      });

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.text,
        sources: result.sources,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
      refreshLimits(); 
    } catch (error: any) {
      if (error?.message?.includes('API Key')) {
         window.dispatchEvent(new Event('endo-open-settings'));
         setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "⚠️ **Configuração Necessária**: Não foi encontrada uma chave de API do sistema (Modo DEMO). A janela de configurações foi aberta automaticamente. Por favor, insira sua chave do Google AI Studio (Gratuita) para continuar.",
            timestamp: new Date()
         }]);
      } else {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: 'Erro de conexão ou erro no modelo. Tente novamente.',
            timestamp: new Date()
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderLimitBadge = (limitObj: typeof limits.search) => {
    if (limitObj.isCustom) return null; 
    const color = limitObj.remaining === 0 ? 'bg-red-50 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    return (
      <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full ${color}`}>
         {limitObj.remaining}
      </span>
    );
  };

  // Determine if we are in the "Empty State" (New Session)
  const isNewSession = messages.length === 1 && messages[0].id === 'welcome';

  return (
    <div className="flex flex-col h-full w-full bg-medical-bg dark:bg-dark-bg transition-colors duration-300 overflow-hidden relative">
      {/* Top Bar - GRADIENT HEADER */}
      <div className="h-20 bg-gradient-to-r from-medical-bordeaux to-medical-primary shadow-md border-b border-white/10 px-8 flex items-center justify-between z-10 transition-colors">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 tracking-tight">
            <div className="p-1.5 bg-white/20 rounded-lg text-white backdrop-blur-sm">
                <Sparkles size={16} strokeWidth={2.5} />
            </div>
            Pesquisa Clínica
          </h2>
          <p className="text-xs text-white/80 mt-0.5 ml-1">Baseada em evidências • PubMed & Diretrizes</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
              onClick={() => { setUseThinking(!useThinking); setUseFast(false); }}
              className={`p-2 rounded-lg transition-all flex items-center gap-1 text-xs font-bold border ${useThinking ? 'bg-white text-medical-primary border-white' : 'text-white/70 border-transparent hover:bg-white/10 hover:text-white'}`}
              title="Modo Pensamento Profundo (Reasoning)"
            >
              <BrainCircuit size={16} />
              <span className="hidden sm:inline">Deep Think</span>
              {renderLimitBadge(limits.deepThink)}
            </button>
            <button 
              onClick={() => { setUseFast(!useFast); setUseThinking(false); }}
              className={`p-2 rounded-lg transition-all flex items-center gap-1 text-xs font-bold border ${useFast ? 'bg-white text-medical-primary border-white' : 'text-white/70 border-transparent hover:bg-white/10 hover:text-white'}`}
              title="Modo Rápido (Flash Lite)"
            >
              <Zap size={16} />
              <span className="hidden sm:inline">Rápido</span>
            </button>
            
            <div className="h-6 w-[1px] bg-white/20 mx-1"></div>

            <button 
                onClick={onNewSession}
                className="md:hidden px-3 py-2 bg-white/10 text-white rounded-xl flex items-center gap-2 text-xs font-bold"
            >
                <Plus size={16} /> Novo
            </button>
            <button 
            onClick={handleSaveConversation}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-medium shadow-sm backdrop-blur-sm border border-white/10"
            title="Exportar Relatório"
            >
            <Download size={16} />
            <span className="hidden sm:inline">PDF</span>
            </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-medical-bg dark:bg-dark-bg">
        <div className="max-w-4xl mx-auto space-y-8 h-full">
          
          {/* Welcome / Empty State */}
          {isNewSession ? (
             <div className="h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 pb-20">
                <div className="text-center space-y-6 max-w-lg">
                    <div className="relative inline-block">
                       <div className="w-24 h-24 bg-white dark:bg-dark-surface rounded-3xl flex items-center justify-center text-medical-primary shadow-soft border border-medical-border dark:border-dark-border mx-auto relative z-10">
                          <Stethoscope size={48} strokeWidth={1.5} />
                       </div>
                    </div>
                    
                    <div>
                      <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
                        Olá, {profile?.name || 'Doutor(a)'}.
                      </h1>
                      <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        Sua inteligência clínica pessoal está pronta.
                      </p>
                    </div>

                    {/* Medical Quote Card */}
                    <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border border-medical-border dark:border-dark-border shadow-sm max-w-md mx-auto relative overflow-hidden group">
                       <div className="absolute top-0 left-0 w-1 h-full bg-medical-primary"></div>
                       <p className="text-sm text-gray-600 dark:text-gray-300 italic font-serif leading-relaxed relative z-10">
                         "{quote.text}"
                       </p>
                       <p className="text-xs text-gray-400 mt-3 font-semibold uppercase tracking-wider text-right">
                         — {quote.author}
                       </p>
                       <div className="absolute -bottom-4 -right-4 text-medical-primary/5 dark:text-white/5 z-0">
                          <Sparkles size={80} />
                       </div>
                    </div>

                    {/* Capability Pills */}
                    <div className="flex flex-wrap justify-center gap-3 pt-4">
                       <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                          <Microscope size={14} /> Pesquisa Baseada em Evidências
                       </div>
                       <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                          <FileHeart size={14} /> Análise Multimodal
                       </div>
                       <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                          <ShieldCheck size={14} /> Dados Seguros
                       </div>
                    </div>
                </div>
             </div>
          ) : (
            messages.map((msg) => (
                <div key={msg.id} className={`flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm
                    ${msg.role === 'model' 
                    ? 'bg-white dark:bg-dark-surface border border-medical-border dark:border-dark-border text-medical-primary' 
                    : 'bg-medical-primary text-white'}`}>
                    {msg.role === 'model' ? <Bot size={20} /> : <User size={20} />}
                </div>
                
                {/* Message Bubble/Card */}
                <div className={`flex flex-col max-w-[90%] md:max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-6 rounded-2xl text-[15px] leading-relaxed relative group/msg transition-colors
                    ${msg.role === 'model'
                        ? 'bg-gradient-to-b from-white to-medical-bg/30 dark:from-gray-800 dark:to-dark-surface text-medical-text dark:text-gray-200 border border-medical-border dark:border-dark-border rounded-tl-none shadow-soft hover:scale-[1.02] animate-fadeInUp'
                        : 'bg-medical-primary text-white rounded-tr-none'
                    }`}>
                    
                    {msg.role === 'model' && (
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-medical-border/30 dark:border-gray-700">
                        <div>
                            <span className="text-[11px] font-bold text-medical-primary uppercase tracking-widest block">Relatório Clínico</span>
                            {profile?.name && <span className="text-[9px] text-gray-400">{profile.name} {profile.crm ? `• ${profile.crm}` : ''}</span>}
                        </div>
                        <button 
                            onClick={() => handleCopy(msg.text, msg.id)}
                            className="text-gray-400 hover:text-medical-primary transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Copiar texto"
                        >
                            {copiedId === msg.id ? <Check size={14} className="text-medical-accent" /> : <Copy size={14} />}
                        </button>
                        </div>
                    )}
                    
                    {/* Render Uploaded Images in User Bubble */}
                    {msg.images && msg.images.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                            {msg.images.map((img, idx) => (
                                <img 
                                    key={idx} 
                                    src={img} 
                                    alt="User upload" 
                                    className="w-32 h-32 object-cover rounded-lg border border-white/20 bg-black/10" 
                                />
                            ))}
                        </div>
                    )}

                    <ReactMarkdown 
                        components={{
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 my-3 space-y-2 marker:text-medical-primary/50" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-3 space-y-2 marker:font-bold marker:text-medical-text dark:marker:text-gray-300" {...props} />,
                        strong: ({node, ...props}) => <span className={`font-semibold ${msg.role === 'model' ? 'text-medical-primary dark:text-medical-secondary' : 'text-white'}`} {...props} />,
                        h3: ({node, ...props}) => <h3 className="font-semibold text-lg mt-5 mb-3 text-medical-text dark:text-gray-100" {...props} />,
                        p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />
                        }}
                    >
                        {msg.text}
                    </ReactMarkdown>
                    </div>

                    {/* Sources for AI messages */}
                    {msg.sources && msg.sources.length > 0 && (
                    <SourceList sources={msg.sources} />
                    )}
                    
                    {/* Message Actions */}
                    <div className="flex items-center justify-end mt-2 px-1 w-full opacity-100 transition-opacity">
                    <span className="text-[10px] text-gray-400 font-medium mr-auto">
                        {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    
                    {msg.role === 'model' && (
                        <div className="flex gap-2">
                        <button 
                            onClick={() => handleCopy(msg.text, msg.id)}
                            className={`flex items-center gap-1 text-[11px] transition-all duration-200 active:scale-95 px-3 py-1.5 rounded-full shadow-sm border 
                            ${copiedId === msg.id 
                              ? 'scale-105 bg-medical-secondary/20 dark:bg-green-900/20 text-medical-primary border-medical-primary/30 font-medium' 
                              : 'bg-white dark:bg-dark-surface text-gray-500 dark:text-gray-400 hover:text-medical-primary dark:hover:text-green-400 border-gray-200 dark:border-gray-700'}`}
                            title="Copiar texto"
                        >
                            {copiedId === msg.id ? (
                            <>
                                <Check size={12} className="text-medical-primary" />
                                <span>Copiado</span>
                            </>
                            ) : (
                            <>
                                <Copy size={12} />
                                <span>Copiar</span>
                            </>
                            )}
                        </button>

                        <button 
                            onClick={() => handleShare(msg.text, msg.id)}
                            className={`flex items-center gap-1 text-[11px] transition-all duration-200 active:scale-95 px-3 py-1.5 rounded-full shadow-sm border
                            ${sharedId === msg.id 
                              ? 'scale-105 bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-200 font-medium' 
                              : 'bg-white dark:bg-dark-surface text-gray-500 dark:text-gray-400 hover:text-medical-primary dark:hover:text-green-400 border-gray-200 dark:border-gray-700'}`}
                        >
                            {sharedId === msg.id ? (
                            <>
                                <Check size={12} className="text-blue-500" />
                                <span>Enviado</span>
                            </>
                            ) : (
                            <>
                                <Share2 size={12} />
                                <span>Compartilhar</span>
                            </>
                            )}
                        </button>

                        <button 
                            onClick={() => handleSaveSingleResponse(msg.text, msg.sources, msg.id)}
                            className={`flex items-center gap-1 text-[11px] transition-all duration-200 active:scale-95 px-3 py-1.5 rounded-full shadow-sm border
                            ${savedId === msg.id 
                              ? 'scale-105 bg-purple-50 dark:bg-purple-900/20 text-purple-600 border-purple-200 font-medium' 
                              : 'bg-white dark:bg-dark-surface text-gray-500 dark:text-gray-400 hover:text-medical-primary dark:hover:text-green-400 border-gray-200 dark:border-gray-700'}`}
                            title="Salvar Resposta (TXT)"
                        >
                            {savedId === msg.id ? (
                            <>
                                <Check size={12} className="text-purple-500" />
                                <span>Salvo</span>
                            </>
                            ) : (
                            <>
                                <Download size={12} />
                                <span>Salvar</span>
                            </>
                            )}
                        </button>
                        </div>
                    )}
                    </div>
                </div>
                </div>
            ))
            }
          
          {loading && (
            <div className="flex gap-4 max-w-4xl mx-auto">
               <div className="w-10 h-10 rounded-xl bg-white dark:bg-dark-surface border border-medical-border dark:border-dark-border text-medical-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot size={20} />
              </div>
              <div className="flex items-center gap-3 bg-white dark:bg-dark-surface px-5 py-4 rounded-2xl border border-medical-border dark:border-dark-border shadow-soft">
                <Loader2 className="animate-spin text-medical-primary" size={18} />
                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {useThinking ? "Pensando profundamente (Reasoning)..." : "Consultando bases de dados..."}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-medical-surface dark:bg-dark-surface border-t border-medical-border dark:border-dark-border z-20 transition-colors">
        
        {/* Image Preview Area */}
        {imagePreviews.length > 0 && (
            <div className="max-w-4xl mx-auto flex gap-3 mb-3 overflow-x-auto pb-2 scrollbar-hide px-1">
                {imagePreviews.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl border border-medical-border overflow-hidden flex-shrink-0 shadow-sm animate-in zoom-in-50 duration-200 group">
                        <img src={url} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 transition-colors backdrop-blur-sm"
                            title="Remover imagem"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>
        )}

        <form onSubmit={handleSearch} className="max-w-4xl mx-auto relative flex gap-4">
          <div className="relative flex-1">
             {/* File Input */}
             <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*" 
                multiple 
                onChange={handleFileSelect}
             />

             <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite sua dúvida ou anexe exames..."
              className="w-full pl-14 pr-14 py-4 bg-medical-bg dark:bg-gray-800 border border-medical-border dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-primary/20 focus:border-medical-primary text-medical-text dark:text-white placeholder-gray-400 transition-all font-medium"
            />
            
            {/* Attachment Button */}
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-medical-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Anexar Imagem/Exame"
            >
                <Paperclip size={20} />
            </button>

            {/* Mic Button */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-200 ${
                isRecording 
                  ? 'bg-red-50 text-red-500 hover:bg-red-100 ring-2 ring-red-500/30 animate-pulse' 
                  : 'text-gray-400 hover:text-medical-primary hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={profile?.transcriptionMode === 'browser' ? "Gravar (Navegador)" : "Gravar (Gemini AI)"}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>
          
          <button
            type="submit"
            disabled={loading || (!query.trim() && selectedImages.length === 0)}
            className={`px-8 py-4 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-semibold flex items-center gap-2
              ${useThinking ? 'bg-purple-600 hover:bg-purple-700' : 'bg-medical-primary hover:bg-medical-primaryDark'}`}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
               useThinking && !limits.deepThink.isCustom && limits.deepThink.remaining <= 0 
               ? <Lock size={20} /> 
               : <Send size={20} />
            )}
            <span className="hidden md:inline">{useThinking ? 'Pensar' : 'Analisar'}</span>
          </button>
        </form>
        <div className="max-w-4xl mx-auto mt-3 flex justify-between items-center">
            <p className="text-[10px] text-gray-400">Dr. Cláudio Sityá AI - Ferramenta de auxílio à decisão clínica.</p>
             {/* Simple Credits Footer */}
             {!limits.search.isCustom && (
                <div className="flex gap-3">
                   <span className="text-[10px] font-medium text-gray-400">
                      Pesquisa: <span className={limits.search.remaining === 0 ? 'text-red-500' : ''}>{limits.search.remaining}/{limits.search.limit}</span>
                   </span>
                </div>
             )}
        </div>
      </div>
    </div>
  );
};

export default ResearchView;