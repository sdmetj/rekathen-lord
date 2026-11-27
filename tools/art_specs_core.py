#!/usr/bin/env python3
"""코어·주역 인물 작화 설계도 (v45 리뉴얼).

초상과 전신이 같은 'look' 문장을 공유해 머리색·눈색·복장이 어긋나지 않는다.
41인 조연(art_specs.py)과 같은 파스텔 모던 도트 기준을 쓴다.

  python3 tools/gencore.py --only serena --kind face
"""

# id: (성별, look, 초상 추가 묘사, 전신 추가 묘사)
SPECS = {
    # ── 셀레나 — 교단 서기관 (최우선) ─────────────────────────
    'serena': ('f',
        'a beautiful young woman of twenty-four with long wavy golden-blonde hair framing her shoulders, '
        'large soft amber eyes with long lashes, a delicate silver circlet with a small crystal on her forehead, '
        'a high-collared white and gold priest vestment with a pale blue stole and a small silver cross',
        'a calm gentle look, a faint warm smile, facing the viewer',
        'standing with both hands resting on a small prayer book at her waist, a long white robe with gold trim, '
        'a pale blue stole hanging down the front'),

    # ── 카엘 — 변경 수비대장 ─────────────────────────────────
    'kael': ('m',
        'a handsome slim young man of twenty-six with short tousled warm-brown hair, clear blue eyes, warm light '
        'skin, clean shaven jaw, a small old scar on one cheek, polished silver-blue plate armour over a deep blue '
        'surcoat with a silver cross emblem on the chest',
        'a steady reserved look, a faint confident smile, facing the viewer, head filling the upper frame, '
        'shoulders cropped at the collarbone',
        'standing with one hand resting on the pommel of a longsword at his hip, a deep blue half cape, '
        'armoured boots, tall and slim with 6.5 head proportions, warm light skin, clear blue eyes'),

    # ── 미라 — 비아 상단주 ───────────────────────────────────
    'mira': ('f',
        'a striking woman of twenty-nine with voluminous curly auburn-red hair tied high in a ponytail, '
        'sharp teal-green eyes, small gold hoop earrings, a teal-green scarf wrapped at her neck, a cream blouse '
        'under a brown leather bodice, a merchant satchel strap across her chest',
        'a confident smirk with one brow raised, facing the viewer',
        'standing with one hand on her hip, a leather ledger and a coin purse at her belt, brown travelling boots'),

    # ── 클레어 — 연금술사 ────────────────────────────────────
    'claire': ('f',
        'a pretty young woman of twenty-six with short tousled pastel-pink hair with a mint-green streak in her '
        'bangs, calm green eyes with long lashes, brass goggles pushed up on her head, a dark plum leather '
        'alchemist coat with many straps and buckles',
        'a cool half-lidded look, a tiny knowing smirk, facing the viewer',
        'standing with a small glowing green flask held up in one hand, a heavy leather apron over her coat, '
        'a row of glass vials at her belt'),

    # ── 엘렌 — 외뿔 악마족 검사 ───────────────────────────────
    'ellen': ('f',
        'a stunning demon woman of twenty-one with long straight platinum-white hair, large ruby-red eyes with '
        'long lashes, a single small crimson horn on the left side of her head, pointed ears, fair peach skin '
        'with a soft blush, a black high-collared coat with a dark grey under-shirt, a crimson sash and a thin '
        'silver clasp',
        'a quiet guarded stare, lips slightly parted, facing the viewer',
        'standing with a slender katana held low in one hand, black boots, a long black coat with silver buckles '
        'and a crimson inner sash, fair peach skin'),

    # ── 밀 — 용병・페르카의 어머니 ────────────────────────────
    'mill': ('f',
        'a warm cheerful demon woman of thirty-two with bright green short hair, glowing yellow eyes, a single '
        'short cream horn on the right side of her head, pointed ears, a fur-trimmed brown leather vest over a '
        'cream shirt, a hand axe hanging at her belt',
        'a bright welcoming grin, facing the viewer',
        'standing with a hand axe resting over one shoulder and a travelling pack on her back, sturdy boots'),

    # ── 그레타 — 회계관 ─────────────────────────────────────
    'greta': ('f',
        'a composed young woman of twenty-eight with ash-brown hair pulled into a tight low bun, sharp narrow '
        'grey-green eyes, thin half-rim spectacles, a high-collared dark navy clerk dress with white cuffs',
        'a cool level look, facing the viewer',
        'holding a thick leather ledger against her chest, an abacus hanging at her waist'),

    # ── 세라핀 — 은빛매 밀사 ─────────────────────────────────
    'seraphine': ('f',
        'a beautiful woman of thirty with long wavy dark plum hair, sharp violet eyes, a burgundy high-collared '
        'coat with silver trim and a silver feather brooch, long earrings',
        'a composed knowing smile, facing the viewer',
        'standing with one gloved hand at her collar, a folded letter held at her side, dark heeled boots'),

    # ── 도런 — 이름을 감춘 소년 ───────────────────────────────
    'dorun': ('m',
        'a young demon boy of fifteen with fluffy dark-brown hair, small dark horns on both sides of his head, '
        'pointed ears, warm amber eyes, an oversized grey hooded cloak with a dark red scarf',
        'a wary downcast look, facing the viewer',
        'standing with the hood down, both hands holding the strap of a worn satchel, patched boots'),
}

STYLE_PORTRAIT = (
    'Modern anime pixel art portrait, crisp clean pixel clusters, soft pastel palette, bright cel shading, '
    'flat anime colouring with only two or three tones per material, clean unbroken colour areas, no gradients, '
    'no noise, no texture grime, thin precise outline, no dithering, clean and bright: tight bust portrait, '
    'head large in frame down to the collarbone, '
)
STYLE_BODY = (
    'Modern anime pixel art full-body character sprite, crisp clean pixel clusters, soft pastel palette, bright '
    'cel shading, flat anime colouring with only two or three tones per material, clean unbroken colour areas, '
    'no gradients, no noise, no texture grime, thin precise outline, no dithering, clean and bright: full body '
    'from head to feet, '
)
TAIL = (
    ', centered, plain flat magenta background #FF00FF filling the rest of the frame, '
    'no text, no frame, no border, no watermark, no ground shadow'
)


def prompt(cid, kind):
    sex, look, face_pose, body_pose = SPECS[cid]
    if kind == 'face':
        return STYLE_PORTRAIT + look + ', ' + face_pose + TAIL
    return STYLE_BODY + 'standing, facing the viewer, ' + look + ', ' + body_pose + TAIL
