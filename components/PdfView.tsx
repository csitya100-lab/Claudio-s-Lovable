import React, { useState, useEffect, useRef } from 'react';
import { analyzeMedicalPdf, generateInfographicData, generatePresentationSlides, chatWithPdf, checkUsageLimit } from '../services/geminiService';
import { InfographicData, PresentationData } from '../types';
import { Upload, FileText, Loader2, Sparkles, X, Copy, Check, BookOpen, ImageIcon, Download, Lock, MessageSquare, Presentation, ListChecks, ArrowLeft, Send, BarChart3, PieChart, FileType } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import PptxGenJS from 'pptxgenjs';

type Tab = 'summary' | 'infographic' | 'slides' | 'chat';

const PdfView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  
  // Extraction Options
  const [extractionOptions, setExtractionOptions] = useState<string[]>(['Objetivos', 'Conclusão']);
  const allOptions = ['Objetivos', 'Metodologia', 'P-valor', 'Conclusão', 'Resultados principais', 'Limitações'];

  // Results State
  const [summary, setSummary] = useState<string | null>(null);
  const [infographicData, setInfographicData] = useState<InfographicData | null>(null);
  const [slidesData, setSlidesData] = useState<PresentationData | null>(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  // Loading States
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingInfographic, setLoadingInfographic] = useState(false);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert("Por favor, selecione apenas arquivos PDF.");
        return;
      }
      setSelectedFile(file);
      setSummary(null);
      setInfographicData(null);
      setSlidesData(null);
      setChatMessages([]);
      setActiveTab('summary');
    }
  };

  const toggleOption = (option: string) => {
    setExtractionOptions(prev => 
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const handleGenerateSummary = async () => {
    if (!selectedFile) return;
    setLoadingSummary(true);
    try {
      const result = await analyzeMedicalPdf(selectedFile, extractionOptions);
      setSummary(result || "Não foi possível analisar o PDF.");
    } catch (error: any) {
        if (error?.message?.includes('API Key')) {
            window.dispatchEvent(new Event('endo-open-settings'));
        }
        setSummary("Erro ao gerar resumo.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGenerateInfographic = async () => {
    if (!selectedFile) return;
    setLoadingInfographic(true);
    try {
      const data = await generateInfographicData(selectedFile);
      setInfographicData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingInfographic(false);
    }
  };

  const handleGenerateSlides = async () => {
    if (!selectedFile) return;
    
    // Check usage limits for DEEP_THINK (Slides are expensive)
    const limit = checkUsageLimit('DEEP_THINK');
    if (!limit.isCustomKey && limit.remaining <= 0) {
        alert("Limite de geração de apresentações atingido. Adicione sua chave (BYOK) para continuar.");
        return;
    }

    setLoadingSlides(true);
    try {
      const data = await generatePresentationSlides(selectedFile);
      setSlidesData(data);
    } catch (error: any) {
      if (error?.message?.includes('API Key')) {
         window.dispatchEvent(new Event('endo-open-settings'));
      }
      console.error(error);
    } finally {
      setLoadingSlides(false);
    }
  };

  const downloadPptx = () => {
    if (!slidesData) return;

    try {
        const pres = new PptxGenJS();
        
        // Metadata
        pres.title = slidesData.presentationTitle;
        pres.subject = "Gerado por Dr. Cláudio Sityá AI";

        // Title Slide
        let slide = pres.addSlide();
        slide.background = { color: "FDF2F8" }; // Medical Secondary
        slide.addText(slidesData.presentationTitle, {
            x: 0.5, y: '40%', w: '90%', h: 1,
            fontSize: 32, bold: true, color: "831843", align: "center"
        });
        slide.addText("Dr. Cláudio Sityá AI", {
            x: 0.5, y: '55%', w: '90%', h: 0.5,
            fontSize: 14, color: "ED64A6", align: "center"
        });

        // Content Slides
        slidesData.slides.forEach((s) => {
            slide = pres.addSlide();
            
            // Slide Title
            slide.addText(s.title, {
                x: 0.5, y: 0.3, w: '90%', h: 0.6,
                fontSize: 24, bold: true, color: "00897B", fontFace: "Arial"
            });

            // Bullet Points
            slide.addText(s.bulletPoints.map(bp => ({ text: bp, options: { breakLine: true } })), {
                x: 0.5, y: 1.2, w: '90%', h: '70%',
                fontSize: 16, color: "363636", bullet: true, lineSpacing: 28
            });

            // Notes
            if (s.speakerNotes) {
                slide.addNotes(s.speakerNotes);
            }
        });

        pres.writeFile({ fileName: `Apresentacao-${Date.now()}.pptx` });

    } catch (e) {
        console.error("Error creating PPTX", e);
        alert("Erro ao criar arquivo PowerPoint.");
    }
  };

  const handleChatSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedFile || !chatInput.trim() || loadingChat) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setLoadingChat(true);

    try {
        const history = chatMessages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));
        const response = await chatWithPdf(selectedFile, userMsg, history);
        setChatMessages(prev => [...prev, { role: 'model', text: response || "Sem resposta." }]);
    } catch (error) {
        console.error(error);
        setChatMessages(prev => [...prev, { role: 'model', text: "Erro ao processar mensagem." }]);
    } finally {
        setLoadingChat(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-medical-bg overflow-hidden">
       {/* Header */}
       <div className="bg-white border-b border-medical-border px-8 py-4 flex items-center gap-4 shadow-sm z-10">
          <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-medical-primary transition-colors">
              <ArrowLeft size={20} />
          </button>
          <div>
              <h2 className="text-lg font-bold text-medical-bordeaux flex items-center gap-2">
                 <FileText className="text-medical-primary" size={20} />
                 Material Científico
              </h2>
              <p className="text-xs text-gray-500">Resumo inteligente de Artigos, Papers e Diretrizes</p>
          </div>
       </div>

       <div className="flex-1 overflow-hidden flex">
          {/* Main Content */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
             
             {!selectedFile ? (
                // Upload State
                <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
                    <div className="w-full max-w-lg bg-white p-10 rounded-3xl shadow-soft border border-medical-border text-center">
                        <div className="w-20 h-20 bg-medical-secondary rounded-full flex items-center justify-center mx-auto mb-6 text-medical-primary">
                            <BookOpen size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Upload de Artigo Científico</h3>
                        <p className="text-gray-500 text-sm mb-8">Arraste seu PDF ou clique para selecionar. A IA extrairá insights clínicos automaticamente.</p>
                        
                        <label className="block w-full cursor-pointer group">
                             <div className="w-full py-4 bg-medical-primary text-white rounded-xl font-bold shadow-md group-hover:bg-medical-primaryDark transition-all flex items-center justify-center gap-2">
                                <Upload size={20} /> Selecionar PDF
                             </div>
                             <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                        </label>
                    </div>
                </div>
             ) : (
                // Workspace State
                <div className="flex-1 flex flex-col h-full bg-gray-50/50">
                    {/* File Header */}
                    <div className="px-8 py-6 pb-0">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-medical-border flex items-start justify-between">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FileType size={28} />
                                </div>
                                <div>
                                    <h1 className="font-bold text-gray-800 text-lg leading-tight line-clamp-1" title={selectedFile.name}>
                                        {selectedFile.name.replace('.pdf', '')}
                                    </h1>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-xs text-gray-400 font-mono">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                        <div className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                            <Check size={12} /> Pronto para análise
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500 p-2">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="px-8 mt-6">
                        <div className="flex gap-1 bg-white p-1 rounded-xl border border-medical-border shadow-sm w-fit">
                            {[
                                { id: 'summary', label: 'Resumo', icon: ListChecks },
                                { id: 'infographic', label: 'Infográfico', icon: PieChart },
                                { id: 'slides', label: 'Slides', icon: Presentation },
                                { id: 'chat', label: 'Chat', icon: MessageSquare },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as Tab)}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all
                                    ${activeTab === tab.id 
                                        ? 'bg-medical-secondary text-medical-primary shadow-sm' 
                                        : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <tab.icon size={16} /> {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 p-8 overflow-hidden min-h-0">
                        <div className="bg-white rounded-2xl border border-medical-border shadow-soft h-full flex flex-col overflow-hidden relative">
                            
                            {/* TAB: SUMMARY */}
                            {activeTab === 'summary' && (
                                <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-8">
                                    {!summary ? (
                                        <div className="h-full flex flex-col">
                                            <h4 className="text-sm font-bold text-gray-700 mb-4">O que você deseja extrair?</h4>
                                            <div className="grid grid-cols-2 gap-3 mb-8">
                                                {allOptions.map(opt => (
                                                    <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${extractionOptions.includes(opt) ? 'border-medical-primary bg-medical-secondary/30' : 'border-gray-200 hover:bg-gray-50'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={extractionOptions.includes(opt)}
                                                            onChange={() => toggleOption(opt)}
                                                            className="w-4 h-4 text-medical-primary rounded border-gray-300 focus:ring-medical-primary"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            
                                            <button 
                                                onClick={handleGenerateSummary}
                                                disabled={loadingSummary}
                                                className="w-full py-4 bg-medical-bordeaux text-white rounded-xl font-bold hover:bg-medical-bordeauxMedium transition-all flex items-center justify-center gap-2 shadow-md"
                                            >
                                                {loadingSummary ? <Loader2 className="animate-spin" /> : <BookOpen size={20} />}
                                                Gerar Resumo Estruturado
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="prose prose-slate max-w-none">
                                            <ReactMarkdown>{summary}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB: INFOGRAPHIC */}
                            {activeTab === 'infographic' && (
                                <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-8">
                                    {!infographicData ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center">
                                            <BarChart3 size={48} className="text-gray-300 mb-4" />
                                            <h3 className="text-lg font-bold text-gray-700">Visualizar Dados</h3>
                                            <p className="text-gray-500 text-sm mb-6 max-w-xs">Transforme os dados do artigo em um painel visual estruturado.</p>
                                            <button 
                                                onClick={handleGenerateInfographic}
                                                disabled={loadingInfographic}
                                                className="px-6 py-3 bg-medical-accent text-white rounded-xl font-bold flex items-center gap-2 shadow-md"
                                            >
                                                {loadingInfographic ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                                Extrair Dados Visuais
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="bg-medical-bordeaux text-white p-6 rounded-2xl shadow-md">
                                                <h2 className="text-2xl font-bold leading-tight">{infographicData.title}</h2>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {infographicData.statistics.map((stat, idx) => (
                                                    <div key={idx} className="bg-gray-50 p-5 rounded-xl border border-gray-100 text-center">
                                                        <p className="text-3xl font-black text-medical-primary mb-1">{stat.value}</p>
                                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{stat.label}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="bg-white p-6 rounded-2xl border border-medical-border shadow-sm">
                                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Pontos Chave</h4>
                                                <ul className="space-y-3">
                                                    {infographicData.keyPoints.map((point, idx) => (
                                                        <li key={idx} className="flex gap-3 text-gray-700">
                                                            <div className="w-6 h-6 rounded-full bg-medical-secondary text-medical-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                                                {idx + 1}
                                                            </div>
                                                            <span className="text-sm font-medium">{point}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 text-blue-800 text-sm font-medium">
                                                💡 {infographicData.conclusion}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB: SLIDES */}
                            {activeTab === 'slides' && (
                                <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-8">
                                     {!slidesData ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center">
                                            <Presentation size={48} className="text-gray-300 mb-4" />
                                            <h3 className="text-lg font-bold text-gray-700">Criar Apresentação</h3>
                                            <p className="text-gray-500 text-sm mb-6 max-w-xs">Gere esboços de slides prontos para usar em reuniões clínicas. (Consome cota de Deep Think)</p>
                                            <button 
                                                onClick={handleGenerateSlides}
                                                disabled={loadingSlides}
                                                className="px-6 py-3 bg-medical-primary text-white rounded-xl font-bold flex items-center gap-2 shadow-md"
                                            >
                                                {loadingSlides ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                                Gerar Slides
                                            </button>
                                        </div>
                                     ) : (
                                        <div className="h-full flex flex-col">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-lg font-bold text-medical-bordeaux">
                                                    {slidesData.presentationTitle || "Apresentação Gerada"}
                                                </h3>
                                                <button 
                                                    onClick={downloadPptx}
                                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-colors"
                                                >
                                                    <Download size={16} /> Baixar .PPTX
                                                </button>
                                            </div>
                                            
                                            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                                                {slidesData.slides.map((slide, idx) => (
                                                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
                                                            <span className="bg-medical-secondary text-medical-primary w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm">
                                                                {idx + 1}
                                                            </span>
                                                            <h4 className="font-bold text-gray-800">{slide.title}</h4>
                                                        </div>
                                                        <ul className="list-disc pl-5 space-y-2 mb-4">
                                                            {slide.bulletPoints.map((bp, i) => (
                                                                <li key={i} className="text-sm text-gray-600">{bp}</li>
                                                            ))}
                                                        </ul>
                                                        {slide.speakerNotes && (
                                                            <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-800 font-medium italic border border-yellow-100">
                                                                🗣️ Nota: {slide.speakerNotes}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                     )}
                                </div>
                            )}

                            {/* TAB: CHAT */}
                            {activeTab === 'chat' && (
                                <div className="flex-1 flex flex-col h-full overflow-hidden">
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                                        {chatMessages.length === 0 && (
                                            <div className="text-center text-gray-400 mt-10">
                                                <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                                                <p className="text-sm">Faça perguntas específicas sobre o artigo.</p>
                                            </div>
                                        )}
                                        {chatMessages.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                                                    msg.role === 'user' 
                                                    ? 'bg-medical-primary text-white rounded-tr-none' 
                                                    : 'bg-white text-gray-700 border border-gray-200 rounded-tl-none shadow-sm'
                                                }`}>
                                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                        {loadingChat && (
                                            <div className="flex justify-start">
                                                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm flex items-center gap-2">
                                                    <Loader2 size={16} className="animate-spin text-medical-primary" />
                                                    <span className="text-xs text-gray-500">Analisando documento...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-white border-t border-gray-200">
                                        <form onSubmit={handleChatSend} className="relative">
                                            <input 
                                                type="text" 
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                placeholder="Pergunte algo sobre o PDF..."
                                                className="w-full pl-4 pr-12 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-primary text-sm"
                                            />
                                            <button 
                                                type="submit"
                                                disabled={!chatInput.trim() || loadingChat}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg text-medical-primary hover:bg-gray-50 shadow-sm disabled:opacity-50"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
             )}

             {/* Right Sidebar (Actions) - Only visible when file loaded */}
             {selectedFile && (
                <div className="w-64 bg-white border-l border-medical-border hidden xl:flex flex-col p-6 gap-6">
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Ações Rápidas</h4>
                        <div className="space-y-3">
                            <button className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2 group">
                                <ListChecks size={16} className="text-gray-400 group-hover:text-medical-primary" />
                                Pontos-Chave
                            </button>
                            <button className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2 group">
                                <Sparkles size={16} className="text-gray-400 group-hover:text-medical-primary" />
                                Análise Metodológica
                            </button>
                            <button className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2 group">
                                <Download size={16} className="text-gray-400 group-hover:text-medical-primary" />
                                Exportar Tudo
                            </button>
                        </div>
                    </div>

                    <div className="mt-auto bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-xs font-bold text-blue-800 mb-1">Dica Pro</p>
                        <p className="text-[11px] text-blue-600 leading-relaxed">
                            Use a aba "Chat" para perguntar sobre conflitos de interesse ou fontes de financiamento do estudo.
                        </p>
                    </div>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default PdfView;