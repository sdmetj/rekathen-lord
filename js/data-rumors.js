/* ══════════════════════════════════════════════════════════════
   소문 태그 · 방문자 · 의뢰
   행동 → 열기(heat) → 태그 → 사람이 문을 두드린다.
   ══════════════════════════════════════════════════════════════ */

const TAGS = {
  herb:    { name:'#약초산지', icon:'🌿', hidden:false, max:6, at:4,
    desc:'숲의 약초가 성 밖으로 나가고 있다는 소문.',
    effect:'탈리아의 약초 주문, 상회 값 상승' },
  mercy:   { name:'#관대한영주', icon:'🕯', hidden:false, max:6, at:4,
    desc:'새 영주는 세금을 깎고 구호를 베푼다는 소문.',
    effect:'난민 유입, 민심 상승' },
  forest:  { name:'#검은숲경계', icon:'🐺', hidden:false, max:6, at:4,
    desc:'성벽 밖에서 무언가 움직인다는 소문.',
    effect:'용병 의뢰, 숲의 사람들이 고개를 든다' },
  church:  { name:'#교단의벗', icon:'⛪', hidden:false, max:6, at:4,
    desc:'아르덴의 새 영주는 교단과 잘 지낸다는 소문.',
    effect:'십일조 요구, 교단의 우호' },
  heresy:  { name:'#이단의온상', icon:'🕯', hidden:true, max:6, at:4,
    desc:'(숨은 소문) 이 영지가 뿔 있는 자들을 숨긴다는 소문.',
    effect:'교단 감찰이 빨라진다' },
  smuggle: { name:'#마정석밀수', icon:'🔮', hidden:true, max:6, at:4,
    desc:'(숨은 소문) 국경 너머로 마정석이 흐른다는 소문.',
    effect:'아르카디아 상인' },
};

/* 태그가 열리면 문 앞에 서는 의뢰 */
const ERRANDS = {
  herb_order: {
    tag:'herb', title:'비아에서 온 약초 주문', icon:'🌿', who:'talia',
    text:'탈리아가 성문 앞에서 서성인다. 손에 비아 상단의 표가 묶인 끈이 들려 있다. "저, 저기… 이거, 값이 세 배래요. 여섯 단이면…."',
    req:{ herb:6 }, due:3,
    reward:{ gold:34, trust:{talia:8}, tag:{herb:1} }, rep:{mercy:1},
    fail:{ trust:{talia:-4}, tag:{herb:-2} },
    done:'약초 여섯 단을 내주었다. 탈리아가 값을 세다가, 손가락이 떨린다. "이만큼이면… 성당 난방을 한 달은 켤 수 있어요."',
  },
  refugee: {
    tag:'mercy', title:'문 앞의 세 가구', icon:'🚪', who:'ansel',
    text:'안셀의 뒤로 사람 셋이 서 있다. 짐은 보따리 하나씩. "크렌에서 왔습니다. 세금을 못 내서… 쫓겨났습니다. 성문 밖에서 얼어 죽는 것보다는, 문 앞에서 죽는 게 낫다고 했습니다."',
    req:{ food:4 }, due:2,
    reward:{ morale:7, faith:2, pop:3 }, rep:{mercy:2},
    fail:{ morale:-4, tag:{mercy:-2} },
    done:'성문을 열었다. 세 가구가 눈을 털며 들어온다. 마지막 사람이 문지방에서 한 번 돌아본다. 뒤에 아무도 없는 것을 확인하고서.',
  },
  forest_contract: {
    tag:'forest', title:'숲의 의뢰', icon:'🐺', who:'mill',
    text:'밀이 성벽 아래에서 손을 흔든다. "숲 초소 쪽에서 부탁이 왔어. 늑대가 길을 막았대. 우리 셋이면 되는데… 영주님이 허락을 안 해 주면, 우리끼리 가도 되는 거야?"',
    req:{ troops:2 }, due:3,
    reward:{ gold:26, trust:{mill:8}, morale:3 }, rep:{bold:1},
    fail:{ trust:{mill:-5}, morale:-3, troops:-1 },
    done:'밀의 무리가 숲으로 들어갔다. 이틀 뒤 돌아온 그녀의 도끼날에 피가 묻어 있다. "길은 뚫었어. 대신, 늑대가 예전보다 가까이 와 있었어."',
  },
  tithe_demand: {
    tag:'church', title:'십일조의 요구', icon:'⛪', who:'ansel',
    text:'안셀이 봉투를 든 채 성당 문 앞에 서 있다. "본당에서 사람이 내려왔습니다. 이번 달 십일조를… 두 배로 하라고 합니다. 제가 막을 수 있는 말이 아닙니다."',
    req:{ gold:16 }, due:2,
    reward:{ faith:8, tag:{church:1} }, rep:{loyal:1},
    fail:{ faith:-6, tag:{church:-2}, morale:2 },
    done:'봉투를 넘겼다. 사절은 세어 보지도 않고 품에 넣는다. 안셀이 문을 닫으며 말한다. "다음에는… 제가 값을 대신 치르겠습니다."',
  },
};

const GOALS = [
  { id:'morale', name:'민심 45', hint:'사람이 떠나지 않을 만큼', check:s => s.morale >= 45, now:s => `민심 ${s.morale}` },
  { id:'wall',   name:'성벽 Lv1', hint:'서쪽 성벽을 다시 세운다', check:s => (s.bld.wall||0) >= 1, now:s => s.bld.wall ? '완공' : '미착공' },
  { id:'food',   name:'식량 10일분', hint:'겨울은 아직 길다', check:s => s.food >= 10, now:s => `식량 ${s.food}일` },
  { id:'docs',   name:'서류와 빈 줄', hint:'교단 보고서를 손에 넣는다', check:s => s.clues.includes('D-01') && s.clues.includes('D-02'), now:s => (s.clues.includes('D-01') ? '보고서' : '—') + ' / ' + (s.clues.includes('D-02') ? '빈 줄' : '—') },
];
