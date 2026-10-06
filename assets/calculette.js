/* Entrainement · la calculatrice.
   Ecrite pour le depot : aucun droit a demander, aucune requete, rien d'enregistre.
   Elle reprend l'application Calculs d'une calculatrice de lycee : une ligne de
   saisie, l'historique au-dessus, Ans, les degres ou les radians, la virgule.

   On tape au clavier ou sur le pave. Priorites usuelles ; ^ associe a droite ;
   -2^2 vaut -4 ; 2π et 3(4+5) sont des produits ; sin(30)² vaut (sin 30)².
   Les parentheses oubliees en fin de ligne sont fermees.
   Apres un resultat, une ligne qui commence par un operateur part de Ans, au clavier
   comme au pave ; Entree sur une ligne vide refait le dernier calcul (Ans×1,05, puis
   Entree, Entree… pour iterer). Demande le 6 octobre 2026.
   Aucun eval : l'expression est lue par un petit analyseur recursif.

   monter(conteneur, { memoire: "cle" }) garde l'historique, Ans et l'unite d'angle dans le
   sessionStorage, le temps de l'onglet : c'est ce qui suit l'eleve d'une page du site a
   l'autre. Sans l'option, rien n'est garde. */
"use strict";
var Calculette = (function () {
  var N = Nombres;
  var RAD = Math.PI / 180;
  var FONCTIONS = {
    sin: function (x, deg) { return Math.sin(deg ? x * RAD : x); },
    cos: function (x, deg) { return Math.cos(deg ? x * RAD : x); },
    tan: function (x, deg) { return Math.tan(deg ? x * RAD : x); },
    asin: function (x, deg) { var r = Math.asin(x); return deg ? r / RAD : r; },
    acos: function (x, deg) { var r = Math.acos(x); return deg ? r / RAD : r; },
    atan: function (x, deg) { var r = Math.atan(x); return deg ? r / RAD : r; },
    ln: Math.log, log: Math.log10, exp: Math.exp, abs: Math.abs, sqrt: Math.sqrt
  };
  var ALIAS = { "sin⁻¹": "asin", "cos⁻¹": "acos", "tan⁻¹": "atan", arcsin: "asin", arccos: "acos", arctan: "atan" };
  var OPERATEURS = { "+": "+", "-": "-", "−": "-", "–": "-", "×": "*", "*": "*", "·": "*", "÷": "/", "/": "/",
                     "^": "^", "²": "²", "³": "³", "(": "(", ")": ")", "√": "√" };

  /* ─────────── lire une expression ─────────── */
  function jetons(texte) {
    var t = String(texte).replace(/[\s  ]/g, ""), sortie = [], i = 0, m;
    while (i < t.length) {
      var reste = t.slice(i);
      /* 2,5E3 ou 2,5e3 : l'exposant colle au nombre ; un e seul est la constante */
      if ((m = reste.match(/^(\d+(?:[.,]\d*)?|[.,]\d+)([Ee][+\-−]?\d+)?/))) {
        var e = m[2] ? "e" + m[2].slice(1).replace("−", "-") : "";
        sortie.push({ type: "nombre", valeur: Number(m[1].replace(",", ".") + e) });
      } else if ((m = reste.match(/^(sin⁻¹|cos⁻¹|tan⁻¹|arcsin|arccos|arctan|asin|acos|atan|sin|cos|tan|ln|log|exp|abs|sqrt)/i))) {
        var nom = m[1].toLowerCase();
        sortie.push({ type: "fonction", nom: ALIAS[nom] || nom });
      } else if ((m = reste.match(/^(ans|pi|π|e)/i))) {
        var c = m[1].toLowerCase();
        sortie.push({ type: "constante", nom: c === "π" ? "pi" : c });
      } else if (OPERATEURS[reste[0]]) {
        m = [reste[0]];
        sortie.push({ type: "op", op: OPERATEURS[reste[0]] });
      } else throw new Error("syntaxe");
      i += m[0].length;
    }
    return sortie;
  }

  function evaluer(texte, degres, ans) {
    var j = jetons(texte), k = 0;
    if (!j.length) throw new Error("vide");
    var ouvertes = 0;
    j.forEach(function (t) { if (t.op === "(") ouvertes++; else if (t.op === ")") ouvertes--; });
    for (; ouvertes > 0; ouvertes--) j.push({ type: "op", op: ")" });

    function prendre(op) { var t = j[k]; if (t && t.type === "op" && t.op === op) { k++; return true; } return false; }
    function debutFacteur(t) {
      return t && (t.type !== "op" || t.op === "(" || t.op === "√");
    }
    function expression() {
      var v = terme();
      for (;;) {
        if (prendre("+")) v += terme();
        else if (prendre("-")) v -= terme();
        else return v;
      }
    }
    function terme() {
      var v = unaire();
      for (;;) {
        if (prendre("*")) v *= unaire();
        else if (prendre("/")) { var d = unaire(); if (d === 0) throw new Error("division"); v /= d; }
        else if (debutFacteur(j[k])) v *= puissance();          /* 2π, 3(4+5) */
        else return v;
      }
    }
    function unaire() {
      if (prendre("-")) return -unaire();
      if (prendre("+")) return unaire();
      return puissance();
    }
    function puissance() {
      var b = postfixe();
      return prendre("^") ? Math.pow(b, unaire()) : b;
    }
    function postfixe() {
      var v = primaire();
      for (;;) {
        if (prendre("²")) v = v * v;
        else if (prendre("³")) v = v * v * v;
        else return v;
      }
    }
    function primaire() {
      var t = j[k];
      if (!t) throw new Error("syntaxe");
      if (t.type === "nombre") { k++; return t.valeur; }
      if (t.type === "constante") { k++; return t.nom === "pi" ? Math.PI : t.nom === "e" ? Math.E : ans; }
      if (t.type === "fonction") { k++; return FONCTIONS[t.nom](primaire(), degres); }
      if (prendre("√")) return Math.sqrt(postfixe());
      if (prendre("(")) {
        var v = expression();
        if (!prendre(")")) throw new Error("syntaxe");
        return v;
      }
      throw new Error("syntaxe");
    }

    var v = expression();
    if (k < j.length) throw new Error("syntaxe");
    if (isNaN(v)) throw new Error("domaine");
    if (!isFinite(v)) throw new Error("infini");
    return Number(v.toPrecision(12));
  }
  var MESSAGES = {
    syntaxe: "Erreur de syntaxe", vide: "Rien à calculer", division: "Division par zéro",
    domaine: "Hors du domaine de définition", infini: "Résultat trop grand"
  };

  /* ─────────── le pave ─────────── */
  var EFFACER = "⌫", TOUT = "AC", EGAL = "=";
  var TOUCHES = [
    ["sin⁻¹", "sin⁻¹(", "fonction"], ["cos⁻¹", "cos⁻¹(", "fonction"], ["tan⁻¹", "tan⁻¹(", "fonction"], ["π", "π", "fonction"], ["e", "e", "fonction"],
    ["sin", "sin(", "fonction"], ["cos", "cos(", "fonction"], ["tan", "tan(", "fonction"], ["ln", "ln(", "fonction"], ["log", "log(", "fonction"],
    ["√", "√(", "op"], ["x²", "²", "op"], ["xʸ", "^", "op"], ["(", "(", "op"], [")", ")", "op"],
    ["7", "7", "chiffre"], ["8", "8", "chiffre"], ["9", "9", "chiffre"], [EFFACER, EFFACER, "efface"], [TOUT, TOUT, "efface"],
    ["4", "4", "chiffre"], ["5", "5", "chiffre"], ["6", "6", "chiffre"], ["×", "×", "op"], ["÷", "÷", "op"],
    ["1", "1", "chiffre"], ["2", "2", "chiffre"], ["3", "3", "chiffre"], ["+", "+", "op"], ["−", "−", "op"],
    ["0", "0", "chiffre"], [",", ",", "chiffre"], ["×10ⁿ", "×10^", "op"], ["Ans", "Ans", "fonction"], [EGAL, EGAL, "egal"]
  ];
  /* Ce que ⌫ efface d'un coup, plutot que lettre par lettre */
  var BLOCS = ["sin⁻¹(", "cos⁻¹(", "tan⁻¹(", "sin(", "cos(", "tan(", "ln(", "log(", "√(", "×10^", "Ans"];
  /* Apres un resultat, ces touches partent de Ans, comme sur une calculatrice */
  var APRES_ANS = ["+", "−", "×", "÷", "^", "²", "×10^"];
  /* ... et une ligne tapee au clavier qui commence par l'un de ces signes */
  var DEBUT_ANS = /^[+\-−–×*·÷\/^²³]/;

  function el(tag, attrs, enfants) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === "classe") n.className = attrs[k];
      else if (k === "texte") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (enfants || []).forEach(function (e) { if (e) n.appendChild(e); });
    return n;
  }
  function joli(texte) {
    return texte.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−").replace(/\./g, ",");
  }
  /* Ce qu'on recopie dans la saisie : la valeur, ecrite comme on la taperait */
  function brut(x) {
    return String(Number(x.toPrecision(10))).replace("e+", "E").replace("e-", "E−").replace(".", ",");
  }

  function monter(conteneur, options) {
    options = options || {};
    var degres = true, ans = 0, aUnResultat = false, derniere = "", lignes = [];
    var tactile = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    var bDeg = el("button", { type: "button", "aria-pressed": "true", texte: "Degrés" });
    var bRad = el("button", { type: "button", "aria-pressed": "false", texte: "Radians" });
    var historique = el("ol", { classe: "calc-historique" });
    var ecran = el("div", { classe: "calc-ecran", "aria-live": "polite" }, [historique]);
    var saisie = el("input", { type: "text", classe: "calc-saisie", autocomplete: "off", spellcheck: "false",
      "aria-label": "Calcul à effectuer", placeholder: "2,5×10^3 ÷ (1163×20)" });
    if (tactile) saisie.setAttribute("inputmode", "none");   /* le pave suffit, pas de clavier par-dessus */
    var pave = el("div", { classe: "calc-touches" });

    function angle(deg) {
      degres = deg;
      bDeg.setAttribute("aria-pressed", deg ? "true" : "false");
      bRad.setAttribute("aria-pressed", deg ? "false" : "true");
    }
    bDeg.addEventListener("click", function () { angle(true); });
    bRad.addEventListener("click", function () { angle(false); });

    function inserer(txt) {
      var a = saisie.selectionStart === null ? saisie.value.length : saisie.selectionStart;
      var b = saisie.selectionEnd === null ? a : saisie.selectionEnd;
      if (saisie.value === "" && aUnResultat && APRES_ANS.indexOf(txt) >= 0) { txt = "Ans" + txt; }
      saisie.value = saisie.value.slice(0, a) + txt + saisie.value.slice(b);
      var p = a + txt.length;
      saisie.setSelectionRange(p, p);
    }
    function effacer() {
      var a = saisie.selectionStart, b = saisie.selectionEnd, v = saisie.value;
      if (a !== b) { saisie.value = v.slice(0, a) + v.slice(b); saisie.setSelectionRange(a, a); return; }
      if (a === 0) return;
      var avant = v.slice(0, a), n = 1;
      for (var i = 0; i < BLOCS.length; i++) if (avant.slice(-BLOCS[i].length) === BLOCS[i]) { n = BLOCS[i].length; break; }
      saisie.value = v.slice(0, a - n) + v.slice(a);
      saisie.setSelectionRange(a - n, a - n);
    }
    function garder() {
      if (!options.memoire) return;
      try { sessionStorage.setItem(options.memoire, JSON.stringify({ ans: ans, a: aUnResultat, deg: degres, der: derniere, l: lignes.slice(-40) })); } catch (e) {}
    }
    /* rejoue : une ligne relue dans la memoire de l'onglet, avec la valeur qu'elle avait */
    function ligne(expr, contenu, erreur, rejoue) {
      if (!rejoue) { lignes.push([expr, contenu, erreur ? 1 : 0, ans]); garder(); }
      var bExpr = el("button", { type: "button", classe: "calc-expr", title: "Reprendre ce calcul", texte: joli(expr) });
      bExpr.addEventListener("click", function () { saisie.value = expr; saisie.focus(); });
      var bRes = el("button", { type: "button", classe: "calc-res" + (erreur ? " erreur" : ""), texte: contenu });
      if (!erreur) {
        var valeur = rejoue ? rejoue[3] : ans;
        bRes.title = "Insérer cette valeur";
        bRes.addEventListener("click", function () { inserer(brut(valeur)); saisie.focus(); });
      }
      historique.appendChild(el("li", {}, [bExpr, bRes]));
      while (historique.children.length > 40) historique.removeChild(historique.firstChild);
      ecran.scrollTop = ecran.scrollHeight;
    }
    function calculer() {
      var expr = saisie.value.trim();
      if (!expr) { if (!derniere) return; expr = derniere; }   /* Entree a vide : le dernier calcul, encore */
      if (aUnResultat && DEBUT_ANS.test(expr)) expr = "Ans" + expr;
      derniere = expr;
      var ouvertes = (expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length;
      for (; ouvertes > 0; ouvertes--) expr += ")";   /* l'historique montre ce qui a ete calcule */
      try {
        ans = evaluer(expr, degres, ans);
        aUnResultat = true;
        ligne(expr, N.ecrire(ans, 10), false);
        saisie.value = "";
      } catch (err) {
        ligne(expr, MESSAGES[err.message] || MESSAGES.syntaxe, true);
      }
    }

    TOUCHES.forEach(function (t) {
      var b = el("button", { type: "button", classe: t[2], tabindex: "-1", texte: t[0] });
      if (t[0] === EFFACER) b.setAttribute("aria-label", "Effacer");
      if (t[0] === TOUT) b.setAttribute("aria-label", "Tout effacer");
      /* garder le curseur dans la saisie : la touche ne prend pas le focus */
      b.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
      b.addEventListener("click", function () {
        if (t[1] === EGAL) calculer();
        else if (t[1] === EFFACER) effacer();
        else if (t[1] === TOUT) saisie.value = "";
        else inserer(t[1]);
        if (!tactile) saisie.focus();
      });
      pave.appendChild(b);
    });
    /* au clavier, un operateur tape sur une ligne vide apres un resultat devient Ans + operateur */
    saisie.addEventListener("input", function () {
      if (aUnResultat && saisie.value.length === 1 && DEBUT_ANS.test(saisie.value)) {
        saisie.value = "Ans" + saisie.value;
        saisie.setSelectionRange(saisie.value.length, saisie.value.length);
      }
    });
    saisie.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); calculer(); }
      else if (ev.key === "Escape") { saisie.value = ""; }
    });

    /* la memoire de l'onglet, relue a l'ouverture */
    if (options.memoire) {
      try {
        var m = JSON.parse(sessionStorage.getItem(options.memoire) || "null");
        if (m) {
          ans = m.ans || 0; aUnResultat = !!m.a; derniere = m.der || ""; angle(m.deg !== false); lignes = m.l || [];
          lignes.forEach(function (x) { ligne(x[0], x[1], x[2], x); });
        }
      } catch (e) {}
      bDeg.addEventListener("click", garder); bRad.addEventListener("click", garder);
    }
    conteneur.appendChild(el("div", { classe: "calc-angle", role: "group", "aria-label": "Unité d'angle" }, [bDeg, bRad]));
    conteneur.appendChild(ecran);
    conteneur.appendChild(saisie);
    conteneur.appendChild(pave);
    return { focus: function () { if (!tactile) saisie.focus(); } };
  }

  return { monter: monter, evaluer: evaluer };
})();
