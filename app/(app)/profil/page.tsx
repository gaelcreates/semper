"use client";

import { useState } from "react";
import Install from "../Install";
import InstagramStats from "../InstagramStats";
import { cleanHandle } from "../lib";
import { setProfile, signOut, useData } from "../store";

// Profil : le compte, puis les chiffres des réseaux (Instagram pour l'instant).
export default function Profil() {
  const d = useData()!;
  const p = d.profile;
  const [handle, setHandle] = useState(p.handle);
  const [name, setName] = useState(p.firstName);

  return (
    <div className="page wide">
      <header className="page-head"><h1>Profil</h1></header>

      <section className="box pf">
        <h2>Compte</h2>
        <div className="acct">
          <label className="fld"><span className="lbl">Prénom</span>
            <input className="inp big" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setProfile({ firstName: name.trim() })} placeholder="Prénom" />
          </label>
          <label className="fld"><span className="lbl">Instagram</span>
            <span className="at">
              <i>@</i>
              <input value={handle} onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))} onBlur={() => { const h = cleanHandle(handle); setHandle(h); setProfile({ handle: h }); }}
                placeholder="pseudo" autoComplete="off" autoCapitalize="none" spellCheck={false} />
            </span>
          </label>
          <label className="fld"><span className="lbl">E-mail</span>
            <input className="inp big" value={p.email} readOnly aria-readonly="true" />
          </label>
        </div>
      </section>

      <InstagramStats />

      <Install className="pf-install" />
      <button type="button" className="link out" onClick={signOut}>Se déconnecter</button>
    </div>
  );
}
