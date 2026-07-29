import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';
import nodeApiClient from '../../api/nodeApiClient';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface GeminiStatementChatProps {
  uploadId?: string;
  fileName?: string;
}

export const GeminiStatementChat: React.FC<GeminiStatementChatProps> = ({ uploadId, fileName }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `Hello! I am your ScoreZero Statement AI. Ask me anything about ${fileName ? `"${fileName}"` : 'your uploaded statement PDF'} — such as highest expenses, income sources, vendor totals, or bounce charges!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickQuestions = [
    'What was my highest expense item?',
    'How much did I receive in total income?',
    'Did I have any bounce or penalty fees?',
    'Summarize my spending discipline.',
  ];

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput('');
    setLoading(true);

    try {
      if (uploadId) {
        const res = await nodeApiClient.statements.chat(uploadId, q);
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: res.answer || 'No insights returned from statement.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `AI Guidance for "${q}": To build strong credit readiness, keep salary deposits regular, avoid EMI bounce fees, and restrict discretionary transfers. Upload your bank statement PDF in the Dashboard for instant personalized extraction & answers!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: err.response?.data?.error || err.message || 'Unable to connect to Statement AI. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '620px',
        background: '#0d0d11',
        borderRadius: '28px',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── CSS Keyframe Animations for Glowing Blobs ──────────────── */}
      <style>{`
        @keyframes geminiGlow1 {
          0% { transform: translate(0px, 0px) scale(1) rotate(0deg); opacity: 0.85; }
          33% { transform: translate(60px, -40px) scale(1.15) rotate(120deg); opacity: 0.95; }
          66% { transform: translate(-30px, 50px) scale(0.9) rotate(240deg); opacity: 0.75; }
          100% { transform: translate(0px, 0px) scale(1) rotate(360deg); opacity: 0.85; }
        }
        @keyframes geminiGlow2 {
          0% { transform: translate(0px, 0px) scale(1.1) rotate(0deg); opacity: 0.8; }
          40% { transform: translate(-70px, 40px) scale(0.95) rotate(-140deg); opacity: 0.95; }
          80% { transform: translate(50px, -60px) scale(1.2) rotate(160deg); opacity: 0.7; }
          100% { transform: translate(0px, 0px) scale(1.1) rotate(0deg); opacity: 0.8; }
        }
        @keyframes geminiGlow3 {
          0% { transform: translate(0px, 0px) scale(0.9) rotate(0deg); opacity: 0.75; }
          50% { transform: translate(80px, 60px) scale(1.25) rotate(180deg); opacity: 0.95; }
          100% { transform: translate(0px, 0px) scale(0.9) rotate(360deg); opacity: 0.75; }
        }
      `}</style>

      {/* ── 3 Ambient Glowing Blur Blobs Behind Chat Window ───────────── */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-5%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #4285F4 0%, #A142F4 60%, transparent 80%)',
          filter: 'blur(120px)',
          animation: 'geminiGlow1 16s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-5%',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #A142F4 0%, #EA4335 55%, transparent 75%)',
          filter: 'blur(120px)',
          animation: 'geminiGlow2 20s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '35%',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #FBBC05 0%, #4285F4 65%, transparent 80%)',
          filter: 'blur(110px)',
          animation: 'geminiGlow3 18s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* ── Glass Chat UI Overlay ────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flex: 1,
          background: 'rgba(13, 13, 17, 0.75)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4285F4 0%, #A142F4 50%, #EA4335 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(66, 133, 244, 0.4)',
              }}
            >
              <Sparkles size={20} color="#FFFFFF" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.2px' }}>
                Statement AI Assistant
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94A3B8' }}>
                Ask questions about {fileName ? fileName : 'your uploaded statement'}
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(66, 133, 244, 0.15)',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              fontSize: '11px',
              fontWeight: 600,
              color: '#80B3FF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4285F4', boxShadow: '0 0 8px #4285F4' }} />
            Gemini Ambient AI
          </div>
        </div>

        {/* Message Stream */}
        <div
          style={{
            flex: 1,
            padding: '24px 28px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            maxHeight: '440px',
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '12px',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
              }}
            >
              {msg.sender === 'ai' && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #4285F4, #A142F4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 10px rgba(161, 66, 244, 0.3)',
                  }}
                >
                  <Bot size={16} color="#FFFFFF" />
                </div>
              )}

              <div>
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    background:
                      msg.sender === 'user'
                        ? 'linear-gradient(135deg, #4285F4 0%, #3367D6 100%)'
                        : 'rgba(255, 255, 255, 0.07)',
                    border: msg.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    boxShadow: msg.sender === 'user' ? '0 4px 15px rgba(66, 133, 244, 0.3)' : '0 4px 15px rgba(0, 0, 0, 0.2)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.text}
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#64748B',
                    marginTop: '4px',
                    display: 'block',
                    textAlign: msg.sender === 'user' ? 'right' : 'left',
                  }}
                >
                  {msg.timestamp}
                </span>
              </div>

              {msg.sender === 'user' && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <User size={16} color="#FFFFFF" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4285F4, #A142F4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Loader2 size={16} color="#FFFFFF" className="animate-spin" />
              </div>
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: '20px 20px 20px 4px',
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94A3B8',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Sparkles size={14} color="#A142F4" />
                Analyzing statement transactions...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div style={{ padding: '0 28px 12px 28px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {quickQuestions.map((qq, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qq)}
              disabled={loading}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#CBD5E1',
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(66, 133, 244, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(66, 133, 244, 0.4)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.color = '#CBD5E1';
              }}
            >
              {qq}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '16px 28px 24px 28px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '6px 8px 6px 18px',
            }}
          >
            <input
              type="text"
              placeholder="Ask a question about your PDF statement..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#FFFFFF',
                fontSize: '14px',
              }}
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: input.trim()
                  ? 'linear-gradient(135deg, #4285F4 0%, #A142F4 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                boxShadow: input.trim() ? '0 4px 15px rgba(66, 133, 244, 0.4)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Send size={18} color="#FFFFFF" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
