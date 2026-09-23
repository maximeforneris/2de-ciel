/* LA COQUILLE DE DOCUMENTATION — option « nav: documentation ».
   Elle se monte au chargement, autour de `.page`, à partir de deux sources
   déjà écrites par la chaîne : PLAN (l'arborescence du site) et les titres
   de sections de la page. Rien n'est envoyé : les coches viennent du même
   stockage local que la frise. Voir doc.css pour la mise en page. */
(function () {
  "use strict";
  var page = document.querySelector(".page[data-site]");
  if (!page || !window.PLAN) return;

  var cle = "fed." + page.getAttribute("data-site") + ".lu";
  var ici = page.getAttribute("data-page") || "";          /* "prof/COURS1" */
  /* La profondeur se lit sur le chemin de la feuille, pas sur data-page :
     les pages d'outils sont dans un sous-dossier SANS porter de data-page,
     et le plan y pointait alors un cran trop haut. */
  var f = document.querySelector('link[href*="assets/doc.css"]');
  var racine = f ? f.getAttribute("href").replace(/assets\/doc\.css.*$/, "") : "";
  var lues = {};
  try { lues = JSON.parse(localStorage.getItem(cle) || "{}") || {}; } catch (e) {}

  /* ─── 1. la coquille ─────────────────────────────────────────────── */
  var doc = document.createElement("div");
  doc.className = "doc";
  var barre = document.createElement("header");
  barre.className = "doc-barre";
  var corps = document.createElement("div");
  corps.className = "doc-corps";
  var plan = document.createElement("nav");
  plan.className = "doc-plan";
  plan.setAttribute("aria-label", "Plan du site");
  var zone = document.createElement("div");
  zone.className = "doc-page";
  var som = document.createElement("nav");
  som.className = "doc-som";
  som.setAttribute("aria-label", "Sommaire de la page");
  var voile = document.createElement("div");
  voile.className = "doc-voile";

  page.parentNode.insertBefore(doc, page);
  corps.appendChild(plan);
  corps.appendChild(zone);
  corps.appendChild(som);
  zone.appendChild(page);
  doc.appendChild(barre);
  doc.appendChild(corps);
  doc.appendChild(voile);
  document.documentElement.classList.add("doc-shell");

  /* ─── 2. la barre : ce que portait la barre de page ──────────────── */
  var vieille = page.querySelector(".barre-site");
  var accueil = vieille && vieille.querySelector(".accueil");
  var bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "doc-plier";
  bouton.innerHTML = "<span aria-hidden=\"true\">☰</span><span class=\"mot\">Plan</span>";
  bouton.title = "Afficher ou replier le plan du site";
  barre.appendChild(bouton);

  var titre = document.createElement("a");
  titre.className = "titre";
  titre.href = accueil ? accueil.getAttribute("href") : (racine + "index.html");
  titre.textContent = (window.PLAN.site || (accueil ? accueil.textContent : "Accueil"));
  barre.appendChild(titre);

  var droite = document.createElement("div");
  droite.className = "droite";
  barre.appendChild(droite);

  /* Le sommaire de droite se commande comme le plan. Le bouton ne sert que
     la ou cette colonne existe — sous 1 000 px, c'est le sommaire de section
     de la page qui joue ce role, et il est deja sous la barre. */
  var boutonSom = document.createElement("button");
  boutonSom.type = "button";
  boutonSom.className = "doc-som-plier";
  boutonSom.textContent = "Sommaire";
  boutonSom.title = "Afficher ou replier le sommaire de la page";
  droite.appendChild(boutonSom);

  var lu = vieille && vieille.querySelector(".lu");
  if (lu) droite.appendChild(lu);                 /* le bouton garde son script */

  /* précédent / suivant descendent en pied de page */
  var fleches = vieille && vieille.querySelector(".fleches");
  if (fleches) {
    var pied = document.createElement("nav");
    pied.className = "doc-fleches";
    var av = fleches.querySelector('[rel="prev"]'), ap = fleches.querySelector('[rel="next"]');
    if (av) { av.textContent = "‹ " + (av.getAttribute("title") || "Précédent"); pied.appendChild(av); }
    if (ap) { ap.textContent = (ap.getAttribute("title") || "Suivant") + " ›"; pied.appendChild(ap); }
    if (pied.children.length) zone.appendChild(pied);
  }

  /* ─── 3. l'arborescence ──────────────────────────────────────────── */
  var fermer = document.createElement("button");
  fermer.type = "button";
  fermer.className = "fermer";
  fermer.textContent = "✕  Fermer le plan";
  plan.appendChild(fermer);

  var t = document.createElement("h2");
  t.textContent = "Le plan du site";
  plan.appendChild(t);

  /* L'accueil en tete du plan : sur un petit ecran, le titre de la barre
     s'efface, et c'est par ici qu'on y revient. */
  var vers = document.createElement("a");
  vers.className = "vers-accueil";
  vers.href = titre.href;
  vers.textContent = "Accueil du site";
  plan.appendChild(vers);

  (window.PLAN.espaces || []).forEach(function (esp) {
    var pages = [];
    (esp.groupes || []).forEach(function (g) { pages = pages.concat(g.pages || []); });
    var ouvertes = pages.filter(function (p) { return !p.tenue; });
    var faites = ouvertes.filter(function (p) { return lues[p.id]; }).length;
    var dedans = pages.some(function (p) { return p.id === ici; });

    var d = document.createElement("details");
    if (dedans || (!ici && esp === window.PLAN.espaces[0])) d.open = true;
    var s = document.createElement("summary");
    s.innerHTML = "<span>" + esp.nom + "</span>";
    var c = document.createElement("span");
    c.className = "compte";
    c.textContent = faites + " / " + ouvertes.length;
    s.appendChild(c);
    d.appendChild(s);

    (esp.groupes || []).forEach(function (g) {
      if (g.titre) {
        var h = document.createElement("p");
        h.className = "groupe";
        h.textContent = g.titre;
        d.appendChild(h);
      }
      var ul = document.createElement("ul");
      (g.pages || []).forEach(function (p) {
        var li = document.createElement("li");
        if (p.tenue) {
          var sp = document.createElement("span");
          sp.className = "tenue";
          sp.textContent = p.t;
          li.appendChild(sp);
        } else {
          var a = document.createElement("a");
          a.href = racine + p.url;
          a.textContent = p.t;
          if (p.k) a.title = p.k + " · " + p.t;
          if (p.id === ici) a.setAttribute("aria-current", "page");
          if (lues[p.id]) a.className = "lu";
          li.appendChild(a);
        }
        ul.appendChild(li);
      });
      d.appendChild(ul);
    });
    plan.appendChild(d);
  });

  /* ─── 4. le sommaire de la page, avec suivi de la lecture ────────── */
  var titres = [].slice.call(page.querySelectorAll("h2[id]"));
  if (titres.length > 1) {
    var p = document.createElement("p");
    p.textContent = "Sur cette page";
    som.appendChild(p);
    var liens = titres.map(function (h) {
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent;
      som.appendChild(a);
      return a;
    });
    if ("IntersectionObserver" in window) {
      var vus = {};
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { vus[e.target.id] = e.isIntersecting; });
        var courant = -1;
        titres.forEach(function (h, i) { if (vus[h.id] && courant < 0) courant = i; });
        if (courant < 0) {                       /* aucun titre visible : le dernier passé */
          titres.forEach(function (h, i) {
            if (h.getBoundingClientRect().top < 120) courant = i;
          });
        }
        liens.forEach(function (a, i) { a.className = i === courant ? "on" : ""; });
      }, { rootMargin: "-15% 0px -70% 0px" });
      titres.forEach(function (h) { io.observe(h); });
    }
  } else {
    som.style.display = "none";
    boutonSom.style.display = "none";
    som.dataset.vide = "1";
  }

  /* le bouton de fermeture du sommaire, quand il est en tiroir */
  var fermerSom = document.createElement("button");
  fermerSom.type = "button";
  fermerSom.className = "fermer";
  fermerSom.textContent = "✕  Fermer le sommaire";
  som.insertBefore(fermerSom, som.firstChild);

  /* ─── 5. replier, a toute largeur ────────────────────────────────
     Les deux colonnes se replient TOUJOURS, et la facon de le faire suit la
     place disponible : au-dela, la colonne se retire et le texte s'elargit ;
     en deca, elle devient un tiroir par-dessus la page. Le choix de grand
     ecran est retenu par l'appareil — on ne redemande pas a chaque page.  */
  var LARGE = window.matchMedia("(min-width:1000px)");   /* le plan est une colonne */
  var LARGE_SOM = window.matchMedia("(min-width:1280px)"); /* le sommaire aussi */
  var html = document.documentElement;
  var vueCle = "fed." + page.getAttribute("data-site") + ".vue";
  var vue = {};
  try { vue = JSON.parse(localStorage.getItem(vueCle) || "{}") || {}; } catch (e) {}

  var COLS = {
    plan: { media: LARGE, ferme: "doc-plan-ferme", tiroir: "doc-tiroir-plan",
            bouton: bouton, panneau: plan, cle: "plan" },
    som:  { media: LARGE_SOM, ferme: "doc-som-ferme", tiroir: "doc-tiroir-som",
            bouton: boutonSom, panneau: som, cle: "som" },
  };

  function colonne(c) { return c.media.matches; }
  function visible(c) {
    return colonne(c) ? !html.classList.contains(c.ferme)
                      : html.classList.contains(c.tiroir);
  }
  function dire(c) {
    c.bouton.setAttribute("aria-expanded", visible(c) ? "true" : "false");
    c.bouton.classList.toggle("replie", !visible(c));
  }
  function verrou() {
    /* la page ne defile pas derriere un tiroir ouvert */
    var un = html.classList.contains("doc-tiroir-plan")
          || html.classList.contains("doc-tiroir-som");
    html.style.overflow = un ? "hidden" : "";
  }

  function montrer(c, v, parHistorique) {
    if (colonne(c)) {
      html.classList.toggle(c.ferme, !v);
      vue[c.cle] = v;
      try { localStorage.setItem(vueCle, JSON.stringify(vue)); } catch (e) {}
    } else {
      if (v) {                                   /* un seul tiroir a la fois */
        html.classList.remove("doc-tiroir-plan", "doc-tiroir-som");
      }
      html.classList.toggle(c.tiroir, v);
      verrou();
      if (v && !parHistorique && window.history && history.pushState) {
        history.pushState({ doc: c.cle }, "");   /* le bouton retour referme */
      }
      if (v) {
        var a = c.panneau.querySelector('a[aria-current="page"]')
             || c.panneau.querySelector("button.fermer");
        if (a) a.focus();
      }
    }
    dire(c);
  }

  /* l'etat retenu, applique avant le premier affichage */
  if (vue.plan === false) html.classList.add("doc-plan-ferme");
  if (vue.som === false) html.classList.add("doc-som-ferme");
  dire(COLS.plan); dire(COLS.som);

  Object.keys(COLS).forEach(function (k) {
    var c = COLS[k];
    c.bouton.addEventListener("click", function () { montrer(c, !visible(c)); });
  });
  function refermer() {
    if (html.classList.contains("doc-tiroir-plan")) { montrer(COLS.plan, false, true); }
    if (html.classList.contains("doc-tiroir-som")) { montrer(COLS.som, false, true); }
  }
  function partir() {                             /* par le voile, Echap, un lien */
    if (html.classList.contains("doc-tiroir-plan")
     || html.classList.contains("doc-tiroir-som")) history.back();
  }
  fermer.addEventListener("click", partir);
  fermerSom.addEventListener("click", partir);
  voile.addEventListener("click", partir);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") partir();
  });
  window.addEventListener("popstate", refermer);
  [plan, som].forEach(function (p) {
    p.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a")) refermer();
    });
  });
  /* on tourne l'appareil, ou on elargit la fenetre : un tiroir reste ouvert
     par-dessus une colonne qui vient d'apparaitre. On le referme. */
  [LARGE, LARGE_SOM].forEach(function (m) {
    var maj = function () { refermer(); verrou(); dire(COLS.plan); dire(COLS.som); };
    if (m.addEventListener) m.addEventListener("change", maj);
    else if (m.addListener) m.addListener(maj);
  });
})();
