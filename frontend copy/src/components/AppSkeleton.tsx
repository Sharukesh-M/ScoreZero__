import { Skeleton } from '@/components/ui/skeleton';

/**
 * AppSkeleton — shown while auth state resolves on initial page load.
 * Automatically shows the dashboard skeleton if a token is present,
 * or the landing skeleton otherwise — so there's zero jarring layout shift.
 */
export function AppSkeleton() {
  const hasToken = Boolean(localStorage.getItem('scorezero_token'));
  return hasToken ? <DashboardSkeleton /> : <LandingSkeleton />;
}

/** Skeleton that matches the neumorphism dashboard shell */
function DashboardSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8', fontFamily: 'Inter, sans-serif' }}>
      {/* Top nav bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#F0F4F8', boxShadow: '0 4px 20px rgba(163,177,198,0.3)',
        padding: '12px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton className="w-10 h-10 rounded-xl" style={{ background: '#D8E0EA' } as React.CSSProperties} />
          <Skeleton className="h-5 w-28" style={{ background: '#D8E0EA' } as React.CSSProperties} />
          <Skeleton className="h-8 w-24 rounded-xl" style={{ background: '#D8E0EA' } as React.CSSProperties} />
        </div>
        {/* Center nav tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[90, 110, 80, 70, 100].map((w, i) => (
            <Skeleton key={i} className="h-9 rounded-xl" style={{ width: w, background: '#D8E0EA' } as React.CSSProperties} />
          ))}
        </div>
        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton className="w-9 h-9 rounded-full" style={{ background: '#D8E0EA' } as React.CSSProperties} />
          <Skeleton className="w-9 h-9 rounded-full" style={{ background: '#D8E0EA' } as React.CSSProperties} />
        </div>
      </div>

      {/* Main content area */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px 60px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Hero score card skeleton */}
        <Skeleton className="w-full rounded-3xl" style={{ height: 200, background: '#D8E0EA' } as React.CSSProperties} />

        {/* Metric grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="rounded-3xl" style={{ height: 160, background: '#D8E0EA' } as React.CSSProperties} />
          ))}
        </div>

        {/* Recommendations card */}
        <Skeleton className="w-full rounded-3xl" style={{ height: 220, background: '#D8E0EA' } as React.CSSProperties} />
      </div>
    </div>
  );
}

/** Skeleton that matches the dark landing page shell */
function LandingSkeleton() {
  return (
    <div className="min-h-screen bg-[#08101C] flex flex-col">
      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#08101C]/80 backdrop-blur-md border-b border-slate-800/40 h-16 sm:h-20 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl bg-slate-800" />
            <Skeleton className="h-5 w-32 bg-slate-800" />
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Skeleton className="h-4 w-20 bg-slate-800" />
            <Skeleton className="h-4 w-24 bg-slate-800" />
            <Skeleton className="h-4 w-16 bg-slate-800" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-16 rounded-full bg-slate-800" />
            <Skeleton className="h-8 w-20 rounded-full bg-slate-700" />
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center pt-24 pb-16 px-6 gap-8">
        <Skeleton className="h-6 w-48 rounded-full bg-slate-800" />
        <div className="flex flex-col items-center gap-4 w-full max-w-3xl">
          <Skeleton className="h-12 w-full max-w-2xl bg-slate-800 rounded-xl" />
          <Skeleton className="h-12 w-3/4 bg-slate-800 rounded-xl" />
          <Skeleton className="h-12 w-1/2 bg-slate-800 rounded-xl" />
        </div>
        <div className="flex flex-col items-center gap-2 w-full max-w-xl">
          <Skeleton className="h-4 w-full bg-slate-800/80 rounded" />
          <Skeleton className="h-4 w-5/6 bg-slate-800/80 rounded" />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <Skeleton className="h-12 w-36 rounded-full bg-slate-700" />
          <Skeleton className="h-12 w-36 rounded-full bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
