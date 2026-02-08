import React, { useRef, useState } from 'react';
import { Upload, FileVideo, X, Users, FileText, Sparkles } from 'lucide-react';
import { FileData } from '../types';

interface VideoUploaderProps {
  onFileSelect: (fileData: FileData | null) => void;
  selectedFile: FileData | null;
  disabled: boolean;
  onManualScript?: (script: string, characters: string) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onFileSelect, selectedFile, disabled, onManualScript }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('manual');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual Script State
  const [characters, setCharacters] = useState('');
  const [manualScript, setManualScript] = useState('');

  const handleFile = (file: File) => {
    setError(null);

    if (!file.type.startsWith('video/')) {
      setError("Please upload a valid video file (MP4, WebM, MOV).");
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError("File is too large. For this browser-based demo, please upload videos under 50MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    onFileSelect({ file, previewUrl, type: 'file', mimeType: file.type });
  };

  const handleManualSubmit = () => {
    if (!manualScript.trim()) {
      setError("กรุณาเขียนสคริปต์หรือเรื่องราว");
      return;
    }
    setError(null);

    if (onManualScript) {
      onManualScript(manualScript, characters);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (activeTab === 'upload' && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const clearFile = () => {
    if (selectedFile?.type === 'file') {
      URL.revokeObjectURL(selectedFile.previewUrl);
    }
    onFileSelect(null);
    setCharacters('');
    setManualScript('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      {selectedFile ? (
        <div className="relative bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700">
          <button
            onClick={clearFile}
            disabled={disabled}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-red-500/80 text-white rounded-full transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="aspect-video bg-black flex items-center justify-center">
            <video
              src={selectedFile.previewUrl}
              controls
              className="w-full h-full object-contain max-h-[400px]"
              onError={() => setError("Could not load video preview. The URL might be restricted or invalid.")}
            />
          </div>

          <div className="p-4 flex items-center gap-3 border-t border-slate-700">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <FileVideo className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {selectedFile.file?.name}
              </p>
              <p className="text-xs text-slate-400">
                {selectedFile.file
                  ? `${(selectedFile.file.size / (1024 * 1024)).toFixed(2)} MB`
                  : 'Video Source'}
              </p>
            </div>
          </div>
          {error && (
            <div className="px-4 pb-4 text-red-400 text-sm">{error}</div>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors
                ${activeTab === 'manual' ? 'bg-slate-800 text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}
              `}
            >
              <FileText className="w-4 h-4" /> เขียนสคริปต์เอง
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors
                ${activeTab === 'upload' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}
              `}
            >
              <Upload className="w-4 h-4" /> อัปโหลดวิดีโอ
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'manual' ? (
              <div className="space-y-6">
                {/* Characters/Roles Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    กำหนดตัวละคร / Roles (ไม่บังคับ)
                  </label>
                  <textarea
                    placeholder={`ตัวอย่าง:
- พี่หมอ: หมอหญิงวัย 35 ใส่แว่น ยิ้มเป็นกันเอง
- คนไข้: ชายวัย 40 มีอาการปวดท้อง
- ผู้บรรยาย: เสียงทุ้มนุ่มนวล`}
                    value={characters}
                    onChange={(e) => setCharacters(e.target.value)}
                    disabled={disabled}
                    className="w-full h-28 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    อธิบายลักษณะ บุคลิก หน้าตา ของตัวละครแต่ละคน เพื่อให้ AI สร้างภาพได้ตรงตามที่ต้องการ
                  </p>
                </div>

                {/* Script/Story Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    สคริปต์ / เรื่องราว / Script
                  </label>
                  <textarea
                    placeholder={`เขียนสคริปต์หรือเรื่องราวที่ต้องการสร้างวิดีโอ ตัวอย่าง:

[00:00] พี่หมอ: สวัสดีค่ะ วันนี้เรามาคุยกันเรื่องกรดไหลย้อนกันนะคะ

[00:05] (ภาพ: พี่หมอยืนอยู่หน้ากล้อง มือชี้ไปที่กราฟิกท้องคน)

[00:08] พี่หมอ: อาการปวดแสบร้อนกลางอก คืออะไร?

[00:12] คนไข้: หมอครับ ผมปวดท้องบ่อยมาก...

---
หรือเขียนเป็น Markdown แบบเรื่องเล่า:

# ฉาก 1: เปิดเรื่อง
พี่หมอยืนยิ้มอยู่ในห้องตรวจ แสงอ่อนๆ ส่องเข้ามา

**พี่หมอ:** "สวัสดีค่ะ วันนี้เรามาคุยกันเรื่องกรดไหลย้อน"`}
                    value={manualScript}
                    onChange={(e) => setManualScript(e.target.value)}
                    disabled={disabled}
                    className="w-full h-64 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none text-sm font-mono"
                  />
                  <p className="text-xs text-slate-500">
                    รองรับ: Timestamp [MM:SS], Markdown, หรือเขียนเป็นเรื่องเล่าก็ได้ AI จะช่วยแบ่ง Scene และสร้าง Prompt ให้
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleManualSubmit}
                  disabled={disabled || !manualScript.trim()}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2
                    ${!manualScript.trim()
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/20 active:scale-95'
                    }
                  `}
                >
                  <Sparkles className="w-5 h-5" />
                  สร้างวิดีโอจากสคริปต์
                </button>

                {/* Tips */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <p className="text-sm text-purple-400 font-medium mb-2">💡 Tips:</p>
                  <ul className="text-xs text-purple-300/80 space-y-1 list-disc list-inside">
                    <li>กำหนดตัวละครให้ชัดเจน จะช่วยให้ภาพมีความต่อเนื่อง</li>
                    <li>ใส่ Timestamp เพื่อกำหนดจังหวะของแต่ละ Scene</li>
                    <li>เขียนอารมณ์และท่าทางในวงเล็บ เช่น (ยิ้ม), (เศร้า)</li>
                    <li>ระบบจะสร้าง Visual Prompt สำหรับ AI Image Generator โดยอัตโนมัติ</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div
                className={`relative flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out cursor-pointer
                  ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-blue-400 hover:bg-slate-800'}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !disabled && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleChange}
                  accept="video/*"
                  disabled={disabled}
                />
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <div className="p-3 bg-slate-700 rounded-full mb-3">
                    <Upload className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="mb-1 text-base font-medium text-slate-200">
                    คลิกเพื่ออัปโหลด หรือลากไฟล์มาวาง
                  </p>
                  <p className="text-xs text-slate-400">
                    MP4, WebM, MOV (สูงสุด 50MB)
                  </p>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 text-red-400 text-sm text-center animate-pulse">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};