import React, { useState } from 'react';
import { Activity, Lock, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, ShoppingBag, Info } from 'lucide-react';

interface AccessScreenProps {
  onGrantAccess: () => void;
}

const AccessScreen: React.FC<AccessScreenProps> = ({ onGrantAccess }) => {
  const [accessCode, setAccessCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [isSimulatingPurchase, setIsSimulatingPurchase] = useState(false);

  // Simulating a valid license code database
  const VALID_CODES = ['MED-2024', 'DEMO', 'CLINICA-PREMIUM', 'SITYA-MASTER'];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreed) {
      setError('⚠️ É obrigatório aceitar o termo de responsabilidade médica para prosseguir.');
      return;
    }

    // Check if code is valid (Case insensitive)
    if (VALID_CODES.includes(accessCode.toUpperCase().trim())) {
      try {
        localStorage.setItem('endo_access_granted', 'true');
      } catch (e) {
        console.warn('Could not save access to storage');
      }
      onGrantAccess();
    } else {
      setError('❌ Código de licença inválido ou expirado.');
    }
  };

  const fillDemo = () => {
      setAccessCode('DEMO');
      setAgreed(true);
      setError('');
  };

  const handleBuyLicense = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsSimulatingPurchase(true);
      
      // Simulate API call/Purchase flow
      setTimeout(() => {
          setIsSimulatingPurchase(false);
          setAccessCode('MED-2024');
          setAgreed(true);
          setError('');
          
          // Explicação clara do "Modo Gratuito/Standard" ao adquirir licença
          alert(
            "🎉 Licença 'MED-2024' Ativada!\n\n" +
            "Você desbloqueou o acesso ao Plano Standard:\n" +
            "• 15 Pesquisas Clínicas/mês\n" +
            "• 05 Análises Deep Think/mês\n" +
            "• 02 Gerações de Imagem/mês\n\n" +
            "Para uso ILIMITADO, você poderá adicionar sua Chave de API pessoal nas configurações a qualquer momento."
          );
      }, 800);
  };

  return (
    <div className="min-h-screen bg-medical-bg flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-medical-border overflow-hidden">
        
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-medical-bordeaux to-medical-primary p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/medical-icons.png')]"></div>
          <div className="relative z-10 flex flex-col items-center">
             <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 text-white shadow-inner border border-white/30">
                <Activity size={32} strokeWidth={3} />
             </div>
             <h1 className="text-2xl font-bold text-white tracking-tight">Dr. Cláudio Sityá AI</h1>
             <p className="text-medical-secondary text-xs font-medium uppercase tracking-widest mt-2">Suíte de Inteligência Clínica</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Lock size={12} /> Código de Acesso
                  </label>
                  <button type="button" onClick={fillDemo} className="flex items-center gap-1 text-[10px] bg-medical-secondary/50 text-medical-primary px-2 py-1 rounded hover:bg-medical-secondary transition-colors font-bold">
                      <Info size={10} /> Testar Demo
                  </button>
              </div>
              <input 
                type="text" 
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Ex: MED-2024"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-medical-primary/20 focus:border-medical-primary outline-none font-mono text-sm text-center tracking-widest uppercase transition-all placeholder:normal-case placeholder:tracking-normal"
              />
            </div>

            {/* Disclaimer Box */}
            <div className={`border rounded-xl p-4 transition-colors duration-300 ${agreed ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className={`${agreed ? 'text-green-600' : 'text-yellow-600'} flex-shrink-0 mt-0.5 transition-colors`} />
                <div className="space-y-3">
                  <h3 className={`text-sm font-bold ${agreed ? 'text-green-800' : 'text-yellow-800'}`}>Aviso de Responsabilidade</h3>
                  <p className={`text-xs ${agreed ? 'text-green-700' : 'text-yellow-700'} leading-relaxed text-justify`}>
                    Esta ferramenta utiliza Inteligência Artificial para auxiliar na pesquisa e análise. 
                    <strong>Ela pode cometer erros (alucinações).</strong> O uso é estritamente restrito a profissionais de saúde.
                    A tomada de decisão clínica é de responsabilidade exclusiva do médico.
                  </p>
                  
                  <label className="flex items-start gap-3 cursor-pointer group select-none">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-yellow-400 checked:bg-green-500 checked:border-transparent transition-all"
                      />
                      <CheckCircle2 size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" />
                    </div>
                    <span className={`text-xs font-semibold ${agreed ? 'text-green-800' : 'text-yellow-800 group-hover:text-yellow-900'} transition-colors pt-0.5`}>
                      Sou profissional de saúde e concordo.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg text-center animate-in fade-in slide-in-from-top-2 flex items-center justify-center gap-2">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-medical-primary text-white py-4 rounded-xl font-bold shadow-lg hover:bg-medical-primaryDark transition-all flex items-center justify-center gap-2 group hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              <ShieldCheck size={20} />
              Acessar Sistema
              <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
            </button>

          </form>
          
          <div className="mt-8 text-center pt-6 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 mb-2">
              Não possui um código de acesso?
            </p>
            <button 
                onClick={handleBuyLicense}
                disabled={isSimulatingPurchase}
                className="text-xs text-medical-primary hover:text-medical-primaryDark hover:underline font-bold flex items-center justify-center gap-1 mx-auto transition-colors disabled:opacity-50"
            >
                {isSimulatingPurchase ? (
                    'Gerando licença...' 
                ) : (
                    <>
                        <ShoppingBag size={12} /> Adquira sua licença aqui
                    </>
                )}
            </button>
            <p className="text-[9px] text-gray-300 mt-4">v3.5.0 • Secure Build</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessScreen;