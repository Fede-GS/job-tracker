export default function PageTransition({ children }) {
  return (
    <div style={{ animation: 'fadeInUp 0.35s ease forwards' }}>
      {children}
    </div>
  );
}
