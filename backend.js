/* =========================================================
   Tablero de Producción Kacrea — capa de acceso y sincronización
   Versión web (GitHub Pages + Firebase). No hace falta editar
   este archivo: toda la configuración está en config.js
   ========================================================= */
(function(){
"use strict";
var CFG = window.KC_CONFIG || {};
var dbReady, resolveDb;
dbReady = new Promise(function(r){ resolveDb = r; });

/* El tablero pide la base con claude.use("db"); aquí se la damos desde Firestore. */
window.claude = { use: function(name){ return name === "db" ? dbReady : Promise.resolve(null); } };

function mapErr(e){
  var c = e && e.code ? String(e.code).replace(/^firestore\//,"") : "unavailable";
  if(c === "permission-denied" || c === "unauthenticated") c = "invalid_argument";
  if(c === "resource-exhausted") c = "resource_exhausted";
  return { code: c, message: (e && e.message) || c };
}
function wrap(p){ return p["catch"](function(e){ throw mapErr(e); }); }

function snapDoc(s){
  return { id: s.id, exists: s.exists, data: function(){ return s.data(); },
           metadata: { fromCache: s.metadata.fromCache, hasPendingWrites: s.metadata.hasPendingWrites } };
}
function DocRef(fdb, path){
  var ref = fdb.doc(path);
  return {
    id: ref.id, path: path,
    get: function(){ return wrap(ref.get()).then(snapDoc); },
    set: function(d){ return wrap(ref.set(d)); },
    /* merge profundo (igual que el tablero original): no pisa los campos hermanos */
    update: function(d){ return wrap(ref.set(d, { merge: true })); },
    "delete": function(){ return wrap(ref["delete"]()); },
    onSnapshot: function(next, err){
      return ref.onSnapshot({ includeMetadataChanges: true }, function(s){ next(snapDoc(s)); },
        function(e){ if(err) err(mapErr(e)); });
    }
  };
}
function ColRef(fdb, path){
  var col = fdb.collection(path);
  return {
    path: path,
    doc: function(id){ return DocRef(fdb, path + "/" + (id || col.doc().id)); },
    onSnapshot: function(next, err){
      return col.onSnapshot({ includeMetadataChanges: true }, function(q){
        var docs = q.docs.map(snapDoc);
        next({ docs: docs, size: docs.length, empty: !docs.length,
               metadata: { fromCache: q.metadata.fromCache, hasPendingWrites: q.metadata.hasPendingWrites } });
      }, function(e){ if(err) err(mapErr(e)); });
    }
  };
}

/* ---------- Puerta de PIN ---------- */
function gate(done){
  var pin = String(CFG.pin || "").trim();
  if(!pin){ done(); return; }
  var okKey = "kc_gate_" + pin;
  try{ if(localStorage.getItem(okKey) === "1"){ done(); return; } }catch(e){}
  var ov = document.createElement("div");
  ov.className = "gate";
  ov.innerHTML =
    '<form class="gate-card" id="gateForm">' +
      '<div class="eyebrow">Kacrea · Producción</div>' +
      '<h2>Proyectos por venir</h2>' +
      '<p>Ingresa el PIN del equipo para abrir el tablero.</p>' +
      '<input id="gatePin" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN" aria-label="PIN de acceso">' +
      '<button class="btn pri" type="submit">Entrar</button>' +
      '<small id="gateErr" hidden>PIN incorrecto.</small>' +
    '</form>';
  document.body.appendChild(ov);
  document.getElementById("gateForm").addEventListener("submit", function(e){
    e.preventDefault();
    if(document.getElementById("gatePin").value.trim() === pin){
      try{ localStorage.setItem(okKey, "1"); }catch(e2){}
      ov.remove(); done();
    }else{
      document.getElementById("gateErr").hidden = false;
      document.getElementById("gatePin").value = "";
      document.getElementById("gatePin").focus();
    }
  });
  setTimeout(function(){ var p = document.getElementById("gatePin"); if(p) p.focus(); }, 80);
}

/* ---------- Importar datos base (solo si la base está vacía) ---------- */
function seedOffer(fdb){
  var shown = false;
  fdb.collection("projects").limit(1).get().then(function(q){
    if(!q.empty || shown) return; shown = true;
    var box = document.createElement("div");
    box.className = "seed";
    box.innerHTML = '<span>La base está vacía. Importa el archivo <b>tablero-produccion-datos.json</b> para cargar los proyectos actuales.</span>' +
      '<span><button class="btn pri sm" id="seedBtn">Importar datos</button><input type="file" id="seedFile" accept=".json,application/json" hidden></span>';
    var anchor = document.querySelector(".kpis");
    anchor.parentNode.insertBefore(box, anchor);
    var btn = document.getElementById("seedBtn"), file = document.getElementById("seedFile");
    btn.onclick = function(){ file.value = ""; file.click(); };
    file.onchange = function(){
      var f = this.files && this.files[0]; if(!f) return;
      btn.disabled = true; btn.textContent = "Importando…";
      var rd = new FileReader();
      rd.onload = function(){
        try{
          var d = JSON.parse(rd.result), p = d.projects || {}, ids = Object.keys(p);
          if(!ids.length) throw new Error("El archivo no trae proyectos");
          var b = fdb.batch();
          ids.forEach(function(id){ b.set(fdb.doc("projects/" + id), p[id]); });
          if(d.config && d.config.columns) b.set(fdb.doc("config/columns"), d.config.columns);
          b.commit().then(function(){ box.remove(); })["catch"](function(e){
            btn.disabled = false; btn.textContent = "Importar datos"; box.firstChild.textContent = "No se pudo importar: " + e.message;
          });
        }catch(e){ btn.disabled = false; btn.textContent = "Importar datos"; box.firstChild.textContent = "Archivo no válido: " + e.message; }
      };
      rd.readAsText(f, "utf-8");
    };
  })["catch"](function(){});
}

function connect(){
  var f = CFG.firebase || {};
  if(!f.apiKey || !f.projectId || typeof firebase === "undefined"){ resolveDb(null); return; }
  try{
    firebase.initializeApp(f);
    firebase.auth().signInAnonymously().then(function(){
      var fdb = firebase.firestore();
      var ns = Object.freeze({
        doc: function(p){ return DocRef(fdb, p); },
        collection: function(p){ return ColRef(fdb, p); }
      });
      resolveDb(ns);
      seedOffer(fdb);
    })["catch"](function(e){ console.warn("Auth anónima falló — revisa que esté habilitada en Firebase.", e); resolveDb(null); });
  }catch(e){ console.warn("No se pudo iniciar Firebase:", e); resolveDb(null); }
}

function start(){ gate(connect); }
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
