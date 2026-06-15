export default function Loading() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
      width: '100%',
    }}>
      <div style={{
        width: 36,
        height: 36,
        border: '3px solid rgba(99, 102, 241, 0.15)',
        borderTopColor: 'rgb(99, 102, 241)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
