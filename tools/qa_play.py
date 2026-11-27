import sys, json
from quickjs import Context

files = ['js/data-roster.js','js/data-clues.js','js/data-rumors.js','js/data-act1.js',
         'js/data-letters.js','js/data-nights.js','js/state.js','js/engine.js']
src = "\n".join(open(f, encoding='utf-8').read() for f in files)

shim = r'''
var _store = {};
var localStorage = { getItem:function(k){return _store[k]===undefined?null:_store[k];},
  setItem:function(k,v){_store[k]=String(v);}, removeItem:function(k){delete _store[k];} };
var UI = { toast:function(){}, render:function(){}, openEnding:function(){}, openReport:function(){},
  showErrandDone:function(){}, openScene:function(){}, go:function(){}, openLetter:function(){},
  openPlace:function(){}, maybeAutoEvent:function(){}, closeOverlay:function(){}, openScene:function(){}, showActionResult:function(){} };

var RNG = 12345;
var TRACE=[];
function rnd(){ RNG = (RNG*1103515245+12345) & 0x7fffffff; return RNG/0x7fffffff; }
function pickChoice(list, mode){
  if(!list.length) return null;
  if(mode==='random') return list[Math.floor(rnd()*list.length)];
  var score = list.map(function(c){
    var s=0;
    if(mode==='kind'){ if(c.tone==='warm'||c.tone==='near') s+=3; if(c.tone==='cold') s-=2; }
    if(mode==='cold'){ if(c.tone==='cold'||c.tone==='far') s+=3; if(c.tone==='warm') s-=1; }
    if(c.eff && c.eff.clue) s+=2;
    if(c.eff && c.eff.trust) s+=1;
    return s + rnd()*0.9;
  });
  var m=0; for(var i=1;i<list.length;i++) if(score[i]>score[m]) m=i;
  return list[m];
}
function payOk(c){ return canPay(c.eff); }

function resolveEvent(ev, mode){
  var s=S();
  if(ev.dynamic==='winter_night'){
    var cands=Game.winterCandidates();
    var who=cands.length?cands[0]:null;
    s.seen[ev.id]=1;
    if(who) resolveNight(who, mode);
    return;
  }
  if(ev.finale){
    var list=(ev.choices||[]).filter(payOk);
    var c=pickChoice(list,mode);
    applyEff(c.eff);
    s.log.push({k:'choice',ev:ev.id,label:c.label});
    s.seen[ev.id]=1;
    Game.completeAct1();
    return;
  }
  var ls=(ev.choices||[]).filter(function(c){ return (!c.reqClue || c.reqClue.some(function(id){return s.clues.includes(id);})) && payOk(c); });
  var ch=pickChoice(ls,mode) || (ev.choices||[])[0];
  if(ch) { applyEff(ch.eff); s.log.push({k:'choice',ev:ev.id,label:ch.label}); }
  if(ev.letterAfter){ addLetter(ev.letterAfter); }
  Game.finishEvent(ev);
}

function resolveNight(who, mode){
  var N=NIGHTS[who]; if(!N) return;
  var ch=pickChoice(N.choices.filter(payOk), mode) || N.choices[0];
  applyEff(ch.eff);
  S().nightSeen[who]=(S().nightSeen[who]||0)+1;
  S().flags['night_'+who]=1;
}

function replyLetters(mode){
  var s=S();
  var guard=0;
  while(s.letters.inbox.length && repliesLeft()>0 && guard++<4){
    var id=s.letters.inbox[0];
    var L=LETTERS.find(function(l){return l.id===id;});
    if(!L || !L.replies || !L.replies.length){ s.letters.inbox.shift(); continue; }
    var idx = mode==='kind' ? 0 : mode==='cold' ? 1 : Math.floor(rnd()*3);
    if(repliesLeft()<=0) break;
    Game.replyLetter(id, idx);
  }
}

function spend(day, mode){
  var s=S(); var guard=0;
  while(s.slots[s.phase]>0 && guard++<6){
    if(!s.bld.wall && s.gold>=60 && (s.items.iron||0)>=3) { Game.build('wall'); continue; }
    if(mode!=='cold' && !s.bld.wall && s.gold>=60 && (s.items.iron||0)<3) { Game.buy('iron',1); continue; }
    if((s.items.herb||0)>=3) { Game.sell('herb',3); continue; }
    if((s.items.iron||0)<3 && s.gold>=20) { Game.buy('iron',1); continue; }
    if(s.food<=8 && s.gold>=12) { Game.doAction('market','buy_food'); continue; }
    if(s.phase==='night') break;
    Game.doAction('forest','gather');
  }
}

function run(mode){
  State.reset('테스트');
  RNG = mode==='kind'?7:mode==='cold'?99:2024;
  var s=State.s;
  var steps=0, errs=[];
  for(var day=1; day<=15; day++){
    for(var pi=0; pi<3; pi++){
      var ph=['am','pm','night'][pi];
      if(s.phase!==ph) s.phase=ph; // endDay already sets
      var ev=Game.eventDue(s.day, s.phase);
      if(ev) resolveEvent(ev, mode);
      // 약속
      if(ph==='night' && s.appt && s.appt.day===s.day && s.appt.phase==='night'){
        var who=s.appt.who; s.appt=null; resolveNight(who, mode);
        TRACE.push('  kept night '+who+' seen='+Object.keys(s.nightSeen).join(','));
      }
      spend(day, mode);
      if(ph==='night'){
        TRACE.push('D'+s.day+' inbox='+s.letters.inbox.length+' read='+s.letters.read.length+' rep='+repliesLeft()+' appt='+(s.appt?s.appt.who+'@'+s.appt.day:'-'));
        if(s.day===15 && s.done){ break; }
        spend(day, mode);
        replyLetters(mode);
        Game.endDay();
      } else {
        Game.nextPhase();
      }
      steps++;
      if(steps>200) { errs.push('too many steps'); break; }
    }
    if(s.done) break;
  }
  return {
    mode:mode, day:s.day, done:s.done, met:Object.keys(s.met).length,
    goals:GOALS.filter(function(g){return g.check(s);}).map(function(g){return g.id;}),
    clues:s.clues.slice(), lettersRead:s.letters.read.length, inbox:s.letters.inbox.length,
    trust:s.trust, gold:s.gold, morale:s.morale, food:s.food, wall:s.bld.wall,
    seenCount:Object.keys(s.seen).filter(function(k){return k.indexOf('N_')!==0;}).length,
    nightCount:Object.keys(s.nightSeen).length,
    apptLog:s.apptLog.length,
    flags:Object.keys(s.flags).filter(function(k){return k.indexOf('night_')!==0;}),
    inf:s.inf.length, trace:TRACE
  };
}
'''
ctx = Context()
ctx.eval(shim + src)

for mode in ['kind','cold','random','random','random']:
    try:
        r = ctx.eval(f"JSON.stringify(run('{mode}'))")
        d = json.loads(r)
        print(mode, '| day', d['day'], '| done', d['done'], '| met', d['met'], '| goals', d['goals'],
              '| clues', len(d['clues']), '| letters', d['lettersRead'], '| nights', d['nightCount'],
              '| gold', d['gold'], '| morale', d['morale'], '| food', d['food'], '| wall', d['wall'], '| appts', d['apptLog'])
        print('   flags:', ','.join(d['flags']));print('   trace:', d['trace'])
    except Exception as e:
        print(mode, 'ERROR', e)
