/* ═══════════════════════════════════════════════════════════════════════
   LES OUTILS DE LA PAGE — options « calculatrice: oui » et « formulaire: »
   de SITE.md, posées le 6 octobre 2026 à la demande de l'utilisateur : que
   l'élève calcule et retrouve ses formules sans quitter la page, et fasse
   tout par le site.

   Les outils eux-mêmes ne sont pas ici : ce sont ceux du jeu d'entraînement,
   _commun/entrainement/moteur/ (calculette.js, formulaire.js et leurs
   feuilles), que site.py recopie dans assets/, avec le formulaire de la
   classe en données (formulaire-donnees.js). Ce script ne fait que les poser :
   un bouton par outil dans la barre haute, juste avant « Sommaire » — un seul,
   « Outils », sur téléphone —, et un panneau à onglets à droite.

   Le formulaire s'ouvre sur la section de la page : J4 sur la séance J4,
   AUTO 04 sur la fiche AUTO-04. Le panneau suit l'élève d'une page à l'autre,
   le temps de l'onglet : l'outil ouvert sous outils.<clé du site>, les
   calculs sous calculatrice.<clé du site>. Rien ne quitte l'appareil.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var DISPO = { calculatrice: !!window.Calculette, formulaire: !!(window.Formulaire && window.FORMULAIRE) };
  if ((!DISPO.calculatrice && !DISPO.formulaire) || document.querySelector(".calculatrice")) return;
  var NOMS = { calculatrice: "Calculatrice", formulaire: "Formulaire" };
  var page = document.querySelector(".page[data-site]");
  var site = (page && page.getAttribute("data-site")) || "site";
  var idPage = (page && page.getAttribute("data-page")) || "";
  var cle = "outils." + site;
  var outils = Object.keys(NOMS).filter(function (n) { return DISPO[n]; });
  var actif = null, calc = null, formFait = false, onglets = {}, corps = {}, boutons = {};

  function lire(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ecrire(k, v) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function el(tag, classe, texte) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texte) n.textContent = texte;
    return n;
  }

  /* ─── le panneau, dans le markup et les classes de calculette.css et formulaire.css ─── */
  var panneau = el("aside", "calculatrice");
  panneau.setAttribute("aria-label", "Outils");
  panneau.hidden = true;
  var tete = el("div", "calc-tete");
  var barreOnglets;
  if (outils.length > 1) {
    barreOnglets = el("div", "outils-onglets");
    barreOnglets.setAttribute("role", "tablist");
    outils.forEach(function (n) {
      var t = el("button", "outil-onglet", NOMS[n]);
      t.type = "button";
      t.setAttribute("role", "tab");
      t.addEventListener("click", function () { ouvrir(n, true); });
      barreOnglets.appendChild(t);
      onglets[n] = t;
    });
  } else barreOnglets = el("span", "calc-titre", NOMS[outils[0]]);
  var fermer = el("button", "calc-fermer", "Fermer");
  fermer.type = "button";
  tete.appendChild(barreOnglets);
  tete.appendChild(fermer);
  panneau.appendChild(tete);
  outils.forEach(function (n) {
    corps[n] = el("div", n === "calculatrice" ? "calc-corps" : "form-corps");
    corps[n].hidden = true;
    panneau.appendChild(corps[n]);
  });
  document.body.appendChild(panneau);

  /* la chasse fixe de la charte, que la feuille du kit ne nomme pas en variable */
  var sonde = el("span", "mono");
  sonde.style.display = "none";
  document.body.appendChild(sonde);
  var mono = getComputedStyle(sonde).fontFamily;
  sonde.parentNode.removeChild(sonde);
  if (mono) panneau.style.setProperty("--mono", mono);

  function remplirFormulaire() {
    if (formFait) return;
    formFait = true;
    var parts = Formulaire.filtre(window.FORMULAIRE, true);
    corps.formulaire.appendChild(parts[0]);
    corps.formulaire.appendChild(parts[1]);
    /* celui qui va bien : la section de la page, reperee et mise en tete de lecture */
    var ici = Formulaire.trouver(parts[1], idPage, window.FORMULAIRE.pages);
    ici.forEach(function (s) { s.classList.add("form-ici"); });
    if (ici.length) setTimeout(function () { corps.formulaire.scrollTop = Math.max(0, ici[0].offsetTop - corps.formulaire.offsetTop - 8); }, 30);
  }
  function ouvrir(n, focus) {
    if (n === "calculatrice" && !calc) calc = Calculette.monter(corps.calculatrice, { memoire: "calculatrice." + site });
    if (n === "formulaire") remplirFormulaire();
    actif = n;
    panneau.hidden = false;
    document.body.classList.add("calc-ouverte");
    outils.forEach(function (x) {
      corps[x].hidden = x !== n;
      if (onglets[x]) onglets[x].setAttribute("aria-selected", x === n ? "true" : "false");
    });
    majBoutons();
    ecrire(cle, n);
    if (focus && n === "calculatrice") calc.focus();
  }
  function fermerPanneau() {
    actif = null;
    panneau.hidden = true;
    document.body.classList.remove("calc-ouverte");
    majBoutons();
    ecrire(cle, null);
  }
  function majBoutons() {
    Object.keys(boutons).forEach(function (x) {
      boutons[x].setAttribute("aria-pressed", (x === "outils" ? !!actif : actif === x) ? "true" : "false");
    });
  }
  fermer.addEventListener("click", function () { fermerPanneau(); });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && actif && panneau.contains(document.activeElement)) fermerPanneau();
  });

  /* ─── les boutons : dans la barre de la coquille, sinon dans la barre de page, sinon flottants.
     Un par outil ; sur telephone, un seul « Outils » (la barre n'en tient pas trois). ─── */
  function bouton(n, texte, classe) {
    var b = el("button", "bouton-outil " + classe, texte);
    b.type = "button";
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", function () {
      if (n === "outils") { if (actif) fermerPanneau(); else ouvrir(lire(cle) || outils[0], true); }
      else if (actif === n) fermerPanneau();
      else ouvrir(n, true);
    });
    boutons[n] = b;
    return b;
  }
  var lot = document.createDocumentFragment();
  outils.forEach(function (n) { lot.appendChild(bouton(n, NOMS[n], outils.length > 1 ? "large" : "")); });
  if (outils.length > 1) lot.appendChild(bouton("outils", "Outils", "etroit"));
  var droite = document.querySelector(".doc-barre .droite");
  var barre = document.querySelector(".barre-site");
  if (droite) droite.insertBefore(lot, droite.querySelector(".doc-som-plier") || droite.firstChild);
  else if (barre) barre.appendChild(lot);
  else {
    var flottant = el("div", "outils-flottants");
    flottant.appendChild(lot);
    document.body.appendChild(flottant);
  }

  /* Rouvert a l'arrivee sur une page, la ou il se tient a cote du texte. Sur telephone il
     couvre tout l'ecran : il attend qu'on le demande. */
  var aCote = !window.matchMedia || window.matchMedia("(min-width:640px)").matches;
  var dernier = lire(cle);
  if (aCote && dernier && DISPO[dernier]) ouvrir(dernier, false);
})();
