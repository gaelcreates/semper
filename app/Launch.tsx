// La date d'ouverture en grand, au-dessus du titre ; une fois ouvert, « C'est ouvert ».
export default function LaunchDate({ open = false }: { open?: boolean }) {
  if (open) return (
    <div className="launch fade">
      <i className="dot launch-on" />
      <span><span className="lbl">C&apos;est ouvert</span><span>Gratuit pour les créateurs</span></span>
    </div>
  );
  return (
    <div className="launch fade">
      <b className="disp">26.10</b>
      <span><span className="lbl">Ouverture</span><span>Lundi 26 octobre</span></span>
    </div>
  );
}
