import sqlite3, socket, io, base64, os, json, random, re, time
from datetime import date, timedelta
from functools import wraps
from flask import Flask, render_template, request, jsonify, redirect, session
from werkzeug.security import generate_password_hash, check_password_hash

app  = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True
PORT = 5001

# Store the database in the OS-appropriate user data folder
import platform as _platform
_sys = _platform.system()
if _sys == 'Windows':
    _DATA_DIR = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'MathQuest')
elif _sys == 'Darwin':
    _DATA_DIR = os.path.expanduser('~/Library/Application Support/MathQuest')
else:
    _DATA_DIR = os.path.expanduser('~/.local/share/MathQuest')
os.makedirs(_DATA_DIR, exist_ok=True)
# MATHQUEST_DB lets a deploy (or a test run) point at a different database
# without editing the source. Defaults to the user data folder as before.
DB = os.environ.get('MATHQUEST_DB') or os.path.join(_DATA_DIR, 'scores.db')

# ── Teacher authentication ───────────────────────────────────
# The dashboard exposes the whole roster, the award/delete buttons, the reset
# and the students' PINs, so it must not be reachable by anyone who guesses the
# URL on the school network.
#
# This password lives in the source and therefore in git history. It is a gate
# to keep students out, not a secret — treat it accordingly. To harden it later,
# read it from an environment variable instead of changing it here.
TEACHER_PASSWORD = 'math'

# Signing key for the session cookie. Persisted next to the database so that
# logging in survives a restart of the app; regenerated if it goes missing.
_SECRET_FILE = os.path.join(_DATA_DIR, 'secret_key')

def _load_secret():
    try:
        with open(_SECRET_FILE, 'rb') as f:
            key = f.read()
        if len(key) >= 32:
            return key
    except OSError:
        pass
    key = os.urandom(32)
    try:
        with open(_SECRET_FILE, 'wb') as f:
            f.write(key)
        os.chmod(_SECRET_FILE, 0o600)
    except OSError:
        pass   # fall back to a per-process key; login simply won't persist
    return key

app.secret_key = _load_secret()
app.permanent_session_lifetime = timedelta(hours=12)   # one school day

def require_teacher(fn):
    """Gate a route behind the teacher login."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if session.get('role') == 'teacher' or session.get('teacher'):
            return fn(*args, **kwargs)
        if request.method == 'POST' or request.path.startswith('/api/'):
            return jsonify({'ok': False, 'error': 'unauthorized'}), 401
        return redirect('/teacher/login?next=' + request.path)
    return wrapper

def _safe_next(raw):
    """Only ever redirect back to a teacher page, never off-site."""
    nxt = str(raw or '/teacher')
    return nxt if nxt.startswith('/teacher') and not nxt.startswith('//') else '/teacher'

@app.route('/teacher/login', methods=['GET', 'POST'])
def teacher_login():
    nxt = _safe_next(request.values.get('next'))
    if request.method == 'POST':
        if request.form.get('password') == TEACHER_PASSWORD:
            session['teacher'] = True
            session.permanent  = True
            return redirect(nxt)
        return render_template('teacher_login.html', error=True, next=nxt), 401
    if session.get('teacher'):
        return redirect(nxt)
    return render_template('teacher_login.html', error=False, next=nxt)

@app.route('/teacher/logout', methods=['GET', 'POST'])
def teacher_logout():
    session.pop('teacher', None)
    return redirect('/teacher/login')

# ── Item catalog ─────────────────────────────────────────────
# Item catalog. Shared with the client, which used to keep its own copy.
ITEMS = {
    "health_potion":  {'name': "Bình Máu Sinh Lực", 'name_es': "Poción de Salud", 'name_en': "Health Potion",
                       'emoji': "🧪", 'rarity': "common"},
    "gold_coin":      {'name': "Đồng Vàng May Mắn", 'name_es': "Moneda de Oro", 'name_en': "Gold Coin",
                       'emoji': "🪙", 'rarity': "common"},
    "trail_bread":    {'name': "Bánh Mì Hành Trình", 'name_es': "Pan del Camino", 'name_en': "Trail Bread",
                       'emoji': "🍞", 'rarity': "common"},
    "firewood":       {'name': "Ngọn Lửa Khởi Đầu", 'name_es': "Leña", 'name_en': "Firewood",
                       'emoji': "🪵", 'rarity': "common"},
    "adventure_pack": {'name': "Túi Du Đấu", 'name_es': "Mochila de Aventura", 'name_en': "Adventure Pack",
                       'emoji': "🎒", 'rarity': "common"},
    "rope":           {'name': "Dây Thừng Cứu Sinh", 'name_es': "Cuerda Resistente", 'name_en': "Sturdy Rope",
                       'emoji': "🧶", 'rarity': "common"},
    "iron_sword":     {'name': "Kiếm Sắt", 'name_es': "Espada de Hierro", 'name_en': "Iron Sword",
                       'emoji': "🗡️", 'rarity': "uncommon"},
    "wooden_shield":  {'name': "Khiên Gỗ", 'name_es': "Escudo de Madera", 'name_en': "Wooden Shield",
                       'emoji': "🛡️", 'rarity': "uncommon"},
    "wizard_hat":     {'name': "Nón Phù Thủy", 'name_es': "Sombrero de Mago", 'name_en': "Wizard Hat",
                       'emoji': "🎩", 'rarity': "uncommon"},
    "spell_book":     {'name': "Sách Phép Bí Truyền", 'name_es': "Libro de Hechizos", 'name_en': "Spell Book",
                       'emoji': "📖", 'rarity': "uncommon"},
    "compass":        {'name': "La Bàn Chỉ Đường", 'name_es': "Brújula", 'name_en': "Compass",
                       'emoji': "🧭", 'rarity': "uncommon"},
    "magic_wand":     {'name': "Đũa Phép Thuật", 'name_es': "Varita Mágica", 'name_en': "Magic Wand",
                       'emoji': "🪄", 'rarity': "uncommon"},
    "lantern":        {'name': "Đèn Lồng Soi Sáng", 'name_es': "Linterna Encantada", 'name_en': "Enchanted Lantern",
                       'emoji': "🏮", 'rarity': "uncommon"},
    "leather_helm":   {'name': "Mũ Da Kiên Cường", 'name_es': "Casco de Cuero", 'name_en': "Leather Helmet",
                       'emoji': "⛑️", 'rarity': "uncommon"},
    "crystal_orb":    {'name': "Quả Cầu Pha Lê", 'name_es': "Orbe de Cristal", 'name_en': "Crystal Orb",
                       'emoji': "🔮", 'rarity': "rare"},
    "silver_crown":   {'name': "Vương Miện Bạc", 'name_es': "Corona de Plata", 'name_en': "Silver Crown",
                       'emoji': "👑", 'rarity': "rare"},
    "steel_sword":    {'name': "Kiếm Thép Kiên Cố", 'name_es': "Espada de Acero", 'name_en': "Steel Sword",
                       'emoji': "⚔️", 'rarity': "rare"},
    "magic_gem":      {'name': "Viên Ngọc Ma Thuật", 'name_es': "Gema Mágica", 'name_en': "Magic Gem",
                       'emoji': "💎", 'rarity': "rare"},
    "treasure_map":   {'name': "Bản Đồ Kho Báu", 'name_es': "Mapa del Tesoro", 'name_en': "Treasure Map",
                       'emoji': "🗺️", 'rarity': "rare"},
    "iron_armor":     {'name': "Giáp Sắt Kiên Cố", 'name_es': "Armadura de Hierro", 'name_en': "Iron Armor",
                       'emoji': "🦺", 'rarity': "rare"},
    "dragon_scale":   {'name': "Vảy Rồng Thần", 'name_es': "Escama de Dragón", 'name_en': "Dragon Scale",
                       'emoji': "🐉", 'rarity': "legendary"},
    "star_fragment":  {'name': "Mảnh Sao Băng", 'name_es': "Fragmento de Estrella", 'name_en': "Star Fragment",
                       'emoji': "🌟", 'rarity': "legendary"},
    "mystic_amulet":  {'name': "Bùa Hộ Mệnh Huyền Bí", 'name_es': "Amuleto Místico", 'name_en': "Mystic Amulet",
                       'emoji': "🧿", 'rarity': "legendary"},
    "enchanted_helm": {'name': "Mũ Chiến Binh Thần Thánh", 'name_es': "Casco Encantado", 'name_en': "Enchanted Helmet",
                       'emoji': "🪖", 'rarity': "legendary"},
}
BY_RARITY = {r: [k for k, v in ITEMS.items() if v['rarity'] == r]
             for r in ['common', 'uncommon', 'rare', 'legendary']}

# The single source of truth for the level ladder. The client used to carry its
# own copy of this table; index.html now receives it from here (see index()), so
# a student's own screen and the display board can no longer disagree about what
# level they are or what it is called.
LEVELS = [
    {'level': 1,  'xp': 0,     'title': 'Học Đồng Toán Học',   'title_es': 'Escudero Matemático',      'emoji': '🧑'},
    {'level': 2,  'xp': 900,   'title': 'Tập Sự Khám Phá',    'title_es': 'Aprendiz',                 'emoji': '📚'},
    {'level': 3,  'xp': 2100,  'title': 'Trinh Sát Số Học',    'title_es': 'Explorador',               'emoji': '🗺️'},
    {'level': 4,  'xp': 3900,  'title': 'Hiệp Sĩ Toán Học',    'title_es': 'Caballero de los Números', 'emoji': '⚔️'},
    {'level': 5,  'xp': 6300,  'title': 'Pháp Sư Biểu Thức',   'title_es': 'Mago de Ecuaciones',       'emoji': '🔮'},
    {'level': 6,  'xp': 9300,  'title': 'Thiện Xạ Tỉ Số',      'title_es': 'Guardián de Razones',      'emoji': '🏹'},
    {'level': 7,  'xp': 12900, 'title': 'Chiến Binh Phân Số',  'title_es': 'Guerrero de Fracciones',   'emoji': '🛡️'},
    {'level': 8,  'xp': 17100, 'title': 'Phù Thủy Hình Học',   'title_es': 'Lanzador de Hechizos',     'emoji': '✨'},
    {'level': 9,  'xp': 21900, 'title': 'Quán Quân Toán Học',  'title_es': 'Campeón de Matemáticas',   'emoji': '🏆'},
    {'level': 10, 'xp': 27600, 'title': 'Đại Pháp Sư',         'title_es': 'Gran Brujo',               'emoji': '🧙'},
    {'level': 11, 'xp': 34500, 'title': 'Bậc Thầy Toán Thuật', 'title_es': 'Maestro Arcano',           'emoji': '⚡'},
    {'level': 12, 'xp': 43500, 'title': 'Huyền Thoại Toán Học','title_es': 'Leyenda Matemática',       'emoji': '🌟'},
]

# Derived views, indexed by level number (so index 0 is unused padding).
LEVEL_THRESHOLDS = [l['xp'] for l in LEVELS]
LEVEL_TITLES     = [''] + [l['title'] for l in LEVELS]
LEVEL_EMOJIS     = [''] + [l['emoji'] for l in LEVELS]
# Sanity bounds on what one round may report. The client computes round XP, so
# these are the ceiling on a malformed or forged POST, not game balance. The
# theoretical maximum round is 11,850 XP — 10 hard questions at 30 base, doubled
# by iron_sword, x6 streak, x3 dragon_scale, +30/correct from magic_gem, plus the
# finish and perfect bonuses and 620 of flat item bonuses — so 15,000 clears
# legitimate play comfortably. Item drops max out at 5 (base + perfect + 2 from
# adventure_pack + 1 guaranteed legendary).
# Difficulty is chosen by the student, not the teacher. These three tables make
# choosing a harder level worth it. Without them the easiest setting dominates on
# every axis — the streak multiplier (up to 3x), the round bonus and the
# accuracy-driven loot all reward *not missing*, which swamps the 15->30 XP
# difference between an easy and a hard question.
#
#   index 0 = easy only, 1 = up to medium, 2 = full ramp
DIFF_XP_MULT   = [1.0, 1.3, 1.7]   # applied to question + finish + round bonus
# Accuracy is judged against what the student actually attempted, so a 8/10 on
# the full ramp counts as a top-tier round just as 10/10 does on easy only.
DIFF_TOP_ACC   = [1.0, 0.9, 0.8]   # earns the round bonus and a second item
DIFF_MID_ACC   = [0.7, 0.6, 0.5]   # earns an uncommon rather than a common

# The theoretical maximum round is now (11,230 x 1.7) + 620 flat item bonuses =
# 19,711, so the forged-request ceiling has to clear that. Flat item bonuses are
# deliberately NOT multiplied — the item labels promise an exact number and #5
# was about exactly that kind of drift.
DIFF_LABELS = ['Khởi Động (Dễ)', 'Thử Thách (Dễ + Vừa)', 'Đỉnh Cao (Đầy đủ)']
DIFF_ICONS  = ['🟢', '🟡', '🔴']

MAX_ROUND_XP    = 25000
MAX_ROUND_ITEMS = 10

# ── Skins catalog ────────────────────────────────────────────
PRICES = {'common': 40, 'uncommon': 80, 'rare': 150, 'legendary': 300}

def _s(sid, typ, emoji, name, name_es, rarity, custom_price=None):
    return {'id': sid, 'type': typ, 'emoji': emoji, 'name': name,
            'name_es': name_es, 'rarity': rarity, 'price': custom_price if custom_price is not None else PRICES[rarity]}

SKINS = [
    # ── Avatars: Nhóm phiêu lưu ──
    _s('auto',   'avatar', None,  'Tự động (Theo Cấp)', 'Auto (Nivel)',        'common'),
    _s('knight', 'avatar', '⚔️', 'Hiệp Sĩ',           'Caballero',           'uncommon'),
    _s('archer', 'avatar', '🏹', 'Cung Thủ',           'Arquero',             'uncommon'),
    _s('mage',   'avatar', '🔮', 'Pháp Sư',           'Mago',                'rare'),
    _s('wizard', 'avatar', '🧙', 'Phù Thủy',          'Brujo',               'rare'),
    _s('bard',   'avatar', '🎭', 'Nhạc Sĩ Du Ca',     'Bardo',               'rare'),
    _s('dragon', 'avatar', '🐉', 'Kỵ Sĩ Rồng',        'Jinete de Dragón',    'legendary'),
    _s('legend', 'avatar', '🌟', 'Huyền Thoại',       'Leyenda',             'legendary'),
    # ── Avatars: Nhóm nghề nghiệp hiện đại ──
    _s('sorceress','avatar','🧙‍♀️','Nữ Phù Thủy',      'Hechicera',           'rare'),
    _s('stargazer','avatar','🔭','Nhà Thiên Văn',     'Observadora',         'uncommon'),
    _s('artist',   'avatar','🎨','Họa Sĩ',            'Artista',             'uncommon'),
    _s('scientist','avatar','🧪','Nhà Bác Học',       'Científica',          'rare'),
    _s('athlete',  'avatar','⚽','Cầu Thủ',           'Atleta',              'uncommon'),
    _s('astronaut','avatar','🚀','Phi Hành Gia',      'Astronauta',          'legendary'),
    _s('chef',     'avatar','👩‍🍳','Đầu Bếp',          'Chef',                'uncommon'),
    _s('detective','avatar','🕵️','Thám Tử',          'Detective',           'rare'),
    # ── Avatars: Nhóm vui nhộn ──
    _s('taco',    'avatar','🌮','Bánh Taco',         'Taco Poderoso',       'common'),
    _s('duck',    'avatar','🦆','Vịt Vàng',          'Pato de Goma',        'common'),
    _s('cactus',  'avatar','🌵','Xương Rồng Gai',    'Pete Espinoso',       'common'),
    _s('sloth',   'avatar','🦥','Lười Siêu Tốc',     'Perezoso Veloz',      'common'),
    _s('robot',   'avatar','🤖','Người Máy Beep',    'Bip Bop',             'uncommon'),
    _s('ghost',   'avatar','👻','Hồn Ma Vui Vẻ',     'Bu',                  'uncommon'),
    _s('unicorn', 'avatar','🦄','Kỳ Lân',            'Unicornio',           'rare'),
    _s('alien',   'avatar','👽','Người Ngoài Hành Tinh','Visitante',         'rare'),
    _s('narwhal', 'avatar','🐋','Kỳ Lân Biển',       'Narval',              'rare'),
    _s('crown',   'avatar','👑','Hoàng Gia',         'Realeza',             'legendary'),
    _s('phoenix', 'avatar','🦅','Phượng Hoàng Lửa',  'Fénix',               'legendary'),
    # ── Themes màu sắc ──
    _s('arcane', 'theme', '🔮', 'Huyền Bí',          'Arcano',              'common'),
    _s('forest', 'theme', '🌿', 'Rừng Xanh',         'Bosque',              'common'),
    _s('ember',  'theme', '🔥', 'Tàn Lửa',           'Brasa',               'uncommon'),
    _s('ocean',  'theme', '🌊', 'Đại Dương',         'Marea',               'uncommon'),
    _s('void',   'theme', '🌙', 'Hư Không',          'Vacío',               'rare'),
    _s('solar',  'theme', '☀️', 'Thái Dương',        'Solar',               'legendary'),
    # ── Khung đại diện (Frames) ──
    _s('none',          'frame', '✕',  'Mặc định',          'Sin Marco',        'common'),
    _s('silver',        'frame', '🥈', 'Khung Bạc',         'Plata',            'uncommon'),
    _s('gold',          'frame', '👑', 'Khung Vàng',        'Oro',              'rare'),
    _s('dragon',        'frame', '🐉', 'Khung Rồng Thần',   'Dragón',           'legendary'),
    _s('legend',        'frame', '🌟', 'Khung Huyền Thoại', 'Leyenda',          'legendary'),
    _s('frame_summer',  'frame', '🏖️', 'Khung Mùa Hè',      'Marco de Verano',  'rare', 400),
    _s('frame_student', 'frame', '🎓', 'Khung Học Sinh',    'Marco Estudiante', 'uncommon', 300),
    # ── Trang phục học sinh EdTech (Outfits) ──
    _s('hoodie_blue',   'outfit', '🧥', 'Áo hoodie xanh',   'Sudadera Azul',       'common', 250),
    _s('tshirt_white',  'outfit', '👕', 'Áo thun trắng',    'Camiseta Blanca',     'uncommon', 200),
    _s('jacket_black',  'outfit', '🧥', 'Áo khoác đen',     'Chaqueta Negra',      'rare', 350),
    _s('sport_pants',   'outfit', '👖', 'Quần thể thao',    'Pantalón Deportivo',  'uncommon', 250),
    _s('cap_blue',      'outfit', '🧢', 'Mũ lưỡi trai',     'Gorra Deportiva',     'common', 150),
    _s('sport_glasses', 'outfit', '👓', 'Kính thể thao',    'Gafas Deportivas',    'uncommon', 200),
    # ── Vật phẩm đặc biệt (Special Items) ──
    _s('sticker_boost', 'item',   '⚡', 'Sticker tăng lực', 'Sticker de Poder',    'common', 150),
]
SKIN_BY_TYPE = {}
for _sk in SKINS:
    SKIN_BY_TYPE.setdefault(_sk['type'], {})[_sk['id']] = _sk

# Everyone starts owning the defaults, so nobody can be left with nothing equipped.
FREE_SKINS = {'avatar': ['auto'], 'theme': ['arcane'], 'frame': ['none'], 'outfit': ['hoodie_blue']}

# Coins per round. Deliberately the same gradient as the XP multiplier in #4:
# what you earn to spend on skins tracks the difficulty you actually faced and
# how well you did, so chasing a collection pulls toward harder maths rather
# than away from it.
COIN_BASE      = 10
COIN_DIFF_MULT = [1.0, 1.5, 2.0]

def coins_for_round(faced_band, correct):
    '''Coins for one round: base x difficulty faced x how well it went.'''
    band = max(0, min(int(faced_band), 2))
    acc  = max(0, min(int(correct), 10)) / 10
    return int(round(COIN_BASE * COIN_DIFF_MULT[band] * (0.5 + acc)))

# XP required to unlock each cosmetic. The client used to hold these thresholds
# alone and the server accepted whatever it was told, so any student could equip
# the Legend frame at 10 XP by posting to /api/character/<name>/equip. The
# wardrobe screen now reads these same numbers (injected into index.html), so
# what the student sees as locked is exactly what the server refuses.
COSMETICS = {
    'theme':  {'arcane': 0, 'forest': 900, 'ember': 2100, 'ocean': 3900,
               'void': 9300, 'solar': 17100},
    'avatar': {'auto': 0, 'knight': 2100, 'archer': 3900, 'mage': 6300,
               'wizard': 9300, 'bard': 12900, 'dragon': 27600, 'legend': 43500},
    'frame':  {'none': 0, 'silver': 6300, 'gold': 12900, 'dragon': 21900,
               'legend': 34500},
}

# Avatars, derived from the skins catalog (the single source since #20).
AVATARS = [{'id': k['id'], 'emoji': k['emoji'], 'name': k['name'], 'name_es': k['name_es']}
           for k in SKINS if k['type'] == 'avatar']
# 'auto' has no emoji of its own — char_emoji falls back to the level emoji.
AV_EMOJIS = {a['id']: a['emoji'] for a in AVATARS if a['emoji']}


def parent_unit(uid):
    """Map a sub-topic ID to its parent unit ('c1a' -> 'c1', 'u1a' -> 'u1'); pass others through.

    The client works in sub-topics (c1a, c3c, c8a) but stats and XP are credited
    per parent unit, so every entry point must normalise before validating.
    """
    m = re.match(r'^([a-z]\d+)[a-z]$', uid)
    return m.group(1) if m else uid

# ── Danh mục Chương trình Toán 6 Việt Nam (GDPT 2018) ────────
UNITS = [
    {'id': "c1", 'num': "1", 'name': "Số tự nhiên & Tính chia hết",
     'name_es': "Números Naturales",
     'icon': "🔢", 'color': "#4ade80",
     'en': "", 'es': "",
     'subs': [
        {'id': "c1a", 'name': "Tập hợp & Số La Mã",
         'name_es': "Conjuntos y Números Romanos",
         'desc': "Phần tử tập hợp, đọc và viết chữ số La Mã",
         'desc_es': "Elementos de conjuntos y números romanos"},
        {'id': "c1b", 'name': "Lũy thừa & Thứ tự phép tính",
         'name_es': "Potencias y Orden de Operaciones",
         'desc': "Nhân chia luỹ thừa cùng cơ số, tính giá trị biểu thức",
         'desc_es': "Multiplicación y división de potencias, orden de operaciones"},
        {'id': "c1c", 'name': "Tính chất chia hết & Dấu hiệu",
         'name_es': "Divisibilidad y Reglas",
         'desc': "Dấu hiệu chia hết cho 2, 3, 5, 9 và tính chất tổng",
         'desc_es': "Criterios de divisibilidad por 2, 3, 5, 9"},
        {'id': "c1d", 'name': "Số nguyên tố & Hợp số",
         'name_es': "Números Primos y Compuestos",
         'desc': "Nhận biết số nguyên tố, phân tích ra thừa số nguyên tố",
         'desc_es': "Identificar números primos y descomposición en factores primos"},
        {'id': "c1e", 'name': "ƯCLN và BCNN",
         'name_es': "MCD y MCM",
         'desc': "Ước chung lớn nhất, bội chung nhỏ nhất và bài toán thực tế",
         'desc_es': "Máximo común divisor y mínimo común múltiplo"},
        {'id': "c1z", 'name': "Luyện tập Số tự nhiên",
         'name_es': "Práctica de Números Naturales",
         'desc': "Ứng dụng tổng hợp các phép tính và tính chia hết",
         'desc_es': "Aplicaciones mixtas de números naturales"},
     ]},
    {'id': "c2", 'num': "2", 'name': "Số nguyên",
     'name_es': "Números Enteros",
     'icon': "🧭", 'color': "#00d4aa",
     'en': "", 'es': "",
     'subs': [
        {'id': "c2a", 'name': "Số nguyên âm & Trục số",
         'name_es': "Enteros Negativos y Recta Numérica",
         'desc': "Tập hợp Z, số đối, so sánh hai số nguyên",
         'desc_es': "Conjunto Z, números opuestos y comparación"},
        {'id': "c2b", 'name': "Phép cộng & trừ số nguyên",
         'name_es': "Suma y Resta de Enteros",
         'desc': "Cộng và trừ hai số nguyên cùng dấu, khác dấu",
         'desc_es': "Suma y resta con mismo y diferente signo"},
        {'id': "c2c", 'name': "Quy tắc dấu ngoặc",
         'name_es': "Regla de Paréntesis",
         'desc': "Bỏ dấu ngoặc, đổi dấu và tính nhanh",
         'desc_es': "Eliminación de paréntesis y cálculo rápido"},
        {'id': "c2d", 'name': "Phép nhân & chia số nguyên",
         'name_es': "Multiplicación y División de Enteros",
         'desc': "Quy tắc nhân chia số nguyên, bội và ước của số nguyên",
         'desc_es': "Regla de los signos, múltiplos y divisores de enteros"},
        {'id': "c2z", 'name': "Luyện tập Số nguyên",
         'name_es': "Práctica de Enteros",
         'desc': "Tổng hợp phép tính trên tập hợp số nguyên",
         'desc_es': "Aplicaciones mixtas con enteros"},
     ]},
    {'id': "c3", 'num': "3", 'name': "Hình học trực quan & Đối xứng",
     'name_es': "Geometría Visual y Simetría",
     'icon': "📐", 'color': "#f59e0b",
     'en': "", 'es': "",
     'subs': [
        {'id': "c3a", 'name': "Tam giác đều, Hình vuông, Lục giác đều",
         'name_es': "Triángulo Equilátero, Cuadrado, Hexágono",
         'desc': "Nhận biết các cạnh, góc và tính chất hình đều",
         'desc_es': "Lados y ángulos de figuras regulares"},
        {'id': "c3b", 'name': "Hình chữ nhật, Thoi, Bình hành, Thang cân",
         'name_es': "Rectángulo, Rombo, Paralelogramo, Trapecio",
         'desc': "Đặc điểm hình học các tứ giác thường gặp",
         'desc_es': "Propiedades de cuadriláteros comunes"},
        {'id': "c3c", 'name': "Chu vi & Diện tích các hình phẳng",
         'name_es': "Perímetro y Área",
         'desc': "Tính chu vi, diện tích hình chữ nhật, vuông, thoi, thang, bình hành",
         'desc_es': "Cálculo de perímetro y área en la práctica"},
        {'id': "c3d", 'name': "Trục đối xứng & Tâm đối xứng",
         'name_es': "Eje y Centro de Simetría",
         'desc': "Hình có trục đối xứng và tâm đối xứng trong tự nhiên",
         'desc_es': "Figuras con simetría axial y central"},
        {'id': "c3z", 'name': "Luyện tập Hình học trực quan",
         'name_es': "Práctica de Geometría Visual",
         'desc': "Tổng hợp chu vi, diện tích và tính chất hình phẳng",
         'desc_es': "Aplicaciones mixtas de geometría"},
     ]},
    {'id': "c4", 'num': "4", 'name': "Phân số",
     'name_es': "Fracciones",
     'icon': "🍕", 'color': "#ff6b35",
     'en': "", 'es': "",
     'subs': [
        {'id': "c4a", 'name': "Khái niệm phân số & Bằng nhau",
         'name_es': "Concepto de Fracción y Equivalencia",
         'desc': "Tử số, mẫu số, nhận biết hai phân số bằng nhau",
         'desc_es': "Numerador, denominador y fracciones equivalentes"},
        {'id': "c4b", 'name': "Rút gọn & Quy đồng mẫu số",
         'name_es': "Simplificación y Común Denominador",
         'desc': "Rút gọn về phân số tối giản, quy đồng mẫu số",
         'desc_es': "Fracción irreducible y común denominador"},
        {'id': "c4c", 'name': "So sánh phân số",
         'name_es': "Comparación de Fracciones",
         'desc': "So sánh phân số cùng mẫu, khác mẫu, so sánh với 0 và 1",
         'desc_es': "Comparar fracciones con igual y distinto denominador"},
        {'id': "c4d", 'name': "Cộng và trừ phân số",
         'name_es': "Suma y Resta de Fracciones",
         'desc': "Phép cộng và trừ hai phân số, tính chất phép tính",
         'desc_es': "Suma y resta de fracciones y propiedades"},
        {'id': "c4e", 'name': "Nhân và chia phân số, Hỗn số",
         'name_es': "Multiplicación, División y Mixtos",
         'desc': "Quy tắc nhân chia phân số, đổi hỗn số sang phân số",
         'desc_es': "Multiplicar, dividir y números mixtos"},
        {'id': "c4f", 'name': "Hai bài toán về phân số",
         'name_es': "Dos Problemas de Fracciones",
         'desc': "Tìm giá trị phân số của một số và tìm số khi biết giá trị phân số",
         'desc_es': "Fracción de un número y problema inverso"},
        {'id': "c4z", 'name': "Luyện tập Phân số",
         'name_es': "Práctica de Fracciones",
         'desc': "Ứng dụng tổng hợp các phép tính và bài toán phân số",
         'desc_es': "Aplicaciones mixtas con fracciones"},
     ]},
    {'id': "c5", 'num': "5", 'name': "Số thập phân & Tỉ số phần trăm",
     'name_es': "Decimales y Porcentajes",
     'icon': "💯", 'color': "#ec4899",
     'en': "", 'es': "",
     'subs': [
        {'id': "c5a", 'name': "Khái niệm số thập phân & So sánh",
         'name_es': "Concepto de Decimales y Comparación",
         'desc': "Số thập phân âm, dương, số đối, so sánh số thập phân",
         'desc_es': "Decimales positivos y negativos, comparación"},
        {'id': "c5b", 'name': "Phép tính số thập phân",
         'name_es': "Operaciones con Decimales",
         'desc': "Cộng, trừ, nhân, chia số thập phân",
         'desc_es': "Suma, resta, multiplicación y división de decimales"},
        {'id': "c5c", 'name': "Làm tròn & Ước lượng kết quả",
         'name_es': "Redondeo y Estimación",
         'desc': "Làm tròn đến hàng đơn vị, phần mười, phần trăm",
         'desc_es': "Redondeo y estimación de resultados"},
        {'id': "c5d", 'name': "Tỉ số & Tỉ số phần trăm",
         'name_es': "Razones y Porcentajes",
         'desc': "Tính tỉ số phần trăm, bài toán giảm giá khuyến mãi, lãi suất",
         'desc_es': "Porcentajes, descuentos e interés"},
        {'id': "c5z", 'name': "Luyện tập Số thập phân",
         'name_es': "Práctica de Decimales",
         'desc': "Tổng hợp phép tính số thập phân và tỉ số phần trăm",
         'desc_es': "Aplicaciones mixtas de decimales y porcentajes"},
     ]},
    {'id': "c6", 'num': "6", 'name': "Điểm, Đoạn thẳng & Góc",
     'name_es': "Puntos, Segmentos y Ángulos",
     'icon': "📏", 'color': "#a855f7",
     'en': "", 'es': "",
     'subs': [
        {'id': "c6a", 'name': "Điểm và Đường thẳng",
         'name_es': "Puntos y Rectas",
         'desc': "Điểm thuộc đường thẳng, ba điểm thẳng hàng, đường thẳng cắt nhau, song song",
         'desc_es': "Puntos colineales, rectas paralelas y secantes"},
        {'id': "c6b", 'name': "Tia & Hai tia đối nhau",
         'name_es': "Rayos y Rayos Opuestos",
         'desc': "Gốc của tia, hai tia đối nhau, hai tia trùng nhau",
         'desc_es': "Rayos con el mismo origen, opuestos y coincidentes"},
        {'id': "c6c", 'name': "Đoạn thẳng & Trung điểm",
         'name_es': "Segmentos y Punto Medio",
         'desc': "Độ dài đoạn thẳng, điểm nằm giữa, trung điểm của đoạn thẳng",
         'desc_es': "Longitud de segmentos y punto medio"},
        {'id': "c6d", 'name': "Góc & Số đo góc",
         'name_es': "Ángulos y Medida",
         'desc': "Đỉnh và cạnh của góc, góc nhọn, vuông, tù, bẹt, so sánh góc",
         'desc_es': "Ángulos agudos, rectos, obtusos y llanos"},
        {'id': "c6z", 'name': "Luyện tập Hình học phẳng cơ bản",
         'name_es': "Práctica de Geometría Básica",
         'desc': "Tổng hợp điểm, đoạn thẳng, trung điểm và số đo góc",
         'desc_es': "Aplicaciones mixtas de geometría plana"},
     ]},
    {'id': "c7", 'num': "7", 'name': "Thống kê & Xác suất",
     'name_es': "Estadística y Probabilidad",
     'icon': "📊", 'color': "#60a5fa",
     'en': "", 'es': "",
     'subs': [
        {'id': "c7a", 'name': "Thu thập dữ liệu & Biểu đồ tranh",
         'name_es': "Recolección de Datos y Pictogramas",
         'desc': "Phân loại dữ liệu, đọc và giải thích biểu đồ tranh",
         'desc_es': "Clasificación de datos y lectura de pictogramas"},
        {'id': "c7b", 'name': "Biểu đồ cột & Cột kép",
         'name_es': "Gráficos de Barras Simples y Dobles",
         'desc': "Đọc và so sánh số liệu trên biểu đồ cột đơn và cột kép",
         'desc_es': "Lectura y comparación de gráficos de barras"},
        {'id': "c7c", 'name': "Kết quả có thể & Kết quả thuận lợi",
         'name_es': "Resultados Posibles y Favorables",
         'desc': "Liệt kê kết quả có thể trong thí nghiệm đồng xu, con xúc xắc",
         'desc_es': "Resultados en lanzamientos de monedas y dados"},
        {'id': "c7d", 'name': "Xác suất thực nghiệm",
         'name_es': "Probabilidad Experimental",
         'desc': "Tính xác suất thực nghiệm của một sự kiện sau nhiều lần thử",
         'desc_es': "Cálculo de probabilidad experimental"},
        {'id': "c7z", 'name': "Luyện tập Thống kê & Xác suất",
         'name_es': "Práctica de Estadística y Probabilidad",
         'desc': "Tổng hợp phân tích biểu đồ và xác suất thực nghiệm",
         'desc_es': "Aplicaciones mixtas de estadística y probabilidad"},
     ]},
    {'id': "c8", 'num': "8", 'name': "Đấu Trường Tổng Hợp Lớp 6",
     'name_es': "Repaso General de 6.º Grado",
     'icon': "🌟", 'color': "#fbbf24",
     'en': "", 'es': "",
     'subs': [
        {'id': "c8a", 'name': "Đấu Trường Liên Chương",
         'name_es': "Desafío de Todos los Temas",
         'desc': "Ôn tập tổng hợp toàn bộ các kỹ năng Toán lớp 6",
         'desc_es': "Repaso de todas las habilidades matemáticas de 6.º"},
     ]},
]

# Derived views. Sub-topics inherit their parent's icon and colour, which is
# how the client has always rendered them.
IM_UNITS     = [u['id'] for u in UNITS]
IM_UNIT_META = {u['id']: (int(u['num']), u['name'], u['icon']) for u in UNITS}

# Shapes the templates consume.
UNIT_GROUPS_JS = [{k: u[k] for k in ('id','num','name','name_es','icon','color','en','es')}
                  for u in UNITS]
SUB_TOPICS_JS  = [dict(s, parent=u['id'], icon=u['icon'], color=u['color'])
                  for u in UNITS for s in u['subs']]
TEACHER_GROUPS = [(u['id'], u['num'], u['name'], u['color'], u['icon'],
                   u['en'], u['es'], [(s['id'], s['name']) for s in u['subs']])
                  for u in UNITS]

# Names are rendered on the student, teacher and display screens. Output is
# escaped at every sink, but we also refuse the characters that make markup
# possible so a bad name can never reach storage in the first place.
NAME_RE = re.compile(r'^[^\x00-\x1f<>"&\\/]{1,20}$')

def clean_name(raw):
    """Return a validated display name, or None if it isn't usable."""
    name = str(raw or '').strip()[:20]
    return name if NAME_RE.match(name) else None

def this_monday():
    today = date.today()
    return (today - timedelta(days=today.weekday())).isoformat()

def maybe_reset_week(c):
    """Lazily rotate week_xp → last_week_xp on the first request after Monday.

    Every route that reads week_xp, week_rounds or last_week_xp must call this
    first, or it will serve the previous week's numbers as though they were this
    week's.
    """
    monday = this_monday()
    row    = c.execute("SELECT value FROM settings WHERE key='week_start'").fetchone()
    stored = row[0] if row else None
    if stored == monday:
        return

    # Whether the stored week is the one that just ended. If more than one week
    # has elapsed, the immediately preceding week saw no activity at all — any
    # request would have rotated and moved week_start forward — so "last week"
    # is genuinely zero, not whatever the last active week happened to score.
    try:
        last_monday = (date.fromisoformat(monday) - timedelta(days=7)).isoformat()
        carry_over  = stored == last_monday
    except ValueError:
        carry_over = False

    if carry_over:
        c.execute('UPDATE characters SET last_week_xp = week_xp, week_xp = 0, week_rounds = 0')
    else:
        c.execute('UPDATE characters SET last_week_xp = 0, week_xp = 0, week_rounds = 0')
    c.execute("INSERT OR REPLACE INTO settings (key,value) VALUES ('week_start',?)", (monday,))

def char_emoji(cosmetics, xp):
    lv  = min(calc_level(xp), len(LEVEL_EMOJIS) - 1)
    av  = cosmetics.get('avatar', 'auto')
    return AV_EMOJIS.get(av, LEVEL_EMOJIS[lv]) if av != 'auto' else LEVEL_EMOJIS[lv]

def calc_level(xp):
    lv = 1
    for i, t in enumerate(LEVEL_THRESHOLDS):
        if xp >= t:
            lv = i + 1
    return min(lv, len(LEVEL_THRESHOLDS))

# ── Helpers ──────────────────────────────────────────────────
def get_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def make_qr(url):
    import qrcode
    qr = qrcode.QRCode(version=1, box_size=9, border=3,
                       error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color='#1e1d38', back_color='#ffffff')
    buf = io.BytesIO()
    img.save(buf, 'PNG')
    return base64.b64encode(buf.getvalue()).decode()

# Every table keyed by a student's name. delete_student and the teacher reset
# both walk this list, so adding a new per-student table can no longer leave
# orphans behind — the events table already did, and a deleted student kept
# being announced on the classroom display board.
STUDENT_TABLES = ('characters', 'events', 'xp_history', 'student_unit_stats',
                  'student_topic_stats')

def init_db():
    with sqlite3.connect(DB) as c:
        c.execute('PRAGMA journal_mode=WAL')   # better concurrent-write performance
        c.execute('''CREATE TABLE IF NOT EXISTS characters (
            name          TEXT PRIMARY KEY,
            xp            INTEGER DEFAULT 0,
            level         INTEGER DEFAULT 1,
            items         TEXT DEFAULT '[]',
            rounds_played INTEGER DEFAULT 0,
            week_xp       INTEGER DEFAULT 0,
            last_week_xp  INTEGER DEFAULT 0,
            unit_xp       TEXT DEFAULT '{}',
            cosmetics     TEXT DEFAULT '{}',
            last_played   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        # Migrate existing DB: add new columns if they don't exist yet
        for col_sql in [
            'ALTER TABLE characters ADD COLUMN week_xp      INTEGER DEFAULT 0',
            'ALTER TABLE characters ADD COLUMN last_week_xp INTEGER DEFAULT 0',
            "ALTER TABLE characters ADD COLUMN unit_xp      TEXT DEFAULT '{}'",
            "ALTER TABLE characters ADD COLUMN cosmetics     TEXT DEFAULT '{}'",
            'ALTER TABLE characters ADD COLUMN rounds_en     INTEGER DEFAULT 0',
            'ALTER TABLE characters ADD COLUMN rounds_es     INTEGER DEFAULT 0',
            "ALTER TABLE characters ADD COLUMN unit_rounds   TEXT DEFAULT '{}'",
            'ALTER TABLE characters ADD COLUMN pin           TEXT DEFAULT NULL',
            'ALTER TABLE characters ADD COLUMN week_rounds   INTEGER DEFAULT 0',
            'ALTER TABLE characters ADD COLUMN difficulty    INTEGER DEFAULT 2',
            'ALTER TABLE characters ADD COLUMN coins         INTEGER DEFAULT 0',
            "ALTER TABLE characters ADD COLUMN owned_skins   TEXT DEFAULT '[]'",
            'ALTER TABLE characters ADD COLUMN best_streak   INTEGER DEFAULT 0',
        ]:
            try:
                c.execute(col_sql)
            except sqlite3.OperationalError:
                pass  # column already exists
        c.execute('''CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT DEFAULT '1'
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS question_stats (
            unit_id    TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            attempts   INTEGER DEFAULT 0,
            misses     INTEGER DEFAULT 0,
            PRIMARY KEY (unit_id, difficulty)
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS events (
            id     INTEGER PRIMARY KEY AUTOINCREMENT,
            name   TEXT NOT NULL,
            type   TEXT NOT NULL,
            detail TEXT DEFAULT '',
            ts     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS xp_history (
            id     INTEGER PRIMARY KEY AUTOINCREMENT,
            name   TEXT NOT NULL,
            delta  INTEGER NOT NULL,
            reason TEXT DEFAULT '',
            ts     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        # Sub-topic granularity, for steering a student's own practice.
        # student_unit_stats stays keyed by parent unit because the teacher
        # diagnostics are built on it and hold real class history; both are
        # written from the same event in question_result, so they cannot drift.
        c.execute('''CREATE TABLE IF NOT EXISTS student_topic_stats (
            name       TEXT NOT NULL,
            sub_id     TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            attempts   INTEGER DEFAULT 0,
            misses     INTEGER DEFAULT 0,
            last_seen  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (name, sub_id, difficulty)
        )''')
        c.execute('''CREATE TABLE IF NOT EXISTS student_unit_stats (
            name       TEXT NOT NULL,
            unit_id    TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            attempts   INTEGER DEFAULT 0,
            misses     INTEGER DEFAULT 0,
            PRIMARY KEY (name, unit_id, difficulty)
        )''')

        # Unified user accounts (Học sinh & Giáo viên)
        c.execute('''CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role          TEXT NOT NULL,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # Live Quiz Rooms (Phòng thi đấu trực tiếp)
        c.execute('''CREATE TABLE IF NOT EXISTS rooms (
            code          TEXT PRIMARY KEY,
            title         TEXT DEFAULT '',
            status        TEXT DEFAULT 'waiting',
            config        TEXT DEFAULT '{}',
            current_q     INTEGER DEFAULT 0,
            show_result   INTEGER DEFAULT 0,
            q_start_time  REAL DEFAULT 0,
            questions     TEXT DEFAULT '[]',
            created_by    TEXT NOT NULL,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS room_players (
            room_code     TEXT NOT NULL,
            player_name   TEXT NOT NULL,
            score         INTEGER DEFAULT 0,
            streak        INTEGER DEFAULT 0,
            answers       TEXT DEFAULT '{}',
            last_ping     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (room_code, player_name)
        )''')

        # Custom Quizzes & Questions (Đề thi do giáo viên tự soạn)
        c.execute('''CREATE TABLE IF NOT EXISTS custom_quizzes (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            title         TEXT NOT NULL,
            description   TEXT DEFAULT '',
            created_by    TEXT NOT NULL,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        c.execute('''CREATE TABLE IF NOT EXISTS custom_questions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            quiz_id       INTEGER NOT NULL,
            question      TEXT NOT NULL,
            choices       TEXT NOT NULL,
            answer        TEXT NOT NULL,
            why           TEXT DEFAULT '',
            order_idx     INTEGER DEFAULT 0,
            FOREIGN KEY (quiz_id) REFERENCES custom_quizzes (id) ON DELETE CASCADE
        )''')

        # Seed default teacher account if users table has no teacher
        try:
            t_exists = c.execute("SELECT 1 FROM users WHERE role='teacher'").fetchone()
            if not t_exists:
                c.execute("INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                          ('teacher', generate_password_hash(TEACHER_PASSWORD), 'teacher'))
        except Exception:
            pass

        # Default settings
        for uid in IM_UNITS:
            c.execute('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', (uid, '1'))
        c.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('week_start', ?)", (this_monday(),))
        # One-time: cosmetics used to unlock at XP thresholds. Grant every student
        # what their XP had already earned them, so the move to coins never takes
        # away something they had. Runs only for rows with no collection yet.
        try:
            for cname, cxp, owned_json in c.execute(
                    "SELECT name, xp, COALESCE(owned_skins,'[]') FROM characters").fetchall():
                if json.loads(owned_json or '[]'):
                    continue
                owned = {i for ids in FREE_SKINS.values() for i in ids}
                for typ, table in COSMETICS.items():
                    for sid, need in table.items():
                        if cxp >= need:
                            owned.add(sid)
                c.execute('UPDATE characters SET owned_skins=? WHERE name=?',
                          (json.dumps(sorted(owned)), cname))
        except Exception:
            pass

        # Migrate: recalculate all stored levels in case LEVEL_THRESHOLDS changed
        try:
            char_rows = c.execute('SELECT name, xp FROM characters').fetchall()
            for cname, cxp in char_rows:
                c.execute('UPDATE characters SET level=? WHERE name=?', (calc_level(cxp), cname))
        except Exception:
            pass

# ── Connection diagnostics ────────────────────────────────────
# The failure everyone hits is invisible: the server runs fine on the teacher's
# screen while every student device is silently blocked by a firewall or by
# client isolation on the school Wi-Fi. Recording which devices actually reach
# us turns that into something she can see before a lesson rather than during
# one. In memory on purpose — it is a per-session view, not history to keep.
CLIENT_SEEN = {}
MAX_CLIENTS = 200

def local_ipv4s():
    """Every IPv4 this machine answers on, not just the default route.

    A work laptop on a VPN often routes 8.8.8.8 down the tunnel, so get_ip()
    can report an address no student can reach. Showing all of them lets the
    teacher try the one that matches the classroom network.
    """
    ips = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except Exception:
        pass
    ips.add(get_ip())
    return sorted(i for i in ips if not i.startswith('127.'))

@app.before_request
def _record_client():
    # Only student-facing traffic counts; the teacher's own dashboard polling
    # would otherwise look like a connected device.
    if request.path.startswith(('/teacher', '/api/connections', '/favicon')):
        return
    ip = request.remote_addr or '?'
    now = time.time()
    seen = CLIENT_SEEN.get(ip)
    if seen:
        seen['last'] = now
        seen['hits'] += 1
    elif len(CLIENT_SEEN) < MAX_CLIENTS:
        CLIENT_SEEN[ip] = {'first': now, 'last': now, 'hits': 1,
                           'ua': (request.headers.get('User-Agent') or '')[:120]}

def describe_device(ua):
    """A rough label so a teacher can tell which row is which device."""
    ua = ua or ''
    for needle, label in (('iPad', 'iPad'), ('iPhone', 'iPhone'), ('Android', 'Android'),
                          ('CrOS', 'Chromebook'), ('Macintosh', 'Mac'),
                          ('Windows', 'Windows PC'), ('Linux', 'Linux')):
        if needle in ua:
            return label
    return 'Device'

@app.route('/api/connections')
@require_teacher
def api_connections():
    mine = set(local_ipv4s()) | {'127.0.0.1', '::1'}
    now  = time.time()
    devices = [{
        'ip':      ip,
        'device':  describe_device(v['ua']),
        'hits':    v['hits'],
        'ago':     int(now - v['last']),
        'is_self': ip in mine,
    } for ip, v in CLIENT_SEEN.items()]
    devices.sort(key=lambda d: d['ago'])
    others = [d for d in devices if not d['is_self']]
    return jsonify({
        'ok': True,
        'hostname':   socket.gethostname(),
        'port':       PORT,
        'addresses':  local_ipv4s(),
        'devices':    devices,
        'other_count': len(others),
        'windows':    _platform.system() == 'Windows',
    })

# ── Auth routes ───────────────────────────────────────────────
@app.route('/api/players')
def api_players():
    with sqlite3.connect(DB) as c:
        rows = c.execute(
            "SELECT name, xp, COALESCE(cosmetics,'{}') FROM characters ORDER BY name"
        ).fetchall()
    return jsonify([{
        'name':      r[0],
        'level':     calc_level(r[1]),
        'cosmetics': json.loads(r[2] or '{}'),
    } for r in rows])

# ── Unified User Authentication ──────────────────────────────
@app.route('/api/auth/register', methods=['POST'])
def api_auth_register():
    d = request.get_json(force=True) or {}
    username = clean_name(d.get('username', ''))
    password = str(d.get('password', '')).strip()
    role = str(d.get('role', 'student')).strip().lower()
    
    if not username or len(username) < 2:
        return jsonify({'ok': False, 'error': 'Tên đăng nhập phải có ít nhất 2 ký tự.'}), 400
    if len(password) < 4:
        return jsonify({'ok': False, 'error': 'Mật khẩu phải có ít nhất 4 ký tự.'}), 400
    if role not in ('student', 'teacher'):
        return jsonify({'ok': False, 'error': 'Vai trò không hợp lệ.'}), 400
        
    p_hash = generate_password_hash(password)
    with sqlite3.connect(DB) as c:
        row = c.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
        if row:
            return jsonify({'ok': False, 'error': 'Tên đăng nhập này đã được sử dụng.'}), 400
        c.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                  (username, p_hash, role))
        user_id = c.execute("SELECT last_insert_rowid()").fetchone()[0]
        if role == 'student':
            c.execute("INSERT OR IGNORE INTO characters (name) VALUES (?)", (username,))
            
    session['user_id'] = user_id
    session['username'] = username
    session['role'] = role
    if role == 'teacher':
        session['teacher'] = True
    session.permanent = True
    return jsonify({'ok': True, 'username': username, 'role': role})

@app.route('/api/auth/login', methods=['POST'])
def api_auth_login():
    d = request.get_json(force=True) or {}
    username = clean_name(d.get('username', ''))
    password = str(d.get('password', '')).strip()
    
    with sqlite3.connect(DB) as c:
        row = c.execute("SELECT id, username, password_hash, role FROM users WHERE username=?", (username,)).fetchone()
        if not row:
            # Fallback for teacher: if username == 'teacher' and password == TEACHER_PASSWORD
            if username.lower() == 'teacher' and password == TEACHER_PASSWORD:
                session['username'] = 'teacher'
                session['role'] = 'teacher'
                session['teacher'] = True
                session.permanent = True
                return jsonify({'ok': True, 'username': 'teacher', 'role': 'teacher'})
            return jsonify({'ok': False, 'error': 'Tên đăng nhập hoặc mật khẩu không chính xác.'}), 401
            
        user_id, u_name, p_hash, role = row
        if not check_password_hash(p_hash, password):
            return jsonify({'ok': False, 'error': 'Tên đăng nhập hoặc mật khẩu không chính xác.'}), 401
            
        if role == 'student':
            c.execute("INSERT OR IGNORE INTO characters (name) VALUES (?)", (u_name,))
            
    session['user_id'] = user_id
    session['username'] = u_name
    session['role'] = role
    if role == 'teacher':
        session['teacher'] = True
    session.permanent = True
    return jsonify({'ok': True, 'username': u_name, 'role': role})

@app.route('/api/auth/me')
def api_auth_me():
    if 'username' in session:
        return jsonify({
            'authenticated': True,
            'username': session['username'],
            'role': session.get('role', 'student')
        })
    return jsonify({'authenticated': False})

@app.route('/api/auth/logout', methods=['POST', 'GET'])
def api_auth_logout():
    session.clear()
    return jsonify({'ok': True})

# ── Live Quiz Room Routes ─────────────────────────────────────
@app.route('/api/room/create', methods=['POST'])
def api_room_create():
    if session.get('role') != 'teacher' and not session.get('teacher'):
        return jsonify({'ok': False, 'error': 'Chỉ giáo viên mới có quyền tạo phòng thi đấu.'}), 403
    d = request.get_json(force=True) or {}
    title = str(d.get('title', 'Đấu Trường Lớp Học')).strip()
    config = d.get('config', {})
    questions = d.get('questions', [])
    created_by = session.get('username', 'teacher')
    
    with sqlite3.connect(DB) as c:
        for _ in range(20):
            code = f"{random.randint(100000, 999999)}"
            exists = c.execute("SELECT 1 FROM rooms WHERE code=? AND status != 'finished'", (code,)).fetchone()
            if not exists:
                break
        c.execute('''INSERT INTO rooms (code, title, status, config, current_q, show_result, q_start_time, questions, created_by)
                     VALUES (?, ?, 'waiting', ?, 0, 0, 0, ?, ?)''',
                  (code, title, json.dumps(config), json.dumps(questions), created_by))
    return jsonify({'ok': True, 'code': code, 'title': title, 'questions_count': len(questions)})

@app.route('/api/room/join', methods=['POST'])
def api_room_join():
    d = request.get_json(force=True) or {}
    code = str(d.get('code', '')).strip()
    name = clean_name(d.get('name', session.get('username', '')))
    if not code or not name:
        return jsonify({'ok': False, 'error': 'Vui lòng cung cấp mã phòng và tên người chơi.'}), 400
        
    with sqlite3.connect(DB) as c:
        room = c.execute("SELECT code, title, status, config, questions FROM rooms WHERE code=?", (code,)).fetchone()
        if not room:
            return jsonify({'ok': False, 'error': 'Mã phòng không tồn tại hoặc đã đóng.'}), 404
        if room[2] == 'finished':
            return jsonify({'ok': False, 'error': 'Phòng thi này đã kết thúc.'}), 400
            
        c.execute('''INSERT INTO room_players (room_code, player_name, score, streak, answers, last_ping)
                     VALUES (?, ?, 0, 0, '{}', CURRENT_TIMESTAMP)
                     ON CONFLICT(room_code, player_name) DO UPDATE SET last_ping=CURRENT_TIMESTAMP''',
                  (code, name))
        config = json.loads(room[3] or '{}')
        qs = json.loads(room[4] or '[]')
        
    return jsonify({
        'ok': True,
        'code': code,
        'title': room[1],
        'status': room[2],
        'config': config,
        'total_questions': len(qs),
        'player_name': name
    })

@app.route('/api/room/lobby/<code>')
def api_room_lobby(code):
    with sqlite3.connect(DB) as c:
        room = c.execute("SELECT code, title, status, config, questions, current_q, created_by FROM rooms WHERE code=?", (code,)).fetchone()
        if not room:
            return jsonify({'ok': False, 'error': 'Phòng không tồn tại.'}), 404
        players = c.execute("SELECT player_name, score FROM room_players WHERE room_code=? ORDER BY score DESC, player_name ASC", (code,)).fetchall()
        qs = json.loads(room[4] or '[]')
        
    return jsonify({
        'ok': True,
        'code': room[0],
        'title': room[1],
        'status': room[2],
        'current_q': room[5],
        'total_questions': len(qs),
        'created_by': room[6],
        'players': [{'name': p[0], 'score': p[1]} for p in players],
        'player_count': len(players)
    })

@app.route('/api/room/start', methods=['POST'])
def api_room_start():
    if session.get('role') != 'teacher' and not session.get('teacher'):
        return jsonify({'ok': False, 'error': 'unauthorized'}), 403
    d = request.get_json(force=True) or {}
    code = str(d.get('code', '')).strip()
    with sqlite3.connect(DB) as c:
        c.execute("UPDATE rooms SET status='active', current_q=0, show_result=0, q_start_time=? WHERE code=?",
                  (time.time(), code))
    return jsonify({'ok': True})

@app.route('/api/room/state/<code>')
def api_room_state(code):
    with sqlite3.connect(DB) as c:
        room = c.execute("SELECT code, title, status, config, current_q, show_result, q_start_time, questions, created_by FROM rooms WHERE code=?", (code,)).fetchone()
        if not room:
            return jsonify({'ok': False, 'error': 'Phòng không tồn tại.'}), 404
            
        status = room[2]
        config = json.loads(room[3] or '{}')
        cur_q_idx = room[4]
        show_result = room[5]
        q_start = room[6]
        questions = json.loads(room[7] or '[]')
        time_per_q = config.get('time_per_q', 30)
        
        now = time.time()
        elapsed = now - q_start if q_start > 0 else 0
        time_left = max(0, int(time_per_q - elapsed))
        
        # Current question details
        q_data = None
        if 0 <= cur_q_idx < len(questions):
            raw_q = questions[cur_q_idx]
            q_data = {
                'index': cur_q_idx,
                'total': len(questions),
                'question': raw_q.get('question', ''),
                'choices': raw_q.get('choices', []),
            }
            # Only reveal answer and why if show_result is active or user is teacher
            is_teacher = session.get('role') == 'teacher' or session.get('teacher')
            if show_result or is_teacher:
                q_data['answer'] = raw_q.get('answer', '')
                q_data['why'] = raw_q.get('why', '')
                
        # Leaderboard
        players = c.execute("SELECT player_name, score, streak FROM room_players WHERE room_code=? ORDER BY score DESC LIMIT 15", (code,)).fetchall()
        # Count answered for this question
        answered = 0
        all_players = c.execute("SELECT answers FROM room_players WHERE room_code=?", (code,)).fetchall()
        for ap in all_players:
            ans_map = json.loads(ap[0] or '{}')
            if str(cur_q_idx) in ans_map:
                answered += 1
                
    return jsonify({
        'ok': True,
        'code': code,
        'title': room[1],
        'status': status,
        'current_q': cur_q_idx,
        'total_questions': len(questions),
        'show_result': bool(show_result),
        'time_left': time_left,
        'time_per_q': time_per_q,
        'question': q_data,
        'answered_count': answered,
        'player_count': len(all_players),
        'leaderboard': [{'name': p[0], 'score': p[1], 'streak': p[2]} for p in players]
    })

@app.route('/api/room/submit', methods=['POST'])
def api_room_submit():
    d = request.get_json(force=True) or {}
    code = str(d.get('code', '')).strip()
    name = clean_name(d.get('name', session.get('username', '')))
    q_idx = int(d.get('q_idx', 0))
    chosen = str(d.get('answer', '')).strip()
    time_spent = float(d.get('time_spent', 0))
    
    with sqlite3.connect(DB) as c:
        room = c.execute("SELECT questions, config, status, show_result FROM rooms WHERE code=?", (code,)).fetchone()
        if not room or room[2] != 'active':
            return jsonify({'ok': False, 'error': 'Phòng không trong trạng thái làm bài.'}), 400
        if room[3]:
            return jsonify({'ok': False, 'error': 'Thời gian nộp câu hỏi này đã hết.'}), 400
            
        questions = json.loads(room[0] or '[]')
        if q_idx < 0 or q_idx >= len(questions):
            return jsonify({'ok': False, 'error': 'Câu hỏi không hợp lệ.'}), 400
            
        target_q = questions[q_idx]
        correct_ans = str(target_q.get('answer', '')).strip()
        is_correct = (chosen == correct_ans)
        
        config = json.loads(room[1] or '{}')
        time_per_q = config.get('time_per_q', 30)
        
        p_row = c.execute("SELECT score, streak, answers FROM room_players WHERE room_code=? AND player_name=?", (code, name)).fetchone()
        if not p_row:
            return jsonify({'ok': False, 'error': 'Học sinh chưa tham gia phòng.'}), 400
            
        cur_score, cur_streak, ans_json = p_row
        ans_map = json.loads(ans_json or '{}')
        if str(q_idx) in ans_map:
            return jsonify({'ok': True, 'already_submitted': True, 'score': cur_score})
            
        if is_correct:
            cur_streak += 1
            speed_ratio = max(0, (time_per_q - time_spent) / max(1, time_per_q))
            speed_bonus = int(500 * speed_ratio)
            streak_bonus = min(200, cur_streak * 20)
            points = 500 + speed_bonus + streak_bonus
        else:
            cur_streak = 0
            points = 0
            
        new_score = cur_score + points
        ans_map[str(q_idx)] = {'chosen': chosen, 'correct': is_correct, 'points': points}
        c.execute("UPDATE room_players SET score=?, streak=?, answers=?, last_ping=CURRENT_TIMESTAMP WHERE room_code=? AND player_name=?",
                  (new_score, cur_streak, json.dumps(ans_map), code, name))
                  
    return jsonify({
        'ok': True,
        'correct': is_correct,
        'points': points,
        'total_score': new_score,
        'streak': cur_streak,
        'correct_answer': correct_ans,
        'why': target_q.get('why', '')
    })

@app.route('/api/room/show_result', methods=['POST'])
def api_room_show_result():
    if session.get('role') != 'teacher' and not session.get('teacher'):
        return jsonify({'ok': False, 'error': 'unauthorized'}), 403
    d = request.get_json(force=True) or {}
    code = str(d.get('code', '')).strip()
    with sqlite3.connect(DB) as c:
        c.execute("UPDATE rooms SET show_result=1 WHERE code=?", (code,))
    return jsonify({'ok': True})

def _award_room_rewards(c, code):
    try:
        players = c.execute("SELECT player_name, score FROM room_players WHERE room_code=? ORDER BY score DESC", (code,)).fetchall()
        for idx, (pname, pscore) in enumerate(players):
            if idx == 0:
                bonus_xp, bonus_coins = 500, 50
            elif idx == 1:
                bonus_xp, bonus_coins = 350, 35
            elif idx == 2:
                bonus_xp, bonus_coins = 250, 25
            else:
                bonus_xp, bonus_coins = 150, 15
                
            c.execute('''UPDATE characters
                         SET xp = xp + ?,
                             week_xp = week_xp + ?,
                             coins = coins + ?,
                             rounds_played = rounds_played + 1
                         WHERE name = ?''',
                      (bonus_xp, bonus_xp, bonus_coins, pname))
            row = c.execute("SELECT xp FROM characters WHERE name=?", (pname,)).fetchone()
            if row:
                c.execute("UPDATE characters SET level=? WHERE name=?", (calc_level(row[0]), pname))
    except Exception as e:
        app.logger.error(f"Error awarding room rewards: {e}")

@app.route('/api/room/next_q', methods=['POST'])
def api_room_next_q():
    if session.get('role') != 'teacher' and not session.get('teacher'):
        return jsonify({'ok': False, 'error': 'unauthorized'}), 403
    d = request.get_json(force=True) or {}
    code = str(d.get('code', '')).strip()
    with sqlite3.connect(DB) as c:
        room = c.execute("SELECT current_q, questions FROM rooms WHERE code=?", (code,)).fetchone()
        if not room:
            return jsonify({'ok': False, 'error': 'Phòng không tồn tại'}), 404
        cur_q = room[0]
        questions = json.loads(room[1] or '[]')
        next_idx = cur_q + 1
        if next_idx >= len(questions):
            c.execute("UPDATE rooms SET status='finished', current_q=?, show_result=1 WHERE code=?", (next_idx, code))
            _award_room_rewards(c, code)
            return jsonify({'ok': True, 'finished': True})
        else:
            c.execute("UPDATE rooms SET current_q=?, show_result=0, q_start_time=? WHERE code=?",
                      (next_idx, time.time(), code))
            return jsonify({'ok': True, 'finished': False, 'current_q': next_idx})

@app.route('/api/room/end', methods=['POST'])
def api_room_end():
    if session.get('role') != 'teacher' and not session.get('teacher'):
        return jsonify({'ok': False, 'error': 'unauthorized'}), 403
    d = request.get_json(force=True) or {}
    code = str(d.get('code', '')).strip()
    with sqlite3.connect(DB) as c:
        c.execute("UPDATE rooms SET status='finished' WHERE code=?", (code,))
        _award_room_rewards(c, code)
    return jsonify({'ok': True})

# ── Custom Quizzes ────────────────────────────────────────────
@app.route('/api/quizzes', methods=['GET'])
def api_quizzes_list():
    with sqlite3.connect(DB) as c:
        quizzes = c.execute('''SELECT q.id, q.title, q.description, q.created_by, q.created_at, COUNT(k.id) as q_count
                               FROM custom_quizzes q
                               LEFT JOIN custom_questions k ON q.id = k.quiz_id
                               GROUP BY q.id ORDER BY q.id DESC''').fetchall()
    return jsonify([{
        'id': r[0],
        'title': r[1],
        'description': r[2],
        'created_by': r[3],
        'created_at': r[4],
        'question_count': r[5]
    } for r in quizzes])

@app.route('/api/quizzes/<int:quiz_id>', methods=['GET'])
def api_quiz_detail(quiz_id):
    with sqlite3.connect(DB) as c:
        q_row = c.execute("SELECT id, title, description, created_by FROM custom_quizzes WHERE id=?", (quiz_id,)).fetchone()
        if not q_row:
            return jsonify({'ok': False, 'error': 'Không tìm thấy bộ đề'}), 404
        items = c.execute("SELECT id, question, choices, answer, why, order_idx FROM custom_questions WHERE quiz_id=? ORDER BY order_idx ASC, id ASC", (quiz_id,)).fetchall()
        
    return jsonify({
        'ok': True,
        'quiz': {
            'id': q_row[0],
            'title': q_row[1],
            'description': q_row[2],
            'created_by': q_row[3],
            'questions': [{
                'id': it[0],
                'question': it[1],
                'choices': json.loads(it[2] or '[]'),
                'answer': it[3],
                'why': it[4],
                'order_idx': it[5]
            } for it in items]
        }
    })

@app.route('/api/quizzes/save', methods=['POST'])
def api_quizzes_save():
    if session.get('role') != 'teacher' and not session.get('teacher'):
        return jsonify({'ok': False, 'error': 'Chỉ giáo viên mới có quyền soạn đề thi.'}), 403
        
    d = request.get_json(force=True) or {}
    quiz_id = d.get('id')
    title = str(d.get('title', '')).strip()
    desc = str(d.get('description', '')).strip()
    questions = d.get('questions', [])
    created_by = session.get('username', 'teacher')
    
    if not title:
        return jsonify({'ok': False, 'error': 'Vui lòng nhập tiêu đề bộ đề.'}), 400
        
    with sqlite3.connect(DB) as c:
        if quiz_id:
            c.execute("UPDATE custom_quizzes SET title=?, description=? WHERE id=?", (title, desc, quiz_id))
            c.execute("DELETE FROM custom_questions WHERE quiz_id=?", (quiz_id,))
        else:
            c.execute("INSERT INTO custom_quizzes (title, description, created_by) VALUES (?, ?, ?)", (title, desc, created_by))
            quiz_id = c.execute("SELECT last_insert_rowid()").fetchone()[0]
            
        for idx, item in enumerate(questions):
            q_text = str(item.get('question', '')).strip()
            choices = item.get('choices', [])
            answer = str(item.get('answer', '')).strip()
            why = str(item.get('why', '')).strip()
            if q_text and choices and answer:
                c.execute('''INSERT INTO custom_questions (quiz_id, question, choices, answer, why, order_idx)
                             VALUES (?, ?, ?, ?, ?, ?)''',
                          (quiz_id, q_text, json.dumps(choices), answer, why, idx))
                          
    return jsonify({'ok': True, 'quiz_id': quiz_id})

@app.route('/api/quizzes/<int:quiz_id>', methods=['DELETE'])
def api_quizzes_delete(quiz_id):
    if session.get('role') != 'teacher' and not session.get('teacher'):
        return jsonify({'ok': False, 'error': 'unauthorized'}), 403
    with sqlite3.connect(DB) as c:
        c.execute("DELETE FROM custom_questions WHERE quiz_id=?", (quiz_id,))
        c.execute("DELETE FROM custom_quizzes WHERE id=?", (quiz_id,))
    return jsonify({'ok': True})

# ── Game routes ───────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html', levels=LEVELS, cosmetic_xp=COSMETICS,
                           unit_groups=UNIT_GROUPS_JS, sub_topics=SUB_TOPICS_JS,
                           items=ITEMS, avatars=AVATARS,
                           skins=SKINS, free_skins=FREE_SKINS,
                           diff_balance={'xp_mult': DIFF_XP_MULT,
                                         'top_acc': DIFF_TOP_ACC,
                                         'mid_acc': DIFF_MID_ACC,
                                         'labels':  DIFF_LABELS})

@app.route('/favicon.ico')
def favicon():
    """Render an emoji as a 32×32 PNG favicon using Pillow (already installed for qrcode)."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        # Try to use the system Apple Color Emoji font; fall back gracefully
        font = None
        for path in [
            '/System/Library/Fonts/Apple Color Emoji.ttc',
            '/System/Library/Fonts/Supplemental/Apple Color Emoji.ttc',
        ]:
            if os.path.exists(path):
                try:
                    font = ImageFont.truetype(path, 52)
                    break
                except Exception:
                    pass
        if font:
            draw.text((2, 2), '⚔️', font=font, embedded_color=True)
        else:
            draw.text((4, 4), '?', fill=(168, 85, 247))
        buf = io.BytesIO()
        img.save(buf, 'PNG')
        buf.seek(0)
        from flask import Response
        return Response(buf.read(), mimetype='image/png',
                        headers={'Cache-Control': 'public, max-age=86400'})
    except Exception:
        from flask import abort
        abort(404)

# ── Settings API ──────────────────────────────────────────────
@app.route('/api/settings')
def api_settings():
    with sqlite3.connect(DB) as c:
        rows = c.execute(
            "SELECT key, value FROM settings WHERE key LIKE 'c%' OR key LIKE 'u%'"
        ).fetchall()
    result = {}
    for k, v in rows:
        result[k] = (v == '1')
    return jsonify(result)

@app.route('/teacher/toggle', methods=['POST'])
@require_teacher
def teacher_toggle():
    d       = request.get_json(force=True)
    unit_id = str(d.get('unit', ''))
    enabled = bool(d.get('enabled', True))
    # Accept both top-level IDs (c1–c8, u1–u9) and sub-module IDs (c1a, c2b, …)
    if not re.match(r'^[a-z]\d+[a-z]?$', unit_id):
        return jsonify({'ok': False, 'error': 'invalid unit'}), 400
    with sqlite3.connect(DB) as c:
        c.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                  (unit_id, '1' if enabled else '0'))
    return jsonify({'ok': True})

@app.route('/api/question_result', methods=['POST'])
def question_result():
    d       = request.get_json(force=True)
    # Client sends the sub-topic actually played ('c1a'). Class and teacher stats
    # are kept per parent unit; the student's own practice targeting needs the
    # sub-topic, so keep both.
    sub_id  = str(d.get('unit', ''))
    uid     = parent_unit(sub_id)
    diff    = str(d.get('difficulty', ''))
    correct = bool(d.get('correct', False))
    name    = clean_name(d.get('name', ''))
    if uid not in set(IM_UNITS) or diff not in ('easy', 'medium', 'hard'):
        return jsonify({'ok': False, 'error': 'invalid'}), 400
    if d.get('name') and not name:
        # A name was supplied but is not one we would ever have stored.
        return jsonify({'ok': False, 'error': 'invalid name'}), 400
    miss = 0 if correct else 1
    with sqlite3.connect(DB) as c:
        # Class-wide aggregate
        c.execute('''
            INSERT INTO question_stats (unit_id, difficulty, attempts, misses)
            VALUES (?, ?, 1, ?)
            ON CONFLICT(unit_id, difficulty) DO UPDATE SET
                attempts = attempts + 1,
                misses   = misses + ?
        ''', (uid, diff, miss, miss))
        # Per-student breakdown (enables "X of Y students" analytics)
        if name:
            c.execute('''
                INSERT INTO student_unit_stats (name, unit_id, difficulty, attempts, misses)
                VALUES (?,?,?,1,?)
                ON CONFLICT(name,unit_id,difficulty) DO UPDATE SET
                    attempts = attempts + 1,
                    misses   = misses + ?
            ''', (name, uid, diff, miss, miss))
            if re.match(r'^[a-z]\d+[a-z]$', sub_id):
                c.execute('''
                    INSERT INTO student_topic_stats (name, sub_id, difficulty, attempts, misses)
                    VALUES (?,?,?,1,?)
                    ON CONFLICT(name,sub_id,difficulty) DO UPDATE SET
                        attempts  = attempts + 1,
                        misses    = misses + ?,
                        last_seen = CURRENT_TIMESTAMP
                ''', (name, sub_id, diff, miss, miss))
    return jsonify({'ok': True})

# ── Character API ─────────────────────────────────────────────
@app.route('/api/character/<name>')
def get_character(name):
    with sqlite3.connect(DB) as c:
        maybe_reset_week(c)     # this route reads week_xp, so it must rotate first
        row = c.execute(
            "SELECT xp, level, items, rounds_played, COALESCE(cosmetics,'{}'), COALESCE(unit_xp,'{}'), COALESCE(week_xp,0), COALESCE(unit_rounds,'{}'), COALESCE(difficulty,2), COALESCE(coins,0), COALESCE(owned_skins,'[]'), COALESCE(best_streak,5) FROM characters WHERE name=?", (name,)
        ).fetchone()
        if not row:
            # Read-only: characters are created via /api/auth (which enforces the
            # name rules and a PIN) or on the first /reward write. Creating them
            # here let any unauthenticated GET inject arbitrary roster entries.
            return jsonify({'name': name, 'xp': 0, 'level': 1,
                            'items': [], 'rounds_played': 0, 'new': True,
                            'cosmetics': {}, 'unit_xp': {}, 'week_xp': 0, 'unit_rounds': {},
                            'difficulty': 2, 'coins': 0, 'streak': 5,
                            'owned': sorted({i for ids in FREE_SKINS.values() for i in ids})})
        xp, level, items_json, rounds, cosmetics_json, unit_xp_json, week_xp, unit_rounds_json, difficulty, coins, owned_json, best_streak = row
        return jsonify({'name': name, 'xp': xp, 'level': level,
                        'items': json.loads(items_json or '[]'),
                        'rounds_played': rounds, 'new': False,
                        'cosmetics': json.loads(cosmetics_json or '{}'),
                        'unit_xp': json.loads(unit_xp_json or '{}'),
                        'week_xp': week_xp, 'difficulty': difficulty,
                        'coins': coins, 'streak': max(5, int(best_streak or 5)),
                        'owned': sorted(set(json.loads(owned_json or '[]'))
                                        | {i for ids in FREE_SKINS.values() for i in ids}),
                        'unit_rounds': json.loads(unit_rounds_json or '{}')})

@app.route('/api/character/<name>/equip', methods=['POST'])
def equip_cosmetic(name):
    name = clean_name(name)
    if not name:
        return jsonify({'ok': False, 'error': 'invalid name'}), 400
    d     = request.get_json(force=True)
    ctype = str(d.get('type', ''))
    cid   = str(d.get('id', ''))
    if ctype not in SKIN_BY_TYPE or cid not in SKIN_BY_TYPE[ctype]:
        return jsonify({'ok': False, 'error': 'invalid'}), 400
    with sqlite3.connect(DB) as c:
        row = c.execute(
            "SELECT COALESCE(cosmetics,'{}'), xp, COALESCE(owned_skins,'[]') FROM characters WHERE name=?", (name,)
        ).fetchone()
        if not row:
            return jsonify({'ok': False, 'error': 'not found'}), 404
        # You may only wear what you own. Enforced here, not just in the
        # wardrobe UI, so a crafted request cannot equip an unbought skin.
        owned = set(json.loads(row[2] or '[]')) | {i for ids in FREE_SKINS.values() for i in ids}
        if cid not in owned:
            return jsonify({'ok': False, 'error': 'not owned',
                            'price': SKIN_BY_TYPE[ctype][cid]['price']}), 403
        cosmetics        = json.loads(row[0] or '{}')
        cosmetics[ctype] = cid
        c.execute('UPDATE characters SET cosmetics=? WHERE name=?', (json.dumps(cosmetics), name))
    return jsonify({'ok': True, 'cosmetics': cosmetics})

@app.route('/api/character/<name>/use_item', methods=['POST'])
def use_item(name):
    name = clean_name(name)
    if not name:
        return jsonify({'ok': False, 'error': 'invalid name'}), 400
    """Remove one item from a student's bag (they've committed to using it)."""
    d   = request.get_json(force=True)
    key = str(d.get('key', ''))
    if key not in ITEMS:
        return jsonify({'ok': False, 'error': 'invalid item'}), 400
    with sqlite3.connect(DB) as c:
        row = c.execute('SELECT items FROM characters WHERE name=?', (name,)).fetchone()
        if not row:
            return jsonify({'ok': False, 'error': 'not found'}), 404
        items = json.loads(row[0] or '[]')
        if key not in items:
            return jsonify({'ok': False, 'error': 'not in bag'}), 400
        items.remove(key)
        c.execute('UPDATE characters SET items=? WHERE name=?', (json.dumps(items), name))
    return jsonify({'ok': True, 'items': items})

# A sub-topic needs this many attempts before its accuracy means anything.
PRACTICE_MIN_ATTEMPTS = 6
# At or below this accuracy a sub-topic is worth coming back to.
PRACTICE_WEAK_ACC     = 0.75

@app.route('/api/character/<name>/practice')
def practice_targets(name):
    """What this student keeps getting wrong, so the app can steer them back.

    Only sub-topics with enough attempts to be meaningful are called weak — a
    single unlucky miss should not brand a topic.
    """
    name = clean_name(name)
    if not name:
        return jsonify({'ok': False, 'error': 'invalid name'}), 400
    with sqlite3.connect(DB) as c:
        rows = c.execute(
            'SELECT sub_id, SUM(attempts), SUM(misses) FROM student_topic_stats '
            'WHERE name=? GROUP BY sub_id', (name,)
        ).fetchall()
    out = []
    for sub_id, att, miss in rows:
        att = att or 0
        acc = (att - (miss or 0)) / att if att else 0
        out.append({
            'sub_id':   sub_id,
            'attempts': att,
            'accuracy': round(acc, 3),
            'weak':     att >= PRACTICE_MIN_ATTEMPTS and acc <= PRACTICE_WEAK_ACC,
        })
    out.sort(key=lambda r: (not r['weak'], r['accuracy']))
    return jsonify({'ok': True, 'topics': out,
                    'weak': [r['sub_id'] for r in out if r['weak']]})

# How many skins rotate through the featured slot each week.
FEATURED_SLOTS = 3

def featured_skins():
    """The skins on offer this week.

    Seeded by the week's Monday so the shop is stable for the whole week and
    changes on Monday morning — that turnover is what gives a student a reason
    to look again. Free defaults are never featured.
    """
    pool = [k['id'] for k in SKINS
            if k['id'] not in {i for ids in FREE_SKINS.values() for i in ids}]
    rng = random.Random(this_monday())
    rng.shuffle(pool)
    return pool[:FEATURED_SLOTS]

# Featured skins are discounted, which is the pull to buy now rather than later.
FEATURED_DISCOUNT = 0.75

def skin_price(skin, featured):
    return int(round(skin['price'] * FEATURED_DISCOUNT)) if skin['id'] in featured else skin['price']

@app.route('/api/character/<name>/shop')
def api_shop(name):
    """The catalog, priced, with what this student already owns marked."""
    name = clean_name(name)
    if not name:
        return jsonify({'ok': False, 'error': 'invalid name'}), 400
    with sqlite3.connect(DB) as c:
        row = c.execute("SELECT COALESCE(coins,0), COALESCE(owned_skins,'[]') FROM characters WHERE name=?",
                        (name,)).fetchone()
    coins = row[0] if row else 0
    owned = set(json.loads(row[1] or '[]')) if row else set()
    owned |= {i for ids in FREE_SKINS.values() for i in ids}
    feat  = featured_skins()
    return jsonify({
        'ok': True, 'coins': coins, 'featured': feat,
        'skins': [dict(k, price=skin_price(k, feat),
                       owned=k['id'] in owned,
                       featured=k['id'] in feat) for k in SKINS],
    })

@app.route('/api/character/<name>/buy', methods=['POST'])
def api_buy(name):
    """Buy one skin. The price and the wallet are both checked here, never
    trusted from the client — the same lesson as #18."""
    name = clean_name(name)
    if not name:
        return jsonify({'ok': False, 'error': 'invalid name'}), 400
    d      = request.get_json(force=True)
    typ    = str(d.get('type', ''))
    sid    = str(d.get('id', ''))
    skin   = SKIN_BY_TYPE.get(typ, {}).get(sid)
    if not skin:
        return jsonify({'ok': False, 'error': 'unknown skin'}), 400
    with sqlite3.connect(DB) as c:
        row = c.execute("SELECT COALESCE(coins,0), COALESCE(owned_skins,'[]') FROM characters WHERE name=?",
                        (name,)).fetchone()
        if not row:
            return jsonify({'ok': False, 'error': 'not found'}), 404
        coins = row[0]
        owned = set(json.loads(row[1] or '[]')) | {i for ids in FREE_SKINS.values() for i in ids}
        if sid in owned:
            return jsonify({'ok': False, 'error': 'already owned'}), 400
        price = skin_price(skin, featured_skins())
        if coins < price:
            return jsonify({'ok': False, 'error': 'not enough coins',
                            'price': price, 'coins': coins}), 402
        owned.add(sid)
        c.execute('UPDATE characters SET coins=?, owned_skins=? WHERE name=?',
                  (coins - price, json.dumps(sorted(owned)), name))
    return jsonify({'ok': True, 'coins': coins - price, 'owned': sorted(owned),
                    'bought': sid, 'price': price})

@app.route('/api/character/<name>/difficulty', methods=['POST'])
def set_difficulty(name):
    """Students choose their own challenge level; the teacher sees what they picked."""
    name = clean_name(name)
    if not name:
        return jsonify({'ok': False, 'error': 'invalid name'}), 400
    try:
        level = int(request.get_json(force=True).get('difficulty'))
    except (TypeError, ValueError):
        return jsonify({'ok': False, 'error': 'invalid difficulty'}), 400
    if level not in (0, 1, 2):
        return jsonify({'ok': False, 'error': 'invalid difficulty'}), 400
    with sqlite3.connect(DB) as c:
        if not c.execute('SELECT 1 FROM characters WHERE name=?', (name,)).fetchone():
            return jsonify({'ok': False, 'error': 'not found'}), 404
        c.execute('UPDATE characters SET difficulty=? WHERE name=?', (level, name))
    return jsonify({'ok': True, 'difficulty': level, 'label': DIFF_LABELS[level]})

@app.route('/api/character/<name>/reward', methods=['POST'])
def give_reward(name):
    # This route creates the character row, so it has to apply the same name
    # rules as /api/auth. Without this the roster could be seeded with names
    # that NAME_RE exists to keep out.
    name = clean_name(name)
    if not name:
        return jsonify({'ok': False, 'error': 'invalid name'}), 400
    d = request.get_json(force=True)
    try:
        xp_earned = max(0, int(d.get('xp', 0)))
    except (TypeError, ValueError):
        return jsonify({'ok': False, 'error': 'invalid xp'}), 400
    xp_earned = min(xp_earned, MAX_ROUND_XP)
    new_items = [i for i in d.get('items', []) if i in ITEMS][:MAX_ROUND_ITEMS]
    unit_id   = str(d.get('unit', ''))   # topic played (sub-topic like 'u1a', parent 'u1'–'u9', or 'mix')
    lang      = 'es' if d.get('lang') == 'es' else 'en'
    try:
        faced   = max(0, min(2, int(d.get('faced_difficulty', 0))))
        correct = max(0, min(10, int(d.get('correct', 0))))
    except (TypeError, ValueError):
        faced, correct = 0, 0
    coins_earned = coins_for_round(faced, correct)
    try:
        round_streak = max(0, min(10, int(d.get('max_streak', 0))))
    except (TypeError, ValueError):
        round_streak = 0

    # Map sub-topic ID (e.g. 'u1a') to parent unit ID (e.g. 'u1') for XP credit
    credit_unit = parent_unit(unit_id)

    with sqlite3.connect(DB) as c:
        maybe_reset_week(c)
        row = c.execute(
            'SELECT xp, items, rounds_played, COALESCE(week_xp,0), COALESCE(unit_xp,"{}"), '
            'COALESCE(rounds_en,0), COALESCE(rounds_es,0), COALESCE(unit_rounds,"{}"), '
            'COALESCE(week_rounds,0), COALESCE(coins,0), COALESCE(best_streak,0) FROM characters WHERE name=?',
            (name,)
        ).fetchone()
        if row:
            old_xp, items_json, old_rounds, old_week_xp, unit_xp_json, \
                old_rounds_en, old_rounds_es, unit_rounds_json, old_week_rounds, old_coins, old_streak = row
            old_items   = json.loads(items_json or '[]')
            unit_xp     = json.loads(unit_xp_json or '{}')
            unit_rounds = json.loads(unit_rounds_json or '{}')
        else:
            old_xp, old_items, old_rounds, old_week_xp, unit_xp = 0, [], 0, 0, {}
            old_rounds_en, old_rounds_es, unit_rounds, old_week_rounds, old_coins, old_streak = 0, 0, {}, 0, 0, 0

        old_level      = calc_level(old_xp)
        total_xp       = old_xp + xp_earned
        new_level      = calc_level(total_xp)
        all_items      = old_items + new_items
        new_rounds     = old_rounds + 1
        new_week_xp    = old_week_xp + xp_earned
        new_week_rounds = old_week_rounds + 1
        new_coins       = old_coins + coins_earned
        new_streak      = max(old_streak, round_streak)
        new_rounds_en  = old_rounds_en + (1 if lang == 'en' else 0)
        new_rounds_es  = old_rounds_es + (1 if lang == 'es' else 0)

        if credit_unit in IM_UNIT_META:      # skip 'mix' — no single unit to credit
            unit_xp[credit_unit]     = unit_xp.get(credit_unit, 0) + xp_earned
            unit_rounds[credit_unit] = unit_rounds.get(credit_unit, 0) + 1

        c.execute('''
            INSERT INTO characters (name, xp, level, items, rounds_played, week_xp, unit_xp,
                                    rounds_en, rounds_es, unit_rounds, week_rounds, coins,
                                    best_streak, last_played)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
            ON CONFLICT(name) DO UPDATE SET
                xp=excluded.xp, level=excluded.level, items=excluded.items,
                rounds_played=excluded.rounds_played, week_xp=excluded.week_xp,
                unit_xp=excluded.unit_xp, rounds_en=excluded.rounds_en,
                rounds_es=excluded.rounds_es, unit_rounds=excluded.unit_rounds,
                week_rounds=excluded.week_rounds, coins=excluded.coins,
                best_streak=excluded.best_streak, last_played=CURRENT_TIMESTAMP
        ''', (name, total_xp, new_level, json.dumps(all_items), new_rounds,
              new_week_xp, json.dumps(unit_xp), new_rounds_en, new_rounds_es,
              json.dumps(unit_rounds), new_week_rounds, new_coins, new_streak))

        # Log events for the display board
        if old_rounds == 0:
            c.execute('INSERT INTO events (name,type,detail) VALUES (?,?,?)',
                      (name, 'first_quest', ''))
        if new_level > old_level:
            title = LEVEL_TITLES[min(new_level, len(LEVEL_TITLES) - 1)]
            c.execute('INSERT INTO events (name,type,detail) VALUES (?,?,?)',
                      (name, 'level_up', title))
        # Keep events table tidy
        c.execute('DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY ts DESC LIMIT 300)')

    return jsonify({'xp': total_xp, 'level': new_level, 'items': all_items,
                    'unit_xp': unit_xp, 'unit_rounds': unit_rounds,
                    'coins': new_coins, 'coins_earned': coins_earned})

# A collection is scored by what is in it, not just how much — so a student with
# three legendaries outranks one with ten commons. That makes the collection
# itself something to compete on, which is the point of letting kids choose.
RARITY_POINTS = {'common': 1, 'uncommon': 3, 'rare': 6, 'legendary': 12}
SKIN_POINTS   = {k['id']: RARITY_POINTS[k['rarity']] for k in SKINS}
# XP in a single unit that counts as having got on top of it.
MASTERY_XP    = 2000

FREE_IDS = {i for ids in FREE_SKINS.values() for i in ids}

def collection_score(owned_json):
    """(bought count, rarity points).

    The board ranks on COUNT, deliberately. Ranking on rarity would just be the
    XP board again — the students with the most XP earn the most coins and buy
    the dearest skins. Breadth rewards a different habit, so a student who will
    never top XP can top this. Rarity still shows as a badge.
    """
    owned = set(json.loads(owned_json or '[]')) - FREE_IDS
    return len(owned), sum(SKIN_POINTS.get(i, 0) for i in owned)

def rarest_skin(owned_json):
    owned = [i for i in json.loads(owned_json or '[]') if i in SKIN_POINTS and i not in FREE_IDS]
    if not owned:
        return None
    best = max(owned, key=lambda i: SKIN_POINTS[i])
    sk   = next((k for k in SKINS if k['id'] == best), None)
    return {'id': best, 'emoji': sk['emoji'], 'name': sk['name'],
            'name_es': sk['name_es'], 'rarity': sk['rarity']} if sk else None

@app.route('/api/guild')
def api_guild():
    view    = request.args.get('view', 'alltime')
    unit_id = request.args.get('unit', '')

    with sqlite3.connect(DB) as c:
        maybe_reset_week(c)

        if view == 'weekly':
            rows = c.execute('''
                SELECT name, xp, level, items, rounds_played,
                       COALESCE(week_xp, 0) AS score,
                       COALESCE(cosmetics,'{}')
                FROM characters WHERE week_xp > 0
                ORDER BY week_xp DESC LIMIT 25
            ''').fetchall()
        elif view == 'improved':
            rows = c.execute('''
                SELECT name, xp, level, items, rounds_played,
                       COALESCE(week_xp,0) - COALESCE(last_week_xp,0) AS score,
                       COALESCE(cosmetics,'{}')
                FROM characters
                WHERE last_week_xp > 0
                ORDER BY score DESC LIMIT 25
            ''').fetchall()
        elif view == 'topic':
            # An unknown unit used to fall through to the `else` below, which
            # silently served the all-time leaderboard dressed up as a topic
            # ranking — wrong rows, and scores that were total XP rather than
            # unit XP. Answer with an empty board instead.
            all_rows = [] if unit_id not in IM_UNIT_META else c.execute(
                "SELECT name, xp, level, items, rounds_played, COALESCE(unit_xp,'{}'), COALESCE(cosmetics,'{}') FROM characters"
            ).fetchall()
            topic_rows = []
            for r in all_rows:
                u_xp = json.loads(r[5] or '{}').get(unit_id, 0)
                if u_xp > 0:
                    topic_rows.append(r[:5] + (u_xp, r[6]))
            rows = sorted(topic_rows, key=lambda x: x[5], reverse=True)[:25]
        elif view == 'streak':
            rows = c.execute('''
                SELECT name, xp, level, items, rounds_played,
                       COALESCE(best_streak,0) AS score, COALESCE(cosmetics,'{}')
                FROM characters WHERE COALESCE(best_streak,0) > 0
                ORDER BY score DESC LIMIT 25
            ''').fetchall()
        elif view == 'collection':
            all_rows = c.execute(
                "SELECT name, xp, level, items, rounds_played, COALESCE(owned_skins,'[]'), "
                "COALESCE(cosmetics,'{}') FROM characters"
            ).fetchall()
            scored = []
            for r in all_rows:
                count, _ = collection_score(r[5])
                if count > 0:
                    scored.append(r[:5] + (count, r[6]))
            rows = sorted(scored, key=lambda x: x[5], reverse=True)[:25]
        elif view == 'mastery':
            all_rows = c.execute(
                "SELECT name, xp, level, items, rounds_played, COALESCE(unit_xp,'{}'), "
                "COALESCE(cosmetics,'{}') FROM characters"
            ).fetchall()
            scored = []
            for r in all_rows:
                mastered = sum(1 for v in json.loads(r[5] or '{}').values() if v >= MASTERY_XP)
                if mastered > 0:
                    scored.append(r[:5] + (mastered, r[6]))
            rows = sorted(scored, key=lambda x: x[5], reverse=True)[:25]
        else:  # alltime
            rows = c.execute('''
                SELECT name, xp, level, items, rounds_played, xp AS score,
                       COALESCE(cosmetics,'{}')
                FROM characters ORDER BY xp DESC LIMIT 25
            ''').fetchall()

    rarity_rank = {'legendary': 3, 'rare': 2, 'uncommon': 1, 'common': 0}
    with sqlite3.connect(DB) as c:
        skins_by_name = dict(c.execute(
            "SELECT name, COALESCE(owned_skins,'[]') FROM characters").fetchall())
    result = []
    for r in rows:
        items     = json.loads(r[3] or '[]')
        cosmetics = json.loads(r[6] or '{}') if len(r) > 6 else {}
        rarest_key = max(items,
            key=lambda k: rarity_rank.get(ITEMS.get(k, {}).get('rarity', 'common'), 0),
            default=None)
        result.append({
            'name': r[0], 'xp': r[1], 'level': r[2],
            'item_count': len(items), 'rounds': r[4],
            'score': r[5],
            'cosmetics': cosmetics,
            'rarest': ({'key': rarest_key, **ITEMS[rarest_key]}
                       if rarest_key and rarest_key in ITEMS else None),
            'skin_count':  collection_score(skins_by_name.get(r[0], '[]'))[0],
            'rarest_skin': rarest_skin(skins_by_name.get(r[0], '[]')),
        })
    return jsonify(result)

@app.route('/teacher/award_xp', methods=['POST'])
@require_teacher
def teacher_award_xp():
    d      = request.get_json(force=True)
    name   = str(d.get('name', ''))
    reason = str(d.get('reason', 'Teacher award'))[:200]
    try:
        delta = int(d.get('xp', 0))
    except (TypeError, ValueError):
        return jsonify({'ok': False, 'error': 'invalid xp'}), 400
    if not name or delta == 0:
        return jsonify({'ok': False, 'error': 'name and non-zero xp required'}), 400
    with sqlite3.connect(DB) as c:
        maybe_reset_week(c)
        row = c.execute(
            'SELECT xp, COALESCE(week_xp,0) FROM characters WHERE name=?', (name,)
        ).fetchone()
        if not row:
            return jsonify({'ok': False, 'error': 'student not found'}), 404
        new_xp      = max(0, row[0] + delta)
        new_week_xp = max(0, row[1] + delta)
        new_level   = calc_level(new_xp)
        c.execute('''UPDATE characters SET xp=?, level=?, week_xp=?, last_played=CURRENT_TIMESTAMP
                     WHERE name=?''', (new_xp, new_level, new_week_xp, name))
        c.execute('INSERT INTO xp_history (name, delta, reason) VALUES (?,?,?)',
                  (name, delta, reason))
    return jsonify({'ok': True, 'new_xp': new_xp, 'new_level': new_level})

@app.route('/api/xp_history')
@require_teacher
def api_xp_history():
    limit = min(int(request.args.get('limit', 30)), 100)
    with sqlite3.connect(DB) as c:
        rows = c.execute(
            'SELECT name, delta, reason, ts FROM xp_history ORDER BY ts DESC LIMIT ?', (limit,)
        ).fetchall()
    return jsonify([{'name': r[0], 'delta': r[1], 'reason': r[2], 'ts': r[3][:16]} for r in rows])

# ── Classroom display board ───────────────────────────────────
@app.route('/display')
def display():
    with sqlite3.connect(DB) as c:
        maybe_reset_week(c)
        monday = this_monday()

        # Top scorers this week
        lb_rows = c.execute('''
            SELECT name, xp, week_xp, COALESCE(week_rounds,0), COALESCE(cosmetics,'{}')
            FROM characters WHERE week_xp > 0
            ORDER BY week_xp DESC LIMIT 8
        ''').fetchall()

        # Biggest jumps — improvement on last week. A separate board so the wall
        # is not the same eight names every week; in a class of thirty a single
        # top-15 leaves half the room never appearing. last_week_xp > 0 excludes
        # students with no baseline, who would otherwise show a huge false gain.
        jump_rows = c.execute('''
            SELECT name, xp, COALESCE(week_xp,0) - COALESCE(last_week_xp,0) AS gain,
                   COALESCE(cosmetics,'{}')
            FROM characters
            WHERE COALESCE(last_week_xp,0) > 0
              AND COALESCE(week_xp,0) - COALESCE(last_week_xp,0) > 0
            ORDER BY gain DESC LIMIT 7
        ''').fetchall()

        # Class stats
        s = c.execute('''
            SELECT COUNT(*),
                   SUM(CASE WHEN week_xp>0 THEN 1 ELSE 0 END),
                   COALESCE(SUM(week_xp),0),
                   COALESCE(SUM(COALESCE(week_rounds,0)),0),
                   COALESCE(SUM(rounds_played),0)
            FROM characters
        ''').fetchone()

        # Recent events this week
        ev_rows = c.execute('''
            SELECT name, type, detail, substr(ts,12,5)
            FROM events WHERE ts >= ? ORDER BY ts DESC LIMIT 10
        ''', (monday,)).fetchall()

        # Top 3 units by total attempts
        unit_rows = c.execute('''
            SELECT unit_id, SUM(attempts), SUM(misses)
            FROM question_stats GROUP BY unit_id
            ORDER BY SUM(attempts) DESC LIMIT 3
        ''').fetchall()

        # Hot this week — most quests
        hot_rows = c.execute('''
            SELECT name, COALESCE(week_rounds,0), xp, COALESCE(cosmetics,'{}')
            FROM characters WHERE week_rounds > 0
            ORDER BY week_rounds DESC LIMIT 5
        ''').fetchall()

    medals = ['🥇', '🥈', '🥉']
    max_wxp = lb_rows[0][2] if lb_rows else 1

    leaderboard = []
    for i, (name, xp, week_xp, week_rounds, cosm_json) in enumerate(lb_rows):
        cosm  = json.loads(cosm_json or '{}')
        lv    = min(calc_level(xp), len(LEVEL_TITLES) - 1)
        # Level L spans LEVEL_THRESHOLDS[L-1] .. LEVEL_THRESHOLDS[L]; the last
        # level has no band above it, so it always shows a full bar.
        if lv < len(LEVEL_THRESHOLDS):
            cur_t = LEVEL_THRESHOLDS[lv - 1]
            nxt_t = LEVEL_THRESHOLDS[lv]
            bar_pct = min(100, max(1, round((xp - cur_t) / (nxt_t - cur_t) * 100)))
            next_title = LEVEL_TITLES[min(lv + 1, len(LEVEL_TITLES) - 1)]
        else:
            bar_pct = 100
            next_title = None
        leaderboard.append({
            'rank':       i + 1,
            'medal':      medals[i] if i < 3 else str(i + 1),
            'name':       name,
            'emoji':      char_emoji(cosm, xp),
            'title':      LEVEL_TITLES[lv],
            'week_xp':    week_xp,
            'bar_pct':    bar_pct,
            'next_title': next_title,
        })

    jumps = [{'rank': i + 1, 'medal': medals[i] if i < 3 else str(i + 1),
              'name': n, 'emoji': char_emoji(json.loads(cj or '{}'), 0), 'gain': g}
             for i, (n, _x, g, cj) in enumerate(jump_rows)]

    stats = {
        'total':        s[0] or 0,
        'active':       s[1] or 0,
        'week_xp':      s[2] or 0,
        'week_quests':  s[3] or 0,
        'total_quests': s[4] or 0,
    }

    events = []
    for name, etype, detail, ts in ev_rows:
        if etype == 'level_up':
            events.append({'icon': '✨', 'msg': f'{name} reached {detail}!', 'time': ts})
        elif etype == 'first_quest':
            events.append({'icon': '🎮', 'msg': f'{name} joined Math Quest!', 'time': ts})

    units = []
    for uid, total, total_miss in unit_rows:
        if uid in IM_UNIT_META:
            _, uname, icon = IM_UNIT_META[uid]
            miss_rate = round(total_miss / total * 100) if total else 0
            units.append({'name': uname, 'icon': icon,
                          'attempts': total, 'miss_rate': miss_rate})

    hot = []
    for name, wr, xp, cosm_json in hot_rows:
        cosm = json.loads(cosm_json or '{}')
        hot.append({'name': name, 'emoji': char_emoji(cosm, xp), 'quests': wr})

    from datetime import datetime
    now = datetime.now().strftime('%I:%M %p').lstrip('0')

    return render_template('display.html',
        leaderboard=leaderboard, jumps=jumps, stats=stats, events=events,
        units=units, hot=hot, now=now, refresh=45)

# ── Teacher dashboard ─────────────────────────────────────────
@app.route('/teacher')
@require_teacher
def teacher():
    ip  = get_ip()
    url = f'http://{ip}:{PORT}'
    msg = request.args.get('msg', '')

    with sqlite3.connect(DB) as c:
        chars_raw = c.execute(
            'SELECT name, xp, level, items, rounds_played, last_played, '
            'COALESCE(rounds_en,0), COALESCE(rounds_es,0), COALESCE(pin,"—"), '
            'COALESCE(difficulty,2) '
            'FROM characters ORDER BY xp DESC LIMIT 30'
        ).fetchall()
        total_rounds = c.execute('SELECT COALESCE(SUM(rounds_played),0) FROM characters').fetchone()[0]
        spread_rows  = c.execute(
            'SELECT COALESCE(difficulty,2), COUNT(*) FROM characters '
            'WHERE rounds_played > 0 GROUP BY COALESCE(difficulty,2)'
        ).fetchall()
        char_count   = c.execute('SELECT COUNT(*) FROM characters').fetchone()[0]
        max_level    = max((calc_level(r[0]) for r in c.execute('SELECT xp FROM characters').fetchall()), default=1)
        settings_rows = c.execute(
            "SELECT key, value FROM settings WHERE key LIKE 'c%' OR key LIKE 'u%' ORDER BY key"
        ).fetchall()
        diag_rows = c.execute(
            'SELECT unit_id, difficulty, attempts, misses FROM question_stats'
        ).fetchall()
        student_rows = c.execute(
            'SELECT name, unit_id, difficulty, attempts, misses FROM student_unit_stats'
        ).fetchall()

    chars    = [{'name': r[0], 'xp': r[1], 'level': calc_level(r[1]),  # always derive from XP
                 'item_count': len(json.loads(r[3] or '[]')),
                 'rounds': r[4], 'last_played': (r[5] or '')[:10],
                 'rounds_en': r[6], 'rounds_es': r[7], 'pin': r[8],
                 'difficulty': r[9], 'difficulty_label': DIFF_LABELS[r[9]]}
                for r in chars_raw]
    spanish_count = sum(1 for c in chars if c['rounds_es'] > 0)
    _spread    = {d: n for d, n in spread_rows}
    diff_spread = [{'level': d, 'label': DIFF_LABELS[d], 'icon': DIFF_ICONS[d],
                    'count': _spread.get(d, 0)} for d in (0, 1, 2)]
    settings = {r[0]: r[1] == '1' for r in settings_rows}

    # ── Per-student lookup: {uid: {diff: {name: {attempts, misses, miss_rate}}}}
    stu = {}
    for sname, uid, diff, att, miss in student_rows:
        stu.setdefault(uid, {}).setdefault(diff, {})[sname] = {
            'attempts':  att, 'misses': miss,
            'miss_rate': round(miss / att * 100) if att > 0 else 0,
        }

    # Which units have prerequisite dependencies in 6th grade math
    IM_PREREQS = {'c2': ('c1', 'Số tự nhiên & Tính chia hết'),
                  'c4': ('c1', 'Số tự nhiên & Tính chia hết'),
                  'c5': ('c4', 'Phân số'),
                  'c6': ('c3', 'Hình học trực quan')}

    # ── Build diagnostics
    by_unit = {}
    for uid, diff, att, miss in diag_rows:
        by_unit.setdefault(uid, {})[diff] = {
            'attempts':  att, 'misses': miss,
            'miss_rate': round(miss / att * 100) if att > 0 else 0,
        }

    diag_data = []
    for uid, diffs in by_unit.items():
        if uid not in IM_UNIT_META:
            continue
        num, uname, icon = IM_UNIT_META[uid]
        total_att  = sum(d['attempts'] for d in diffs.values())
        total_miss = sum(d['misses']   for d in diffs.values())
        if total_att == 0:
            continue

        diffs_list = []
        unit_students = set()
        at_risk_names = {}   # name → highest miss_rate across diffs

        for key in ('easy', 'medium', 'hard'):
            if key not in diffs:
                continue
            d   = diffs[key]
            s   = stu.get(uid, {}).get(key, {})
            unit_students |= s.keys()

            # At-risk: ≥ 5 attempts and > 60 % miss rate for this student/diff
            at_risk_here = sorted(
                [{'name': n, 'miss_rate': v['miss_rate']}
                 for n, v in s.items() if v['attempts'] >= 5 and v['miss_rate'] >= 60],
                key=lambda x: -x['miss_rate']
            )
            for ar in at_risk_here:
                at_risk_names[ar['name']] = max(
                    at_risk_names.get(ar['name'], 0), ar['miss_rate'])

            diffs_list.append({
                'key': key, 'label': key.capitalize(),
                'student_count': len(s),
                'at_risk_here':  at_risk_here,
                **d,
            })

        prereq = IM_PREREQS.get(uid)
        overall_rate = round(total_miss / total_att * 100)

        diag_data.append({
            'uid': uid, 'num': num, 'name': uname, 'icon': icon,
            'overall_rate':   overall_rate,
            'total_attempts': total_att,
            'total_students': len(unit_students),
            'at_risk': sorted(
                [{'name': n, 'miss_rate': r} for n, r in at_risk_names.items()],
                key=lambda x: -x['miss_rate']
            ),
            'prereq':  prereq,   # None or (uid, display_name)
            'diffs':   diffs_list,
        })

    diag_data.sort(key=lambda x: x['overall_rate'], reverse=True)

    # ── "Needs Attention" — top urgent unit × difficulty combos (≥ 5 attempts, ≥ 60 % miss)
    needs_attention = sorted(
        [{'unit_name': u['name'], 'unit_icon': u['icon'], 'unit_num': u['num'],
          'uid': u['uid'],
          'difficulty': d['key'], 'miss_rate': d['miss_rate'],
          'student_count': d['student_count'], 'at_risk_count': len(d['at_risk_here'])}
         for u in diag_data for d in u['diffs']
         if d['attempts'] >= 5 and d['miss_rate'] >= 60],
        key=lambda x: (-x['miss_rate'], -x['at_risk_count'])
    )[:4]

    return render_template('teacher.html',
        unit_groups=TEACHER_GROUPS,
        chars=chars, qr=make_qr(url), url=url, msg=msg,
        total_rounds=total_rounds, char_count=char_count, max_level=max_level,
        settings=settings, diag_data=diag_data, diff_spread=diff_spread,
        needs_attention=needs_attention, spanish_count=spanish_count)

@app.route('/teacher/delete_student', methods=['POST'])
@require_teacher
def delete_student():
    d    = request.get_json(force=True)
    name = str(d.get('name', ''))
    if not name:
        return jsonify({'ok': False, 'error': 'no name'}), 400
    with sqlite3.connect(DB) as c:
        # Table names come from the STUDENT_TABLES constant above, never from
        # the request, so interpolating them here is safe.
        removed = {t: c.execute(f'DELETE FROM {t} WHERE name=?', (name,)).rowcount
                   for t in STUDENT_TABLES}
    return jsonify({'ok': True, 'removed': removed})

@app.route('/teacher/reset', methods=['POST'])
@require_teacher
def teacher_reset():
    if request.form.get('password') == 'math':
        with sqlite3.connect(DB) as c:
            for t in STUDENT_TABLES:
                c.execute(f'DELETE FROM {t}')
            c.execute('DELETE FROM question_stats')
            # Re-seed settings defaults after reset
            for uid in IM_UNITS:
                c.execute('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)', (uid,'1'))
        return redirect('/teacher?msg=cleared')
    return redirect('/teacher?msg=wrong')

# ── Startup ───────────────────────────────────────────────────
# Run at import, not just under __main__. The schema creation, the column
# migrations and the settings defaults all live in init_db(), so any launcher
# that imports this module instead of executing it — gunicorn, uwsgi, mod_wsgi,
# `flask run` — used to serve a database with no tables at all and raise
# "no such table" on every route. It is idempotent, so running it here and on
# every restart is safe.
init_db()

# ── Entry point ───────────────────────────────────────────────
if __name__ == '__main__':
    ip = get_ip()
    print(f'\n  ┌────────────────────────────────────────────────────────┐')
    print(f'  │  🏆  ĐẤU TRƯỜNG TOÁN HỌC ĐANG CHẠY!                   │')
    print(f'  ├────────────────────────────────────────────────────────┤')
    print(f'  │  👉 Đại sảnh / Trang chủ:  http://localhost:{PORT}      │')
    print(f'  │  📱 Mạng LAN nội bộ:       http://{ip}:{PORT}      │')
    print(f'  │  👨‍🏫 Quản trị giáo viên:    http://{ip}:{PORT}/teacher │')
    print(f'  └────────────────────────────────────────────────────────┘\n')
    app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)
