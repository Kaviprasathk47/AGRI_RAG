import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Copy, Check, MessageSquare, AlertCircle, RefreshCw, Trash2, Maximize2 } from 'lucide-react';
import api from '../utils/api';

// Custom component to format markdown text, bullet lists, code blocks, and tables
const SafeMarkdown = ({ text, onCitationClick }) => {
  if (!text) return null;

  // Split text by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-350">
      {parts.map((part, idx) => {
        // Render Code Block
        if (part.startsWith('```') && part.endsWith('```')) {
          const content = part.slice(3, -3).trim();
          // Extract language if specified (e.g. ```javascript)
          const lines = content.split('\n');
          const firstLine = lines[0].toLowerCase();
          const hasLang = /^[a-z0-9+#-]+$/.test(firstLine);
          const code = hasLang ? lines.slice(1).join('\n') : content;
          return (
            <div key={idx} className="relative group my-3">
              <pre className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-slate-200">
                <code>{code}</code>
              </pre>
              <button 
                onClick={() => navigator.clipboard.writeText(code)}
                className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 p-1.5 rounded-lg transition-all shadow-sm text-slate-500"
                title="Copy code"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        }

        // Render standard text blocks with lists, tables, bold, and citations
        const lines = part.split('\n');
        return (
          <div key={idx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (trimmed === '') return <div key={lIdx} className="h-2" />;

              // Parse tables
              if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                // Skip table headers lines like |---|---|
                if (trimmed.includes('---') || trimmed.includes('- -')) return null;
                const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
                return (
                  <div key={lIdx} className="overflow-x-auto my-2">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-850 rounded-lg">
                      <tbody className="bg-slate-50/50 dark:bg-slate-950/20 divide-y divide-slate-100 dark:divide-slate-800/50">
                        <tr className="flex">
                          {cells.map((cell, cIdx) => (
                            <td key={cIdx} className="flex-1 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-350 border-r border-slate-150 last:border-0 dark:border-slate-850">
                              {renderInlineStyles(cell, onCitationClick)}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              }

              // Parse bullet points
              if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                return (
                  <div key={lIdx} className="flex gap-2 items-start pl-2">
                    <span className="text-pesticide-500 font-bold select-none mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-pesticide-500"></span>
                    <span className="flex-1">{renderInlineStyles(trimmed.substring(2), onCitationClick)}</span>
                  </div>
                );
              }

              // Parse numbered lists
              const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex gap-2 items-start pl-2">
                    <span className="text-pesticide-600 dark:text-pesticide-400 font-bold select-none shrink-0 min-w-[16px] text-right text-xs mt-0.5">{numMatch[1]}.</span>
                    <span className="flex-1">{renderInlineStyles(numMatch[2], onCitationClick)}</span>
                  </div>
                );
              }

              // Standard paragraph line
              return (
                <p key={lIdx}>
                  {renderInlineStyles(line, onCitationClick)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// Inline helper to render bold text, italics, and custom citation links
const renderInlineStyles = (text, onCitationClick) => {
  if (!text) return '';

  // Match bold structure (**text**)
  let parts = [text];
  
  // Parse bold blocks
  const boldRegex = /(\*\*.*?\*\*)/g;
  if (boldRegex.test(text)) {
    parts = text.split(boldRegex);
  }

  // Parse citations like [filename.pdf, Page 3] or [filename.pdf, Page 12]
  // Matches brackets enclosing a filename ending in .pdf and page number
  const citationRegex = /(\[[a-zA-Z0-9_-]+\.pdf,\s*(?:[pP]age\s*\d+)\])/gi;

  return (
    <>
      {parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">{boldText}</strong>;
        }

        // Parse citations inside regular text fragments
        if (citationRegex.test(part)) {
          const subparts = part.split(citationRegex);
          return (
            <span key={pIdx}>
              {subparts.map((sub, sIdx) => {
                if (citationRegex.test(sub)) {
                  // Format: [fungicides.pdf, Page 3]
                  const clean = sub.slice(1, -1);
                  const commaIdx = clean.lastIndexOf(',');
                  const filename = clean.substring(0, commaIdx).trim();
                  const pageInfo = clean.substring(commaIdx + 1).trim(); // e.g. "Page 3"
                  const pageNum = parseInt(pageInfo.replace(/\D/g, ''), 10) || 0;

                  return (
                    <button
                      key={sIdx}
                      onClick={() => onCitationClick({ document: filename, page: pageNum })}
                      className="inline-flex items-center gap-1 bg-pesticide-50 hover:bg-pesticide-100 text-pesticide-700 dark:bg-pesticide-950/45 dark:hover:bg-pesticide-900/60 dark:text-pesticide-400 border border-pesticide-200/50 dark:border-pesticide-800/40 rounded px-1.5 py-0.5 mx-0.5 text-[10px] font-bold font-mono transition-colors align-middle"
                    >
                      {filename.length > 15 ? `${filename.substring(0, 12)}...` : filename}
                      <span className="text-[9px] opacity-75">{pageInfo}</span>
                    </button>
                  );
                }
                return sub;
              })}
            </span>
          );
        }

        return part;
      })}
    </>
  );
};

export default function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [activeCitation, setActiveCitation] = useState(null);
  const [error, setError] = useState('');

  const scrollRef = useRef(null);

  const SUGGESTIONS = [
    "What is the formulation type for Coragen?",
    "List the approved chemical herbicides for weed management.",
    "What safety precautions are listed for chemical fungicides?",
    "What is the active ingredient in insecticide registration records?"
  ];

  // Auto-scroll to the bottom of the chat container
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query || query.trim() === '') return;

    setInput('');
    setError('');
    
    // Add user message
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: query,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await api.post('/chat', { question: query });
      
      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.data.answer || "I couldn't find that information in the provided documents.",
        sources: response.data.sources || [],
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to complete chat query.');
      
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'error',
        text: err.message || 'Failed to fetch model answer. Please check your API keys or Pinecone Index status.'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    if (messages.length === 0) return;
    if (window.confirm('Clear all conversation messages?')) {
      setMessages([]);
      setActiveCitation(null);
      setError('');
    }
  };

  const selectSuggestion = (suggestion) => {
    handleSend(suggestion);
  };

  // Find source matching the citation
  const handleCitationClick = (citation) => {
    // Search messages for the active sources
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant' && msg.sources) {
        const match = msg.sources.find(
          s => s.document === citation.document && Number(s.page) === Number(citation.page)
        );
        if (match) {
          setActiveCitation(match);
          return;
        }
      }
    }
    // Default fallback if source chunk content is not fully cached in recent message
    setActiveCitation({
      document: citation.document,
      page: citation.page,
      text: "Source matching chunk is indexed. Read original PDF file for additional details.",
      score: 1.0
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] lg:h-[calc(100vh-40px)] bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-850 overflow-hidden relative fade-in">
      {/* Header bar */}
      <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-pesticide-600 rounded-lg text-white">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-sm">Pesticide Registration Assistant</h2>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Gemini RAG Active</span>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button 
            onClick={clearChat}
            className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-transparent font-medium flex items-center gap-1.5 transition-all"
            title="Clear Chat Logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Message workspace */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center max-w-xl mx-auto py-10 space-y-6">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
              <MessageSquare className="h-8 w-8 text-pesticide-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Ask anything about registrations</h3>
              <p className="text-xs text-slate-450 dark:text-slate-400 mt-1.5">
                Query formulation details, chemical compositions, pesticide limits, and compliance parameters extracted page-by-page.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-4">
              {SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => selectSuggestion(suggestion)}
                  className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-left text-xs text-slate-600 dark:text-slate-350 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm font-medium"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Conversation messages */
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="h-8 w-8 rounded-lg bg-pesticide-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                )}
                
                <div className="group relative max-w-[85%]">
                  <div className={`p-4 rounded-2xl text-sm border shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-pesticide-600 border-pesticide-550 text-white rounded-br-none'
                      : msg.role === 'error'
                      ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-400 rounded-bl-none flex items-start gap-2.5'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/70 rounded-bl-none'
                  }`}>
                    {msg.role === 'error' && <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />}
                    
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <SafeMarkdown text={msg.text} onCitationClick={handleCitationClick} />
                    )}
                  </div>

                  {/* Message Actions */}
                  {msg.role !== 'error' && (
                    <button
                      onClick={() => copyToClipboard(msg.text, msg.id)}
                      className={`absolute top-2.5 ${msg.role === 'user' ? '-left-10' : '-right-10'} opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 p-1.5 rounded-lg transition-all shadow-sm text-slate-500 dark:text-slate-400`}
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="h-8 w-8 rounded-lg bg-slate-250 dark:bg-slate-800 text-slate-600 dark:text-slate-350 flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-700 shadow-sm font-bold uppercase text-xs">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Thinking Indicator */}
            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="h-8 w-8 rounded-lg bg-pesticide-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="h-4.5 w-4.5 animate-bounce" />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1.5">
                  <span className="h-2 w-2 bg-slate-400 rounded-full typing-dot"></span>
                  <span className="h-2 w-2 bg-slate-400 rounded-full typing-dot"></span>
                  <span className="h-2 w-2 bg-slate-400 rounded-full typing-dot"></span>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2 max-w-3xl mx-auto border border-slate-250 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 p-1.5 focus-within:border-pesticide-500/80 focus-within:ring-2 focus-within:ring-pesticide-500/10 transition-all shadow-sm"
        >
          <input
            type="text"
            disabled={loading}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a pesticide registration query..."
            className="flex-1 bg-transparent border-0 outline-0 shadow-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-0 focus:outline-none px-3 py-2 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-pesticide-650 hover:bg-pesticide-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-450 dark:disabled:text-slate-600 p-2.5 rounded-lg transition-all shadow-sm flex items-center justify-center shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          Verify registrations against official documents. GEMINI may generate errors.
        </p>
      </div>

      {/* Citation Source Panel (Expandable Modal Drawer) */}
      {activeCitation && (
        <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] fade-in">
            <div className="px-5 py-4 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-pesticide-500" />
                <h3 className="font-bold text-slate-905 dark:text-white text-sm">Source Citation Reference</h3>
              </div>
              <button 
                onClick={() => setActiveCitation(null)}
                className="text-slate-450 hover:text-slate-600 dark:hover:text-slate-350 text-xs font-semibold py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850"
              >
                Close
              </button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="text-xs space-y-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Document</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono truncate max-w-[200px]">{activeCitation.document}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Page Number</span>
                  <span className="font-bold text-slate-750 dark:text-slate-350">Page {activeCitation.page}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Similarity Score</span>
                  <span className="font-semibold text-teal-650 dark:text-teal-400 font-mono">{(activeCitation.score * 100).toFixed(1)}% Match</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1.5 font-bold">Retrieved Context Paragraph</span>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl text-xs leading-relaxed text-slate-650 dark:text-slate-400 overflow-y-auto max-h-52 font-medium">
                  {activeCitation.text}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline component for FileText icon used inside modal
const FileText = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);
