import React, { useState, useEffect, useRef } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { Icons } from './Icons';
import type { ChatMessage } from '../schema';

export const ChatBubble: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const apiKey = localStorage.getItem('openrouter_api_key');
    const modelName = localStorage.getItem('openrouter_model') || 'google/gemma-4-31b-it:free';

    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Please set your OpenRouter API Key in the "AI Assistant" settings tab first.' }]);
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          api_key: apiKey,
          model_name: modelName
        })
      });

      const data = await response.json();
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        throw new Error(data.detail || 'Failed to get AI response');
      }
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
          title="AI Assistant"
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
              <Bot size={24} />
              <span>Viren's AI Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="chat-close-btn">
              <Icons.Cancel style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty-state">
                <Bot size={60} style={{ opacity: 0.2 }} />
                <div>
                  <p style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>How can I help you today?</p>
                  <p style={{ fontSize: '0.85rem' }}>Ask about your sales, debts, or inventory.</p>
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
                  <span>Viren is thinking...</span>
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
                placeholder="Ask your assistant..."
                className="chat-input-field"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
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
