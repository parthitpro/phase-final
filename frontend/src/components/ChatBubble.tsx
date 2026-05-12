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
    if (isInitializing) return;
    setIsInitializing(true);
    try {
      await webLLM.init((report) => {
        // Parse progress from report text if possible or just use text
        const percentMatch = report.text.match(/(\d+)%/);
        const percent = percentMatch ? parseInt(percentMatch[1]) : 0;
        setProgress({ text: report.text, percent });
      });
      setProgress(null);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Initialization Error: ${err.message}. Make sure your browser supports WebGPU.` }]);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Initialize on first message if not already done
    if (!progress && !isInitializing) {
      await initEngine();
    }

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Fetch Business Context from Backend
      const contextRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/ai-context`);
      const contextData = await contextRes.json();
      
      const systemPrompt = `You are 'Viren's Khakhra AI', a professional assistant. 
Use this REAL-TIME data to help Viren: ${JSON.stringify(contextData)}
Be concise and helpful. If data is missing, say you don't have it.`;

      // 2. Generate Local Response
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...messages,
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

    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${err.message}` }]);
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
          title="Local AI Assistant"
        >
          <Icons.WhatsApp style={{ width: 32, height: 32 }} />
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
            <button onClick={() => setIsOpen(false)} className="chat-close-btn">
              <Icons.Cancel style={{ width: 18, height: 18 }} />
            </button>
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
