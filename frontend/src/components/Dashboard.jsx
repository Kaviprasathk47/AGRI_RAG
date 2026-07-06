import React, { useEffect, useState } from 'react';
import { Database, FileText, BarChart3, Trash2, Cpu, Activity, RefreshCw } from 'lucide-react';
import api from '../utils/api';

export default function Dashboard({ refreshTrigger, onRefresh }) {
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, docsRes] = await Promise.all([
        api.get('/statistics'),
        api.get('/documents')
      ]);
      setStats(statsRes.data);
      setDocuments(docsRes.data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleDelete = async (docName) => {
    if (!window.confirm(`Are you sure you want to delete "${docName}"? This will physically remove the PDF from the server and delete all its corresponding vector embeddings from Pinecone.`)) {
      return;
    }

    setDeletingId(docName);
    try {
      await api.delete(`/documents/${encodeURIComponent(docName)}`);
      // Re-trigger stats refresh
      if (onRefresh) {
        onRefresh();
      } else {
        fetchData();
      }
    } catch (err) {
      alert(`Delete failed: ${err.message || err}`);
    } finally {
      setDeletingId(null);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="h-8 w-8 text-pesticide-600 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Fetching database statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900/50 p-4 rounded-xl text-rose-800 dark:text-rose-450">
          <p className="font-semibold text-sm">Error Loading Statistics</p>
          <p className="text-xs mt-1 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium py-1.5 px-3 rounded-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor pesticide registrations registry and Pinecone database allocations.
          </p>
        </div>
        <button 
          onClick={fetchData} 
          className="flex items-center gap-1.5 text-xs font-semibold bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 py-1.5 px-3 rounded-lg text-slate-650 transition-all shadow-sm"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh Stats
        </button>
      </div>

      {/* Analytics Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-pesticide-50 dark:bg-pesticide-950/30 rounded-xl text-pesticide-600 dark:text-pesticide-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">PDF Registrations</span>
            <span className="block text-2xl font-bold text-slate-905 dark:text-white mt-0.5">{stats?.documentsCount || 0}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl text-teal-600 dark:text-teal-400">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Text Chunks</span>
            <span className="block text-2xl font-bold text-slate-905 dark:text-white mt-0.5">{stats?.chunksCount || 0}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Pinecone Vectors</span>
            <span className="block text-2xl font-bold text-slate-905 dark:text-white mt-0.5">{stats?.vectorsCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Model Settings & Database Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List of documents */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/10 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Ingested Pesticide Documents</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Synced with Server Folder</span>
          </div>
          
          {documents.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-8 w-8 text-slate-350 mx-auto mb-2 dark:text-slate-650" />
              <p className="text-slate-500 text-sm">No pesticide documents registered yet.</p>
              <p className="text-slate-400 text-xs mt-1">Upload files on the Ingestion page to populate.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-slate-400 uppercase bg-slate-50/20 dark:bg-slate-950/5">
                    <th className="px-5 py-3.5">Filename</th>
                    <th className="px-4 py-3.5 text-right">Size</th>
                    <th className="px-4 py-3.5 text-right">Chunks</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/25 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px] sm:max-w-[300px]">
                        {doc.name}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-500 dark:text-slate-400 text-xs font-mono">
                        {formatBytes(doc.size)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-500 dark:text-slate-400 text-xs font-mono">
                        {doc.chunks}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          disabled={deletingId !== null}
                          onClick={() => handleDelete(doc.name)}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1.5 rounded-lg transition-all disabled:opacity-50 inline-flex items-center justify-center"
                          title="Delete PDF & Vectors"
                        >
                          {deletingId === doc.name ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-rose-550" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Configurations info */}
        <div className="space-y-6">
          {/* Pinecone Status */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-pesticide-500" />
              Vector Index Settings
            </h3>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 space-y-3 text-xs">
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Index Name</span>
                <span className="font-bold text-slate-750 dark:text-slate-350 font-mono">{stats?.index?.name || 'quickstart'}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Dimension</span>
                <span className="font-bold text-slate-750 dark:text-slate-350">{stats?.index?.dimension || 1536} ({stats?.index?.metric || 'cosine'})</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Host URL</span>
                <span className="font-semibold text-slate-500 truncate max-w-[150px] font-mono" title={stats?.index?.host}>
                  {stats?.index?.host || 'Loading...'}
                </span>
              </div>
              <div className="flex justify-between pt-2 items-center">
                <span className="text-slate-400">Index State</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  stats?.index?.state === 'ready' || stats?.index?.state === 'readying'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450'
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450'
                }`}>
                  {stats?.index?.state || 'unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Model Configs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-500" />
              Active LLM & AI Pipelines
            </h3>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 space-y-3 text-xs">
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Embedding Model</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{stats?.models?.embedding || 'text-embedding-3-small'}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Gemini LLM model</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{stats?.models?.llm || 'gemini-2.0-flash'}</span>
              </div>
              <div className="flex justify-between pt-2 items-center">
                <span className="text-slate-400">App Status</span>
                <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-555 animate-ping"></span>
                  Active / Healthy
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
