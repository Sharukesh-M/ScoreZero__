import React, { useState } from 'react';
import { Sparkles, Send, Loader2, Bot } from 'lucide-react';
import nodeApiClient from '../../api/nodeApiClient';

interface GeminiSearchbarChatProps {
  uploadId?: string;
}

export const GeminiSearchbarChat: React.FC<GeminiSearchbarChatProps> = ({ uploadId }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const quickQuestions = [
    'Summary of spending',
    'Loan eligibility tips',
    'Top expense categories',
    'How to boost my score',
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || question;
    if (!textToSend.trim()) return;

    setLoading(true);
    setAnswer(null);

    try {
      if (uploadId && uploadId !== 'undefined') {
        const res = await nodeApiClient.statements.chat(uploadId, textToSend);
        setAnswer(res.answer || 'Analysis completed for your statement.');
      } else {
        const latest = await nodeApiClient.scores.latest();
        if (latest?.upload_id) {
          const res = await nodeApiClient.statements.chat(latest.upload_id, textToSend);
          setAnswer(res.answer || 'Analysis completed for your statement.');
        } else {
          setAnswer(`Advice for "${textToSend}": To improve your financial readiness, maintain steady monthly income credits, limit discretionary transfers, and keep bill payments on time.`);
        }
      }
    } catch {
      setAnswer('Could not reach AI advisor. Please upload a statement or check server connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      margin: '8px 0 16px 0',
      width: '100%',
    }}>
      {/* ── Searchbar Container with Gemini Gradient Glow Border ── */}
      <div style={{
        position: 'relative',
        borderRadius: '999px',
        padding: '2px',
        background: 'linear-gradient(135deg, #4285F4, #A142F4, #EA4335, #FBBC05)',
        boxShadow: '0 4px 20px rgba(66, 133, 244, 0.25)',
        transition: 'all 0.3s ease',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          borderRadius: '999px',
          background: 'var(--bg-secondary, #0d0d11)',
          backdropFilter: 'blur(16px)',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4285F4, #A142F4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(161, 66, 244, 0.4)',
          }}>
            <Sparkles size={16} color="#FFFFFF" />
          </div>

          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask any question about your statement (optional)..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-primary, #FFFFFF)',
              padding: '6px 0',
            }}
          />

          <button
            onClick={() => handleSend()}
            disabled={loading || !question.trim()}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: question.trim() ? 'linear-gradient(135deg, #4285F4, #357ABD)' : 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: question.trim() ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
      </div>

      {/* ── Quick Question Pills ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingLeft: '8px' }}>
        {quickQuestions.map((q) => (
          <button
            key={q}
            onClick={() => { setQuestion(q); handleSend(q); }}
            style={{
              padding: '5px 12px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'var(--bg-secondary, rgba(255,255,255,0.05))',
              color: 'var(--text-secondary, #94A3B8)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4285F4';
              e.currentTarget.style.color = '#4285F4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = 'var(--text-secondary, #94A3B8)';
            }}
          >
            + {q}
          </button>
        ))}
      </div>

      {/* ── AI Response Pop Card ── */}
      {answer && (
        <div style={{
          background: 'var(--bg-secondary, #121827)',
          borderRadius: '20px',
          padding: '18px 24px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid rgba(66, 133, 244, 0.25)',
          animation: 'fadeIn 0.3s ease',
          display: 'flex',
          gap: '14px',
          alignItems: 'flex-start',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4285F4, #A142F4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Bot size={18} color="#FFFFFF" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#4285F4', margin: '0 0 4px 0' }}>Gemini AI Response</p>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary, #E2E8F0)', margin: 0 }}>{answer}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeminiSearchbarChat;
