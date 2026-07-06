import React, { useState, useRef } from 'react';
import { Upload, File, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../utils/api';

export default function UploadCard({ onIngestionSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, success, error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [stats, setStats] = useState(null);
  
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFiles = Array.from(e.dataTransfer.files).filter(
        file => file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')
      );
      if (selectedFiles.length > 0) {
        setFiles(prev => [...prev, ...selectedFiles]);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startIngestion = async () => {
    if (files.length === 0) return;

    setStatus('uploading');
    setProgress(10);
    setErrorMsg('');
    setStats(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      setProgress(30);
      const res = await api.post('/ingest', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          // Scale upload progress from 30% to 80% to leave room for backend parsing
          setProgress(30 + Math.round(percentCompleted * 0.5));
        }
      });

      setStatus('processing');
      setProgress(90);
      
      // The response details
      setStats({
        documents: res.data.documentsProcessed || [],
        chunks: res.data.chunksCreated || 0,
        vectors: res.data.vectorsUploaded || 0,
        duration: res.data.processingTimeMs || 0
      });

      setStatus('success');
      setProgress(100);
      setFiles([]);
      if (onIngestionSuccess) {
        onIngestionSuccess();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to process document uploads.');
      setStatus('error');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 transition-all fade-in">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Ingest Pesticide Documents</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Upload registration PDFs to extract text, create vector embeddings, and store them in Pinecone for chat queries.
      </p>

      {/* Drag & Drop Zone */}
      {status === 'idle' || status === 'success' || status === 'error' ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
            dragActive 
              ? 'border-pesticide-500 bg-pesticide-50/50 dark:bg-pesticide-950/20' 
              : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/10'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="h-10 w-10 text-slate-400 dark:text-slate-600 mb-4 animate-bounce" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
            Drag & drop PDF files here, or <span className="text-pesticide-600 dark:text-pesticide-400">browse file explorer</span>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Only PDF documents are supported</p>
        </div>
      ) : null}

      {/* File List */}
      {files.length > 0 && (status === 'idle' || status === 'error') && (
        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Files Selected ({files.length})</h3>
          <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-100 dark:border-slate-800/50 rounded-lg p-2 bg-slate-50/30 dark:bg-slate-950/20">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm bg-white dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-850">
                <div className="flex items-center gap-2.5 truncate">
                  <File className="h-4 w-4 text-pesticide-500 shrink-0" />
                  <span className="truncate text-slate-700 dark:text-slate-300 font-medium">{file.name}</span>
                  <span className="text-xs text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  className="text-xs text-rose-500 hover:underline px-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={startIngestion}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-pesticide-600 hover:bg-pesticide-700 text-white font-medium py-2.5 px-4 rounded-xl transition-all shadow-sm"
          >
            <Upload className="h-4 w-4" />
            Ingest {files.length} Document{files.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Progress Bars */}
      {(status === 'uploading' || status === 'processing') && (
        <div className="mt-6 p-6 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950/20">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
              <Loader2 className="h-4 w-4 text-pesticide-500 animate-spin" />
              {status === 'uploading' ? 'Uploading PDF file(s)...' : 'Extracting, chunking and embedding...'}
            </span>
            <span className="text-slate-500 font-semibold">{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-pesticide-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2.5 text-center">
            {status === 'processing' 
              ? 'This might take a minute depending on document sizes. We are parsing sections and syncing vectors.' 
              : 'Uploading documents to Express server.'}
          </p>
        </div>
      )}

      {/* Success Block */}
      {status === 'success' && stats && (
        <div className="mt-6 p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/50 rounded-xl">
          <div className="flex gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-400 text-sm">Ingestion Complete</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-500 mt-1">
                Document data successfully chunked, embedded, and synced to Pinecone database.
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/40 text-xs">
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block">Processed</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{stats.documents.length} PDF(s)</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block">Text Chunks</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{stats.chunks}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block">Pinecone Vectors</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{stats.vectors}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block">Duration</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{(stats.duration / 1000).toFixed(2)}s</span>
                </div>
              </div>

              <button
                onClick={() => setStatus('idle')}
                className="mt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Upload more files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Block */}
      {status === 'error' && (
        <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-450 shrink-0" />
            <div>
              <h3 className="font-semibold text-rose-900 dark:text-rose-400 text-sm">Ingestion Error</h3>
              <p className="text-xs text-rose-700 dark:text-rose-500 mt-1">{errorMsg}</p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-3 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium py-1.5 px-3 rounded-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
