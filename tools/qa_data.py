import re, json, glob, sys
from quickjs import Context

files = ['js/data-roster.js','js/data-clues.js','js/data-rumors.js','js/data-act1.js',
         'js/data-letters.js','js/data-nights.js','js/state.js','js/engine.js']
src = "\n".join(open(f, encoding='utf-8').read() for f in files)

shim = r'''
var _store = {};
var localStorage = {
  getItem: function(k){ return _store[k] === undefined ? null : _store[k]; },
  setItem: function(k,v){ _store[k] = String(v); },
  removeItem: function(k){ delete _store[k]; }
};
var UI = {
  toast: function(){}, render: function(){}, openEnding: function(){}, openReport: function(){},
  showErrandDone: function(){}, openScene: function(){}, go: function(){}, openLetter: function(){},
  openPlace: function(){}, maybeAutoEvent: function(){}, closeOverlay: function(){}
};
'''

ctx = Context()
ctx.eval(shim + src)

print("roster", ctx.eval("Object.keys(ROSTER).length"))
print("act1 roster", ctx.eval("Object.keys(ROSTER).filter(k=>ROSTER[k].act===1).length"))
print("events", ctx.eval("ACT1_EVENTS.length"))
print("letters", ctx.eval("LETTERS.length"))
print("nights", ctx.eval("Object.keys(NIGHTS).length"))
print("clues", ctx.eval("Object.keys(CLUES).length"))
print("inferences", ctx.eval("INFERENCES.length"))

# data integrity
bad = ctx.eval(r'''
(function(){
  var errs = [];
  var ids = {};
  ACT1_EVENTS.forEach(function(e){
    if (ids[e.id]) errs.push('dup event '+e.id); ids[e.id]=1;
    if (!['am','pm','night'].includes(e.phase)) errs.push(e.id+' bad phase');
    if (!e.scene || !e.scene.length) errs.push(e.id+' no scene');
    (e.scene||[]).forEach(function(l){
      if (l.who && !ROSTER[l.who]) errs.push(e.id+' unknown who '+l.who);
      if (l.bg && !['bg_castle','bg_chapel','bg_forest','bg_shop','bg_tavern','bg_workshop'].includes(l.bg)) errs.push(e.id+' bad bg '+l.bg);
    });
    if (e.dynamic !== 'winter_night' && !e.finale && !e.letterAfter && (!e.choices || !e.choices.length)) errs.push(e.id+' no choices');
    (e.choices||[]).forEach(function(c){
      if (!c.label) errs.push(e.id+' choice no label');
      if (!c.res || !c.res.length) errs.push(e.id+' choice no res: '+c.label);
      var eff = c.eff || {};
      (eff.clue||[]).forEach(function(id){ if(!CLUES[id]) errs.push(e.id+' bad clue '+id); });
      (eff.loseClue||[]).forEach(function(id){ if(!CLUES[id]) errs.push(e.id+' bad loseClue '+id); });
      Object.keys(eff.trust||{}).forEach(function(id){ if(!ROSTER[id]) errs.push(e.id+' trust unknown '+id); });
      Object.keys(eff.aff||{}).forEach(function(id){ if(!ROSTER[id]) errs.push(e.id+' aff unknown '+id); });
      (eff.unlock||[]).forEach(function(id){ if(!ROSTER[id]) errs.push(e.id+' unlock unknown '+id); });
      if (eff.letter && !LETTERS.find(function(l){return l.id===eff.letter;})) errs.push(e.id+' bad letter '+eff.letter);
      Object.keys(eff.tag||{}).forEach(function(k){ if(!TAGS[k]) errs.push(e.id+' bad tag '+k); });
      Object.keys(eff.bld||{}).forEach(function(k){ if(['keep','wall','market','chapel','workshop','tavern','greenhouse','manor'].indexOf(k)<0) errs.push(e.id+' bad bld '+k); });
      if (eff.appt) {
        if(!ROSTER[eff.appt.who]) errs.push(e.id+' appt who '+eff.appt.who);
        if(!PLACES[eff.appt.place]) errs.push(e.id+' appt place '+eff.appt.place);
      }
    });
  });
  var lids = {};
  LETTERS.forEach(function(L){
    if (lids[L.id]) errs.push('dup letter '+L.id); lids[L.id]=1;
    if (!ROSTER[L.from]) errs.push('letter from unknown '+L.from);
    if (!L.body || !L.body.length) errs.push(L.id+' no body');
    if (!L.noReply) {
      if (!L.replies || L.replies.length !== 3) errs.push(L.id+' replies != 3');
      (L.replies||[]).forEach(function(r){
        if (!r.res || !r.res.length) errs.push(L.id+' reply no res '+r.t);
        var eff = r.eff||{};
        Object.keys(eff.trust||{}).forEach(function(id){ if(!ROSTER[id]) errs.push(L.id+' trust unknown '+id); });
        Object.keys(eff.aff||{}).forEach(function(id){ if(!ROSTER[id]) errs.push(L.id+' aff unknown '+id); });
        (eff.clue||[]).forEach(function(id){ if(!CLUES[id]) errs.push(L.id+' clue '+id); });
        if (eff.appt && !PLACES[eff.appt.place]) errs.push(L.id+' appt place');
        if (eff.tag) Object.keys(eff.tag).forEach(function(k){ if(!TAGS[k]) errs.push(L.id+' tag '+k); });
      });
    }
  });
  Object.keys(NIGHTS).forEach(function(k){
    var N = NIGHTS[k];
    if (!ROSTER[k]) errs.push('night unknown '+k);
    if (!N.choices || N.choices.length !== 3) errs.push('night '+k+' choices != 3');
    (N.choices||[]).forEach(function(c){ if(!c.res) errs.push('night '+k+' choice no res'); });
  });
  INFERENCES.forEach(function(I){
    I.need.forEach(function(id){ if(!CLUES[id]) errs.push('inference bad '+id); });
  });
  Object.keys(ROSTER).forEach(function(k){
    var f='assets/'+k+'.png', p='assets/'+k+'_portrait.png';
    // existence checked in python side
  });
  return JSON.stringify(errs);
})()
''')
print("integrity errors:", bad)
print("banned:", ctx.eval(r'''
(function(){
  var words=['엘프','메르테이아','도호','레데브로크','인류'];
  var all=JSON.stringify({A:ACT1_EVENTS,L:LETTERS,N:NIGHTS,R:ROSTER,C:CLUES,U:HUB,M:ROSTER_MEMO});
  return words.map(function(w){ return w+':'+ (all.split(w).length-1); }).join(' ');
})()
'''))
