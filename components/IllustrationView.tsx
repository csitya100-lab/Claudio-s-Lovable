import React, { useState, useEffect } from 'react';
import { generateMedicalIllustration, checkUsageLimit } from '../services/geminiService';
import { Palette, Loader2, Sparkles, Image as ImageIcon, Download, Lock } from 'lucide-react';

const IllustrationView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState({ remaining: 0, limit: 0, isCustom: false });

  const refreshLimit = () => {
    const l = checkUsageLimit('IMAGE_GEN');
    setLimit({ remaining: l.remaining, limit: l.limit, isCustom: l.isCustomKey });
  };

  useEffect(() => {
    refreshLimit();
    window.addEventListener('endo-usage-updated', refreshLimit);
    window.addEventListener('endo-key-updated', refreshLimit);
    const handleStorage = () => refreshLimit();
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('endo-usage-updated', refreshLimit);
      window.removeEventListener('endo-key-updated', refreshLimit);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleGenerate = async () => {
    if (!prompt) return;

    if (!limit.isCustom && limit.remaining <= 0) {
        alert("Limite mensal de geração de imagens atingido. Adicione sua chave (BYOK) nas configurações para uso ilimitado.");
        return;
    }

    setLoading(true);
    setImageUrl(null);
    
    try {
      const result = await generateMedicalIllustration(prompt, size);
      setImageUrl(result);
    } catch (error: any) {
      if (error?.message?.includes('API Key')) {
         window.dispatchEvent(new Event('endo-open-settings'));
         alert("É necessário configurar uma Chave de API para gerar ilustrações. As configurações foram abertas.");
      } else {
         alert("Erro ao gerar ilustração.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-medical-bg overflow-y-auto">
      <div className="bg-gradient-to-r from-medical-bordeaux to-medical-primary p-8 pb-8 shadow-md">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 border border-white/20 rounded-lg text-white shadow-sm backdrop-blur-sm">
                    <Palette size={22} />
                </div>
                <h2 className="text-xl font-semibold text-white">Ilustração Médica (Pro)</h2>
            </div>
            
            {/* Limit Badge */}
            {!limit.isCustom && (
                <div className={`text-xs px-2 py-1 rounded-full border ${limit.remaining === 0 ? 'bg-red-500/20 text-red-100 border-red-400' : 'bg-white/20 text-white border-white/30'}`}>
                    Créditos: <b>{limit.remaining}</b>/{limit.limit}
                </div>
            )}
          </div>
          <p className="text-white/80 ml-12 text-sm">Geração de imagens de alta fidelidade para apresentações e estudos.</p>
        </div>
      </div>

      <div className="flex-1 p-8 pt-6">
        <div className="max-w-4xl mx-auto bg-medical-surface rounded-2xl shadow-soft border border-medical-border p-8 min-h-[500px] flex flex-col md:flex-row gap-8">
            
            {/* Controls */}
            <div className="flex-1 flex flex-col gap-6">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Descrição da Ilustração</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: Anatomia detalhada do coração humano, estilo realista, cortes transversais..."
                        className="w-full h-40 p-4 bg-medical-bg border border-medical-border rounded-xl focus:ring-1 focus:ring-medical-primary outline-none text-sm resize-none"
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Resolução</label>
                    <div className="flex gap-2">
                        {(['1K', '2K', '4K'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setSize(s)}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                                    size === s 
                                    ? 'bg-medical-primary text-white border-medical-primary' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-medical-primary'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={loading || !prompt}
                    className="w-full bg-medical-primary text-white py-4 rounded-xl font-semibold shadow-md hover:bg-medical-primaryDark disabled:opacity-50 transition-all flex items-center justify-center gap-2 relative overflow-hidden"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                        !limit.isCustom && limit.remaining <= 0 ? <Lock size={20} /> : <Sparkles size={20} />
                    )}
                    <span>
                       {loading ? 'Gerando...' : (!limit.isCustom && limit.remaining <= 0 ? 'Limite Atingido' : 'Gerar Ilustração')}
                    </span>
                </button>
            </div>

            {/* Preview */}
            <div className="flex-1 bg-gray-50 rounded-xl border border-medical-border flex items-center justify-center relative overflow-hidden group min-h-[300px]">
                {loading && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                        <Loader2 size={30} className="text-medical-primary animate-spin mb-2" />
                        <span className="text-xs font-medium text-gray-500">Renderizando...</span>
                    </div>
                )}
                
                {!imageUrl && !loading && (
                    <div className="text-gray-300 flex flex-col items-center">
                        <ImageIcon size={40} className="mb-2" />
                        <span className="text-sm">A imagem aparecerá aqui</span>
                    </div>
                )}

                {imageUrl && (
                    <>
                        <img src={imageUrl} alt="Generated Medical Illustration" className="w-full h-full object-contain" />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a 
                                href={imageUrl} 
                                download="medical_illustration.png"
                                className="bg-white text-gray-800 p-2 rounded-lg shadow-md hover:text-medical-primary"
                                title="Baixar"
                            >
                                <Download size={20} />
                            </a>
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default IllustrationView;