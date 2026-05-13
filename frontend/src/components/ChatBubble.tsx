import React, { useState, useEffect, useRef } from 'react';
import { Bot, Loader2, Download } from 'lucide-react';
import { Icons } from './Icons';
import { webLLM } from '../services/webllm';
import type { ChatMessage } from '../schema';

export const ChatBubble: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState<{ text: string; percent: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, progress]);

  const initEngine = async () => {
    if (isInitializing || webLLM.isInitialized()) return;

    // Check for WebGPU
    if (!navigator.gpu) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "❌ Your browser does not support WebGPU. Please use a modern browser like Chrome or Edge (v113+) and ensure hardware acceleration is enabled." 
      }]);
      return;
    }

    setIsInitializing(true);
    try {
      await webLLM.init((report) => {
        const percentMatch = report.text.match(/(\d+)%/);
        const percent = percentMatch ? parseInt(percentMatch[1]) : 0;
        setProgress({ text: report.text, percent });
      });
      // Small delay to ensure WebGPU buffers are fully settled
      await new Promise(r => setTimeout(r, 800));
      setProgress(null);
    } catch (err: unknown) {
      console.error("AI Init Error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Initialization Error: ${(err as Error).message}. Try clearing the AI cache in Settings.` }]);
      webLLM.unload(); 
    } finally {
      setIsInitializing(false);
    }
  };

  const clearAICache = async () => {
    if (confirm("This will delete the downloaded AI model (1.5GB) from your browser cache. Use this only if the AI is persistently failing. Continue?")) {
      try {
        await webLLM.unload();
        const databases = await window.indexedDB.databases();
        for (const db of databases) {
          if (db.name?.includes('mlc')) {
            window.indexedDB.deleteDatabase(db.name);
          }
        }
        alert("AI Cache cleared. Please refresh the page.");
        window.location.reload();
      } catch (err) {
        alert("Error clearing cache: " + err);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || isInitializing) return;

    // Initialize on first message if not already done
    if (!webLLM.isInitialized()) {
      await initEngine();
      // If we just started initializing or it's still downloading, don't proceed with chat
      if (!webLLM.isInitialized()) return;
    }

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Fetch Business Context from Backend
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const contextRes = await fetch(`${backendUrl}/ai-context`);
      
      if (!contextRes.ok) {
        throw new Error("Could not connect to the backend business data. Please ensure the server is running.");
      }

      const contextData = await contextRes.json();
      
      const systemPrompt = `You are 'Viren's Khakhra AI', the central intelligence of Viren's Khakhra business. 
Your goal is to help Viren manage orders, debts, and manufacturing efficiently.

CURRENT BUSINESS STATE:
- Outstanding Debt: ₹${contextData.total_outstanding_debt}
- Recent Debtors: ${contextData.debt_details.slice(0, 5).map((d: {customer: string, amount: number}) => `${d.customer} (₹${d.amount})`).join(', ')}
- Product Catalog: ${contextData.product_catalog.length} items available.
- Recent Activity: ${contextData.recent_activity.length} recent orders tracked.

GUIDELINES:
1. Be professional, concise, and proactive.
2. Use the provided numbers to give exact answers.
3. If asked about a customer's debt, check 'recent_activity' and 'debt_details'.
4. If data is missing or not in the context, politely inform Viren.
5. You run LOCALLY on Viren's machine for 100% privacy.

Full Context JSON: ${JSON.stringify(contextData)}`;

      // 2. Generate Local Response (Limit history to 10 messages for speed)
      const history = messages.slice(-10);
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...history,
        userMessage
      ];

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      await webLLM.chat(chatMessages, (currentFullText) => {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = currentFullText;
          return newMessages;
        });
      });

    } catch (err: unknown) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ AI Error: ${(err as Error).message}. You can try to reload the AI engine below.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-bubble-container">
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chat-toggle-btn"
          title="Viren's AI Assistant"
        >
          <Icons.Zap style={{ width: 32, height: 32 }} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-title">
              <Icons.Cpu size={24} />
              <span>Viren's Offline AI</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={clearAICache} 
                className="chat-close-btn" 
                title="Clear AI Cache"
                style={{ opacity: 0.6 }}
              >
                <Icons.Delete style={{ width: 18, height: 18 }} />
              </button>
              <button onClick={() => setIsOpen(false)} className="chat-close-btn">
                <Icons.Cancel style={{ width: 18, height: 18 }} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="chat-messages">
            {messages.length === 0 && !progress && (
              <div className="chat-empty-state">
                <Bot size={60} style={{ opacity: 0.2 }} />
                <div>
                  <p style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Local AI Assistant</p>
                  <p style={{ fontSize: '0.85rem' }}>Running 100% on your device.</p>
                  <button 
                    onClick={initEngine} 
                    className="btn btn-primary" 
                    style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                    disabled={isInitializing}
                  >
                    {isInitializing ? 'Initialzing...' : 'Download AI Model (1.5GB)'}
                  </button>
                </div>
              </div>
            )}

            {progress && (
              <div className="chat-empty-state">
                <Download size={40} className="animate-bounce" style={{ color: 'var(--accent)' }} />
                <div style={{ width: '80%', textAlign: 'center' }}>
                  <p style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Downloading AI Engine...</p>
                  <div style={{ background: 'var(--border)', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <div style={{ width: `${progress.percent}%`, background: 'var(--accent-gradient)', height: '100%', transition: 'width 0.3s' }} />
                  </div>
                  <p style={{ fontSize: '0.7rem', opacity: 0.7 }}>{progress.text}</p>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`chat-message-row ${m.role}`}>
                <div className="chat-message-content">
                  {m.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="chat-message-row assistant">
                <div className="chat-loading">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Viren is thinking locally...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={progress ? "Downloading..." : "Ask your local assistant..."}
                className="chat-input-field"
                disabled={!!progress || isInitializing}
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading || !!progress || isInitializing}
                className="chat-send-btn"
              >
                <Icons.Add style={{ width: 20, height: 20 }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
