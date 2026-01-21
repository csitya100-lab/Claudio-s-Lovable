import React, { useEffect, useState } from 'react';
import { AppMode, ChatSession, UserProfile } from '../types';
import { 
  Stethoscope, 
  ScanEye, 
  FileText, 
  Activity, 
  MapPin, 
  History, 
  ChevronRight,
  PlusCircle,
  MessageSquare,
  Palette,
  Settings,
  Key,
  X,
  Check,
  LogOut,
  Mic2,
  UserCircle,
  Moon,
  Sun,
  Laptop,
  Save,
  Building,
  Sparkles,
  Home,
  Crown,
  Video,
  Zap,
  AlertOctagon
} from 'lucide-react';

interface SidebarProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentMode, 
  setMode, 
  currentSessionId, 
  onSelectSession, 
  onNewSession 
}) => {
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'api'>('profile');
  const [limitReachedMode, setLimitReachedMode] = useState(false);
  
  // Settings State
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    crm: '',
    specialty: '',
    clinic: '',
    theme: 'light',
    transcriptionMode: 'gemini'
  });

  const loadHistory = () => {
    try {
      const storedIndex = localStorage.getItem('endo_chat_index');
      if (storedIndex) {
        const parsed: ChatSession[] = JSON.parse(storedIndex);
        parsed.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        setHistory(parsed);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const loadSettings = () => {
    // Load Key
    const currentKey = localStorage.getItem('endo_custom_api_key');
    if (currentKey) {
      setApiKey(currentKey);
      setSavedKey(true);
    }

    // Load Profile
    const savedProfile = localStorage.getItem('endo_user_profile');
    if (savedProfile) {
      const p = JSON.parse(savedProfile);
      setProfile(p);
      // Apply theme immediately
      if (p.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  useEffect(() => {
    loadHistory();
    loadSettings();

    const handleStorageUpdate = () => loadHistory();
    window.addEventListener('endo-history-updated', handleStorageUpdate);

    const handleOpenSettings = () => {
        setShowSettings(true);
        setActiveTab('api');
        setLimitReachedMode(false); // Normal open
    };
    window.addEventListener('endo-open-settings', handleOpenSettings);

    const handleLimitReached = () => {
        setShowSettings(true);
        setActiveTab('api');
        setLimitReachedMode(true); // Expiration Mode
    };
    window.addEventListener('endo-limit-reached', handleLimitReached);

    return () => {
      window.removeEventListener('endo-history-updated', handleStorageUpdate);
      window.removeEventListener('endo-open-settings', handleOpenSettings);
      window.removeEventListener('endo-limit-reached', handleLimitReached);
    };
  }, []);

  const handleSaveSettings = () => {
    // Save API Key
    if (!apiKey.trim()) {
      localStorage.removeItem('endo_custom_api_key');
      setSavedKey(false);
    } else {
      localStorage.setItem('endo_custom_api_key', apiKey.trim());
      setSavedKey(true);
    }

    // Save Profile
    localStorage.setItem('endo_user_profile', JSON.stringify(profile));
    
    // Apply Theme
    if (profile.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Notify components
    window.dispatchEvent(new Event('endo-key-updated'));
    window.dispatchEvent(new Event('endo-profile-updated'));
    
    setShowSettings(false);
    setLimitReachedMode(false);
  };

  const menuItems = [
    { 
      id: AppMode.RESEARCH, 
      label: 'Pesquisa Científica', 
      sub: '',
      icon: <Stethoscope size={20} /> 
    },
    { 
      id: AppMode.IMAGING, 
      label: 'Auxiliar Diagnóstico de Imagem', 
      sub: 'Radiologia & Dermato',
      icon: <ScanEye size={20} /> 
    },
    { 
      id: AppMode.LITERATURE, 
      label: 'Literatura Médica', 
      sub: 'Análise de Artigos',
      icon: <FileText size={20} /> 
    },
    { 
      id: AppMode.ILLUSTRATION, 
      label: 'Ilustração Médica', 
      sub: 'Geração de Imagens (Pro)',
      icon: <Palette size={20} /> 
    },
  ];

  return (
    <>
      <div className="w-20 md:w-72 bg-gradient-to-b from-medical-bordeauxMedium to-medical-primary text-white flex flex-col h-full shadow-lg transition-all duration-300 z-50">
        {/* Header */}
        <div className="p-6 flex flex-col gap-1 border-b border-white/10 bg-black/5">
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="bg-white/10 p-2 rounded-lg text-white shadow-sm backdrop-blur-sm">
              <Activity size={22} strokeWidth={2} />
            </div>
            <div className="hidden md:block">
              <h1 className="font-semibold text-lg leading-tight tracking-tight text-white">Dr. Cláudio Sityá AI</h1>
              <div className="flex items-center gap-1 text-medical-secondary mt-1 opacity-90">
                <MapPin size={10} />
                <p className="text-[10px] font-medium uppercase tracking-widest">{profile.clinic || 'Santa Maria - RS'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto scrollbar-hide">
          <button 
            onClick={onNewSession}
            className="w-full flex items-center justify-center md:justify-start gap-3 px-4 py-3 mb-6 bg-medical-accent/20 hover:bg-medical-accent/30 text-white/90 hover:text-white rounded-xl transition-all border border-medical-accent/20 group shadow-sm"
          >
            <Home size={20} />
            <span className="hidden md:inline font-semibold text-sm">Início / Nova Consulta</span>
          </button>

          <div className="mb-2 hidden md:block px-3">
            <p className="text-[10px] font-bold text-medical-secondary uppercase tracking-widest opacity-80">Módulos Clínicos</p>
          </div>
          
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                ${currentMode === item.id 
                  ? 'bg-white text-medical-primary shadow-soft font-medium' 
                  : 'text-white/80 hover:bg-black/10 hover:text-white'
                }`}
            >
              <div className={`${currentMode === item.id ? 'text-medical-primary' : 'text-white/70 group-hover:text-white'}`}>
                {item.icon}
              </div>
              <div className="hidden md:block text-left flex-1">
                <div className="text-sm leading-tight">{item.label}</div>
                {item.sub && (
                  <div className={`text-[10px] ${currentMode === item.id ? 'text-medical-primary/70' : 'text-white/50'}`}>
                      {item.sub}
                  </div>
                )}
              </div>
            </button>
          ))}

          {/* Upgrade CTA (Only if no key) */}
          {!savedKey && (
            <div className="px-3 mt-4 hidden md:block">
               <button 
                 onClick={() => { setShowSettings(true); setActiveTab('api'); }}
                 className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 p-0.5 rounded-xl group overflow-hidden"
               >
                  <div className="bg-black/20 hover:bg-transparent transition-colors rounded-[10px] px-3 py-3 flex items-center gap-3">
                     <div className="p-1.5 bg-white/20 rounded-lg text-white">
                        <Crown size={16} />
                     </div>
                     <div className="text-left">
                        <p className="text-xs font-bold text-white">Upgrade para Pro</p>
                        <p className="text-[9px] text-white/80">Libere vídeos e +</p>
                     </div>
                  </div>
               </button>
            </div>
          )}

          {/* History */}
          <div className="mt-6 hidden md:block pt-6 border-t border-white/10 px-2">
             <div className="flex items-center gap-2 px-2 mb-3 text-medical-secondary">
               <History size={14} />
               <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Histórico</p>
             </div>
             <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-hide">
               {history.length === 0 ? (
                 <p className="text-xs text-white/40 px-3 italic">Nenhuma consulta recente</p>
               ) : (
                 history.map((session) => (
                   <button 
                     key={session.id} 
                     onClick={() => onSelectSession(session.id)}
                     className={`w-full text-left px-3 py-2.5 rounded-lg truncate transition-colors flex items-center justify-between group
                       ${currentSessionId === session.id 
                         ? 'bg-black/20 text-white' 
                         : 'text-white/70 hover:bg-black/10'
                       }`}
                   >
                     <div className="flex items-center gap-2 overflow-hidden">
                       <MessageSquare size={12} className={currentSessionId === session.id ? 'text-medical-secondary' : 'opacity-50'} />
                       <span className="truncate text-xs">{session.title || 'Nova Consulta'}</span>
                     </div>
                     {currentSessionId === session.id && (
                       <ChevronRight size={12} className="text-medical-secondary flex-shrink-0" />
                     )}
                   </button>
                 ))
               )}
             </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 bg-black/10 border-t border-white/10">
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors mb-4"
          >
            <Settings size={18} />
            <div className="hidden md:block text-left">
               <span className="text-xs font-medium">Configurações</span>
               {savedKey && <span className="block text-[9px] text-medical-secondary">Pro Ativo</span>}
            </div>
          </button>

          <div className="hidden md:flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-medical-primary border border-white/10 overflow-hidden">
               {profile.name ? (
                 <span className="font-bold text-xs">{profile.name.charAt(0)}</span>
               ) : (
                 <img src="/logo.png" alt="EA" className="w-full h-full object-cover p-0.5" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
               )}
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-semibold text-white tracking-wide truncate">{profile.name || 'EndoAcolhe User'}</p>
              <p className="text-[9px] text-white/50">{profile.crm ? `CRM: ${profile.crm}` : 'Versão 3.5.0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-surface dark:border dark:border-dark-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* LIMIT REACHED BANNER */}
            {limitReachedMode && (
                <div className="bg-red-500 text-white p-4 flex items-start gap-3 animate-in slide-in-from-top duration-300">
                    <AlertOctagon className="flex-shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-bold text-sm">Limite Mensal Atingido</h4>
                        <p className="text-xs opacity-90 leading-relaxed mt-1">
                            Você consumiu toda a cota gratuita deste recurso. Para continuar usando ilimitadamente agora, insira sua Chave de API abaixo.
                        </p>
                    </div>
                </div>
            )}

            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-medical-bg/50 dark:bg-gray-800/50">
              <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                 <Settings size={18} className="text-medical-primary" />
                 Configurações
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 px-5 gap-6">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'profile' ? 'border-medical-primary text-medical-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    <UserCircle size={16} /> Perfil Médico
                </button>
                <button 
                  onClick={() => setActiveTab('preferences')}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'preferences' ? 'border-medical-primary text-medical-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    <Laptop size={16} /> Aparência & IA
                </button>
                <button 
                  onClick={() => setActiveTab('api')}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'api' ? 'border-medical-primary text-medical-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    <Crown size={16} className={!savedKey ? "text-amber-500" : ""} /> Planos & API
                </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-dark-bg text-gray-800 dark:text-gray-200">
                
                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Nome Completo</label>
                            <input 
                                type="text" 
                                value={profile.name}
                                onChange={(e) => setProfile({...profile, name: e.target.value})}
                                placeholder="Dr. Cláudio Sityá"
                                className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">CRM / Registro</label>
                                <input 
                                    type="text" 
                                    value={profile.crm}
                                    onChange={(e) => setProfile({...profile, crm: e.target.value})}
                                    placeholder="00000-RS"
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Especialidade</label>
                                <input 
                                    type="text" 
                                    value={profile.specialty}
                                    onChange={(e) => setProfile({...profile, specialty: e.target.value})}
                                    placeholder="Endocrinologia"
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Clínica / Hospital</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    value={profile.clinic}
                                    onChange={(e) => setProfile({...profile, clinic: e.target.value})}
                                    placeholder="Hospital de Caridade"
                                    className="w-full p-3 pl-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none transition-all"
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Estes dados aparecerão no cabeçalho dos laudos gerados.</p>
                        </div>
                    </div>
                )}

                {/* PREFERENCES TAB */}
                {activeTab === 'preferences' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        {/* Theme Toggle */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tema do Sistema</label>
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                                <button 
                                    onClick={() => setProfile({...profile, theme: 'light'})}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${profile.theme === 'light' ? 'bg-white text-medical-primary shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    <Sun size={16} /> Claro
                                </button>
                                <button 
                                    onClick={() => setProfile({...profile, theme: 'dark'})}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${profile.theme === 'dark' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    <Moon size={16} /> Escuro
                                </button>
                            </div>
                        </div>

                        {/* Transcription Mode */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Modo de Transcrição de Voz</label>
                            <div className="space-y-3">
                                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${profile.transcriptionMode === 'gemini' ? 'border-medical-primary bg-medical-primary/5' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <input 
                                        type="radio" 
                                        name="transcription" 
                                        checked={profile.transcriptionMode === 'gemini'}
                                        onChange={() => setProfile({...profile, transcriptionMode: 'gemini'})}
                                        className="mt-1"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2"><Sparkles size={12} className="text-purple-500"/> Gemini AI (Alta Precisão)</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Usa a IA do Google para transcrever áudio. Entende termos médicos complexos. Requer internet.</p>
                                    </div>
                                </label>

                                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${profile.transcriptionMode === 'browser' ? 'border-medical-primary bg-medical-primary/5' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <input 
                                        type="radio" 
                                        name="transcription" 
                                        checked={profile.transcriptionMode === 'browser'}
                                        onChange={() => setProfile({...profile, transcriptionMode: 'browser'})}
                                        className="mt-1"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2"><Laptop size={12} /> Navegador (Web Speech API)</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Transcrição nativa do navegador. Grátis, ilimitada e muito rápida. Menor precisão com termos técnicos.</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* API / PLAN TAB */}
                {activeTab === 'api' && (
                    <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                             <div className="flex items-center gap-2 mb-3">
                                <Crown size={18} className="text-amber-500 fill-amber-500" />
                                <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Plano Profissional (BYOK)</h4>
                             </div>
                             <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed mb-4">
                                Para desbloquear todo o potencial, você pode usar sua própria chave de API (Google AI Studio). Isso remove limites e libera recursos avançados:
                             </p>
                             <ul className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 dark:text-gray-400">
                                 <li className="flex items-center gap-1.5"><Video size={12} className="text-medical-primary" /> Análise de Vídeo</li>
                                 <li className="flex items-center gap-1.5"><Zap size={12} className="text-medical-primary" /> Uso Ilimitado</li>
                                 <li className="flex items-center gap-1.5"><Palette size={12} className="text-medical-primary" /> Ilustrações Pro</li>
                                 <li className="flex items-center gap-1.5"><ScanEye size={12} className="text-medical-primary" /> Deep Think</li>
                             </ul>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Sua Chave Google Gemini</label>
                            <div className="relative">
                            <input 
                                type="password" 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Cole sua chave AIzaSy..."
                                className="w-full p-3 pl-4 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-medical-primary outline-none font-mono text-sm"
                            />
                            {savedKey && apiKey && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-medical-accent">
                                <Check size={18} />
                                </div>
                            )}
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-medical-primary hover:underline flex items-center gap-1">
                                    Obter chave gratuita <ChevronRight size={10} />
                                </a>
                                {savedKey && <span className="text-[10px] text-medical-accent font-medium">Chave Ativa</span>}
                            </div>
                        </div>

                         <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                             <button 
                               onClick={() => {
                                   localStorage.removeItem('endo_custom_api_key');
                                   setApiKey('');
                                   setSavedKey(false);
                               }}
                               className="text-xs text-red-500 hover:text-red-600 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors"
                             >
                                 <LogOut size={14} /> Remover Chave
                             </button>
                         </div>
                    </div>
                )}

            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
               <button 
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
               >
                 Cancelar
               </button>
               <button 
                  onClick={handleSaveSettings}
                  className="px-6 py-2 bg-medical-primary text-white text-sm font-semibold rounded-lg hover:bg-medical-primaryDark transition-colors shadow-sm flex items-center gap-2"
               >
                 <Save size={16} /> Salvar Alterações
               </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;