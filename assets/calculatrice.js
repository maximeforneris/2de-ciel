/* ═══════════════════════════════════════════════════════════════════════
   LA CALCULATRICE DU SITE — option « calculatrice: oui » de SITE.md, posée le
   6 octobre 2026 à la demande de l'utilisateur : que l'élève calcule sans
   quitter la page, et fasse tout par le site.

   La calculatrice elle-même n'est pas ici : c'est celle du jeu d'entraînement,
   _commun/entrainement/moteur/calculette.js, avec nombres.js et calculette.css,
   que site.py recopie dans assets/. Ce script ne fait que la poser : un bouton
   « Calculatrice » dans la barre haute (à côté de « Sommaire »), un panneau à
   droite, par-dessus sur téléphone.

   Le panneau suit l'élève d'une page à l'autre, le temps de l'onglet : ouvert
   ou fermé, l'historique, Ans et l'unité d'angle sont dans le sessionStorage,
   sous calculatrice.<clé du site>. Rien ne quitte l'appareil.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (!window.Calculette || document.querySelector(".calculatrice")) return;
  var page = document.querySelector(".page[data-site]");
  var cle = "calculatrice." + ((page && page.getAttribute("data-site")) || "site");
  var calc = null, bouton = null;

  function lire(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ecrire(k, v) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }

  /* le panneau, dans le markup et les classes de calculette.css */
  var panneau = document.createElement("aside");
  panneau.className = "calculatrice";
  panneau.setAttribute("aria-label", "Calculatrice");
  panneau.hidden = true;
  var tete = document.createElement("div");
  tete.className = "calc-tete";
  var titre = document.createElement("span");
  titre.className = "calc-titre";
  titre.textContent = "Calculatrice";
  var fermer = document.createElement("button");
  fermer.type = "button";
  fermer.className = "calc-fermer";
  fermer.textContent = "Fermer";
  tete.appendChild(titre);
  tete.appendChild(fermer);
  var corps = document.createElement("div");
  corps.className = "calc-corps";
  panneau.appendChild(tete);
  panneau.appendChild(corps);
  document.body.appendChild(panneau);

  /* la chasse fixe de la charte, que la feuille du kit ne nomme pas en variable */
  var sonde = document.createElement("span");
  sonde.className = "mono";
  sonde.style.display = "none";
  document.body.appendChild(sonde);
  var mono = getComputedStyle(sonde).fontFamily;
  sonde.parentNode.removeChild(sonde);
  if (mono) panneau.style.setProperty("--mono", mono);

  function montrer(oui, focus) {
    if (oui && !calc) calc = Calculette.monter(corps, { memoire: cle });
    panneau.hidden = !oui;
    document.body.classList.toggle("calc-ouverte", oui);
    if (bouton) bouton.setAttribute("aria-pressed", oui ? "true" : "false");
    ecrire(cle + ".ouverte", oui ? "1" : null);
    if (oui && focus) calc.focus();
  }
  fermer.addEventListener("click", function () { montrer(false); if (bouton) bouton.focus(); });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && !panneau.hidden && panneau.contains(document.activeElement)) { montrer(false); if (bouton) bouton.focus(); }
  });

  /* le bouton : dans la barre de la coquille, sinon dans la barre de page, sinon flottant */
  bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "bouton-calculatrice";
  bouton.textContent = "Calculatrice";
  bouton.title = "Ouvrir la calculatrice à côté de la page";
  bouton.setAttribute("aria-pressed", "false");
  bouton.addEventListener("click", function () { montrer(panneau.hidden, true); });
  var droite = document.querySelector(".doc-barre .droite");
  var barre = document.querySelector(".barre-site");
  if (droite) droite.insertBefore(bouton, droite.querySelector(".doc-som-plier") || droite.firstChild);   /* juste avant « Sommaire » */
  else if (barre) barre.appendChild(bouton);
  else { bouton.classList.add("flottant"); document.body.appendChild(bouton); }

  /* Rouverte a l'arrivee sur une page, la ou elle se tient a cote du texte. Sur telephone
     elle couvre tout l'ecran : elle garde sa memoire, mais attend qu'on la demande. */
  var aCote = !window.matchMedia || window.matchMedia("(min-width:640px)").matches;
  if (aCote && lire(cle + ".ouverte") === "1") montrer(true, false);
})();
