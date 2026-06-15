export default function Loading() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ height: 24, width: 160, borderRadius: 8, background: 'rgba(var(--text-muted), 0.08)', marginBottom: 20 }} />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          height: 72,
          borderRadius: 14,
          background: 'rgba(var(--text-muted), 0.06)',
          marginBottom: 10,
          animation: 'pulse 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}
