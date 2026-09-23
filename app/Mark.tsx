// Le signe Semper : un cercle ouvert et un point posé dans l'ouverture.
// Le point et l'ouverture tournent ensemble : le point avance, le cercle s'adapte.
// `spin` : rotation continue (chargement). Sans `spin` : un tour lent de temps en temps.
export default function Mark({ spin = false, className = "" }: { spin?: boolean; className?: string }) {
  return (
    <svg className={`mark${spin ? " spin" : ""}${className ? ` ${className}` : ""}`} viewBox="-1.3 -1.3 2.6 2.6" aria-hidden="true">
      <g className="mark-g">
        <path d="M0.968 -0.250 A1 1 0 1 1 0.242 -0.970" fill="none" stroke="currentColor" strokeWidth="0.24" strokeLinecap="round" />
        <circle cx="0.707" cy="-0.707" r="0.19" fill="currentColor" />
      </g>
    </svg>
  );
}
