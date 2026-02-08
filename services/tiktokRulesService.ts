import { GoogleGenAI } from "@google/genai";
import { TikTokRule, RuleCategory, RulesMetadata, ViolationCheckResult } from "../types";

// Default TikTok Rules based on current knowledge
const DEFAULT_RULES: TikTokRule[] = [
    {
        id: 'rule-001',
        category: 'overclaims',
        title: 'Overclaims / การกล่าวอ้างเกินจริง',
        description: 'ห้ามกล่าวอ้างสรรพคุณเกินจริงที่ไม่มีหลักฐานทางวิทยาศาสตร์รองรับ',
        forbiddenWords: ['รักษาได้ทุกโรค', 'หายขาด', 'เห็นผล 100%', 'ขาวใน 3 วัน', 'ลดน้ำหนัก 10โล ใน 1 สัปดาห์', 'การันตี', 'รับรองผล'],
        forbiddenPairings: [],
        examples: ['ครีมนี้รักษาสิวได้หายขาด 100%', 'ลดน้ำหนักได้ 10 กิโลใน 7 วัน'],
        severity: 'critical',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'rule-002',
        category: 'medical_supplement',
        title: 'Forbidden Medical Words / คำต้องห้ามทางการแพทย์',
        description: 'ห้ามใช้คำที่เกี่ยวข้องกับการรักษาโรคหรือสรรพคุณทางยา',
        forbiddenWords: ['รักษา', 'บรรเทา', 'แก้โรค', 'ป้องกันโรค', 'ยับยั้ง', 'ฟื้นฟู', 'ต้านโรค', 'บำบัด', 'รักษาโรค', 'แก้ปัญหาสุขภาพ'],
        forbiddenPairings: [],
        examples: ['อาหารเสริมนี้ช่วยรักษาโรคเบาหวาน', 'ช่วยป้องกันมะเร็งได้'],
        severity: 'critical',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'rule-003',
        category: 'forbidden_pairings',
        title: 'Forbidden Word Pairings / คู่คำต้องห้าม',
        description: 'ห้ามใช้คำคู่กันที่อาจสื่อถึงสรรพคุณทางยา',
        forbiddenWords: [],
        forbiddenPairings: [
            { word1: 'กระตุ้น', word2: 'ระบบขับถ่าย' },
            { word1: 'ขจัด', word2: 'สิ่งอุดตัน' },
            { word1: 'ขจัด', word2: 'สารพิษ' },
            { word1: 'ลด', word2: 'ความอ้วน' },
            { word1: 'ลด', word2: 'ไขมัน' },
            { word1: 'ลด', word2: 'สิว' },
            { word1: 'ลด', word2: 'ฝ้า' },
            { word1: 'ลด', word2: 'กระ' },
            { word1: 'เร่ง', word2: 'เผาผลาญ' },
            { word1: 'ขาว', word2: 'ผิว' },
            { word1: 'ขาว', word2: 'หน้า' },
            { word1: 'ทำให้', word2: 'ขาว' },
        ],
        examples: ['กระตุ้นระบบขับถ่ายให้ทำงานดี', 'ช่วยลดไขมันสะสม'],
        severity: 'high',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'rule-004',
        category: 'violence_safety',
        title: 'Violence & Safety / ความรุนแรงและความปลอดภัย',
        description: 'ห้ามแสดงเนื้อหาเกี่ยวกับความรุนแรง อาวุธ เลือด หรือการกระทำอันตราย',
        forbiddenWords: ['ฆ่า', 'แทง', 'ยิง', 'ทำร้าย', 'ทารุณ', 'กลั่นแกล้ง', 'รังแก', 'บูลลี่'],
        forbiddenPairings: [],
        examples: ['แสดงอาวุธปืน', 'เนื้อหาที่มีเลือดหรือความรุนแรง'],
        severity: 'critical',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'rule-005',
        category: 'platform_mentions',
        title: 'Platform Mentions / การกล่าวถึงแพลตฟอร์มอื่น',
        description: 'ห้ามกล่าวถึงชื่อแพลตฟอร์มโซเชียลมีเดียอื่นโดยตรง',
        forbiddenWords: ['Facebook', 'เฟสบุ๊ค', 'เฟซบุ๊ก', 'YouTube', 'ยูทูป', 'Line', 'ไลน์', 'Instagram', 'ไอจี', 'Twitter', 'ทวิตเตอร์'],
        forbiddenPairings: [],
        examples: ['ติดตามได้ที่ Facebook', 'กด Subscribe ที่ YouTube'],
        severity: 'medium',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'rule-006',
        category: 'before_after',
        title: 'Before/After Images / ภาพก่อน-หลัง',
        description: 'จำกัดการใช้ภาพเปรียบเทียบก่อน-หลังสำหรับผลิตภัณฑ์บางประเภท',
        forbiddenWords: ['ก่อน-หลัง', 'Before After', 'Before/After'],
        forbiddenPairings: [],
        examples: ['แสดงภาพผิวก่อนและหลังใช้ผลิตภัณฑ์'],
        severity: 'medium',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    }
];

const STORAGE_KEY = 'tiktok_rules';
const METADATA_KEY = 'tiktok_rules_metadata';

// Load rules from localStorage
export const loadRules = (): TikTokRule[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        // Initialize with default rules
        saveRules(DEFAULT_RULES);
        return DEFAULT_RULES;
    } catch (error) {
        console.error('Error loading rules:', error);
        return DEFAULT_RULES;
    }
};

// Save rules to localStorage
export const saveRules = (rules: TikTokRule[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
        updateMetadata(rules);
    } catch (error) {
        console.error('Error saving rules:', error);
    }
};

// Update metadata
const updateMetadata = (rules: TikTokRule[]): void => {
    const metadata: RulesMetadata = {
        lastUpdated: Date.now(),
        totalRules: rules.length,
        activeRules: rules.filter(r => r.isActive).length,
        source: 'Local Database',
        version: '1.0.0'
    };
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
};

// Get metadata
export const getMetadata = (): RulesMetadata => {
    try {
        const stored = localStorage.getItem(METADATA_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            lastUpdated: Date.now(),
            totalRules: DEFAULT_RULES.length,
            activeRules: DEFAULT_RULES.filter(r => r.isActive).length,
            source: 'Default',
            version: '1.0.0'
        };
    } catch {
        return {
            lastUpdated: Date.now(),
            totalRules: 0,
            activeRules: 0,
            source: 'Unknown',
            version: '1.0.0'
        };
    }
};

// Add a new rule
export const addRule = (rule: Omit<TikTokRule, 'id' | 'createdAt' | 'updatedAt'>): TikTokRule => {
    const rules = loadRules();
    const newRule: TikTokRule = {
        ...rule,
        id: `rule-${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    rules.push(newRule);
    saveRules(rules);
    return newRule;
};

// Update a rule
export const updateRule = (id: string, updates: Partial<TikTokRule>): TikTokRule | null => {
    const rules = loadRules();
    const index = rules.findIndex(r => r.id === id);
    if (index === -1) return null;

    rules[index] = {
        ...rules[index],
        ...updates,
        updatedAt: Date.now()
    };
    saveRules(rules);
    return rules[index];
};

// Delete a rule
export const deleteRule = (id: string): boolean => {
    const rules = loadRules();
    const filtered = rules.filter(r => r.id !== id);
    if (filtered.length === rules.length) return false;
    saveRules(filtered);
    return true;
};

// Search rules
export const searchRules = (query: string): TikTokRule[] => {
    const rules = loadRules();
    const lowerQuery = query.toLowerCase();

    return rules.filter(rule =>
        rule.title.toLowerCase().includes(lowerQuery) ||
        rule.description.toLowerCase().includes(lowerQuery) ||
        rule.forbiddenWords.some(w => w.toLowerCase().includes(lowerQuery)) ||
        rule.examples.some(e => e.toLowerCase().includes(lowerQuery))
    );
};

// Get rules by category
export const getRulesByCategory = (category: RuleCategory): TikTokRule[] => {
    const rules = loadRules();
    return rules.filter(r => r.category === category);
};

// Check text for violations
export const checkTextViolation = (text: string): ViolationCheckResult => {
    const rules = loadRules().filter(r => r.isActive);
    const violations: ViolationCheckResult['violatedRules'] = [];

    for (const rule of rules) {
        // Check forbidden words
        for (const word of rule.forbiddenWords) {
            if (text.toLowerCase().includes(word.toLowerCase())) {
                violations.push({
                    ruleId: rule.id,
                    ruleTitle: rule.title,
                    violation: `พบคำต้องห้าม: "${word}"`,
                    severity: rule.severity,
                    suggestion: `หลีกเลี่ยงการใช้คำว่า "${word}" และใช้คำอื่นแทน`
                });
            }
        }

        // Check forbidden pairings
        for (const pairing of rule.forbiddenPairings) {
            const regex = new RegExp(`${pairing.word1}.*${pairing.word2}|${pairing.word2}.*${pairing.word1}`, 'i');
            if (regex.test(text)) {
                violations.push({
                    ruleId: rule.id,
                    ruleTitle: rule.title,
                    violation: `พบคู่คำต้องห้าม: "${pairing.word1}" + "${pairing.word2}"`,
                    severity: rule.severity,
                    suggestion: `หลีกเลี่ยงการใช้คำว่า "${pairing.word1}" ร่วมกับ "${pairing.word2}"`
                });
            }
        }
    }

    const overallRisk = calculateRisk(violations);

    return {
        isViolating: violations.length > 0,
        violatedRules: violations,
        overallRisk,
        explanation: violations.length > 0
            ? `พบการละเมิด ${violations.length} รายการ ควรแก้ไขก่อนโพสต์`
            : 'ไม่พบการละเมิดกฎ TikTok'
    };
};

// Calculate risk score
const calculateRisk = (violations: ViolationCheckResult['violatedRules']): number => {
    if (violations.length === 0) return 0;

    const severityScore: Record<string, number> = {
        'low': 10,
        'medium': 25,
        'high': 40,
        'critical': 60
    };

    let totalScore = 0;
    for (const v of violations) {
        totalScore += severityScore[v.severity] || 20;
    }

    return Math.min(100, totalScore);
};

// Generate TikTok rules from search using AI
export const generateRulesFromSearch = async (apiKey: string): Promise<TikTokRule[]> => {
    const ai = new GoogleGenAI({ apiKey });

    const currentYear = new Date().getFullYear();

    const prompt = `
  You are an expert on TikTok Community Guidelines and Advertising Policies.
  Search and compile the latest TikTok Community Guidelines for ${currentYear}.
  Focus on content creation rules, especially for:
  1. Health and medical claims
  2. Beauty and cosmetic claims
  3. Financial claims
  4. Violence and safety
  5. Prohibited content
  6. Advertising restrictions
  7. Platform rules about mentioning other social media
  
  Return a JSON array of rules with this structure:
  [
    {
      "category": "overclaims" | "medical_supplement" | "forbidden_pairings" | "violence_safety" | "platform_mentions" | "before_after" | "other",
      "title": "Rule title in Thai",
      "description": "Rule description in Thai",
      "forbiddenWords": ["คำต้องห้าม1", "คำต้องห้าม2"],
      "forbiddenPairings": [{"word1": "คำ1", "word2": "คำ2"}],
      "examples": ["Example violation in Thai"],
      "severity": "low" | "medium" | "high" | "critical"
    }
  ]
  
  Make sure to include Thai language forbidden words and examples.
  Focus on Thailand market and Thai language content.
  Return only valid JSON, no markdown.
  `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });

        if (!response.text) throw new Error("No response from AI");

        const generatedRules = JSON.parse(response.text);

        // Convert to TikTokRule format
        const newRules: TikTokRule[] = generatedRules.map((rule: any, index: number) => ({
            id: `ai-rule-${Date.now()}-${index}`,
            category: rule.category || 'other',
            title: rule.title,
            description: rule.description,
            forbiddenWords: rule.forbiddenWords || [],
            forbiddenPairings: rule.forbiddenPairings || [],
            examples: rule.examples || [],
            severity: rule.severity || 'medium',
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }));

        // Merge with existing rules (avoid duplicates)
        const existingRules = loadRules();
        const mergedRules = [...existingRules];

        for (const newRule of newRules) {
            const exists = existingRules.some(r =>
                r.title.toLowerCase() === newRule.title.toLowerCase()
            );
            if (!exists) {
                mergedRules.push(newRule);
            }
        }

        saveRules(mergedRules);
        return mergedRules;

    } catch (error) {
        console.error('Error generating rules:', error);
        throw new Error('Failed to generate rules from AI');
    }
};

// Build dynamic TIKTOK_RULES string for prompts
export const buildRulesPrompt = (): string => {
    const rules = loadRules().filter(r => r.isActive);

    let prompt = 'TIKTOK POLICY & FORBIDDEN WORDS (STRICT ENFORCEMENT):\n';

    const categories: Record<RuleCategory, TikTokRule[]> = {
        overclaims: [],
        medical_supplement: [],
        forbidden_pairings: [],
        violence_safety: [],
        platform_mentions: [],
        before_after: [],
        other: []
    };

    for (const rule of rules) {
        categories[rule.category].push(rule);
    }

    let index = 1;
    for (const [category, categoryRules] of Object.entries(categories)) {
        if (categoryRules.length === 0) continue;

        for (const rule of categoryRules) {
            prompt += `${index}. ${rule.title}:\n`;

            if (rule.forbiddenWords.length > 0) {
                prompt += `   - Forbidden words: ${rule.forbiddenWords.join(', ')}\n`;
            }

            if (rule.forbiddenPairings.length > 0) {
                const pairings = rule.forbiddenPairings.map(p => `"${p.word1}" + "${p.word2}"`).join(', ');
                prompt += `   - Forbidden pairings: ${pairings}\n`;
            }

            index++;
        }
    }

    return prompt;
};

// Export all rules as JSON string (for backup)
export const exportRules = (): string => {
    const rules = loadRules();
    const metadata = getMetadata();
    return JSON.stringify({ rules, metadata }, null, 2);
};

// Import rules from JSON string (for restore)
export const importRules = (jsonString: string): boolean => {
    try {
        const data = JSON.parse(jsonString);
        if (data.rules && Array.isArray(data.rules)) {
            saveRules(data.rules);
            return true;
        }
        return false;
    } catch {
        return false;
    }
};

// Reset to default rules
export const resetToDefaultRules = (): void => {
    saveRules(DEFAULT_RULES);
};
