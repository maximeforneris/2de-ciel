/* Entrainement · les nombres a la francaise, dans les deux sens.
   Ecrire : virgule decimale, espace fine insecable entre les milliers, ecriture
   scientifique au-dela de dix millions ou en deca d'un millieme.
   Lire : ce qu'un eleve tape vraiment — virgule ou point, espaces, 2,5e3,
   2,5 x 10^3, 2,5×10³. */
"use strict";
var Nombres = (function () {
  var FINE = " ", MOINS = "−";
  var VERS_EXPOSANT = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³",
    "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  var DEPUIS_EXPOSANT = {};
  Object.keys(VERS_EXPOSANT).forEach(function (k) { DEPUIS_EXPOSANT[VERS_EXPOSANT[k]] = k; });

  function exposant(n) {
    return String(n).split("").map(function (c) { return VERS_EXPOSANT[c]; }).join("");
  }
  function grouper(entier) { return entier.replace(/\B(?=(\d{3})+(?!\d))/g, FINE); }

  /* x avec au plus `chiffres` chiffres significatifs, zeros de queue retires. */
  function ecrire(x, chiffres) {
    if (x === null || x === undefined || !isFinite(x)) return "—";
    if (chiffres === undefined) chiffres = 3;
    if (x === 0) return "0";
    var signe = x < 0 ? MOINS : "";
    var a = Number(Math.abs(x).toPrecision(chiffres));
    if (a >= 1e-3 && a < 1e7) {
      var dec = Math.max(0, chiffres - 1 - Math.floor(Math.log10(a)));
      var s = a.toFixed(dec);
      if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
      var p = s.split(".");
      return signe + grouper(p[0]) + (p[1] ? "," + p[1] : "");
    }
    var e = Math.floor(Math.log10(a));
    var m = Number((a / Math.pow(10, e)).toPrecision(chiffres));
    if (m >= 10) { m = Number((m / 10).toPrecision(chiffres)); e += 1; }
    return signe + String(m).replace(".", ",") + " × 10" + exposant(e);
  }

  /* Toujours en ecriture decimale, sans notation scientifique : 0,000 047 et non
     4,7 × 10⁻⁵. Pour le CAP et la seconde, ou la virgule est l'exercice. */
  function ecrireDecimal(x) {
    if (x === null || x === undefined || !isFinite(x)) return "\u2014";
    var s = Math.abs(Number(x.toPrecision(12))).toFixed(10).replace(/0+$/, "").replace(/\.$/, "");
    var p = s.split(".");
    return (x < 0 ? MOINS : "") + grouper(p[0]) + (p[1] ? "," + p[1] : "");
  }

  /* NaN si la saisie n'est pas un nombre. */
  function lire(texte) {
    if (texte === null || texte === undefined) return NaN;
    var t = String(texte)
      .replace(/[\s  ]/g, "")
      .replace(/,/g, ".")
      .replace(/[−–]/g, "-")
      .replace(/[⁻⁰¹²³⁴-⁹]+/g, function (s) {
        return "^" + s.split("").map(function (c) { return DEPUIS_EXPOSANT[c]; }).join("");
      })
      .replace(/[×xX*·]/g, "*");
    if (t === "") return NaN;
    if (/^[+-]?(\d+\.?\d*|\.\d+)e[+-]?\d+$/i.test(t)) return Number(t);
    var m = t.match(/^([+-]?(?:\d+\.?\d*|\.\d+))?(?:(?:\*10\^?|10\^)\(?([+-]?\d+)\)?)?$/);
    if (!m || (m[1] === undefined && m[2] === undefined)) return NaN;
    var mantisse = m[1] !== undefined ? Number(m[1]) : 1;
    return m[2] !== undefined ? Number(mantisse + "e" + m[2]) : mantisse;
  }

  /* a vaut b a `tolerance` pres, en relatif. */
  function proche(a, b, tolerance) {
    if (b === 0) return Math.abs(a) < 1e-12;
    return Math.abs(a - b) <= (tolerance || 1e-9) * Math.abs(b);
  }

  return { ecrire: ecrire, ecrireDecimal: ecrireDecimal, lire: lire, proche: proche };
})();
