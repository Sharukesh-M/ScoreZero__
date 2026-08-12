import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import type { ScoreResult } from '../../api/nodeApiClient';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface InlineChatPanelProps {
  score: ScoreResult | null;
}

export const InlineChatPanel: React.FC<InlineChatPanelProps> = ({ score }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isExpanded]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query) return;

    if (!isExpanded) setIsExpanded(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Build context from current score if available
      const scoreContext = score ? {
        score_value: score.score_value,
        score_band: score.score_band,
        metrics: score.metrics,
        explanation: score.explanation,
        recommendations: score.recommendations,
      } : null;

      let assistantReply = "";
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_NODE_API_URL || 'https://scorezero-backend.onrender.com';
        const res = await fetch(`${apiBase}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('scorezero_token') || 'demo'}`
          },
          body: JSON.stringify({
            message: query,
            context: scoreContext
          })
        });

        if (respOk(res)) {
          const data = await res.json();
          assistantReply = data.reply || data.response;
        }
      } catch {
        // Local intelligent fallback response if backend /api/chat endpoint is offline
        assistantReply = generateLocalAdvisorResponse(query, score);
      }

      if (!assistantReply) {
        assistantReply = generateLocalAdvisorResponse(query, score);
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: assistantReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: "To make your statement loan-ready, focus on routing all income to one primary account, keeping zero bounces, and preserving a minimum 10-20% savings buffer.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  function respOk(res: Response) {
    return res.status >= 200 && res.status < 300;
  }

  function generateLocalAdvisorResponse(query: string, s: ScoreResult | null): string {
    const q = query.toLowerCase();
    if (q.includes('score') || q.includes('improve')) {
      if (s) {
        return `Your current ScoreZero score is ${s.score_value}/100 (${s.score_band}). To improve it, focus on your lowest metrics: ${s.recommendations[0] || 'maintain zero bounce discipline and increase monthly savings ratio'}.`;
      }
      return "To boost your ScoreZero rating, route all gig income into one primary bank account, avoid transaction bounces, and keep a small balance buffer.";
    }
    if (q.includes('bounce') || q.includes('penalty')) {
      return "Transaction bounces occur when auto-debits or ECS charges fail due to low balance. Each bounce drops your score by up to 15-20 points. Enable low-balance SMS alerts with your bank.";
    }
    if (q.includes('loan') || q.includes('approval') || q.includes('lender')) {
      return "Lenders look for consistent weekly/monthly income deposits, zero bounced debits, and a balance that trends upward rather than dropping to zero.";
    }
    return `Based on your profile${s ? ` (${s.score_value}/100)` : ''}, keeping your discretionary spending structured and routing your income predictably will maximize your approval readiness.`;
  }

  return (
    <div
      style={{
        marginTop: '20px',
        background: 'var(--bg-primary, #F0F4F8)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-card, -8px -8px 24px rgba(255,255,255,0.85), 8px 8px 24px rgba(163,177,198,0.45))',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Panel Header */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '-2px -2px 6px rgba(255,255,255,0.8), 2px 2px 6px rgba(163,177,198,0.4)',
            }}
          >
            <Sparkles size={16} color="#FFFFFF" />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>
              AI Financial Assistant
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary, #7A8FA3)', margin: 0 }}>
              Ask questions about your credit score, statement, or loan readiness
            </p>
          </div>
        </div>

        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary, #7A8FA3)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Expanded Message History */}
      {isExpanded && (
        <div
          style={{
            maxHeight: '300px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '12px',
            borderRadius: '16px',
            background: 'var(--bg-primary, #F0F4F8)',
            boxShadow: 'var(--shadow-inset, inset -3px -3px 8px rgba(255,255,255,0.8), inset 3px 3px 8px rgba(163,177,198,0.35))',
          }}
        >
          {messages.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #7A8FA3)', textAlign: 'center', margin: '20px 0' }}>
              💡 Ask questions like "How can I improve my score?" or "What do lenders check in my statement?"
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  gap: '8px',
                }}
              >
                {m.sender === 'assistant' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4A90E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={14} color="#fff" />
                  </div>
                )}

                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    background: m.sender === 'user' ? 'linear-gradient(135deg, #4A90E2, #357ABD)' : 'var(--bg-primary, #F0F4F8)',
                    color: m.sender === 'user' ? '#FFFFFF' : 'var(--text-primary, #2C3E50)',
                    boxShadow: m.sender === 'user'
                      ? '0 2px 8px rgba(74,144,226,0.3)'
                      : 'var(--shadow-card, -3px -3px 8px rgba(255,255,255,0.8), 3px 3px 8px rgba(163,177,198,0.35))',
                  }}
                >
                  <p style={{ margin: 0 }}>{m.text}</p>
                  <span style={{ fontSize: '10px', opacity: 0.7, display: 'block', marginTop: '4px', textAlign: 'right' }}>
                    {m.timestamp}
                  </span>
                </div>

                {m.sender === 'user' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#7C5CBF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={14} color="#fff" />
                  </div>
                )}
              </div>
            ))
          )}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7A8FA3', fontSize: '12px' }}>
              <Bot size={14} /> AI is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => { if (!isExpanded) setIsExpanded(true); }}
          placeholder="Ask about your score or statement..."
          style={{
            flex: 1,
            border: 'none',
            background: 'var(--bg-primary, #F0F4F8)',
            borderRadius: '14px',
            padding: '12px 18px',
            fontSize: '13px',
            color: 'var(--text-primary, #2C3E50)',
            boxShadow: 'var(--shadow-inset, inset -3px -3px 8px rgba(255,255,255,0.8), inset 3px 3px 8px rgba(163,177,198,0.35))',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          style={{
            background: input.trim() ? 'linear-gradient(135deg, #4A90E2, #357ABD)' : 'rgba(163,177,198,0.4)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '14px',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: input.trim() ? 'pointer' : 'default',
            boxShadow: input.trim() ? '-2px -2px 6px rgba(255,255,255,0.8), 2px 2px 6px rgba(74,144,226,0.4)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default InlineChatPanel;
