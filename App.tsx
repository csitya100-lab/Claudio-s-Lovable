import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ResearchView from './components/ResearchView';
import ImageView from './components/ImageView';
import PdfView from './components/PdfView';
import IllustrationView from './components/IllustrationView';
import AccessScreen from './components/AccessScreen';
import { AppMode } from './types';

// Safe ID generator that works in insecure contexts (non-https) where crypto.randomUUID fails
const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers or insecure contexts
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const App: React.FC = () => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for existing session on load with error handling
  useEffect(() => {
    try {
      const granted = localStorage.getItem('endo_access_granted');
      if (granted === 'true') {
        setHasAccess(true);
      }
    } catch (e) {
      console.warn("Storage access blocked", e);
    }
    setLoading(false);
  }, []);

  const [mode, setMode] = useState<AppMode>(AppMode.RESEARCH);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => generateId());

  const handleNewSession = () => {
    setCurrentSessionId(generateId());
    setMode(AppMode.RESEARCH); 
  };

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    setMode(AppMode.RESEARCH); 
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.RESEARCH:
        return (
          <ResearchView 
            key={currentSessionId} // Force remount when session ID changes to clear state completely
            sessionId={currentSessionId} 
            onNewSession={handleNewSession}
          />
        );
      case AppMode.IMAGING:
        return <ImageView />;
      case AppMode.LITERATURE:
        return <PdfView />;
      case AppMode.ILLUSTRATION:
        return <IllustrationView />;
      default:
        return <ResearchView key={currentSessionId} sessionId={currentSessionId} onNewSession={handleNewSession} />;
    }
  };

  if (loading) return null; // Prevent flash

  // Render Access Screen if not authenticated
  if (!hasAccess) {
    return <AccessScreen onGrantAccess={() => setHasAccess(true)} />;
  }

  return (
    <div className="flex h-screen w-full bg-medical-bg text-medical-text font-sans selection:bg-medical-primary/20 selection:text-medical-primary animate-in fade-in duration-500">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentMode={mode} 
        setMode={setMode}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-hidden relative">
           {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;