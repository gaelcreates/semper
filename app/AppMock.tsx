import Mark from "./Mark";

// Aperçu de l'outil, en HTML et CSS : la vue semaine, des fiches par statut, la série.
// Tout est animé en CSS pur (voir globals.css, section « Aperçu »).
export default function AppMock() {
  return (
    <div className="mock" aria-hidden="true">
      <div className="mock-bar">
        <div className="mock-brand"><Mark /> <span>Semaine 39</span></div>
        <div className="mock-views">
          <span>Liste</span><span>Kanban</span><span className="on">Calendrier</span>
        </div>
        <div className="mock-streak">
          <i className="dot" />
          <span>Série</span>
          <b className="tick"><span>6</span><span>7</span></b>
          <span>semaines</span>
        </div>
      </div>

      <div className="mock-grid">
        <div className="mock-day"><div className="mock-dn">Lun <em>21</em></div>
          <div className="mock-card c1"><span className="chip s-tourner">À tourner</span><p>Pourquoi tu t'arrêtes</p></div>
        </div>
        <div className="mock-day"><div className="mock-dn">Mar <em>22</em></div>
          <div className="mock-block c2">Montage · 2 h</div>
        </div>
        <div className="mock-day"><div className="mock-dn">Mer <em>23</em></div>
          <div className="mock-card c3">
            <span className="chip swap"><span className="s-monter">À monter</span><span className="s-publie">Publié</span></span>
            <p>3 erreurs de calendrier</p>
          </div>
        </div>
        <div className="mock-day"><div className="mock-dn">Jeu <em>24</em></div>
          <div className="mock-card c4"><span className="chip s-ecrire">À écrire</span><p>Le stock, pas la motivation</p></div>
        </div>
        <div className="mock-day"><div className="mock-dn">Ven <em>25</em></div>
          <div className="mock-card c5 done"><span className="chip s-publie">Publié</span><p>Ma semaine de fondateur</p></div>
        </div>
        <div className="mock-day"><div className="mock-dn">Sam <em>26</em></div>
          <div className="mock-card c6"><span className="chip s-idee">Idée</span><p>Le piège du volume</p></div>
        </div>
        <div className="mock-day today"><div className="mock-dn">Dim <em>27</em></div>
          <div className="mock-add c7"><span>+</span> Créer</div>
        </div>
      </div>
    </div>
  );
}
