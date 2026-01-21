import React, { useState, useEffect, useRef } from 'react';
import { analyzeDiagnosticImage, checkUsageLimit } from '../services/geminiService';
import { Upload, X, Loader2, ScanEye, Sparkles, Copy, Check, FileCheck, Plus, Wand2, Film, Lock, AlertTriangle, Lightbulb, PenTool, Crown, ChevronRight, Ruler, MousePointer2, Download, RefreshCw, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ImageDrawingCanvas from './ImageDrawingCanvas';

const ImageView: React.FC = () => {
  // Mode: 'ANALYZE' (AI) or 'ANNOTATE' (Manual Drawing)
  const [mode, setMode] = useState<'ANALYZE' | 'ANNOTATE'>('ANALYZE');
  
  // State for AI Analysis (Batch)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisProtocol, setAnalysisProtocol] = useState<'GENERAL' | 'GYNECOLOGY' | 'BREAST'>('GENERAL');
  
  // State for Manual Annotation (Single Image)
  const [annotationFile, setAnnotationFile] = useState<File | null>(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [annotationNote, setAnnotationNote] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Limit State & Premium Gate
  const [limit, setLimit] = useState({ remaining: 0, limit: 0, isCustom: false });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Keep track of URLs for cleanup on unmount
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  const refreshLimit = () => {
    const l = checkUsageLimit('IMAGE_GEN'); // Reusing existing check logic
    setLimit({ remaining: l.remaining, limit: l.limit, isCustom: l.isCustomKey });
  };

  useEffect(() => {
    refreshLimit();
    window.addEventListener('endo-usage-updated', refreshLimit);
    window.addEventListener('endo-key-updated', refreshLimit);
    return () => {
        window.removeEventListener('endo-usage-updated', refreshLimit);
        window.removeEventListener('endo-key-updated', refreshLimit);
        previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // --- HANDLERS FOR AI ANALYSIS MODE ---

  const handleAnalysisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as File[];
      
      // Premium Gate for Video
      const hasVideo = newFiles.some(f => f.type.startsWith('video'));
      const usageCheck = checkUsageLimit('IMAGE_GEN'); 

      if (hasVideo && !usageCheck.isCustomKey) {
        setShowUpgradeModal(true);
        e.target.value = '';
        return;
      }

      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setPreviewUrls(prev => [...prev, ...newUrls]);
      setAnalysis(null);
    }
  };

  const removeAnalysisFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[indexToRemove]);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const handleAnalyzeAction = async () => {
    if (selectedFiles.length === 0) return;
    setLoading(true);

    try {
        const result = await analyzeDiagnosticImage(selectedFiles, prompt, analysisProtocol);
        setAnalysis(result || "Não foi possível gerar uma análise.");
    } catch (error: any) {
      if (error?.message?.includes('API Key')) {
        window.dispatchEvent(new Event('endo-open-settings'));
        setAnalysis("⚠️ ERRO: Chave de API necessária. A janela de configurações foi aberta para você inserir sua chave.");
      } else {
        setAnalysis("Erro ao processar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS FOR ANNOTATION MODE ---

  const handleAnnotationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        // Annotation only supports one image at a time
        const file = e.target.files[0];
        if (file.type.startsWith('image/')) {
            setAnnotationFile(file);
            setAnnotatedImageUrl(null);
            setAnnotationNote(null);
        } else {
            alert("Para anotação manual, por favor selecione apenas arquivos de imagem (JPG, PNG).");
        }
    }
  };

  const handleAnnotationSave = (dataUrl: string, description: string) => {
      setAnnotatedImageUrl(dataUrl);
      setAnnotationNote(description);
      // Here you would typically upload this to your backend or attach context
  };

  const resetAnnotation = () => {
      setAnnotationFile(null);
      setAnnotatedImageUrl(null);
      setAnnotationNote(null);
  };

  // --- SHARED ---

  const handleClear = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setAnalysis(null);
    setPrompt('');
    
    resetAnnotation();
  };

  const handleCopy = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const triggerUpgrade = () => {
      setShowUpgradeModal(false);
      window.dispatchEvent(new Event('endo-open-settings'));
  };

  return (
    <div className="flex flex-col h-full w-full bg-medical-bg overflow-y-auto relative">
      {/* Header Card with Gradient */}
      <div className="bg-gradient-to-r from-medical-bordeaux to-medical-primary p-8 pb-8 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
           <div>
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 border border-white/20 rounded-lg text-white shadow-sm backdrop-blur-sm">
                    {mode === 'ANALYZE' ? <ScanEye size={22} /> : <PenTool size={22} />}
                </div>
                <h2 className="text-xl font-semibold text-white">
                    {mode === 'ANALYZE' ? 'Auxiliar Diagnóstico de Imagem' : 'Marcador Clínico & Anotação'}
                </h2>
            </div>
            <p className="text-white/80 md:ml-12 text-sm max-w-lg">
                {mode === 'ANALYZE' 
                    ? 'Análise de Imagens e Vídeos com IA para segunda opinião.' 
                    : 'Ferramentas manuais para medir, circular lesões e adicionar notas técnicas em exames.'}
            </p>
           </div>
           
           <div className="flex items-center gap-3">
            {/* Mode Toggle */}
             <div className="bg-white/20 p-1 rounded-xl border border-white/20 flex gap-1 shadow-sm backdrop-blur-sm">
                <button 
                    onClick={() => { setMode('ANALYZE'); handleClear(); }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'ANALYZE' ? 'bg-white text-medical-primary shadow-sm' : 'text-white/70 hover:bg-white/10'}`}
                >
                    Análise IA
                </button>
                <button 
                    onClick={() => { setMode('ANNOTATE'); handleClear(); }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${mode === 'ANNOTATE' ? 'bg-white text-medical-accent shadow-sm' : 'text-white/70 hover:bg-white/10'}`}
                >
                    <PenTool size={14} /> Anotar
                </button>
             </div>
           </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 pt-6">
        {/* Safety Alert */}
        <div className="max-w-6xl mx-auto mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
                <p className="text-sm font-bold text-amber-800">Aviso de Responsabilidade Profissional</p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  ⚠️ {mode === 'ANALYZE' 
                    ? 'Esta ferramenta utiliza modelos de IA generalistas multimodais, não treinados especificamente para diagnóstico por imagem. O sistema atua apenas como suporte probabilístico e pode cometer erros de interpretação (alucinações).' 
                    : 'As anotações e medidas inseridas manualmente são de inteira responsabilidade do operador. Verifique a escala.'}
                  A responsabilidade diagnóstica é exclusivamente do médico especialista.
                </p>
            </div>
        </div>

        {/* 
            ANNOTATE MODE (Manual Drawing Tools)
        */}
        {mode === 'ANNOTATE' && (
             <div className="max-w-6xl mx-auto h-full min-h-[600px] animate-in fade-in duration-300">
                 {!annotationFile ? (
                    /* 1. Upload View */
                    <div className="bg-medical-surface p-8 rounded-2xl shadow-soft border border-medical-border text-center flex flex-col items-center justify-center min-h-[400px]">
                         <div className="w-20 h-20 bg-medical-secondary/50 rounded-full flex items-center justify-center mb-6 text-medical-primary">
                             <Ruler size={36} />
                         </div>
                         <h3 className="text-xl font-bold text-gray-800">Carregar Exame para Anotação</h3>
                         <p className="text-sm text-gray-500 mt-2 mb-8 max-w-md leading-relaxed">
                             Carregue um ultrassom, raio-x ou foto dermatológica. Use ferramentas de precisão para adicionar medidas (cm/mm), destacar achados e salvar no prontuário.
                         </p>
                         
                         <label className="px-8 py-4 bg-medical-primary text-white rounded-xl font-bold cursor-pointer hover:bg-medical-primaryDark transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-3">
                             <Upload size={20} /> Selecionar Imagem
                             <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleAnnotationFileChange}
                                className="hidden"
                            />
                         </label>

                         <div className="mt-8 flex gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Check size={12} /> Suporte a JPG/PNG</span>
                            <span className="flex items-center gap-1"><Check size={12} /> Medidas Editáveis</span>
                            <span className="flex items-center gap-1"><Check size={12} /> Alta Resolução</span>
                         </div>
                    </div>
                 ) : !annotatedImageUrl ? (
                    /* 2. Drawing Canvas View */
                    <ImageDrawingCanvas 
                        imageFile={annotationFile}
                        onSave={handleAnnotationSave}
                        onCancel={resetAnnotation}
                    />
                 ) : (
                    /* 3. Result View */
                    <div className="bg-medical-surface rounded-2xl shadow-soft border border-medical-border p-8 flex flex-col items-center animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 mb-6 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-100 shadow-sm">
                             <Check size={18} strokeWidth={3} />
                             <span className="font-bold text-sm">Anotação Concluída</span>
                        </div>
                        
                        <div className="relative group">
                            <img src={annotatedImageUrl} alt="Anotada" className="max-h-[600px] w-auto rounded-lg border border-medical-border shadow-md bg-black/5" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg pointer-events-none">
                                <span className="text-white font-medium flex items-center gap-2"><ScanEye /> Visualização Final</span>
                            </div>
                        </div>
                        
                        {annotationNote && (
                            <div className="mt-6 w-full max-w-2xl bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-inner">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <PenTool size={12} /> Nota Clínica
                                </p>
                                <p className="text-gray-800 font-medium text-base leading-relaxed">{annotationNote}</p>
                            </div>
                        )}

                        <div className="flex gap-4 mt-8">
                             <button 
                                onClick={resetAnnotation} 
                                className="px-6 py-3 text-gray-600 hover:text-medical-primary hover:bg-gray-50 rounded-xl font-medium text-sm border border-transparent hover:border-gray-200 transition-all flex items-center gap-2"
                             >
                                 <RefreshCw size={16} /> Nova Anotação
                             </button>
                             <a 
                                href={annotatedImageUrl} 
                                download={`anotacao_${Date.now()}.png`}
                                className="px-8 py-3 bg-medical-primary text-white rounded-xl font-bold shadow-md hover:bg-medical-primaryDark hover:shadow-lg transition-all flex items-center gap-2"
                             >
                                 <Download size={18} /> Baixar Imagem
                             </a>
                        </div>
                    </div>
                 )}
             </div>
        )}


        {/* 
            ANALYZE MODE: Split Layout (Input + AI Result)
        */}
        {mode === 'ANALYZE' && (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[500px] animate-in fade-in duration-300">
          
          {/* Left Panel: Input */}
          <div className="flex flex-col gap-5">
            <div className="bg-medical-surface p-1 rounded-2xl shadow-soft border border-medical-border h-full flex flex-col">
              
              {selectedFiles.length === 0 ? (
                /* Empty State - Big Dropzone */
                <label className="relative flex-1 border border-dashed border-gray-300 hover:border-medical-primary hover:bg-gray-50 bg-medical-bg/50 rounded-xl transition-all duration-300 min-h-[300px] flex flex-col items-center justify-center text-center p-6 m-5 cursor-pointer group">
                    <div className="w-14 h-14 bg-white border border-medical-border text-medical-primary rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                      <ScanEye size={24} />
                    </div>
                    <h3 className="text-base font-semibold text-gray-700">Carregar Exames ou Vídeos (IA)</h3>
                    <p className="text-xs text-gray-400 mt-2 max-w-xs">Selecione imagens ou vídeos curtos para análise automática de segunda opinião.</p>
                    
                    {!limit.isCustom && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-md">
                            <Lock size={10} /> Vídeos: Recurso Pro
                        </div>
                    )}

                    <input 
                      type="file" 
                      accept="image/*,video/*"
                      multiple
                      onChange={handleAnalysisFileChange}
                      className="hidden"
                    />
                </label>
              ) : (
                /* Grid View of Images */
                <div className="flex-1 p-5 min-h-[300px] flex flex-col">
                  <div className="flex items-center justify-between mb-4 px-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{selectedFiles.length} Arquivo(s)</span>
                     <button onClick={handleClear} className="text-xs text-red-500 hover:text-red-600 font-medium">Limpar tudo</button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square bg-gray-100 rounded-lg border border-medical-border overflow-hidden">
                        {selectedFiles[idx].type.startsWith('video') ? (
                            <video 
                              src={url} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                              muted 
                              playsInline
                              preload="metadata"
                              onMouseOver={(e) => e.currentTarget.play()}
                              onMouseOut={(e) => {
                                e.currentTarget.pause();
                                e.currentTarget.currentTime = 0;
                              }}
                            />
                        ) : (
                            <img src={url} alt={`Exam ${idx}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        )}
                        
                        {/* Type indicator */}
                         {selectedFiles[idx].type.startsWith('video') && (
                            <div className="absolute bottom-1 left-1 bg-black/50 text-white p-1 rounded-md backdrop-blur-sm">
                                <Film size={12} />
                            </div>
                         )}

                        <button 
                          onClick={() => removeAnalysisFile(idx)}
                          className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-gray-500 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    
                    <label className="flex flex-col items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 hover:border-medical-primary transition-colors aspect-square">
                        <Plus size={24} className="text-gray-400" />
                        <span className="text-[10px] text-gray-500 font-medium mt-1">Adicionar</span>
                        <input 
                        type="file" 
                        accept="image/*,video/*"
                        multiple
                        onChange={handleAnalysisFileChange}
                        className="hidden"
                        />
                    </label>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="px-6 pb-6 space-y-4">
                {/* Protocol Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                     <FileText size={10} /> Protocolo de Análise
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button 
                        onClick={() => setAnalysisProtocol('GENERAL')}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                            analysisProtocol === 'GENERAL' 
                            ? 'bg-medical-primary text-white border-medical-primary' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-medical-primary/50'
                        }`}
                      >
                          Geral
                      </button>
                      <button 
                        onClick={() => setAnalysisProtocol('GYNECOLOGY')}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                            analysisProtocol === 'GYNECOLOGY' 
                            ? 'bg-medical-primary text-white border-medical-primary' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-medical-primary/50'
                        }`}
                        title="O-RADS, IOTA, FIGO, MUSA, IDEA"
                      >
                          Ginecologia / Pelve
                      </button>
                      <button 
                        onClick={() => setAnalysisProtocol('BREAST')}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                            analysisProtocol === 'BREAST' 
                            ? 'bg-medical-primary text-white border-medical-primary' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-medical-primary/50'
                        }`}
                        title="BI-RADS Mamografia/US"
                      >
                          Mama (BI-RADS)
                      </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Contexto Clínico (Opcional)</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Descreva sintomas e suspeita clínica (ex: 'Nódulo palpável QSE', 'Dor pélvica cíclica')..."
                    className="w-full p-4 bg-medical-bg border border-medical-border rounded-xl focus:ring-1 focus:ring-medical-primary focus:border-medical-primary outline-none text-sm min-h-[80px] resize-none transition-all"
                  />
                </div>
                
                <button
                  onClick={handleAnalyzeAction}
                  disabled={selectedFiles.length === 0 || loading}
                  className="w-full mt-2 bg-medical-primary text-white py-4 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processando...
                    </>
                  ) : (
                    <>
                      <ScanEye size={20} /> ANALISAR CASO
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Report */}
          <div className="bg-medical-surface rounded-2xl shadow-soft border border-medical-border flex flex-col h-full min-h-[500px]">
             <div className="p-5 border-b border-medical-border flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
                <div className="flex items-center gap-2">
                    <FileCheck size={18} className="text-medical-primary" />
                    <span className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Laudo IA</span>
                </div>
                {analysis && (
                    <button
                        onClick={handleCopy}
                        className="text-gray-400 hover:text-medical-primary transition-colors flex items-center gap-1 text-xs font-medium bg-white border border-medical-border px-3 py-1.5 rounded-lg shadow-sm"
                    >
                        {copied ? <Check size={14} className="text-medical-primary" /> : <Copy size={14} />}
                        {copied ? 'Copiado' : 'Copiar'}
                    </button>
                )}
             </div>

            <div className="flex-1 p-0 overflow-y-auto">
              {!analysis && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-gray-300">
                  <ScanEye size={48} className="mb-4 opacity-40" />
                  <p className="font-medium text-sm">Aguardando entrada...</p>
                </div>
              )}

              {loading && (
                <div className="h-full flex flex-col items-center justify-center space-y-6">
                   <div className="relative w-20 h-20">
                      <div className="absolute inset-0 border-2 border-gray-100 rounded-full"></div>
                      <div className="absolute inset-0 border-2 border-medical-primary border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles size={24} className="text-medical-primary animate-pulse" />
                      </div>
                   </div>
                   <div className="text-center">
                     <p className="text-gray-800 font-semibold text-base">Aplicando protocolos médicos...</p>
                     {analysisProtocol !== 'GENERAL' && (
                        <p className="text-xs text-medical-primary mt-1 font-medium">{analysisProtocol === 'GYNECOLOGY' ? 'O-RADS / FIGO / MUSA' : 'BI-RADS'}</p>
                     )}
                   </div>
                </div>
              )}

              {analysis && (
                <div>
                   <div className="px-8 pt-6 pb-0">
                       <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 border border-blue-100">
                          <Lightbulb size={14} className="flex-shrink-0" />
                          💡 Sugestão IA - Valide clinicamente antes de usar
                       </div>
                   </div>
                   
                   <div className="p-8 prose prose-slate prose-sm md:prose-base max-w-none text-gray-600">
                    <ReactMarkdown
                        components={{
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold text-gray-800 mt-6 mb-3 border-b border-gray-100 pb-2" {...props} />,
                        strong: ({node, ...props}) => <span className="font-semibold text-medical-primary" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-2 mb-4 marker:text-gray-400" {...props} />,
                        }}
                    >
                        {analysis}
                    </ReactMarkdown>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

      </div>

      {/* Upgrade / Block Modal */}
      {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                 <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 flex flex-col items-center text-center text-white">
                     <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
                         <Crown size={28} />
                     </div>
                     <h3 className="text-xl font-bold">Recurso Pro</h3>
                     <p className="text-sm text-white/90 mt-1">Análise de Vídeo Exclusiva</p>
                 </div>
                 <div className="p-6">
                     <p className="text-gray-600 text-sm mb-6 text-center leading-relaxed">
                         O processamento de vídeo consome muitos recursos de IA. Para utilizar esta funcionalidade, adicione sua própria chave de API (BYOK) ou faça upgrade do seu plano.
                     </p>
                     
                     <button 
                        onClick={triggerUpgrade}
                        className="w-full py-3 bg-medical-primary text-white rounded-xl font-bold hover:bg-medical-primaryDark transition-colors flex items-center justify-center gap-2 mb-3 shadow-md"
                     >
                        <Crown size={16} /> Liberar Recursos Agora
                     </button>
                     <button 
                        onClick={() => setShowUpgradeModal(false)}
                        className="w-full py-3 text-gray-400 hover:text-gray-600 text-sm font-semibold"
                     >
                        Cancelar
                     </button>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default ImageView;