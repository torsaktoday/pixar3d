import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Terminal, FileText, ShieldAlert, List, AlertTriangle, CheckCircle, RefreshCw, ArrowRight, FileCheck, Clapperboard, Wand2, Image as ImageIcon, Download, Search } from 'lucide-react';
import { AnalysisResult, AnalysisMode, ProductionGuide, ProductionScene, ViolationCheckResult } from '../types';
import { rewriteScript, generateProductionGuide, recheckScriptViolation, createPromptCard, downloadImage, downloadAllScenePrompts } from '../services/geminiService';

interface ResultDisplayProps {
  result: AnalysisResult | null;
  loading: boolean;
  apiKey: string;
  onUpdateResult?: (text: string, mode: AnalysisMode) => void;
}

interface SafetyData {
  riskScore: number;
  violations: string[];
  explanation: string;
  transcript_summary: string;
}

const getIconForMode = (mode: AnalysisMode) => {
  switch (mode) {
    case AnalysisMode.SUMMARY: return <FileText className="w-5 h-5 text-purple-400" />;
    case AnalysisMode.TRANSCRIPT: return <Terminal className="w-5 h-5 text-green-400" />;
    case AnalysisMode.KEY_POINTS: return <List className="w-5 h-5 text-blue-400" />;
    case AnalysisMode.SAFETY: return <ShieldAlert className="w-5 h-5 text-red-400" />;
    default: return <FileText className="w-5 h-5" />;
  }
};

const getTitleForMode = (mode: AnalysisMode) => {
  switch (mode) {
    case AnalysisMode.SAFETY: return 'TikTok Safety Check';
    case AnalysisMode.SUMMARY: return 'Video Summary';
    case AnalysisMode.TRANSCRIPT: return 'Audio Transcription';
    case AnalysisMode.KEY_POINTS: return 'Key Points & Highlights';
    default: return 'Analysis Result';
  }
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, loading, apiKey, onUpdateResult }) => {
  const [copied, setCopied] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [fixedScript, setFixedScript] = useState<string | null>(null);
  const [usedOriginal, setUsedOriginal] = useState(false);

  // Creative Studio State
  const [generatingGuide, setGeneratingGuide] = useState(false);
  const [remixTopic, setRemixTopic] = useState('');
  const [visualStyle, setVisualStyle] = useState<'REAL' | 'PIXAR'>('PIXAR');
  const [productionGuide, setProductionGuide] = useState<ProductionGuide | null>(null);

  // Re-check Violation State
  const [recheckingScript, setRecheckingScript] = useState(false);
  const [recheckResult, setRecheckResult] = useState<ViolationCheckResult | null>(null);
  const [downloadingImages, setDownloadingImages] = useState(false);
  const [generatingImageIndex, setGeneratingImageIndex] = useState<number | null>(null);

  // Reset states when result changes
  React.useEffect(() => {
    setFixedScript(null);
    setProductionGuide(null);
    setRemixTopic('');
    setUsedOriginal(false);
    setRecheckResult(null);
  }, [result]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFixScript = async (safetyData: SafetyData) => {
    if (!apiKey) return;
    setRewriting(true);
    try {
      const newScript = await rewriteScript(apiKey, safetyData.transcript_summary, safetyData.violations);
      setFixedScript(newScript);
      setUsedOriginal(false);
    } catch (error) {
      console.error(error);
      alert("Failed to rewrite script. Please check your API key.");
    } finally {
      setRewriting(false);
    }
  };

  const handleUseOriginal = (safetyData: SafetyData) => {
    setFixedScript(safetyData.transcript_summary);
    setUsedOriginal(true);
  };

  const handleApplyScript = () => {
    if (fixedScript && onUpdateResult) {
      onUpdateResult(fixedScript, AnalysisMode.TRANSCRIPT);
    }
  };

  const handleGenerateGuide = async () => {
    if (!fixedScript || !apiKey) return;
    setGeneratingGuide(true);
    try {
      const guide = await generateProductionGuide(apiKey, fixedScript, visualStyle, remixTopic);
      setProductionGuide(guide);
    } catch (error) {
      console.error(error);
      alert("Failed to generate production guide.");
    } finally {
      setGeneratingGuide(false);
    }
  };

  // Re-check script for violations
  const handleRecheckScript = async (scriptText: string) => {
    if (!apiKey) {
      alert("กรุณาตั้งค่า API Key ก่อน");
      return;
    }
    setRecheckingScript(true);
    setRecheckResult(null);
    try {
      const result = await recheckScriptViolation(apiKey, scriptText);
      setRecheckResult(result);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการตรวจสอบ");
    } finally {
      setRecheckingScript(false);
    }
  };

  // Generate and download single scene prompt card
  const handleDownloadPromptCard = (prompt: string, sceneNumber: number) => {
    setGeneratingImageIndex(sceneNumber - 1);
    try {
      const dataUrl = createPromptCard(prompt, sceneNumber);
      if (dataUrl) {
        downloadImage(dataUrl, `scene_${sceneNumber}_prompt.png`);
      }
    } catch (error) {
      console.error(error);
      alert("ไม่สามารถสร้างรูปภาพได้");
    } finally {
      setTimeout(() => setGeneratingImageIndex(null), 500);
    }
  };

  // Download all scene prompts as images
  const handleDownloadAllPrompts = () => {
    if (!productionGuide) return;
    setDownloadingImages(true);
    try {
      downloadAllScenePrompts(productionGuide.scenes, 'videolens_scene');
      setTimeout(() => setDownloadingImages(false), productionGuide.scenes.length * 500 + 1000);
    } catch (error) {
      console.error(error);
      alert("ไม่สามารถดาวน์โหลดรูปภาพได้");
      setDownloadingImages(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-8 p-8 bg-slate-800/50 rounded-xl border border-slate-700 animate-pulse">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-8 h-8 rounded-full bg-slate-700"></div>
          <div className="h-4 w-48 bg-slate-700 rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-700 rounded w-full"></div>
          <div className="h-4 bg-slate-700 rounded w-5/6"></div>
          <div className="h-4 bg-slate-700 rounded w-4/6"></div>
        </div>
        <div className="mt-6 flex justify-center">
          <span className="text-blue-400 text-sm font-medium animate-bounce">Analyzing content with Gemini 3 Flash...</span>
        </div>
      </div>
    );
  }

  if (!result) return null;

  // Render logic for SAFETY mode (JSON parsing)
  if (result.mode === AnalysisMode.SAFETY) {
    let safetyData: SafetyData | null = null;
    try {
      safetyData = JSON.parse(result.text);
    } catch (e) {
      console.warn("Could not parse safety JSON, falling back to text", e);
    }

    if (safetyData) {
      const isSafe = safetyData.riskScore < 30;
      const isModerate = safetyData.riskScore >= 30 && safetyData.riskScore < 70;

      const scoreColor = isSafe ? "text-green-400" : isModerate ? "text-yellow-400" : "text-red-500";
      const progressColor = isSafe ? "bg-green-500" : isModerate ? "bg-yellow-500" : "bg-red-500";

      return (
        <div className="w-full max-w-3xl mx-auto mt-8 space-y-8 animate-fade-in-up">

          {/* 1. Safety Report Card */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900/50 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                  <ShieldAlert className={`w-5 h-5 ${scoreColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-white">TikTok Safety Check</h3>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Risk Meter */}
              <div className="text-center">
                <div className="text-sm text-slate-400 mb-2 uppercase tracking-wider font-semibold">Violation Risk Score</div>
                <div className={`text-5xl font-bold mb-4 ${scoreColor}`}>
                  {safetyData.riskScore}%
                </div>
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${progressColor} transition-all duration-1000 ease-out`}
                    style={{ width: `${safetyData.riskScore}%` }}
                  />
                </div>
                <p className="mt-4 text-slate-300 italic">"{safetyData.explanation}"</p>
              </div>

              {/* Violations List */}
              {safetyData.violations.length > 0 ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-5">
                  <h4 className="flex items-center gap-2 text-red-400 font-semibold mb-3">
                    <AlertTriangle className="w-4 h-4" /> Detected Issues
                  </h4>
                  <ul className="space-y-2">
                    {safetyData.violations.map((v, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-5 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <h4 className="text-green-400 font-semibold">Good to go!</h4>
                    <p className="text-sm text-slate-400">No major violations detected.</p>
                  </div>
                </div>
              )}

              {/* Actions Container */}
              {!fixedScript && (
                <div className="space-y-3 pt-2">
                  {/* Option 1: Fix (Only if risks exist or strictly requested) */}
                  {safetyData.riskScore > 0 && (
                    <button
                      onClick={() => handleFixScript(safetyData!)}
                      disabled={rewriting}
                      className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
                                    ${isSafe
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600' // Secondary style if safe
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20' // Primary style if unsafe
                        }
                                `}
                    >
                      {rewriting ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Fixing Script...</>
                      ) : (
                        <><RefreshCw className="w-4 h-4" /> {isSafe ? "Optional: Optimize Script" : "Auto-Fix Script (Required)"}</>
                      )}
                    </button>
                  )}

                  {/* Option 2: Proceed (Available if safe) */}
                  {isSafe && (
                    <button
                      onClick={() => handleUseOriginal(safetyData!)}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20 active:scale-95 animate-pulse-slow"
                    >
                      <Clapperboard className="w-5 h-5" /> Launch Creative Studio
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. Script & Creative Studio */}
          {fixedScript && (
            <div className={`bg-slate-800 rounded-xl border overflow-hidden shadow-2xl animate-fade-in ${usedOriginal ? 'border-purple-500/30' : 'border-green-500/30'}`}>
              {/* Header */}
              <div className={`px-6 py-4 border-b flex justify-between items-center ${usedOriginal ? 'bg-purple-900/10 border-purple-500/30' : 'bg-green-900/10 border-green-500/30'}`}>
                <h4 className={`${usedOriginal ? 'text-purple-400' : 'text-green-400'} font-medium flex items-center gap-2`}>
                  {usedOriginal ? <Clapperboard className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  {usedOriginal ? "Original Script (Safe)" : "Safe Version Ready"}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApplyScript}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-md transition-colors"
                  >
                    View as Transcript
                  </button>
                  <button
                    onClick={() => handleCopy(fixedScript)}
                    className={`text-xs hover:text-white flex items-center gap-1 px-2 py-1.5 ${usedOriginal ? 'text-purple-300' : 'text-green-300'}`}
                  >
                    {copied ? "Copied" : "Copy"} <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Script Preview with Re-check */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">บทคำพูด / Script</span>
                    <button
                      onClick={() => handleRecheckScript(fixedScript)}
                      disabled={recheckingScript}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-medium transition-colors border border-blue-500/30 disabled:opacity-50"
                    >
                      {recheckingScript ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          กำลังตรวจสอบ...
                        </>
                      ) : (
                        <>
                          <Search className="w-3 h-3" />
                          ตรวจสอบการละเมิดอีกครั้ง
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-slate-300 text-sm max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {fixedScript}
                  </div>

                  {/* Re-check Result */}
                  {recheckResult && (
                    <div className={`mt-4 p-4 rounded-lg border ${recheckResult.isViolating
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-green-500/10 border-green-500/30'
                      }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {recheckResult.isViolating ? (
                          <>
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            <span className="font-medium text-red-400">พบการละเมิด ({recheckResult.violatedRules.length} รายการ)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="font-medium text-green-400">ผ่านการตรวจสอบ ไม่พบการละเมิด</span>
                          </>
                        )}
                        <span className="ml-auto text-xs text-slate-500">Risk Score: {recheckResult.overallRisk}%</span>
                      </div>
                      <p className="text-sm text-slate-300">{recheckResult.explanation}</p>

                      {recheckResult.violatedRules.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {recheckResult.violatedRules.map((v, idx) => (
                            <div key={idx} className="p-2 bg-slate-900/50 rounded text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${v.severity === 'critical' ? 'bg-red-500/30 text-red-300' :
                                  v.severity === 'high' ? 'bg-orange-500/30 text-orange-300' :
                                    v.severity === 'medium' ? 'bg-yellow-500/30 text-yellow-300' :
                                      'bg-slate-500/30 text-slate-300'
                                  }`}>{v.severity}</span>
                                <span className="text-slate-400">{v.ruleTitle}</span>
                              </div>
                              <p className="text-slate-300">{v.violation}</p>
                              <p className="text-blue-400 mt-1">💡 {v.suggestion}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Creative Studio Controls */}
                <div className="border-t border-slate-700 pt-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                    <Clapperboard className="w-6 h-6 text-purple-400" />
                    Creative Studio <span className="text-xs font-normal text-slate-500 px-2 py-0.5 border border-slate-600 rounded-full">Beta</span>
                  </h3>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Remix Topic */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-purple-400" /> Remix Topic (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Acid Reflux, Office Syndrome (Leave empty to use original topic)"
                        value={remixTopic}
                        onChange={(e) => setRemixTopic(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-xs text-slate-500">
                        AI will rewrite the script for this topic while keeping the exact same structure/hook.
                      </p>
                    </div>

                    {/* Visual Style */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-purple-400" /> Visual Style
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setVisualStyle('PIXAR')}
                          className={`px-4 py-2 rounded-lg text-sm border transition-all
                                   ${visualStyle === 'PIXAR' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}
                                 `}
                        >
                          🧸 Pixar 3D
                        </button>
                        <button
                          onClick={() => setVisualStyle('REAL')}
                          className={`px-4 py-2 rounded-lg text-sm border transition-all
                                   ${visualStyle === 'REAL' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}
                                 `}
                        >
                          🎥 Real Person
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateGuide}
                    disabled={generatingGuide}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-70"
                  >
                    {generatingGuide ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" /> Generating Production Assets...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Clapperboard className="w-5 h-5" /> Generate Production Guide
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Production Guide Results */}
          {productionGuide && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-xl font-bold text-white">Production Breakdown</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full border border-purple-400/20">
                    {productionGuide.style === 'PIXAR' ? '🧸 3D Animation' : '🎥 Live Action'}
                  </span>
                  <button
                    onClick={handleDownloadAllPrompts}
                    disabled={downloadingImages}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {downloadingImages ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        ดาวน์โหลด...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        ดาวน์โหลดทั้งหมด
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid gap-6">
                {productionGuide.scenes.map((scene, idx) => (
                  <div key={idx} className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-md hover:border-purple-500/50 transition-colors">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="px-3 py-1 bg-slate-900 rounded-md text-purple-400 font-mono text-sm font-bold border border-slate-700">
                        {scene.timestamp}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg text-white font-medium mb-1">"{scene.script}"</p>
                        <p className="text-sm text-slate-400 italic flex items-center gap-1">
                          🎭 {scene.actionGuide}
                        </p>
                      </div>
                    </div>

                    <div className="bg-black/30 rounded-lg p-4 border border-slate-700/50">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Image/Video Prompt</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(scene.visualPrompt)}
                            className="text-xs text-blue-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-700/50 transition-colors"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                          <button
                            onClick={() => handleDownloadPromptCard(scene.visualPrompt, idx + 1)}
                            disabled={generatingImageIndex === idx}
                            className="text-xs text-green-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                          >
                            {generatingImageIndex === idx ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" /> สร้าง...
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-3 h-3" /> Generate & Download
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 font-mono leading-relaxed break-words">
                        {scene.visualPrompt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      );
    }
  }

  // Default Renderer (Markdown) for other modes
  return (
    <div className="w-full max-w-3xl mx-auto mt-8 animate-fade-in-up">
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/50 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
              {getIconForMode(result.mode)}
            </div>
            <h3 className="text-lg font-semibold text-white">
              {getTitleForMode(result.mode)}
            </h3>
          </div>
          <button
            onClick={() => handleCopy(result.text)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy Text'}
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[600px] text-slate-300 leading-relaxed">
          <div className="prose prose-invert prose-blue max-w-none">
            <ReactMarkdown>{result.text}</ReactMarkdown>
          </div>
        </div>
        <div className="px-6 py-3 bg-slate-900/30 border-t border-slate-700 text-xs text-slate-500 flex justify-between">
          <span>Generated by Gemini 3 Flash</span>
          <span>{new Date(result.timestamp).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};