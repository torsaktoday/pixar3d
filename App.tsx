import React, { useState, useEffect } from 'react';
import { VideoUploader } from './components/VideoUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { SettingsModal } from './components/SettingsModal';
import { AdminDashboard } from './components/AdminDashboard';
import { analyzeVideo, fileToGenerativePart, urlToBase64 } from './services/geminiService';
import { AnalysisMode, FileData, ProcessingStatus, AnalysisResult } from './types';
import { Sparkles, Video, Languages, AlertCircle, Settings, Shield } from 'lucide-react';

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [mode, setMode] = useState<AnalysisMode>(AnalysisMode.SUMMARY);
  const [language, setLanguage] = useState<'en' | 'th'>('th');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Load API Key from local storage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKey(storedKey);
    // If we have no key in env and no key in storage, user needs to input it.
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const handleFileSelect = (fileData: FileData | null) => {
    setSelectedFile(fileData);
    setResult(null);
    setStatus('idle');
    setErrorMsg(null);
  };

  const handleAnalyze = async () => {
    // Check for API Key first
    if (!apiKey) {
      setIsSettingsOpen(true);
      setErrorMsg("Please enter your Gemini API Key in settings to proceed.");
      return;
    }

    if (!selectedFile) return;

    setStatus('idle');
    setErrorMsg(null);

    try {
      let base64Data = '';
      let mimeType = selectedFile.mimeType;

      // 1. Prepare Data
      if (selectedFile.type === 'file' && selectedFile.file) {
        setStatus('uploading');
        base64Data = await fileToGenerativePart(selectedFile.file);
      } else if (selectedFile.type === 'url' && selectedFile.url) {
        setStatus('fetching');
        base64Data = await urlToBase64(selectedFile.url);
      } else {
        throw new Error("Invalid file source.");
      }

      // 2. Call Gemini (passing the apiKey)
      setStatus('analyzing');
      const analysisText = await analyzeVideo(
        apiKey,
        base64Data,
        mimeType,
        mode,
        language
      );

      setResult({
        text: analysisText,
        mode: mode,
        timestamp: Date.now()
      });
      setStatus('completed');

    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : "Failed to analyze video");

      // If error is related to auth, open settings
      if (err instanceof Error && (err.message.includes('API Key') || err.message.includes('403'))) {
        setIsSettingsOpen(true);
      }
    }
  };

  const handleUpdateResult = (newText: string, newMode: AnalysisMode) => {
    setResult(prev => prev ? {
      ...prev,
      text: newText,
      mode: newMode,
      timestamp: Date.now()
    } : null);
  };

  const isProcessing = status === 'uploading' || status === 'analyzing' || status === 'fetching';

  return (
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-[#0f172a] to-black text-slate-200">

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveApiKey}
        currentKey={apiKey}
      />

      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        apiKey={apiKey}
      />

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">VideoLens AI</h1>
              <p className="text-xs text-blue-400 font-medium">Powered by Gemini 3 Flash</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(l => l === 'en' ? 'th' : 'en')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors text-xs font-medium"
            >
              <Languages className="w-3.5 h-3.5" />
              {language === 'en' ? 'English Output' : 'Thai Output (ไทย)'}
            </button>

            {/* Admin TikTok Rules Button */}
            <button
              onClick={() => setIsAdminOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 hover:border-purple-500/50 transition-colors text-xs font-medium text-purple-400"
              title="TikTok Rules Admin"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-full border transition-all duration-200 
                ${!apiKey ? 'bg-red-500/10 border-red-500/50 text-red-400 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}
              `}
              title="API Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* Intro / Hero */}
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Video Understanding, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Simplified</span>.
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Upload a video clip or enter a URL to extract summaries, transcribe audio, or analyze safety compliance instantly.
          </p>
          {!apiKey && (
            <div className="inline-block mt-4 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm">
              ⚠️ Please click the gear icon <Settings className="w-3 h-3 inline mx-1" /> to set your API Key first.
            </div>
          )}
        </div>

        {/* Controls Section */}
        <div className="w-full max-w-3xl mx-auto mb-8">
          {/* Mode Selection */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur-sm mb-6">
            {[
              { id: AnalysisMode.SUMMARY, label: 'Summary', icon: '📝' },
              { id: AnalysisMode.TRANSCRIPT, label: 'Transcript', icon: '💬' },
              { id: AnalysisMode.KEY_POINTS, label: 'Key Points', icon: '🎯' },
              { id: AnalysisMode.SAFETY, label: 'Safety Check', icon: '🛡️' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                disabled={isProcessing}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200
                    ${mode === m.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }
                  `}
              >
                <span>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Area */}
        <VideoUploader
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
          disabled={isProcessing}
        />

        {/* Action Button */}
        <div className="flex justify-center mb-12">
          <button
            onClick={handleAnalyze}
            disabled={!selectedFile || isProcessing}
            className={`
              relative overflow-hidden group flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300
              ${!selectedFile
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : isProcessing
                  ? 'bg-slate-700 text-blue-300 cursor-wait border border-blue-500/30'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl shadow-blue-900/20 hover:shadow-blue-900/40 hover:scale-105 active:scale-95'
              }
            `}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {status === 'fetching' ? 'Fetching Video...' : status === 'uploading' ? 'Preparing File...' : 'Analyzing with Gemini...'}
              </>
            ) : (
              <>
                <Sparkles className={`w-5 h-5 ${selectedFile ? 'animate-pulse' : ''}`} />
                Generate {mode === AnalysisMode.TRANSCRIPT ? 'Transcription' : 'Analysis'}
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="max-w-3xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Results */}
        <ResultDisplay
          result={result}
          loading={status === 'analyzing'}
          apiKey={apiKey}
          onUpdateResult={handleUpdateResult}
        />

      </main>
    </div>
  );
};

export default App;