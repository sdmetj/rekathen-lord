/* ══════════════════════════════════════════════════════════════
   대화 엔진 — 프리토크 파서 + 태도 액션 + 하트 이벤트
   정적 웹에서 입력 문장의 의도·키워드·감정톤을 파싱해
   성격별 말투(talk 뱅크) + 호감도/신뢰/기분 변화로 응답한다.
   ══════════════════════════════════════════════════════════════ */

/* ── 의도 판별 ─────────────────────────────────────────────── */
const INTENT_PATTERNS = [
  { intent: 'flirt',   re: /(사랑|예뻐|예쁘다|아름|눈이 가|좋아해|반했|혼자|결혼|입맞춤|키스|안아|손 잡|고백|이뻐|귀엽|매력|설레|그리워|보고 싶|보고싶|데이트|마음을 줄|내 사람|네 편|미인|잘생)/i },
  { intent: 'praise',  re: /(대단|멋있|훌륭|최고|잘했|잘하|감사|고맙|고마워|덕분|똑똑|영리|명석|칭찬|자랑|폼나|믿음직|갬동|감동|존경)/i },
  { intent: 'tease',   re: /(놀리|장난|속여|거짓|하하|ㅋㅋ|ㅋㅎ|바보|얼간|조롱|허세|궁예|쪽팔|웃겨|웃기|재밌|재미)/i },
  { intent: 'comfort', re: /(괜찮|괜찮아|힘내|위로|아무 일|걱정 마|걱정마|쉬어|지쳤|피곤|아파|울어|눈물|안녕|무서|외롭|외로|슬퍼|슬프)/i },
  { intent: 'secret',  re: /(비밀|숨긴|은밀|밀서|정체|사실|진실|과거|어디서|왔|왜 여기|스가르테론|인장|밀정|은뿔매|은빛매|밀수|짐짓|사실은)/i },
  { intent: 'work',    re: /(일|일해|부탁|의뢰|일하|일손|일을|순찰|성벽|수비|훈련|훈련|일거리|도와|협조|계약|일당)/i },
  { intent: 'drink',   re: /(술|한잔|잔|포도주|취하|마셔|음주| 건배|굽)/i },
  { intent: 'battle',  re: /(싸|싸우|검|전투|출진|토벌|도적|늑대|몬스터|마수|숲|원한|복수|전쟁|무기|훈련)/i },
  { intent: 'money',   re: /(돈|금화|값|가격|거래|사줘|팔아|세금|월급|급여|수입|빚|이자|후원|투자)/i },
  { intent: 'faith',   re: /(신|기도|교단|하이레프티아|성당|예배|신앙|축복|십일조|성흔|전례|성녀)/i },
  { intent: 'threat',  re: /(죽여|죽이|위협|협박|감옥|내쫓|내쫓|추방|경고|무력|참수|고문|파문|벌할|벌하|명령이다)/i },
];

function detectIntent(text) {
  for (const p of INTENT_PATTERNS) if (p.re.test(text)) return p.intent;
  if (/[?？]$/.test(text.trim()) || /(뭐야|뭔데|어때|어떻|누구|언제|어디|왜|뭐 하|뭐해)/.test(text)) return 'ask';
  return 'neutral';
}

/* ── 호감도/신뢰 계산 ──────────────────────────────────────── */
function talkGain(char, intent, state) {
  const t = TRAITS[char.trait] || TRAITS.kuudere;
  const base = { flirt: 5, praise: 5, tease: 4, comfort: 4, secret: 6, work: 3, drink: 4, battle: 3, money: 2, faith: 3, ask: 2, neutral: 1, threat: -6 }[intent] ?? 1;
  const likeMul = (t.likes && t.likes[intent]) ?? 1;
  const aff = state.aff[char.id] || 0;
  const stage = affStage(aff);
  let mul = likeMul * (1 + stage * 0.06);
  if (state.day - (state.lastTalk[char.id] || -9) === 0) mul *= 0.35;
  if (state.mood[char.id] === 'sour') mul *= 0.6;
  return Math.round(base * mul);
}
function trustGain(char, intent, state) {
  const m = { secret: 4, work: 3, comfort: 2, battle: 2, drink: 2, flirt: 1, praise: 1, ask: 1, neutral: 0, tease: 0, money: 0, faith: 0, threat: -5 }[intent] ?? 0;
  const deep = char.deepRoute && (state.flags['trust_' + char.id] || 0);
  return Math.round(m * (char.deepRoute ? 1.15 : 1) + (deep && intent === 'secret' ? 1 : 0));
}
function affStage(aff) { return Math.min(10, Math.floor(aff / 100)); }

function affLineFor(char, intent, state) {
  const t = TRAITS[char.trait] || TRAITS.kuudere;
  const bank = t.talk || {};
  const arr = bank[intent];
  if (arr && arr.length) return arr[(state.turn + (state.aff[char.id] || 0)) % arr.length];
  return arr && arr.length ? arr[0] : (bank.neutral || ['…….'])[0];
}

/* ── 프리토크 응답 ─────────────────────────────────────────── */
function respondFreeTalk(char, text, state) {
  const intent = detectIntent(text);
  const t = TRAITS[char.trait] || TRAITS.kuudere;
  let line, dAff = 0, dTrust = 0, mood = null;

  if (intent === 'threat' && (state.aff[char.id] || 0) > 400) {
    line = (TRAITS[char.trait].talk.threat || ['……'])[0] || '';
  }
  if (!line) line = affLineFor(char, intent, state);

  dAff = talkGain(char, intent, state);
  dTrust = trustGain(char, intent, state);

  /* 감정톤 보정 */
  const soft = /(부탁|제발|고마워|미안|사과|잘 부탁)/.test(text);
  if (soft) dAff += 2;
  if (/[!！]{2,}|(죽어|꺼져|쓰레기)/.test(text)) { dAff -= 4; mood = 'sour'; }
  if (intent === 'flirt' && state.aff[char.id] < 150) {
    dAff = Math.max(1, dAff - 3);
    line = pickEarlyFlirt(char, state);
  }
  if (intent === 'secret' && char.id === 'seraphine') dTrust += 2;
  if (intent === 'faith' && char.id === 'serena') dTrust += 2;

  /* 기억 플래그 */
  const mem = [];
  if (/(아내|부인|여왕|왕비)/.test(text)) mem.push('wife_call');
  if (/(아이|아기|애|자식)/.test(text)) mem.push('child_talk');
  if (/(밤|야간|새벽)/.test(text) && intent === 'flirt') mem.push('night_flirt');
  if (/(죄송|미안)/.test(text)) mem.push('apology');
  if (mem.includes('apology') && state.mood[char.id] === 'sour') { mood = 'warm'; dAff += 3; }
  if (mem.includes('wife_call') && (state.rel[char.id] || '') === 'wife') dAff += 4;
  if (mem.includes('child_talk') && state.children.length) dAff += 3;

  return { line, dAff, dTrust, intent, mood, mem };
}

function pickEarlyFlirt(char, state) {
  const t = TRAITS[char.trait] || TRAITS.kuudere;
  const low = {
    tsundere: ['뭐, 뭐야. 아직 그런 말 받을 사이 아니라고.', '첫눈에 반했다는 거, 거짓말이지.'],
    noble: ['값을 매기려면 멀리서부터 다가서는 법이다.', '아직 내 마음의 값을 알지도 못하면서.'],
    trickster: ['아직 식사도 안 했는데 반해? 이 영지 술이 문제네.', '영주님, 그 말 값이 꽤 나갈 텐데.'],
    devout: ['그, 그런 말은 좀 더 친해지고 나서요…….', '영주님, 저 아직 준비가…….'],
    kuudere: ['……아직 아니다. 시간이 필요하다.', '그 말은 기록해 두지 않겠다.'],
    hotblood: ['뭐, 뭐라고?! 그건 조금 빠르잖아!', '갑자기 무슨 소리야!'],
    genius: ['논리적 근거가 부족하다. 재판 필요.', '아직 표본이 1일차인데.'],
    yandere: ['……좋아. 그 말, 못 잊어버렸으면 좋겠어.', '진심이지? 봐, 봐.'],
    timid: ['저, 저기…… 아직 우리 사이가…….', '영주님, 그런 말씀은…… 무서워요.'],
    valiant: ['하! 성급하네, 영주님. 술이라도 마시고 하자.', '그런 말은 밤에 해 보시지.'],
    ambitious: ['매력이 상승세를 타는군요. 지켜보겠습니다.', '빠른 판단이십니다. 다만 저는 조심스럽습니다.'],
    playful: ['어라, 벌써? 빠르네!', '그 말, 나중에 다시 해 줘. 그땐 더 재밌을 것 같아.'],
    loyal: ['그, 그런 말씀은…… 부적절합니다. 아뇨, 싫진 않습니다.', '영주님, 술이라도 드셨습니까.'],
    cynical: ['아직 정보가 부족해. 나중에 다시 팔아 봐.', '썩은 눈이군. 값도 안 나가.'],
  };
  const arr = low[char.trait] || ['…….'];
  return arr[(state.turn + 3) % arr.length];
}

/* ── 하트 이벤트 (핵심 인물) ───────────────────────────────── */
const HEART_STAGES = [2, 4, 6, 8];
const HEART_EVENTS = {
  serena: [
    { at: 2, title: '빈 날의 기도', text: '셀레나가 성당 뒤쪽에서 홀로 앉아 있다. 장부 위에 아무것도 적혀 있지 않다.\n\n"오늘은… 쓸 말이 없네요. 처음입니다."', choices: [{ t: '옆에 앉아 함께 있는다', d: { aff: 60, trust: 10 } }, { t: '기도문을 건네준다', d: { aff: 45, faith: 4 } }] },
    { at: 4, title: '이름의 무게', text: '"헤레테븐에서 저는 번호였습니다. 7번 서기관."\n\n그녀가 처음으로 웃었다.\n\n"여기서는 셀레나예요."', choices: [{ t: '"셀레나."', d: { aff: 80, trust: 12 } }, { t: '"7번 님."', d: { aff: 30, trust: 5 } }] },
    { at: 6, title: '빈 마지막 줄', text: '그녀의 보고서가 책상에 놓여 있다. 마지막 줄이 비어 있다.\n\n"이단의 목록을 써야 하는데… 이름이 떠오르지 않아요. 당신이 원하면 이 영지는 깨끗해질 거예요."', choices: [{ t: '"비워 둬요. 영원히."', d: { aff: 120, trust: 20 } }, { t: '"교단의 뜻대로 하세요."', d: { aff: -40, faith: 10 } }] },
    { at: 8, title: '서기관의 고백', text: '눈이 그치는 밤, 그녀가 기도 대신 당신의 이름을 불렀다.\n\n"신께 바칠 말을 당신에게 주세요. 그게 제 전부예요."', choices: [{ t: '입맞춤한다', d: { aff: 160, love: true } }, { t: '"아직 아가씨로 둘게요"', d: { aff: 70 } }] },
  ],
  mira: [
    { at: 2, title: '짐마차의 잔', text: '미라가 짐마차에 술잔 두 개를 꺼낸다.\n\n"거래 시작 전엔 마시지 않는 게 원칙인데, 오늘은 특별해."', choices: [{ t: '잔을 받는다', d: { aff: 55 } }, { t: '"거래가 먼저다"', d: { aff: 25, gold: 6 } }] },
    { at: 4, title: '상단의 표', text: '"연맹 상단 표를 잃었어요. 그 빚이 3년째… 여기까지 왔죠."\n\n그녀는 웃는데, 눈은 웃지 않았다.', choices: [{ t: '빚을 함께 갚자 말한다', d: { aff: 90, trust: 15 } }, { t: '"값을 치르게 해주지"', d: { aff: 50, gold: -60 } }] },
    { at: 6, title: '비아의 길', text: '그녀가 짐마차 대신 서류를 내민다.\n\n"아르덴 상회를 제가 직영하게 해줘요. 수익은 나누고, 빚도요."', choices: [{ t: '계약한다', d: { aff: 120, trust: 20, gold: -100 } }, { t: '다음을 기약한다', d: { aff: 40 } }] },
    { at: 8, title: '정직한 값', text: '"사람한테 정직한 값은 처음 매겨 봐."\n\n그녀의 손이 당신의 손 위에 놓였다.', choices: [{ t: '"내 값은 얼마야?"', d: { aff: 160, love: true } }, { t: '웃으며 넘긴다', d: { aff: 70 } }] },
  ],
  claire: [
    { at: 2, title: '깨진 시험관', text: '공방 바닥에 유리가 흩어져 있다.\n\n"…실패야. 아깝지 않아. 시험은 늘 그런 거니까."', choices: [{ t: '함께 치운다', d: { aff: 55 } }, { t: '새 유리를 사 준다', d: { aff: 70, gold: -20 } }] },
    { at: 4, title: '금서의 페이지', text: '"이 페이지, 교단이 태우려던 거예요. 개화에 관한 기록."\n\n그녀가 조심스레 당신의 눈을 본다.', choices: [{ t: '"계속 연구해요"', d: { aff: 85, trust: 18, faith: -5 } }, { t: '"교단에 넘겨요"', d: { aff: -50, faith: 12 } }] },
    { at: 6, title: '별빛 비약', text: '냄새가 좋다. 새 비약이 완성됐다.\n\n"당신 이름을 붙이고 싶어. 아르덴식으로."', choices: [{ t: '좋다고 한다', d: { aff: 110, trust: 15, unlock: 'elixir' } }, { t: '"클레어식이 낫다"', d: { aff: 60 } }] },
    { at: 8, title: '은발의 이유', text: '"내 머리가 흰 이유는, 7살 때 개화를 봐서야."\n\n그녀의 손이 당신의 뺨에 닿는다.', choices: [{ t: '그녀의 손을 잡는다', d: { aff: 160, love: true } }, { t: '조용히 곁을 지킨다', d: { aff: 80 } }] },
  ],
  seraphine: [
    { at: 2, title: '깃털의 값', text: '테이블 위에 은빛 깃털이 놓인다.\n\n"이게 내 증표야. 값을 매겨 봐."', choices: [{ t: '"무가"', d: { aff: 50, trust: 8 } }, { t: '"목숨 값"', d: { aff: 65, trust: 5 } }] },
    { at: 4, title: '밀정의 명단', text: '"아르카디아 밀정 명단. 이름 열둘. 그중 세 명은 이 영지 안에 있어."\n\n그녀는 값을 기다린다.', choices: [{ t: '"가르쳐 줘"', d: { aff: 60, gold: -80, trust: 15 } }, { t: '"팔지 마"', d: { aff: 85, trust: 20 } }] },
    { at: 6, title: '은빛매의 새끼', text: '"나도 한때 팔리는 쪽이었어. 은빛매가 날 샀고, 지금은 내가 새다."\n\n그녀가 처음으로 이름을 말했다. "세라핀이야. 그 값은 없어."', choices: [{ t: '"내가 샀다"', d: { aff: 120, trust: 25 } }, { t: '"이름, 기억해 두지"', d: { aff: 80 } }] },
    { at: 8, title: '밤의 계약', text: '그녀가 등 뒤에서 당신을 감싼다.\n\n"이 계약은 파기 안 돼. 죽어도."', choices: [{ t: '"파기할 생각 없어"', d: { aff: 160, love: true } }, { t: '침묵한다', d: { aff: 85 } }] },
  ],
  ellen: [
    { at: 2, title: '눈 위의 검', text: '그녀의 검이 눈에 꽂혀 있다.\n\n"…여기서 뭘 하고 있지." 대답을 기다리지 않는다.', choices: [{ t: '옆에 선다', d: { aff: 40, trust: 8 } }, { t: '"같이 있어줄까"', d: { aff: 60, trust: 5 } }] },
    { at: 4, title: '늑대의 무리', text: '원뿔늑대가 나타났다. 그런데 그녀가 손을 들자 멈춘다.\n\n"…무리야. 나를 키운 놈들."', choices: [{ t: '지나가게 한다', d: { aff: 70, trust: 15, morale: -3 } }, { t: '토벌한다', battle: { name: '원뿔늑대 무리', hp: 55, atk: 11, art: 'wolf', loot: { gold: 40, pelt: 4 } }, d: { aff: -30, trust: 10 } }] },
    { at: 6, title: '왼쪽 뿔의 의미', text: '"왼뿔은 무예. 오른뿔은 마법. 나는 왼쪽이야."\n\n그녀가 처음으로 자기 이야기를 했다.', choices: [{ t: '무기를 봐달라 한다', d: { aff: 85, trust: 20 } }, { t: '"무서웠겠다"', d: { aff: 100, trust: 15 } }] },
    { at: 8, title: '검은숲의 약속', text: '"인간 마을은 여전히 낯설어. 그래도… 여기는 덜 낯설어."\n\n그녀의 손이 잠깐 당신의 소매를 붙잡았다.', choices: [{ t: '그 손을 잡는다', d: { aff: 150, love: true, trust: 20 } }, { t: '조용히 곁에 있는다', d: { aff: 90, trust: 15 } }] },
  ],
  lana: [
    { at: 2, title: '값을 매기려고', text: '"헐값짜리 들개를 데려갈 순 없잖니."\n\n그녀의 시선이 당신의 검을 본다.', choices: [{ t: '검을 뽑아 보인다', d: { aff: 40, trust: 8 } }, { t: '"값은 내가 매긴다"', d: { aff: 55, trust: 5 } }] },
    { at: 4, title: '잘린 뿔', text: '"이 뿔은 세르베르덴에서 잘렸어. 가주였다는 증표지."\n\n그녀는 웃지 않았다.', choices: [{ t: '"지금 단장이 낫잖니"', d: { aff: 80, trust: 15 } }, { t: '"가문이 그립나"', d: { aff: 40, trust: 5 } }] },
    { at: 6, title: '붉은 깃발의 조건', text: '"용병단을 영지에 정식 주둔시켜 줘. 대가는 내가 치르지."\n\n그녀의 눈이 처음으로 부드러워졌다.', choices: [{ t: '허가한다', d: { aff: 110, trust: 20, troops: 6 } }, { t: '"생각해 볼게"', d: { aff: 50 } }] },
    { at: 8, title: '가주의 고백', text: '"나를 데려가 줘. 헐값은 아니야."\n\n그녀가 잔을 내려놓았다.', choices: [{ t: '"값을 치르지"', d: { aff: 160, love: true } }, { t: '"아직은 아니다"', d: { aff: 60, trust: 10 } }] },
  ],
  mill: [
    { at: 2, title: '페르카의 그림', text: '그녀가 낡은 그림을 보여준다. 어린 딸이 웃고 있다.\n\n"내 전부야."', choices: [{ t: '"예쁘다"', d: { aff: 55 } }, { t: '"많이 자랐네"', d: { aff: 35 } }] },
    { at: 4, title: '배의 흉터', text: '"여기, 전장에서 페르카 낳은 자리야."\n\n그녀는 아무 부끄러움도 없이 말했다.', choices: [{ t: '경의를 표한다', d: { aff: 85, trust: 15 } }, { t: '"강한 어머니네요"', d: { aff: 60 } }] },
    { at: 6, title: '은퇴 이야기', text: '"페르카가 크면… 용병 그만둘까. 그때 가서 할 일이 없는데."', choices: [{ t: '여기 남아라', d: { aff: 100, trust: 18 } }, { t: '"너의 검은 네 거야"', d: { aff: 60 } }] },
    { at: 8, title: '듬직한 마음', text: '"당신 옆이면, 페르카도 자랄 것 같아."\n\n그녀가 웃는다. 항상 그렇듯 크게.', choices: [{ t: '"나도 그랬으면"', d: { aff: 150, love: true } }, { t: '웃어준다', d: { aff: 80 } }] },
  ],
  kael: [
    { at: 2, title: '성벽의 순찰', text: '카엘이 성벽 위에서 당신을 기다린다.\n\n"밤바람은 원래 이 맛입니다."', choices: [{ t: '함께 선다', d: { aff: 50, trust: 10 } }, { t: '"보고 듣죠"', d: { aff: 30 } }] },
    { at: 4, title: '전임 영주', text: '"저는 전임 영주의 폭정을 봤습니다. 그래서… 당신이 다르니 이상합니다."', choices: [{ t: '"다르게 살겠지"', d: { aff: 80, trust: 15 } }, { t: '침묵한다', d: { aff: 40 } }] },
    { at: 6, title: '기사의 서약', text: '"제 검은 영주의 것이 아닙니다. 영지 사람들의 것입니다."\n\n그가 무릎을 꿇었다.', choices: [{ t: '서약을 받아준다', d: { aff: 110, trust: 25, troops: 4 } }, { t: '"일어서시오"', d: { aff: 60 } }] },
    { at: 8, title: '우정의 칼', text: '"영주님, 등은 제가 지킵니다. 평생."', choices: [{ t: '"나도 네 등을"', d: { aff: 120, ally: true } }, { t: '"고맙다"', d: { aff: 80 } }] },
  ],
  serena2: [], mira2: [], claire2: [], seraphine2: [], ellen2: [], lana2: [], mill2: [], kael2: [],
};

/* 질투/수라장 */
const JEALOUSY_LINES = {
  serena: ['…그 사람 옷에 다른 향이 나네요. 기도해야겠어요.', '저 혼자만 바라봤으면, 안 되나요.'],
  mira: ['값 매기기 어려운 게 사람 마음이더라. …특히 네 거.', '오늘 장사 안 할래. 기분이 아니까.'],
  claire: ['실험 결과: 내 심박수가 올랐고, 원인은 당신이야.', '…다른 사람 실험대는 가봤어?'],
  seraphine: ['정보 하나 공짜로 줄게. 나는 질투한다는 것.', '네 사람들 목록, 아직 다 아는 건 아니지.'],
  ellen: ['…괜찮아. 나는 익숙해. 그래도 조금은, 싫다.', '다른 사람 곁은… 가지 않는 게 좋겠다.'],
  lana: ['헐값짜리 정을 여럿에 나눌 생각은 없어.', '…질투라는 걸 하는 척도 안 할게. 지금 하니까.'],
  mill: ['페르카도 속상해하겠네. …나도.', '큰 웃음은 안 나오네, 오늘은.'],
  kael: ['…기사도 사람입니다. 이런 마음은 처음이라.', '영주님의 등, 다른 누가 지키기로 했습니까?'],
  taron: ['정의에 관해 배웠는데… 이건 제 마음이 먼저네요.', '…기도가 잘 안 됩니다.'],
  dorun: ['여기서도 나를 두고 가는 건가요.', '…괜찮아요. 익숙해서요.'],
  beloa: ['현실을 말하자면… 나는 관심이 있습니다.', '기사도 질투는 학습합니다.'],
  taron2: [], rebe: ['…아들은 너를 좋아한다. 그거면 됐지.', '말할 이유는 없다. 다만 도끼가 무겁네.'],
  sgarteron: ['신의 일은 서두르지 않습니다. 다만 잊지는 않지요.', '…인내는 미덕이지요.'],
  dorun2: [],
};

function jealousyFor(state, excludeId) {
  const wives = Object.keys(state.rel).filter(id => state.rel[id] === 'wife' || state.rel[id] === 'lover');
  const lovers = wives.filter(id => id !== excludeId);
  if (!lovers.length) return null;
  const target = lovers[(state.day + state.turn) % lovers.length];
  const arr = JEALOUSY_LINES[target];
  if (!arr) return null;
  return { id: target, line: arr[(state.day + state.turn) % arr.length] };
}
