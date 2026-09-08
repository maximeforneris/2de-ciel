/* ═══════════════════════════════════════════════════════════════════════
   KIT WEB — sommaire actif, replis, quiz et outils de calcul.
   Inline dans chaque page par webseance.py. Un outil s'appelle depuis le
   markdown par   ::: {.outil data-outil="paroi"}   :::
   Ajouter un outil = ajouter une entree dans OUTILS, rien d'autre.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";

/* ───────────────────────────────── formatage francais */
function fr(x,n){
  if(!isFinite(x))return "—";
  var s=Math.abs(x)<Math.pow(10,-n)/2?0:x;
  return s.toFixed(n).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g," ");
}
function frs(x,n){
  if(!isFinite(x))return "—";
  return (Math.abs(x)<Math.pow(10,-n)/2?0:x).toFixed(n).replace(".",",");
}
function E(t,a,h){var e=document.createElement(t);
  for(var k in a)e.setAttribute(k,a[k]);
  if(h!==undefined)e.innerHTML=h;return e;}

/* État partagé : les outils se chaînent comme les séances.
   L'enchaînement est EXPLICITE et ordonné — paroi donne U, bilan donne GV,
   energie consomme GV. Un mécanisme d'abonnement se rappellerait lui-même. */
var ETAT={u_mur:0.30, gv:0, surface:0, phi:0};
function suivant(nom){var o=OUTILS[nom];if(o&&o._recalc)o._recalc();}

/* ───────────────────────────────── sommaire actif */
var liens=[].slice.call(document.querySelectorAll("nav.somm a"));
if(liens.length&&"IntersectionObserver" in window){
  var cibles=liens.map(function(a){return document.getElementById(a.getAttribute("href").slice(1));})
                  .filter(Boolean);
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      liens.forEach(function(a){
        a.classList.toggle("on",a.getAttribute("href")==="#"+e.target.id);});
    });
  },{rootMargin:"-45% 0px -50% 0px"});
  cibles.forEach(function(c){io.observe(c);});
}

/* ───────────────────────────────── quiz */
[].forEach.call(document.querySelectorAll(".quiz"),function(q){
  var items=[].slice.call(q.querySelectorAll("li"));
  var total=items.length, faits=0, justes=0;
  var chap=E("p",{"class":"chapeau"},"Vérifiez-vous — "+total+" questions");
  q.insertBefore(chap,q.firstChild);
  var score=E("p",{"class":"score"},"");
  items.forEach(function(li){
    /* « énoncé : bonne / mauvaise / mauvaise »  — le gras marque la bonne */
    var html=li.innerHTML;
    /* separateurs : " : " avant les reponses, " | " entre elles.
       Ni l'un ni l'autre n'apparait dans un enonce ou une reponse — ce que
       « / » ne garantissait pas : il coupait dans </strong> et dans R = 1 / U. */
    var coupe=html.lastIndexOf(" : ");
    var enonce=coupe>0?html.slice(0,coupe):html;
    var reps=(coupe>0?html.slice(coupe+3):"").split(/\s*\|\s*/);
    var bloc=E("div",{"class":"qq"});
    bloc.appendChild(E("p",{},enonce.trim()));
    var ch=E("div",{"class":"choix"});
    var repondu=false;
    reps.forEach(function(r){
      var juste=/<strong>/.test(r);
      var txt=r.replace(/<\/?strong>/g,"").trim();
      if(!txt)return;
      var b=E("button",{type:"button"},txt);
      b.addEventListener("click",function(){
        if(repondu)return;
        repondu=true;faits++;if(juste)justes++;
        [].forEach.call(ch.children,function(o){o.disabled=true;});
        b.classList.add(juste?"juste":"faux");
        if(!juste)[].forEach.call(ch.children,function(o,i){
          if(/<strong>/.test(reps[i]))o.classList.add("juste");});
        score.textContent=justes+" / "+faits+" — "+
          (faits<total?(total-faits)+" restantes":"terminé");
      });
      ch.appendChild(b);
    });
    bloc.appendChild(ch);
    q.appendChild(bloc);
  });
  var ul=q.querySelector("ul");if(ul)ul.remove();
  q.appendChild(score);
});

/* ───────────────────────────────── exercices
   L'exercice DIT SI C'EST JUSTE et rappelle la methode. Il ne donne jamais la
   valeur attendue ni la redaction : le corrige reste au polycopie. Voir
   GUIDE-WEB.md. La reponse voyage obscurcie dans data-a — de quoi ne pas
   tomber dessus en survolant la page, rien de plus. */
var socleExo=document.querySelector("[data-site]");
var CLE_EXO="fed."+(socleExo?socleExo.getAttribute("data-site"):"autonome")+".exo";
function exoLu(){try{return JSON.parse(localStorage.getItem(CLE_EXO)||"{}")||{};}
                 catch(e){return {};}}
function exoNote(id,etat){var t=exoLu();t[id]=etat;
  try{localStorage.setItem(CLE_EXO,JSON.stringify(t));}catch(e){}
  document.dispatchEvent(new CustomEvent("exo",{detail:{id:id,etat:etat}}));}
function aplat(s){
  return (s.normalize?s.normalize("NFD").replace(/[\u0300-\u036f]/g,""):s)
         .toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
function memeTexte(a,b){
  /* « 1,5 m », « 1,5m » et « 1.5 m » sont la meme reponse : l'eleve tape vite,
     et l'espace avant l'unite n'est pas ce qu'on evalue. */
  var x=aplat(a),y=aplat(b);
  return x===y||x.replace(/ /g,"")===y.replace(/ /g,"");
}
function nombre(s){
  /* « 1 376 » et « 1,38 » et « 1.38e3 » : l'eleve tape comme il veut */
  var t=s.replace(/\s/g,"").replace(",",".");   /* \s couvre U+00A0 et U+202F */
  return t===""?NaN:parseFloat(t);
}
[].forEach.call(document.querySelectorAll(".exo"),function(ex){
  var sec;try{sec=JSON.parse(atob(ex.getAttribute("data-a")).split("").map(
    function(c){return String.fromCharCode(c.charCodeAt(0)^0x5A);}).join(""));}
  catch(e){return;}
  var id=ex.getAttribute("data-exo"), typ=sec.t;
  var indice=ex.querySelector(".indice"), liste=ex.querySelector(".verifier");
  var zone=E("div",{"class":"reponse"}), verdict=E("p",{"class":"verdict"},"");
  var champ, valider;

  if(typ==="justification"){
    champ=E("textarea",{rows:"4","aria-label":"Votre justification",
      placeholder:"Rédigez votre réponse, puis comparez-la aux points à vérifier."});
    valider=E("button",{type:"button","class":"btn"},"J’ai répondu");
  }else{
    champ=E("input",{type:"text",autocomplete:"off","aria-label":"Votre réponse",
      inputmode:typ==="calcul"?"decimal":"text",
      placeholder:typ==="calcul"?"Votre valeur":"Votre réponse"});
    valider=E("button",{type:"button","class":"btn"},"Vérifier");
  }
  var ligne=E("div",{"class":"saisie"});
  ligne.appendChild(champ);
  if(typ==="calcul"&&sec.u)ligne.appendChild(E("span",{"class":"unite"},sec.u));
  ligne.appendChild(valider);
  if(indice){
    var bi=E("button",{type:"button","class":"btn creux"},"Voir l’indice");
    bi.addEventListener("click",function(){
      indice.hidden=!indice.hidden;
      bi.textContent=indice.hidden?"Voir l’indice":"Masquer l’indice";
    });
    ligne.appendChild(bi);
  }
  zone.appendChild(ligne);zone.appendChild(verdict);
  ex.appendChild(zone);
  if(indice)ex.appendChild(indice);

  function juge(){
    if(typ==="justification"){
      /* rien a corriger automatiquement : on rend les points a verifier, et
         l'eleve se juge lui-meme. Les points disent QUOI verifier, pas la
         reponse. */
      if(!champ.value.trim()){verdict.className="verdict";
        verdict.textContent="Rédigez d’abord votre réponse.";return;}
      if(liste&&liste.hidden){
        liste.hidden=false;
        [].forEach.call(liste.children,function(li){
          var b=E("input",{type:"checkbox"});
          b.addEventListener("change",compte);
          li.insertBefore(b,li.firstChild);
        });
        ex.appendChild(liste);
        valider.textContent="Relire ma réponse";
      }
      compte();
      return;
    }
    var ok;
    if(typ==="calcul"){
      var v=nombre(champ.value);
      if(isNaN(v)){verdict.className="verdict";
        verdict.textContent="Entrez une valeur numérique.";return;}
      ok=sec.v!==null&&Math.abs(v-sec.v)<=Math.abs(sec.v)*(sec.tol/100);
    }else{
      var r=aplat(champ.value);
      ok=!!r&&(sec.a||[]).some(function(a){return aplat(a)===r;});
    }
    verdict.className="verdict "+(ok?"juste":"faux");
    verdict.textContent=ok?"C’est juste."
      :(typ==="calcul"?"Ce n’est pas la valeur attendue. Reprenez la méthode."
                      :"Ce n’est pas la réponse attendue.");
    exoNote(id,ok?"juste":"faux");
    if(!ok&&indice)indice.hidden=false;
  }
  function compte(){
    var b=liste?[].slice.call(liste.querySelectorAll("input")):[];
    var n=b.filter(function(x){return x.checked;}).length;
    verdict.className="verdict "+(n===b.length&&b.length?"juste":"");
    verdict.textContent=n+" point"+(n>1?"s":"")+" sur "+b.length+
      (n===b.length&&b.length?" — votre réponse est complète.":" à vérifier dans votre réponse.");
    exoNote(id,n===b.length&&b.length?"juste":"vu");
  }
  valider.addEventListener("click",juge);
  champ.addEventListener("keydown",function(e){
    if(e.key==="Enter"&&typ!=="justification"){e.preventDefault();juge();}
  });
  var fait=exoLu()[id];
  if(fait==="juste"){ex.classList.add("fait");
    verdict.className="verdict deja";verdict.textContent="Déjà réussi.";}
});



/* ───────────────────────────────── series d'entrainement
   Le pendant web du tableau a remplir du polycopie : une case par item, on
   remplit, on verifie tout d'un coup. Meme regle que l'exercice — la page dit
   juste ou faux et rappelle la methode, elle ne donne jamais la reponse.
   Une case fausse GARDE ce qui a ete tape : on corrige, on ne recommence pas. */
[].forEach.call(document.querySelectorAll(".serie"),function(se){
  var sec;try{sec=JSON.parse(atob(se.getAttribute("data-a")).split("").map(
    function(c){return String.fromCharCode(c.charCodeAt(0)^0x5A);}).join(""));}
  catch(e){return;}
  var id=se.getAttribute("data-serie");
  var items=[].slice.call(se.querySelectorAll("ol.items > li"));
  var indice=se.querySelector(".indice"), cases=[];

  items.forEach(function(li,i){
    var d=(sec.i||[])[i]||{};
    var rep=E("span",{"class":"rep"});
    var inp=E("input",{type:"text",autocomplete:"off",
      inputmode:d.v!==undefined?"decimal":"text",
      "class":d.v!==undefined?"":"texte",
      "aria-label":"Réponse"});
    rep.appendChild(inp);
    if(sec.u)rep.appendChild(E("span",{"class":"unite"},sec.u));
    var mq=E("span",{"class":"marque"},"");
    rep.appendChild(mq);
    li.appendChild(rep);
    cases.push({e:inp,m:mq,d:d,li:li});
    inp.addEventListener("input",function(){
      li.classList.remove("juste","faux");mq.textContent="";
    });
    inp.addEventListener("keydown",function(ev){
      if(ev.key!=="Enter")return;
      ev.preventDefault();
      if(i+1<cases.length)cases[i+1].e.focus();else juger();
    });
  });

  function juste(d,txt){
    if(!txt.trim())return null;                    /* non traite */
    if(d.v!==undefined){
      var v=nombre(txt);
      if(isNaN(v))return false;
      return Math.abs(v-d.v)<=Math.abs(d.v)*(sec.tol/100)+1e-9;
    }
    return !!txt.trim()&&(d.a||[]).some(function(a){return memeTexte(a,txt);});
  }

  var verdict=E("p",{"class":"verdict"},"");
  var valider=E("button",{type:"button","class":"btn"},"Vérifier la série");
  var barre=E("div",{"class":"barre"});
  barre.appendChild(valider);
  if(indice){
    var bi=E("button",{type:"button","class":"btn creux"},"Voir l’indice");
    bi.addEventListener("click",function(){
      indice.hidden=!indice.hidden;
      bi.textContent=indice.hidden?"Voir l’indice":"Masquer l’indice";
    });
    barre.appendChild(bi);
  }
  se.appendChild(barre);se.appendChild(verdict);
  if(indice)se.appendChild(indice);

  function juger(){
    var bons=0,faux=0,vides=0;
    cases.forEach(function(c){
      var r=juste(c.d,c.e.value);
      c.li.classList.remove("juste","faux");
      if(r===null){vides++;c.m.textContent="";return;}
      if(r){bons++;c.li.classList.add("juste");c.m.textContent="✓";}
      else {faux++;c.li.classList.add("faux");c.m.textContent="✗";}
    });
    var tout=bons===cases.length;
    verdict.className="verdict "+(tout?"juste":(faux?"faux":""));
    var reste=[];
    if(faux)reste.push(faux+" à reprendre");
    if(vides)reste.push(vides+(vides>1?" non traitées":" non traitée"));
    verdict.textContent=tout
      ?"La série entière est juste."
      :bons+" sur "+cases.length+(reste.length?" — "+reste.join(", "):"")+".";
    if(tout)se.classList.add("fait");else se.classList.remove("fait");
    exoNote(id,tout?"juste":"vu");
    if(faux&&indice)indice.hidden=false;
  }
  valider.addEventListener("click",juger);

  if(exoLu()[id]==="juste"){
    se.classList.add("fait");
    verdict.className="verdict deja";verdict.textContent="Déjà réussie.";
  }
});

/* ═══════════════════════════════════════════════════ PSYCHROMETRIE
   Une seule implementation pour tout le depot. Pression atmospherique
   normale ; au-dela de 100 degres l'air ne sature plus, d'ou le garde-fou
   de rDe qui renverrait sinon une humidite absolue negative. */
var PATM=101325;
function pvs(t){return 610.94*Math.exp(17.625*t/(t+243.04));}      /* Pa */
function rDe(t,hr){                                                /* g/kg as */
  var p=hr/100*pvs(t);
  if(p>=PATM*0.999)return 1e4;
  return 622*p/(PATM-p);
}
function hrDe(t,r){var p=PATM*r/(622+r);return Math.min(100,100*p/pvs(t));}
function enth(t,r){return 1.006*t+r/1000*(2501+1.83*t);}           /* kJ/kg as */
function rosee(t,hr){
  var a=17.625,b=243.04,g=Math.log(Math.max(hr,0.01)/100)+a*t/(b+t);
  return b*g/(a-g);
}
function volSpec(t,r){return 287.06*(t+273.15)*(1+1.6078*r/1000)/PATM;}
function bulbeH(t,r){                                              /* dichotomie */
  var lo=-30,hi=t,m,i;
  for(i=0;i<60;i++){
    m=(lo+hi)/2;
    var rs=rDe(m,100)/1000;                                        /* kg/kg */
    var rc=(rs*(2501-2.326*m)-1.006*(t-m))/(2501+1.86*t-4.186*m);
    if(rc*1000>r)hi=m;else lo=m;
  }
  return m;
}
function tDeH(h,r){return (h-2.501*r)/(1.006+0.00183*r);}          /* adiabatique */

/* ═══════════════════════════════════════════════════ SCHEMAS
   Dessines ici, pas repris du polycopie : vectoriels, ils suivent le theme
   sombre, et « paroi-coupe » se redessine avec le composeur de paroi. */
var SCHEMAS={}, SCHEMA_MAJ=[];
/* declare ici : le schema des degres-jours s'en sert autant que l'outil */
var VILLES=[["Nice",1100],["Marseille",1300],["Bordeaux",1700],["Lyon",2200],
            ["Paris",2300],["Rouen",2400],["Strasbourg",2700],["Briançon",3800]];
var NS="http://www.w3.org/2000/svg";
function S(t,a,txt){
  var e=document.createElementNS(NS,t);
  for(var k in a)e.setAttribute(k,a[k]);
  if(txt!==undefined)e.textContent=txt;
  return e;
}
function V(c){return "var(--"+c+")";}

/* ─────────── coupe de paroi, avec le profil de temperature ─────────── */
SCHEMAS["paroi-coupe"]=function(el){
  var W=724,H=318,X0=112,X1=606,Y0=52,Y1=206,FILM=24;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Coupe d'une paroi et profil de température"});
  el.appendChild(svg);
  var lg=E("p",{"class":"leg-schema"},"");
  (el.parentNode||el).appendChild(lg);   /* apres la legende de l'auteur */

  function dessine(){
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var C=(ETAT.couches&&ETAT.couches.length)?ETAT.couches:[
      {nom:"Plaque de plâtre",lam:0.25,e:1.3,R:0.052},
      {nom:"Polystyrène",lam:0.035,e:10,R:2.857},
      {nom:"Parpaing creux",lam:1.05,e:20,R:0.190},
      {nom:"Enduit ciment",lam:1.15,e:1.5,R:0.013}];
    var rsi=0.13, rse=0.04;
    var rtot=rsi+rse; C.forEach(function(c){rtot+=c.R;});
    var ti=20, te=0, dt=ti-te;

    /* largeurs : epaisseurs a l'echelle, avec un minimum lisible */
    var dispo=X1-X0-2*FILM, som=0;
    C.forEach(function(c){som+=c.e;});
    var l=C.map(function(c){return Math.max(7,dispo*c.e/som);});
    var tot=0; l.forEach(function(x){tot+=x;});
    l=l.map(function(x){return x*dispo/tot;});

    function y(theta){return Y1-(theta-te)/dt*(Y1-Y0);}

    /* les deux films d'air superficiels */
    [[X0,FILM,"chaud"],[X1-FILM,FILM,"froid"]].forEach(function(f){
      svg.appendChild(S("rect",{x:f[0],y:Y0,width:f[1],height:Y1-Y0,
        fill:V(f[2]),opacity:"0.10"}));
    });

    /* les couches */
    var x=X0+FILM, bornes=[X0,X0+FILM];
    C.forEach(function(c,i){
      var iso=c.lam<0.06;
      svg.appendChild(S("rect",{x:x,y:Y0,width:l[i],height:Y1-Y0,
        fill:V(iso?"vert":"trait"),opacity:iso?"0.20":"0.13"}));
      svg.appendChild(S("line",{x1:x,y1:Y0,x2:x,y2:Y1+8,
        stroke:V("trait"),"stroke-width":"1"}));
      if(l[i]>=15){
        var yn=Y1-10;
        var t=S("text",{x:x+l[i]/2,y:yn,"text-anchor":"start",
          "class":"s-nom",transform:"rotate(-90 "+(x+l[i]/2)+" "+yn+")"},
          c.nom.length>17?c.nom.slice(0,16)+"…":c.nom);
        svg.appendChild(t);
      }
      if(l[i]>=26)
        svg.appendChild(S("text",{x:x+l[i]/2,y:Y1+24,"text-anchor":"middle",
          "class":"s-pet"},frs(c.e,1)+" cm"));
      x+=l[i]; bornes.push(x);
    });
    bornes.push(X1);
    svg.appendChild(S("line",{x1:X1-FILM,y1:Y0,x2:X1-FILM,y2:Y1+8,
      stroke:V("trait"),"stroke-width":"1"}));

    /* le profil : la chute dans une couche est proportionnelle a sa resistance */
    var cum=0, pts=[[X0,y(ti)]];
    cum+=rsi; pts.push([X0+FILM,y(ti-dt*cum/rtot)]);
    C.forEach(function(c,i){
      cum+=c.R; pts.push([bornes[i+2],y(ti-dt*cum/rtot)]);
    });
    pts.push([X1,y(te)]);
    svg.appendChild(S("polyline",{points:pts.map(function(p){
      return p[0].toFixed(1)+","+p[1].toFixed(1);}).join(" "),
      fill:"none",stroke:V("chaud"),"stroke-width":"3","stroke-linejoin":"round"}));
    pts.forEach(function(p){
      svg.appendChild(S("circle",{cx:p[0],cy:p[1],r:"3.5",fill:V("chaud")}));
    });

    /* cadre et reperes */
    svg.appendChild(S("rect",{x:X0,y:Y0,width:X1-X0,height:Y1-Y0,fill:"none",
      stroke:V("trait"),"stroke-width":"1.5"}));
    svg.appendChild(S("text",{x:X0-10,y:y(ti)+4,"text-anchor":"end","class":"s-lab"},
      "20 °C"));
    svg.appendChild(S("text",{x:X1+10,y:y(te)+4,"text-anchor":"start","class":"s-lab"},
      "0 °C"));
    svg.appendChild(S("text",{x:X0-10,y:Y0-14,"text-anchor":"end","class":"s-pet"},
      "intérieur"));
    svg.appendChild(S("text",{x:X1+10,y:Y0-14,"text-anchor":"start","class":"s-pet"},
      "extérieur"));
    svg.appendChild(S("text",{x:(X0+X1)/2,y:Y0-14,"text-anchor":"middle","class":"s-tit"},
      "PROFIL DE TEMPÉRATURE DANS LA PAROI"));
    svg.appendChild(S("text",{x:X0+FILM/2,y:Y1+24,"text-anchor":"middle","class":"s-pet"},
      "Rsi"));
    svg.appendChild(S("text",{x:X1-FILM/2,y:Y1+24,"text-anchor":"middle","class":"s-pet"},
      "Rse"));

    /* ce que le dessin montre, en toutes lettres */
    var pire=null;
    C.forEach(function(c){if(!pire||c.R>pire.R)pire=c;});
    lg.innerHTML="La pente est raide là où la résistance est grande. Ici <b>"+
      fr(100*pire.R/rtot,0)+" % de la chute</b> se fait dans une seule couche, "+
      pire.nom.toLowerCase()+" — et presque rien dans le reste du mur.";
  }
  SCHEMA_MAJ.push(dessine);
  dessine();
};

/* ─────────── l'echelle des conductivites ─────────── */
SCHEMAS["lambda-echelle"]=function(el){
  var W=680,H=204,X0=60,X1=620,Y=100;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Échelle des conductivités thermiques"});
  var min=Math.log10(0.02), max=Math.log10(200);
  function x(v){return X0+(Math.log10(v)-min)/(max-min)*(X1-X0);}
  svg.appendChild(S("rect",{x:X0,y:Y-9,width:x(0.05)-X0,height:18,
    fill:V("vert"),opacity:"0.22"}));
  svg.appendChild(S("text",{x:(X0+x(0.05))/2,y:Y-19,"text-anchor":"middle",
    "class":"s-tit",fill:V("vert")},"LES ISOLANTS"));
  svg.appendChild(S("line",{x1:X0,y1:Y,x2:X1,y2:Y,stroke:V("encre2"),
    "stroke-width":"2"}));
  [0.02,0.1,1,10,100].forEach(function(v){
    svg.appendChild(S("line",{x1:x(v),y1:Y-7,x2:x(v),y2:Y+7,
      stroke:V("encre2"),"stroke-width":"1.5"}));
    svg.appendChild(S("text",{x:x(v),y:Y+26,"text-anchor":"middle","class":"s-pet"},
      frs(v,v<1?2:0)));
  });
  svg.appendChild(S("text",{x:X0,y:Y+68,"text-anchor":"start","class":"s-pet"},
    "λ en W/(m·K) — échelle logarithmique"));
  [[0.025,"Polyuréthane",1],[0.038,"Laine minérale",0],[0.15,"Bois",1],
   [0.45,"Brique creuse",0],[1.65,"Béton",1],[50,"Acier",0]].forEach(function(m){
    var h=m[2]?-1:1, xx=x(m[0]);
    svg.appendChild(S("line",{x1:xx,y1:Y+h*8,x2:xx,y2:Y+h*30,
      stroke:V("trait"),"stroke-width":"1"}));
    svg.appendChild(S("circle",{cx:xx,cy:Y,r:"4",fill:V(m[0]<0.06?"vert":"froid")}));
    svg.appendChild(S("text",{x:xx,y:Y+h*40+(h<0?0:4),"text-anchor":"middle",
      "class":"s-nom"},m[1]));
  });
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Du polyuréthane à l'acier, <b>un facteur 2 000</b>. C'est pourquoi l'échelle "+
    "est logarithmique : sur une échelle ordinaire, tous les isolants seraient "+
    "collés au zéro."));
};


/* ─────────── les trois modes de transfert ─────────── */
SCHEMAS["trois-modes"]=function(el){
  var W=720,H=330,XM=352,EP=64,Y0=54,Y1=250;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Conduction, convection et rayonnement sur une paroi"});

  /* les deux ambiances */
  svg.appendChild(S("rect",{x:0,y:Y0,width:XM,height:Y1-Y0,fill:V("chaud"),opacity:"0.07"}));
  svg.appendChild(S("rect",{x:XM+EP,y:Y0,width:W-XM-EP,height:Y1-Y0,
    fill:V("froid"),opacity:"0.09"}));
  svg.appendChild(S("text",{x:16,y:Y0-14,"class":"s-pet"},"INTÉRIEUR 20 °C"));
  svg.appendChild(S("text",{x:W-16,y:Y0-14,"text-anchor":"end","class":"s-pet"},
    "EXTÉRIEUR 0 °C"));

  /* la paroi */
  svg.appendChild(S("rect",{x:XM,y:Y0,width:EP,height:Y1-Y0,fill:V("trait"),
    opacity:"0.22"}));
  svg.appendChild(S("rect",{x:XM,y:Y0,width:EP,height:Y1-Y0,fill:"none",
    stroke:V("trait"),"stroke-width":"1.5"}));
  /* les hachures restent DANS la paroi : k borne aux deux extremites */
  for(var k=1;Y0+k*18+8<=Y1;k++)
    svg.appendChild(S("line",{x1:XM,y1:Y0+k*18+8,x2:XM+EP,y2:Y0+k*18-8,
      stroke:V("trait"),"stroke-width":"1",opacity:"0.6"}));

  function fleche(x1,y1,x2,y2,coul,ep){
    var a=Math.atan2(y2-y1,x2-x1);
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2-9*Math.cos(a),y2:y2-9*Math.sin(a),
      stroke:V(coul),"stroke-width":ep||2.5,"stroke-linecap":"round"}));
    svg.appendChild(S("path",{d:"M"+x2+","+y2+
      "L"+(x2-11*Math.cos(a-0.42))+","+(y2-11*Math.sin(a-0.42))+
      "L"+(x2-11*Math.cos(a+0.42))+","+(y2-11*Math.sin(a+0.42))+"Z",fill:V(coul)}));
  }

  /* 1. conduction : a travers la matiere */
  [88,148,208].forEach(function(y){
    fleche(XM+6,y,XM+EP-6,y,"chaud",3);
  });
  svg.appendChild(S("text",{x:XM+EP/2,y:Y0-14,"text-anchor":"middle","class":"s-tit",
    fill:V("chaud")},"CONDUCTION"));

  /* 2. convection : l'air qui bouge le long de la paroi, et celui qui s'en va */
  svg.appendChild(S("path",{d:"M300,222 C262,222 262,150 300,150 C336,150 336,86 300,86",
    fill:"none",stroke:V("froid"),"stroke-width":"2.5","stroke-dasharray":"6 4"}));
  fleche(304,88,286,74,"froid",2.5);
  svg.appendChild(S("text",{x:258,y:250,"text-anchor":"middle","class":"s-tit",
    fill:V("froid")},"CONVECTION"));
  /* la bouche de ventilation traverse la paroi */
  svg.appendChild(S("rect",{x:XM-4,y:98,width:EP+8,height:26,fill:V("carte"),
    stroke:V("froid"),"stroke-width":"2"}));
  fleche(XM+EP+10,111,XM+EP+52,111,"froid",2.5);
  svg.appendChild(S("text",{x:XM+EP+58,y:115,"class":"s-nom",fill:V("froid")},
    "air extrait"));

  /* 3. rayonnement : sans support, du corps chaud vers la paroi froide */
  svg.appendChild(S("rect",{x:96,y:130,width:26,height:76,rx:3,fill:V("chaud"),
    opacity:"0.30",stroke:V("chaud"),"stroke-width":"2"}));
  svg.appendChild(S("text",{x:109,y:224,"text-anchor":"middle","class":"s-nom"},
    "radiateur"));
  [150,168,186].forEach(function(y){
    var d="M130,"+y, x=130;
    for(var i=0;i<5;i++){
      d+=" q9,-7 18,0 q9,7 18,0";
      x+=36;
    }
    svg.appendChild(S("path",{d:d,fill:"none",stroke:V("tiede"),"stroke-width":"2"}));
    fleche(x-4,y,x+14,y,"tiede",2);
  });
  svg.appendChild(S("text",{x:212,y:126,"text-anchor":"middle","class":"s-tit",
    fill:V("tiede")},"RAYONNEMENT"));

  svg.appendChild(S("text",{x:W/2,y:H-16,"text-anchor":"middle","class":"s-nom"},
    "Le coefficient U englobe les trois : un seul nombre pour trois phénomènes."));
  el.appendChild(svg);
};

/* ─────────── les degres-jours, ville par ville ─────────── */
SCHEMAS["dju-villes"]=function(el){
  var W=700,H=260,X0=118,X1=572,Y0=26;   /* place pour l etiquette a droite */
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Degrés-jours unifiés par ville"});
  el.appendChild(svg);
  var lg=E("p",{"class":"leg-schema"},"");
  (el.parentNode||el).appendChild(lg);

  function dessine(){
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var choisie=ETAT.ville===undefined?0:ETAT.ville;
    var mx=0; VILLES.forEach(function(v){if(v[1]>mx)mx=v[1];});
    var h=26, pas=(H-Y0-24)/VILLES.length;
    VILLES.forEach(function(v,i){
      var y=Y0+i*pas, l=(X1-X0)*v[1]/mx, sel=(i===choisie);
      svg.appendChild(S("text",{x:X0-12,y:y+h/2+4,"text-anchor":"end",
        "class":sel?"s-lab":"s-nom"},v[0]));
      svg.appendChild(S("rect",{x:X0,y:y,width:l,height:h,rx:2,
        fill:V(sel?"chaud":"froid"),opacity:sel?"0.85":"0.28"}));
      svg.appendChild(S("text",{x:X0+l+9,y:y+h/2+4,"class":"s-pet"},
        fr(v[1],0)+" DJU"));
    });
    var v=VILLES[choisie];
    lg.innerHTML="À bâtiment identique, la consommation de chauffage suit les "+
      "degrés-jours. <b>"+v[0]+"</b> en compte "+fr(v[1],0)+" ; Briançon en compte "+
      fr(3800/v[1],1)+" fois plus.";
  }
  SCHEMA_MAJ.push(dessine);
  dessine();
};


/* ─────────── la double etiquette du DPE ─────────── */
/* Seuils : arrete du 31 mars 2021, cas general. La classe retenue est la plus
   mauvaise des deux — c'est tout l'objet de ce schema. */
var DPE=[
 {c:"A",cep:70, ges:6,  e:"#2e8b3d",g:"#ece9f4"},
 {c:"B",cep:110,ges:11, e:"#6bb43a",g:"#d5cee8"},
 {c:"C",cep:180,ges:30, e:"#b5cf3c",g:"#bab0da"},
 {c:"D",cep:250,ges:50, e:"#f2d81f",g:"#8878c4"},
 {c:"E",cep:330,ges:70, e:"#f0a52a",g:"#6f5ab4"},
 {c:"F",cep:420,ges:100,e:"#e6702c",g:"#57409f"},
 {c:"G",cep:1e9,ges:1e9,e:"#d02b20",g:"#3d2a80"}
];
SCHEMAS["dpe-etiquette"]=function(el){
  var W=700,H=372,Y0=64,HB=34,PAS=42;
  var saisie=E("div",{style:"display:flex;flex-wrap:wrap;gap:16px;margin-bottom:12px"});
  var etat={cep:180,ges:35};
  [["cep","Consommation","kWh/m²·an",0,600],
   ["ges","Émissions","kg CO₂/m²·an",0,150]].forEach(function(f){
    var w=E("label",{style:"display:flex;align-items:center;gap:7px;font-size:14.5px"});
    w.appendChild(E("span",{},f[1]));
    var i=E("input",{type:"number",min:f[3],max:f[4],step:"1",value:etat[f[0]]});
    i.addEventListener("input",function(){
      var v=parseFloat(this.value);
      if(isFinite(v)){etat[f[0]]=Math.max(f[3],Math.min(f[4],v));dessine();}});
    w.appendChild(i);
    w.appendChild(E("span",{"class":"mono",style:"color:var(--encre2);font-size:12.5px"},f[2]));
    saisie.appendChild(w);
  });
  el.appendChild(saisie);
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Double étiquette du DPE, énergie et climat"});
  el.appendChild(svg);
  var lg=E("p",{"class":"leg-schema"},"");
  (el.parentNode||el).appendChild(lg);

  function classe(val,cle){
    for(var i=0;i<DPE.length;i++)if(val<DPE[i][cle])return i;
    return 6;
  }
  function dessine(){
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var ie=classe(etat.cep,"cep"), ig=classe(etat.ges,"ges");
    var pire=Math.max(ie,ig);
    [[48,"ÉNERGIE","kWh/m²·an","e","cep",ie],
     [408,"CLIMAT","kg CO₂/m²·an","g","ges",ig]].forEach(function(col){
      var x0=col[0];
      svg.appendChild(S("text",{x:x0,y:26,"class":"s-tit"},col[1]));
      svg.appendChild(S("text",{x:x0,y:46,"class":"s-pet"},col[2]));
      DPE.forEach(function(d,i){
        var y=Y0+i*PAS, l=130+i*22, sel=(i===col[5]);
        svg.appendChild(S("path",{d:"M"+x0+","+y+"h"+(l-18)+"l18,"+(HB/2)+
          "l-18,"+(HB/2)+"H"+x0+"Z",fill:d[col[3]],
          stroke:sel?V("encre"):"none","stroke-width":sel?"2.5":"0"}));
        var clair=(col[3]==="e")?(i>=2&&i<=4):(i<=2);
        svg.appendChild(S("text",{x:x0+14,y:y+HB/2+6,"class":"s-lab",
          fill:clair?"#1a1a1a":"#ffffff"},d.c));
        var borne=i===0?("< "+DPE[0][col[4]])
          :i===6?("> "+DPE[5][col[4]])
          :(DPE[i-1][col[4]]+" à "+d[col[4]]);
        svg.appendChild(S("text",{x:x0+l-26,y:y+HB/2+5,"text-anchor":"end",
          "class":"s-pet",fill:clair?"#333333":"#f4f4f4"},borne));
        if(sel)svg.appendChild(S("text",{x:x0+l+14,y:y+HB/2+5,"class":"s-lab"},"◀"));
      });
    });
    lg.innerHTML="Consommation en <b>"+DPE[ie].c+"</b>, émissions en <b>"+DPE[ig].c+
      "</b> : le logement est classé <b>"+DPE[pire].c+"</b>. "+
      "<b>La plus mauvaise des deux l'emporte</b>"+
      (pire===ig&&ig>ie?" — ici c'est le carbone qui déclasse, pas l'isolation."
       :pire===ie&&ie>ig?" — ici c'est la consommation."
       :" — les deux tombent dans la même classe.")+
      (pire>=5?" Au-delà de F, on parle de passoire thermique.":"");
  }
  dessine();
};

/* ─────────── chaine d'energie et chaine d'information ─────────── */
SCHEMAS["deux-chaines"]=function(el){
  var W=760,H=352;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Chaîne d'énergie et chaîne d'information"});
  function boite(x,y,l,h,titre,ex,coul){
    svg.appendChild(S("rect",{x:x,y:y,width:l,height:h,rx:3,fill:V(coul),
      opacity:"0.13"}));
    svg.appendChild(S("rect",{x:x,y:y,width:l,height:h,rx:3,fill:"none",
      stroke:V(coul),"stroke-width":"2"}));
    svg.appendChild(S("text",{x:x+l/2,y:y+21,"text-anchor":"middle","class":"s-tit",
      fill:V(coul)},titre));
    ex.split("|").forEach(function(m,k){
      svg.appendChild(S("text",{x:x+l/2,y:y+40+k*15,"text-anchor":"middle",
        "class":"s-nom"},m));
    });
  }
  function fl(x1,y1,x2,y2,coul){
    var a=Math.atan2(y2-y1,x2-x1);
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2-8*Math.cos(a),y2:y2-8*Math.sin(a),
      stroke:V(coul),"stroke-width":"2.5"}));
    svg.appendChild(S("path",{d:"M"+x2+","+y2+
      "L"+(x2-10*Math.cos(a-0.4))+","+(y2-10*Math.sin(a-0.4))+
      "L"+(x2-10*Math.cos(a+0.4))+","+(y2-10*Math.sin(a+0.4))+"Z",fill:V(coul)}));
  }
  /* le couloir entre les deux rangees accueille les deux liaisons :
     les ordres a y=152, le compte rendu a y=190. Rien ne croise un titre. */
  var YI=44, YE=244, HB=74;
  function coude(pts,coul){
    var d="M"+pts[0][0]+","+pts[0][1];
    for(var i=1;i<pts.length;i++)d+="L"+pts[i][0]+","+pts[i][1];
    svg.appendChild(S("path",{d:d,fill:"none",stroke:V(coul),"stroke-width":"2.5",
      "stroke-linejoin":"round"}));
    var a=pts[pts.length-1], b=pts[pts.length-2];
    var an=Math.atan2(a[1]-b[1],a[0]-b[0]);
    svg.appendChild(S("path",{d:"M"+a[0]+","+a[1]+
      "L"+(a[0]-10*Math.cos(an-0.4))+","+(a[1]-10*Math.sin(an-0.4))+
      "L"+(a[0]-10*Math.cos(an+0.4))+","+(a[1]-10*Math.sin(an+0.4))+"Z",fill:V(coul)}));
  }
  svg.appendChild(S("text",{x:14,y:26,"class":"s-tit",fill:V("froid")},
    "CHAÎNE D'INFORMATION — elle transporte la décision"));
  [[74,"ACQUÉRIR","sonde de départ|sonde extérieure"],
   [292,"TRAITER","régulateur|automate"],
   [510,"COMMUNIQUER","GTB, superviseur|Modbus, BACnet"]].forEach(function(b){
    boite(b[0],YI,176,HB,b[1],b[2],"froid");
  });
  fl(250,YI+HB/2,292,YI+HB/2,"froid");
  fl(468,YI+HB/2,510,YI+HB/2,"froid");

  svg.appendChild(S("text",{x:14,y:YE-14,"class":"s-tit",fill:V("chaud")},
    "CHAÎNE D'ÉNERGIE — elle transporte la puissance"));
  [[14,"ALIMENTER","réseau de chaleur"],
   [170,"DISTRIBUER","vanne 3 voies|motorisée"],
   [326,"CONVERTIR","échangeur|circulateur"],
   [482,"TRANSMETTRE","réseau de|tuyauteries"]].forEach(function(b){
    boite(b[0],YE,140,HB,b[1],b[2],"chaud");
  });
  [156,312,468].forEach(function(x){fl(x,YE+HB/2,x+14,YE+HB/2,"chaud");});

  /* la matiere d'oeuvre */
  svg.appendChild(S("rect",{x:640,y:YE,width:106,height:HB,rx:3,fill:V("vert"),
    opacity:"0.13"}));
  svg.appendChild(S("rect",{x:640,y:YE,width:106,height:HB,rx:3,fill:"none",
    stroke:V("vert"),"stroke-width":"2","stroke-dasharray":"6 4"}));
  svg.appendChild(S("text",{x:693,y:YE+26,"text-anchor":"middle","class":"s-tit",
    fill:V("vert")},"LE LOCAL"));
  svg.appendChild(S("text",{x:693,y:YE+48,"text-anchor":"middle","class":"s-nom"},
    "à 19 °C"));
  fl(626,YE+HB/2,640,YE+HB/2,"chaud");

  /* les deux chaines se rejoignent — en equerre, dans le couloir */
  coude([[380,YI+HB],[380,152],[240,152],[240,YE]],"froid");
  svg.appendChild(S("text",{x:310,y:146,"text-anchor":"middle","class":"s-nom",
    fill:V("froid")},"ordres"));
  coude([[693,YE],[693,190],[150,190],[150,YI+HB]],"vert");
  svg.appendChild(S("text",{x:430,y:184,"text-anchor":"middle","class":"s-nom",
    fill:V("vert")},"compte rendu — ce que mesure la sonde"));

  svg.appendChild(S("text",{x:W/2,y:H-14,"text-anchor":"middle","class":"s-nom"},
    "Elles se rejoignent à l'actionneur. C'est presque toujours là que l'épreuve interroge."));
  el.appendChild(svg);
};


/* ─────────── topologies d'une ligne, et les trois longueurs ─────────── */
SCHEMAS["topologies-bus"]=function(el){
  var W=760,H=318;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Topologies autoris\u00e9es sur une ligne de bus et les trois longueurs \u00e0 v\u00e9rifier"});
  function noeud(x,y,c){
    svg.appendChild(S("circle",{cx:x,cy:y,r:5.5,fill:V(c||"froid")}));
  }
  function cadre(x,titre,verdict,coul){
    svg.appendChild(S("rect",{x:x,y:16,width:176,height:132,rx:3,fill:"none",
      stroke:V(coul),"stroke-width":"1.6","stroke-opacity":".55"}));
    svg.appendChild(S("text",{x:x+88,y:34,"text-anchor":"middle","class":"s-tit",
      fill:V(coul)},titre));
    svg.appendChild(S("text",{x:x+88,y:138,"text-anchor":"middle","class":"s-nom",
      fill:V(coul)},verdict));
  }
  function trait(x1,y1,x2,y2){
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V("encre2"),
      "stroke-width":"2"}));
  }
  /* ligne */
  cadre(6,"LIGNE","autoris\u00e9e","vert");
  trait(26,88,166,88);
  for(var i=0;i<5;i++)noeud(30+i*34,88);
  /* etoile */
  cadre(196,"\u00c9TOILE","autoris\u00e9e","vert");
  var cx=284,cy=88;
  [[-52,-26],[-52,26],[52,-26],[52,26],[0,-40]].forEach(function(d){
    trait(cx,cy,cx+d[0],cy+d[1]); noeud(cx+d[0],cy+d[1]);
  });
  noeud(cx,cy,"chaud");
  /* arbre */
  cadre(386,"ARBRE","autoris\u00e9e","vert");
  trait(410,70,550,70);
  for(var k=0;k<4;k++){
    var x=416+k*44; noeud(x,70); trait(x,70,x,108); noeud(x,108);
  }
  /* anneau */
  cadre(576,"ANNEAU","interdite","chaud");
  svg.appendChild(S("rect",{x:610,y:62,width:110,height:52,fill:"none",
    stroke:V("encre2"),"stroke-width":"2"}));
  [[610,62],[720,62],[610,114],[720,114]].forEach(function(p){noeud(p[0],p[1]);});
  svg.appendChild(S("path",{d:"M598,50L732,126M598,126L732,50",stroke:V("chaud"),
    "stroke-width":"4","stroke-linecap":"round"}));
  /* les trois longueurs */
  svg.appendChild(S("rect",{x:14,y:176,width:58,height:26,rx:3,fill:V("chaud"),
    opacity:"0.13"}));
  svg.appendChild(S("rect",{x:14,y:176,width:58,height:26,rx:3,fill:"none",
    stroke:V("chaud"),"stroke-width":"1.6"}));
  svg.appendChild(S("text",{x:43,y:193,"text-anchor":"middle","class":"s-lab"},"ALIM"));
  trait(72,189,700,189);
  for(var j=0;j<6;j++)noeud(140+j*112,189);
  svg.appendChild(S("text",{x:140,y:212,"text-anchor":"middle","class":"s-nom"},
    "participant"));
  svg.appendChild(S("text",{x:700,y:212,"text-anchor":"end","class":"s-nom"},
    "le plus \u00e9loign\u00e9"));
  [["1",'de l\'alimentation au participant le plus \u00e9loign\u00e9',"350 m"],
   ["2","entre deux participants quelconques","700 m"],
   ["3","de c\u00e2ble pos\u00e9 au total sur la ligne","1 000 m"]].forEach(function(r,n){
    var y=244+n*24;
    svg.appendChild(S("text",{x:14,y:y,"class":"s-nom",fill:V("froid")},r[0]+" \u2014"));
    svg.appendChild(S("text",{x:44,y:y,"class":"s-nom"},r[1]));
    svg.appendChild(S("text",{x:700,y:y,"text-anchor":"end","class":"s-lab"},r[2]+" au maximum"));
  });
  el.appendChild(svg);
};

/* ─────────── les trois couches, quatre protocoles ─────────── */
SCHEMAS["couches-protocole"]=function(el){
  var W=760,H=300;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Trois couches et ce que quatre protocoles mettent dans chacune"});
  var COLS=[["KNX TP1","froid"],["Modbus RTU","tiede"],["BACnet/IP","vert"],
            ["DALI","violet"]];
  var LX=[152,304,456,608], LW=146;
  COLS.forEach(function(c,i){
    svg.appendChild(S("text",{x:LX[i]+LW/2,y:22,"text-anchor":"middle","class":"s-lab"},c[0]));
  });
  var LIGNES=[
    ["APPLICATION","ce qu'on \u00e9change",
     ["objets de groupe|datapoints typ\u00e9s","registres et bits|num\u00e9rot\u00e9s",
      "objets et propri\u00e9t\u00e9s|nomm\u00e9s","niveau, groupes,|sc\u00e8nes"]],
    ["LIAISON","qui parle, et quand",
     ["CSMA/CA|arbitrage bit \u00e0 bit","ma\u00eetre-esclave|1 ma\u00eetre",
      "client-serveur|sur IP","ma\u00eetre-esclave|1 contr\u00f4leur"]],
    ["PHYSIQUE","sur quoi \u00e7a circule",
     ["paire torsad\u00e9e|29 V, 9 600 bit/s","RS-485|2 ou 3 fils",
      "Ethernet|UDP 47808","2 fils|\u00b116 V, sans polarit\u00e9"]]
  ];
  LIGNES.forEach(function(L,r){
    var y=36+r*84;
    svg.appendChild(S("rect",{x:8,y:y,width:136,height:74,rx:3,fill:V("encre2"),
      opacity:"0.10"}));
    svg.appendChild(S("text",{x:18,y:y+26,"class":"s-tit"},L[0]));
    svg.appendChild(S("text",{x:18,y:y+48,"class":"s-nom"},L[1]));
    L[2].forEach(function(txt,i){
      svg.appendChild(S("rect",{x:LX[i],y:y,width:LW,height:74,rx:3,
        fill:V(COLS[i][1]),opacity:"0.11"}));
      svg.appendChild(S("rect",{x:LX[i],y:y,width:LW,height:74,rx:3,fill:"none",
        stroke:V(COLS[i][1]),"stroke-width":"1.4","stroke-opacity":".5"}));
      txt.split("|").forEach(function(m,k){
        svg.appendChild(S("text",{x:LX[i]+LW/2,y:y+30+k*17,"text-anchor":"middle",
          "class":"s-nom"},m));
      });
    });
  });
  svg.appendChild(S("text",{x:W/2,y:H-10,"text-anchor":"middle","class":"s-nom"},
    "Deux syst\u00e8mes se parlent quand les trois couches concordent. Sinon il faut une passerelle."));
  el.appendChild(svg);
};

/* ─────────── perimetrique, volumetrique, zonage ─────────── */
SCHEMAS["zonage-surete"]=function(el){
  var W=760,H=316;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Protection p\u00e9rim\u00e9trique et volum\u00e9trique sur un plan"});
  /* le local */
  svg.appendChild(S("rect",{x:26,y:40,width:470,height:232,fill:V("encre2"),
    opacity:"0.06"}));
  svg.appendChild(S("rect",{x:26,y:40,width:470,height:232,fill:"none",
    stroke:V("encre"),"stroke-width":"2.5"}));
  svg.appendChild(S("line",{x1:256,y1:40,x2:256,y2:172,stroke:V("encre"),
    "stroke-width":"2.5"}));
  /* perimetrique : le contour surveille */
  svg.appendChild(S("rect",{x:36,y:50,width:450,height:212,fill:"none",
    stroke:V("froid"),"stroke-width":"2","stroke-dasharray":"7 5"}));
  svg.appendChild(S("text",{x:44,y:68,"class":"s-lab"},
    "P\u00c9RIM\u00c9TRIQUE"));
  /* les ouvertures surveillees */
  function contact(x,y){
    svg.appendChild(S("rect",{x:x-6,y:y-6,width:12,height:12,rx:2,fill:V("froid")}));
  }
  contact(140,40); contact(360,40); contact(26,160); contact(200,272); contact(496,120);
  /* volumetrique : le cone d'un detecteur */
  svg.appendChild(S("path",{d:"M330,190L216,262L444,262Z",fill:V("tiede"),
    opacity:"0.20"}));
  svg.appendChild(S("path",{d:"M330,190L216,262L444,262Z",fill:"none",
    stroke:V("tiede"),"stroke-width":"1.6"}));
  svg.appendChild(S("circle",{cx:330,cy:190,r:6,fill:V("tiede")}));
  svg.appendChild(S("text",{x:330,y:180,"text-anchor":"middle","class":"s-lab"},"VOLUM\u00c9TRIQUE"));
  svg.appendChild(S("text",{x:140,y:110,"class":"s-nom"},"zone 1 \u2014 bureaux"));
  svg.appendChild(S("text",{x:300,y:110,"class":"s-nom"},"zone 2 \u2014 stock"));
  svg.appendChild(S("text",{x:60,y:232,"class":"s-nom"},"zone 3 \u2014 accueil"));
  /* legende */
  var L=[["froid","contact d'ouverture \u2014 on surveille l'enveloppe"],
         ["tiede","d\u00e9tecteur de mouvement \u2014 on surveille le volume"],
         ["chaud","le zonage d\u00e9coupe \u2014 on arme une zone, pas tout"]];
  L.forEach(function(r,i){
    var y=64+i*46;
    svg.appendChild(S("rect",{x:528,y:y-9,width:12,height:12,rx:2,fill:V(r[0])}));
    r[1].split(" \u2014 ").forEach(function(m,k){
      svg.appendChild(S("text",{x:548,y:y+k*17,"class":k?"s-nom":"s-lab"},m));
    });
  });
  svg.appendChild(S("text",{x:528,y:238,"class":"s-nom"},
    "Le p\u00e9rim\u00e9trique arr\u00eate avant l'entr\u00e9e."));
  svg.appendChild(S("text",{x:528,y:256,"class":"s-nom"},
    "Le volum\u00e9trique constate apr\u00e8s."));
  svg.appendChild(S("text",{x:528,y:280,"class":"s-nom",fill:V("chaud")},
    "L'analyse de risques dit lequel,"));
  svg.appendChild(S("text",{x:528,y:298,"class":"s-nom",fill:V("chaud")},
    "et o\u00f9. Jamais le catalogue."));
  el.appendChild(svg);
};

/* ─────────── les deux situations de CCF de l'epreuve E5 ─────────── */
SCHEMAS["situations-e5"]=function(el){
  var W=760,H=246;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Les deux situations de CCF de l'\u00e9preuve E5 et leurs \u00e9ch\u00e9ances"});
  svg.appendChild(S("text",{x:W/2,y:18,"text-anchor":"middle","class":"s-tit"},
    "E5 \u2014 INTERVENTIONS SUR LES SYST\u00c8MES \u00b7 COEFFICIENT 5"));
  function boite(x,w,coul,titre,comp,quand){
    svg.appendChild(S("rect",{x:x,y:38,width:w,height:84,rx:3,fill:V(coul),
      opacity:"0.12"}));
    svg.appendChild(S("rect",{x:x,y:38,width:w,height:84,rx:3,fill:"none",
      stroke:V(coul),"stroke-width":"2"}));
    svg.appendChild(S("text",{x:x+w/2,y:60,"text-anchor":"middle","class":"s-tit",
      fill:V(coul)},titre));
    comp.split("|").forEach(function(m,k){
      svg.appendChild(S("text",{x:x+w/2,y:80+k*16,"text-anchor":"middle",
        "class":"s-nom"},m));
    });
    svg.appendChild(S("text",{x:x+w/2,y:113,"text-anchor":"middle","class":"s-lab"},quand));
  }
  boite(46,268,"froid","SITUATION 1",
        "C7 \u2014 r\u00e9aliser des essais|et des mesures",
        "AVANT LA FIN DE LA 1re ANN\u00c9E");
  boite(446,268,"vert","SITUATION 2",
        "C6 \u2014 outils de pilotage|C8 \u2014 performances d'un syst\u00e8me",
        "AVANT LE PRINTEMPS DE 2e ANN\u00c9E");
  /* la frise */
  svg.appendChild(S("line",{x1:30,y1:180,x2:722,y2:180,stroke:V("encre2"),
    "stroke-width":"2"}));
  svg.appendChild(S("path",{d:"M730,180L718,175L718,185Z",fill:V("encre2")}));
  svg.appendChild(S("line",{x1:380,y1:158,x2:380,y2:212,stroke:V("encre2"),
    "stroke-width":"1.5","stroke-dasharray":"5 4"}));
  svg.appendChild(S("line",{x1:300,y1:122,x2:330,y2:172,stroke:V("froid"),
    "stroke-width":"2"}));
  svg.appendChild(S("circle",{cx:330,cy:180,r:6,fill:V("froid")}));
  svg.appendChild(S("line",{x1:600,y1:122,x2:630,y2:172,stroke:V("vert"),
    "stroke-width":"2"}));
  svg.appendChild(S("circle",{cx:630,cy:180,r:6,fill:V("vert")}));
  svg.appendChild(S("text",{x:190,y:204,"text-anchor":"middle","class":"s-nom"},
    "1re ann\u00e9e"));
  svg.appendChild(S("text",{x:550,y:204,"text-anchor":"middle","class":"s-nom"},
    "2e ann\u00e9e"));
  svg.appendChild(S("text",{x:W/2,y:236,"text-anchor":"middle","class":"s-nom"},
    "Chaque situation donne lieu \u00e0 un rapport argument\u00e9 et \u00e0 une proposition de note pr\u00e9sent\u00e9e au jury."));
  el.appendChild(svg);
};

/* ─────────── le batiment en ecorche ─────────── */
SCHEMAS["batiment-ecorche"]=function(el){
  var W=900,H=470;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Coupe d'un bâtiment et part de chaque poste de déperdition"});
  el.appendChild(svg);
  var lg=E("p",{"class":"leg-schema"},"");
  (el.parentNode||el).appendChild(lg);

  /* ou part chaque poste, et vers ou : [x1,y1,x2,y2, ancrage du texte] */
  var OU={
    "Toiture":              [450,124,450, 58,"ma"],
    "Murs":                 [654,196,762,196,"la"],
    "Fenêtres":             [236,214,146,214,"ra"],
    "Plancher":             [450,352,450,404,"ma"],
    "Pont thermique plancher":[650,344,714,392,"ma"],
    "Ponts de menuiseries": [236,262,168,324,"ma"],
    "Air neuf":             [598,132,714, 74,"la"]
  };
  var XG=236,XD=654,YH=124,YB=352,EP=16;

  function dessine(){
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var P=ETAT.postes&&ETAT.postes.length?ETAT.postes:
      [["Murs",702],["Fenêtres",473],["Toiture",437],["Plancher",277],
       ["Pont thermique plancher",445],["Ponts de menuiseries",78],["Air neuf",1002]];
    var tot=0,mx=0;
    P.forEach(function(p){tot+=p[1];if(p[1]>mx)mx=p[1];});

    /* le dehors, le dedans, le vide sanitaire */
    svg.appendChild(S("rect",{x:0,y:0,width:W,height:H,fill:V("froid"),opacity:"0.05"}));
    svg.appendChild(S("rect",{x:XG,y:YH,width:XD-XG,height:YB-YH,
      fill:V("chaud"),opacity:"0.08"}));
    svg.appendChild(S("text",{x:(XG+XD)/2,y:YH+30,"text-anchor":"middle","class":"s-pet"},
      "INTÉRIEUR 19 °C"));
    svg.appendChild(S("rect",{x:XG,y:YB+EP,width:XD-XG,height:36,fill:V("trait"),
      opacity:"0.14"}));
    svg.appendChild(S("text",{x:(XG+XD)/2,y:YB+EP+23,"text-anchor":"middle","class":"s-pet"},
      "VIDE SANITAIRE 8 °C"));
    svg.appendChild(S("text",{x:22,y:34,"class":"s-pet"},"EXTÉRIEUR −7 °C"));

    /* l'enveloppe, en coupe */
    function paroi(x,y,l,h){
      svg.appendChild(S("rect",{x:x,y:y,width:l,height:h,fill:V("encre2"),opacity:"0.30"}));
      svg.appendChild(S("rect",{x:x,y:y,width:l,height:h,fill:"none",stroke:V("encre2"),
        "stroke-width":"1.5"}));
    }
    paroi(XG-EP,YH-EP,XD-XG+2*EP,EP);        /* toiture */
    paroi(XG-EP,YB,XD-XG+2*EP,EP);           /* plancher */
    paroi(XG-EP,YH,EP,YB-YH);                /* mur gauche */
    paroi(XD,YH,EP,YB-YH);                   /* mur droit */
    /* la fenetre interrompt le mur gauche */
    svg.appendChild(S("rect",{x:XG-EP,y:190,width:EP,height:52,fill:V("froid"),
      opacity:"0.45"}));
    svg.appendChild(S("rect",{x:XG-EP,y:190,width:EP,height:52,fill:"none",
      stroke:V("froid"),"stroke-width":"1.5"}));
    /* la bouche d'air neuf traverse le mur droit */
    svg.appendChild(S("rect",{x:XD,y:140,width:EP,height:22,fill:V("carte")}));
    svg.appendChild(S("rect",{x:XD,y:140,width:EP,height:22,fill:"none",
      stroke:V("encre2"),"stroke-width":"1.5"}));

    /* une fleche par poste, epaisseur proportionnelle a sa part */
    P.slice().sort(function(a,b){return a[1]-b[1];}).forEach(function(p){
      var o=OU[p[0]];if(!o)return;
      var part=tot>0?p[1]/tot:0, ep=3+13*(p[1]/(mx||1));
      var a=Math.atan2(o[3]-o[1],o[2]-o[0]);
      var fort=(p[1]===mx);
      svg.appendChild(S("line",{x1:o[0],y1:o[1],x2:o[2]-11*Math.cos(a),
        y2:o[3]-11*Math.sin(a),stroke:V("chaud"),"stroke-width":ep,
        "stroke-linecap":"round",opacity:fort?"1":"0.55"}));
      svg.appendChild(S("path",{d:"M"+o[2]+","+o[3]+
        "L"+(o[2]-15*Math.cos(a-0.42))+","+(o[3]-15*Math.sin(a-0.42))+
        "L"+(o[2]-15*Math.cos(a+0.42))+","+(o[3]-15*Math.sin(a+0.42))+"Z",
        fill:V("chaud"),opacity:fort?"1":"0.55"}));
      var anc=o[4]==="la"?"start":o[4]==="ra"?"end":"middle";
      var dx=o[4]==="la"?13:o[4]==="ra"?-13:0;
      var dy=o[4]!=="ma"?-4:(o[3]<o[1]?-24:22);
      svg.appendChild(S("text",{x:o[2]+dx,y:o[3]+dy,"text-anchor":anc,
        "class":fort?"s-lab":"s-nom"},p[0]));
      svg.appendChild(S("text",{x:o[2]+dx,y:o[3]+dy+16,"text-anchor":anc,
        "class":"s-pet"},fr(p[1],0)+" W · "+fr(100*part,0)+" %"));
    });

    var tri=P.slice().sort(function(a,b){return b[1]-a[1];});
    lg.innerHTML="Le poste le plus lourd est <b>"+tri[0][0].toLowerCase()+"</b> ("+
      fr(100*tri[0][1]/tot,0)+" %). Avec <b>"+tri[1][0].toLowerCase()+"</b>, les deux "+
      "premiers pèsent <b>"+fr(100*(tri[0][1]+tri[1][1])/tot,0)+" %</b> du total — "+
      "c'est ce classement, et non le total, qui dit où mettre l'argent.";
  }
  SCHEMA_MAJ.push(dessine);
  dessine();
};


/* ─────────── le diagramme de l'air humide ─────────── */
SCHEMAS["air-humide"]=function(el){
  var W=720,H=416,X0=64,X1=650,Y0=28,Y1=326;
  var TMIN=-5,TMAX=45,RMAX=25;
  var P={t:20,hr:50,evo:false};

  var barre=E("div",{style:"display:flex;flex-wrap:wrap;gap:18px;align-items:center;"+
    "margin-bottom:12px"});
  [["t","Température sèche",-5,45,0.5,"°C"],
   ["hr","Humidité relative",5,100,1,"%"]].forEach(function(f){
    var w=E("div",{style:"flex:1 1 220px"});
    var l=E("div",{style:"display:flex;justify-content:space-between;font-size:14.5px"});
    l.appendChild(E("span",{},f[1]));
    var v=E("span",{"class":"mono",style:"font-weight:600"},"");
    l.appendChild(v);w.appendChild(l);
    var i=E("input",{type:"range",min:f[2],max:f[3],step:f[4],value:P[f[0]],
      style:"width:100%;accent-color:var(--froid)"});
    i.addEventListener("input",function(){P[f[0]]=parseFloat(this.value);dessine();});
    w.appendChild(i);barre.appendChild(w);
    f.maj=function(){v.textContent=frs(P[f[0]],f[0]==="hr"?0:1)+" "+f[5];};
    P["maj_"+f[0]]=f.maj;
  });
  var bt=E("button",{"class":"bt",type:"button"},"Les quatre évolutions");
  bt.addEventListener("click",function(){
    P.evo=!P.evo;this.className="bt"+(P.evo?" p":"");dessine();});
  barre.appendChild(bt);
  el.appendChild(barre);

  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Diagramme de l'air humide"});
  el.appendChild(svg);
  var lect=E("div",{"class":"res",style:"margin-top:12px"});
  el.appendChild(lect);

  function px(t){return X0+(t-TMIN)/(TMAX-TMIN)*(X1-X0);}
  function py(r){return Y1-Math.min(r,RMAX)/RMAX*(Y1-Y0);}

  function dessine(){
    P.maj_t();P.maj_hr();
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    var t,r;
    /* la grille */
    for(t=TMIN;t<=TMAX;t+=5){
      svg.appendChild(S("line",{x1:px(t),y1:Y0,x2:px(t),y2:Y1,stroke:V("trait2"),
        "stroke-width":"1"}));
      svg.appendChild(S("text",{x:px(t),y:Y1+18,"text-anchor":"middle","class":"s-pet"},
        String(t)));
    }
    for(r=0;r<=RMAX;r+=5){
      svg.appendChild(S("line",{x1:X0,y1:py(r),x2:X1,y2:py(r),stroke:V("trait2"),
        "stroke-width":"1"}));
      svg.appendChild(S("text",{x:X0-9,y:py(r)+4,"text-anchor":"end","class":"s-pet"},
        String(r)));
    }
    svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+62,"text-anchor":"middle","class":"s-pet"},
      "température sèche θ  (°C)"));
    var lab=S("text",{x:0,y:0,"text-anchor":"middle","class":"s-pet",
      transform:"translate(18,"+((Y0+Y1)/2)+") rotate(-90)"});
    lab.textContent="humidité absolue r  (g/kg)";
    svg.appendChild(lab);

    /* les courbes d'humidite relative, puis la saturation */
    function courbe(hr,coul,ep,tir){
      var d="",k=0,tf=TMIN;
      for(t=TMIN;t<=TMAX;t+=0.5){
        var rr=rDe(t,hr);if(rr>RMAX)break;
        d+=(k++?"L":"M")+px(t).toFixed(1)+","+py(rr).toFixed(1);tf=t;
      }
      if(k<2)return null;
      var a={d:d,fill:"none",stroke:V(coul),"stroke-width":ep};
      if(tir)a["stroke-dasharray"]="3 4";
      svg.appendChild(S("path",a));
      return tf;
    }
    [20,40,60,80].forEach(function(hr){
      var tf=courbe(hr,"trait",1,true);
      if(tf!==null)svg.appendChild(S("text",{x:px(tf)-4,y:py(rDe(tf,hr))-6,
        "text-anchor":"end","class":"s-pet",fill:V("trait")},hr+" %"));
    });
    var ts=courbe(100,"froid",2.5,false);
    if(ts!==null)svg.appendChild(S("text",{x:px(ts)-4,y:py(rDe(ts,100))-8,
      "text-anchor":"end","class":"s-pet",fill:V("froid")},"saturation φ = 100 %"));

    /* le point, et la construction du point de rosee */
    var rp=rDe(P.t,P.hr), tr=rosee(P.t,P.hr);
    var xp=px(P.t), yp=py(rp);
    svg.appendChild(S("line",{x1:xp,y1:yp,x2:xp,y2:Y1,stroke:V("encre2"),
      "stroke-width":"1","stroke-dasharray":"4 4"}));
    svg.appendChild(S("line",{x1:X0,y1:yp,x2:xp,y2:yp,stroke:V("encre2"),
      "stroke-width":"1","stroke-dasharray":"4 4"}));
    if(tr>=TMIN){
      svg.appendChild(S("line",{x1:px(tr),y1:yp,x2:px(tr),y2:Y1,stroke:V("eau"),
        "stroke-width":"2","stroke-dasharray":"5 4"}));
      svg.appendChild(S("circle",{cx:px(tr),cy:yp,r:"5",fill:V("eau")}));
      svg.appendChild(S("text",{x:px(tr),y:Y1+36,"text-anchor":"middle","class":"s-lab",
        fill:V("eau")},frs(tr,1)+" °C"));
      svg.appendChild(S("text",{x:px(tr)-8,y:yp-10,"text-anchor":"end","class":"s-nom",
        fill:V("eau")},"point de rosée"));
    }

    /* les quatre evolutions elementaires */
    if(P.evo){
      function fle(t2,r2,coul,nom,dy,cote){
        var x2=px(t2),y2=py(r2);
        var a=Math.atan2(y2-yp,x2-xp);
        svg.appendChild(S("line",{x1:xp,y1:yp,x2:x2-8*Math.cos(a),y2:y2-8*Math.sin(a),
          stroke:V(coul),"stroke-width":"2.5"}));
        svg.appendChild(S("path",{d:"M"+x2+","+y2+
          "L"+(x2-10*Math.cos(a-0.4))+","+(y2-10*Math.sin(a-0.4))+
          "L"+(x2-10*Math.cos(a+0.4))+","+(y2-10*Math.sin(a+0.4))+"Z",fill:V(coul)}));
        svg.appendChild(S("text",{x:x2+(cote?11:0),y:y2+(cote?4:dy),
          "text-anchor":cote?"start":"middle","class":"s-nom",fill:V(coul)},nom));
      }
      fle(Math.min(P.t+9,TMAX-1),rp,"chaud","chauffage sec",-10);
      fle(Math.max(P.t-8,tr,TMIN+1),rp,"froid","refroidissement",20);
      var rv=Math.min(rp+4.5,rDe(P.t,100));
      fle(P.t,rv,"eau","vapeur",0,true);
      var ra=rp+4.5, ta=tDeH(enth(P.t,rp),ra);
      fle(ta,ra,"vert","adiabatique",-10);
    }

    svg.appendChild(S("circle",{cx:xp,cy:yp,r:"7",fill:V("encre")}));
    svg.appendChild(S("rect",{x:X0,y:Y0,width:X1-X0,height:Y1-Y0,fill:"none",
      stroke:V("trait"),"stroke-width":"1.5"}));

    /* la lecture, en clair */
    var h=enth(P.t,rp), tw=bulbeH(P.t,rp);
    lect.innerHTML="<div class='gros'>"+
      "<span><b>Humidité absolue</b><span>"+frs(rp,2)+" g/kg</span></span>"+
      "<span><b>Point de rosée</b><span>"+frs(tr,1)+" °C</span></span>"+
      "<span><b>Bulbe humide</b><span>"+frs(tw,1)+" °C</span></span>"+
      "<span><b>Enthalpie</b><span>"+frs(h,1)+" kJ/kg</span></span>"+
      "<span><b>Volume spéc.</b><span>"+frs(volSpec(P.t,rp),3)+" m³/kg</span></span>"+
      "</div><p>Une paroi dont la surface intérieure descend sous <b>"+frs(tr,1)+
      " °C</b> se couvre de buée. C'est la seule chose que le point de rosée dit — "+
      "et c'est celle que l'épreuve demande.</p>";
  }
  dessine();
};


/* --------- dispersion : deux series de meme moyenne ---------
   Ajoute le 3 septembre 2026 pour la sequence 1 de maths-PC. Aucun schema du
   kit ne montrait une dispersion, et c'est tout le propos de la sequence :
   deux installations de meme moyenne, l'une reglee, l'autre qui oscille. */
SCHEMAS["dispersion"]=function(el){
  var W=720,H=340,X0=96,X1=664,TMIN=43,TMAX=47,CONS=45,TOL=0.5;
  var A=[44.8,45.2,44.9,45.1,45.0,44.9,45.1,45.0];
  var B=[43.5,46.4,44.2,45.8,45.0,44.1,46.2,44.8];
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Deux regulations de meme moyenne, de dispersions tres differentes"});
  function px(t){return X0+(X1-X0)*(t-TMIN)/(TMAX-TMIN);}

  [{n:"RÉGULATION A",s:A,y:118,c:"froid",
    m:"écart-type 0,13 °C · 0 relevé hors tolérance"},
   {n:"RÉGULATION B",s:B,y:262,c:"chaud",
    m:"écart-type 1,05 °C · 6 relevés sur 8 hors tolérance"}
  ].forEach(function(r){
    svg.appendChild(S("rect",{x:px(CONS-TOL),y:r.y-58,width:px(CONS+TOL)-px(CONS-TOL),
      height:70,fill:V("trait"),opacity:"0.13"}));
    svg.appendChild(S("line",{x1:px(CONS),y1:r.y-64,x2:px(CONS),y2:r.y+6,
      stroke:V("trait"),"stroke-width":"1.5","stroke-dasharray":"5 4"}));
    svg.appendChild(S("line",{x1:X0,y1:r.y,x2:X1,y2:r.y,stroke:V("trait"),
      "stroke-width":"1.5"}));
    for(var t=TMIN;t<=TMAX+1e-9;t++){
      svg.appendChild(S("line",{x1:px(t),y1:r.y-5,x2:px(t),y2:r.y+5,
        stroke:V("trait"),"stroke-width":"1.5"}));
      svg.appendChild(S("text",{x:px(t),y:r.y+22,"text-anchor":"middle",
        "class":"s-pet"},t+" °C"));
    }
    var vus={};
    r.s.forEach(function(v){
      var k=v.toFixed(2),n=vus[k]||0;vus[k]=n+1;
      svg.appendChild(S("circle",{cx:px(v),cy:r.y-9-16*n,r:6,fill:V(r.c)}));
    });
    svg.appendChild(S("text",{x:X0,y:r.y-70,"class":"s-tit",fill:V(r.c)},r.n));
    svg.appendChild(S("text",{x:X1,y:r.y-70,"text-anchor":"end","class":"s-nom"},r.m));
  });
  svg.appendChild(S("text",{x:px(CONS),y:326,"text-anchor":"middle","class":"s-pet"},
    "consigne 45 °C · tolérance CCTP ± 0,5 °C · les deux séries ont pour moyenne 45,00 °C"));
  el.appendChild(svg);
};

/* ═══════════════════════════════════════════════════ OUTILS */
var OUTILS={};

/* ─────────── 1. convertisseur d'unités ─────────── */
OUTILS.unites={
  titre:"Convertisseur d'unités",
  intro:"Les quatre familles du rituel. Entrez une valeur : les équivalences suivent.",
  monte:function(d){
    var FAM=[
      {n:"Débit",u:[["m³/h",1],["L/h",1000],["L/s",1/3.6],["m³/s",1/3600]],v:2},
      {n:"Puissance",u:[["W",1],["kW",0.001],["MW",1e-6]],v:1500},
      {n:"Énergie",u:[["kWh",1],["Wh",1000],["MJ",3.6],["kJ",3600]],v:1},
      {n:"Pression",u:[["bar",1],["Pa",100000],["kPa",100],["mCE",10.2]],v:1.5}
    ];
    FAM.forEach(function(f,i){
      var bloc=E("div",{style:"margin-bottom:14px"});
      bloc.appendChild(E("div",{"class":"chapeau",
        style:"font-family:'Bricolage Grotesque',sans-serif;font-size:11px;font-weight:700;"+
              "letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);margin-bottom:6px"},f.n));
      var ligne=E("div",{style:"display:flex;flex-wrap:wrap;gap:8px;align-items:center"});
      var champs=[];
      f.u.forEach(function(u,j){
        var w=E("label",{style:"display:flex;align-items:center;gap:5px;font-size:14px"});
        var inp=E("input",{type:"number",step:"any",value:frs(f.v*u[1],3)});
        inp.style.width="92px";
        inp.addEventListener("input",function(){
          var v=parseFloat(this.value.replace(",","."));
          if(!isFinite(v))return;
          var base=v/u[1];
          champs.forEach(function(c,k){
            if(k!==j)c.value=frs(base*f.u[k][1],3);});
        });
        champs.push(inp);
        w.appendChild(inp);w.appendChild(E("span",{"class":"mono",
          style:"color:var(--encre2);font-size:13px"},u[0]));
        ligne.appendChild(w);
      });
      bloc.appendChild(ligne);
      d.appendChild(bloc);
    });
    d.appendChild(E("p",{style:"font-size:14.5px;color:var(--encre2);margin:4px 0 0"},
      "Rappel qui ne se convertit pas : un <b>écart</b> en degrés Celsius vaut le même "+
      "écart en kelvins. De 70 à 50 °C, c'est 20 °C et c'est 20 K."));
  }
};

/* ─────────── le diviseur de tension et la resistance de LED ───────────
   Premier outil ecrit pour une classe de bac pro CIEL. Il ne remplace aucun
   calcul : il permet d'en essayer dix en dix secondes, ce qu'une feuille ne
   permet pas — et de VOIR que la tension se partage proportionnellement aux
   resistances, au lieu de le lire. */
OUTILS.diviseur={
  titre:"Diviseur de tension, et résistance de LED",
  intro:"Deux dipôles en série sous une même alimentation. Bougez les valeurs : "+
        "la tension se partage, et le courant est le même partout.",
  monte:function(d){
    var P={E:5,R1:150,R2:100,mode:"deux"};

    var seg=E("div",{"class":"segments",role:"group"});
    [["deux","Deux résistances"],["led","Une LED et sa résistance"]].forEach(function(m){
      var b=E("button",{type:"button","class":"seg"+(P.mode===m[0]?" on":""),},m[1]);
      b.addEventListener("click",function(){
        P.mode=m[0];
        [].forEach.call(seg.children,function(x){x.className="seg";});
        this.className="seg on";calcule();});
      seg.appendChild(b);
    });
    d.appendChild(seg);

    var ch={};
    function champ(cle,nom,unite,pas){
      var w=E("label",{style:"display:flex;align-items:center;gap:6px;font-size:14.5px;"+
        "margin:9px 0"});
      w.appendChild(E("span",{style:"min-width:150px"},nom));
      var i=E("input",{type:"number",step:pas,value:String(P[cle])});
      i.style.width="96px";
      i.addEventListener("input",function(){
        var v=parseFloat(this.value.replace(",","."));
        if(isFinite(v))
          {P[cle]=v;calcule();}
      });
      w.appendChild(i);
      w.appendChild(E("span",{"class":"mono",style:"color:var(--encre2);font-size:13px"},unite));
      ch[cle]=w;d.appendChild(w);
    }
    champ("E","Tension d'alimentation","V","any");
    champ("R1","Résistance R1 (série)","Ω","any");
    champ("R2","Résistance R2","Ω","any");

    var res=E("div",{"class":"res",style:"margin-top:12px"});
    d.appendChild(res);

    function calcule(){
      var E0=P.E,R1=P.R1,R2=P.R2,html="";
      ch.R2.style.display=(P.mode==="led")?"none":"flex";
      if(P.mode==="deux"){
        if(R1+R2<=0){res.innerHTML="Entrez des résistances positives.";return;}
        var I=E0/(R1+R2), U1=I*R1, U2=I*R2;
        html="<b>I = "+frs(I*1000,2)+" mA</b> — le même dans les deux, ils sont en série."+
          "<br><b>U1 = "+frs(U1,2)+" V</b> et <b>U2 = "+frs(U2,2)+" V</b>"+
          "<br>Contrôle : U1 + U2 = "+frs(U1+U2,2)+" V, soit la tension d'alimentation."+
          "<br>La tension se partage <b>proportionnellement aux résistances</b> : "+
          "R1 vaut "+frs(100*R1/(R1+R2),0)+" % du total, et prend "+
          frs(100*U1/E0,0)+" % de la tension.";
      }else{
        /* une LED : 2 V a ses bornes, on cherche ce que doit prendre la resistance */
        var Uled=2, Iv=(E0-Uled)/R1;
        if(R1<=0){res.innerHTML="Entrez une résistance positive.";return;}
        html="Une LED témoin garde <b>2 V</b> à ses bornes quoi qu'il arrive.<br>"+
          "La résistance encaisse donc <b>"+frs(E0-Uled,2)+" V</b>, et le courant vaut "+
          "<b>"+frs(Iv*1000,1)+" mA</b>.";
        if(Iv*1000>20) html+="<br><b>Au-delà des 20 mA admis</b> : la LED grille. "+
          "Il faut une résistance plus grande.";
        else if(Iv*1000<5) html+="<br>Moins de 5 mA : la LED s'allumera faiblement.";
        else html+="<br>Entre 5 et 20 mA : la LED est correctement alimentée.";
        html+="<br>Sans résistance du tout, plus rien ne limite le courant — "+
          "c'est ce qui la détruit.";
      }
      res.innerHTML=html;
    }
    calcule();
  }
};

/* ─────────── 2. puissance transportée ─────────── */
OUTILS.reseau={
  titre:"Ce qu'un réseau transporte",
  intro:"P = Q × 1 163 × ΔT pour l'eau, P = Q × 0,34 × ΔT pour l'air. "+
        "Les deux constantes sont ρ·Cp/3600 : le même calcul, deux fluides.",
  monte:function(d){
    var g=E("div",{"class":"g2"});
    var col1=E("div"),col2=E("div");
    var st={mode:"P",Q:2,dt:20,P:20};
    function champ(par,id,lab,min,max,pas,dec,unite,cle){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");
      c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:st[cle]});
      i.addEventListener("input",function(){st[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      return function(){v.textContent=frs(st[cle],dec)+" "+unite;};
    }
    var seg=E("div",{style:"display:flex;gap:0;margin-bottom:12px"});
    ["P","Q"].forEach(function(m){
      var b=E("button",{"class":"bt"+(m===st.mode?" p":""),type:"button"},
        m==="P"?"Je cherche la puissance":"Je cherche le débit");
      b.style.borderRadius=m==="P"?"4px 0 0 4px":"0 4px 4px 0";
      b.addEventListener("click",function(){
        st.mode=m;
        [].forEach.call(seg.children,function(o,k){
          o.className="bt"+((k===0?"P":"Q")===m?" p":"");});
        maj();calc();});
      seg.appendChild(b);
    });
    col1.appendChild(seg);
    var mQ=champ(col1,"q","Débit d'eau",0.1,20,0.1,1,"m³/h","Q");
    var mP=champ(col1,"p","Puissance à transporter",1,200,1,0,"kW","P");
    var mT=champ(col1,"t","Écart départ / retour",2,40,1,0,"K","dt");
    var res=E("div",{"class":"res"});col2.appendChild(res);
    var note=E("p",{style:"font-size:14.5px;color:var(--encre2);margin-top:12px"},"");
    col2.appendChild(note);
    function maj(){
      col1.children[1].style.display=st.mode==="P"?"":"none";
      col1.children[2].style.display=st.mode==="Q"?"":"none";
    }
    function calc(){
      mQ();mP();mT();
      var h="";
      if(st.mode==="P"){
        var pe=st.Q*1163*st.dt/1000, pa=st.Q*0.34*st.dt/1000;
        h="<div class='gros'><span><b>Avec de l'eau</b><span>"+frs(pe,1)+" kW</span></span>"+
          "<span><b>Avec de l'air</b><span>"+frs(pa,2)+" kW</span></span></div>";
        note.innerHTML="Le même débit de "+frs(st.Q,1)+" m³/h transporte <b>"+
          fr(pe/pa,0)+" fois</b> plus de puissance en eau qu'en air.";
      }else{
        var qe=st.P*1000/(1163*st.dt), qa=st.P*1000/(0.34*st.dt);
        h="<div class='gros'><span><b>Débit d'eau</b><span>"+frs(qe,2)+" m³/h</span></span>"+
          "<span><b>Débit d'air</b><span>"+fr(qa,0)+" m³/h</span></span></div>";
        note.innerHTML="Pour "+frs(st.P,0)+" kW sous "+frs(st.dt,0)+" K : <b>"+
          fr(qe*1000,0)+" litres d'eau</b> par heure, ou <b>"+fr(qa,0)+" m³ d'air</b>. "+
          "C'est pour ça qu'on chauffe à l'eau et qu'on ventile à l'air.";
      }
      res.innerHTML=h;
    }
    g.appendChild(col1);g.appendChild(col2);d.appendChild(g);
    maj();calc();
  }
};

/* ─────────── 3. composeur de paroi ─────────── */
var MAT=[
 ["Enduit ciment",1.15],["Enduit plâtre",0.25],["Plaque de plâtre BA13",0.25],
 ["Béton",1.65],["Béton armé",2.50],["Parpaing creux",1.05],["Brique creuse",0.45],
 ["Brique pleine",0.85],["Pierre calcaire",1.40],["Bois massif",0.15],
 ["Laine minérale",0.038],["Laine de bois",0.040],["Ouate de cellulose",0.039],
 ["Polystyrène expansé",0.035],["Polystyrène extrudé",0.030],["Polyuréthane",0.025],
 ["Verre",1.00],["Acier",50],["Lame d'air non ventilée",null]
];
OUTILS.paroi={
  titre:"Composeur de paroi",
  intro:"Empilez les couches de l'intérieur vers l'extérieur, comme sur votre relevé — "+
        "la première ligne est celle qu'on touche depuis la pièce. Au départ, un mur "+
        "courant en isolation par l'intérieur ; ce n'est pas celui de l'activité.",
  monte:function(d){
    /* interieur -> exterieur : BA13, isolant, parpaing, enduit */
    var C=[[2,1.3],[13,10],[5,20],[0,1.5]], RSI=0.13, RSE=0.04, cible=0.25;
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    var ent=E("div",{"class":"entete-c"},
      "<span>Couche</span><span>Conductivité</span><span>Épaisseur cm</span><span></span>");
    var liste=E("div");
    var ajout=E("div",{style:"display:flex;gap:8px;margin-top:11px;flex-wrap:wrap"});
    var sel=E("select",{},MAT.map(function(m,i){
      return '<option value="'+i+'">'+m[0]+(m[1]===null?"":"  λ = "+frs(m[1],m[1]<0.1?3:2))+
             '</option>';}).join(""));
    sel.value="10";
    var bt=E("button",{"class":"bt p",type:"button"},"Ajouter la couche");
    bt.addEventListener("click",function(){C.push([+sel.value,8]);dessine();calc();});
    ajout.appendChild(sel);ajout.appendChild(bt);
    var chc=E("div",{"class":"champ",style:"margin-top:13px"});
    chc.appendChild(E("label",{},"U visé par la réglementation"));
    var vc=E("span",{"class":"v"},"0,25 W/(m²·K)");chc.appendChild(vc);
    var ic=E("input",{type:"range",min:"0.10",max:"0.60",step:"0.01",value:"0.25"});
    ic.addEventListener("input",function(){cible=+this.value;
      vc.textContent=frs(cible,2)+" W/(m²·K)";calc();});
    chc.appendChild(ic);
    c1.appendChild(ent);c1.appendChild(liste);c1.appendChild(ajout);c1.appendChild(chc);
    var res=E("div",{"class":"res"}),barres=E("div",{"class":"barres"});
    c2.appendChild(res);c2.appendChild(barres);
    c2.appendChild(E("p",{style:"font-size:14.5px;color:var(--encre2);margin-top:12px"},
      "Chaque barre est la part de la couche dans la résistance totale. Dans une paroi "+
      "isolée, une seule couche fait presque tout le travail."));

    function rLame(e){return e<0.7?0.11:e<1.8?0.15:0.18;}
    function rC(c){var m=MAT[c[0]];return m[1]===null?rLame(c[1]):(c[1]/100)/m[1];}
    function dessine(){
      liste.innerHTML=C.map(function(c,i){
        var m=MAT[c[0]];
        return '<div class="lignec"><select data-i="'+i+'">'+MAT.map(function(mm,j){
          return '<option value="'+j+'"'+(j===c[0]?" selected":"")+'>'+mm[0]+'</option>';
        }).join("")+'</select><span class="rr">λ '+
        (m[1]===null?"lame d’air":frs(m[1],m[1]<0.1?3:2))+'</span>'+
        '<input type="number" data-i="'+i+'" min="0.2" max="80" step="0.5" value="'+c[1]+'">'+
        '<button class="xx" data-i="'+i+'" aria-label="Retirer">×</button></div>';
      }).join("");
      [].forEach.call(liste.querySelectorAll("select"),function(s){
        s.addEventListener("change",function(){
          C[+this.getAttribute("data-i")][0]=+this.value;dessine();calc();});});
      [].forEach.call(liste.querySelectorAll("input"),function(s){
        s.addEventListener("input",function(){
          var v=parseFloat(this.value);
          if(isFinite(v)&&v>0){C[+this.getAttribute("data-i")][1]=v;calc();}});});
      [].forEach.call(liste.querySelectorAll(".xx"),function(b){
        b.addEventListener("click",function(){
          if(C.length<=1)return;
          C.splice(+this.getAttribute("data-i"),1);dessine();calc();});});
    }
    function calc(){
      var rs=C.map(rC), rt=RSI+RSE+rs.reduce(function(a,b){return a+b;},0), u=1/rt;
      ETAT.u_mur=u;
      ETAT.couches=C.map(function(c,i){
        return {nom:MAT[c[0]][0],lam:MAT[c[0]][1],e:c[1],R:rs[i]};});
      SCHEMA_MAJ.forEach(function(f){f();});
      var manque=1/cible-rt;
      res.innerHTML="<div class='gros'><span><b>R total</b><span>"+frs(rt,2)+
        " m²·K/W</span></span><span><b>U</b><span>"+frs(u,3)+"</span></span></div>"+
        "<p>"+(u<=cible?"Cette paroi tient l'objectif de "+frs(cible,2)+"."
        :"Il manque <b>"+frs(manque,2)+" m²·K/W</b> — soit <b>"+fr(manque*0.038*100,0)+
         " cm</b> de laine minérale à ajouter.")+"</p>";
      var L=[["Superficielle intérieure",RSI,"var(--chaud)"]]
        .concat(C.map(function(c,i){
          return [MAT[c[0]][0]+" · "+frs(c[1],1)+" cm",rs[i],
            MAT[c[0]][1]!==null&&MAT[c[0]][1]<0.06?"var(--vert)":"var(--froid)"];}))
        .concat([["Superficielle extérieure",RSE,"var(--froid)"]]);
      var mx=Math.max.apply(null,L.map(function(x){return x[1];}));
      barres.innerHTML=L.map(function(x){
        return '<div class="barre"><span class="l">'+x[0]+'</span><span class="b" style="width:'+
          (100*x[1]/mx)+'%;background:'+x[2]+'"></span><span class="p">'+frs(x[1],2)+
          ' · '+fr(100*x[1]/rt,0)+' %</span></div>';}).join("");
      suivant("bilan");
    }
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    dessine();calc();
  }
};

/* ─────────── 4. bilan de déperditions ─────────── */
OUTILS.bilan={
  titre:"Bilan de déperditions",
  intro:"Un bâtiment de plain-pied. Entrez le relevé de votre local : le classement des "+
        "postes se refait à chaque changement.",
  chaine:"le U des murs vient du composeur de paroi",
  monte:function(d){
    var P={L:12,l:7,h:2.7,ti:19,te:-7,tu:8,ren:0.5,sf:14,uf:1.3,ut:0.20,up:0.30,
           psi:0.45,psim:0.10};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=frs(P[cle],dec).replace("-","−")+unite;});
    }
    ch(c1,"Longueur","L",4,40,0.5,1," m");
    ch(c1,"Largeur","l",3,25,0.5,1," m");
    ch(c1,"Hauteur sous plafond","h",2.2,6,0.1,1," m");
    ch(c1,"Température intérieure","ti",15,24,0.5,1," °C");
    ch(c1,"Extérieure de base","te",-15,5,0.5,1," °C");
    ch(c1,"Local sous le plancher","tu",-15,19,0.5,1," °C");
    ch(c1,"Renouvellement d'air","ren",0,2,0.05,2," vol/h");
    ch(c2,"Surface de fenêtres","sf",0,60,1,0," m²");
    ch(c2,"U des fenêtres","uf",0.7,5,0.05,2,"");
    ch(c2,"U de la toiture","ut",0.08,2.5,0.01,2,"");
    ch(c2,"U du plancher","up",0.08,2.5,0.01,2,"");
    ch(c2,"Ψ plancher / façade","psi",0,1.2,0.01,2,"");
    ch(c2,"Ψ des menuiseries (30 m)","psim",0,0.4,0.01,2,"");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var res=E("div",{"class":"res",style:"margin-top:18px"});
    var barres=E("div",{"class":"barres",style:"margin-top:14px"});
    d.appendChild(res);d.appendChild(barres);
    function calc(){
      maj.forEach(function(f){f();});
      var sol=P.L*P.l, per=2*(P.L+P.l), vol=sol*P.h;
      var smur=Math.max(0,per*P.h-P.sf), dte=P.ti-P.te, dtu=P.ti-P.tu;
      var q=vol*P.ren;
      var A=[["Murs",ETAT.u_mur*smur*dte],["Fenêtres",P.uf*P.sf*dte],
             ["Toiture",P.ut*sol*dte],["Plancher",P.up*sol*dtu],
             ["Pont thermique plancher",P.psi*per*dte],
             ["Ponts de menuiseries",P.psim*30*dte],["Air neuf",0.34*q*dte]];
      var tot=A.reduce(function(a,b){return a+b[1];},0);
      ETAT.phi=tot;ETAT.surface=sol;ETAT.gv=dte>0?tot/dte:0;
      ETAT.postes=A;
      SCHEMA_MAJ.forEach(function(f){f();});
      var r=tot/sol;
      res.innerHTML="<div class='gros'>"+
        "<span><b>Déperditions</b><span>"+fr(tot,0)+" W</span></span>"+
        "<span><b>À installer × 1,15</b><span>"+fr(tot*1.15,0)+" W</span></span>"+
        "<span><b>Ratio</b><span>"+frs(r,1)+" W/m²</span></span>"+
        "<span><b>GV</b><span>"+frs(ETAT.gv,1)+" W/K</span></span></div>"+
        "<p>Sol "+frs(sol,0)+" m², périmètre "+frs(per,0)+" m, murs "+frs(smur,0)+
        " m², air neuf "+fr(q,0)+" m³/h. "+
        (r>80?"<b>Au-delà de 80 W/m² : bâtiment ancien non isolé.</b>"
         :r>40?"Entre 40 et 80 W/m² : isolation partielle."
         :"<b>Sous 40 W/m² : niveau d'une construction récente.</b>")+"</p>";
      var s=A.slice().sort(function(a,b){return b[1]-a[1];}), mx=s[0][1]||1;
      barres.innerHTML=s.map(function(p){
        return '<div class="barre"><span class="l">'+p[0]+'</span><span class="b" style="width:'+
          (100*p[1]/mx)+'%"></span><span class="p">'+fr(p[1],0)+' W · '+
          fr(100*p[1]/tot,0)+' %</span></div>';}).join("");
      suivant("energie");
    }
    OUTILS.bilan._recalc=calc;
    calc();

  }
};

/* ─────────── 5. besoin annuel et temps de retour ─────────── */
OUTILS.energie={
  titre:"Besoin annuel et temps de retour",
  intro:"Le besoin de la saison, la facture, et ce que rapporte un scénario de travaux.",
  chaine:"le GV vient du bilan de déperditions",
  monte:function(d){
    var P={ville:0,ap:25,prix:0.25,trav:3000,gain:15};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    var cv=E("div",{"class":"champ"});
    cv.appendChild(E("label",{},"Ville"));
    var vv=E("span",{"class":"v"},"");cv.appendChild(vv);
    var sv=E("select",{},VILLES.map(function(v,i){
      return '<option value="'+i+'">'+v[0]+" — "+v[1]+" DJU</option>";}).join(""));
    sv.addEventListener("change",function(){P.ville=+this.value;calc();});
    cv.appendChild(sv);c1.appendChild(cv);
    maj.push(function(){vv.textContent=VILLES[P.ville][1]+" DJU";});
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=(dec===0?fr(P[cle],0):frs(P[cle],dec))+unite;});
    }
    ch(c1,"Apports gratuits","ap",0,45,1,0," %");
    ch(c1,"Prix du kWh","prix",0.03,0.40,0.005,3," €");
    ch(c2,"Coût des travaux envisagés","trav",500,30000,100,0," €");
    ch(c2,"Gain sur les déperditions","gain",1,60,1,0," %");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var r1=E("div",{"class":"res",style:"margin-top:16px"});
    var r2=E("div",{"class":"res",style:"margin-top:11px"});
    d.appendChild(r1);d.appendChild(r2);
    function calc(){
      maj.forEach(function(f){f();});
      ETAT.ville=P.ville;
      SCHEMA_MAJ.forEach(function(f){f();});
      var dju=VILLES[P.ville][1];
      var brut=ETAT.gv*dju*24/1000, net=brut*(1-P.ap/100);
      var ratio=ETAT.surface>0?net/ETAT.surface:0, fact=net*P.prix;
      var cl=ratio<50?["A ou B","var(--vert)"]:ratio<90?["C","var(--vert)"]:
             ratio<150?["D","var(--tiede)"]:ratio<230?["E","var(--tiede)"]:
             ratio<330?["F","var(--chaud)"]:["G","var(--chaud)"];
      r1.innerHTML="<div class='gros'><span><b>Besoin net</b><span>"+fr(net,0)+
        " kWh</span></span><span><b>Ratio</b><span>"+fr(ratio,0)+
        " kWh/(m²·an)</span></span><span><b>Facture</b><span>"+fr(fact,0)+
        " €</span></span></div><p>Besoin brut "+fr(brut,0)+" kWh, dont "+P.ap+
        " % d'apports gratuits. Classe <b style='color:"+cl[1]+"'>"+cl[0]+
        "</b> — <em>en énergie utile</em>, ce qui n'est pas l'échelle du DPE.</p>";
      var eco=net*(P.gain/100)*P.prix, tr=eco>0?P.trav/eco:Infinity;
      r2.innerHTML="<div class='gros'><span><b>Économie annuelle</b><span>"+fr(eco,0)+
        " €/an</span></span><span><b>Temps de retour</b><span>"+
        (isFinite(tr)?frs(tr,1)+" ans":"—")+"</span></span></div><p>"+
        (!isFinite(tr)?"Aucune économie."
         :tr<8?"<b>Moins de huit ans</b> : un maître d'ouvrage engage sans hésiter."
         :tr<20?"Entre huit et vingt ans : la décision dépend du prix de l'énergie retenu."
         :"<b>Plus de vingt ans</b> : indéfendable sur le seul argument financier. "+
          "Il faut un autre motif — confort, obligation, valeur du bien.")+"</p>";
    }
    OUTILS.energie._recalc=calc;
    calc();
  }
};


/* ─────────── lire une unite ─────────── */
var UNITES=[
 {k:"W",u:"W",n:"Le watt — une puissance",
  lit:"watt",
  m:"Ce que la machine fait <b>à chaque instant</b>. Elle ne s'accumule pas : "+
    "à l'arrêt, elle vaut zéro.",
  f:"Un radiateur <b>appelle</b> 1 500 W. Il ne « consomme » pas 1 500 W.",
  o:"radiateur 1 à 2 kW · chaudière de maison 20 à 25 kW"},
 {k:"kWh",u:"kWh",n:"Le kilowattheure — une énergie",
  lit:"kilowatt-heure",
  m:"Une puissance <b>multipliée par une durée</b>. C'est ce qui est facturé.",
  f:"L'unité contient sa formule : kW × h, donc <b>E = P × t</b>.",
  o:"1 kWh = 3 600 kJ · un radiateur de 1 kW pendant 1 h"},
 {k:"K",u:"K",n:"Le kelvin — un écart de température",
  lit:"kelvin",
  m:"Un <b>écart</b>, jamais une température absolue dans nos formules.",
  f:"Un écart de 20 °C vaut 20 K. <b>On n'ajoute pas 273.</b>",
  o:"régime 70/50 → 20 K · plancher chauffant 45/35 → 10 K"},
 {k:"m3h",u:"m³/h",n:"Le mètre cube par heure — un débit",
  lit:"mètre cube par heure",
  m:"Un <b>volume par unité de temps</b>. Le « par heure » est ce qui piège : "+
    "les fiches constructeur donnent souvent des L/s.",
  f:"1 L/s = 3,6 m³/h. 1 m³/h = 1 000 L/h.",
  o:"air neuf 25 à 30 m³/h par personne · réseau d'immeuble 2 m³/h"},
 {k:"lambda",u:"W/(m·K)",p:"W/(m·K)  λ",n:"λ — la conductivité du matériau",
  lit:"watts par mètre et par kelvin",
  m:"Ce qui traverse <b>un mètre d'épaisseur</b> du matériau, par kelvin d'écart. "+
    "Propriété du matériau seul.",
  f:"On la <b>divise</b> par une longueur, on ne la multiplie pas : <b>R = e / λ</b>.",
  o:"isolant < 0,05 · béton 1,65 · acier 50"},
 {k:"R",u:"m²·K/W",n:"R — la résistance thermique",
  lit:"mètres carrés-kelvin par watt",
  m:"L'inverse d'un flux : combien de <b>kelvins d'écart</b> il faut pour faire "+
    "passer un watt par mètre carré.",
  f:"C'est l'unité de U retournée. <b>U = 1 / R</b>.",
  o:"10 cm de laine 2,6 · Rsi 0,13 · Rse 0,04"},
 {k:"U",u:"W/(m²·K)",n:"U — le coefficient de transmission",
  lit:"watts par mètre carré et par kelvin",
  m:"Ce qui traverse <b>un mètre carré de paroi complète</b> pour un kelvin d'écart. "+
    "Il englobe déjà la conduction, la convection et le rayonnement.",
  f:"Il manque des m² et des K : <b>Φ = U × S × ΔT</b>.",
  o:"mur neuf 0,20 · double vitrage 1,4 · mur non isolé 2,5"},
 {k:"psi",u:"W/(m·K)",p:"W/(m·K)  Ψ",n:"Ψ — le coefficient linéique d'un pont thermique",
  lit:"watts par mètre et par kelvin",
  m:"Ce qui fuit par <b>un mètre de liaison</b>, par kelvin d'écart. Une liaison "+
    "est une ligne, pas une surface.",
  f:"Il manque des <b>mètres</b> et des K : <b>Φ = Ψ × L × ΔT</b>. "+
    "<b>Même unité que λ, rôle opposé</b> : λ se divise, Ψ se multiplie.",
  o:"ITE 0,05 à 0,15 · ITI plancher traversant 0,60 à 0,90"},
 {k:"GV",u:"W/K",n:"GV — la signature du bâtiment",
  lit:"watts par kelvin",
  m:"Ce que le bâtiment perd <b>par kelvin d'écart</b>, tous postes confondus. "+
    "Il ne dépend pas de la météo.",
  f:"Il manque des K : <b>Φ = GV × ΔT</b>, donc <b>GV = Φ / ΔT</b>.",
  o:"petit bureau 130 W/K · maison rénovée 80 à 150 W/K"},
 {k:"DJU",u:"DJU",n:"Le degré-jour unifié",
  lit:"degré-jour unifié",
  m:"La somme, sur toute la saison, des <b>degrés manquants sous 18 °C</b>. "+
    "Un jour à 13 °C de moyenne apporte 5 DJU.",
  f:"Des kelvins × des jours. Avec le GV : <b>besoin = GV × DJU × 24 / 1 000</b>.",
  o:"Nice 1 100 · Paris 2 300 · Strasbourg 2 700"},
 {k:"ratio",u:"kWh/(m²·an)",n:"Le ratio de consommation",
  lit:"kilowattheures par mètre carré et par an",
  m:"L'énergie d'une année ramenée au <b>mètre carré chauffé</b>. C'est ce qui "+
    "permet de comparer deux bâtiments de tailles différentes.",
  f:"Précisez toujours <b>lequel</b> : utile, final ou primaire. Les trois "+
    "peuvent varier du simple au triple.",
  o:"passif 15 · EnerPHit 25 · bâtiment 1970 non rénové 200 et plus"}
];
OUTILS["lire-unite"]={
  titre:"Lire une unité",
  intro:"Une unité contient sa formule. Chaque « par » dit ce qu'il faut "+
        "remultiplier pour revenir à des watts. Cliquez-en une.",
  monte:function(d,el){
    var filtre=el&&el.getAttribute("data-filtre");
    var L=filtre?UNITES.filter(function(x){
      return filtre.split(",").indexOf(x.k)>=0;}):UNITES;
    var chips=E("div",{style:"display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px"});
    var carte=E("div",{"class":"res"});
    d.appendChild(chips);d.appendChild(carte);
    function montre(i){
      [].forEach.call(chips.children,function(b,k){
        b.className="bt"+(k===i?" p":"");});
      var x=L[i];
      carte.innerHTML=
        "<div style='font-family:\"IBM Plex Mono\",monospace;font-size:23px;"+
        "font-weight:600;margin-bottom:2px'>"+x.u+"</div>"+
        "<div class='gro' style='font-weight:600;font-size:16.5px;margin-bottom:10px'>"+
        x.n+"</div>"+
        "<p><b>Se lit</b> « "+x.lit+" »</p>"+
        "<p><b>Mesure</b> "+x.m+"</p>"+
        "<p><b>La formule qu'elle contient</b> "+x.f+"</p>"+
        "<p><b>Ordres de grandeur</b> "+x.o+"</p>";
      [].forEach.call(carte.querySelectorAll("p b:first-child"),function(b){
        b.style.cssText="font-family:'Bricolage Grotesque',sans-serif;font-size:10.5px;"+
          "letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);"+
          "display:block;margin-bottom:1px";
      });
    }
    L.forEach(function(x,i){
      var b=E("button",{"class":"bt",type:"button"},x.p||x.u);
      b.style.fontFamily='"IBM Plex Mono",monospace';
      b.addEventListener("click",function(){montre(i);});
      chips.appendChild(b);
    });
    montre(0);
  }
};


/* ═══════════════════════════════════════════════════ HYDRAULIQUE
   Eau a 60 degres : masse volumique 983 kg/m3, viscosite 0,474e-6 m2/s.
   Blasius vaut pour un tube lisse — cuivre, PER, multicouche — et pour un
   Reynolds compris entre 4 000 et 100 000, ce qui couvre tout le chauffage. */
var RHO_EAU=983, NU_EAU=0.474e-6;
var TUBES=[["14 × 1",12],["16 × 1",14],["18 × 1",16],["20 × 1",18],
           ["22 × 1",20],["26 × 1",24],["28 × 1,5",25]];
function debit(pkW,dt){return pkW*1000/(1163*dt);}          /* m3/h */
function vitesse(Q,dmm){                                     /* m/s */
  var S=Math.PI*Math.pow(dmm/1000,2)/4;
  return (Q/3600)/S;
}
function lineique(Q,dmm){                                    /* Pa/m */
  var d=dmm/1000, v=vitesse(Q,dmm);
  if(v<=0)return 0;
  var Re=v*d/NU_EAU;
  var lam=Re<2000?64/Math.max(Re,1):0.3164/Math.pow(Re,0.25);
  return lam*RHO_EAU*v*v/(2*d);
}
var SINGU=[["Coude à 90°",0.065],["Té de passage",0.035],["Vanne d'arrêt",0.020],
           ["Robinet thermostatique",0.250],["Radiateur",0.125]];
/* longueur equivalente = coefficient x diametre interieur en mm, formule
   d'atelier qui redonne les valeurs du tableau de la seance 8 */

/* ─────────── 1. pertes de charge ─────────── */
OUTILS.pertes={
  titre:"Pertes de charge d'un circuit",
  intro:"Le débit vient de la puissance, la vitesse du diamètre, la perte "+
        "linéique du frottement. Les singularités se convertissent en mètres "+
        "de tube droit.",
  monte:function(d){
    var P={p:12,dt:20,tube:4,L:24,n:[6,4,2,4,4]};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=frs(P[cle],dec)+unite;});
    }
    ch(c1,"Puissance des émetteurs","p",1,40,0.5,1," kW");
    ch(c1,"Écart départ / retour","dt",5,30,1,0," K");
    var ct=E("div",{"class":"champ"});
    ct.appendChild(E("label",{},"Tube cuivre"));
    var vt=E("span",{"class":"v"},"");ct.appendChild(vt);
    var st=E("select",{},TUBES.map(function(x,i){
      return '<option value="'+i+'"'+(i===P.tube?" selected":"")+'>'+x[0]+
             " — intérieur "+x[1]+" mm</option>";}).join(""));
    st.addEventListener("change",function(){P.tube=+this.value;calc();});
    ct.appendChild(st);c1.appendChild(ct);
    maj.push(function(){vt.textContent=TUBES[P.tube][1]+" mm";});
    ch(c1,"Longueur droite","L",2,200,1,0," m");

    c2.appendChild(E("div",{style:"font-family:'Bricolage Grotesque',sans-serif;"+
      "font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;"+
      "color:var(--encre2);margin-bottom:4px"},"Singularités du circuit"));
    SINGU.forEach(function(s,i){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},s[0]));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var inp=E("input",{type:"range",min:0,max:20,step:1,value:P.n[i]});
      inp.addEventListener("input",function(){P.n[i]=parseFloat(this.value);calc();});
      c.appendChild(inp);c2.appendChild(c);
      maj.push(function(){
        v.textContent=P.n[i]+" × "+frs(s[1]*TUBES[P.tube][1],1)+" m";});
    });
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var res=E("div",{"class":"res",style:"margin-top:16px"});d.appendChild(res);

    function calc(){
      maj.forEach(function(f){f();});
      var dmm=TUBES[P.tube][1];
      var Q=debit(P.p,P.dt), v=vitesse(Q,dmm), j=lineique(Q,dmm);
      var Leq=0;
      SINGU.forEach(function(s,i){Leq+=P.n[i]*s[1]*dmm;});
      var Lt=P.L+Leq, dp=j*Lt;
      ETAT.k_reseau=Q>0?(dp/9810)/(Q*Q):2.5;
      ETAT.q_besoin=Q;
      var okv=v<=1.0, okj=j<=200;
      res.innerHTML="<div class='gros'>"+
        "<span><b>Débit</b><span>"+frs(Q,2)+" m³/h</span></span>"+
        "<span><b>Vitesse</b><span>"+frs(v,2)+" m/s</span></span>"+
        "<span><b>Perte linéique</b><span>"+fr(j,0)+" Pa/m</span></span>"+
        "<span><b>Longueur équivalente</b><span>"+frs(Leq,1)+" m</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Longueur totale</b><span>"+frs(Lt,1)+" m</span></span>"+
        "<span><b>Perte de charge</b><span>"+fr(dp,0)+" Pa</span></span>"+
        "<span><b>soit</b><span>"+frs(dp/9810,2)+" mCE</span></span>"+
        "</div><p>"+
        (okv&&okj?"<b>Les deux critères sont tenus</b> : vitesse sous 1 m/s, perte "+
          "linéique sous 200 Pa/m."
         :"<b>"+(!okv&&!okj?"Les deux critères sont dépassés"
           :!okv?"La vitesse dépasse 1 m/s":"La perte linéique dépasse 200 Pa/m")+
          "</b> — bruit et consommation du circulateur. Prendre le tube au-dessus.")+
        " Les singularités valent <b>"+fr(100*Leq/Lt,0)+" %</b> de la longueur "+
        "totale : ce n'est jamais un détail.</p>";
      suivant("point-fonctionnement");
    }
    calc();
    OUTILS.pertes._recalc=calc;
  }
};

/* ─────────── 2. point de fonctionnement ─────────── */
var POMPES=[["Vitesse I",2.0,1.8],["Vitesse II",3.0,2.2],["Vitesse III",4.0,2.6]];
OUTILS["point-fonctionnement"]={
  titre:"Le point de fonctionnement",
  intro:"La courbe du réseau monte comme le carré du débit. Celle du circulateur "+
        "descend. Elles se croisent en un seul point, et c'est là que "+
        "l'installation travaille — qu'on le veuille ou non.",
  chaine:"la résistance du réseau vient des pertes de charge",
  monte:function(d){
    var P={k:2.5,besoin:0.52,auto:true};
    var W=680,H=380,X0=64,X1=640,Y0=24,Y1=310,QMAX=3,HMAX=5;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Point de fonctionnement d'un circulateur"});
    var barre=E("div",{style:"display:flex;flex-wrap:wrap;gap:18px;align-items:center;"+
      "margin-bottom:10px"});
    var maj=[];
    function ch(lab,cle,min,max,pas,dec,unite){
      var w=E("div",{style:"flex:1 1 230px"});
      var l=E("div",{style:"display:flex;justify-content:space-between;font-size:14.5px"});
      l.appendChild(E("span",{},lab));
      var v=E("span",{"class":"mono",style:"font-weight:600"},"");
      l.appendChild(v);w.appendChild(l);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle],
        style:"width:100%"});
      i.addEventListener("input",function(){
        P[cle]=parseFloat(this.value);if(cle==="k")P.auto=false;dessine();});
      w.appendChild(i);barre.appendChild(w);
      maj.push(function(){v.textContent=frs(P[cle],dec)+unite;});
    }
    ch("Résistance du réseau k","k",0.3,12,0.1,1,"");
    ch("Débit nécessaire","besoin",0.1,2,0.01,2," m³/h");
    d.appendChild(barre);d.appendChild(svg);
    var lect=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(lect);

    function px(q){return X0+q/QMAX*(X1-X0);}
    function py(h){return Y1-h/HMAX*(Y1-Y0);}

    function dessine(){
      if(P.auto&&ETAT.k_reseau)P.k=Math.max(0.3,Math.min(12,ETAT.k_reseau));
      if(ETAT.q_besoin)P.besoin=Math.max(0.1,Math.min(2,ETAT.q_besoin));
      maj.forEach(function(f){f();});
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      var q,i;
      for(q=0;q<=QMAX;q+=0.5){
        svg.appendChild(S("line",{x1:px(q),y1:Y0,x2:px(q),y2:Y1,stroke:V("trait2"),
          "stroke-width":"1"}));
        svg.appendChild(S("text",{x:px(q),y:Y1+18,"text-anchor":"middle",
          "class":"s-pet"},frs(q,1)));
      }
      for(i=0;i<=HMAX;i++){
        svg.appendChild(S("line",{x1:X0,y1:py(i),x2:X1,y2:py(i),stroke:V("trait2"),
          "stroke-width":"1"}));
        svg.appendChild(S("text",{x:X0-9,y:py(i)+4,"text-anchor":"end","class":"s-pet"},
          String(i)));
      }
      svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+40,"text-anchor":"middle",
        "class":"s-pet"},"débit Q  (m³/h)"));
      var lab=S("text",{x:0,y:0,"text-anchor":"middle","class":"s-pet",
        transform:"translate(18,"+((Y0+Y1)/2)+") rotate(-90)"});
      lab.textContent="hauteur manométrique  (mCE)";
      svg.appendChild(lab);

      /* les trois courbes de circulateur */
      var inter=[];
      POMPES.forEach(function(p,i2){
        var H0=p[1], qm=p[2], a=H0/(qm*qm), dd="",k2=0;
        for(q=0;q<=qm;q+=0.02){
          var h=H0-a*q*q;if(h<0)break;
          dd+=(k2++?"L":"M")+px(q).toFixed(1)+","+py(h).toFixed(1);
        }
        svg.appendChild(S("path",{d:dd,fill:"none",stroke:V("froid"),
          "stroke-width":"2","opacity":String(0.45+0.25*i2)}));
        var qi=Math.sqrt(H0/(P.k+a)), hi=P.k*qi*qi;
        inter.push([p[0],qi,hi]);
        svg.appendChild(S("text",{x:px(0)+9,y:py(H0)-7,"text-anchor":"start",
          "class":"s-pet",fill:V("froid")},p[0]));
      });

      /* la courbe du reseau */
      var dr="",k3=0;
      for(q=0;q<=QMAX;q+=0.02){
        var h2=P.k*q*q;if(h2>HMAX)break;
        dr+=(k3++?"L":"M")+px(q).toFixed(1)+","+py(h2).toFixed(1);
      }
      svg.appendChild(S("path",{d:dr,fill:"none",stroke:V("chaud"),"stroke-width":"3"}));
      svg.appendChild(S("text",{x:px(Math.sqrt(HMAX/P.k))+8,y:Y0+16,
        "class":"s-nom",fill:V("chaud")},"réseau  Δp = k Q²"));

      /* les trois points de fonctionnement */
      inter.forEach(function(x){
        svg.appendChild(S("circle",{cx:px(x[1]),cy:py(x[2]),r:"6",fill:V("encre")}));
      });

      /* le debit necessaire */
      svg.appendChild(S("line",{x1:px(P.besoin),y1:Y0,x2:px(P.besoin),y2:Y1,
        stroke:V("vert"),"stroke-width":"2","stroke-dasharray":"6 4"}));
      svg.appendChild(S("text",{x:px(P.besoin)+8,y:Y1-8,"class":"s-nom",fill:V("vert")},
        "débit nécessaire"));
      svg.appendChild(S("rect",{x:X0,y:Y0,width:X1-X0,height:Y1-Y0,fill:"none",
        stroke:V("trait"),"stroke-width":"1.5"}));

      var mieux=null;
      inter.forEach(function(x){if(!mieux||Math.abs(x[1]-P.besoin)<Math.abs(mieux[1]-P.besoin))mieux=x;});
      lect.innerHTML="<div class='gros'>"+inter.map(function(x){
        return "<span><b>"+x[0]+"</b><span>"+frs(x[1],2)+" m³/h</span></span>";
      }).join("")+"</div><p>Le débit nécessaire est de <b>"+frs(P.besoin,2)+
        " m³/h</b>. La vitesse la plus proche est <b>"+mieux[0].replace("Vitesse","vitesse")+
        "</b>, qui en donne "+frs(mieux[1],2)+
        (mieux[1]>P.besoin*1.15
         ? " — soit <b>"+fr(100*(mieux[1]/P.besoin-1),0)+" % de trop</b>. "+
           "Trop de débit, c'est du bruit, un ΔT écrasé et un circulateur qui "+
           "consomme pour rien : il faut brider au robinet ou changer de pompe."
         : ". L'écart reste acceptable.")+"</p>";
    }
    dessine();
    OUTILS["point-fonctionnement"]._recalc=dessine;
  }
};

/* ─────────── 3. eau chaude sanitaire ─────────── */
/* litres puises par heure, internat de 40 eleves — total 1 632 L par jour */
var PROFIL=[0,0,0,0,0,32,128,224,160,64,32,32,48,32,32,32,48,96,192,256,128,64,32,0];
OUTILS.emetteur={
  titre:"Ce qu'émet un radiateur selon le régime",
  intro:"La puissance de catalogue est donnée pour un écart de 50 K. Déplacez "+
        "le régime d'eau et regardez ce qu'il en reste.",
  monte:function(d){
    var P={pn:1680,td:70,tr:55,ta:20,n:1.3,besoin:4200};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
    }
    ch(c1,"Puissance de catalogue, à ΔT 50 K","pn",500,4000,20,0," W");
    ch(c1,"Départ d'eau","td",30,90,1,0," °C");
    ch(c1,"Retour d'eau","tr",20,80,1,0," °C");
    ch(c2,"Air du local","ta",15,24,1,0," °C");
    ch(c2,"Exposant n","n",1,1.4,0.05,2,"");
    ch(c2,"Besoin du local","besoin",500,10000,100,0," W");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var W=680,H=150,X0=40,X1=640,Y0=40;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Facteur d'émission selon le régime"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);

    function calc(){
      maj.forEach(function(f){f();});
      var tm=(P.td+P.tr)/2-P.ta;
      var ok=P.tr<P.td && tm>0;
      var f=ok?Math.pow(tm/50,P.n):0;
      var phi=P.pn*f;
      var nb=phi>0?Math.ceil(P.besoin/phi):0;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      /* jauge 0 - 120 % */
      var L=X1-X0;
      svg.appendChild(S("rect",{x:X0,y:Y0,width:L,height:30,rx:6,fill:V("froid"),opacity:"0.12",
        stroke:V("trait")}));
      var l=Math.min(1.2,f)/1.2*L;
      svg.appendChild(S("rect",{x:X0,y:Y0,width:l,height:30,rx:6,
        fill:V(f>=0.99?"chaud":f>=0.5?"vert":"froid"),opacity:"0.85"}));
      [0,0.25,0.5,0.75,1].forEach(function(t){
        var x=X0+t/1.2*L;
        svg.appendChild(S("line",{x1:x,y1:Y0+30,x2:x,y2:Y0+38,stroke:V("trait"),
          "stroke-width":"1.5"}));
        svg.appendChild(S("text",{x:x,y:Y0+56,"text-anchor":"middle","class":"s-pet"},
          fr(100*t,0)+" %"));
      });
      var xc=X0+1/1.2*L;
      svg.appendChild(S("text",{x:xc,y:Y0-12,"text-anchor":"middle","class":"s-nom"},
        "catalogue"));
      svg.appendChild(S("text",{x:X0,y:Y0+90,"class":"s-nom"},
        "puissance émise, en part de la valeur de catalogue"));
      res.innerHTML="<div class='gros'>"+
        "<span><b>Écart moyen ΔTm</b><span>"+(ok?frs(tm,1)+" K":"—")+"</span></span>"+
        "<span><b>Facteur</b><span>"+(ok?frs(f,2):"—")+"</span></span>"+
        "<span><b>Puissance émise</b><span>"+(ok?fr(phi,0)+" W":"—")+"</span></span>"+
        "<span><b>Émetteurs pour le besoin</b><span>"+(ok?String(nb):"—")+"</span></span>"+
        "</div><p>"+(!ok
        ? "<b>Le retour doit être plus froid que le départ</b>, et l'eau plus chaude "+
          "que le local : sinon rien n'est émis."
        : f>=0.99
        ? "On est au régime de catalogue ou au-dessus : le radiateur donne ce que "+
          "la fiche annonce."
        : "À ce régime, le radiateur n'émet que <b>"+fr(100*f,0)+" %</b> de sa "+
          "valeur de catalogue. Pour couvrir "+fr(P.besoin,0)+" W, il en faut <b>"+
          nb+"</b> — contre "+Math.ceil(P.besoin/P.pn)+" au régime de catalogue.")+
        "</p>";
    }
    calc();
  }
};

/* Saturation du R134a, valeurs arrondies : T, p bar, h liquide, h vapeur */
var SAT134=[[-30,0.84,160,380],[-20,1.33,173,386],[-10,2.01,186,392],[0,2.93,200,399],
  [10,4.15,213,404],[20,5.72,227,409],[30,7.70,241,414],[40,10.17,256,419],
  [50,13.18,271,423],[60,16.82,287,426],[70,21.17,304,428]];
function sat134(t){
  var i=0;while(i<SAT134.length-2&&SAT134[i+1][0]<t)i++;
  var a=SAT134[i],b=SAT134[i+1],f=(t-a[0])/(b[0]-a[0]);
  return {p:Math.exp(Math.log(a[1])+f*(Math.log(b[1])-Math.log(a[1]))),
          hl:a[2]+f*(b[2]-a[2]), hv:a[3]+f*(b[3]-a[3])};
}
OUTILS.cop={
  titre:"Le COP selon les deux températures",
  intro:"Deux températures fixent le rectangle. Rapprochez-les, et regardez le COP "+
        "monter — c'est toute la raison du régime basse température.",
  monte:function(d){
    var P={te:-10,tc:40,eta:70,pabs:166};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
    }
    ch(c1,"Température d'évaporation","te",-25,10,1,0," °C");
    ch(c1,"Température de condensation","tc",25,65,1,0," °C");
    ch(c2,"Part de la limite de Carnot atteinte","eta",40,80,5,0," %");
    ch(c2,"Puissance du compresseur","pabs",100,5000,10,0," W");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var W=680,H=300,X0=48,X1=660,Y0=22,Y1=262;
    var HMIN=150,HMAX=450,PMIN=0.8,PMAX=25;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Cycle sur le diagramme enthalpique"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);
    function px(h){return X0+(X1-X0)*(h-HMIN)/(HMAX-HMIN);}
    function py(p){return Y1-(Y1-Y0)*Math.log(p/PMIN)/Math.log(PMAX/PMIN);}

    function calc(){
      maj.forEach(function(f){f();});
      var ok=P.tc>P.te+5;
      var Tc=P.tc+273.15,Te=P.te+273.15;
      var carnot=Tc/(Tc-Te), cop=carnot*P.eta/100;
      var se=sat134(P.te), sc=sat134(P.tc);
      var h1=se.hv,h3=sc.hl,h2=(cop*h1-h3)/(cop-1);
      var phic=cop*P.pabs, phie=phic-P.pabs;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      /* grille legere */
      [1,2,5,10,20].forEach(function(p){
        svg.appendChild(S("line",{x1:X0,y1:py(p),x2:X1,y2:py(p),stroke:V("trait"),
          "stroke-width":"0.8",opacity:"0.5"}));
        svg.appendChild(S("text",{x:X0-6,y:py(p)+4,"text-anchor":"end","class":"s-pet"},
          String(p)));
      });
      [200,300,400].forEach(function(h){
        svg.appendChild(S("line",{x1:px(h),y1:Y0,x2:px(h),y2:Y1,stroke:V("trait"),
          "stroke-width":"0.8",opacity:"0.5"}));
        svg.appendChild(S("text",{x:px(h),y:Y1+16,"text-anchor":"middle","class":"s-pet"},
          String(h)));
      });
      svg.appendChild(S("text",{x:X1,y:Y1+30,"text-anchor":"end","class":"s-pet"},"h en kJ/kg"));
      svg.appendChild(S("text",{x:X0,y:Y0-8,"class":"s-pet"},"p en bar"));
      /* cloche */
      var dl="",dv="";
      SAT134.forEach(function(r,i){
        dl+=(i?"L":"M")+px(r[2]).toFixed(1)+" "+py(r[1]).toFixed(1)+" ";
        dv+=(i?"L":"M")+px(r[3]).toFixed(1)+" "+py(r[1]).toFixed(1)+" ";
      });
      svg.appendChild(S("path",{d:dl,fill:"none",stroke:V("encre"),"stroke-width":"2"}));
      svg.appendChild(S("path",{d:dv,fill:"none",stroke:V("encre"),"stroke-width":"2"}));
      if(ok){
        var pts=[[h1,se.p],[h2,sc.p],[h3,sc.p],[h3,se.p]];
        var dc="";
        pts.forEach(function(q,i){dc+=(i?"L":"M")+px(q[0]).toFixed(1)+" "+py(q[1]).toFixed(1)+" ";});
        svg.appendChild(S("path",{d:dc+"Z",fill:V("chaud"),"fill-opacity":"0.08",
          stroke:V("chaud"),"stroke-width":"2.5"}));
        pts.forEach(function(q,i){
          svg.appendChild(S("circle",{cx:px(q[0]),cy:py(q[1]),r:9,fill:V("carte"),
            stroke:V("chaud"),"stroke-width":"2.5"}));
          svg.appendChild(S("text",{x:px(q[0]),y:py(q[1])+4,"text-anchor":"middle",
            "class":"s-pet",fill:V("chaud")},String(i+1)));
        });
      }
      res.innerHTML="<div class='gros'>"+
        "<span><b>Basse pression</b><span>"+(ok?frs(se.p,1)+" bar":"—")+"</span></span>"+
        "<span><b>Haute pression</b><span>"+(ok?frs(sc.p,1)+" bar":"—")+"</span></span>"+
        "<span><b>COP de Carnot</b><span>"+(ok?frs(carnot,1):"—")+"</span></span>"+
        "<span><b>COP de la machine</b><span>"+(ok?frs(cop,1):"—")+"</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Chaleur livrée</b><span>"+(ok?fr(phic,0)+" W":"—")+"</span></span>"+
        "<span><b>Prise dehors, gratuite</b><span>"+(ok?fr(phie,0)+" W":"—")+"</span></span>"+
        "</div><p>"+(!ok
        ? "<b>La condensation doit être nettement plus chaude que l'évaporation</b> : "+
          "sinon la machine n'a rien à pomper."
        : "Pour "+fr(P.pabs,0)+" W payés au compresseur, la machine livre <b>"+
          fr(phic,0)+" W</b> au condenseur. Les "+fr(phie,0)+" W de différence viennent "+
          "de la source froide. Écart entre les sources : <b>"+fr(P.tc-P.te,0)+
          " K</b> — c'est lui qui fixe le COP.")+"</p>";
    }
    calc();
  }
};

OUTILS.ventilation={
  titre:"Ce que coûte l'air neuf d'un local",
  intro:"Comptez les occupants, choisissez le débit réglementaire, et regardez ce "+
        "que la ventilation coûte — puis ce qu'en récupèrent le double flux et la "+
        "régulation à la demande.",
  monte:function(d){
    var P={n:42,q:30,ti:19,te:-7,dju:2400,heures:2000,mini:12,eps:0};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
    }
    ch(c1,"Occupants","n",1,200,1,0,"");
    ch(c1,"Débit par personne","q",18,60,1,0," m³/h");
    ch(c1,"Température extérieure de base","te",-15,5,1,0," °C");
    ch(c1,"Consigne intérieure","ti",16,22,1,0," °C");
    ch(c2,"Degrés-jours du lieu","dju",800,4000,50,0," DJU");
    ch(c2,"Heures d'occupation par an","heures",0,8760,100,0," h");
    ch(c2,"Débit minimal, local vide","mini",0,100,1,0," %");
    ch(c2,"Efficacité du récupérateur","eps",0,95,5,0," %");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var W=680,H=190,X0=180,X1=640,Y0=24;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Énergie annuelle de chauffage de l'air neuf"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);
    function calc(){
      maj.forEach(function(f){f();});
      var Q=P.n*P.q, dT=Math.max(0,P.ti-P.te);
      var phi=0.34*Q*dT;
      var Qmoy=(P.heures*Q+(8760-P.heures)*Q*P.mini/100)/8760;
      var E0=0.34*Q*24*P.dju/1000;           /* permanent, sans recuperation */
      var E1=0.34*Qmoy*24*P.dju/1000;        /* a la demande */
      var E2=E1*(1-P.eps/100);               /* plus recuperateur */
      var phiRec=phi*P.eps/100;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      var lignes=[["ventilé en permanence",E0,"froid"],
                  ["à la demande",E1,"tiede"],
                  ["à la demande + récupérateur",E2,"chaud"]];
      var mx=Math.max(E0,1);
      lignes.forEach(function(l,i){
        var y=Y0+i*52, w=(X1-X0)*l[1]/mx;
        svg.appendChild(S("text",{x:X0-10,y:y+22,"text-anchor":"end","class":"s-pet"},l[0]));
        svg.appendChild(S("rect",{x:X0,y:y,width:Math.max(w,2),height:32,rx:5,
          fill:V(l[2]),opacity:"0.8"}));
        svg.appendChild(S("text",{x:X0+Math.max(w,2)+8,y:y+22,"class":"s-nom"},
          fr(l[1],0)+" kWh"));
      });
      res.innerHTML="<div class='gros'>"+
        "<span><b>Débit du local</b><span>"+fr(Q,0)+" m³/h</span></span>"+
        "<span><b>Puissance à la base</b><span>"+fr(phi,0)+" W</span></span>"+
        "<span><b>Récupéré</b><span>"+fr(phiRec,0)+" W</span></span>"+
        "<span><b>Reste à chauffer</b><span>"+fr(phi-phiRec,0)+" W</span></span>"+
        "</div><p>"+(P.eps===0&&P.heures>=8760
        ? "Ventilé en permanence, sans récupération : c'est le cas de référence. "+
          "Baissez les heures d'occupation, puis montez l'efficacité du récupérateur."
        : "Par rapport au cas permanent sans récupération, cette configuration "+
          "divise l'énergie de l'air neuf par <b>"+frs(E0/Math.max(E2,1),1)+
          "</b>. Les deux leviers se multiplient : chacun retire sa part de ce qui reste.")+
        "</p>";
    }
    calc();
  }
};

OUTILS.evolution={
  titre:"Une évolution sur le diagramme, et son bilan",
  intro:"Partez d'un air, choisissez l'organe qu'il traverse, et lisez ce qu'il "+
        "coûte : la puissance vient toujours de la différence d'enthalpie.",
  monte:function(d){
    var P={t1:-7,hr1:90,Q:1260,type:"chauffe",t2:19,hr2:40,tb:19,hrb:40,part:70};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
      return c;
    }
    ch(c1,"Air d'entrée — température","t1",-15,40,0.5,1," °C");
    ch(c1,"Air d'entrée — humidité relative","hr1",5,100,1,0," %");
    ch(c1,"Débit","Q",100,10000,20,0," m³/h");
    var sel=E("div",{"class":"champ"});
    sel.appendChild(E("label",{},"L'organe traversé"));
    var s=E("select",{style:"width:100%;font:inherit;padding:8px;border-radius:8px;"+
      "border:1px solid var(--trait);background:var(--carte);color:var(--encre)"});
    [["chauffe","batterie chaude — vers une température"],
     ["froid","batterie froide — vers une température, condense sous la rosée"],
     ["vapeur","humidificateur vapeur — vers une humidité relative"],
     ["adiab","humidificateur adiabatique — vers une humidité relative"],
     ["melange","mélange avec un second air"]].forEach(function(o){
      s.appendChild(E("option",{value:o[0]},o[1]));});
    s.value=P.type;
    s.addEventListener("change",function(){P.type=this.value;calc();});
    sel.appendChild(s);c2.appendChild(sel);
    var cT=ch(c2,"Température visée","t2",-10,45,0.5,1," °C");
    var cH=ch(c2,"Humidité relative visée","hr2",5,100,1,0," %");
    var cB1=ch(c2,"Second air — température","tb",-15,40,0.5,1," °C");
    var cB2=ch(c2,"Second air — humidité relative","hrb",5,100,1,0," %");
    var cB3=ch(c2,"Part du second air, en masse","part",0,100,5,0," %");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var W=720,H=400,X0=56,X1=690,Y0=20,Y1=340,TMIN=-15,TMAX=45,RMAX=25;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Évolution sur le diagramme"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);
    function px(t){return X0+(t-TMIN)/(TMAX-TMIN)*(X1-X0);}
    function py(r){return Y1-Math.min(r,RMAX)/RMAX*(Y1-Y0);}
    function rDeH(h,t){return (h-1.006*t)/(2.501+0.00183*t);}

    function calc(){
      maj.forEach(function(f){f();});
      cT.style.display=(P.type==="chauffe"||P.type==="froid")?"":"none";
      cH.style.display=(P.type==="vapeur"||P.type==="adiab")?"":"none";
      [cB1,cB2,cB3].forEach(function(c){c.style.display=P.type==="melange"?"":"none";});
      var r1=rDe(P.t1,P.hr1), h1=enth(P.t1,r1), v=volSpec(P.t1,r1);
      var qm=P.Q/3600/v;
      var t2,r2,chemin=[],note="";
      if(P.type==="chauffe"){t2=Math.max(P.t2,P.t1);r2=r1;chemin=[[P.t1,r1],[t2,r2]];
        note="Chauffer ne change pas r : le point glisse vers la droite.";}
      else if(P.type==="froid"){
        t2=Math.min(P.t2,P.t1);var tr=rosee(P.t1,P.hr1);
        if(t2>=tr){r2=r1;chemin=[[P.t1,r1],[t2,r2]];note="Au-dessus de la rosée, "+
          "l'air se refroidit sans condenser : r ne change pas.";}
        else{r2=rDe(t2,100);chemin=[[P.t1,r1],[tr,r1]];
          for(var t=tr;t>t2;t-=0.5)chemin.push([t,rDe(t,100)]);chemin.push([t2,r2]);
          note="Passé la rosée, "+frs(tr,1)+" °C, l'air suit la courbe de saturation : "+
          "l'eau condense sur la batterie — "+frs((r1-r2)*qm*3.6,1)+" kg par heure.";}
      }
      else if(P.type==="vapeur"){t2=P.t1;r2=Math.max(r1,rDe(P.t1,P.hr2));chemin=[[P.t1,r1],[t2,r2]];
        note="La vapeur ajoute de l'eau à température presque constante : verticale. "+
          "Eau à vaporiser : "+frs((r2-r1)*qm*3.6,1)+" kg par heure.";}
      else if(P.type==="adiab"){
        var h=h1;t2=P.t1;
        for(var tt=P.t1;tt>-15;tt-=0.1){var rr=rDeH(h,tt);if(hrDe(tt,rr)>=P.hr2){t2=tt;break;}t2=tt;}
        r2=rDeH(h,t2);chemin=[[P.t1,r1],[t2,r2]];
        note="L'eau s'évapore en prenant sa chaleur à l'air : h constante, l'air se "+
          "refroidit de "+frs(P.t1-t2,1)+" K. Il faudra le réchauffer ensuite.";}
      else{
        var rb=rDe(P.tb,P.hrb),x=P.part/100;
        t2=(1-x)*P.t1+x*P.tb;r2=(1-x)*r1+x*rb;chemin=[[P.t1,r1],[P.tb,rb]];
        note="Le mélange est sur le segment entre les deux airs, à "+fr(P.part,0)+
          " % du chemin vers le second. r et h se moyennent en masse.";}
      var h2=enth(t2,r2), dh=h2-h1, Pw=qm*dh;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      for(var tg=TMIN;tg<=TMAX;tg+=5){
        svg.appendChild(S("line",{x1:px(tg),y1:Y0,x2:px(tg),y2:Y1,stroke:V("trait2"),"stroke-width":"1"}));
        svg.appendChild(S("text",{x:px(tg),y:Y1+16,"text-anchor":"middle","class":"s-pet"},String(tg)));}
      for(var rg=0;rg<=RMAX;rg+=5){
        svg.appendChild(S("line",{x1:X0,y1:py(rg),x2:X1,y2:py(rg),stroke:V("trait2"),"stroke-width":"1"}));
        svg.appendChild(S("text",{x:X1+6,y:py(rg)+4,"class":"s-pet"},String(rg)));}
      [20,40,60,80,100].forEach(function(hr){
        var dd="",k=0;
        for(var t=TMIN;t<=TMAX;t+=0.5){var rr=rDe(t,hr);if(rr>RMAX)break;
          dd+=(k++?"L":"M")+px(t).toFixed(1)+","+py(rr).toFixed(1);}
        svg.appendChild(S("path",{d:dd,fill:"none",stroke:V(hr===100?"froid":"trait"),
          "stroke-width":hr===100?"2.5":"1","stroke-dasharray":hr===100?"":"3 4"}));});
      var dc="";chemin.forEach(function(q,i){dc+=(i?"L":"M")+px(q[0]).toFixed(1)+","+py(q[1]).toFixed(1);});
      svg.appendChild(S("path",{d:dc,fill:"none",stroke:V(P.type==="melange"?"trait":"chaud"),
        "stroke-width":"3","stroke-dasharray":P.type==="melange"?"6 4":""}));
      var pts=[[P.t1,r1,"1"],[t2,r2,"2"]];
      if(P.type==="melange")pts.push([P.tb,rDe(P.tb,P.hrb),"B"]);
      pts.forEach(function(q){
        svg.appendChild(S("circle",{cx:px(q[0]),cy:py(q[1]),r:9,fill:V("carte"),stroke:V("chaud"),"stroke-width":"2.5"}));
        svg.appendChild(S("text",{x:px(q[0]),y:py(q[1])+4,"text-anchor":"middle","class":"s-pet",fill:V("chaud")},q[2]));});
      svg.appendChild(S("text",{x:X0,y:Y1+36,"class":"s-pet"},"θ en °C — r en g/kg à droite"));
      res.innerHTML="<div class='gros'>"+
        "<span><b>Air d'entrée</b><span>"+frs(r1,1)+" g/kg · "+frs(h1,1)+" kJ/kg</span></span>"+
        "<span><b>Air de sortie</b><span>"+frs(t2,1)+" °C · "+fr(hrDe(t2,r2),0)+" % · "+frs(r2,1)+" g/kg · "+frs(h2,1)+" kJ/kg</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Débit massique</b><span>"+frs(qm,3)+" kg/s</span></span>"+
        "<span><b>Δh</b><span>"+frs(dh,1)+" kJ/kg</span></span>"+
        "<span><b>Puissance</b><span>"+(Math.abs(Pw)<0.05?"—":frs(Math.abs(Pw),2)+" kW "+(Pw>0?"fournis":"retirés"))+"</span></span>"+
        "</div><p>"+note+"</p>";
    }
    calc();
  }
};

OUTILS.regulation={
  titre:"Tout ou rien ou proportionnel — la température d'un local",
  intro:"Un local, un chauffage, un régulateur. Changez le différentiel ou la bande "+
        "proportionnelle, et regardez la température : c'est le compromis de tout réglage.",
  monte:function(d){
    var P={mode:"tor",cons:20,diff:1,xp:2,text:0,P:9};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
      return c;
    }
    var sel=E("div",{"class":"champ"});
    sel.appendChild(E("label",{},"Le régulateur"));
    var s=E("select",{style:"width:100%;font:inherit;padding:8px;border-radius:8px;"+
      "border:1px solid var(--trait);background:var(--carte);color:var(--encre)"});
    [["tor","tout ou rien, avec différentiel"],["p","proportionnel, bande Xp"]].forEach(function(o){
      s.appendChild(E("option",{value:o[0]},o[1]));});
    s.addEventListener("change",function(){P.mode=this.value;calc();});
    sel.appendChild(s);c1.appendChild(sel);
    ch(c1,"Consigne","cons",16,24,0.5,1," °C");
    var cD=ch(c1,"Différentiel","diff",0.2,4,0.2,1," K");
    var cX=ch(c1,"Bande proportionnelle Xp","xp",0.5,8,0.5,1," K");
    ch(c2,"Température extérieure","text",-10,15,1,0," °C");
    ch(c2,"Puissance du chauffage","P",3,15,0.5,1," kW");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var W=720,H=300,X0=50,X1=690,Y0=20,Y1=230;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Température du local au fil du temps"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);
    function calc(){
      maj.forEach(function(f){f();});
      cD.style.display=P.mode==="tor"?"":"none";cX.style.display=P.mode==="p"?"":"none";
      var T=P.cons-3,C=0.8,G=0.25,u=0,pas=0.5,comm=0,prev=null,mn=99,mx=-99,pts=[],tmax=180;
      for(var t=0;t<=tmax;t+=pas){
        if(P.mode==="tor"){if(T<P.cons-P.diff/2)u=1;else if(T>P.cons+P.diff/2)u=0;}
        else u=Math.min(1,Math.max(0,(P.cons+P.xp/2-T)/P.xp));
        if(prev!==null&&u!==prev&&t>60)comm++;prev=u;
        if(t>60){mn=Math.min(mn,T);mx=Math.max(mx,T);}
        pts.push([t,T,u]);
        T+=(P.P*u-G*(T-P.text))/C*(pas/60);
      }
      var TMIN=P.cons-4,TMAX=P.cons+3;
      function px(t){return X0+(X1-X0)*t/tmax;}
      function py(T){return Y1-(Y1-Y0)*(Math.min(Math.max(T,TMIN),TMAX)-TMIN)/(TMAX-TMIN);}
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      for(var k=Math.ceil(TMIN);k<=TMAX;k++){
        svg.appendChild(S("line",{x1:X0,y1:py(k),x2:X1,y2:py(k),stroke:V("trait2"),"stroke-width":"1"}));
        svg.appendChild(S("text",{x:X0-6,y:py(k)+4,"text-anchor":"end","class":"s-pet"},k+" °C"));}
      for(var m=0;m<=tmax;m+=30){
        svg.appendChild(S("text",{x:px(m),y:Y1+16,"text-anchor":"middle","class":"s-pet"},m+" min"));}
      svg.appendChild(S("line",{x1:X0,y1:py(P.cons),x2:X1,y2:py(P.cons),stroke:V("encre2"),
        "stroke-width":"1.5","stroke-dasharray":"5 4"}));
      var dd="";pts.forEach(function(q,i){dd+=(i?"L":"M")+px(q[0]).toFixed(1)+","+py(q[1]).toFixed(1);});
      svg.appendChild(S("path",{d:dd,fill:"none",stroke:V("chaud"),"stroke-width":"2.5"}));
      pts.forEach(function(q){if(q[2]>0.5)svg.appendChild(S("line",{x1:px(q[0]),y1:Y1+28,x2:px(q[0]),y2:Y1+40,
        stroke:V("chaud"),"stroke-width":"2",opacity:String(0.3+0.7*q[2])}));});
      svg.appendChild(S("text",{x:X1,y:Y1+52,"text-anchor":"end","class":"s-pet"},"chauffage en marche, ou son taux"));
      var ecart=P.cons-(mn+mx)/2;
      res.innerHTML="<div class='gros'>"+
        "<span><b>Température établie</b><span>"+frs(mn,1)+" à "+frs(mx,1)+" °C</span></span>"+
        "<span><b>Amplitude</b><span>"+frs(mx-mn,1)+" K</span></span>"+
        (P.mode==="tor"?"<span><b>Commutations par heure</b><span>"+fr(comm/2,0)+"</span></span>"
                       :"<span><b>Erreur statique</b><span>"+frs(ecart,1)+" K</span></span>")+
        "</div><p>"+(P.mode==="tor"
        ? "Deux seuils à "+frs(P.cons-P.diff/2,1)+" et "+frs(P.cons+P.diff/2,1)+" °C. Un différentiel "+
          "étroit tient la température, mais use le contacteur ; un brûleur ne doit pas démarrer plus de "+
          "six fois par heure."
        : "La commande est proportionnelle à l'écart, sur "+frs(P.xp,1)+" K. Elle a besoin d'un écart "+
          "pour exister : la température se stabilise sous la consigne. C'est l'erreur statique, que "+
          "l'action intégrale rattrape.")+"</p>";
    }
    calc();
  }
};

OUTILS["loi-eau"]={
  titre:"La loi d'eau — pente, parallèle, et ce que demande vraiment le radiateur",
  intro:"La courbe exacte vient de l'émission du radiateur ; la droite est ce que "+
        "règle l'automate. Déplacez la température extérieure, puis la pente et le parallèle.",
  monte:function(d){
    var P={te:5,base:-5,tdep:70,tret:55,cons:19,pente:2.1,par:0,n:1.3,amb:19};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
    }
    ch(c1,"Température extérieure du moment","te",-15,20,0.5,1," °C");
    ch(c1,"Température extérieure de base","base",-15,0,1,0," °C");
    ch(c1,"Régime à la base — départ","tdep",40,90,1,0," °C");
    ch(c1,"Régime à la base — retour","tret",30,75,1,0," °C");
    ch(c2,"Pente réglée sur l'automate","pente",0.5,4,0.1,1,"");
    ch(c2,"Parallèle réglé","par",-10,15,1,0," K");
    ch(c2,"Exposant de l'émetteur n","n",1,1.4,0.05,2,"");
    ch(c2,"Local témoin — température mesurée","amb",15,23,0.5,1," °C");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var W=720,H=330,X0=60,X1=690,Y0=20,Y1=270,TEMIN=-15,TEMAX=20,TDMIN=15,TDMAX=90;
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Courbe de chauffe"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);
    function exact(te){
      var f=Math.max(0,(P.cons-te)/(P.cons-P.base));
      var dtmb=(P.tdep+P.tret)/2-P.cons;
      return P.cons+dtmb*Math.pow(f,1/P.n)+(P.tdep-P.tret)/2*f;
    }
    function lin(te){return P.cons+P.pente*(P.cons-te)+P.par;}
    function px(te){return X0+(X1-X0)*(te-TEMIN)/(TEMAX-TEMIN);}
    function py(T){return Y1-(Y1-Y0)*(Math.min(Math.max(T,TDMIN),TDMAX)-TDMIN)/(TDMAX-TDMIN);}
    function calc(){
      maj.forEach(function(f){f();});
      if(P.tret>=P.tdep)P.tret=P.tdep-5;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      for(var T=20;T<=90;T+=10){
        svg.appendChild(S("line",{x1:X0,y1:py(T),x2:X1,y2:py(T),stroke:V("trait2"),"stroke-width":"1"}));
        svg.appendChild(S("text",{x:X0-6,y:py(T)+4,"text-anchor":"end","class":"s-pet"},T+" °C"));}
      for(var te=-15;te<=20;te+=5){
        svg.appendChild(S("line",{x1:px(te),y1:Y0,x2:px(te),y2:Y1,stroke:V("trait2"),"stroke-width":"1"}));
        svg.appendChild(S("text",{x:px(te),y:Y1+16,"text-anchor":"middle","class":"s-pet"},te+" °C"));}
      svg.appendChild(S("text",{x:X1,y:Y1+32,"text-anchor":"end","class":"s-pet"},"température extérieure → température de départ"));
      var de="",dl="";
      for(var t=TEMIN,k=0;t<=TEMAX;t+=0.5,k++){
        de+=(k?"L":"M")+px(t).toFixed(1)+","+py(exact(t)).toFixed(1);
        dl+=(k?"L":"M")+px(t).toFixed(1)+","+py(Math.max(P.cons,lin(t))).toFixed(1);}
      svg.appendChild(S("path",{d:de,fill:"none",stroke:V("chaud"),"stroke-width":"3"}));
      svg.appendChild(S("path",{d:dl,fill:"none",stroke:V("froid"),"stroke-width":"2.5","stroke-dasharray":"7 4"}));
      var tx=exact(P.te),tl=Math.max(P.cons,lin(P.te));
      svg.appendChild(S("line",{x1:px(P.te),y1:Y0,x2:px(P.te),y2:Y1,stroke:V("encre2"),"stroke-width":"1","stroke-dasharray":"4 4"}));
      svg.appendChild(S("circle",{cx:px(P.te),cy:py(tx),r:7,fill:V("chaud")}));
      svg.appendChild(S("circle",{cx:px(P.te),cy:py(tl),r:7,fill:V("carte"),stroke:V("froid"),"stroke-width":"2.5"}));
      svg.appendChild(S("text",{x:X0+8,y:Y0+14,"class":"s-nom",fill:V("chaud")},"exacte, d'après l'émetteur"));
      svg.appendChild(S("text",{x:X0+8,y:Y0+32,"class":"s-nom",fill:V("froid")},"droite réglée : pente et parallèle"));
      var corr=3*(P.cons-P.amb);
      res.innerHTML="<div class='gros'>"+
        "<span><b>Départ nécessaire</b><span>"+frs(tx,1)+" °C</span></span>"+
        "<span><b>Départ réglé</b><span>"+frs(tl,1)+" °C</span></span>"+
        "<span><b>Écart</b><span>"+frs(tl-tx,1)+" K</span></span>"+
        "<span><b>Avec influence d'ambiance, k = 3</b><span>"+frs(tl+corr,1)+" °C</span></span>"+
        "</div><p>"+(Math.abs(tl-tx)<1.5
        ? "La droite colle à la courbe à cette température : le réglage est bon ici."
        : tl>tx ? "La droite donne <b>"+frs(tl-tx,1)+" K de trop</b> : la chaudière condense moins, les "+
                  "robinets thermostatiques rattrapent en fermant."
                : "La droite donne <b>"+frs(tx-tl,1)+" K de moins</b> que ce que demande le radiateur : "+
                  "le local ne tient pas sa consigne à cette température extérieure.")+
        (Math.abs(corr)>0.1?" Le local témoin à "+frs(P.amb,1)+" °C corrige le départ de "+frs(corr,1)+" K.":"")+
        "</p>";
    }
    calc();
  }
};

OUTILS.points={
  titre:"Compter les points, choisir les modules",
  intro:"Cochez les points de l'installation. L'outil les compte par nature, ajoute la "+
        "réserve, et propose les modules — puis vérifie qu'aucun point ne reste sans borne.",
  monte:function(d){
    var LISTE=[["Marche / arrêt ventilateur soufflage","DO"],["Vitesse ventilateur soufflage","AO"],
      ["Marche / arrêt ventilateur extraction","DO"],["Vitesse ventilateur extraction","AO"],
      ["Défaut ventilateur soufflage","DI"],["Défaut ventilateur extraction","DI"],
      ["Température de soufflage","AI"],["Température d'air neuf","AI"],["Température de reprise","AI"],
      ["CO₂ de la salle","AI"],["Commande batterie électrique","AO"],["Filtre soufflage encrassé","DI"],
      ["Filtre extraction encrassé","DI"],["Registre air neuf, commande","DO"],["Registre air neuf, retour d'état","DI"],
      ["Thermostat antigel","DI"],["Bipasse récupérateur, commande","DO"],["Compteur électrique, impulsions","DI"],
      ["Humidité de reprise","AI"],["Commande humidificateur","AO"],["Pression réseau de soufflage","AI"],
      ["V3V batterie eau chaude","AO"],["Circulateur batterie, marche","DO"],["Pressostat antigel eau","DI"]];
    var CAT={UC:{nom:"UC-16 — 8 UI, 4 DO, 4 AO",UI:8,DO:4,AO:4,prix:900},
             DI:{nom:"EXT-8DI",n:8,prix:180},UI:{nom:"EXT-8UI",n:8,prix:320},
             DO:{nom:"EXT-8DO",n:8,prix:220},AO:{nom:"EXT-4AO",n:4,prix:260}};
    var P={res:20,coches:LISTE.map(function(l,i){return i<18;})};
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    var liste=E("div",{style:"columns:2;column-gap:18px;font-size:14.5px"});
    LISTE.forEach(function(l,i){
      var lab=E("label",{style:"display:block;padding:3px 0;break-inside:avoid;cursor:pointer"});
      var cb=E("input",{type:"checkbox"});cb.checked=P.coches[i];
      cb.addEventListener("change",function(){P.coches[i]=this.checked;calc();});
      lab.appendChild(cb);lab.appendChild(document.createTextNode(" "+l[0]+" "));
      lab.appendChild(E("span",{"class":"mono",style:"opacity:.7"},l[1]));
      liste.appendChild(lab);});
    d.appendChild(liste);
    var c=E("div",{"class":"champ",style:"margin-top:10px"});
    c.appendChild(E("label",{},"Réserve"));
    var v=E("span",{"class":"v"},"");c.appendChild(v);
    var i=E("input",{type:"range",min:0,max:50,step:5,value:P.res});
    i.addEventListener("input",function(){P.res=parseFloat(this.value);calc();});
    c.appendChild(i);d.appendChild(c);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);
    function calc(){
      v.textContent=fr(P.res,0)+" %";
      var n={DI:0,AI:0,DO:0,AO:0};
      LISTE.forEach(function(l,i){if(P.coches[i])n[l[1]]++;});
      var r={};for(var k in n)r[k]=Math.ceil(n[k]*(1+P.res/100));
      /* UC : 8 UI pour AI puis DI, 4 DO, 4 AO ; puis extensions */
      var ui=CAT.UC.UI, restAI=Math.max(0,r.AI-ui), uiRest=Math.max(0,ui-r.AI);
      var restDI=Math.max(0,r.DI-uiRest);
      var restDO=Math.max(0,r.DO-CAT.UC.DO), restAO=Math.max(0,r.AO-CAT.UC.AO);
      var mods=[[CAT.UC.nom,1,CAT.UC.prix]];
      var nUI=Math.ceil(restAI/8), nDI=Math.ceil(Math.max(0,restDI-Math.max(0,nUI*8-restAI))/8);
      var nDO=Math.ceil(restDO/8), nAO=Math.ceil(restAO/4);
      if(nUI)mods.push([CAT.UI.nom,nUI,CAT.UI.prix*nUI]);
      if(nDI)mods.push([CAT.DI.nom,nDI,CAT.DI.prix*nDI]);
      if(nDO)mods.push([CAT.DO.nom,nDO,CAT.DO.prix*nDO]);
      if(nAO)mods.push([CAT.AO.nom,nAO,CAT.AO.prix*nAO]);
      var total=0;mods.forEach(function(m){total+=m[2];});
      var tot=n.DI+n.AI+n.DO+n.AO;
      res.innerHTML="<div class='gros'>"+
        "<span><b>DI</b><span>"+n.DI+" → "+r.DI+"</span></span>"+
        "<span><b>AI</b><span>"+n.AI+" → "+r.AI+"</span></span>"+
        "<span><b>DO</b><span>"+n.DO+" → "+r.DO+"</span></span>"+
        "<span><b>AO</b><span>"+n.AO+" → "+r.AO+"</span></span>"+
        "<span><b>Total</b><span>"+tot+" points</span></span>"+
        "</div><table style='margin-top:10px;width:100%;font-size:14.5px'><tr><th style='text-align:left'>Module</th><th>Qté</th><th style='text-align:right'>€ HT</th></tr>"+
        mods.map(function(m){return "<tr><td>"+m[0]+"</td><td style='text-align:center'>"+m[1]+"</td><td style='text-align:right'>"+fr(m[2],0)+"</td></tr>";}).join("")+
        "<tr><td><b>Total</b></td><td></td><td style='text-align:right'><b>"+fr(total,0)+"</b></td></tr></table>"+
        "<p>Les entrées universelles de l'unité centrale prennent d'abord les AI, puis les DI qui restent. "+
        "Chaque nature est couverte avec sa réserve : aucun point sans borne.</p>";
    }
    calc();
  }
};

/* ─── la sous-station a ballon primaire : les cinq reseaux ─── */
var SS_RESEAUX=[
  {k:"urbain",   c:"chaud",  n:"Réseau de chauffage urbain",
   d:"Le primaire. Il appartient au fournisseur : c'est son compteur qui facture."},
  {k:"chauffage",c:"tiede",  n:"Chauffage du bâtiment",
   d:"Départ régulé par V21 en loi d'eau, circulateur à vitesse variable."},
  {k:"charge",   c:"vert",   n:"Charge du ballon primaire",
   d:"P22 remplit la réserve d'énergie par le haut ; le bas repart vers l'échangeur."},
  {k:"primecs",  c:"violet", n:"Primaire de production ECS",
   d:"P23 puise en haut du ballon ; V22 dose pour tenir la température distribuée."},
  {k:"sanitaire",c:"froid",  n:"Réseaux sanitaires",
   d:"Eau froide et bouclage entrent, l'eau chaude sanitaire sort. Aucun stockage."}
];

SCHEMAS["sous-station-ecs"]=function(el){
  var W=1060,H=480;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Sous-station de chauffage urbain avec ballon primaire et "+
                 "production d'eau chaude sanitaire instantanée"});
  var grp={};SS_RESEAUX.forEach(function(r){grp[r.k]=[];});
  var actif=null;

  function add(e,k){svg.appendChild(e);if(k)grp[k].push(e);return e;}
  function tube(x1,y1,x2,y2,k,coul,ep){
    return add(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V(coul||"encre2"),
      "stroke-width":ep||3.5,"stroke-linecap":"round"}),k);
  }
  function nom(x,y,t,anc,coul,cls){
    return add(S("text",{x:x,y:y,"text-anchor":anc||"start",
      "class":cls||"s-nom",fill:V(coul||"encre2")},t));
  }
  function bulle(x,y,t,k,coul){
    add(S("circle",{cx:x,cy:y,r:"13",fill:V("carte"),stroke:V(coul||"encre2"),
      "stroke-width":"1.5"}),k);
    add(S("text",{x:x,y:y+4,"text-anchor":"middle","class":"s-rep",
      fill:V(coul||"encre2")},t),k);
  }
  function pompe(x,y,k,coul,sens){
    add(S("circle",{cx:x,cy:y,r:"14",fill:V("carte"),stroke:V(coul),
      "stroke-width":"2.5"}),k);
    var d=(sens==="haut")
      ? "M "+(x-7)+" "+(y+5)+" L "+x+" "+(y-8)+" L "+(x+7)+" "+(y+5)+" Z"
      : "M "+(x-5)+" "+(y-7)+" L "+(x+8)+" "+y+" L "+(x-5)+" "+(y+7)+" Z";
    add(S("path",{d:d,fill:V(coul)}),k);
  }
  function vanne(x,y,k,coul,troisvoies){
    add(S("path",{d:"M "+(x-11)+" "+(y-9)+" L "+(x-11)+" "+(y+9)+" L "+(x+11)+" "+
      (y-9)+" L "+(x+11)+" "+(y+9)+" Z",fill:V("carte"),stroke:V(coul),
      "stroke-width":"2.5"}),k);
    if(troisvoies)add(S("path",{d:"M "+(x-9)+" "+(y+13)+" L "+(x+9)+" "+(y+13)+
      " L "+x+" "+(y+2)+" Z",fill:V("carte"),stroke:V(coul),"stroke-width":"2.5"}),k);
    add(S("rect",{x:x-7,y:y-24,width:14,height:11,rx:2,fill:V("carte"),
      stroke:V(coul),"stroke-width":"2"}),k);
  }
  function echangeur(x,y,k1,k2,titre){
    add(S("rect",{x:x-19,y:y-52,width:38,height:104,rx:3,fill:V("carte"),
      stroke:V("encre2"),"stroke-width":"2.5"}));
    for(var i=0;i<5;i++)add(S("line",{x1:x-13+i*6.5,y1:y-45,x2:x-13+i*6.5,y2:y+45,
      stroke:V("encre2"),"stroke-width":"1.5"}));
    nom(x,y+96,titre,"middle");
  }

  var YD=250, YR=345;                 /* collecteurs depart et retour */
  var XE=150;                         /* echangeur de la sous-station */

  /* ---------- 1 · le primaire, reseau de chaleur urbain ---------- */
  tube(18,YD,XE-19,YD,"urbain","chaud");
  tube(XE-19,YR,18,YR,"urbain","chaud");
  add(S("path",{d:"M 30 "+(YD-9)+" L 46 "+YD+" L 30 "+(YD+9)+" Z",
    fill:V("chaud")}),"urbain");
  add(S("path",{d:"M 46 "+(YR-9)+" L 30 "+YR+" L 46 "+(YR+9)+" Z",
    fill:V("chaud")}),"urbain");
  nom(18,YD-42,"ARRIVÉE RÉSEAU","start","chaud","s-tit");
  nom(18,YD-24,"moins de 110 °C","start","chaud");
  nom(18,YR+30,"retour réseau","start","chaud");
  bulle(96,YD,"T11","urbain","chaud");
  bulle(96,YR,"T12","urbain","chaud");
  vanne(126,YR,"urbain","chaud",false);
  nom(126,YR+30,"V11","middle","chaud");
  echangeur(XE,(YD+YR)/2,null,null,"échangeur");

  /* ---------- les collecteurs, communs ---------- */
  add(S("rect",{x:XE+19,y:YD-9,width:400,height:18,rx:9,fill:V("carte2"),
    stroke:V("trait"),"stroke-width":"2"}));
  add(S("rect",{x:XE+19,y:YR-9,width:400,height:18,rx:9,fill:V("carte2"),
    stroke:V("trait"),"stroke-width":"2"}));
  nom(XE+30,YD-20,"collecteur départ  70 °C");
  nom(XE+150,YR+26,"collecteur retour");
  bulle(XE+40,YD-58,"T13");
  tube(XE+40,YD-45,XE+40,YD-9,null,"trait2",2);

  /* ---------- 2 · le chauffage du batiment ---------- */
  var XC=300, XCR=430;
  tube(XC,YD-9,XC,205,"chauffage","tiede");
  vanne(XC,190,"chauffage","tiede",true);
  tube(XC,178,XC,148,"chauffage","tiede");
  pompe(XC,134,"chauffage","tiede","haut");
  tube(XC,120,XC,86,"chauffage","tiede");
  bulle(XC,74,"T21","chauffage","tiede");
  tube(XC,62,XC,44,"chauffage","tiede");
  tube(XC,44,XCR,44,"chauffage","tiede");
  add(S("rect",{x:XC+22,y:24,width:86,height:40,rx:3,fill:V("carte"),
    stroke:V("tiede"),"stroke-width":"2.5"}),"chauffage");
  for(var i=0;i<4;i++)add(S("line",{x1:XC+32+i*22,y1:29,x2:XC+32+i*22,y2:59,
    stroke:V("tiede"),"stroke-width":"1.5"}),"chauffage");
  nom(XC+65,80,"émetteurs","middle","tiede");
  tube(XCR,44,XCR,YR-9,"chauffage","tiede");
  tube(XCR,190,XC+11,190,"chauffage","tiede");
  nom(XC-22,196,"V21","end","tiede");
  nom(XC-22,140,"P21","end","tiede");
  nom(XCR+12,320,"retour chauffage","start","tiede");

  /* ---------- 3 · la charge du ballon primaire ---------- */
  var XB=620, XB2=706, YB1=196, YB2=372;
  tube(500,YD+9,500,300,"charge","vert");
  tube(500,300,568,300,"charge","vert");
  pompe(582,300,"charge","vert");
  tube(596,300,XB,300,"charge","vert");
  nom(582,332,"P22","middle","vert");
  add(S("rect",{x:XB,y:YB1,width:XB2-XB,height:YB2-YB1,rx:12,fill:V("carte"),
    stroke:V("encre2"),"stroke-width":"2.5"}));
  nom((XB+XB2)/2,YB1-14,"BALLON PRIMAIRE","middle","encre2","s-tit");
  bulle((XB+XB2)/2,YB1+34,"T22");
  bulle((XB+XB2)/2,YB2-34,"T23");
  nom((XB+XB2)/2,288,"eau de","middle");
  nom((XB+XB2)/2,304,"chauffage","middle");
  tube(XB,YB2-24,569,YB2-24,"charge","vert");

  /* ---------- 4 · le primaire de production ECS ---------- */
  var XV=770, XE2=880;
  tube(XB2,232,XV,232,"primecs","violet");
  vanne(XV,232,"primecs","violet",true);
  nom(XV,200,"V22","middle","violet");
  tube(XV,245,XV,288,"primecs","violet");
  pompe(XV,302,"primecs","violet");
  nom(XV-34,308,"P23","end","violet");
  tube(XV,316,XV,338,"primecs","violet");
  tube(XV,338,XE2-19,338,"primecs","violet");
  echangeur(XE2,296,null,null,"échangeur ECS");
  tube(XE2-19,254,XV+40,254,"primecs","violet");
  tube(XV+40,254,XV+40,398,"primecs","violet");
  tube(XV+40,398,XB2-20,398,"primecs","violet");
  tube(XB2-20,398,XB2-20,YB2,"primecs","violet");

  /* ---------- 5 · les reseaux sanitaires ---------- */
  var XS=960;
  tube(XE2+19,254,W-30,254,"sanitaire","froid");
  add(S("path",{d:"M "+(W-46)+" 245 L "+(W-26)+" 254 L "+(W-46)+" 263 Z",
    fill:V("froid")}),"sanitaire");
  nom(W-30,230,"distribution ECS 60 °C","end","froid");
  bulle(XS-20,288,"T24","sanitaire","froid");
  tube(XS-20,275,XS-20,254,"sanitaire","froid",2);

  tube(XE2+19,338,XS,338,"sanitaire","froid");
  tube(XS,338,XS,430,"sanitaire","froid");
  tube(XS,430,W-20,430,"sanitaire","froid");
  add(S("path",{d:"M "+(W-40)+" 421 L "+(W-58)+" 430 L "+(W-40)+" 439 Z",
    fill:V("froid")}),"sanitaire");
  nom(W-20,456,"arrivée d'eau froide 10 °C","end","froid");
  tube(XS,390,W-20,390,"sanitaire","froid");
  pompe(XS+42,390,"sanitaire","froid");
  add(S("path",{d:"M "+(W-40)+" 381 L "+(W-58)+" 390 L "+(W-40)+" 399 Z",
    fill:V("froid")}),"sanitaire");
  nom(W-20,364,"P24 · bouclage ECS","end","froid");

  el.appendChild(svg);

  /* ---------- les cinq boutons de surlignage ---------- */
  var barre=E("div",{style:"display:flex;flex-wrap:wrap;gap:6px;margin-top:12px"});
  var carte=E("div",{"class":"res",style:"margin-top:10px"});
  function montre(k){
    actif=(actif===k?null:k);
    SS_RESEAUX.forEach(function(r){
      var on=(actif===null||actif===r.k);
      grp[r.k].forEach(function(e){e.setAttribute("opacity",on?"1":"0.12");});
    });
    [].forEach.call(barre.children,function(b,i){
      b.style.opacity=(actif===null||actif===SS_RESEAUX[i].k)?"1":"0.45";
      b.style.fontWeight=(actif===SS_RESEAUX[i].k)?"600":"400";
    });
    var r=null;SS_RESEAUX.forEach(function(x){if(x.k===actif)r=x;});
    carte.innerHTML=r
      ? "<p><b style='color:"+V(r.c)+"'>"+r.n+"</b> — "+r.d+"</p>"
      : "<p>Les cinq réseaux sont affichés. Cliquez-en un pour l'isoler, "+
        "cliquez-le à nouveau pour tout revoir. <b>Les collecteurs restent en "+
        "gris</b> : ils sont communs à deux réseaux, et c'est justement là "+
        "qu'un tracé se discute.</p>";
  }
  SS_RESEAUX.forEach(function(r){
    var b=E("button",{type:"button",style:"font:inherit;font-size:13px;cursor:pointer;"+
      "padding:5px 11px;border-radius:99px;background:var(--carte);"+
      "border:1.5px solid "+V(r.c)+";color:"+V(r.c)},r.n);
    b.addEventListener("click",function(){montre(r.k);});
    barre.appendChild(b);
  });
  var hote=el.parentNode||el;
  hote.appendChild(barre);hote.appendChild(carte);
  montre(null);
};

/* ─────────── sous-station : puissance souscrite et abonnement ─────────── */
OUTILS["sous-station"]={
  titre:"Sous-station : quelle puissance souscrire ?",
  intro:"Un réseau de chaleur facture la puissance souscrite toute l'année, "+
        "consommée ou non. Le ballon primaire sert à en souscrire moins. "+
        "Les valeurs de départ ne sont pas celles de l'activité.",
  monte:function(d){
    var P={nd:8,q:4,tc:60,tf:12,dur:12,surf:1800,dep:30,sur:10,dtp:20,r2:64};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
    }
    ch(c1,"Douches simultanées","nd",2,20,1,0,"");
    ch(c1,"Débit par douche","q",3,8,0.5,1," L/min");
    ch(c1,"Température d'ECS","tc",50,65,1,0," °C");
    ch(c1,"Température d'eau froide","tf",5,20,1,0," °C");
    ch(c1,"Durée de la pointe","dur",5,30,1,0," min");
    ch(c2,"Surface chauffée","surf",500,5000,100,0," m²");
    ch(c2,"Déperditions de base","dep",15,60,1,0," W/m²");
    ch(c2,"Surdimensionnement","sur",0,20,1,0," %");
    ch(c2,"Régime primaire du ballon","dtp",10,30,1,0," K");
    ch(c2,"Prix de l'abonnement r2","r2",40,90,1,0," €/kW");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);

    function calc(){
      maj.forEach(function(f){f();});
      var dt=P.tc-P.tf;
      var vh=P.nd*P.q*60;                       /* litres par heure */
      var Pecs=vh*1.163*dt/1000;                /* kW en pointe */
      var Pch=P.surf*P.dep*(1+P.sur/100)/1000;  /* kW de chauffage */
      var sans=Pecs+Pch, avec=Pch;
      var TVA=1.055;
      var Rsans=sans*P.r2*TVA, Ravec=avec*P.r2*TVA;
      var Estock=Pecs*P.dur*60;                 /* kJ */
      var trech=Estock/Pch/60;                  /* minutes */
      var vol=Estock/(4.18*P.dtp);              /* litres de ballon primaire */
      res.innerHTML="<div class='gros'>"+
        "<span><b>Pointe d'ECS</b><span>"+frs(Pecs,0)+" kW</span></span>"+
        "<span><b>Chauffage</b><span>"+frs(Pch,0)+" kW</span></span>"+
        "<span><b>Sans ballon</b><span>"+frs(sans,0)+" kW souscrits</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Abonnement sans ballon</b><span>"+fr(Rsans,0)+" € TTC/an</span></span>"+
        "<span><b>Avec ballon</b><span>"+fr(Ravec,0)+" € TTC/an</span></span>"+
        "<span><b>Écart</b><span>"+fr(Rsans-Ravec,0)+" € TTC/an</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Énergie à stocker</b><span>"+fr(Estock,0)+" kJ</span></span>"+
        "<span><b>Volume du ballon</b><span>"+fr(vol,0)+" L</span></span>"+
        "<span><b>Temps de recharge</b><span>"+frs(trech,0)+" min</span></span>"+
        "</div><p>La pointe dure "+fr(P.dur,0)+" min et la recharge "+
        frs(trech,0)+" min : le chauffage est interrompu <b>"+
        frs(P.dur+trech,0)+" min</b> au pire. "+
        (Pecs>Pch
         ? "Ici la pointe d'ECS dépasse le chauffage — c'est elle qui "+
           "dimensionnerait la sous-station sans le ballon."
         : "Ici le chauffage domine : le ballon rapporte moins, et il faut "+
           "vérifier qu'il se justifie encore.")+"</p>";
    }
    calc();
  }
};

/* ─── pompe a chaleur : ce qui entre, ce qui sort, a l'echelle ─── */
SCHEMAS["pac-bilan"]=function(el){
  var W=880,H=430;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Bilan d'une pompe a chaleur : trois unites prises dehors, "+
                 "une unite de travail, quatre unites rendues"});
  function tit(x,y,t,c,a,cls){svg.appendChild(S("text",{x:x,y:y,"text-anchor":a||"middle",
    "class":cls||"s-tit",fill:V(c||"encre2")},t));}
  function nom(x,y,t,c,a){svg.appendChild(S("text",{x:x,y:y,"text-anchor":a||"middle",
    "class":"s-nom",fill:V(c||"encre2")},t));}
  function bande(x,y,w,h,c,op){svg.appendChild(S("rect",{x:x,y:y,width:w,height:h,
    rx:3,fill:V(c),opacity:op||"0.85"}));}

  /* la machine */
  svg.appendChild(S("rect",{x:330,y:120,width:220,height:190,rx:8,fill:V("carte"),
    stroke:V("encre2"),"stroke-width":"2.5"}));
  tit(440,152,"POMPE À CHALEUR");
  var org=[["évaporateur","froid",182],["compresseur","chaud",212],
           ["condenseur","chaud",242],["détendeur","encre2",272]];
  org.forEach(function(o){
    svg.appendChild(S("circle",{cx:356,cy:o[2]-5,r:"4",fill:V(o[1])}));
    nom(372,o[2],o[0],o[1],"start");
  });

  /* Qf : trois unites prises a la source froide */
  var U=26;                                   /* une unite d'energie = 26 px */
  bande(60,196,140,3*U,"froid","0.55");
  svg.appendChild(S("path",{d:"M 200 196 L 240 "+(196+1.5*U)+" L 200 "+(196+3*U)+" Z",
    fill:V("froid"),opacity:"0.55"}));
  tit(130,184,"3 unités","froid",null,"s-lab");
  nom(130,196+3*U+22,"prises dehors, gratuites","froid");
  nom(130,196+3*U+42,"air, sol, nappe, eaux grises","froid");
  svg.appendChild(S("line",{x1:240,y1:196+1.5*U,x2:330,y2:215,stroke:V("froid"),
    "stroke-width":"3","stroke-dasharray":"5 4"}));

  /* W : une unite achetee */
  bande(400,44,80,U,"chaud","0.9");
  tit(440,34,"1 unité","chaud",null,"s-lab");
  nom(440,44+U+20,"électricité achetée","chaud");
  svg.appendChild(S("line",{x1:440,y1:44+U,x2:440,y2:120,stroke:V("chaud"),
    "stroke-width":"3","stroke-dasharray":"5 4"}));

  /* Qc : quatre unites rendues */
  bande(680,183,140,4*U,"vert","0.7");
  svg.appendChild(S("path",{d:"M 640 183 L 680 183 L 680 "+(183+4*U)+" L 640 "+
    (183+4*U)+" Z",fill:V("vert"),opacity:"0.7"}));
  svg.appendChild(S("line",{x1:550,y1:215,x2:640,y2:196+1.5*U,stroke:V("vert"),
    "stroke-width":"3","stroke-dasharray":"5 4"}));
  tit(750,171,"4 unités","vert",null,"s-lab");
  nom(750,183+4*U+22,"rendues au bâtiment","vert");

  /* la lecture */
  svg.appendChild(S("line",{x1:60,y1:370,x2:820,y2:370,stroke:V("trait"),
    "stroke-width":"1.5"}));
  tit(440,398,"COP = 4 unités rendues / 1 unité achetée = 4","encre2",null,"s-lab");
  nom(440,420,"Rien n'est créé : 3 + 1 = 4. La machine déplace, elle ne fabrique pas.");
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Les rectangles sont <b>à l'échelle</b> : la même hauteur vaut la même énergie. "+
    "C'est la figure à dessiner au tableau quand un étudiant dit « c'est impossible »."));
};

/* ─── batterie froide : l'ADP et le facteur de bipasse ─── */
SCHEMAS["bipasse-batterie"]=function(el){
  var W=880,H=470;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Construction de l'ADP et du facteur de bipasse d'une batterie froide"});
  function nom(x,y,t,c,a,cls){svg.appendChild(S("text",{x:x,y:y,"text-anchor":a||"start",
    "class":cls||"s-nom",fill:V(c||"encre2")},t));}
  /* --- repere psychrometrique reduit --- */
  var X0=380,X1=830,Y0=50,Y1=380, TMIN=5,TMAX=30, RMAX=14;
  function px(t){return X0+(t-TMIN)/(TMAX-TMIN)*(X1-X0);}
  function py(r){return Y1-r/RMAX*(Y1-Y0);}
  function pvs(t){return 610.94*Math.exp(17.625*t/(t+243.04));}
  function rsat(t){var p=pvs(t);return 622*p/(101325-p);}
  svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X1,y2:Y1,stroke:V("trait"),"stroke-width":"1.5"}));
  svg.appendChild(S("line",{x1:X1,y1:Y0,x2:X1,y2:Y1,stroke:V("trait"),"stroke-width":"1.5"}));
  for(var t=5;t<=30;t+=5){
    svg.appendChild(S("line",{x1:px(t),y1:Y0,x2:px(t),y2:Y1,stroke:V("trait2"),"stroke-width":"1"}));
    nom(px(t),Y1+18,String(t),"encre2","middle","s-pet");
  }
  for(var r=2;r<=14;r+=2){
    svg.appendChild(S("line",{x1:X0,y1:py(r),x2:X1,y2:py(r),stroke:V("trait2"),"stroke-width":"1"}));
    nom(X1+8,py(r)+4,String(r),"encre2","start","s-pet");
  }
  nom((X0+X1)/2,Y1+40,"température sèche, °C","encre2","middle","s-pet");
  nom(X1,Y0-12,"r, g/kg","encre2","end","s-pet");
  var d="",k=0;
  for(var tt=5;tt<=30.01;tt+=0.5){var rr=rsat(tt);if(rr>RMAX)break;
    d+=(k++?" L ":"M ")+px(tt)+" "+py(rr);}
  svg.appendChild(S("path",{d:d,fill:"none",stroke:V("froid"),"stroke-width":"3.5"}));
  nom(px(19)+6,py(rsat(19))-10,"saturation 100 %","froid","start","s-pet");

  /* les trois points : M entree, S sortie, A l'ADP */
  /* l'ADP se pose sur la courbe, il ne s'approxime pas : le point de la
     construction doit tomber sur la saturation au pixel pres. */
  var M=[27,11.1], Sx=[16,8.6], A=[8.6,rsat(8.6)];
  function pt(P,lab,coul,dx,dy,anc){
    svg.appendChild(S("circle",{cx:px(P[0]),cy:py(P[1]),r:"8",fill:V("carte"),
      stroke:V(coul),"stroke-width":"3.5"}));
    nom(px(P[0])+dx,py(P[1])+dy,lab,coul,anc||"start","s-lab");
  }
  /* l'evolution reelle, pleine ; son prolongement vers l'ADP, en pointilles */
  svg.appendChild(S("line",{x1:px(M[0]),y1:py(M[1]),x2:px(Sx[0]),y2:py(Sx[1]),
    stroke:V("chaud"),"stroke-width":"3.5"}));
  svg.appendChild(S("line",{x1:px(Sx[0]),y1:py(Sx[1]),x2:px(A[0]),y2:py(A[1]),
    stroke:V("chaud"),"stroke-width":"2","stroke-dasharray":"6 5"}));
  pt(M,"M  entrée batterie","chaud",-14,-14,"end");
  pt(Sx,"S  sortie réelle","froid",14,-14);
  pt(A,"ADP","vert",-14,18,"end");
  nom(px(A[0])+16,py(A[1])+34,"température de surface","vert","start","s-pet");
  nom(px(21),py(9.0)+26,"la droite pointe vers l'ADP","encre2","middle","s-pet");

  /* --- la coupe de batterie, a gauche --- */
  svg.appendChild(S("rect",{x:60,y:140,width:70,height:158,rx:3,fill:V("carte"),
    stroke:V("froid"),"stroke-width":"2.5"}));
  for(var i=0;i<6;i++)svg.appendChild(S("line",{x1:68+i*11,y1:146,x2:68+i*11,y2:292,
    stroke:V("froid"),"stroke-width":"1.5"}));
  nom(95,320,"batterie froide","froid","middle");
  nom(95,338,"8 rangs","encre2","middle","s-pet");
  /* l'air entre par une seule veine, puis SE PARTAGE : sans la fourche, on
     croit a deux airs differents entrant dans la batterie. */
  var YH=175, YB=262;
  svg.appendChild(S("path",{d:"M 10 218 L 34 218",stroke:V("chaud"),"stroke-width":"7"}));
  svg.appendChild(S("path",{d:"M 34 "+YH+" L 34 "+YB,stroke:V("chaud"),"stroke-width":"5"}));
  svg.appendChild(S("path",{d:"M 34 "+YH+" L 60 "+YH,stroke:V("chaud"),"stroke-width":"7"}));
  svg.appendChild(S("path",{d:"M 34 "+YB+" L 60 "+YB,stroke:V("chaud"),"stroke-width":"7",
    opacity:"0.45"}));
  nom(10,204,"M","chaud","start","s-lab");
  /* ce qui touche les ailettes en ressort sature ; le reste passe sans rien voir.
     Les deux veines vont jusqu'au point de melange : une ligne interrompue sous
     son libelle donnait l'impression de deux circuits sans rapport. */
  svg.appendChild(S("path",{d:"M 130 "+YH+" L 290 "+YH,stroke:V("vert"),"stroke-width":"7"}));
  svg.appendChild(S("path",{d:"M 130 "+YB+" L 290 "+YB,stroke:V("chaud"),"stroke-width":"7",
    opacity:"0.45"}));
  nom(150,YH-40,"saturé à l'ADP","vert","start","s-pet");
  nom(150,YH-22,"la part traitée","encre2","start","s-pet");
  nom(150,YB+26,"inchangé","chaud","start","s-pet");
  nom(150,YB+44,"la part bipassée","encre2","start","s-pet");
  /* et les deux se recombinent : c'est le point de sortie */
  svg.appendChild(S("path",{d:"M 290 "+YH+" L 320 218",stroke:V("vert"),"stroke-width":"4"}));
  svg.appendChild(S("path",{d:"M 290 "+YB+" L 320 218",stroke:V("chaud"),"stroke-width":"4",
    opacity:"0.45"}));
  svg.appendChild(S("circle",{cx:322,cy:218,r:"7",fill:V("froid")}));
  nom(318,206,"S","froid","end","s-lab");
  nom(14,364,"S est le mélange des deux — il n'est jamais saturé","encre2","start","s-pet");

  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Le point de sortie n'est <b>jamais</b> sur la courbe de saturation : c'est le "+
    "mélange de l'air traité, saturé à l'ADP, et de l'air passé entre les ailettes "+
    "sans rien changer. Le facteur de bipasse est la part du second."));
};

/* ─── les barres du calibrage U41 : une mesure, une teinte, un accent ─── */
function barres(el,opt){
  /* opt : {titre, source, lignes:[{n, v, unite, detail, accent}], max} */
  var W=880, HL=46, H=64+opt.lignes.length*HL+40;
  var X0=300, X1=770;                       /* la zone tracee */
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":opt.titre});
  svg.appendChild(S("text",{x:24,y:26,"class":"s-tit"},opt.titre.toUpperCase()));
  var mx=opt.max||Math.max.apply(null,opt.lignes.map(function(l){return l.v;}));
  var carte=E("p",{"class":"leg-schema"},opt.source||"");
  var barres=[];

  opt.lignes.forEach(function(l,i){
    var y=64+i*HL, h=24;
    var w=Math.max(3,(X1-X0)*l.v/mx);
    /* le libelle, en encre — jamais dans la couleur de la barre */
    svg.appendChild(S("text",{x:X0-14,y:y+17,"text-anchor":"end","class":"s-nom"},l.n));
    var r=S("rect",{x:X0,y:y,width:w,height:h,rx:4,
      fill:V(l.accent?"chaud":"froid"),opacity:l.accent?"0.9":"0.62"});
    svg.appendChild(r);
    /* etiquette directe : la valeur au bout de la barre, le detail en retrait.
       Un seul <text> avec deux <tspan> : le decalage est mesure par le moteur
       de rendu, jamais estime au nombre de caracteres. */
    var et=S("text",{x:X0+w+12,y:y+17,"class":"s-lab"});
    et.appendChild(S("tspan",{},l.v+(l.unite||"")));
    if(l.detail)et.appendChild(S("tspan",{dx:"10","class":"s-pet"},l.detail));
    svg.appendChild(et);
    /* zone de survol plus large que la barre */
    var z=S("rect",{x:0,y:y-8,width:W,height:h+16,fill:"transparent"});
    svg.appendChild(z);
    barres.push({r:r,l:l});
    z.addEventListener("mouseenter",function(){
      barres.forEach(function(b){b.r.setAttribute("opacity",b.r===r?"1":"0.22");});
      carte.innerHTML="<b>"+l.n+"</b> — "+(l.aide||l.detail||"");});
    z.addEventListener("mouseleave",function(){
      barres.forEach(function(b){
        b.r.setAttribute("opacity",b.l.accent?"0.9":"0.62");});
      carte.textContent=opt.source||"";});
  });
  el.appendChild(svg);
  (el.parentNode||el).appendChild(carte);
}

SCHEMAS["nature-travail"]=function(el){
  barres(el,{
    titre:"Ce que l'épreuve demande de faire — 227 consignes, sessions 2018 à 2026",
    source:"Survolez une ligne. Comptage par question, non pondéré par les points.",
    max:100,
    lignes:[
      {n:"Extraire du dossier",v:40,unite:" %",detail:"91 consignes",
       aide:"indiquer, donner, identifier, préciser, citer, lister, relever, "+
            "rechercher, nommer, repérer"},
      {n:"Justifier, expliquer",v:23,unite:" %",detail:"53 consignes",
       aide:"justifier, expliquer, conclure, montrer, décrire, argumenter, comparer"},
      {n:"Produire un graphique",v:18,unite:" %",detail:"40 consignes",
       aide:"compléter, représenter, surligner, tracer, positionner, dessiner"},
      {n:"Calculer",v:17,unite:" %",detail:"39 consignes",accent:true,
       aide:"déterminer, calculer, vérifier, estimer, évaluer — moins d'un "+
            "cinquième du travail, et souvent l'essentiel du temps de formation"},
      {n:"Proposer, choisir",v:2,unite:" %",detail:"4 consignes",
       aide:"proposer — marginal, mais toujours en fin de partie"}
    ]});
};

SCHEMAS["poids-themes"]=function(el){
  barres(el,{
    titre:"Poids des thèmes — cumul des temps conseillés, sessions 2024 à 2026",
    source:"Survolez une ligne. 645 minutes cumulées sur trois sessions.",
    max:150,
    lignes:[
      {n:"Régulation et GTB",v:140,unite:" min",detail:"22 %",accent:true,
       aide:"présent à chaque session — et c'est le cœur de métier de l'option C"},
      {n:"Traitement d'air, CTA",v:125,unite:" min",detail:"19 %",accent:true,
       aide:"présent à chaque session — et donné comme le plus redouté"},
      {n:"Hydraulique, ECS",v:120,unite:" min",detail:"19 %",accent:true,
       aide:"présent à chaque session — sous-station, réseaux, eau chaude sanitaire"},
      {n:"Production, froid",v:115,unite:" min",detail:"18 %",
       aide:"absent en 2026 : le seul grand thème qui puisse sauter une session"},
      {n:"Thermique du bâtiment",v:85,unite:" min",detail:"13 %",
       aide:"absent en 2025, mais 65 minutes à lui seul en 2026"},
      {n:"Analyse de dossier",v:30,unite:" min",detail:"5 %",
       aide:"une partie dédiée en 2025 — ailleurs, la compétence est diffuse"},
      {n:"Photovoltaïque, EnR",v:30,unite:" min",detail:"5 %",
       aide:"nouveau en 2026 ; à surveiller sur les prochaines sessions"}
    ]});
};

/* ═══════════════════════════════════════════════════ SCHEMAS — CAP
   Consolidation maths. Rien de thermique ici : ce sont les six images qui
   manquaient aux fiches, et qu'aucun polycopie ne portait. Elles servent
   plusieurs fiches chacune — la barre des fractions revient en proportion,
   la droite graduee en lecture de graphique. */

/* ─────────── le tableau des rangs, et la virgule qui glisse ─────────── */
SCHEMAS["virgule-rangs"]=function(el){
  var W=724,H=250,X0=64,CW=88,Y0=64,RH=52;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Tableau des rangs : multiplier par 10 décale les chiffres d'une colonne"});
  var rangs=["centaines","dizaines","unités","dixièmes","centièmes"];
  var i;
  for(i=0;i<5;i++){
    var x=X0+i*CW;
    svg.appendChild(S("rect",{x:x,y:Y0,width:CW,height:RH*2,fill:"none",
      stroke:V("trait"),"stroke-width":"1"}));
    svg.appendChild(S("text",{x:x+CW/2,y:Y0-14,"text-anchor":"middle","class":"s-tit"},
      rangs[i].toUpperCase()));
  }
  /* la virgule tombe entre unites et dixiemes */
  var xv=X0+3*CW;
  svg.appendChild(S("line",{x1:xv,y1:Y0-4,x2:xv,y2:Y0+RH*2+4,stroke:V("chaud"),
    "stroke-width":"2.5"}));
  svg.appendChild(S("text",{x:xv,y:Y0+RH*2+24,"text-anchor":"middle","class":"s-tit",
    fill:V("chaud")},"LA VIRGULE NE BOUGE PAS"));

  function pose(rang,chiffre,ligne,couleur){
    svg.appendChild(S("text",{x:X0+rang*CW+CW/2,y:Y0+ligne*RH+RH/2+8,
      "text-anchor":"middle","class":"s-lab",fill:V(couleur),
      style:"font-size:24px"},chiffre));
  }
  /* ligne 1 : 3,45 */
  pose(2,"3",0,"encre"); pose(3,"4",0,"encre"); pose(4,"5",0,"encre");
  svg.appendChild(S("text",{x:X0-12,y:Y0+RH/2+8,"text-anchor":"end","class":"s-nom"},
    "3,45"));
  /* ligne 2 : 34,5 — chaque chiffre a saute d'une colonne vers la gauche */
  pose(1,"3",1,"froid"); pose(2,"4",1,"froid"); pose(3,"5",1,"froid");
  svg.appendChild(S("text",{x:X0-12,y:Y0+RH+RH/2+8,"text-anchor":"end","class":"s-nom",
    fill:V("froid")},"34,5"));
  for(i=2;i<5;i++){
    var xa=X0+i*CW+CW/2, xb=xa-CW;
    svg.appendChild(S("path",{d:"M "+(xa-14)+" "+(Y0+RH-8)+" q -"+(CW/2)+" 16 -"+
      (CW-28)+" 0",fill:"none",stroke:V("froid"),"stroke-width":"1.5",
      "marker-end":"url(#fl-cap)"}));
  }
  var defs=S("defs",{});
  var mk=S("marker",{id:"fl-cap",viewBox:"0 0 10 10",refX:"9",refY:"5",
    markerWidth:"6",markerHeight:"6",orient:"auto-start-reverse"});
  mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V("froid")}));
  defs.appendChild(mk); svg.appendChild(defs);
  svg.appendChild(S("text",{x:X0+5*CW+34,y:Y0+RH+RH/2+8,"text-anchor":"start","class":"s-nom",
    fill:V("froid")},"× 10"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Multiplier par 10, c'est faire monter <b>chaque chiffre d'une colonne</b>. "+
    "Comme il est plus rapide de déplacer un seul signe que trois chiffres, on "+
    "bouge la virgule dans l'autre sens — mais c'est le même mouvement."));
};

/* ─────────── poser : les virgules l'une sous l'autre ─────────── */
SCHEMAS["poser-virgules"]=function(el){
  var W=724,H=230;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Deux soustractions posées, l'une alignée sur la virgule, l'autre sur la droite"});
  function bloc(x0,titre,coul,a,b,res,xv,barre){
    svg.appendChild(S("text",{x:x0+96,y:30,"text-anchor":"middle","class":"s-tit",
      fill:V(coul)},titre));
    svg.appendChild(S("rect",{x:x0,y:44,width:250,height:H-70,rx:"8",fill:"none",
      stroke:V(coul),"stroke-width":"1.5",opacity:"0.55"}));
    svg.appendChild(S("line",{x1:x0+xv,y1:56,x2:x0+xv,y2:H-40,stroke:V(coul),
      "stroke-width":"1.5","stroke-dasharray":"4 4"}));
    [a,b].forEach(function(t,i){
      svg.appendChild(S("text",{x:x0+220,y:92+i*36,"text-anchor":"end","class":"s-lab",
        style:"font-size:22px"},t));
    });
    svg.appendChild(S("line",{x1:x0+40,y1:140,x2:x0+220,y2:140,stroke:V("encre2"),
      "stroke-width":"1.5"}));
    svg.appendChild(S("text",{x:x0+220,y:176,"text-anchor":"end","class":"s-lab",
      fill:V(coul),style:"font-size:22px"},res));
    if(barre){
      svg.appendChild(S("line",{x1:x0+150,y1:158,x2:x0+224,y2:190,stroke:V("chaud"),
        "stroke-width":"2.5"}));
      svg.appendChild(S("line",{x1:x0+224,y1:158,x2:x0+150,y2:190,stroke:V("chaud"),
        "stroke-width":"2.5"}));
    }
  }
  bloc(40,"ALIGNÉ SUR LA VIRGULE","vert","40,0","−  3,6","36,4",148,false);
  bloc(420,"ALIGNÉ SUR LA DROITE","chaud","40","−  3,6","?",210,true);
  svg.appendChild(S("text",{x:88,y:H-14,"text-anchor":"start","class":"s-pet",
    fill:V("vert")},"le zéro ajouté occupe la colonne"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "40 s'écrit <b>40,0</b> avant d'être posé. Le zéro n'ajoute aucune valeur : "+
    "il occupe une colonne, pour que le calcul tombe juste."));
};

/* ─────────── decomposer un produit : le rectangle ─────────── */
SCHEMAS["decomposer"]=function(el){
  var W=724,H=304,X0=120,Y0=54,U=32;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"12 fois 15 vu comme deux rectangles, 12 fois 10 et 12 fois 5"});
  var h=12*U/2, w10=10*U, w5=5*U;
  svg.appendChild(S("rect",{x:X0,y:Y0,width:w10,height:h,fill:V("froid"),
    opacity:"0.18",stroke:V("froid"),"stroke-width":"1.5"}));
  svg.appendChild(S("rect",{x:X0+w10,y:Y0,width:w5,height:h,fill:V("vert"),
    opacity:"0.18",stroke:V("vert"),"stroke-width":"1.5"}));
  svg.appendChild(S("text",{x:X0+w10/2,y:Y0+h/2+8,"text-anchor":"middle",
    "class":"s-lab",fill:V("froid"),style:"font-size:26px"},"120"));
  svg.appendChild(S("text",{x:X0+w10+w5/2,y:Y0+h/2+8,"text-anchor":"middle",
    "class":"s-lab",fill:V("vert"),style:"font-size:26px"},"60"));
  svg.appendChild(S("text",{x:X0+w10/2,y:Y0-14,"text-anchor":"middle","class":"s-nom"},
    "10"));
  svg.appendChild(S("text",{x:X0+w10+w5/2,y:Y0-14,"text-anchor":"middle","class":"s-nom"},
    "5"));
  svg.appendChild(S("text",{x:X0-16,y:Y0+h/2+5,"text-anchor":"end","class":"s-nom"},
    "12"));
  svg.appendChild(S("text",{x:X0,y:Y0+h+40,"text-anchor":"start","class":"s-lab",
    style:"font-size:20px"},"12 × 15   =   12 × 10   +   12 × 5   =   120 + 60   =   180"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Le rectangle entier fait 12 sur 15. On le coupe en deux morceaux faciles, "+
    "et <b>on recolle</b> : c'est l'étape qu'on oublie le plus souvent."));
};

/* ─────────── la barre des fractions ─────────── */
SCHEMAS["fractions-barre"]=function(el){
  var W=724,H=312,X0=100,LB=520,Y0=48,BH=42,EC=22;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Une barre de 80 partagée en moitiés, en quarts et en tiers"});
  function bande(y,n,etiq,coul,valeurs){
    var i;
    for(i=0;i<n;i++){
      svg.appendChild(S("rect",{x:X0+i*LB/n,y:y,width:LB/n,height:BH,
        fill:V(coul),opacity:i%2?"0.14":"0.26",stroke:V(coul),"stroke-width":"1.2"}));
      svg.appendChild(S("text",{x:X0+(i+0.5)*LB/n,y:y+BH/2+6,"text-anchor":"middle",
        "class":"s-lab"},valeurs));
    }
    svg.appendChild(S("text",{x:X0-16,y:y+BH/2+5,"text-anchor":"end","class":"s-nom"},
      etiq));
  }
  svg.appendChild(S("rect",{x:X0,y:Y0,width:LB,height:BH,fill:V("encre2"),
    opacity:"0.10",stroke:V("encre2"),"stroke-width":"1.2"}));
  svg.appendChild(S("text",{x:X0+LB/2,y:Y0+BH/2+7,"text-anchor":"middle","class":"s-lab",
    style:"font-size:20px"},"80"));
  svg.appendChild(S("text",{x:X0-16,y:Y0+BH/2+5,"text-anchor":"end","class":"s-nom"},
    "le tout"));
  bande(Y0+BH+EC,2,"moitiés","froid","40");
  bande(Y0+2*(BH+EC),4,"quarts","vert","20");
  bande(Y0+3*(BH+EC),3,"tiers","violet","26,7");
  svg.appendChild(S("text",{x:X0,y:Y0+3*(BH+EC)+BH+22,"text-anchor":"start",
    "class":"s-pet",fill:V("violet")},"les tiers ne tombent jamais ronds"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Trois quarts, ce sont <b>trois cases sur quatre</b> — soit le tout moins un "+
    "quart. La bande des tiers ne tombe pas ronde, et c'est normal."));
};

/* ─────────── la droite graduee : 0,75 contre 0,8 ─────────── */
SCHEMAS["droite-graduee"]=function(el){
  var W=724,H=200,X0=70,X1=660,Y=100;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Droite graduée de 0,70 à 0,90, avec 0,75 et 0,80 placés"});
  function x(v){return X0+(v-0.70)/0.20*(X1-X0);}
  svg.appendChild(S("line",{x1:X0,y1:Y,x2:X1,y2:Y,stroke:V("encre2"),
    "stroke-width":"2"}));
  var i;
  for(i=0;i<=20;i++){
    var v=0.70+i*0.01, gros=(i%5===0);
    svg.appendChild(S("line",{x1:x(v),y1:Y-(gros?11:6),x2:x(v),y2:Y+(gros?11:6),
      stroke:V(gros?"encre2":"trait"),"stroke-width":gros?"1.6":"1"}));
    if(gros)svg.appendChild(S("text",{x:x(v),y:Y+32,"text-anchor":"middle",
      "class":"s-pet"},frs(v,2)));
  }
  [[0.75,"0,75","chaud",-1],[0.80,"0,8","froid",1]].forEach(function(p){
    svg.appendChild(S("circle",{cx:x(p[0]),cy:Y,r:"7",fill:V(p[2])}));
    var yy=Y+(p[3]<0?-46:66);   /* en dessous : sous les graduations */
    svg.appendChild(S("line",{x1:x(p[0]),y1:Y+p[3]*10,x2:x(p[0]),y2:yy-p[3]*8,
      stroke:V(p[2]),"stroke-width":"1.4"}));
    svg.appendChild(S("text",{x:x(p[0]),y:yy+(p[3]<0?0:6),"text-anchor":"middle",
      "class":"s-lab",fill:V(p[2]),style:"font-size:20px"},p[1]));
  });
  svg.appendChild(S("text",{x:X1,y:Y-46,"text-anchor":"end","class":"s-tit",
    fill:V("froid")},"0,8 EST À DROITE, DONC PLUS GRAND"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "0,8 s'écrit aussi <b>0,80</b>. Sur la droite, il n'y a plus à discuter : "+
    "il est après 0,75, donc il est plus grand — malgré ses deux chiffres de moins."));
};

/* ─────────── arrondir : trois sens, une seule regle du 5 ─────────── */
SCHEMAS["arrondir-sens"]=function(el){
  var W=724,H=250,X0=140,X1=580,Y=86;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"24,3 entre 24 et 25, et les trois sens d'arrondi"});
  svg.appendChild(S("line",{x1:X0-40,y1:Y,x2:X1+40,y2:Y,stroke:V("encre2"),
    "stroke-width":"2"}));
  [[X0,"24"],[X1,"25"]].forEach(function(b){
    svg.appendChild(S("line",{x1:b[0],y1:Y-12,x2:b[0],y2:Y+12,stroke:V("encre2"),
      "stroke-width":"2"}));
    svg.appendChild(S("text",{x:b[0],y:Y-22,"text-anchor":"middle","class":"s-lab",
      style:"font-size:19px"},b[1]));
  });
  var xv=X0+0.3*(X1-X0);
  svg.appendChild(S("circle",{cx:xv,cy:Y,r:"7",fill:V("chaud")}));
  svg.appendChild(S("text",{x:xv,y:Y-24,"text-anchor":"middle","class":"s-lab",
    fill:V("chaud"),style:"font-size:19px"},"24,3"));
  var lignes=[["au plus proche","24","vert",1],
              ["pour COMMANDER","25","froid",2],
              ["ce qui TIENT dedans","24","violet",3]];
  lignes.forEach(function(l){
    var y=Y+22+l[3]*38, cible=(l[1]==="24")?X0:X1;
    svg.appendChild(S("line",{x1:xv,y1:y,x2:cible,y2:y,stroke:V(l[2]),
      "stroke-width":"2","marker-end":"url(#fl-ar)"}));
    svg.appendChild(S("text",{x:xv+(cible>xv?14:-14),y:y-8,
      "text-anchor":cible>xv?"start":"end","class":"s-nom",fill:V(l[2])},l[0]));
    svg.appendChild(S("text",{x:cible+(cible>xv?16:-16),y:y+5,
      "text-anchor":cible>xv?"start":"end","class":"s-lab",fill:V(l[2])},l[1]));
  });
  var defs=S("defs",{});
  var mk=S("marker",{id:"fl-ar",viewBox:"0 0 10 10",refX:"9",refY:"5",
    markerWidth:"6",markerHeight:"6",orient:"auto-start-reverse"});
  mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V("encre2")}));
  defs.appendChild(mk); svg.appendChild(defs);
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "La règle du 5 donne le nombre le plus proche. <b>Elle ne dit pas ce qu'il "+
    "faut faire</b> : c'est la situation qui décide, et une commande s'arrondit "+
    "toujours au-dessus."));
};

/* ─────────── priorites : les memes touches, deux resultats ─────────── */
SCHEMAS["priorites"]=function(el){
  var W=724,H=250;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"12 + 8 divisé par 4, avec et sans parenthèses"});
  function ligne(y,touches,ordre,res,coul,note){
    var x=70,i;
    touches.forEach(function(t,k){
      var l=t.length*15+22;
      svg.appendChild(S("rect",{x:x,y:y,width:l,height:44,rx:"6",
        fill:V("carte2"),stroke:V("trait"),"stroke-width":"1"}));
      svg.appendChild(S("text",{x:x+l/2,y:y+29,"text-anchor":"middle","class":"s-lab",
        style:"font-size:20px"},t));
      if(ordre[k]){
        svg.appendChild(S("circle",{cx:x+l/2,cy:y-14,r:"11",fill:V(coul)}));
        svg.appendChild(S("text",{x:x+l/2,y:y-10,"text-anchor":"middle","class":"s-tit",
          fill:V("fond")},ordre[k]));
      }
      x+=l+8;
    });
    svg.appendChild(S("text",{x:x+18,y:y+29,"text-anchor":"start","class":"s-lab",
      fill:V(coul),style:"font-size:22px"},"= "+res));
    svg.appendChild(S("text",{x:70,y:y+66,"text-anchor":"start","class":"s-pet",
      fill:V(coul)},note));
  }
  ligne(52,["12","+","8","÷","4"],["","","","1",""],"14","chaud",
    "la machine divise d'abord : 8 ÷ 4 = 2, puis 12 + 2");
  ligne(160,["(","12","+","8",")","÷","4"],["","","1","","","2",""],"5","vert",
    "les parenthèses passent devant : 12 + 8 = 20, puis 20 ÷ 4");
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Les mêmes touches, dans le même ordre. <b>Seules les parenthèses changent</b>, "+
    "et le résultat passe de 14 à 5."));
};

/* ─────────── B · milli, unité, kilo ─────────── */
SCHEMAS["echelle-prefixes"]=function(el){
  var W=724,H=236,Y=104;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Milli, unité et kilo, séparés par des facteurs mille"});
  var cases=[[122,"milli","mA · mm · mL","froid"],[362,"l'unité","A · m · L","encre"],
             [602,"kilo","kΩ · kg · km","chaud"]];
  cases.forEach(function(c){
    svg.appendChild(S("rect",{x:c[0]-92,y:Y-42,width:184,height:84,rx:"10",
      fill:V("carte2"),stroke:V(c[3]),"stroke-width":"1.8"}));
    svg.appendChild(S("text",{x:c[0],y:Y-8,"text-anchor":"middle","class":"s-lab",
      fill:V(c[3]),style:"font-size:21px"},c[1]));
    svg.appendChild(S("text",{x:c[0],y:Y+22,"text-anchor":"middle","class":"s-pet"},c[2]));
  });
  var defs=S("defs",{});
  ["fl-pre-h","fl-pre-b"].forEach(function(id,i){
    var mk=S("marker",{id:id,viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"6",
      markerHeight:"6",orient:"auto-start-reverse"});
    mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V(i?"froid":"chaud")}));
    defs.appendChild(mk);
  });
  svg.appendChild(defs);
  [[122,362],[362,602]].forEach(function(p){
    var m=(p[0]+p[1])/2;
    svg.appendChild(S("path",{d:"M "+(p[0]+96)+" "+(Y-26)+" q "+((p[1]-p[0])/2-48)+" -34 "+
      (p[1]-p[0]-192)+" 0",fill:"none",stroke:V("chaud"),"stroke-width":"2",
      "marker-end":"url(#fl-pre-h)"}));
    svg.appendChild(S("text",{x:m,y:Y-52,"text-anchor":"middle","class":"s-nom",
      fill:V("chaud")},"÷ 1 000"));
    svg.appendChild(S("path",{d:"M "+(p[1]-96)+" "+(Y+26)+" q -"+((p[1]-p[0])/2-48)+" 34 -"+
      (p[1]-p[0]-192)+" 0",fill:"none",stroke:V("froid"),"stroke-width":"2",
      "marker-end":"url(#fl-pre-b)"}));
    svg.appendChild(S("text",{x:m,y:Y+70,"text-anchor":"middle","class":"s-nom",
      fill:V("froid")},"× 1 000"));
  });
  svg.appendChild(S("text",{x:W/2,y:H-12,"text-anchor":"middle","class":"s-pet"},
    "250 mA = 0,250 A   ·   1,8 kΩ = 1 800 Ω"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Un seul facteur à retenir : <b>mille</b>. Vers la droite le nombre <b>rétrécit</b> "+
    "— 250 mA font 0,250 A ; vers la gauche il <b>grandit</b> — 1,8 kΩ font 1 800 Ω."));
};

/* ─────────── B · l'escalier des longueurs ─────────── */
SCHEMAS["escalier-longueurs"]=function(el){
  var W=724,H=250,Y=118,X=[110,290,470,650];
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Mètre, décimètre, centimètre, millimètre : un facteur dix à chaque marche"});
  var noms=["m","dm","cm","mm"];
  noms.forEach(function(n,i){
    svg.appendChild(S("rect",{x:X[i]-46,y:Y-30,width:92,height:60,rx:"8",
      fill:V("carte2"),stroke:V("trait"),"stroke-width":"1.5"}));
    svg.appendChild(S("text",{x:X[i],y:Y+10,"text-anchor":"middle","class":"s-lab",
      style:"font-size:24px"},n));
  });
  var defs=S("defs",{});
  var mk=S("marker",{id:"fl-lon",viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"6",
    markerHeight:"6",orient:"auto-start-reverse"});
  mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V("froid")}));
  defs.appendChild(mk); svg.appendChild(defs);
  for(var i=0;i<3;i++){
    svg.appendChild(S("path",{d:"M "+(X[i]+50)+" "+(Y-18)+" q 44 -30 88 0",fill:"none",
      stroke:V("froid"),"stroke-width":"2","marker-end":"url(#fl-lon)"}));
    svg.appendChild(S("text",{x:(X[i]+X[i+1])/2,y:Y-42,"text-anchor":"middle",
      "class":"s-nom",fill:V("froid")},"× 10"));
  }
  svg.appendChild(S("path",{d:"M "+(X[0])+" "+(Y+40)+" q 270 62 540 0",fill:"none",
    stroke:V("chaud"),"stroke-width":"2","stroke-dasharray":"6 4"}));
  svg.appendChild(S("text",{x:W/2,y:H-16,"text-anchor":"middle","class":"s-nom",
    fill:V("chaud")},"du mètre au millimètre : × 1 000, en une fois"));
  svg.appendChild(S("text",{x:X[0],y:Y-58,"text-anchor":"middle","class":"s-pet"},"2,45"));
  svg.appendChild(S("text",{x:X[3],y:Y-58,"text-anchor":"middle","class":"s-pet"},"2 450"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Quatre marches, <b>un facteur dix à chaque fois</b>. Sauter directement du mètre "+
    "au millimètre, c'est franchir trois marches d'un coup : × 1 000."));
};

/* ─────────── B · le mètre carré, découpé pour de vrai ─────────── */
SCHEMAS["carre-cm"]=function(el){
  var W=724,H=330,C=246,X0=180,Y0=44,N=10;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un mètre carré découpé en cent carrés de un décimètre de côté"});
  var p=C/N,i;
  svg.appendChild(S("rect",{x:X0,y:Y0,width:C,height:C,fill:V("froid"),opacity:"0.10",
    stroke:V("froid"),"stroke-width":"2.5"}));
  for(i=1;i<N;i++){
    svg.appendChild(S("line",{x1:X0+i*p,y1:Y0,x2:X0+i*p,y2:Y0+C,stroke:V("froid"),
      "stroke-width":"0.8",opacity:"0.75"}));
    svg.appendChild(S("line",{x1:X0,y1:Y0+i*p,x2:X0+C,y2:Y0+i*p,stroke:V("froid"),
      "stroke-width":"0.8",opacity:"0.75"}));
  }
  /* une case mise en avant : 1 dm² = 100 cm² */
  svg.appendChild(S("rect",{x:X0,y:Y0,width:p,height:p,fill:V("chaud"),opacity:"0.5"}));
  svg.appendChild(S("line",{x1:X0+p,y1:Y0+p/2,x2:X0+C+70,y2:Y0-6,stroke:V("chaud"),
    "stroke-width":"1.2"}));
  svg.appendChild(S("text",{x:X0+C+76,y:Y0-2,"text-anchor":"start","class":"s-nom",
    fill:V("chaud")},"1 dm² = 100 cm²"));
  svg.appendChild(S("text",{x:X0+C+76,y:Y0+24,"text-anchor":"start","class":"s-pet"},
    "et il y en a cent"));
  svg.appendChild(S("text",{x:X0+C/2,y:Y0-16,"text-anchor":"middle","class":"s-nom"},
    "1 m = 100 cm"));
  svg.appendChild(S("text",{x:X0-14,y:Y0+C/2+5,"text-anchor":"end","class":"s-nom"},
    "1 m"));
  svg.appendChild(S("text",{x:X0+C/2,y:Y0+C+34,"text-anchor":"middle","class":"s-lab",
    fill:V("froid"),style:"font-size:21px"},"1 m² = 100 × 100 = 10 000 cm²"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Le côté est multiplié par 100, mais l'aire l'est <b>deux fois</b> : une fois en "+
    "longueur, une fois en largeur. D'où les <b>quatre zéros</b>, et non deux."));
};

/* ─────────── B · le mètre cube et le litre ─────────── */
SCHEMAS["cube-litre"]=function(el){
  var W=724,H=320,ox=250,oy=250,A=170,F=64;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un mètre cube contient mille cubes d'un décimètre, soit mille litres"});
  function P(x,y,z){return [ox+x*A+y*F*0.62, oy-z*A-y*F*0.5];}
  var s=[P(0,0,0),P(1,0,0),P(1,0,1),P(0,0,1)],
      t=[P(0,1,1),P(1,1,1),P(1,1,0)];
  function poly(pts,f,o){
    svg.appendChild(S("polygon",{points:pts.map(function(q){return q.join(",");}).join(" "),
      fill:V(f),opacity:o,stroke:V("froid"),"stroke-width":"1.6"}));
  }
  poly([s[3],t[0],t[1],s[2]],"froid","0.10");        /* dessus */
  poly([s[1],t[2],t[1],s[2]],"froid","0.16");        /* cote droit */
  poly(s,"froid","0.22");                            /* face */
  var i;
  for(i=1;i<10;i++){
    var a=P(i/10,0,0),b=P(i/10,0,1);
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V("froid"),
      "stroke-width":"0.6",opacity:"0.7"}));
    var c=P(0,0,i/10),d=P(1,0,i/10);
    svg.appendChild(S("line",{x1:c[0],y1:c[1],x2:d[0],y2:d[1],stroke:V("froid"),
      "stroke-width":"0.6",opacity:"0.7"}));
  }
  var q=[P(0,0,0),P(0.1,0,0),P(0.1,0,0.1),P(0,0,0.1)];
  poly(q,"chaud","0.55");
  svg.appendChild(S("text",{x:ox+A+96,y:oy-A/2-16,"text-anchor":"start","class":"s-lab",
    style:"font-size:21px"},"1 m³ = 1 000 dm³"));
  svg.appendChild(S("text",{x:ox+A+96,y:oy-A/2+14,"text-anchor":"start","class":"s-lab",
    fill:V("froid"),style:"font-size:21px"},"1 m³ = 1 000 L"));
  svg.appendChild(S("text",{x:ox+A+96,y:oy-A/2+48,"text-anchor":"start","class":"s-nom",
    fill:V("chaud")},"1 dm³ = 1 litre"));
  svg.appendChild(S("text",{x:ox+A/2,y:oy+28,"text-anchor":"middle","class":"s-nom"},
    "1 m"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Dix cubes en longueur, dix en largeur, dix en hauteur : <b>mille au total</b>. "+
    "Et le petit cube d'un décimètre de côté, c'est exactement <b>un litre</b>."));
};

/* ─────────── B · l'heure, en minutes et en décimal ─────────── */
SCHEMAS["heure-decimale"]=function(el){
  var W=724,H=250,X0=90,LB=544,Y=100,BH=52;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Une heure en minutes et la même en heures décimales"});
  var i;
  for(i=0;i<4;i++){
    svg.appendChild(S("rect",{x:X0+i*LB/4,y:Y,width:LB/4,height:BH,
      fill:V("froid"),opacity:i%2?"0.12":"0.22",stroke:V("froid"),"stroke-width":"1.2"}));
    svg.appendChild(S("text",{x:X0+(i+0.5)*LB/4,y:Y+BH/2+6,"text-anchor":"middle",
      "class":"s-lab"},"15 min"));
  }
  var reps=[[0,"0 min","0 h"],[1,"15 min","0,25 h"],[2,"30 min","0,5 h"],
            [3,"45 min","0,75 h"],[4,"60 min","1 h"]];
  reps.forEach(function(r){
    var x=X0+r[0]*LB/4;
    svg.appendChild(S("line",{x1:x,y1:Y-10,x2:x,y2:Y+BH+10,stroke:V("encre2"),
      "stroke-width":"1.4"}));
    svg.appendChild(S("text",{x:x,y:Y-20,"text-anchor":"middle","class":"s-pet"},r[1]));
    svg.appendChild(S("text",{x:x,y:Y+BH+32,"text-anchor":"middle","class":"s-lab",
      fill:V("vert")},r[2]));
  });
  svg.appendChild(S("text",{x:X0,y:H-24,"text-anchor":"start","class":"s-lab",
    fill:V("chaud"),style:"font-size:19px"},"30 min ne s'écrit jamais 0,30 h"));
  svg.appendChild(S("line",{x1:X0+266,y1:H-40,x2:X0+340,y2:H-18,stroke:V("chaud"),
    "stroke-width":"2.5"}));
  svg.appendChild(S("line",{x1:X0+340,y1:H-40,x2:X0+266,y2:H-18,stroke:V("chaud"),
    "stroke-width":"2.5"}));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Une heure vaut <b>60</b> minutes, pas 100. La demi-heure s'écrit donc <b>0,5 h</b>, "+
    "et le quart d'heure <b>0,25 h</b> — jamais 0,30 ni 0,15."));
};

/* ─────────── B · des km/h aux m/s ─────────── */
SCHEMAS["kmh-ms"]=function(el){
  var W=724,H=240,X0=90,X1=650,YA=76,YB=176,VMAX=130;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Deux axes parallèles : les kilomètres-heure et les mètres par seconde"});
  function x(v){return X0+v/VMAX*(X1-X0);}
  [[YA,"km/h","chaud"],[YB,"m/s","froid"]].forEach(function(a){
    svg.appendChild(S("line",{x1:X0,y1:a[0],x2:X1,y2:a[0],stroke:V("encre2"),
      "stroke-width":"2"}));
    svg.appendChild(S("text",{x:X0-14,y:a[0]+5,"text-anchor":"end","class":"s-nom",
      fill:V(a[2])},a[1]));
  });
  [[18,5],[36,10],[72,20],[90,25],[126,35]].forEach(function(p){
    var xx=x(p[0]);
    svg.appendChild(S("line",{x1:xx,y1:YA-8,x2:xx,y2:YA+8,stroke:V("chaud"),
      "stroke-width":"1.6"}));
    svg.appendChild(S("line",{x1:xx,y1:YB-8,x2:xx,y2:YB+8,stroke:V("froid"),
      "stroke-width":"1.6"}));
    svg.appendChild(S("line",{x1:xx,y1:YA+10,x2:xx,y2:YB-10,stroke:V("trait"),
      "stroke-width":"1","stroke-dasharray":"3 3"}));
    svg.appendChild(S("text",{x:xx,y:YA-16,"text-anchor":"middle","class":"s-lab"},
      String(p[0])));
    svg.appendChild(S("text",{x:xx,y:YB+28,"text-anchor":"middle","class":"s-lab",
      fill:V("froid")},String(p[1])));
  });
  svg.appendChild(S("text",{x:W/2,y:(YA+YB)/2+6,"text-anchor":"middle","class":"s-lab",
    fill:V("vert"),style:"font-size:20px"},"÷ 3,6"));
  svg.appendChild(S("text",{x:X0,y:H-14,"text-anchor":"start","class":"s-pet"},
    "90 km/h, c'est 25 m/s : en une seconde, un camion parcourt un quart de terrain de handball"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Un seul nombre à retenir : <b>3,6</b>. Des km/h vers les m/s on divise, dans "+
    "l'autre sens on multiplie — et <b>36 km/h = 10 m/s</b> sert de repère."));
};

/* ─────────── C · le tableau de proportionnalité et son coefficient ─────────── */
SCHEMAS["tableau-propo"]=function(el){
  var W=724,H=250,X0=126,CW=96,Y0=62,RH=54;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un tableau de proportionnalité et son coefficient"});
  var haut=["0","1","5","20","50"], bas=["0","2,40","12","48","120"];
  var i;
  for(i=0;i<5;i++){
    var x=X0+i*CW, z=(i===0);
    [0,1].forEach(function(r){
      svg.appendChild(S("rect",{x:x,y:Y0+r*RH,width:CW,height:RH,
        fill:V(z?"vert":"carte2"),opacity:z?"0.18":"1",
        stroke:V("trait"),"stroke-width":"1.2"}));
      svg.appendChild(S("text",{x:x+CW/2,y:Y0+r*RH+RH/2+7,"text-anchor":"middle",
        "class":"s-lab",style:"font-size:19px"},r?bas[i]:haut[i]));
    });
  }
  svg.appendChild(S("text",{x:X0-14,y:Y0+RH/2+5,"text-anchor":"end","class":"s-nom"},
    "longueur (m)"));
  svg.appendChild(S("text",{x:X0-14,y:Y0+RH+RH/2+5,"text-anchor":"end","class":"s-nom"},
    "prix (€)"));
  var defs=S("defs",{});
  var mk=S("marker",{id:"fl-pro",viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"6",
    markerHeight:"6",orient:"auto-start-reverse"});
  mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V("froid")}));
  defs.appendChild(mk); svg.appendChild(defs);
  for(i=1;i<5;i++){
    var xx=X0+i*CW+CW-16;
    svg.appendChild(S("line",{x1:xx,y1:Y0+RH-10,x2:xx,y2:Y0+RH+12,stroke:V("froid"),
      "stroke-width":"1.6","marker-end":"url(#fl-pro)"}));
  }
  svg.appendChild(S("text",{x:X0+5*CW+16,y:Y0+RH+6,"text-anchor":"start","class":"s-lab",
    fill:V("froid"),style:"font-size:20px"},"× 2,40"));
  svg.appendChild(S("text",{x:X0+CW/2,y:Y0+2*RH+28,"text-anchor":"middle","class":"s-nom",
    fill:V("vert")},"la colonne qui prouve tout"));
  svg.appendChild(S("text",{x:X0,y:Y0+2*RH+56,"text-anchor":"start","class":"s-pet"},
    "pour zéro mètre, on paie zéro euro — sinon ce n'est pas de la proportionnalité"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Un seul coefficient, <b>le même dans toutes les colonnes</b>. C'est la définition, "+
    "et la colonne du zéro suffit souvent à démasquer une fausse proportionnalité."));
};

/* ─────────── C · forfait plus part variable ─────────── */
SCHEMAS["forfait-variable"]=function(el){
  var W=724,H=330,X0=112,X1=590,Y0=36,Y1=262,JMAX=10,EMAX=1000;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Deux offres de location : une proportionnelle, une avec forfait"});
  function x(j){return X0+j/JMAX*(X1-X0);}
  function y(e){return Y1-e/EMAX*(Y1-Y0);}
  svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X1+18,y2:Y1,stroke:V("encre2"),
    "stroke-width":"1.8"}));
  svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X0,y2:Y0-8,stroke:V("encre2"),
    "stroke-width":"1.8"}));
  var j;
  for(j=0;j<=JMAX;j+=2){
    svg.appendChild(S("line",{x1:x(j),y1:Y1,x2:x(j),y2:Y1+6,stroke:V("encre2"),
      "stroke-width":"1.2"}));
    svg.appendChild(S("text",{x:x(j),y:Y1+24,"text-anchor":"middle","class":"s-pet"},
      String(j)));
  }
  [0,250,500,750,1000].forEach(function(e){
    svg.appendChild(S("line",{x1:X0-6,y1:y(e),x2:X0,y2:y(e),stroke:V("encre2"),
      "stroke-width":"1.2"}));
    svg.appendChild(S("text",{x:X0-12,y:y(e)+4,"text-anchor":"end","class":"s-pet"},
      String(e)));
  });
  svg.appendChild(S("text",{x:X1+22,y:Y1+24,"text-anchor":"end","class":"s-nom"},"jours"));
  svg.appendChild(S("text",{x:X0-12,y:Y0-14,"text-anchor":"end","class":"s-nom"},"€"));
  /* A : 90 €/jour, passe par l'origine */
  svg.appendChild(S("line",{x1:x(0),y1:y(0),x2:x(10),y2:y(900),stroke:V("vert"),
    "stroke-width":"2.6"}));
  /* B : 150 € puis 60 €/jour */
  svg.appendChild(S("line",{x1:x(0),y1:y(150),x2:x(10),y2:y(750),stroke:V("chaud"),
    "stroke-width":"2.6"}));
  svg.appendChild(S("circle",{cx:x(0),cy:y(150),r:"6",fill:V("chaud")}));
  svg.appendChild(S("text",{x:x(0)+14,y:y(150)-10,"text-anchor":"start","class":"s-nom",
    fill:V("chaud")},"150 € avant d'avoir commencé"));
  svg.appendChild(S("circle",{cx:x(0),cy:y(0),r:"6",fill:V("vert")}));
  /* le croisement, a 5 jours et 450 € */
  svg.appendChild(S("line",{x1:x(5),y1:y(450),x2:x(5),y2:Y1,stroke:V("trait"),
    "stroke-width":"1","stroke-dasharray":"4 3"}));
  svg.appendChild(S("circle",{cx:x(5),cy:y(450),r:"6",fill:V("froid")}));
  svg.appendChild(S("text",{x:x(5)+12,y:y(450)+22,"text-anchor":"start","class":"s-nom",
    fill:V("froid")},"5 jours : même prix"));
  svg.appendChild(S("text",{x:X1+26,y:y(900)+6,"text-anchor":"start","class":"s-lab",
    fill:V("vert")},"A"));
  svg.appendChild(S("text",{x:X1+26,y:y(750)+6,"text-anchor":"start","class":"s-lab",
    fill:V("chaud")},"B"));
  svg.appendChild(S("text",{x:X0,y:H-14,"text-anchor":"start","class":"s-pet"},
    "A — 90 €/jour, sans frais   ·   B — 150 € de forfait, puis 60 €/jour"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Les deux droites montent régulièrement. <b>Une seule part de zéro</b> — et c'est "+
    "elle, et elle seule, qui est proportionnelle."));
};

/* ─────────── C · une remise puis une TVA ─────────── */
SCHEMAS["pourcentage-barre"]=function(el){
  var W=724,H=304,X0=140,LB=440,Y=[54,124,194],BH=44;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"2 400 euros, moins quinze pour cent, puis plus vingt pour cent de TVA"});
  function barre(y,val,ref,coul,etiq,montant){
    var w=LB*val/ref;
    svg.appendChild(S("rect",{x:X0,y:y,width:w,height:BH,fill:V(coul),opacity:"0.24",
      stroke:V(coul),"stroke-width":"1.6"}));
    svg.appendChild(S("text",{x:X0+w/2,y:y+BH/2+7,"text-anchor":"middle","class":"s-lab",
      style:"font-size:19px"},montant));
    svg.appendChild(S("text",{x:X0-14,y:y+BH/2+5,"text-anchor":"end","class":"s-nom"},etiq));
    return w;
  }
  var REF=2448;
  barre(Y[0],2400,REF,"encre2","au départ","2 400 €");
  var w1=barre(Y[1],2040,REF,"vert","− 15 %","2 040 €");
  var w2=barre(Y[2],2448,REF,"chaud","+ 20 % de TVA","2 448 €");
  /* le repere du depart, reporte sur la derniere barre */
  var wd=LB*2400/REF;
  svg.appendChild(S("line",{x1:X0+wd,y1:Y[0],x2:X0+wd,y2:Y[2]+BH+16,stroke:V("encre2"),
    "stroke-width":"1.2","stroke-dasharray":"5 4"}));
  svg.appendChild(S("text",{x:X0,y:Y[2]+BH+34,"text-anchor":"start","class":"s-lab",
    fill:V("chaud"),style:"font-size:18px"},"48 € de plus qu'au départ, soit + 2 %"));
  svg.appendChild(S("text",{x:X0,y:H-12,"text-anchor":"start","class":"s-pet"},
    "0,85 × 1,20 = 1,02 — les deux pourcentages ne s'annulent pas"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Une remise de 15 % puis une TVA de 20 % ne se compensent pas : <b>on finit "+
    "au-dessus du prix de départ</b>. Les pourcentages se multiplient, ils ne s'ajoutent pas."));
};

/* ─────────── C · ce que pèse un mètre cube ─────────── */
SCHEMAS["masse-volumique"]=function(el){
  var W=724,H=290,ox=[150,362,574],oy=196,A=92,F=38;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un mètre cube de terre, de sable et de gravier, et leurs masses"});
  var mat=[["terre","1,4 t","vert"],["sable","1,5 t","tiede"],["gravier","1,6 t","chaud"]];
  mat.forEach(function(m,k){
    var X=ox[k];
    function P(x,y,z){return [X+x*A+y*F*0.62, oy-z*A-y*F*0.5];}
    function poly(pts,o){
      svg.appendChild(S("polygon",{points:pts.map(function(q){return q.join(",");}).join(" "),
        fill:V(m[2]),opacity:o,stroke:V(m[2]),"stroke-width":"1.5"}));
    }
    poly([P(0,0,1),P(0,1,1),P(1,1,1),P(1,0,1)],"0.16");
    poly([P(1,0,0),P(1,1,0),P(1,1,1),P(1,0,1)],"0.26");
    poly([P(0,0,0),P(1,0,0),P(1,0,1),P(0,0,1)],"0.38");
    svg.appendChild(S("text",{x:X+A/2,y:oy-A/2+8,"text-anchor":"middle","class":"s-lab",
      style:"font-size:22px"},m[1]));
    svg.appendChild(S("text",{x:X+A/2,y:oy+30,"text-anchor":"middle","class":"s-nom"},m[0]));
  });
  svg.appendChild(S("text",{x:W/2,y:34,"text-anchor":"middle","class":"s-tit"},
    "CE QUE PÈSE UN MÈTRE CUBE"));
  svg.appendChild(S("text",{x:W/2,y:H-40,"text-anchor":"middle","class":"s-lab",
    fill:V("froid"),style:"font-size:19px"},"masse = volume × masse volumique"));
  svg.appendChild(S("text",{x:W/2,y:H-14,"text-anchor":"middle","class":"s-pet"},
    "un camion à 13 t de charge utile ne prend que 8,1 m³ de gravier"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Trois cubes identiques, trois masses différentes. <b>C'est le volume qui remplit "+
    "la benne, mais c'est la masse qui la limite</b> — et les deux ne se rencontrent presque jamais."));
};

/* ─────────── D · croiser une ligne et une colonne ─────────── */
SCHEMAS["croiser-tableau"]=function(el){
  var W=724,H=290,X0=190,CW=136,Y0=64,RH=52;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un tarif à double entrée, et la case au croisement de la ligne et de la colonne"});
  var cols=["10 m","25 m","50 m"], lignes=["16 mm","20 mm","25 mm"];
  var prix=[[34,85,170],[42,105,210],[56,140,280]];
  var i,j;
  for(j=0;j<3;j++)
    svg.appendChild(S("text",{x:X0+j*CW+CW/2,y:Y0-16,"text-anchor":"middle","class":"s-nom"},
      cols[j]));
  for(i=0;i<3;i++){
    svg.appendChild(S("text",{x:X0-104,y:Y0+i*RH+RH/2+5,"text-anchor":"end","class":"s-nom"},
      lignes[i]));
    for(j=0;j<3;j++){
      var vise=(i===1&&j===1), sur=(i===1||j===1);
      svg.appendChild(S("rect",{x:X0+j*CW,y:Y0+i*RH,width:CW,height:RH,
        fill:V(vise?"chaud":(sur?"froid":"carte2")),opacity:vise?"0.42":(sur?"0.14":"1"),
        stroke:V("trait"),"stroke-width":"1.2"}));
      svg.appendChild(S("text",{x:X0+j*CW+CW/2,y:Y0+i*RH+RH/2+7,"text-anchor":"middle",
        "class":"s-lab",style:"font-size:19px"},prix[i][j]+" €"));
    }
  }
  var defs=S("defs",{});
  var mk=S("marker",{id:"fl-cro",viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"6",
    markerHeight:"6",orient:"auto-start-reverse"});
  mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V("chaud")}));
  defs.appendChild(mk); svg.appendChild(defs);
  svg.appendChild(S("line",{x1:X0-96,y1:Y0+RH+RH/2,x2:X0-16,y2:Y0+RH+RH/2,
    stroke:V("chaud"),"stroke-width":"2","marker-end":"url(#fl-cro)"}));
  svg.appendChild(S("line",{x1:X0+CW+CW/2,y1:Y0-46,x2:X0+CW+CW/2,y2:Y0-24,
    stroke:V("chaud"),"stroke-width":"2","marker-end":"url(#fl-cro)"}));
  svg.appendChild(S("text",{x:X0+3*CW+18,y:Y0+RH+RH/2+6,"text-anchor":"start","class":"s-lab",
    fill:V("chaud"),style:"font-size:19px"},"105 €"));
  svg.appendChild(S("text",{x:X0-140,y:Y0+3*RH+34,"text-anchor":"start","class":"s-pet"},
    "25 m de gaine de 20 mm : la ligne, puis la colonne, puis la case"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Une case ne se lit jamais seule : <b>elle vaut par sa ligne et par sa colonne</b>. "+
    "Relire les deux en-têtes avant d'écrire le nombre, c'est tout le travail."));
};

/* ─────────── D · l'échelle d'un plan ─────────── */
SCHEMAS["echelle-plan"]=function(el){
  var W=724,H=286,X0=110,X1=630,YA=88,YB=170;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un plan au centième : un centimètre sur le plan vaut un mètre en vrai"});
  var N=10,p=(X1-X0)/N,i;
  [[YA,"sur le plan","froid","cm"],[YB,"en vrai","chaud","m"]].forEach(function(a){
    svg.appendChild(S("line",{x1:X0,y1:a[0],x2:X1,y2:a[0],stroke:V("encre2"),
      "stroke-width":"2"}));
    svg.appendChild(S("text",{x:X0-14,y:a[0]+5,"text-anchor":"end","class":"s-nom",
      fill:V(a[2])},a[1]));
    svg.appendChild(S("text",{x:X1+14,y:a[0]+5,"text-anchor":"start","class":"s-nom"},a[3]));
  });
  for(i=0;i<=N;i++){
    var x=X0+i*p;
    [YA,YB].forEach(function(y){
      svg.appendChild(S("line",{x1:x,y1:y-8,x2:x,y2:y+8,stroke:V("encre2"),
        "stroke-width":i%5?"1":"1.8"}));
    });
    if(i%5===0){
      svg.appendChild(S("text",{x:x,y:YA-16,"text-anchor":"middle","class":"s-pet"},
        String(i)));
      svg.appendChild(S("text",{x:x,y:YB+26,"text-anchor":"middle","class":"s-pet"},
        String(i)));
    }
    svg.appendChild(S("line",{x1:x,y1:YA+10,x2:x,y2:YB-10,stroke:V("trait"),
      "stroke-width":"0.8","stroke-dasharray":"3 3"}));
  }
  /* le segment de 4,5 cm, mis en avant */
  var xa=X0+4.5*p;
  svg.appendChild(S("rect",{x:X0,y:YA-5,width:xa-X0,height:10,fill:V("froid"),
    opacity:"0.5"}));
  svg.appendChild(S("rect",{x:X0,y:YB-5,width:xa-X0,height:10,fill:V("chaud"),
    opacity:"0.5"}));
  /* les deux etiquettes sur une ligne a part : posees sur les regles, elles
     tombaient sur les graduations */
  svg.appendChild(S("text",{x:X0,y:YB+56,"text-anchor":"start","class":"s-lab",
    style:"font-size:19px"},"le segment surligné :"));
  svg.appendChild(S("text",{x:X0+186,y:YB+56,"text-anchor":"start","class":"s-lab",
    fill:V("froid"),style:"font-size:19px"},"4,5 cm sur le plan"));
  svg.appendChild(S("text",{x:X0+372,y:YB+56,"text-anchor":"start","class":"s-lab",
    fill:V("chaud"),style:"font-size:19px"},"→   4,50 m en vrai"));
  svg.appendChild(S("text",{x:W/2,y:34,"text-anchor":"middle","class":"s-tit"},
    "ÉCHELLE 1/100 — UN CENTIMÈTRE POUR UN MÈTRE"));
  svg.appendChild(S("text",{x:X0,y:H-12,"text-anchor":"start","class":"s-pet"},
    "au 1/50, la même règle du bas irait deux fois moins loin : 4,5 cm ne vaudraient que 2,25 m"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Deux règles côte à côte, graduées différemment. <b>Le réel est toujours le plus "+
    "grand</b> — si votre conversion le rapetisse, vous avez divisé au lieu de multiplier."));
};

/* ─────────── E · défaire les opérations dans l'ordre inverse ─────────── */
SCHEMAS["defaire-operations"]=function(el){
  var W=724,H=280,BW=104,BH=52,GAP=54;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Un programme de calcul et son programme inverse"});
  var defs=S("defs",{});
  [["fl-al","froid"],["fl-re","chaud"]].forEach(function(m){
    var mk=S("marker",{id:m[0],viewBox:"0 0 10 10",refX:"9",refY:"5",markerWidth:"6",
      markerHeight:"6",orient:"auto-start-reverse"});
    mk.appendChild(S("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:V(m[1])}));
    defs.appendChild(mk);
  });
  svg.appendChild(defs);
  function rangee(y,cases,ops,coul,mk,titre){
    var X0=120,i;
    svg.appendChild(S("text",{x:X0-16,y:y+BH/2+5,"text-anchor":"end","class":"s-tit",
      fill:V(coul)},titre));
    for(i=0;i<cases.length;i++){
      var x=X0+i*(BW+GAP);
      svg.appendChild(S("rect",{x:x,y:y,width:BW,height:BH,rx:"8",fill:V("carte2"),
        stroke:V(coul),"stroke-width":"1.8"}));
      svg.appendChild(S("text",{x:x+BW/2,y:y+BH/2+8,"text-anchor":"middle","class":"s-lab",
        style:"font-size:23px"},cases[i]));
      if(i<ops.length){
        svg.appendChild(S("line",{x1:x+BW+6,y1:y+BH/2,x2:x+BW+GAP-6,y2:y+BH/2,
          stroke:V(coul),"stroke-width":"2","marker-end":"url(#"+mk+")"}));
        svg.appendChild(S("text",{x:x+BW+GAP/2,y:y+BH/2-12,"text-anchor":"middle",
          "class":"s-nom",fill:V(coul)},ops[i]));
      }
    }
  }
  rangee(70,["x","25 x","140"],["× 25","+ 40"],"froid","fl-al","À L'ALLER");
  rangee(186,["140","100","4"],["− 40","÷ 25"],"chaud","fl-re","AU RETOUR");
  svg.appendChild(S("text",{x:120,y:H-12,"text-anchor":"start","class":"s-pet"},
    "on défait dans l'ordre inverse : ce qui a été ajouté en dernier s'enlève en premier"));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Résoudre, c'est <b>remonter le programme à l'envers</b>. On enlève d'abord ce qui a "+
    "été ajouté en dernier — le forfait — et on divise seulement après."));
};

/* ─────────── F · les trois morceaux d'une réponse ─────────── */
SCHEMAS["phrase-reponse"]=function(el){
  var W=724,H=236,Y=104;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Une phrase de réponse et ses trois morceaux obligatoires"});
  svg.appendChild(S("text",{x:48,y:38,"text-anchor":"start","class":"s-tit"},
    "UNE RÉPONSE COMPLÈTE, ET SES TROIS MORCEAUX"));
  el.appendChild(svg);   /* dans le DOM avant de mesurer */
  var mots=[["Le prix total de la tranchée","froid","ce qu'on a cherché"],
            ["est de","encre2",""],
            ["81,60","vert","le nombre"],
            ["€.","chaud","l'unité"]];
  /* Les largeurs se MESURENT : estimees au nombre de caracteres, les mots se
     chevauchaient. Meme regle que pour les barres du diagramme des themes. */
  var x=48;
  mots.forEach(function(m){
    var tx=S("text",{x:x,y:Y,"text-anchor":"start","class":"s-lab",
      fill:V(m[1]==="encre2"?"encre2":"encre"),style:"font-size:21px"},m[0]);
    svg.appendChild(tx);
    var w=tx.getComputedTextLength?tx.getComputedTextLength():m[0].length*11;
    if(m[2]){
      var r=S("rect",{x:x-7,y:Y-26,width:w+14,height:38,rx:"6",
        fill:V(m[1]),opacity:"0.16"});
      svg.insertBefore(r,tx);
      svg.appendChild(S("line",{x1:x+w/2,y1:Y+20,x2:x+w/2,y2:Y+48,
        stroke:V(m[1]),"stroke-width":"1.5"}));
      svg.appendChild(S("text",{x:x+w/2,y:Y+68,"text-anchor":"middle","class":"s-nom",
        fill:V(m[1])},m[2]));
    }
    x+=w+14;
  });
  svg.appendChild(S("text",{x:48,y:H-16,"text-anchor":"start","class":"s-pet"},
    "« 81,6 » tout seul n'est pas une réponse : c'est un nombre trouvé sur une calculatrice"));
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Trois morceaux, et il en manque presque toujours un. <b>L'unité est celui qu'on "+
    "oublie le plus</b> — et c'est aussi celui qui coûte le plus de points."));
};






/* ─── PAC : le point de bivalence, et le piege de la puissance ─── */
SCHEMAS["bivalence"]=function(el){
  var W=880,H=440, X0=90,X1=790,Y0=50,Y1=350;
  var TMIN=-10,TMAX=18, PMAX=18;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Puissance disponible d'une pompe a chaleur et besoin du batiment "+
                 "en fonction de la temperature exterieure"});
  function px(t){return X0+(t-TMIN)/(TMAX-TMIN)*(X1-X0);}
  function py(v){return Y1-v/PMAX*(Y1-Y0);}
  function nom(x,y,t,c,a,cls){svg.appendChild(S("text",{x:x,y:y,"text-anchor":a||"start",
    "class":cls||"s-nom",fill:V(c||"encre2")},t));}
  var dep=function(t){return 0.60*(19-t);};       /* deperditions, kW */
  var pac=function(t){return 9.6+0.34*(t+7);};    /* puissance PAC, kW */

  /* grille */
  for(var t=-10;t<=18;t+=4){
    svg.appendChild(S("line",{x1:px(t),y1:Y0,x2:px(t),y2:Y1,stroke:V("trait2"),
      "stroke-width":"1"}));
    nom(px(t),Y1+20,String(t),"encre2","middle","s-pet");
  }
  for(var v=0;v<=18;v+=3){
    svg.appendChild(S("line",{x1:X0,y1:py(v),x2:X1,y2:py(v),stroke:V("trait2"),
      "stroke-width":"1"}));
    nom(X0-10,py(v)+4,String(v),"encre2","end","s-pet");
  }
  svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X1,y2:Y1,stroke:V("trait"),"stroke-width":"1.5"}));
  svg.appendChild(S("line",{x1:X0,y1:Y0,x2:X0,y2:Y1,stroke:V("trait"),"stroke-width":"1.5"}));
  nom((X0+X1)/2,Y1+44,"température extérieure, °C","encre2","middle","s-pet");
  nom(X0,Y0-14,"puissance, kW","encre2","start","s-pet");

  /* le point de bivalence : dep(t) = pac(t) */
  var tb=(19*0.60-9.6-0.34*7)/(0.60+0.34);
  var pb=dep(tb);

  /* la zone d'appoint, a gauche de la bivalence */
  var z="M "+px(TMIN)+" "+py(dep(TMIN))+" L "+px(tb)+" "+py(pb)+
        " L "+px(tb)+" "+py(pac(tb))+" L "+px(TMIN)+" "+py(pac(TMIN))+" Z";
  svg.appendChild(S("path",{d:z,fill:V("chaud"),opacity:"0.18"}));

  function droite(f,coul,ep){
    svg.appendChild(S("line",{x1:px(TMIN),y1:py(f(TMIN)),x2:px(TMAX),y2:py(f(TMAX)),
      stroke:V(coul),"stroke-width":ep||3.5,"stroke-linecap":"round"}));
  }
  droite(dep,"chaud");
  droite(pac,"froid");
  nom(px(-9),py(dep(-9))-14,"besoin du bâtiment","chaud");
  nom(px(14),py(pac(14))-14,"puissance de la PAC","froid","end");

  /* le point de bivalence */
  svg.appendChild(S("line",{x1:px(tb),y1:py(pb),x2:px(tb),y2:Y1,stroke:V("vert"),
    "stroke-width":"2","stroke-dasharray":"5 4"}));
  svg.appendChild(S("circle",{cx:px(tb),cy:py(pb),r:"8",fill:V("carte"),
    stroke:V("vert"),"stroke-width":"3.5"}));
  nom(px(tb)+16,py(pb)-18,"point de bivalence","vert");
  nom(px(tb)+16,py(pb)+2,frs(tb,1)+" °C · "+frs(pb,1)+" kW","vert",null,"s-lab");

  /* la lecture, sous le graphe */
  nom(px(-6),(py(dep(-6))+py(pac(-6)))/2+5,"appoint","chaud","middle","s-lab");
  nom(W/2,H-14,"À la température de base, l'appoint fournit "+
    frs(dep(-7)-pac(-7),1)+" kW sur "+frs(dep(-7),1)+
    " — soit "+frs(100*(dep(-7)-pac(-7))/dep(-7),0)+" % de la puissance.",
    "encre2","middle");
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "<b>Le piège est là</b> : cette part énorme de la <i>puissance</i> ne représente "+
    "que quelques pour cent de l'<i>énergie</i> annuelle, parce que les heures les "+
    "plus froides sont rares. Dimensionner une PAC sur la puissance de base la rend "+
    "surdimensionnée les onze douzièmes de l'année."));
};

/* ─── echangeur : co-courant contre contre-courant, et le DTLM ─── */
SCHEMAS["contre-courant"]=function(el){
  var W=880,H=420;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Profils de temperature d'un echangeur en co-courant et en "+
                 "contre-courant, et construction du DTLM"});
  function nom(x,y,t,c,a,cls){svg.appendChild(S("text",{x:x,y:y,"text-anchor":a||"start",
    "class":cls||"s-nom",fill:V(c||"encre2")},t));}
  function panneau(X0,X1,Y0,Y1,titre,ch,fr,dtlm,sensFroid){
    nom((X0+X1)/2,Y0-24,titre,"encre2","middle","s-tit");
    svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X1,y2:Y1,stroke:V("trait"),"stroke-width":"1.5"}));
    svg.appendChild(S("line",{x1:X0,y1:Y0,x2:X0,y2:Y1,stroke:V("trait"),"stroke-width":"1.5"}));
    var TMIN=10,TMAX=90;
    function py(t){return Y1-(t-TMIN)/(TMAX-TMIN)*(Y1-Y0);}
    svg.appendChild(S("line",{x1:X0,y1:py(ch[0]),x2:X1,y2:py(ch[1]),stroke:V("chaud"),
      "stroke-width":"3.5","stroke-linecap":"round"}));
    svg.appendChild(S("line",{x1:X0,y1:py(fr[0]),x2:X1,y2:py(fr[1]),stroke:V("froid"),
      "stroke-width":"3.5","stroke-linecap":"round"}));
    nom(X0+6,py(ch[0])-14,frs(ch[0],1)+" °C","chaud");
    nom(X1-6,py(ch[1])-14,frs(ch[1],1)+" °C","chaud","end");
    nom(X0+6,py(fr[0])+22,frs(fr[0],1)+" °C","froid");
    nom(X1-6,py(fr[1])+22,frs(fr[1],1)+" °C","froid","end");
    /* les deux ecarts aux extremites */
    [[X0+26,ch[0],fr[0],"Δ1"],[X1-26,ch[1],fr[1],"Δ2"]].forEach(function(e){
      svg.appendChild(S("line",{x1:e[0],y1:py(e[1]),x2:e[0],y2:py(e[2]),
        stroke:V("vert"),"stroke-width":"2","stroke-dasharray":"4 3"}));
      var ym=(py(e[1])+py(e[2]))/2, ec=Math.abs(py(e[1])-py(e[2]));
      nom(e[0]+6,ec>30?ym+4:Math.max(py(e[1]),py(e[2]))+42,
          e[3]+" = "+frs(Math.abs(e[1]-e[2]),1)+" K","vert",null,"s-pet");
    });
    /* les deux sens de circulation, sous les courbes : en contre-courant le
       froid va de la droite vers la gauche, et rien d'autre ne le dit */
    [[Y1-16,1,"chaud"],[Y1-2,sensFroid||1,"froid"]].forEach(function(f){
      var xa=X0+70, xb=X1-70;
      if(f[1]<0){var t=xa;xa=xb;xb=t;}
      svg.appendChild(S("line",{x1:xa,y1:f[0],x2:xb,y2:f[0],stroke:V(f[2]),
        "stroke-width":"1.5",opacity:"0.55"}));
      svg.appendChild(S("path",{d:"M "+xb+" "+f[0]+" l "+(f[1]<0?9:-9)+" -4 l 0 8 Z",
        fill:V(f[2]),opacity:"0.55"}));
    });
    nom((X0+X1)/2,Y1+26,"le long de l'échangeur","encre2","middle","s-pet");
    nom((X0+X1)/2,Y1+50,"ΔTlog = "+dtlm+" K","encre2","middle","s-lab");
  }
  function dtlm(a,b){return frs((a-b)/Math.log(a/b),1);}
  /* Meme surface, memes debits, memes entrees : NUT = 2 et debits equilibres.
     Le contre-courant sort a 40/60, le co-courant a 50,6/49,4. */
  panneau(70,400,70,300,"CO-COURANT",[80,50.6],[20,49.4],dtlm(60,1.2));
  panneau(490,820,70,300,"CONTRE-COURANT",[80,40],[60,20],dtlm(20,20.0001),-1);
  nom(W/2,H-46,"Même surface, mêmes débits, mêmes entrées : le contre-courant "+
    "transfère 33 % de plus.","encre2","middle");
  nom(W/2,H-22,"Lui seul permet à l'eau froide de sortir plus chaude que l'eau "+
    "chaude — impossible en co-courant.","encre2","middle");
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "<b>ΔTlog = (Δ1 − Δ2) / ln(Δ1/Δ2)</b>. Quand les deux écarts sont égaux, la "+
    "formule devient indéterminée et l'écart logarithmique vaut simplement cet "+
    "écart commun — c'est le cas du contre-courant équilibré, à droite."));
};

/* ─── les quatre domaines du site, pour l'en-tete de l'accueil ─── */
SCHEMAS["quatre-domaines"]=function(el){
  var W=360,H=250;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Les quatre domaines : la chaleur, l'eau, l'air, la régulation"});
  var cases=[
    {x:0,  y:0,  k:"echangeur",c:"chaud", n:"la chaleur"},
    {x:186,y:0,  k:"pompe",    c:"froid", n:"l'eau"},
    {x:0,  y:128,k:"filtre",   c:"vert",  n:"l'air"},
    {x:186,y:128,k:"sonde",    c:"tiede", n:"la régulation"}
  ];
  cases.forEach(function(o){
    svg.appendChild(S("rect",{x:o.x+1,y:o.y+1,width:172,height:106,rx:6,
      fill:V("carte"),stroke:V(o.c),"stroke-width":"1.5",opacity:"0.9"}));
    /* le symbole du kit, transplante et centre */
    var g=S("g",{transform:"translate("+(o.x+54)+","+(o.y+22)+") scale(1.05)"});
    var sym=symbole(o.k,o.c);
    [].slice.call(sym.childNodes).forEach(function(c){g.appendChild(c);});
    svg.appendChild(g);
    svg.appendChild(S("text",{x:o.x+86,y:o.y+92,"text-anchor":"middle",
      "class":"s-tit",fill:V(o.c)},o.n.toUpperCase()));
  });
  el.appendChild(svg);
};

OUTILS.ecs={
  titre:"Eau chaude sanitaire — puissance et stockage",
  intro:"Le profil de puisage d'un internat, heure par heure. Le stockage ne "+
        "change pas l'énergie : il change la puissance à installer.",
  monte:function(d){
    var P={n:40,tf:10,tc:60,sto:0};
    var maj=[];
    var W=680,H=250,X0=52,X1=650,Y0=20,Y1=190;
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=fr(P[cle],dec)+unite;});
    }
    ch(c1,"Nombre d'élèves","n",5,200,5,0,"");
    ch(c1,"Température d'eau froide","tf",5,20,1,0," °C");
    ch(c2,"Température de production","tc",45,75,1,0," °C");
    ch(c2,"Volume de stockage","sto",0,1500,25,0," L");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
      "aria-label":"Profil de puisage horaire"});
    d.appendChild(svg);
    var res=E("div",{"class":"res",style:"margin-top:12px"});d.appendChild(res);

    function calc(){
      maj.forEach(function(f){f();});
      var f=P.n/40, dt=P.tc-P.tf;
      var vol=PROFIL.map(function(x){return x*f;});
      var tot=0,mx=0,hp=0;
      vol.forEach(function(x,i){tot+=x;if(x>mx){mx=x;hp=i;}});
      var E_j=tot*1.163*dt/1000;                       /* kWh par jour */
      var P_inst=mx*1.163*dt/1000;                     /* kW en pointe, sans stockage */
      /* avec stockage : la pointe est ecretee de ce que le ballon peut fournir */
      var reste=Math.max(0,mx-P.sto);
      var P_sto=reste*1.163*dt/1000;
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      var lm=Math.max(mx,1);
      for(var i=0;i<24;i++){
        var x=X0+i*(X1-X0)/24, l=(X1-X0)/24-3;
        var h=(Y1-Y0)*vol[i]/lm;
        svg.appendChild(S("rect",{x:x,y:Y1-h,width:l,height:h,rx:2,
          fill:V(i===hp?"chaud":"froid"),opacity:i===hp?"0.85":"0.45"}));
        if(i%3===0)svg.appendChild(S("text",{x:x+l/2,y:Y1+18,"text-anchor":"middle",
          "class":"s-pet"},String(i)+" h"));
      }
      if(P.sto>0&&P.sto<mx){
        var ys=Y1-(Y1-Y0)*P.sto/lm;
        svg.appendChild(S("line",{x1:X0,y1:ys,x2:X1,y2:ys,stroke:V("vert"),
          "stroke-width":"2","stroke-dasharray":"6 4"}));
        svg.appendChild(S("text",{x:X1,y:ys-7,"text-anchor":"end","class":"s-nom",
          fill:V("vert")},"ce que le ballon absorbe"));
      }
      svg.appendChild(S("line",{x1:X0,y1:Y1,x2:X1,y2:Y1,stroke:V("trait"),
        "stroke-width":"1.5"}));
      svg.appendChild(S("text",{x:X0,y:Y0+10,"class":"s-pet"},
        "litres puisés dans l'heure"));
      res.innerHTML="<div class='gros'>"+
        "<span><b>Volume du jour</b><span>"+fr(tot,0)+" L</span></span>"+
        "<span><b>Énergie du jour</b><span>"+frs(E_j,1)+" kWh</span></span>"+
        "<span><b>Pointe</b><span>"+fr(mx,0)+" L à "+hp+" h</span></span>"+
        "</div><div class='gros' style='margin-top:8px'>"+
        "<span><b>Sans stockage</b><span>"+frs(P_inst,1)+" kW</span></span>"+
        "<span><b>Avec ce ballon</b><span>"+frs(P_sto,1)+" kW</span></span>"+
        "</div><p>"+(P.sto<=0
        ? "Sans ballon, l'appareil doit couvrir seul l'heure de pointe : <b>"+
          frs(P_inst,1)+" kW</b> pour "+fr(tot,0)+" litres par jour."
        : P_sto<=0
        ? "<b>Le ballon absorbe toute la pointe.</b> La production peut être "+
          "dimensionnée sur la moyenne, pas sur le maximum — c'est tout "+
          "l'intérêt du stockage."
        : "Le ballon écrête la pointe : la puissance tombe de "+frs(P_inst,1)+
          " à <b>"+frs(P_sto,1)+" kW</b>, soit "+fr(100*(1-P_sto/P_inst),0)+
          " % de moins. L'énergie du jour, elle, n'a pas bougé.")+"</p>";
    }
    calc();
  }
};

/* ─────────── retour direct contre retour inverse ─────────── */
SCHEMAS["retour-inverse"]=function(el){
  var W=760,H=300;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Retour direct et retour inversé"});
  function bloc(x0,titre,inv){
    var y1=76,y2=210, xs=[x0+40,x0+110,x0+180,x0+250];
    svg.appendChild(S("text",{x:x0+150,y:38,"text-anchor":"middle","class":"s-tit",
      fill:V(inv?"vert":"chaud")},titre));
    /* depart en haut, retour en bas */
    svg.appendChild(S("line",{x1:x0,y1:y1,x2:x0+290,y2:y1,stroke:V("chaud"),
      "stroke-width":"3"}));
    svg.appendChild(S("line",{x1:x0,y1:y2,x2:x0+290,y2:y2,stroke:V("froid"),
      "stroke-width":"3"}));
    xs.forEach(function(x,i){
      svg.appendChild(S("rect",{x:x-17,y:126,width:34,height:34,rx:2,fill:V("carte"),
        stroke:V("encre2"),"stroke-width":"2"}));
      svg.appendChild(S("text",{x:x,y:148,"text-anchor":"middle","class":"s-nom"},
        String(i+1)));
      svg.appendChild(S("line",{x1:x,y1:y1,x2:x,y2:126,stroke:V("chaud"),
        "stroke-width":"2"}));
      svg.appendChild(S("line",{x1:x,y1:160,x2:x,y2:y2,stroke:V("froid"),
        "stroke-width":"2"}));
    });
    /* le circulateur, et le sens du retour */
    svg.appendChild(S("circle",{cx:x0,cy:(y1+y2)/2,r:"14",fill:V("carte"),
      stroke:V("encre2"),"stroke-width":"2"}));
    svg.appendChild(S("text",{x:x0,y:(y1+y2)/2+5,"text-anchor":"middle","class":"s-nom"},
      "P"));
    svg.appendChild(S("line",{x1:x0,y1:y1,x2:x0,y2:(y1+y2)/2-14,stroke:V("chaud"),
      "stroke-width":"3"}));
    svg.appendChild(S("line",{x1:x0,y1:(y1+y2)/2+14,x2:x0,y2:y2,stroke:V("froid"),
      "stroke-width":"3"}));
    svg.appendChild(S("text",{x:x0+150,y:250,"text-anchor":"middle","class":"s-nom",
      fill:V(inv?"vert":"chaud")},
      inv?"chaque circuit a la même longueur"
         :"le circuit 1 est le plus court : il prend tout le débit"));
  }
  bloc(50,"RETOUR DIRECT",false);
  bloc(420,"RETOUR INVERSÉ",true);
  /* en retour inverse le collecteur de retour repart de l'autre bout */
  svg.appendChild(S("line",{x1:420,y1:210,x2:420,y2:274,stroke:V("froid"),
    "stroke-width":"3"}));
  svg.appendChild(S("line",{x1:420,y1:274,x2:710,y2:274,stroke:V("froid"),
    "stroke-width":"3"}));
  svg.appendChild(S("line",{x1:710,y1:274,x2:710,y2:210,stroke:V("froid"),
    "stroke-width":"3"}));
  el.appendChild(svg);
  el.parentNode.appendChild(E("p",{"class":"leg-schema"},
    "En retour direct, l'eau qui traverse l'émetteur 1 parcourt bien moins de "+
    "chemin que celle du 4 : elle y passe en priorité, et le dernier émetteur "+
    "manque de débit. <b>Le retour inversé égalise les longueurs</b> — un peu "+
    "plus de tube, et l'équilibrage se fait tout seul."));
};


/* ═══════════════════════════════════════════════════ SYMBOLES HYDRAULIQUES
   Chaque symbole se dessine dans un cadre 64 x 44, trait de 2. Les
   conventions suivies sont celles des schemas de principe des sujets. */
function symbole(nom, coul){
  var s=S("svg",{viewBox:"0 0 64 44","class":"sym"});
  var c=coul||"encre";
  function L(x1,y1,x2,y2,ep){s.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,
    stroke:V(c),"stroke-width":ep||2,"stroke-linecap":"round"}));}
  function P(d,fill){s.appendChild(S("path",{d:d,fill:fill?V(c):"none",
    stroke:V(c),"stroke-width":2,"stroke-linejoin":"round"}));}
  function C2(cx,cy,r,fill){s.appendChild(S("circle",{cx:cx,cy:cy,r:r,
    fill:fill?V(c):V("carte"),stroke:V(c),"stroke-width":2}));}
  function R2(x,y,l,h,fill){s.appendChild(S("rect",{x:x,y:y,width:l,height:h,
    fill:fill?V(c):V("carte"),stroke:V(c),"stroke-width":2}));}
  function T2(x,y,txt,t2){s.appendChild(S("text",{x:x,y:y,"text-anchor":"middle",
    "class":"s-sym"},txt));}
  var noeud=22;                                   /* demi-largeur du papillon */
  function papillon(){P("M10,10L10,34L32,22Z");P("M54,10L54,34L32,22Z");}
  var d={
   "arret":function(){L(0,22,10,22);L(54,22,64,22);papillon();L(32,22,32,8);L(24,8,40,8);},
   "reglage":function(){L(0,22,10,22);L(54,22,64,22);papillon();L(32,22,32,8);
     L(24,8,40,8);L(20,34,44,6,2);},
   "v2v":function(){L(0,22,10,22);L(54,22,64,22);papillon();L(32,22,32,14);
     R2(22,2,20,12);},
   "v3v":function(){L(0,22,10,22);L(54,22,64,22);L(32,44,32,34);
     P("M10,10L10,34L30,22Z");P("M54,10L54,34L34,22Z");
     P("M22,44L42,44L32,32Z");R2(22,0,20,12);L(32,12,32,18);},
   "clapet":function(){L(0,22,10,22);L(54,22,64,22);P("M10,10L10,34L32,22Z",true);
     L(32,8,32,36,2.5);},
   "soupape":function(){L(0,22,10,22);L(32,22,32,10);L(20,10,44,10);
     P("M10,10L10,34L32,22Z");L(32,10,44,2);L(38,4,46,8);L(54,22,64,22);
     P("M54,10L54,34L32,22Z");},
   "pompe":function(){L(0,22,8,22);L(56,22,64,22);C2(32,22,15);
     P("M25,13L45,22L25,31Z",true);},
   "echangeur":function(){R2(10,6,44,32);
     P("M16,10L26,22L16,34");P("M28,10L38,22L28,34");P("M40,10L50,22L40,34");},
   "vase":function(){L(32,44,32,34);P("M12,34L12,16A20,10 0 0 1 52,16L52,34Z");
     L(12,25,52,25,2);},
   "mano":function(){L(32,44,32,36);C2(32,22,14);T2(32,28,"P");},
   "sonde":function(){L(32,44,32,36);C2(32,22,14);T2(32,28,"T");},
   "filtre":function(){L(0,22,14,22);L(50,22,64,22);R2(14,10,36,24);
     L(20,10,20,34,1.5);L(26,10,26,34,1.5);L(32,10,32,34,1.5);L(38,10,38,34,1.5);
     L(44,10,44,34,1.5);},
   "purgeur":function(){L(32,44,32,30);C2(32,20,11);L(32,9,32,3);L(26,3,38,3);},
   "compteur":function(){L(0,22,12,22);L(52,22,64,22);R2(12,8,40,28);
     T2(32,28,"kWh");},
   "disconnecteur":function(){L(0,22,8,22);L(56,22,64,22);R2(8,10,48,24);
     L(24,10,24,34,1.5);L(40,10,40,34,1.5);T2(16,28,"B");T2(48,28,"A");}
  };
  (d[nom]||function(){})();
  return s;
}

var ORGANES_HYDRO=[
 {k:"echangeur",n:"Échangeur à plaques",rep:1,
  r:"Il transfère la chaleur du réseau urbain au circuit du bâtiment <b>sans que "+
    "les deux eaux se mélangent</b>. C'est la frontière entre le primaire, qui "+
    "appartient au fournisseur, et le secondaire, qui appartient au bâtiment.",
  ou:"Au cœur de la sous-station, entre primaire et secondaire.",
  ep:"Calculer sa puissance, tracer les deux circuits sur un DR, ou justifier "+
     "pourquoi les fluides ne se mélangent pas."},
 {k:"pompe",n:"Circulateur",rep:2,
  r:"Il met l'eau en mouvement et <b>fournit la pression que le réseau consomme</b> "+
    "en pertes de charge. Il ne crée pas de chaleur : il transporte.",
  ou:"Sur le départ ou le retour du secondaire, un par circuit.",
  ep:"Lire une courbe caractéristique, choisir une vitesse, trouver le point de "+
     "fonctionnement."},
 {k:"v3v",n:"Vanne 3 voies motorisée",rep:3,
  r:"Elle <b>mélange</b> deux eaux à températures différentes, ou <b>répartit</b> "+
    "un débit entre deux branches. C'est l'organe de régulation du départ : "+
    "l'automate lui donne un ordre, elle agit sur l'énergie.",
  ou:"En sortie de production, sur le départ du circuit de chauffage.",
  ep:"Identifier sa fonction — mélange ou répartition —, la placer sur un schéma, "+
     "expliquer le rôle du moteur."},
 {k:"v2v",n:"Vanne 2 voies motorisée",rep:4,
  r:"Elle <b>étrangle</b> un débit sans le dériver. En se fermant, elle augmente "+
    "la résistance du circuit et fait remonter la pression ailleurs — d'où la "+
    "nécessité d'un circulateur à pression variable.",
  ou:"Sur un émetteur, un aérotherme, une batterie de CTA.",
  ep:"La distinguer de la V3V, et en déduire l'effet sur le débit total."},
 {k:"arret",n:"Vanne d'arrêt",rep:5,
  r:"Elle isole une portion du circuit pour l'intervention. <b>Elle ne règle "+
    "rien</b> : elle est ouverte ou fermée.",
  ou:"De part et d'autre de tout organe démontable.",
  ep:"La repérer, et justifier pourquoi on en place deux autour d'une pompe."},
 {k:"reglage",n:"Vanne d'équilibrage",rep:6,
  r:"Elle ajoute <b>volontairement</b> de la perte de charge à une branche trop "+
    "favorisée, pour que chaque émetteur reçoive son débit. Elle porte une "+
    "graduation et se règle une fois pour toutes.",
  ou:"Sur le retour de chaque branche, ou de chaque colonne.",
  ep:"Expliquer l'équilibrage, lire un procès-verbal de réglage."},
 {k:"clapet",n:"Clapet anti-retour",rep:7,
  r:"Il ne laisse passer l'eau que <b>dans un sens</b>. Il empêche une pompe à "+
    "l'arrêt d'être traversée à l'envers par une pompe voisine.",
  ou:"En aval d'un circulateur, ou sur un remplissage.",
  ep:"Repérer le sens de circulation qu'il impose."},
 {k:"soupape",n:"Soupape de sécurité",rep:8,
  r:"Elle <b>s'ouvre toute seule</b> si la pression dépasse son tarage — 3 bar en "+
    "chauffage — et évacue de l'eau jusqu'à ce que la pression redescende. C'est "+
    "un organe de sécurité, jamais de régulation.",
  ou:"Sur la production, sans aucune vanne entre elle et le générateur.",
  ep:"Justifier son tarage, expliquer pourquoi rien ne doit pouvoir l'isoler."},
 {k:"vase",n:"Vase d'expansion",rep:9,
  r:"L'eau se dilate en chauffant. Le vase <b>absorbe ce volume</b> dans une "+
    "membrane comprimant un coussin d'azote. Sans lui, la pression monterait "+
    "jusqu'au déclenchement de la soupape à chaque chauffe.",
  ou:"Sur le retour, au plus près du générateur.",
  ep:"Calculer son volume à partir de la dilatation, ou expliquer son rôle."},
 {k:"mano",n:"Manomètre",rep:10,
  r:"Il indique la pression du circuit. Une pression qui baisse lentement signale "+
    "une fuite ; une pression qui monte à chaud signale un vase hors service.",
  ou:"Sur la production, près du remplissage.",
  ep:"Lire une valeur et la comparer à une consigne."},
 {k:"sonde",n:"Sonde de température",rep:11,
  r:"Elle <b>acquiert</b> l'information dont la régulation a besoin. Elle "+
    "appartient à la chaîne d'information, pas à la chaîne d'énergie.",
  ou:"Sur le départ, le retour, en ambiance, et en extérieur.",
  ep:"La placer dans la bonne chaîne, ou justifier son emplacement."},
 {k:"filtre",n:"Filtre — pot à boue",rep:12,
  r:"Il retient les particules qui useraient la pompe et boucheraient les "+
    "émetteurs. <b>Il s'encrasse, donc il se nettoie</b> : un filtre colmaté "+
    "ajoute une perte de charge considérable.",
  ou:"En amont du circulateur et de l'échangeur.",
  ep:"Expliquer sa présence, ou l'effet de son encrassement sur le débit."},
 {k:"purgeur",n:"Purgeur d'air",rep:13,
  r:"L'air dissous se rassemble aux points hauts et <b>bloque la circulation</b>. "+
    "Le purgeur l'évacue automatiquement.",
  ou:"À chaque point haut du réseau.",
  ep:"Justifier son emplacement — c'est presque toujours « au point haut »."},
 {k:"compteur",n:"Compteur d'énergie",rep:14,
  r:"Il mesure le débit et l'écart de température, et en déduit l'énergie "+
    "livrée. C'est lui qui fait la facture du réseau de chaleur.",
  ou:"Sur le primaire, côté fournisseur.",
  ep:"Retrouver l'énergie à partir de P = Q × 1 163 × ΔT."},
 {k:"disconnecteur",n:"Disconnecteur",rep:15,
  r:"Il empêche l'eau du circuit de chauffage de <b>revenir dans le réseau "+
    "d'eau potable</b>. C'est une obligation sanitaire sur tout remplissage.",
  ou:"Sur la conduite de remplissage, entre l'eau de ville et le circuit.",
  ep:"Le nommer et donner sa fonction sanitaire."}
];

OUTILS["symboles-hydro"]={
  titre:"Les symboles d'un circuit hydraulique",
  intro:"Quinze symboles suffisent à lire la quasi-totalité des schémas de "+
        "l'épreuve. Cliquez-en un : son rôle, sa place, et ce que l'épreuve "+
        "en demande.",
  monte:function(d,el){
    var grille=E("div",{"class":"grille-sym"});
    var carte=E("div",{"class":"res",style:"margin-top:14px"});
    d.appendChild(grille);d.appendChild(carte);
    function montre(i){
      [].forEach.call(grille.children,function(b,k){
        b.className="case-sym"+(k===i?" on":"");});
      var o=ORGANES_HYDRO[i];
      carte.innerHTML="<div class='gro' style='font-weight:600;font-size:17px;"+
        "margin-bottom:8px'>"+o.rep+" · "+o.n+"</div>"+
        "<p><b>Rôle</b> "+o.r+"</p>"+
        "<p><b>Où on le trouve</b> "+o.ou+"</p>"+
        "<p><b>Ce que l'épreuve demande</b> "+o.ep+"</p>";
      [].forEach.call(carte.querySelectorAll("p b:first-child"),function(b){
        b.style.cssText="font-family:'Bricolage Grotesque',sans-serif;font-size:10.5px;"+
          "letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);"+
          "display:block;margin-bottom:1px";});
    }
    ORGANES_HYDRO.forEach(function(o,i){
      var b=E("button",{"class":"case-sym",type:"button"});
      b.appendChild(symbole(o.k));
      b.appendChild(E("span",{},o.rep+" · "+o.n));
      b.addEventListener("click",function(){montre(i);});
      grille.appendChild(b);
    });
    montre(0);
  }
};

/* ─────────── le schema de principe d'une sous-station ─────────── */
/* ─────────────────────────────────────────────── le cycle sur le diagramme
   enthalpique (log p, h) — dit « diagramme de Mollier » en froid.
   La courbe de saturation est SCHEMATIQUE : elle a la forme d'un vrai
   diagramme — liquide raide, vapeur presque plate, point critique au
   sommet — mais elle n'est celle d'aucun fluide. Les enthalpies portees
   sont celles de l'exemple traite dans la page, et elles bouclent :
   qk = qo + w. Un schema qui ne bouclerait pas apprendrait a ne pas
   verifier. */
/* Deux noms, un seul dessin. « cycle-mollier » porte les valeurs lues ;
   « cycle-mollier-muet » ne porte que les symboles — c'est la version
   qui accompagne une question, ou le diagramme donnerait la reponse. */
function dessineMollier(el,chiffre){
  var W=740,H=440,X0=64,X1=690,Y0=44,Y1=336;
  var HMIN=190,HMAX=500,PMIN=1,PMAX=60;          /* kJ/kg et bar absolus */
  var H1=425,H2=460,H3=270,BP=9.3,HP=30;         /* l'exemple de la page */

  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Cycle frigorifique sur le diagramme enthalpique"});
  el.appendChild(svg);

  function px(h){return X0+(h-HMIN)/(HMAX-HMIN)*(X1-X0);}
  function u(p){return (Math.log(p)-Math.log(PMIN))/(Math.log(PMAX)-Math.log(PMIN));}
  function py(p){return Y1-u(p)*(Y1-Y0);}         /* l'axe des pressions est LOG */
  /* La cloche est SCHEMATIQUE — forme d'un vrai diagramme, fluide d'aucun.
     Les exposants sont cales pour que les quatre points du cycle tombent
     dans la bonne zone : 3 en liquide sous-refroidi, 4 sous la cloche,
     1 et 2 en vapeur surchauffee. Un schema ou le point 3 serait dans le
     melange enseignerait le contraire de ce que dit le texte. */
  function hL(p){return 200+140*Math.pow(u(p),2.692);}
  function hV(p){return 430- 90*Math.pow(u(p),2.952);}

  /* -- la grille */
  [1,2,3,5,10,20,30,60].forEach(function(p){
    svg.appendChild(S("line",{x1:X0,y1:py(p),x2:X1,y2:py(p),stroke:V("trait2"),
      "stroke-width":"1"}));
    svg.appendChild(S("text",{x:X0-9,y:py(p)+4,"text-anchor":"end","class":"s-pet"},
      String(p)));
  });
  for(var h=200;h<=HMAX;h+=50){
    svg.appendChild(S("line",{x1:px(h),y1:Y0,x2:px(h),y2:Y1,stroke:V("trait2"),
      "stroke-width":"1"}));
    svg.appendChild(S("text",{x:px(h),y:Y1+18,"text-anchor":"middle","class":"s-pet"},
      String(h)));
  }
  svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+60,"text-anchor":"middle","class":"s-pet"},
    "enthalpie massique h  (kJ/kg)"));
  var lab=S("text",{x:0,y:0,"text-anchor":"middle","class":"s-pet",
    transform:"translate(17,"+((Y0+Y1)/2)+") rotate(-90)"});
  lab.textContent="pression absolue p  (bar, échelle log)";
  svg.appendChild(lab);

  /* -- la courbe de saturation, en une seule cloche */
  var d="",p,k=0;
  for(p=PMIN;p<=PMAX;p*=1.05) d+=(k++?"L":"M")+px(hL(p)).toFixed(1)+","+py(p).toFixed(1);
  d+="L"+px(340).toFixed(1)+","+py(PMAX).toFixed(1);
  for(p=PMAX;p>=PMIN;p/=1.05) d+="L"+px(hV(p)).toFixed(1)+","+py(p).toFixed(1);
  svg.appendChild(S("path",{d:d,fill:"none",stroke:V("froid"),"stroke-width":"2.5"}));
  svg.appendChild(S("circle",{cx:px(340),cy:py(PMAX),r:4,fill:V("froid")}));
  svg.appendChild(S("text",{x:px(340),y:py(PMAX)-12,"text-anchor":"middle",
    "class":"s-pet",fill:V("froid")},"point critique"));

  /* -- les trois zones : la premiere lecture a savoir faire */
  [[224,2.4,"liquide"],[330,2.4,"mélange liquide + vapeur"],[458,2.4,"vapeur surchauffée"]]
    .forEach(function(z){
      svg.appendChild(S("text",{x:px(z[0]),y:py(z[1]),"text-anchor":"middle",
        "class":"s-pet",fill:V("encre2")},z[2]));
    });

  /* -- le cycle : 1 aspiration, 2 refoulement, 3 liquide, 4 apres detente */
  var P1=[px(H1),py(BP)],P2=[px(H2),py(HP)],P3=[px(H3),py(HP)],P4=[px(H3),py(BP)];
  function trait(a,b,coul){
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V(coul),
      "stroke-width":"3.5","stroke-linecap":"round"}));
  }
  trait(P4,P1,"froid");            /* evaporation  */
  trait(P1,P2,"chaud");            /* compression  */
  trait(P2,P3,"chaud");            /* condensation */
  trait(P3,P4,"encre");            /* detente      */

  /* Chaque point porte SON enthalpie. Ce n'est pas une reponse — les
     questions demandent des differences et des rapports — et sans elle on ne
     lit qu'a la graduation de 50 kJ/kg, ce qui interdit tout calcul juste. */
  [[P1,"1",9,16,H1,10,34],[P2,"2",9,-9,H2,10,-26],
   [P3,"3",-16,-9,H3,-18,20],[P4,"4",-16,16,H3,-18,34]].forEach(function(q){
    svg.appendChild(S("circle",{cx:q[0][0],cy:q[0][1],r:5.5,fill:V("carte"),
      stroke:V("encre"),"stroke-width":"2.5"}));
    svg.appendChild(S("text",{x:q[0][0]+q[2],y:q[0][1]+q[3],"class":"s-nom"},q[1]));
    svg.appendChild(S("text",{x:q[0][0]+q[5],y:q[0][1]+q[6],"class":"s-pet",
      "text-anchor":q[5]<0?"end":"start",fill:V("encre2")},q[4]+" kJ/kg"));
  });

  /* -- ce que chaque segment vaut. Les deux mesures horizontales sont posees
        LOIN l'une de l'autre : cote a cote, elles se chevauchaient. */
  function mesure(x1,x2,y,texte,coul,dessous){
    svg.appendChild(S("line",{x1:x1,y1:y,x2:x2,y2:y,stroke:V(coul),"stroke-width":"1.5",
      "stroke-dasharray":"5 4"}));
    svg.appendChild(S("text",{x:(x1+x2)/2,y:y+(dessous?15:-7),"text-anchor":"middle",
      "class":"s-pet",fill:V(coul)},texte));
  }
  mesure(px(H3),px(H1),Y1-16,chiffre?"qo = h1 − h4 = 155 kJ/kg":"qo","froid",false);
  mesure(px(H3),px(H2),py(HP)-26,chiffre?"qk = h2 − h3 = 190 kJ/kg":"qk","chaud",false);
  svg.appendChild(S("text",{x:(P1[0]+P2[0])/2+30,y:(P1[1]+P2[1])/2,"class":"s-pet",
    fill:V("chaud")},chiffre?"w = h2 − h1 = 35":"w"));

  /* -- la detente est VERTICALE : c'est la lecture qui surprend le plus */
  svg.appendChild(S("text",{x:px(H3)-12,y:(py(BP)+py(HP))/2-4,"text-anchor":"end",
    "class":"s-pet",fill:V("encre2")},"détente"));
  if(chiffre)svg.appendChild(S("text",{x:px(H3)-12,y:(py(BP)+py(HP))/2+12,
    "text-anchor":"end","class":"s-pet",fill:V("encre2")},"h constante"));

  if(!chiffre)return;
  var lect=E("div",{"class":"res",style:"margin-top:12px"});
  lect.innerHTML="<strong>qk = qo + w</strong> — 190 = 155 + 35. Le condenseur évacue "+
    "tout ce que l'évaporateur a pris, <em>plus</em> le travail du compresseur. "+
    "Un relevé qui ne boucle pas est un relevé faux.<br>"+
    "<strong>EER = qo / w = 4,43</strong> et <strong>COP = qk / w = 5,43</strong> : "+
    "exactement une unité d'écart, et c'est la même relation que Q<sub>chaud</sub> = "+
    "Q<sub>froid</sub> + W, lue sur le diagramme.";
  el.appendChild(lect);
}
SCHEMAS["cycle-mollier"]     =function(el){dessineMollier(el,true);};
SCHEMAS["cycle-mollier-muet"]=function(el){dessineMollier(el,false);};

SCHEMAS["sous-station"]=function(el){
  var W=860,H=430;
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Schéma de principe d'une sous-station de chauffage urbain"});
  function tube(x1,y1,x2,y2,coul,ep){
    svg.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:V(coul),
      "stroke-width":ep||3,"stroke-linecap":"round"}));
  }
  function rep(x,y,n){
    svg.appendChild(S("circle",{cx:x,cy:y,r:"12",fill:V("carte"),stroke:V("encre"),
      "stroke-width":"1.5"}));
    svg.appendChild(S("text",{x:x,y:y+5,"text-anchor":"middle","class":"s-rep"},
      String(n)));
  }
  function pose(k,x,y,n,coul,pos){
    var g=S("g",{transform:"translate("+(x-32)+","+(y-22)+")"});
    var s=symbole(k,coul);
    [].slice.call(s.childNodes).forEach(function(c){g.appendChild(c);});
    svg.appendChild(g);
    if(n){if(pos==="g")rep(x-30,y,n);else rep(x+26,y-26,n);}
  }
  var YA=104, YR=250, XE=340;

  /* le primaire, a gauche */
  svg.appendChild(S("rect",{x:8,y:52,width:XE-40,height:250,fill:V("froid"),
    opacity:"0.06"}));
  svg.appendChild(S("text",{x:20,y:40,"class":"s-tit",fill:V("froid")},
    "PRIMAIRE — RÉSEAU DE CHALEUR URBAIN"));
  tube(20,YA,XE-30,YA,"chaud");
  tube(20,YR,XE-30,YR,"froid");
  svg.appendChild(S("text",{x:20,y:YA-12,"class":"s-nom",fill:V("chaud")},"< 110 °C"));
  pose("compteur",110,YA,14);
  pose("filtre",210,YA,12);
  pose("arret",110,YR,5);

  /* l'echangeur */
  pose("echangeur",XE,(YA+YR)/2,1,"vert");
  tube(XE-30,YA,XE-30,(YA+YR)/2-16,"chaud");
  tube(XE-30,YR,XE-30,(YA+YR)/2+16,"froid");
  tube(XE+30,(YA+YR)/2-16,XE+30,YA,"chaud");
  tube(XE+30,(YA+YR)/2+16,XE+30,YR,"froid");

  /* le secondaire, a droite */
  svg.appendChild(S("rect",{x:XE+40,y:52,width:W-XE-58,height:250,fill:V("chaud"),
    opacity:"0.05"}));
  svg.appendChild(S("text",{x:XE+52,y:40,"class":"s-tit",fill:V("chaud")},
    "SECONDAIRE — CIRCUIT DU BÂTIMENT   70 / 55 °C"));
  tube(XE+30,YA,W-30,YA,"chaud");
  tube(XE+30,YR,W-30,YR,"froid");
  pose("v3v",470,YA,3);
  pose("pompe",580,YA,2);
  pose("sonde",700,YA,11);

  /* les emetteurs */
  [760,820].forEach(function(x,i){
    svg.appendChild(S("rect",{x:x-18,y:150,width:36,height:54,rx:2,fill:V("carte"),
      stroke:V("chaud"),"stroke-width":"2"}));
    for(var k=0;k<3;k++)svg.appendChild(S("line",{x1:x-10+k*10,y1:154,
      x2:x-10+k*10,y2:200,stroke:V("chaud"),"stroke-width":"1.5"}));
    tube(x,YA,x,150,"chaud",2.5);
    tube(x,204,x,YR,"froid",2.5);
  });
  svg.appendChild(S("text",{x:790,y:224,"text-anchor":"middle","class":"s-nom"},
    "émetteurs"));
  pose("v2v",760,YA-0,4);
  pose("reglage",820,YR,6);
  pose("clapet",624,YA,7);
  pose("purgeur",552,YA-34,13,null,"g");
  tube(552,YA-24,552,YA,"chaud",2);

  /* la securite, en bas du secondaire */
  tube(430,YR,430,340,"froid",2.5);
  pose("soupape",430,362,8);
  tube(530,YR,530,336,"froid",2.5);
  pose("vase",530,358,9);
  pose("mano",620,YR+40,10);
  tube(620,YR,620,YR+18,"froid",2);
  pose("disconnecteur",250,YR+40,15);
  tube(250,YR,250,YR+18,"froid",2);
  svg.appendChild(S("text",{x:250,y:YR+84,"text-anchor":"middle","class":"s-nom"},
    "remplissage"));

  svg.appendChild(S("text",{x:W/2,y:H-8,"text-anchor":"middle","class":"s-nom"},
    "Les deux eaux ne se mélangent jamais : elles échangent à travers une paroi."));
  el.appendChild(svg);
  (el.parentNode||el).appendChild(E("p",{"class":"leg-schema"},
    "Les numéros renvoient à la bibliothèque de symboles. <b>Suivez un fluide du "+
    "doigt</b>, d'un bout à l'autre, en nommant chaque organe rencontré : si vous "+
    "y arrivez, vous savez lire le schéma."));
};


/* --------- dispersion d'une serie de releves ---------
   Ajoute le 3 septembre 2026, sequence 1 de maths-PC. C'est la statistique
   descriptive du CCF de mathematiques, sur des donnees de chaufferie. */
OUTILS.dispersion={
  titre:"Moyenne, étendue, écart-type",
  intro:"Entrez une série de relevés, séparés par des espaces ou des virgules. "+
        "Les séries proposées viennent d'installations voisines de celles du cours, "+
        "jamais des activités elles-mêmes.",
  monte:function(d){
    var st={txt:"62,4 62,1 62,6 62,3 62,5 62,2 62,4 62,7 62,3 62,5",cons:62.5,tol:0.5};
    var g=E("div",{"class":"g2"});
    var col1=E("div"),col2=E("div");

    var seg=E("div",{style:"display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px"});
    /* chaque serie emporte sa consigne et sa tolerance : sans cela l'outil
       compare des releves a 62 degres a une consigne restee a 45. */
    [["Départ chaufferie","62,4 62,1 62,6 62,3 62,5 62,2 62,4 62,7 62,3 62,5",62.5,0.5],
     ["Régulation A","44,8 45,2 44,9 45,1 45,0 44,9 45,1 45,0",45,0.5],
     ["Régulation B","43,5 46,4 44,2 45,8 45,0 44,1 46,2 44,8",45,0.5],
     ["Débit d'un circuit","2,42 2,38 2,45 2,40 2,44 2,37",2.4,0.05]
    ].forEach(function(o){
      var b=E("button",{"class":"bt",type:"button"},o[0]);
      b.addEventListener("click",function(){
        st.txt=o[1];st.cons=o[2];st.tol=o[3];
        zone.value=o[1];curC.value=o[2];curT.value=o[3];calc();});
      seg.appendChild(b);
    });
    col1.appendChild(seg);

    var zone=E("textarea",{rows:"3",
      style:"width:100%;font-size:15px;padding:8px;border-radius:6px;"+
            "border:1px solid var(--trait);background:var(--carte);color:inherit"});
    zone.value=st.txt;
    zone.addEventListener("input",function(){st.txt=this.value;calc();});
    col1.appendChild(zone);

    function champ(lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");
      c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:st[cle]});
      i.addEventListener("input",function(){st[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);col1.appendChild(c);
      var f=function(){v.textContent=unite+frs(st[cle],dec);};
      f.input=i;return f;
    }
    var mC=champ("Valeur de consigne","cons",0,100,0.1,1,"");
    var mT=champ("Tolérance acceptée","tol",0.05,5,0.05,2,"± ");
    var curC=mC.input, curT=mT.input;

    var res=E("div",{"class":"res"});col2.appendChild(res);
    var boite=E("div",{style:"margin-top:12px"});col2.appendChild(boite);
    var note=E("p",{style:"font-size:14.5px;color:var(--encre2);margin-top:12px"},"");
    col2.appendChild(note);

    function lire(){
      return st.txt.replace(/,(?=[0-9])/g,".").split(/[^0-9.+-]+/)
             .filter(function(x){return x!==""&&isFinite(parseFloat(x));})
             .map(parseFloat);
    }
    function calc(){
      mC();mT();
      var v=lire(),n=v.length;
      if(n<2){
        res.innerHTML="<div class='gros'><span><b>Série trop courte</b>"+
          "<span>il en faut deux</span></span></div>";
        boite.innerHTML="";note.textContent="";return;
      }
      var som=0;v.forEach(function(x){som+=x;});
      var moy=som/n,mn=Math.min.apply(null,v),mx=Math.max.apply(null,v),c2=0;
      v.forEach(function(x){c2+=(x-moy)*(x-moy);});
      var sn=Math.sqrt(c2/n), sn1=Math.sqrt(c2/(n-1));
      var hors=v.filter(function(x){return Math.abs(x-st.cons)>st.tol;}).length;
      res.innerHTML=
        "<div class='gros'><span><b>Moyenne</b><span>"+frs(moy,3)+"</span></span>"+
        "<span><b>Étendue</b><span>"+frs(mx-mn,3)+"</span></span></div>"+
        "<div class='gros'><span><b>sigma n</b><span>"+frs(sn,3)+"</span></span>"+
        "<span><b>sigma n−1 — expérimental</b><span>"+frs(sn1,3)+"</span></span></div>";
      var W=360,H=74,X0=14,X1=W-14,lo=Math.min(mn,st.cons-st.tol),
          hi=Math.max(mx,st.cons+st.tol),et=(hi-lo)||1;
      lo-=et*0.12;hi+=et*0.12;
      function px(x){return X0+(X1-X0)*(x-lo)/(hi-lo);}
      var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
        "aria-label":"nuage des relevés"});
      svg.appendChild(S("rect",{x:px(st.cons-st.tol),y:8,
        width:px(st.cons+st.tol)-px(st.cons-st.tol),height:44,
        fill:V("trait"),opacity:"0.14"}));
      svg.appendChild(S("line",{x1:X0,y1:56,x2:X1,y2:56,stroke:V("trait"),
        "stroke-width":"1.5"}));
      svg.appendChild(S("line",{x1:px(moy),y1:6,x2:px(moy),y2:60,stroke:V("chaud"),
        "stroke-width":"2"}));
      var vus={};
      v.forEach(function(x){
        var k=x.toFixed(4),m=vus[k]||0;vus[k]=m+1;
        svg.appendChild(S("circle",{cx:px(x),cy:48-12*m,r:4.5,fill:V("froid")}));
      });
      svg.appendChild(S("text",{x:px(moy),y:70,"text-anchor":"middle","class":"s-pet"},
        "moyenne"));
      boite.innerHTML="";boite.appendChild(svg);
      note.innerHTML="<b>"+n+" relevés</b>. L'écart-type expérimental est le "+
        "<b>sigma n−1</b> : c'est celui qui compte sur un échantillon de mesures. "+
        (hors?("<b>"+hors+"</b> relevé"+(hors>1?"s sortent":" sort")+
               " de la tolérance."):"Aucun relevé ne sort de la tolérance.");
    }
    g.appendChild(col1);g.appendChild(col2);d.appendChild(g);
    calc();
  }
};

/* ═══════════════════════════════════════════════════ montage */
[].forEach.call(document.querySelectorAll(".outil[data-outil]"),function(el){
  var o=OUTILS[el.getAttribute("data-outil")];
  if(!o){el.innerHTML="<div class='dedans'>Outil inconnu : "+
    el.getAttribute("data-outil")+"</div>";return;}
  el.innerHTML="";
  var t=E("div",{"class":"tete-outil"});
  t.appendChild(E("p",{"class":"k"},"Outil"));
  t.appendChild(E("h4",{},o.titre));
  if(o.chaine)t.appendChild(E("p",{"class":"chaine"},"↳ "+o.chaine));
  t.appendChild(E("p",{},o.intro));
  el.appendChild(t);
  var d=E("div",{"class":"dedans"});
  el.appendChild(d);
  o.monte(d, el);
});

/* les schemas se montent apres les outils : ils lisent l'etat partage */
[].forEach.call(document.querySelectorAll("[data-schema]"),function(el){
  var f=SCHEMAS[el.getAttribute("data-schema")];
  if(!f){el.innerHTML="Schéma inconnu : "+el.getAttribute("data-schema");return;}
  f(el);
});

/* ─────────────────────────────────────────────── le bilan d'une epreuve
   Sur une page qui se declare « epreuve: oui », un bandeau compte ce qui est
   fait. Il ne donne AUCUNE reponse — juste combien de questions ont ete
   validees et combien restent. Le compte se refait a chaque evenement « exo »
   emis par exoNote, et au chargement, car les reponses precedentes sont dans
   le localStorage de l'appareil.
   Rien ici ne remonte nulle part : c'est le meme stockage que le suivi de
   lecture, et il ne sort pas du navigateur. */
(function(){
  var page=document.querySelector('.page[data-epreuve]');
  if(!page)return;
  var exos=[].slice.call(document.querySelectorAll(".exo"));
  if(!exos.length)return;

  var bandeau=E("div",{"class":"bilan-epreuve",id:"bilan-epreuve"});
  var jauge=E("i",{}); jauge.appendChild(E("b",{}));
  var texte=E("span",{"class":"compte"},"");
  bandeau.appendChild(jauge); bandeau.appendChild(texte);

  /* pose juste avant le premier exercice : au-dessus du sujet, pas en tete
     de page ou il serait lu avant meme d'avoir vu une question */
  var premier=exos[0], hote=premier;
  while(hote.parentNode&&hote.parentNode!==page)hote=hote.parentNode;
  page.insertBefore(bandeau,hote);

  function refaire(){
    var t=exoLu(),justes=0,vus=0;
    exos.forEach(function(ex){
      var e=t[ex.getAttribute("data-exo")];
      if(e==="juste")justes++; else if(e)vus++;
    });
    var reste=exos.length-justes-vus;
    jauge.firstChild.style.width=Math.round(100*justes/exos.length)+"%";
    texte.textContent=exos.length+" questions · "+justes+" juste"+(justes>1?"s":"")
      +(vus?" · "+vus+" à revoir":"")+(reste?" · "+reste+" non traitée"
      +(reste>1?"s":""):" · terminé");
  }
  document.addEventListener("exo",refaire);
  refaire();
})();

/* le composeur de paroi peut être monté après le bilan : on repasse une fois */
if(OUTILS.bilan._recalc)OUTILS.bilan._recalc();
})();
