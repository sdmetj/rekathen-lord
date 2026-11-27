#!/usr/bin/env python3
"""변경 인물 41인의 작화 설계도.

초상(portrait)과 전신(body) 프롬프트를 같은 'look' 문장에서 만든다.
같은 문장을 쓰기 때문에 얼굴과 전신의 머리색·눈색·복장이 어긋나지 않는다.

  python3 tools/genchars.py            # 없는 것만 생성
  python3 tools/genchars.py --only greta --kind face
"""

# id: (성별, look, 초상 추가 묘사, 전신 추가 묘사)
# look 은 초상·전신 공통. pose 는 구도별로 다르게.
SPECS = {
    # ── 성채 · 집무실 ───────────────────────────────────────────
    'hedwyn': ('m',
        'a young man of twenty with soft light-brown hair falling over his forehead, warm hazel eyes, '
        'a neat olive servant vest over a cream shirt with rolled sleeves, a folded poem tucked in his breast pocket',
        'a friendly playful smile, one hand raised in greeting',
        'standing with his weight on one leg, the folded poem in one hand'),
    'greta': ('f',
        'a young woman of twenty-six with ash-brown hair pulled into a tight low bun, sharp narrow grey-green eyes, '
        'thin half-rim spectacles, a high-collared dark navy clerk dress with white cuffs, ink on her fingers',
        'a cool composed expression, a leather ledger held to her chest',
        'holding a thick leather ledger with both hands, an abacus at her waist'),
    'oskar': ('m',
        'a grizzled man in his mid fifties with short iron-grey hair, a close-cropped grey beard, a scar across one brow, '
        'steel-grey eyes, weathered skin, heavy plate armour over a faded blue tabard',
        'a steady watchful stare',
        'a long spear planted beside him, a worn tower shield on his back'),
    'tilly': ('f',
        'a cheerful girl of fifteen with copper-red hair in twin braids, freckles across her nose, bright amber eyes, '
        'a moss-green courier cloak over a short tunic, a leather letter satchel over her shoulder',
        'a bright grin, slightly out of breath',
        'a satchel overflowing with letters, her boots muddy from the road'),
    'mordecai': ('m',
        'a stern royal official of forty with black hair slicked back and grey at the temples, sharp dark eyes, '
        'a narrow pointed goatee, a royal-blue inspector coat with gold trim, a wax-sealed document in his hand',
        'a thin assessing smile',
        'an official binder under one arm, a signet ring on his hand'),
    'yuna': ('f',
        'a gentle housekeeper of thirty-five with dark brown hair in a low chignon, soft dark eyes, '
        'a cream blouse with a lace collar and a long grey apron, a ring of keys at her waist',
        'a shy worried look, one hand at her cheek',
        'holding a feather duster, keys jingling at her hip'),
    'brann': ('m',
        'a sunburnt stableman of thirty with straw-blond shaggy hair, blue eyes, a wool cap, a scuffed leather jacket, '
        'a rope halter over his shoulder',
        'a lopsided grin, straw in his hair',
        'a riding crop in one hand, dust on his boots'),

    # ── 상회 · 상인 ─────────────────────────────────────────────
    'tobin': ('m',
        'a plump grain merchant of forty-five with balding brown hair, small sly eyes, a thick mustache, '
        'a green merchant tunic, a clean burlap apron and a leather money belt',
        'a wheedling smile, eyes narrowed in calculation, a brass hand scale raised in one hand',
        'a sack of barley at his feet, coins tucked into his belt'),
    'sela': ('f',
        'a warm linen seller of fifty with grey-streaked auburn hair under a kerchief, rosy cheeks, bright brown eyes, '
        'a cream and indigo striped shawl over a plain dress',
        'a broad singing smile',
        'a bolt of linen under one arm, measuring tape around her neck'),
    'victor': ('m',
        'a sleek broker of thirty-eight with black hair combed back, a thin mustache, cold green eyes, '
        'an expensive charcoal coat with silver trim, rings on his fingers',
        'a bored cynical look',
        'a folded contract in one gloved hand, a coin spinning in the other'),
    'nemi': ('f',
        'a small girl of ten with a black bob and blunt bangs, big dark eyes, a red nose from the cold, '
        'a patched wool coat too big for her, a knitted scarf',
        'a hopeful gap-toothed smile',
        'a wicker basket of pale plum blossoms in both hands'),
    'hugo': ('m',
        'a burly apprentice blacksmith of twenty-two with a dark buzz cut, soot smudges on his cheek, brown eyes, '
        'a leather apron over bare muscular arms',
        'an eager hot-blooded grin',
        'a blacksmith hammer over one shoulder, a bucket of nails at his feet'),
    'iris': ('f',
        'a haughty spice merchant of twenty-four with wavy honey-blonde hair, violet eyes, gold earrings, '
        'a southern silk dress in plum and gold with a fitted bodice, a sheer scarf over one shoulder',
        'a proud sideways glance, chin lifted, one hand raised with an open palm',
        'one hand resting on her hip, a single small perfume bottle in the other hand'),
    'dane': ('m',
        'a dusty old bookseller of sixty with shoulder-length silver-white hair, mud-brown eyes behind round spectacles, '
        'a patched scholar robe with ink-stained sleeves, a magnifying glass on a cord',
        'a distracted curious look',
        'a stack of old books hugged to his chest'),

    # ── 성당 · 교단 ─────────────────────────────────────────────
    'ansel': ('m',
        'a kind village priest of thirty-four with soft brown hair, gentle grey eyes, a plain white robe with a pale blue stole, '
        'a simple wooden cross',
        'a tired gentle smile',
        'a candle in one hand, a worn prayer book in the other'),
    'maren': ('f',
        'a mother superior of forty-eight with a strong jaw, dark eyes, a white wimple covering her hair, '
        'a black and white nun habit, a heavy iron key ring at her waist',
        'a stern but warm expression',
        'a ledger of tithes under her arm'),
    'pilot': ('m',
        'a tithe collector of forty-two with receding black hair, narrow grey eyes, thin lips, a church-blue cassock, '
        'a chained iron money box at his belt',
        'a cold polite smile',
        'the chained money box held in both hands'),
    'cassia': ('f',
        'a shy choir girl of sixteen with long light-brown hair tied with a ribbon, big sky-blue eyes, '
        'a white choir robe with a blue sash',
        'a bashful downcast look, cheeks pink',
        'sheet music held against her chest'),
    'jerome': ('m',
        'a weary clerk of thirty with messy dark hair, heavy stubble, tired brown eyes, an ink-stained black robe, '
        'a quill tucked behind his ear',
        'a cynical half-smile',
        'a half-finished writ in one hand, ink pot in the other'),
    'lua': ('f',
        'a cheerful orphanage sister of twenty-eight with warm chestnut hair in a loose braid, freckles, green eyes, '
        'a patched brown habit with a rope belt',
        'a bright welcoming smile',
        'a wooden bowl of stew in both hands'),

    # ── 공방 ───────────────────────────────────────────────────
    'wren': ('f',
        'a timid apprentice girl of seventeen with a short dark-teal bob, big round brown eyes, '
        'an oversized alchemist apron, brass goggles pushed up on her forehead',
        'a nervous small smile',
        'a glass jar hugged to her chest, soot on her sleeve'),
    'sable': ('f',
        'a pale perfumer of twenty-nine with long straight black hair that shines violet, smoky grey eyes, '
        'a dark plum high-necked gown with long sleeves and a silver clasp, her long black hair falling loose over both shoulders',
        'a calm unreadable look, face clearly visible, no hood, one slim glass vial held up beside her cheek',
        'standing beside a small table of glass vials, face and hair clearly visible, no hood, hands folded at her waist'),
    'otto': ('m',
        'a glassblower of thirty-three with red-brown hair tied back, amber eyes, thick leather smock with burn marks, '
        'brass goggles around his neck',
        'an absorbed clever look',
        'a glowing glass rod in one hand, a half-blown flask in the other'),
    'petra': ('f',
        'a powerfully built press-keeper of forty with short steel-grey hair, a square jaw, blue eyes, '
        'a heavy work shirt with rolled sleeves, oil-stained gloves',
        'an irritable shout, brows drawn',
        'a large wrench over one shoulder'),

    # ── 주점 ───────────────────────────────────────────────────
    'brix': ('f',
        'a hearty tavern keeper of forty-five with black hair streaked grey and tied back, strong arms, hazel eyes, '
        'a red-brown bodice and a stained apron',
        'a booming laugh',
        'a wooden tankard in one raised hand'),
    'corvin': ('m',
        'a cheerful bard of twenty-six with curly golden-brown hair, bright blue eyes, a cream shirt with puffed sleeves '
        'and a red vest, a feathered cap',
        'a bright theatrical grin',
        'a lute held across his body'),
    'junko': ('f',
        'a travelling fortune teller of thirty-five with long black hair strung with small silver rings, dark-lined smoky eyes, '
        'olive skin, layered shawls heavy with coins and bone charms',
        'a knowing half-lidded gaze',
        'a pair of bone dice in her palm'),
    'gam': ('m',
        'a sly games keeper of thirty-one with black hair combed flat, quick dark eyes, a thin smirk, '
        'a waistcoat with many pockets, black gloves',
        'a crooked knowing smile',
        'a leather dice cup in one hand, dice between his fingers'),
    'lyra': ('f',
        'a pouting tavern girl of eighteen with an auburn ponytail, round brown eyes, a green dress under a stained apron',
        'a sulky pout, cheeks flushed',
        'a serving tray balanced on her hip'),
    'marlo': ('m',
        'a wandering clown of twenty-four with orange hair shaved on one side, painted cheeks, droopy grey eyes, '
        'motley patchwork jester clothes with little bells',
        'a rueful funny face',
        'a juggling ball in each hand'),

    # ── 검은숲 · 노동 ───────────────────────────────────────────
    'gorm': ('m',
        'a huge woodcutter of thirty-four with a shaved head, a ginger beard, brown eyes, '
        'a single thick dark horn on the right side of his head, a fur-trimmed leather vest',
        'a blunt friendly grin',
        'a great axe resting on one shoulder'),
    'talia': ('f',
        'a shy herbalist of twenty-two with waist-length moss-green hair, freckles, pale brown eyes, '
        'a hooded forest-green cloak over a simple dress',
        'a startled gentle look',
        'a basket of herbs and mushrooms on her arm'),
    'rowan': ('m',
        'a weathered hunt master of forty-four with grey-streaked dark hair tied back, sharp grey eyes, deep lines, '
        'layered furs over a dark green coat',
        'a quiet assessing stare',
        'a longbow in one hand, a quiver at his hip'),
    'bess': ('f',
        'a wiry trapper of thirty with short black hair, a thin scar on her cheek, sharp brown eyes, '
        'a single short pale horn on the left side of her head, patched leather hunter gear',
        'a sharp mocking grin',
        'wire snares hanging from her belt, a knife at her hip'),
    'nils': ('m',
        'a young outpost soldier of nineteen with a light-brown bowl cut under a steel cap, a round freckled face, blue eyes, '
        'a padded guard gambeson with a wolf-head badge',
        'an earnest nervous look',
        'a spear in one hand, the other bare and red from the cold'),
    'echo': ('f',
        'a young woman of twenty-six with a soft feminine face, long eyelashes, full lips and a slim waist, '
        'shoulder-length silver-grey hair with a small braid at one temple, dark eyes, freckles, '
        'a single small dark horn on the left side of her head, '
        'a patched riding coat cinched at the waist over a fitted linen shirt and breeches',
        'a guarded sidelong look, lips pressed thin',
        'a dog whistle on a cord in one hand, one hand on her hip, muddy boots'),

    # ── 떠돌이 · 손님 ───────────────────────────────────────────
    'ash': ('m',
        'a foreign mage of twenty-seven with ash-grey hair, dark red eyes, a thin black scholar coat embroidered with silver sigils, '
        'a high collar',
        'a dry bemused expression',
        'a small glowing ring hovering above his palm, a wine cup in the other hand'),
    'viv': ('f',
        'a lively minstrel of twenty-three with long wine-red hair, wide grey eyes, '
        'a patched mismatched dress of green and gold, a ribbon at her throat',
        'a bright impish smile',
        'a viola with one broken string held in both hands'),
    'kaine': ('m',
        'a wandering swordsman of twenty-eight with long black hair half-tied, one grey eye with a calm stare, '
        'light stubble, a worn dark leather coat over a plain shirt',
        'a flat tired look',
        'a plain longsword at his hip, a travel pack over one shoulder'),
    'poppy': ('f',
        'a proud young noblewoman of seventeen with strawberry-blonde ringlets, blue eyes, '
        'a frilly pastel pink and white dress, a small silver tiara',
        'a haughty pout, chin high',
        'a folded fan in one hand, a lace parasol over her shoulder'),
    'stefan': ('m',
        'a royal envoy clerk of thirty with chestnut hair neatly parted, gold-brown eyes, '
        'a stiff royal envoy uniform with an embroidered high collar and a sash',
        'a polite measured smile',
        'a sealed letter in a gloved hand'),
}

STYLE_PORTRAIT = (
    'Modern anime pixel art portrait, crisp clean pixel clusters, soft pastel palette, bright cel shading, '
    'flat anime colouring with only two or three tones per material, clean unbroken colour areas, no gradients, '
    'no noise, no texture grime, thin precise outline, no dithering, clean and bright: tight bust portrait, '
    'head large in frame down to the collarbone, facing the viewer, '
)
STYLE_BODY = (
    'Modern anime pixel art full-body character sprite, crisp clean pixel clusters, soft pastel palette, bright cel shading, '
    'flat anime colouring with only two or three tones per material, clean unbroken colour areas, no gradients, '
    'no noise, no texture grime, thin precise outline, no dithering, clean and bright: full body from head to feet, '
    'standing, facing the viewer, '
)
TAIL = (
    ', centered, plain flat magenta background #FF00FF filling the rest of the frame, '
    'no text, no frame, no border, no watermark, no ground shadow'
)


def prompt(cid, kind):
    sex, look, face_pose, body_pose = SPECS[cid]
    if kind == 'face':
        return STYLE_PORTRAIT + look + ', ' + face_pose + TAIL
    return STYLE_BODY + look + ', ' + body_pose + TAIL
