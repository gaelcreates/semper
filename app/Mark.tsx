import { LOGO_PATH, SYMBOL_BOX as b } from "./brand";

// Le symbole Semper seul, recadré sur sa forme visible. Sa hauteur suit la police du parent (0,558 em),
// posé sur la ligne de base : dans un texte, il a exactement la hauteur des minuscules de « semper ».
export default function Mark({ className = "", full = false }: { className?: string; full?: boolean }) {
  return (
    <svg className={`mark${className ? ` ${className}` : ""}`} viewBox={full ? "0 0 100 100" : `${b.x - 1.5} ${b.y - 1.5} ${b.w + 3} ${b.h + 3}`} aria-hidden="true">
      <path d={LOGO_PATH} fill="currentColor" />
    </svg>
  );
}
