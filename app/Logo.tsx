import Mark from "./Mark";

// Le logo complet : symbole + « semper » en Suisse Intl Black, minuscules.
// Le symbole a la hauteur des lettres et repose sur la ligne de base.
export default function Logo() {
  return (
    <span className="logo" role="img" aria-label="Semper">
      <Mark /><span className="logo-name">semper</span>
    </span>
  );
}
