import React, { useState, useEffect } from 'react';
import {
    Shield, Plus, Search, RefreshCw, Download, Upload, Trash2, Edit2,
    Check, X, AlertTriangle, ChevronDown, ChevronUp, Settings,
    Database, Clock, Activity, ArrowLeft, Sparkles
} from 'lucide-react';
import {
    TikTokRule, RuleCategory, RulesMetadata, AdminView
} from '../types';
import {
    loadRules, saveRules, addRule, updateRule, deleteRule, searchRules,
    getMetadata, generateRulesFromSearch, exportRules, importRules, resetToDefaultRules
} from '../services/tiktokRulesService';

interface AdminDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
}

const CATEGORY_LABELS: Record<RuleCategory, string> = {
    overclaims: '🎯 Overclaims / กล่าวอ้างเกินจริง',
    medical_supplement: '💊 Medical/Supplement / ยาและอาหารเสริม',
    forbidden_pairings: '🔗 Forbidden Pairings / คู่คำต้องห้าม',
    violence_safety: '⚠️ Violence/Safety / ความรุนแรง',
    platform_mentions: '📱 Platform Mentions / กล่าวถึงแพลตฟอร์ม',
    before_after: '📸 Before/After / ก่อน-หลัง',
    other: '📋 Other / อื่นๆ'
};

const SEVERITY_COLORS: Record<string, string> = {
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30'
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, apiKey }) => {
    const [currentView, setCurrentView] = useState<AdminView>('dashboard');
    const [rules, setRules] = useState<TikTokRule[]>([]);
    const [metadata, setMetadata] = useState<RulesMetadata | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<TikTokRule[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedRule, setExpandedRule] = useState<string | null>(null);
    const [editingRule, setEditingRule] = useState<TikTokRule | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // New rule form state
    const [newRule, setNewRule] = useState<Partial<TikTokRule>>({
        category: 'other',
        title: '',
        description: '',
        forbiddenWords: [],
        forbiddenPairings: [],
        examples: [],
        severity: 'medium',
        isActive: true
    });
    const [newForbiddenWord, setNewForbiddenWord] = useState('');
    const [newExample, setNewExample] = useState('');
    const [newPairingWord1, setNewPairingWord1] = useState('');
    const [newPairingWord2, setNewPairingWord2] = useState('');

    useEffect(() => {
        if (isOpen) {
            refreshData();
        }
    }, [isOpen]);

    const refreshData = () => {
        setRules(loadRules());
        setMetadata(getMetadata());
    };

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSearch = () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        setSearchResults(searchRules(searchQuery));
    };

    const handleGenerateRules = async () => {
        if (!apiKey) {
            showNotification('error', 'กรุณาตั้งค่า API Key ก่อน');
            return;
        }
        setIsGenerating(true);
        try {
            await generateRulesFromSearch(apiKey);
            refreshData();
            showNotification('success', 'สร้างกฎใหม่จาก AI สำเร็จ!');
        } catch (error) {
            showNotification('error', 'เกิดข้อผิดพลาดในการสร้างกฎ');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddRule = () => {
        if (!newRule.title || !newRule.description) {
            showNotification('error', 'กรุณากรอกชื่อและคำอธิบายกฎ');
            return;
        }

        addRule(newRule as Omit<TikTokRule, 'id' | 'createdAt' | 'updatedAt'>);
        refreshData();
        setShowAddForm(false);
        resetNewRuleForm();
        showNotification('success', 'เพิ่มกฎใหม่สำเร็จ!');
    };

    const handleUpdateRule = () => {
        if (!editingRule) return;
        updateRule(editingRule.id, editingRule);
        refreshData();
        setEditingRule(null);
        showNotification('success', 'อัพเดทกฎสำเร็จ!');
    };

    const handleDeleteRule = (id: string) => {
        if (confirm('คุณแน่ใจหรือไม่ที่จะลบกฎนี้?')) {
            deleteRule(id);
            refreshData();
            showNotification('success', 'ลบกฎสำเร็จ!');
        }
    };

    const handleToggleActive = (id: string, isActive: boolean) => {
        updateRule(id, { isActive: !isActive });
        refreshData();
    };

    const handleExport = () => {
        const data = exportRules();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tiktok-rules-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('success', 'ส่งออกข้อมูลสำเร็จ!');
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (importRules(content)) {
                refreshData();
                showNotification('success', 'นำเข้าข้อมูลสำเร็จ!');
            } else {
                showNotification('error', 'ไฟล์ไม่ถูกต้อง');
            }
        };
        reader.readAsText(file);
    };

    const handleReset = () => {
        if (confirm('คุณแน่ใจหรือไม่ที่จะรีเซ็ตกฎทั้งหมดเป็นค่าเริ่มต้น? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
            resetToDefaultRules();
            refreshData();
            showNotification('success', 'รีเซ็ตกฎเป็นค่าเริ่มต้นสำเร็จ!');
        }
    };

    const resetNewRuleForm = () => {
        setNewRule({
            category: 'other',
            title: '',
            description: '',
            forbiddenWords: [],
            forbiddenPairings: [],
            examples: [],
            severity: 'medium',
            isActive: true
        });
        setNewForbiddenWord('');
        setNewExample('');
        setNewPairingWord1('');
        setNewPairingWord2('');
    };

    const addForbiddenWord = () => {
        if (newForbiddenWord.trim()) {
            setNewRule(prev => ({
                ...prev,
                forbiddenWords: [...(prev.forbiddenWords || []), newForbiddenWord.trim()]
            }));
            setNewForbiddenWord('');
        }
    };

    const addExample = () => {
        if (newExample.trim()) {
            setNewRule(prev => ({
                ...prev,
                examples: [...(prev.examples || []), newExample.trim()]
            }));
            setNewExample('');
        }
    };

    const addPairing = () => {
        if (newPairingWord1.trim() && newPairingWord2.trim()) {
            setNewRule(prev => ({
                ...prev,
                forbiddenPairings: [...(prev.forbiddenPairings || []), { word1: newPairingWord1.trim(), word2: newPairingWord2.trim() }]
            }));
            setNewPairingWord1('');
            setNewPairingWord2('');
        }
    };

    if (!isOpen) return null;

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-hidden">
            {/* Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg border flex items-center gap-2 animate-fade-in ${notification.type === 'success'
                        ? 'bg-green-500/20 border-green-500/30 text-green-400'
                        : 'bg-red-500/20 border-red-500/30 text-red-400'
                    }`}>
                    {notification.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {notification.message}
                </div>
            )}

            <div className="h-full overflow-y-auto">
                <div className="max-w-6xl mx-auto p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Shield className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">TikTok Rules Admin</h1>
                                    <p className="text-sm text-slate-400">จัดการกฎและนโยบาย TikTok</p>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center gap-2">
                            {(['dashboard', 'rules', 'search', 'generator'] as AdminView[]).map((view) => (
                                <button
                                    key={view}
                                    onClick={() => setCurrentView(view)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === view
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                        }`}
                                >
                                    {view === 'dashboard' && '📊 Dashboard'}
                                    {view === 'rules' && '📋 กฎทั้งหมด'}
                                    {view === 'search' && '🔍 ค้นหา'}
                                    {view === 'generator' && '✨ Auto-Generate'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dashboard View */}
                    {currentView === 'dashboard' && metadata && (
                        <div className="space-y-6">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Database className="w-5 h-5 text-blue-400" />
                                        <span className="text-slate-400 text-sm">กฎทั้งหมด</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white">{metadata.totalRules}</div>
                                </div>
                                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Activity className="w-5 h-5 text-green-400" />
                                        <span className="text-slate-400 text-sm">กฎที่ใช้งาน</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white">{metadata.activeRules}</div>
                                </div>
                                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Clock className="w-5 h-5 text-purple-400" />
                                        <span className="text-slate-400 text-sm">อัพเดทล่าสุด</span>
                                    </div>
                                    <div className="text-lg font-medium text-white">{formatDate(metadata.lastUpdated)}</div>
                                </div>
                                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Settings className="w-5 h-5 text-orange-400" />
                                        <span className="text-slate-400 text-sm">Version</span>
                                    </div>
                                    <div className="text-lg font-medium text-white">{metadata.version}</div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                                <h3 className="text-lg font-semibold text-white mb-4">การดำเนินการด่วน</h3>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => { setCurrentView('rules'); setShowAddForm(true); }}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> เพิ่มกฎใหม่
                                    </button>
                                    <button
                                        onClick={handleGenerateRules}
                                        disabled={isGenerating || !apiKey}
                                        className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {isGenerating ? 'กำลังสร้าง...' : 'Auto-Generate กฎจาก AI'}
                                    </button>
                                    <button
                                        onClick={handleExport}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                                    >
                                        <Download className="w-4 h-4" /> Export
                                    </button>
                                    <label className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 cursor-pointer transition-colors">
                                        <Upload className="w-4 h-4" /> Import
                                        <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                                    </label>
                                    <button
                                        onClick={handleReset}
                                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg flex items-center gap-2 transition-colors border border-red-500/30"
                                    >
                                        <RefreshCw className="w-4 h-4" /> Reset เป็นค่าเริ่มต้น
                                    </button>
                                </div>
                            </div>

                            {/* Rules by Category */}
                            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                                <h3 className="text-lg font-semibold text-white mb-4">กฎตามหมวดหมู่</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {(Object.entries(CATEGORY_LABELS) as [RuleCategory, string][]).map(([cat, label]) => {
                                        const count = rules.filter(r => r.category === cat).length;
                                        return (
                                            <div
                                                key={cat}
                                                className="bg-slate-900 rounded-lg p-4 border border-slate-700 hover:border-purple-500/50 transition-colors cursor-pointer"
                                                onClick={() => {
                                                    setSearchQuery(cat);
                                                    setCurrentView('search');
                                                    setSearchResults(rules.filter(r => r.category === cat));
                                                }}
                                            >
                                                <div className="text-2xl mb-2">{label.split(' ')[0]}</div>
                                                <div className="text-sm text-slate-400 mb-1">{label.split('/')[1]?.trim() || label}</div>
                                                <div className="text-xl font-bold text-white">{count}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rules List View */}
                    {currentView === 'rules' && (
                        <div className="space-y-4">
                            {/* Add Rule Form */}
                            {showAddForm && (
                                <div className="bg-slate-800 rounded-xl p-6 border border-purple-500/30 mb-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                            <Plus className="w-5 h-5 text-purple-400" /> เพิ่มกฎใหม่
                                        </h3>
                                        <button onClick={() => { setShowAddForm(false); resetNewRuleForm(); }} className="text-slate-400 hover:text-white">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm text-slate-400 mb-2">หมวดหมู่</label>
                                            <select
                                                value={newRule.category}
                                                onChange={(e) => setNewRule(prev => ({ ...prev, category: e.target.value as RuleCategory }))}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                            >
                                                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-400 mb-2">ความรุนแรง</label>
                                            <select
                                                value={newRule.severity}
                                                onChange={(e) => setNewRule(prev => ({ ...prev, severity: e.target.value as TikTokRule['severity'] }))}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                                <option value="critical">Critical</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm text-slate-400 mb-2">ชื่อกฎ</label>
                                        <input
                                            type="text"
                                            value={newRule.title}
                                            onChange={(e) => setNewRule(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="เช่น: ห้ามใช้คำโฆษณาเกินจริง"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm text-slate-400 mb-2">คำอธิบาย</label>
                                        <textarea
                                            value={newRule.description}
                                            onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="อธิบายรายละเอียดของกฎ..."
                                            rows={3}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500"
                                        />
                                    </div>

                                    {/* Forbidden Words */}
                                    <div className="mb-4">
                                        <label className="block text-sm text-slate-400 mb-2">คำต้องห้าม</label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={newForbiddenWord}
                                                onChange={(e) => setNewForbiddenWord(e.target.value)}
                                                placeholder="เพิ่มคำต้องห้าม..."
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500"
                                                onKeyDown={(e) => e.key === 'Enter' && addForbiddenWord()}
                                            />
                                            <button onClick={addForbiddenWord} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {newRule.forbiddenWords?.map((word, idx) => (
                                                <span key={idx} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm flex items-center gap-2">
                                                    {word}
                                                    <button onClick={() => setNewRule(prev => ({
                                                        ...prev,
                                                        forbiddenWords: prev.forbiddenWords?.filter((_, i) => i !== idx)
                                                    }))}>
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Forbidden Pairings */}
                                    <div className="mb-4">
                                        <label className="block text-sm text-slate-400 mb-2">คู่คำต้องห้าม</label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={newPairingWord1}
                                                onChange={(e) => setNewPairingWord1(e.target.value)}
                                                placeholder="คำที่ 1"
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500"
                                            />
                                            <span className="text-slate-500 flex items-center">+</span>
                                            <input
                                                type="text"
                                                value={newPairingWord2}
                                                onChange={(e) => setNewPairingWord2(e.target.value)}
                                                placeholder="คำที่ 2"
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500"
                                            />
                                            <button onClick={addPairing} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {newRule.forbiddenPairings?.map((pair, idx) => (
                                                <span key={idx} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm flex items-center gap-2">
                                                    "{pair.word1}" + "{pair.word2}"
                                                    <button onClick={() => setNewRule(prev => ({
                                                        ...prev,
                                                        forbiddenPairings: prev.forbiddenPairings?.filter((_, i) => i !== idx)
                                                    }))}>
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Examples */}
                                    <div className="mb-6">
                                        <label className="block text-sm text-slate-400 mb-2">ตัวอย่างการละเมิด</label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={newExample}
                                                onChange={(e) => setNewExample(e.target.value)}
                                                placeholder="เพิ่มตัวอย่าง..."
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500"
                                                onKeyDown={(e) => e.key === 'Enter' && addExample()}
                                            />
                                            <button onClick={addExample} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {newRule.examples?.map((ex, idx) => (
                                                <span key={idx} className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm flex items-center gap-2">
                                                    {ex}
                                                    <button onClick={() => setNewRule(prev => ({
                                                        ...prev,
                                                        examples: prev.examples?.filter((_, i) => i !== idx)
                                                    }))}>
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleAddRule}
                                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium transition-colors"
                                    >
                                        บันทึกกฎใหม่
                                    </button>
                                </div>
                            )}

                            {/* Add Button */}
                            {!showAddForm && (
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-xl text-slate-400 hover:text-purple-400 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Plus className="w-5 h-5" /> เพิ่มกฎใหม่
                                </button>
                            )}

                            {/* Rules List */}
                            {rules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
                                >
                                    <div
                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors"
                                        onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleToggleActive(rule.id, rule.isActive); }}
                                                className={`w-10 h-6 rounded-full relative transition-colors ${rule.isActive ? 'bg-green-600' : 'bg-slate-600'
                                                    }`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${rule.isActive ? 'translate-x-5' : 'translate-x-1'
                                                    }`} />
                                            </button>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-white">{rule.title}</h4>
                                                    <span className={`px-2 py-0.5 rounded text-xs border ${SEVERITY_COLORS[rule.severity]}`}>
                                                        {rule.severity}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-400">{CATEGORY_LABELS[rule.category]}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingRule(rule); }}
                                                className="p-2 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule.id); }}
                                                className="p-2 hover:bg-red-600/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            {expandedRule === rule.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                        </div>
                                    </div>

                                    {expandedRule === rule.id && (
                                        <div className="p-4 border-t border-slate-700 bg-slate-900/50 space-y-4">
                                            <p className="text-slate-300">{rule.description}</p>

                                            {rule.forbiddenWords.length > 0 && (
                                                <div>
                                                    <h5 className="text-sm text-slate-400 mb-2">คำต้องห้าม:</h5>
                                                    <div className="flex flex-wrap gap-2">
                                                        {rule.forbiddenWords.map((word, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm">{word}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {rule.forbiddenPairings.length > 0 && (
                                                <div>
                                                    <h5 className="text-sm text-slate-400 mb-2">คู่คำต้องห้าม:</h5>
                                                    <div className="flex flex-wrap gap-2">
                                                        {rule.forbiddenPairings.map((pair, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-sm">
                                                                "{pair.word1}" + "{pair.word2}"
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {rule.examples.length > 0 && (
                                                <div>
                                                    <h5 className="text-sm text-slate-400 mb-2">ตัวอย่างการละเมิด:</h5>
                                                    <ul className="space-y-1">
                                                        {rule.examples.map((ex, idx) => (
                                                            <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                                                                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                                                {ex}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
                                                สร้างเมื่อ: {formatDate(rule.createdAt)} | อัพเดทล่าสุด: {formatDate(rule.updatedAt)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Search View */}
                    {currentView === 'search' && (
                        <div className="space-y-6">
                            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Search className="w-5 h-5 text-blue-400" /> ค้นหาและเปรียบเทียบกฎ
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="ค้นหาคำต้องห้าม, ชื่อกฎ, หรือตัวอย่าง..."
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                    />
                                    <button
                                        onClick={handleSearch}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                                    >
                                        ค้นหา
                                    </button>
                                </div>
                            </div>

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-lg font-medium text-white">พบ {searchResults.length} ผลลัพธ์</h4>
                                    {searchResults.map((rule) => (
                                        <div key={rule.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2 py-0.5 rounded text-xs border ${SEVERITY_COLORS[rule.severity]}`}>
                                                    {rule.severity}
                                                </span>
                                                <h4 className="font-medium text-white">{rule.title}</h4>
                                            </div>
                                            <p className="text-sm text-slate-400 mb-3">{rule.description}</p>
                                            {rule.forbiddenWords.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {rule.forbiddenWords.map((word, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs">{word}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {searchQuery && searchResults.length === 0 && (
                                <div className="text-center py-12 text-slate-400">
                                    ไม่พบผลลัพธ์สำหรับ "{searchQuery}"
                                </div>
                            )}
                        </div>
                    )}

                    {/* Generator View */}
                    {currentView === 'generator' && (
                        <div className="space-y-6">
                            <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-8 border border-purple-500/30">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                                        <Sparkles className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Auto-Generate TikTok Rules</h3>
                                        <p className="text-purple-300">ใช้ AI ค้นหาและสร้างกฎ TikTok อัตโนมัติจากข้อมูลปีปัจจุบัน</p>
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
                                    <h4 className="text-sm font-medium text-slate-300 mb-2">AI จะค้นหา:</h4>
                                    <ul className="text-sm text-slate-400 space-y-1">
                                        <li>• กฎและนโยบายชุมชน TikTok ล่าสุดปี {new Date().getFullYear()}</li>
                                        <li>• ข้อจำกัดด้านสุขภาพและการแพทย์</li>
                                        <li>• ข้อจำกัดด้านความงามและเครื่องสำอาง</li>
                                        <li>• กฎเกี่ยวกับความรุนแรงและความปลอดภัย</li>
                                        <li>• ข้อจำกัดด้านการโฆษณา</li>
                                    </ul>
                                </div>

                                {!apiKey && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                                        <p className="text-yellow-400 text-sm flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            กรุณาตั้งค่า Gemini API Key ในหน้าหลักก่อนใช้งานฟีเจอร์นี้
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={handleGenerateRules}
                                    disabled={isGenerating || !apiKey}
                                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-purple-900/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    {isGenerating ? (
                                        <>
                                            <RefreshCw className="w-6 h-6 animate-spin" />
                                            กำลังค้นหาและสร้างกฎ...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-6 h-6" />
                                            Generate กฎ TikTok อัตโนมัติ
                                        </>
                                    )}
                                </button>

                                {metadata && (
                                    <div className="mt-6 text-center text-sm text-slate-400">
                                        ข้อมูลอัพเดทล่าสุด: {formatDate(metadata.lastUpdated)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Rule Modal */}
            {editingRule && (
                <div className="fixed inset-0 z-[55] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700">
                        <div className="sticky top-0 bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">แก้ไขกฎ</h3>
                            <button onClick={() => setEditingRule(null)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">ชื่อกฎ</label>
                                <input
                                    type="text"
                                    value={editingRule.title}
                                    onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">คำอธิบาย</label>
                                <textarea
                                    value={editingRule.description}
                                    onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                                    rows={3}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">หมวดหมู่</label>
                                    <select
                                        value={editingRule.category}
                                        onChange={(e) => setEditingRule({ ...editingRule, category: e.target.value as RuleCategory })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                    >
                                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">ความรุนแรง</label>
                                    <select
                                        value={editingRule.severity}
                                        onChange={(e) => setEditingRule({ ...editingRule, severity: e.target.value as TikTokRule['severity'] })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={handleUpdateRule}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
                            >
                                บันทึกการเปลี่ยนแปลง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
