import React, { useRef, useState } from 'react';
import { Upload, FileVideo, X, Link as LinkIcon, Globe } from 'lucide-react';
import { FileData } from '../types';

interface VideoUploaderProps {
  onFileSelect: (fileData: FileData | null) => void;
  selectedFile: FileData | null;
  disabled: boolean;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onFileSelect, selectedFile, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!urlInput.trim()) {
      setError("Please enter a URL.");
      return;
    }

    try {
      new URL(urlInput); // Validate URL format
    } catch {
      setError("Invalid URL format.");
      return;
    }

    // Basic mime type guess (not perfect, but helpful for initial UI)
    const mimeType = 'video/mp4';
    onFileSelect({ url: urlInput, previewUrl: urlInput, type: 'url', mimeType });
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
    setUrlInput('');
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
              {selectedFile.type === 'file' ? <FileVideo className="w-6 h-6" /> : <LinkIcon className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {selectedFile.type === 'file' ? selectedFile.file?.name : selectedFile.url}
              </p>
              <p className="text-xs text-slate-400">
                {selectedFile.type === 'file' && selectedFile.file
                  ? `${(selectedFile.file.size / (1024 * 1024)).toFixed(2)} MB`
                  : 'Remote URL Source'}
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
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors
                ${activeTab === 'upload' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}
              `}
            >
              <Upload className="w-4 h-4" /> Upload File
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors
                ${activeTab === 'url' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}
              `}
            >
              <LinkIcon className="w-4 h-4" /> Enter URL
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'upload' ? (
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
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-slate-400">
                    MP4, WebM, MOV (Max 50MB)
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-auto min-h-56 flex flex-col justify-center items-center gap-4 py-6">
                <div className="w-full max-w-md space-y-4">
                  <div className="text-center">
                    <div className="mx-auto w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mb-3">
                      <Globe className="w-6 h-6 text-blue-400" />
                    </div>
                    <p className="text-sm text-slate-300 mb-2">
                      ใส่ลิงก์ไปยังไฟล์วิดีโอโดยตรง
                    </p>
                    <p className="text-xs text-slate-500 mb-4">
                      รองรับ: ลิงก์ .mp4, .webm, .mov โดยตรง
                    </p>
                  </div>
                  <form onSubmit={handleUrlSubmit} className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/video.mp4"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-slate-500"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      disabled={disabled}
                    />
                    <button
                      type="submit"
                      disabled={disabled}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      เพิ่ม
                    </button>
                  </form>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-4">
                    <p className="text-xs text-yellow-400 mb-2 font-medium">⚠️ ข้อจำกัดการใช้งาน URL:</p>
                    <ul className="text-xs text-yellow-300/80 space-y-1 list-disc list-inside">
                      <li>ลิงก์ YouTube, TikTok, Facebook, Instagram <span className="text-red-400">ไม่รองรับโดยตรง</span></li>
                      <li>กรุณาดาวน์โหลดวิดีโอก่อนแล้วอัปโหลดไฟล์</li>
                      <li>หรือใช้ลิงก์ไฟล์วิดีโอโดยตรง (.mp4)</li>
                    </ul>
                  </div>
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