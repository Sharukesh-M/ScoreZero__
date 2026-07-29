import React from 'react';
import { ShieldCheck, Repeat, Calendar, Shield, PiggyBank, TrendingDown, Ban, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LoanReadinessPageProps {
  onGoToUpload: () => void;
}

export const LoanReadinessPage: React.FC<LoanReadinessPageProps> = ({ onGoToUpload }) => {
  const nm = {
    bg: 'var(--bg-primary, #F0F4F8)',
    card: {
      background: 'var(--bg-primary, #F0F4F8)',
      borderRadius: '24px',
      boxShadow: 'var(--shadow-card, -8px -8px 24px rgba(255,255,255,0.85), 8px 8px 24px rgba(163,177,198,0.45))',
      padding: '32px',
    },
    inset: {
      background: 'var(--bg-primary, #F0F4F8)',
      borderRadius: '16px',
      boxShadow: 'var(--shadow-inset, inset -3px -3px 8px rgba(255,255,255,0.8), inset 3px 3px 8px rgba(163,177,198,0.35))',
      padding: '20px',
    },
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px 80px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Hero Framing */}
      <div style={{ ...nm.card, textAlign: 'center', background: 'linear-gradient(135deg, rgba(74,144,226,0.06), rgba(155,123,216,0.06))' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #4A90E2, #357ABD)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '-4px -4px 12px rgba(255,255,255,0.8), 4px 4px 12px rgba(163,177,198,0.4)' }}>
          <ShieldCheck size={28} color="#FFFFFF" />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary, #2C3E50)', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
          What Lenders Actually Look For in Your UPI Statement
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary, #7A8FA3)', maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
          Lenders evaluate cash flow behavior to understand your repayment capacity. Follow these practical habits to make your bank or UPI statement loan-ready.
        </p>
      </div>

      {/* Consistency Guidance Section */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #2C3E50)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Repeat size={20} color="#4A90E2" /> Keep Your Income & Cash Flow Consistent
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div style={nm.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(74,144,226,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Repeat size={20} color="#4A90E2" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>Primary Account Routing</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #7A8FA3)', lineHeight: 1.6, margin: 0 }}>
              Route your gig or freelance earnings into one main bank account rather than splitting payouts across multiple UPI apps or wallets.
            </p>
          </div>

          <div style={nm.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(74,144,226,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} color="#4A90E2" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>Predictable Schedules</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #7A8FA3)', lineHeight: 1.6, margin: 0 }}>
              Try to settle earnings on regular intervals (e.g. weekly or monthly) so lenders see stable deposit frequency over time.
            </p>
          </div>

          <div style={nm.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={20} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>Zero-Bounce Discipline</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #7A8FA3)', lineHeight: 1.6, margin: 0 }}>
              Never let your account balance hit zero or negative. A single failed transaction or ECS bounce significantly hurts approval odds.
            </p>
          </div>

          <div style={nm.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PiggyBank size={20} color="#22c55e" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>Always Keep a Buffer</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #7A8FA3)', lineHeight: 1.6, margin: 0 }}>
              Maintain a small cushion balance in your account at all times to absorb unexpected bill debits or subscription renewals.
            </p>
          </div>
        </div>
      </div>

      {/* Before You Apply Section */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #2C3E50)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TrendingDown size={20} color="#f59e0b" /> Key Preparation Before Applying
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div style={nm.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingDown size={20} color="#f59e0b" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>Limit Irregular Spends</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #7A8FA3)', lineHeight: 1.6, margin: 0 }}>
              Avoid large, non-essential discretionary purchases in the 30–60 days right before submitting your loan application.
            </p>
          </div>

          <div style={nm.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ban size={20} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>Avoid Multiple Enquiries</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #7A8FA3)', lineHeight: 1.6, margin: 0 }}>
              Do not apply to multiple lenders simultaneously within a short timeframe. Space out applications if necessary.
            </p>
          </div>
        </div>
      </div>

      {/* "What Good Looks Like" Illustration Card */}
      <div style={{ ...nm.card, background: 'linear-gradient(135deg, rgba(34,197,94,0.05), rgba(74,144,226,0.05))', borderLeft: '4px solid #22c55e' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#166534', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={20} color="#22c55e" /> What a Strong Statement Looks Like
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '14px', color: '#334155', margin: 0 }}>
            ✔ <strong>Consistent Deposits:</strong> Weekly settlements from primary platform/clients.
          </p>
          <p style={{ fontSize: '14px', color: '#334155', margin: 0 }}>
            ✔ <strong>Zero Penalty Charges:</strong> No bounced auto-debits or overdraft warnings.
          </p>
          <p style={{ fontSize: '14px', color: '#334155', margin: 0 }}>
            ✔ <strong>Upward Balance Trajectory:</strong> Ending balance higher than starting balance each month.
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <button
          onClick={onGoToUpload}
          style={{
            background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '16px',
            padding: '16px 36px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '-4px -4px 12px rgba(255,255,255,0.8), 4px 4px 14px rgba(74,144,226,0.4)',
            transition: 'all 0.2s ease',
          }}
        >
          Check Your Statement Now <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default LoanReadinessPage;
