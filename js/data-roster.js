/* ══════════════════════════════════════════════════════════════
   명부 — 54인. 제1막에서 이름을 얻는 사람은 12인뿐이다.
   나머지는 ???로 남아 있고, 막이 열릴 때 하나씩 도착한다.
   ══════════════════════════════════════════════════════════════ */

const ROSTER = {
  /* ── 주역 10 ─────────────────────────────────────────────── */
  kael:      { name:'카엘', role:'변경 수비대장', place:'wall', act:1, tier:'주역', romance:false,
    line:'성벽은 제가 지킵니다. 영주님의 등은… 아직 모르겠습니다.' },
  serena:    { name:'셀레나', role:'교단 서기관', place:'chapel', act:1, tier:'주역', romance:true,
    line:'이 영지의 기록을 맡겠습니다. …기록되지 않는 것은, 지워지는 것입니다.' },
  greta:     { name:'그레타', role:'회계관', place:'castle', act:1, tier:'주역', romance:false,
    line:'마흔닢. 두 달치. 여섯. …환영합니다.' },
  claire:    { name:'클레어', role:'연금술사', place:'workshop', act:1, tier:'주역', romance:true,
    line:'그거 왜 궁금해. …궁금하면 봐. 대신 만지지는 마.' },
  mill:      { name:'밀', role:'용병 · 페르카의 어머니', place:'forest', act:1, tier:'주역', romance:true,
    line:'우리 페르카가 목도리 뜬대. 누구 건지는 안 알려주네.' },
  mira:      { name:'미라', role:'비아 상단주', place:'shop', act:2, tier:'주역', romance:true,
    line:'손해 보는 장사는 안 하지. …당신하고만 예외야.' },
  seraphine: { name:'세라핀', role:'은빛매 밀사', place:'tavern', act:2, tier:'주역', romance:true,
    line:'그건 값이 있어. …안 살 거면 안 물어봐.' },
  rebe:      { name:'레베', role:'용병 · 가론의 어머니', place:'tavern', act:2, tier:'주역', romance:true,
    line:'…먹어.' },
  lana:      { name:'라나', role:'외뿔의 용병단 단장', place:'forest', act:2, tier:'주역', romance:true,
    line:'값을 매기려고. 헐값짜리 들개를 데려갈 순 없잖니.' },
  ellen:     { name:'엘렌', role:'외뿔 악마족 검사', place:'forest', act:2, tier:'주역', romance:true,
    line:'…네 곁은 조용해. 나쁘지 않다.' },

  /* ── 준주역 4 ────────────────────────────────────────────── */
  dorun:     { name:'도런', role:'이름을 감춘 소년', place:'wall', act:1, tier:'준주역', romance:false,
    line:'저, 저기… 이거, 떨어뜨리셨어요.' },
  taron:     { name:'타론', role:'젊은 성기사', place:'chapel', act:3, tier:'준주역', romance:false,
    line:'정의가 뭔지 아직 몰라요. 다만 지키고 싶은 건 분명해요.' },
  sgarteron: { name:'스가르테론', role:'추기경', place:'chapel', act:3, tier:'준주역', romance:false,
    line:'신의 일은 서두르지 않습니다. 다만 놓치지는 않지요.' },
  beloa:     { name:'벨로아', role:'백금성기사단장', place:'castle', act:4, tier:'준주역', romance:true,
    line:'이건 내 말이 아니야. 문장이 적힌 종이야.' },

  /* ── 조연 40 ─────────────────────────────────────────────── */
  hedwyn:    { name:'헤드윈', role:'집무실 시종', place:'castle', act:1, tier:'조연',
    line:'장부보다 문학이 좋습니다. …영주님은 어떤 책을 좋아하십니까.' },
  oskar:     { name:'오스카', role:'성문 위수장', place:'wall', act:1, tier:'조연',
    line:'스무 해 동안 이 문을 열고 닫았습니다. 닫는 날이 더 많았지요.' },
  tilly:     { name:'틸리', role:'전령 소녀', place:'castle', act:1, tier:'조연',
    line:'편지요? 제가 다녀오면 되는데!' },
  ansel:     { name:'안셀', role:'크렌 교구 사제', place:'chapel', act:1, tier:'조연',
    line:'병자의 침상 곁에 있으면, 기도가 짧아집니다. 대신 자주 하게 되지요.' },
  brix:      { name:'브릭스', role:'주점 주인', place:'tavern', act:1, tier:'조연',
    line:'문 닫은 지 삼 년. 잔은 아직 닦아 뒀어요.' },
  talia:     { name:'탈리아', role:'약초 채집인', place:'forest', act:1, tier:'조연',
    line:'그, 그 약초는… 손대지 마세요. 잎에 가시가 있어요.' },
  mordecai:  { name:'모르데카이', role:'왕국 순사관', place:'castle', act:3, tier:'조연', line:'' },
  yuna:      { name:'유나', role:'영빈관 하녀장', place:'castle', act:2, tier:'조연', line:'' },
  brann:     { name:'브란', role:'마부', place:'castle', act:2, tier:'조연', line:'' },
  tobin:     { name:'토빈', role:'곡물 상인', place:'shop', act:2, tier:'조연', line:'' },
  sela:      { name:'셀라', role:'린넨 장수', place:'shop', act:2, tier:'조연', line:'' },
  victor:    { name:'빅터', role:'비아 거래 중개인', place:'shop', act:2, tier:'조연', line:'' },
  nemi:      { name:'네미', role:'겨울 매화 파는 아이', place:'shop', act:2, tier:'조연', line:'' },
  hugo:      { name:'휴고', role:'대장간 머슴', place:'shop', act:2, tier:'조연', line:'' },
  iris:      { name:'아이리스', role:'향료 상인', place:'shop', act:3, tier:'조연', line:'' },
  dane:      { name:'데이네', role:'낡은 서적 상인', place:'shop', act:3, tier:'조연', line:'' },
  maren:     { name:'마렌', role:'수녀장', place:'chapel', act:2, tier:'조연', line:'' },
  pilot:     { name:'필라르', role:'십일조 징수원', place:'chapel', act:2, tier:'조연', line:'' },
  cassia:    { name:'카시아', role:'성가대 소녀', place:'chapel', act:2, tier:'조연', line:'' },
  jerome:    { name:'제롬', role:'파문 서기', place:'chapel', act:2, tier:'조연', line:'' },
  lua:       { name:'루아', role:'고아원 누나', place:'chapel', act:2, tier:'조연', line:'' },
  wren:      { name:'렌', role:'클레어의 견습', place:'workshop', act:2, tier:'조연', line:'' },
  sable:     { name:'세이블', role:'향수 제조인', place:'workshop', act:3, tier:'조연', line:'' },
  otto:      { name:'오토', role:'유리 세공사', place:'workshop', act:3, tier:'조연', line:'' },
  petra:     { name:'페트라', role:'압착기 관리인', place:'workshop', act:3, tier:'조연', line:'' },
  corvin:    { name:'코빈', role:'음유시인', place:'tavern', act:2, tier:'조연', line:'' },
  junko:     { name:'준코', role:'떠돌이 점쟁이', place:'tavern', act:2, tier:'조연', line:'' },
  gam:       { name:'갬', role:'내기 관리인', place:'tavern', act:2, tier:'조연', line:'' },
  lyra:      { name:'릴라', role:'주점 종업원', place:'tavern', act:2, tier:'조연', line:'' },
  marlo:     { name:'말로', role:'떠돌이 광대', place:'tavern', act:2, tier:'조연', line:'' },
  gorm:      { name:'고름', role:'벌목꾼', place:'forest', act:2, tier:'조연', line:'' },
  rowan:     { name:'로완', role:'사냥꾼 반장', place:'forest', act:2, tier:'조연', line:'' },
  bess:      { name:'베스', role:'덫 치는 여인', place:'forest', act:2, tier:'조연', line:'' },
  nils:      { name:'닐스', role:'숲 초소 병사', place:'forest', act:2, tier:'조연', line:'' },
  echo:      { name:'에코', role:'사냥개 조련사', place:'forest', act:2, tier:'조연', line:'' },
  ash:       { name:'애쉬', role:'아르카디아 유학 마법사', place:'tavern', act:2, tier:'조연', line:'' },
  viv:       { name:'비브', role:'연맹 악사', place:'tavern', act:2, tier:'조연', line:'' },
  kaine:     { name:'카인', role:'떠돌이 검객', place:'tavern', act:3, tier:'조연', line:'' },
  poppy:     { name:'포피', role:'이웃 영지 소영애', place:'castle', act:3, tier:'조연', line:'' },
  stefan:    { name:'스테판', role:'왕도 사절 서기', place:'castle', act:3, tier:'조연', line:'' },
};

/* 명부 속에서 처음 보이는 한 줄 — 합류할 때 남는 기억 */
const ROSTER_MEMO = {
  kael:      '성벽을 지키는 사람. 영주를 아직 믿지 않는다.',
  serena:    '교단이 보낸 눈. 보고서의 마지막 줄이 비어 있다.',
  greta:     '숫자로 말하는 회계관. 장부 여백에 사람을 적기 시작했다.',
  hedwyn:    '장부보다 문학을 좋아하는 시종. 방 세 개의 열쇠를 쥐고 있다.',
  oskar:     '성문을 스무 해 지킨 노병. 봉인된 북문을 기억한다.',
  tilly:     '성 계단을 세 칸씩 오르는 전령. 편지가 그녀의 손을 거친다.',
  ansel:     '크렌에서 온 사제. 성당의 촛불과 병자의 침상을 맡는다.',
  brix:      '삼 년 닫힌 주점의 주인. 잔은 아직 닦아 두었다.',
  claire:    '얼어붙은 증류기 앞의 연금술사. 금지된 책 한 권을 숨겼다.',
  talia:     '숲에서 약초를 캐는 여자. 겁이 많아서 더 오래 산다.',
  mill:      '도끼를 메고 오는 용병. 딸 페르카의 목도리를 뜬다.',
  dorun:     '성벽 아래에서 발견된 소년. 이름을 묻지 않으려 한다.',
};

/* 인물별 허브 대사 — 신뢰 0 / 20 / 40 / 60 */
const HUB = {
  kael: [
    '성벽 위는 춥습니다. 영주님도 한 번 올라오셔야 합니다. …지키는 것이 무엇인지 보셔야 하니까요.',
    '순찰은 제가 돌겠습니다. 영주님은 앉아 계십시오. 앉아서 결정하는 일도 지키는 일이니까요.',
    '어제 성문 앞에서 웃으셨습니다. 이 영지에서 웃는 사람을 오래 못 봤습니다. …나쁜 말은 아닙니다.',
    '제 등 뒤를 맡기겠습니다. 한 번만 맡기면, 저는 그걸로 충분합니다.'
  ],
  serena: [
    '오늘의 기도는 짧았습니다. 성당의 촛불이 축축해서, 두 번 갈았습니다.',
    '영주님의 이름은 아직 적지 않았습니다. 적을 자리는 비워 두었습니다. …제가 정할 일이 아니어서요.',
    '이 영지의 기록은 절반이 없습니다. 누군가 지웠습니다. 지운 사람은, 지우는 법을 알고 있었습니다.',
    '영주님. 제 보고서에 오늘 처음으로 제 문장을 썼습니다. 교단이 싫어할 문장입니다.'
  ],
  greta: [
    '금화 마흔닢. 오늘 쓸 수 있는 것은 스물아홉입니다. 나머지는 겨울 몫입니다.',
    '장부 여백이 남습니다. 이상하지요. 숫자는 맞는데, 사람이 안 맞습니다.',
    '여백에 이름을 적었습니다. 회계에 안 잡히는 지출입니다. …제 몫에서 빼겠습니다.',
    '영주님. 이 장부를 태우지 않으시겠습니까. 제가 태운 것처럼 꾸밀 수 있습니다. …농담입니다.'
  ],
  hedwyn: [
    '집무실 열쇠는 세 개입니다. 제가 하나, 영주님이 하나, 나머지 하나는… 오래전에 없어졌습니다.',
    '아르덴의 겨울 이야기를 모아 두었습니다. 읽으시겠습니까. 끝이 다 좋지 않습니다.',
    '방 세 개 중에 가장 따뜻한 방을 드렸습니다. 원래 주인방은 아니지만, 그 방은 불이 잘 붙습니다.',
    '영주님, 오늘은 제가 책을 한 권 빌려 드리고 싶습니다. 반납 기한은 없습니다. 이 영지에 기한이란 게 없어서요.'
  ],
  oskar: [
    '성문은 아침에 열고 밤에 닫습니다. 성벽은… 밤에도 열려 있지요. 늑대에게는 문이 없으니까.',
    '북문 초소는 삼 년 전에 봉인했습니다. 왕가 명이라서요. 이유는 아무도 안 적었습니다.',
    '제 눈이 아직 쓸 만합니다. 눈이 오는 밤에는 불빛이 잘 보입니다. …보면 안 되는 것도 보입니다만.',
    '영주님, 성문을 여는 명령은 언제든 내리십시오. 닫는 명령은, 조금 천천히 내리셔도 됩니다.'
  ],
  tilly: [
    '편지요? 제가 다녀오면 되는데! 성벽까지는 한 시진, 숲 초소까지는 두 시진이면 가요.',
    '오늘 세 통을 배달했어요. 한 통은… 주소가 없어서 제가 들고 있을게요. 주인을 만나면 드릴게요.',
    '영주님 편지를 들고 가면, 사람들이 문을 열어요. 편지는 얼굴보다 빠르니까요.',
    '이번 겨울에 제가 가장 많이 오간 집은 성당이에요. 셀레나 님은 늘 답장을 바로 쓰시더라고요.'
  ],
  ansel: [
    '성당은 난방이 약합니다. 그래도 병자들은 여기로 옵니다. 따뜻한 방보다, 아무도 안 쫓아내는 방이라서요.',
    '약은 모자랍니다. 기도는 남습니다. 그래서 순서를 바꿔 봅니다. 기도를 먼저 하고, 약을 아껴 씁니다.',
    '십일조 장부에 검은 줄이 하나 있습니다. 누가 지웠는지는 저도 모릅니다. 지운 사람은 알겠지요.',
    '영주님, 오늘은 제가 고해를 듣겠습니다? …아니, 이 영지에서는 제가 고해를 들어야 할 것 같습니다.'
  ],
  brix: [
    '주점 문은 삼 년째 닫혀 있습니다. 안이 얼었어요. 불을 피우면 벽이 운다는 소리도 있습니다.',
    '잔은 다 닦아 뒀습니다. 여섯 개. 손님이 여섯이면 딱이지요.',
    '술맛이 예전 같지 않습니다. 물이 바뀐 것 같아요. …아니, 물을 길어 오는 사람이 바뀌었나.',
    '영주님, 오늘은 제가 한잔 올리겠습니다. 값은 나중에 받지요. 이 영지가 언제까지 갚을지, 두고 봅시다.'
  ],
  claire: [
    '증류기가 얼었어. 겨울에는 유리가 먼저 죽어. 사람보다.',
    '그 책? 교단이 금한 거야. 왜 금했는지는 안 적혀 있어. 금한 사람만 알겠지.',
    '네 영지 사람들은 내 물건을 안 사. 약이 필요하면 성당에 가고, 술이 필요하면 주점에 가지. …언젠가 바뀌겠지.',
    '있잖아. 내가 연구하는 게 이 영지에 위험할 수도 있어. 그래도 계속할 거면, 말려 주지 마. …말려 줄 거면, 지금 말해.'
  ],
  talia: [
    '숲에는 들어오지 마세요. …아니, 저는 들어오시면 좋은데, 늑대가 들어오면 안 되니까요.',
    '약초는 얼음 밑에서 자요. 겨울에 더 귀하지요. 사람도 그렇더라고요.',
    '밀 님은 무섭지 않아요? …저는 무서워요. 무섭지만, 그분 옆에 있으면 덜 무서워요.',
    '오늘 캔 약초 중에 하나는, 교단이 금한 거예요. 버릴까 했는데… 영주님이 필요하실까 봐 왔어요.'
  ],
  mill: [
    '영주님! 이거, 우리 페르카가 캔 버섯이에요. 먹어 보세요. …아, 독은 없어요. 아마.',
    '숲은 조용해요. 조용한 게 좋은 건지, 나쁜 건지. 요즘은 나쁜 쪽이 자꾸 먼저 떠올라요.',
    '우리 페르카가 영주님 얘기를 해요. 뿔이 없다고. …이상한 애지요. 뿔 있는 사람만 봐서.',
    '영주님. 이 겨울만 버티면, 봄에 우리 한 번 같이 숲을 걸어요. 무섭지 않은 길로, 제가 골라서.'
  ],
  dorun: [
    '저, 저기… 이거, 떨어뜨리셨어요. …아니, 떨어뜨린 게 아니라, 제가 주우면 안 되는 거였는데.',
    '성벽 아래는 따뜻해요. 바람이 안 들어와서요. …사람들이 안 오는 것뿐이에요.',
    '영주님은 제 이름을 안 물으셨어요. …그게 고마웠어요. 이름을 물으면, 거짓말을 해야 하니까요.',
    '제가 가진 게 하나 있어요. 종이예요. 누가 쓴 건지 모르겠지만… 영주님이 봐야 할 것 같아요.'
  ],
};

const PLACES = {
  castle:   { name:'성채 · 집무실', icon:'🏰', bg:'bg_castle', desc:'장부와 청원, 그리고 성의 열쇠가 있는 방.' },
  wall:     { name:'성벽 · 성문',   icon:'🧱', bg:'bg_castle', desc:'눈이 쌓인 성벽. 밤에는 검은숲이 더 가까워 보인다.' },
  market:   { name:'아르덴 상회',   icon:'🏪', bg:'bg_shop',   desc:'절반은 비어 있는 좌판. 저울은 아직 정직하다.' },
  chapel:   { name:'교단 성당',     icon:'⛪', bg:'bg_chapel', desc:'촛불과 기록. 교단의 눈이 가장 오래 머무는 곳.' },
  workshop: { name:'연금 공방',     icon:'⚗️', bg:'bg_workshop', desc:'얼어붙은 유리와, 금지된 냄새.' },
  tavern:   { name:'주점 은빛 뿔',   icon:'🍺', bg:'bg_tavern', desc:'삼 년 닫힌 문. 안에서는 아직 불이 필요하다.' },
  forest:   { name:'검은숲 경계',   icon:'🌲', bg:'bg_forest', desc:'나무가 눈을 이고 있다. 발자국이 남지 않는 땅.' },
};

/* 시설 — 1막에 지을 수 있는 것 */
const BUILDINGS = {
  wall:     { name:'성벽 Lv1', icon:'🧱', cost:{gold:50, iron:3}, once:true,
    desc:'무너진 서쪽 성벽을 다시 세운다. 늑대떼 습격의 난이도를 바꾼다.', goal:true },
  market2:  { name:'상회 Lv2', icon:'🏪', cost:{gold:80, wood:4}, once:true,
    desc:'빈 좌판을 넓힌다. 하루 수입이 늘고, 원거리 방문자가 온다.' },
  tavern2:  { name:'주점 재개', icon:'🍺', cost:{gold:50, wood:2}, once:true,
    desc:'은빛 뿔의 문을 다시 연다. 민심이 오르고 매일 소문이 하나씩 돈다.' },
  chapel:   { name:'성당 보수', icon:'⛪', cost:{gold:40}, once:true,
    desc:'새는 지붕을 고친다. 신앙이 오르고, 셀레나의 기록이 조금 빨라진다.' },
  greenhouse:{ name:'온실', icon:'🌿', cost:{gold:70, wood:3}, once:true,
    desc:'겨울에도 약초를 기른다. #약초산지 열기가 빠르게 오른다.' },
};

/* 약초·재료 — 상회에서 사고팔 수 있다 */
const GOODS = {
  herb:  { name:'약초', icon:'🌿', sell:5,  buy:10 },
  iron:  { name:'철광', icon:'⛏', sell:12, buy:18 },
  pelt:  { name:'늑대 가죽', icon:'🐺', sell:14, buy:22 },
  wood:  { name:'땔감', icon:'🪵', sell:5,  buy:8 },
  cloth: { name:'린넨', icon:'🧵', sell:9,  buy:14 },
  paper: { name:'양피지', icon:'📜', sell:5,  buy:8 },
};

/* 장소별 반복 행동 — 하루의 '일'이 소문과 자원을 만든다 */
const ACTIONS = {
  castle: [
    { id:'ledger',   name:'장부 정리', icon:'📒', cost:{ap:1}, eff:{gold:6, order:1},
      lines:['장부를 펼친다. 그레타가 모서리를 반듯하게 접어 두었다.','숫자가 맞아떨어진다. 이 영지에서 유일하게 맞아떨어지는 것.'] },
    { id:'petition', name:'청원 듣기', icon:'🙋', cost:{ap:1}, eff:{morale:3, ap:0},
      lines:['줄은 짧다. 사람이 적어서다.','노파가 지붕이 샌다고 했다. 적어 둔다. 지붕은 겨울이 끝나야 고칠 수 있다.'] },
    { id:'paper',    name:'답장 쓸 양피지 사 두기', icon:'📜', cost:{ap:1, gold:8}, eff:{paper:2},
      lines:['양피지는 성의 창고에 남은 마지막 두 장이었다.','값을 치르고 나니, 편지 한 통이 더 비싸게 느껴진다.'] },
  ],
  wall: [
    { id:'patrol',   name:'성벽 순찰', icon:'🔭', cost:{ap:1}, eff:{order:2, morale:1, tag:{forest:1}},
      lines:['성벽 위를 걷는다. 눈이 무릎까지 온다.','성문 밖에 발자국이 있다. 오늘 것은 아니다.'] },
    { id:'repair',   name:'성벽 보수', icon:'🔨', cost:{ap:1, gold:10}, eff:{morale:1, flag:'wall_repair'},
      lines:['무너진 돌을 다시 쌓는다. 하루에 한 뼘씩.','오스카가 말없이 옆에서 돌을 나른다.'] },
  ],
  market: [
    { id:'sell_herb', name:'약초 팔기', icon:'🌿', cost:{ap:1, herb:3}, eff:{gold:15, tag:{herb:2}},
      lines:['탈리아의 약초를 상회 창구에 올린다.','값을 세는 손이 빠르다. 이 영지에 돈이 도는 소리가 난다.'] },
    { id:'sell_pelt', name:'가죽 팔기', icon:'🐺', cost:{ap:1, pelt:2}, eff:{gold:30},
      lines:['가죽 냄새에 상인의 눈이 커진다.','겨울옷을 짓는 집이 왕도에도 있다고 한다.'] },
    { id:'buy_iron',  name:'철광 사기', icon:'⛏', cost:{ap:1, gold:20}, eff:{iron:1},
      lines:['철광 한 덩이. 성벽에 들 돌이다.','상인은 값을 깎아 주지 않았다. 왕도에서 오는 길이 멀어서다.'] },
    { id:'linen',     name:'린넨 사기', icon:'🧵', cost:{ap:1, gold:14}, eff:{cloth:1},
      lines:['아르덴의 무명은 결이 거칠다. 대신 따뜻하다.','여인들이 짠 천에는 이름이 없다. 값에도 없다.'] },
    { id:'buy_food',  name:'곡물 사기', icon:'🍞', cost:{ap:1, gold:12}, eff:{food:4},
      lines:['곡물 자루 네 개. 사흘 치도 안 된다.','상인은 값을 깎지 않는다. 겨울에는 곡식이 곧 시간이다.'] },
    { id:'buy_wood',  name:'땔감 사기', icon:'🪵', cost:{ap:1, gold:8}, eff:{wood:2},
      lines:['마른 장작 두 단. 성의 벽난로가 하루를 버틴다.'] },
  ],
  chapel: [
    { id:'pray',     name:'기도', icon:'🕯', cost:{ap:1}, eff:{faith:3, morale:1},
      lines:['촛불이 짧다. 오늘은 두 번 갈았다.','기도는 짧게, 대신 오래.'] },
    { id:'tithe',    name:'십일조 납부', icon:'⛪', cost:{ap:1, gold:12}, eff:{faith:6, tag:{church:2}, morale:-1},
      lines:['안셀이 봉투를 받고 고개를 숙인다.','교단의 장부에 이 영지의 이름이 한 줄 더 적힌다.'] },
  ],
  workshop: [
    { id:'experiment', name:'공방 돕기', icon:'⚗️', cost:{ap:1}, eff:{gold:8, tag:{herb:1}},
      lines:['클레어가 시험관을 든다. 손이 붉다.','실패한 약이 하나 나온다. 그래도 팔 수 있다.'] },
  ],
  tavern: [
    { id:'drink',    name:'한잔', icon:'🍺', cost:{ap:1, gold:3}, eff:{morale:2, order:-1},
      lines:['문 닫힌 주점에서 브릭스가 잔을 닦는다.','술은 아직 없다. 이야기만 있다.'] },
    { id:'rumor',    name:'소문 듣기', icon:'👂', cost:{ap:1}, eff:{tag:{forest:1}, morale:1},
      lines:['브릭스가 어제 성문에 온 사람 이야기를 한다.','소문은 값이 없다. 그래서 더 빨리 돈다.'] },
  ],
  forest: [
    { id:'gather',   name:'약초 캐기', icon:'🌿', cost:{ap:1}, eff:{herb:3, tag:{herb:1}},
      lines:['눈을 헤치면 얼음 밑에 잎이 있다.','탈리아가 어느 잎을 뜯을지 손끝으로 알려 준다.'] },
    { id:'wood',     name:'땔감하기', icon:'🪵', cost:{ap:1}, eff:{wood:2, tag:{forest:1}},
      lines:['마른 가지를 모은다. 손이 얼지만 땔감은 따뜻하다.','숲이 조용하다. 새 소리도 없다.'] },
    { id:'hunt',     name:'사냥', icon:'🏹', cost:{ap:1}, eff:{pelt:1, morale:1, hp:-4},
      lines:['발자국을 따라간다. 눈이 조용하다.','늑대는 보이지 않는다. 가죽만 남았다.'] },
  ],
};
