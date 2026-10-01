import JoinForm from "../../JoinForm";

// Le formulaire de la lettre, en bas de chaque page de l'archive.
export default function Abonnement() {
  return (
    <aside className="abo" id="recevoir">
      <h2>Reçois la prochaine <span className="w">dans ta boîte.</span></h2>
      <p className="story">Une lettre par semaine sur la constance. Gratuit, désinscription en un clic.</p>
      <JoinForm label="Recevoir la lettre" done="C'est noté. La prochaine lettre arrive dans ta boîte." />
    </aside>
  );
}
