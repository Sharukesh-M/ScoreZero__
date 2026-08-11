import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Loader2, RotateCcw, Copy, Check, TrendingDown, Wallet, AlertTriangle, ShieldCheck, Zap, MessageSquare } from 'lucide-react';
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
  scoreContext?: ScoreResult | null;
}

function generateLocalAdvisoryText(q: string, score: ScoreResult): string {
  const val = score.score_value;
  const band = score.score_band;
  const qLower = q.toLowerCase();

  if (qLower.includes('loan') || qLower.includes('eligible') || qLower.includes('when') || qLower.includes('approval') || qLower.includes('lender')) {
    if (val >= 70) {
      return `Based on your calculated ScoreZero rating of **${val}/100 (${band})**:\n\n✅ **Loan Approval Status: HIGH READINESS**\n• Credit Risk: Low. Your score exceeds the standard 70/100 threshold.\n• Next Step: You are ready for pre-approved loan options! Maintain your clean deposit history.`;
    } else if (val >= 50) {
      const gap = 70 - val;
      return `Based on your calculated ScoreZero score of **${val}/100 (${band})**:\n\n⚠️ **Loan Approval Status: CONDITIONAL (30–60 Days Target)**\n• Benchmark: You are at ${val}/100. Unsecured loan approval requires **70/100** (**+${gap} points** needed).\n• Key Action Plan:\n  1. Maintain a ₹5,000+ minimum balance buffer to prevent auto-debit/EMI bounce penalties.\n  2. Reduce discretionary spending to raise your Savings Ratio.\n  3. Maintain consistent monthly income deposits.`;
    } else {
      const gap = 70 - val;
      return `Based on your calculated ScoreZero rating of **${val}/100 (${band})**:\n\n❌ **Loan Approval Status: NOT YET ELIGIBLE (BUILDING PHASE)**\n• Points Gap: Your score is ${val}/100 (Target is **70/100**, gap of **+${gap} points**).\n• Timeline: 60 to 90 days of disciplined transactions.\n• Action Plan:\n  1. Eliminate all bounce/NSF charges with a standing balance buffer.\n  2. Trim discretionary monthly transfers by 20%.\n  3. Consolidate income deposits into one central account.`;
    }
  }

  if (qLower.includes('do') || qLower.includes('should') || qLower.includes('improve') || qLower.includes('remedy') || qLower.includes('action') || qLower.includes('plan')) {
    const recs = score.recommendations || [];
    const r1 = recs[0] || 'Maintain steady salary/gig income deposits into your primary account.';
    const r2 = recs[1] || 'Keep a minimum ₹5,000 balance buffer to avoid bounce penalty charges.';
    const r3 = recs[2] || 'Cap discretionary spending below 25% of total inflow to boost your Savings Ratio.';
    return `Here is your personalized ScoreZero action plan for your score of **${val}/100 (${band})**:\n\n🎯 **Priority Action Plan**:\n1. ${r1}\n2. ${r2}\n3. ${r3}`;
  }

  const rec1 = score.recommendations?.[0] || 'Maintain consistent deposit regularity and a 20%+ monthly savings buffer.';
  return `Regarding **'${q}'**:\n\n📊 **ScoreZero Overview**: Your current calculated rating is **${val}/100 (${band})**.\n\n💡 **Advisor Recommendation**: ${rec1}`;
}

export const GeminiStatementChat: React.FC<GeminiStatementChatProps> = ({ uploadId, fileName, scoreContext }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `Hello! I am your ScoreZero AI Financial Advisor. Ask me anything about ${fileName ? `"${fileName}"` : 'your bank statement PDF'} — such as highest expense items, income deposit regularity, EMI bounce risks, or credit readiness recommendations!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('All');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickTopics = [
    { label: 'All', query: '' },
    { label: ' Executive Summary', query: 'Give me a concise 3-bullet financial summary of my statement.' },
    { label: ' Top Expenses', query: 'What were my top 3 highest expense transactions in this statement?' },
    { label: ' Income Deposits', query: 'Summarize all my income deposits, salary payouts, and gig credits.' },
    { label: ' Bounce Check', query: 'Did I incur any bank bounce charges, penalty fees, or failed auto-debits?' },
    { label: ' Loan Readiness', query: 'What practical steps can I take to raise my ScoreZero score for loan approval?' },
  ];

  const promptCards = [
    {
      icon: <TrendingDown size={20} color="#EF4444" />,
      title: 'Highest Expenses',
      desc: 'Identify top cash drains & major vendors',
      query: 'What were my top 3 highest expense transactions in this statement?',
    },
    {
      icon: <Wallet size={20} color="#22C55E" />,
      title: 'Income & Credits',
      desc: 'Analyze salary regularity & deposit flow',
      query: 'Summarize all my income deposits, salary payouts, and gig credits.',
    },
    {
      icon: <AlertTriangle size={20} color="#F59E0B" />,
      title: 'Bounce & Penalty Check',
      desc: 'Detect NSF fees, charges & failed EMIs',
      query: 'Did I have any bank bounce charges, penalty fees, or failed auto-debits?',
    },
    {
      icon: <ShieldCheck size={20} color="#4A90E2" />,
      title: 'Loan Readiness Tips',
      desc: 'Actionable steps for lender approval',
      query: 'What practical steps can I take to raise my ScoreZero score for loan approval?',
    },
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: `Chat reset! Ask any new question about ${fileName ? `"${fileName}"` : 'your bank statement'} or credit health.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

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
      let aiText = '';

      if (uploadId) {
        try {
          const res = await nodeApiClient.statements.chat(uploadId, q, scoreContext);
          aiText = res.answer || res.reply || '';
        } catch {
          // Fall through to general chat API
        }
      }

      if (!aiText) {
        try {
          const res = await nodeApiClient.chat(q, scoreContext);
          aiText = res.reply || res.answer || '';
        } catch {
          // Fall through
        }
      }

      const isStaleStatic = (text: string) => {
        return text.includes("Ask about highest expenses") || text.includes("transactions total): Ask about");
      };

      if (!aiText || isStaleStatic(aiText)) {
        if (scoreContext) {
          aiText = generateLocalAdvisoryText(q, scoreContext);
        }
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiText || `AI Financial Advisory for "${q}": Route all earnings into your primary bank account, maintain a ₹5,000+ buffer balance to prevent EMI/UPI bounce penalties, and avoid high discretionary transfers.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const fallbackText = scoreContext ? generateLocalAdvisoryText(q, scoreContext) : (err.message || 'Unable to connect to Statement AI. Please try again.');
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format text with styled bullets and bold phrases
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const content = line.trim();
      if (!content) return <div key={idx} style={{ height: 6 }} />;

      const isBullet = content.startsWith('•') || content.startsWith('-') || /^\d+\./.test(content);
      const isHeader = content.endsWith(':') || content.startsWith('**') || content.startsWith('###');

      return (
        <p
          key={idx}
          style={{
            margin: idx === lines.length - 1 ? 0 : '0 0 8px 0',
            lineHeight: 1.65,
            fontWeight: isHeader ? 700 : 400,
            fontSize: isHeader ? '14px' : '13.5px',
          }}
        >
          {isBullet ? (
            <span style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#4A90E2', fontWeight: 800 }}>•</span>
              <span>{content.replace(/^[-•\d.]+\s*/, '')}</span>
            </span>
          ) : (
            content.replace(/\*\*/g, '')
          )}
        </p>
      );
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        width: '100%',
        maxWidth: '1000px',
        margin: '0 auto',
        animation: 'fadeIn 0.4s ease',
      }}
    >
      {/* ── Top Header Bar ────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-secondary, #F0F4F8)',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-card)',
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #4A90E2 0%, #9B7BD8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(74, 144, 226, 0.35)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={22} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #2C3E50)', margin: 0, letterSpacing: '-0.3px' }}>
                AI Financial Advisory
              </h2>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#22c55e',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                ScoreZero AI
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary, #7A8FA3)', margin: '3px 0 0 0' }}>
              {fileName ? `Active Statement: ${fileName}` : 'General Credit & Cashflow Guidance'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleResetChat}
            title="Reset Conversation"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '12px',
              background: 'var(--bg-primary, #F0F4F8)',
              border: 'none',
              color: 'var(--text-secondary, #7A8FA3)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-raised)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#4A90E2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary, #7A8FA3)';
            }}
          >
            <RotateCcw size={14} />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* ── Quick Topic Filter Strip ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          padding: '2px 4px',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
        className="no-scrollbar"
      >
        {quickTopics.map((topic) => {
          const isActive = activeTab === topic.label;
          return (
            <button
              key={topic.label}
              onClick={() => {
                setActiveTab(topic.label);
                if (topic.query) handleSend(topic.query);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '14px',
                fontSize: '12px',
                fontWeight: isActive ? 700 : 600,
                color: isActive ? '#FFFFFF' : 'var(--text-secondary, #7A8FA3)',
                background: isActive
                  ? 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)'
                  : 'var(--bg-secondary, #F0F4F8)',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: isActive
                  ? '0 4px 14px rgba(74, 144, 226, 0.35)'
                  : 'var(--shadow-raised)',
                transition: 'all 0.2s ease',
              }}
            >
              {topic.label}
            </button>
          );
        })}
      </div>

      {/* ── Interactive Prompt Cards Grid (when 1 message) ──────────── */}
      {messages.length <= 1 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
          }}
        >
          {promptCards.map((card, index) => (
            <div
              key={index}
              onClick={() => handleSend(card.query)}
              className="card-hover-effect"
              style={{
                background: 'var(--bg-secondary, #F0F4F8)',
                borderRadius: '20px',
                boxShadow: 'var(--shadow-card)',
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'var(--bg-primary, #F0F4F8)',
                    boxShadow: 'var(--shadow-raised)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #2C3E50)' }}>
                  {card.title}
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #7A8FA3)', lineHeight: 1.5 }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Main Chat Stream Window ───────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-secondary, #F0F4F8)',
          borderRadius: '28px',
          boxShadow: 'var(--shadow-card)',
          padding: '24px 28px',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '400px',
          maxHeight: '620px',
        }}
      >
        {/* Stream Message List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            paddingRight: '6px',
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '14px',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.sender === 'user' ? '82%' : '90%',
              }}
            >
              {msg.sender === 'ai' && (
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)',
                  }}
                >
                  <Bot size={18} color="#FFFFFF" />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '4px 20px 20px 20px',
                    background:
                      msg.sender === 'user'
                        ? 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)'
                        : 'var(--bg-primary, #F0F4F8)',
                    boxShadow:
                      msg.sender === 'user'
                        ? '0 6px 18px rgba(74, 144, 226, 0.35)'
                        : 'var(--shadow-raised)',
                    borderLeft: msg.sender === 'ai' ? '4px solid #4A90E2' : 'none',
                    color: msg.sender === 'user' ? '#FFFFFF' : 'var(--text-primary, #2C3E50)',
                  }}
                >
                  {renderFormattedText(msg.text)}

                  {/* AI Response Tools */}
                  {msg.sender === 'ai' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '10px',
                        marginTop: '12px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                      }}
                    >
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        title="Copy Answer"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copiedId === msg.id ? '#22c55e' : 'var(--text-secondary, #7A8FA3)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 6px',
                          borderRadius: '6px',
                        }}
                      >
                        {copiedId === msg.id ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-secondary, #7A8FA3)',
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
                    width: '36px',
                    height: '36px',
                    borderRadius: '12px',
                    background: 'var(--bg-primary, #F0F4F8)',
                    boxShadow: 'var(--shadow-raised)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <User size={18} color="#4A90E2" />
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: '14px', alignSelf: 'flex-start' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4A90E2, #9B7BD8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Loader2 size={18} color="#FFFFFF" className="animate-spin" />
              </div>
              <div
                style={{
                  padding: '14px 20px',
                  borderRadius: '4px 20px 20px 20px',
                  background: 'var(--bg-primary, #F0F4F8)',
                  boxShadow: 'var(--shadow-raised)',
                  borderLeft: '4px solid #4A90E2',
                  color: 'var(--text-secondary, #7A8FA3)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Sparkles size={16} color="#4A90E2" />
                Analyzing statement transactions & compiling recommendations...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input Controls Bar ────────────────────────────────────── */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(0, 0, 0, 0.06)',
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
              background: 'var(--bg-primary, #F0F4F8)',
              boxShadow: 'var(--shadow-inset)',
              borderRadius: '20px',
              padding: '6px 8px 6px 18px',
            }}
          >
            <MessageSquare size={18} color="#7A8FA3" style={{ flexShrink: 0 }} />

            <input
              type="text"
              placeholder={fileName ? `Ask a question about "${fileName}"...` : 'Ask any question about your PDF statement or credit health...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary, #2C3E50)',
                fontSize: '14px',
              }}
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                background: input.trim()
                  ? 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)'
                  : 'rgba(122, 143, 163, 0.2)',
                border: 'none',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                boxShadow: input.trim() ? '0 4px 14px rgba(74, 144, 226, 0.4)' : 'none',
                transition: 'all 0.2s ease',
                flexShrink: 0,
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

export default GeminiStatementChat;
