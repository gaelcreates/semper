// Informations du site. À compléter avant la mise en ligne : les champs marqués « à compléter ».
export const site = {
  url: "https://trysemper.app",
  title: "Semper, le calendrier éditorial des créateurs de contenu",
  description:
    "Tes idées, tes vidéos et ton rythme au même endroit. Une série qui compte chaque jour tenu. Gratuit, sans rien à configurer.",
  owner: "Gael Fischer",
  // Adresse de contact affichée sur les pages légales.
  contactEmail: "contact@trysemper.app",
  // Adresse postale exigée par la loi suisse pour un site commercial.
  postalAddress: "Vaud, Suisse",
};

// L'outil ouvert à tous (SEMPER_OPEN=1 sur Vercel, puis redéploiement) : la vitrine passe de la waitlist à l'inscription.
export const isOpen = () => process.env.SEMPER_OPEN === "1";
