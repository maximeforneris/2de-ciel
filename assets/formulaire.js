/* Entrainement · le formulaire.
   Les formules d'une classe, avec leurs unites, leurs reperes et leurs pieges. Une seule
   ecriture pour le jeu (sa page, son onglet pendant une partie) et pour les sites de classe
   (option « formulaire: » de SITE.md, qui le pose dans la barre de chaque page). Sorti de
   jeu.js le 6 octobre 2026.

   donnees = { themes: [...], chercher: "...", pages: { BATT: "S2", ... },
               groupes: [ { theme, titre, sections: [ { seance, titre, formules: [[f, unites]],
                                                       reperes: [...], piege } ] } ] }

   « Celui qui va bien » : sur une page du site, la section dont l'etiquette nomme la page
   est reperee — J4 pour la seance J4, AUTO 04 pour la fiche AUTO-04, Fiche 18 pour la
   fiche 18, Salve 2 pour CHRONO-2. `pages:` ajoute les familles qui ne portent pas le nom
   de leur sequence (en terminale, BATT est la sequence 2). */
"use strict";
var Formulaire = (function () {
  function sansAccent(t) { return String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[  ]/g, " "); }
  /* les insecables, poses au rendu : « 3 600 », « 20 K » et « : » ne se coupent pas en fin de ligne */
  function insecables(t) {
    return String(t || "").replace(/(\d) (?=\d{3}(?!\d))/g, "$1 ").replace(/(\d) (?=[A-Za-zµ°%€])/g, "$1 ")
      .replace(/ ([:;!?»])/g, " $1").replace(/« /g, "« ");
  }
  function el(tag, attrs, enfants) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === "classe") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k === "texte") n.textContent = v;
      else n.setAttribute(k, v === true ? "" : v);
    }
    (function ajouter(e) {
      if (e === null || e === undefined || e === false) return;
      if (Array.isArray(e)) { e.forEach(ajouter); return; }
      n.appendChild(typeof e === "string" ? document.createTextNode(e) : e);
    })(enfants);
    return n;
  }
  /* les groupes dans l'ordre des themes de la classe, puis les autres dans l'ordre d'ecriture */
  function ordonner(themes, groupes) {
    var ordre = (themes || []).slice();
    (groupes || []).forEach(function (g) { if (ordre.indexOf(g.theme || "") < 0) ordre.push(g.theme || ""); });
    var sortie = [];
    ordre.forEach(function (t) { (groupes || []).forEach(function (g) { if ((g.theme || "") === t) sortie.push(g); }); });
    return sortie;
  }
  function compter(groupes) {
    return (groupes || []).reduce(function (n, g) { return n + g.sections.reduce(function (m, s) { return m + s.formules.length; }, 0); }, 0);
  }

  function dom(donnees, compact) {
    return ordonner(donnees.themes, donnees.groupes).map(function (grp) {
      return el("section", { classe: "form-groupe" }, [
        el(compact ? "h3" : "h2", { classe: "form-titre", texte: grp.titre }),
        grp.sections.map(function (sec) {
          return el("div", { classe: "form-section", "data-seance": sec.seance || null }, [
            el("p", { classe: "form-entete" }, [sec.seance ? el("span", { classe: "pastille", texte: sec.seance }) : null, el("span", { html: insecables(sec.titre) })]),
            el("dl", { classe: "form-liste" }, sec.formules.map(function (f) {
              /* la police du texte, pas la mono : son zero barre se lit comme un diametre, et Φ comme un zero */
              return [el("dt", { html: insecables(f[0]) }), el("dd", { html: insecables(f[1]) })];
            })),
            sec.reperes && sec.reperes.length ? el("ul", { classe: "form-reperes" }, sec.reperes.map(function (r) { return el("li", { html: insecables(r) }); })) : null,
            sec.piege ? el("p", { classe: "form-piege" }, [el("span", { classe: "etiquette", texte: "Piège" }), el("span", { html: insecables(sec.piege) })]) : null
          ]);
        })
      ]);
    });
  }

  /* un champ qui ne garde que les sections ou le mot apparait, accents ignores ; rend [champ, contenu] */
  function filtre(donnees, compact) {
    var contenu = el("div", { classe: "form-contenu" }, dom(donnees, compact));
    var champ = el("input", { type: "search", classe: "form-filtre",
      placeholder: "Chercher : " + (donnees.chercher || "un mot, une unité") + "…", "aria-label": "Chercher une formule" });
    champ.addEventListener("input", function () {
      var q = sansAccent(champ.value.trim());
      [].forEach.call(contenu.querySelectorAll(".form-section"), function (x) { x.hidden = !!q && sansAccent(x.textContent).indexOf(q) < 0; });
      [].forEach.call(contenu.querySelectorAll(".form-groupe"), function (x) { x.hidden = !x.querySelector(".form-section:not([hidden])"); });
    });
    return [champ, contenu];
  }

  /* ─── la section qui va bien ─── */
  var FAMILLES = { CHRONO: "SALVE", SALVES: "SALVE", FICHES: "FICHE" };
  function famille(mot) { mot = sansAccent(mot).toUpperCase(); return FAMILLES[mot] || mot; }
  /* « Fiches 06-07 », « AUTO 12-13 », « Salves 1 à 3 », « Salves 3 et 4 », « J4 » → { f, n: [...] } */
  function lireEtiquette(t) {
    var m = String(t || "").match(/^\s*([A-Za-zÀ-ÿ]+)\s*-?\s*(.*)$/);
    if (!m) return null;
    var n = [], reste = m[2], r;
    if ((r = reste.match(/^(\d+)\s*(?:-|à|a)\s*(\d+)/))) for (var i = +r[1]; i <= +r[2]; i++) n.push(i);
    else (reste.match(/\d+/g) || []).forEach(function (x) { n.push(+x); });
    return n.length ? { f: famille(m[1]), n: n } : null;
  }
  /* « cours/J4 », « aide/AUTO-04-pourcentages », « conso/FICHE-18-pourcentages » → { f, n } */
  function lirePage(id, pages) {
    var base = String(id || "").split("/").pop();
    var m = base.match(/^([A-Za-z]+)-?(\d+)/);
    if (!m) return null;
    var alias = pages && pages[m[1].toUpperCase()];
    if (alias) return lireEtiquette(alias);
    return { f: famille(m[1]), n: [+m[2]] };
  }
  /* toutes les sections de la page : une sequence peut en avoir deux (S2, l'oxydoreduction
     puis l'energie) ; rend un tableau, vide si la page n'a pas de section */
  function trouver(contenu, idPage, pages) {
    var p = lirePage(idPage, pages);
    if (!p) return [];
    return [].filter.call(contenu.querySelectorAll(".form-section[data-seance]"), function (s) {
      var e = lireEtiquette(s.getAttribute("data-seance"));
      return e && e.f === p.f && e.n.indexOf(p.n[0]) >= 0;
    });
  }

  return { dom: dom, filtre: filtre, ordonner: ordonner, compter: compter, trouver: trouver, insecables: insecables };
})();
