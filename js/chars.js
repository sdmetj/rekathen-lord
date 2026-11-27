/* ══════════════════════════════════════════════════════════════
   인물 명부 — 핵심 네임드 13인 + 변경 인물 41인 = 54인
   54인 전원이 자기 id의 도트(assets/{id}.png · {id}_portrait.png)를 쓴다.
   ══════════════════════════════════════════════════════════════ */

/* tint: [hueShift, satMul, valShift] — 캔버스 팔레트 스왑용 */
const CORE_CHARS = {
  serena: {
    name: '셀레나', role: '하이레프티아 교단 서기관', place: 'chapel', sprite: 'serena', core: true,
    desc: '헤레테븐에서 파견 온 서기관. 영지의 기록을 쥐고 있다.',
    trait: 'devout', romance: true, gift: 'flower', badGift: 'wine',
    secret: '교단의 지시로 변경의 "이단"을 적어 보내고 있다. 마지막 줄은 아직 비어 있다.',
    affinityLine: '그날의 기도, 그리고 당신의 이름이 함께 적혔다.',
  },
  mira: {
    name: '미라', role: "자유 도시 연맹 '비아' 상단주", place: 'shop', sprite: 'mira', core: true,
    desc: '짐마차를 끌고 오는 상인. 값은 정직, 입은 재빠르다.',
    trait: 'trickster', romance: true, gift: 'ribbon', badGift: 'book',
    secret: '연맹의 상단 표를 잃고 갚는 빚이 있다. 그 빚이 그녀를 북쪽까지 보냈다.',
    affinityLine: '손해 보는 장사는 안 하지. …당신하고만 예외야.',
  },
  claire: {
    name: '클레어', role: '영지 연금술사 · 약초상', place: 'workshop', sprite: 'claire', core: true,
    desc: '증류기와 함께 사는 은발 천재. 공방 냄새가 옷에 밴다.',
    trait: 'genius', romance: true, gift: 'book', badGift: 'wine',
    secret: '교단이 금한 "개화"의 기록을 몰래 연구하고 있다. 실험대가 뜨거운 이유다.',
    affinityLine: '네 실험대는 언제나 비어 있어. …내 옆자리, 비워 둘게.',
  },
  seraphine: {
    name: '세라핀', role: "정보소 '은빛매' 밀사", place: 'tavern', sprite: 'seraphine', core: true,
    desc: '깃털 장식의 정보상. 이름도, 목적도, 값도 말이 없다.',
    trait: 'cynical', romance: true, gift: 'feather', badGift: 'candy',
    secret: '아르카디아 제국의 밀정 명단을 쥐고 있다. 팔면 목숨, 쥐면 무게.',
    affinityLine: '네 비밀은 팔지 않았어. …그게 내가 아는 가장 비싼 선물이야.',
  },
  kael: {
    name: '카엘', role: '변경 수비대장', place: 'castle', sprite: 'kael', core: true,
    desc: '웃는 얼굴의 기사. 창 끝은 늘 성벽을 향해 있다.',
    trait: 'loyal', romance: false, gift: 'wine', badGift: 'ribbon',
    secret: '전임 영주의 폭정을 목격한 유일한 생존자다. 그래서 당신을 두려워하지 않는다.',
    affinityLine: '성벽은 제가 지킵니다. 영주님의 등은… 제가 지키고 싶습니다.',
  },
  ellen: {
    name: '엘렌', role: '외뿔 악마족 검사', place: 'forest', sprite: 'ellen', core: true, deep: true,
    desc: '백금발의 왼 외뿔. 검은숲에서 말없이 지나가는 그림자.',
    trait: 'kuudere', romance: true, deepRoute: true, gift: 'book', badGift: 'wine',
    secret: '원뿔늑대 무리에서 자랐다. 인간의 마을은 여전히 낯설다. 무섭지 않다고는 하지 않는다.',
    affinityLine: '…네 곁은 조용해. 나쁘지 않다.',
  },
  lana: {
    name: '라나', role: "외뿔의 용병단 단장", place: 'forest', sprite: 'lana', core: true, deep: true,
    desc: '적색 장발, 왼뿔과 잘린 오른뿔. 세르베르덴의 몰락한 가주.',
    trait: 'noble', romance: true, deepRoute: true, gift: 'wine', badGift: 'candy',
    secret: '가문을 팔아 용병단을 세웠다. 깃발에 남은 문장은 지워지지 않았다.',
    affinityLine: '값을 매기려고. 헐값짜리 들개를 데려갈 순 없잖니.',
  },
  mill: {
    name: '밀', role: '용병단 대원 · 페르카의 어머니', place: 'tavern', sprite: 'mill', core: true,
    desc: '도끼를 메고 다니는 듬직한 용병. 딸 바보다.',
    trait: 'valiant', romance: true, gift: 'candy', badGift: 'book',
    secret: '전장에서 딸을 낳았다. 그날의 흉터는 지금도 배에 남아 있다.',
    affinityLine: '우리 페르카한테 할머니 소리 듣기 전에, 당신이랑 늙고 싶은데.',
  },
  rebe: {
    name: '레베', role: '용병단 대원 · 가론의 어머니', place: 'tavern', sprite: 'rebe', core: true,
    desc: '푸른 장발에 사파이어 같은 눈. 왼뿔 하나, 말보다 손이 먼저 나가는 과부 용병.',
    trait: 'kuudere', romance: true, gift: 'wine', badGift: 'candy',
    secret: '아들 가론을 데리고 도망쳐 왔다. 그 길에 전부 두고 왔다.',
    affinityLine: '…가론이 널 좋아하더라. 그거면 충분해.',
  },
  beloa: {
    name: '벨로아', role: '백금성기사단장', place: 'castle', sprite: 'beloa', core: true,
    desc: '은백발 단발에 파란 눈. 이카르트 공작가 장녀, 타이셀 왕국의 검.',
    trait: 'loyal', romance: true, gift: 'book', badGift: 'candy',
    secret: '왕가 서고의 옛 판본 — 두 줄이 없는 판본 — 을 쥐고 있다.',
    affinityLine: '현실은 이상보다 무겁다. 그래도 나는 아직 검을 쥔다.',
  },
  taron: {
    name: '타론', role: '젊은 성기사', place: 'chapel', sprite: 'taron', core: true,
    desc: '햇빛 같은 성기사 수련. 기도보다 달리기를 좋아한다.',
    trait: 'devout', romance: false, gift: 'candy', badGift: 'wine',
    secret: '교단의 정의와 자기 눈이 가리키는 것이 다르다는 걸 알았다.',
    affinityLine: '정의가 뭔지 아직 몰라요. 다만 지키고 싶은 건 분명해요.',
  },
  sgarteron: {
    name: '스가르테론', role: '추기경', place: 'chapel', sprite: 'sgarteron', core: true,
    desc: '교단의 손은 길다. 서신에도 냄새가 배어 나온다.',
    trait: 'ambitious', romance: false, gift: 'book', badGift: 'candy',
    secret: '왕가와 교단의 밀약 — 양면 인장 보고서의 보낸 사람.',
    affinityLine: '신의 일은 서두르지 않습니다. 다만 놓치지는 않지요.',
  },
  dorun: {
    name: '도런', role: '악마족 수행원', place: 'workshop', sprite: 'dorun', core: true,
    desc: '뿔을 감싼 후드의 소년. 어디서 왔는지 묻지 마라.',
    trait: 'timid', romance: false, gift: 'candy', badGift: 'wine',
    secret: '스가르테론의 시신에서 양면 인장을 훔쳐 나온 장본인이다.',
    affinityLine: '여기서는… 이름을 불러 주셔서, 고맙습니다.',
  },
};

/* 변경 인물 41인 — 전원 자기 고유 작화(assets/{id}.png · {id}_portrait.png)를 쓴다.
   gend 는 대사·호칭 검수용 표식. base 공유 폴백은 폐기했다. */
const MINOR_CHARS = [
  // 성채 · 집무실
  { id: 'hedwyn',  name: '헤드윈',  role: '집무실 시종',      place: 'castle', gend: 'm',  trait: 'playful',  gift: 'candy',  desc: '장부보다 문학을 좋아하는 젊은 시종.' },
  { id: 'greta',   name: '그레타',  role: '회계관',          place: 'castle', gend: 'f',   trait: 'kuudere',  gift: 'book',   desc: '숫자 이외의 말은 낭비라 여긴다.' },
  { id: 'oskar',   name: '오스카',  role: '성문 위수장',      place: 'castle', gend: 'm',     trait: 'loyal',    gift: 'wine',   desc: '스무 해 성문을 지킨 노 위수장.' },
  { id: 'tilly',   name: '틸리',    role: '전령 소녀',        place: 'castle', gend: 'f',    trait: 'playful',  gift: 'candy',  desc: '성 계단을 세 칸씩 뛰어 오르는 전령.' },
  { id: 'mordecai',name: '모르데카이',role: '왕국 순사관',     place: 'castle', gend: 'm',   trait: 'ambitious',gift: 'book',   desc: '왕도에서 온 순사관. 서류 냄새가 난다.' },
  { id: 'yuna',    name: '유나',    role: '영빈관 하녀장',     place: 'castle', gend: 'f',    trait: 'timid',    gift: 'flower', desc: '저택의 빗자루와 명복인.' },
  { id: 'brann',   name: '브란',    role: '마부',            place: 'castle', gend: 'm',   trait: 'hotblood', gift: 'wine',   desc: '말 네 필과 자기 목숨을 같이 괸다.' },
  // 상회 · 상인
  { id: 'tobin',   name: '토빈',    role: '곡물 상인',        place: 'shop',   gend: 'm',     trait: 'trickster',gift: 'wine',   desc: '저울 눈금이 늘 관대하다. 자기 쪽으로.' },
  { id: 'sela',    name: '셀라',    role: '린넨 장수 아주머니',place: 'shop',   gend: 'f',    trait: 'valiant',  gift: 'cloth',  desc: '아르덴 린넨의 명수. 팔면서 노래한다.' },
  { id: 'victor',  name: '빅터',    role: '비아 거래 중개인',  place: 'shop',   gend: 'm',  trait: 'cynical',  gift: 'wine',   desc: '중개 수수료로 검을 샀다는 소문.' },
  { id: 'nemi',    name: '네미',    role: '겨울 매화 파는 아이',place: 'shop',  gend: 'f', trait: 'playful',  gift: 'flower', desc: '눈 속 꽃을 꺾어 파는 꼬마.' },
  { id: 'hugo',    name: '휴고',    role: '대장간 머슴',       place: 'shop',   gend: 'm',   trait: 'hotblood', gift: 'candy',  desc: '망치 소리로 아침을 알린다.' },
  { id: 'iris',    name: '아이리스', role: '향료 상인',        place: 'shop',   gend: 'f',      trait: 'tsundere', gift: 'ribbon', desc: '남부 향료와 도도한 말투.' },
  { id: 'dane',    name: '데이네',  role: '낡은 서적 상인',    place: 'shop',   gend: 'm', trait: 'genius',   gift: 'book',   desc: '금서 한 권에 인생을 걸었다.' },
  // 성당 · 교단
  { id: 'ansel',   name: '안셀',    role: '크렌 교구 사제',    place: 'chapel', gend: 'm',   trait: 'devout',   gift: 'flower', desc: '병자의 침상을 지키는 사제.' },
  { id: 'maren',   name: '마렌',    role: '수녀장',           place: 'chapel', gend: 'f',  trait: 'valiant',  gift: 'flower', desc: '기도와 흥정을 함께 배운 수녀장.' },
  { id: 'pilot',   name: '필라르',  role: '십일조 징수원',     place: 'chapel', gend: 'm',    trait: 'ambitious',gift: 'book',   desc: '곡식 한 스웁도 장부에 남긴다.' },
  { id: 'cassia',  name: '카시아',  role: '성가대 소녀',       place: 'chapel', gend: 'f',  trait: 'timid',    gift: 'flower', desc: '성가대에서 혼자 소리가 커진다.' },
  { id: 'jerome',  name: '제롬',    role: '파문 서기',         place: 'chapel', gend: 'm', trait: 'cynical',  gift: 'book',   desc: '파문장을 쓰다 지쳐 철학을 했다.' },
  { id: 'lua',     name: '루아',    role: '고아원 누나',       place: 'chapel', gend: 'f',   trait: 'devout',   gift: 'candy',  desc: '열두 아이의 밥과 기도를 챙긴다.' },
  // 공방
  { id: 'wren',    name: '렌',      role: '클레어의 견습',     place: 'workshop', gend: 'f',    trait: 'timid',    gift: 'candy',  desc: '증류기 앞에서 잠든다.' },
  { id: 'sable',   name: '세이블',  role: '향수 제조인',       place: 'workshop', gend: 'f',  trait: 'kuudere',  gift: 'flower', desc: '냄새로 사람 기분을 읽는다.' },
  { id: 'otto',    name: '오토',    role: '유리 세공사',       place: 'workshop', gend: 'm',      trait: 'genius',   gift: 'candy',  desc: '시험관을 불어 만든다. 손끝이 예술.' },
  { id: 'petra',   name: '페트라',  role: '압착기 관리인',     place: 'workshop', gend: 'f', trait: 'hotblood', gift: 'wine',   desc: '기계 고장 나면 소리부터 지른다.' },
  // 주점
  { id: 'brix',    name: '브릭스',  role: "주점 주인",        place: 'tavern', gend: 'f',  trait: 'valiant',  gift: 'wine',   desc: "'은빛 뿔'의 여장부. 술값은 정직." },
  { id: 'corvin',  name: '코빈',    role: '음유시인',         place: 'tavern', gend: 'm',  trait: 'playful',  gift: 'wine',   desc: '오늘의 영주를 노래로 만든다.' },
  { id: 'junko',   name: '준코',    role: '떠돌이 점쟁이',     place: 'tavern', gend: 'f',   trait: 'genius',   gift: 'wine',   desc: '손금보다 주사위를 믿는다.' },
  { id: 'gam',     name: '갬',      role: '내기 관리인',       place: 'tavern', gend: 'm',  trait: 'trickster',gift: 'wine',   desc: '주사위에 손가락이 여섯 개 있다는 소문.' },
  { id: 'lyra',    name: '릴라',    role: '종업원 겸 심부름',  place: 'tavern', gend: 'f', trait: 'tsundere', gift: 'candy',  desc: '잔을 깨뜨려도 씩씩하다.' },
  { id: 'marlo',   name: '말로',    role: '떠돌이 광대',       place: 'tavern', gend: 'm',      trait: 'playful',  gift: 'candy',  desc: '웃기려다 늘 혼난다.' },
  // 검은숲 · 노동
  { id: 'gorm',    name: '고름',    role: '벌목꾼',           place: 'forest', gend: 'm',    trait: 'hotblood', gift: 'wine',   desc: '도끼질 한 번에 눈이 흩날린다.' },
  { id: 'talia',   name: '탈리아',  role: '약초 채집인',       place: 'forest', gend: 'f',   trait: 'timid',    gift: 'flower', desc: '어느 약초가 어디 피는지 다 안다.' },
  { id: 'rowan',   name: '로완',    role: '사냥꾼 반장',       place: 'forest', gend: 'm',  trait: 'loyal',    gift: 'wine',   desc: '발자국으로 사람 나이를 읽는다.' },
  { id: 'bess',    name: '베스',    role: '덫 치는 여인',      place: 'forest', gend: 'f',   trait: 'valiant',  gift: 'pelt',   desc: '덫보다 혀가 더 날카롭다.' },
  { id: 'nils',    name: '닐스',    role: '숲 초소 병사',      place: 'forest', gend: 'm',  trait: 'loyal',    gift: 'candy',  desc: '겨울에도 장갑을 끼지 않는다.' },
  { id: 'echo',    name: '에코',    role: '떠돌이 사냥개 조련사',place: 'forest', gend: 'f',    trait: 'tsundere', gift: 'pelt',   desc: '개 네 마리와 말 한 마디.' },
  // 떠돌이 · 손님
  { id: 'ash',     name: '애쉬',    role: '아르카디아 유학 마법사',place: 'tavern', gend: 'm',    trait: 'genius',   gift: 'book',   desc: '마나 이론을 술로 설명한다.' },
  { id: 'viv',     name: '비브',    role: '연맹 악사',         place: 'tavern', gend: 'f',  trait: 'playful',  gift: 'ribbon', desc: '현이 하나 끊어진 비올라.' },
  { id: 'kaine',   name: '카인',    role: '떠돌이 검객',       place: 'tavern', gend: 'm',   trait: 'cynical',  gift: 'wine',   desc: '대련만 하고 떠난다. 이름은 남긴다.' },
  { id: 'poppy',   name: '포피',    role: '이웃 영지 소영애',   place: 'castle', gend: 'f',  trait: 'tsundere', gift: 'ribbon', desc: '담장 너머 이웃 영주의 딸. 말이 세다.' },
  { id: 'stefan',  name: '스테판',  role: '왕도 사절 서기',    place: 'castle', gend: 'm',  trait: 'ambitious',gift: 'book',   desc: '왕도의 눈으로 변경을 적어 간다.' },
];

/* 총 54인: 핵심 13 + 변경 41 */
const CHARS = Object.assign({}, CORE_CHARS, MINOR_CHARS.reduce((a, c) => (a[c.id] = c, a), {}));
Object.keys(CHARS).forEach(k => { CHARS[k].id = k; });
const CORE_IDS = Object.keys(CORE_CHARS);
const ALL_IDS = Object.keys(CHARS);

const ARCHETYPES = { /* trait→캔버스 아이콘 폴백 */
};
