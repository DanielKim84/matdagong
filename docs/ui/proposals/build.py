"""현재 브랜드와 화면 목록으로 전달용 HTML/PDF를 만듭니다."""
import base64
import html
import json
from pathlib import Path
from xml.sax.saxutils import escape
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BRAND = ROOT / 'frontend/public/assets/brand'
DATA = json.loads((HERE / 'screens.json').read_text(encoding='utf-8-sig'))
GROUPS = DATA['groups']
W, H = 1190.55, 841.89
CORAL, INK, GRAY = '#EF365B', '#20252B', '#657080'
pdfmetrics.registerFont(TTFont('Malgun', 'C:/Windows/Fonts/malgun.ttf'))
pdfmetrics.registerFont(TTFont('MalgunBold', 'C:/Windows/Fonts/malgunbd.ttf'))
STYLE = ParagraphStyle('body', fontName='Malgun', fontSize=11, leading=17, wordWrap='CJK')
C = canvas.Canvas(str(HERE / 'matdagong-uiux-handoff.pdf'), pagesize=(W, H))
C.setTitle('맛다공 UI/UX 전체 화면 인수인계 시안 - 2026-11-18')
C.setAuthor('맛다공')
PAGE = 0

def text(value, x, y, width, size=11, bold=False, color=INK):
    style = ParagraphStyle('line', parent=STYLE, fontName='MalgunBold' if bold else 'Malgun', fontSize=size, leading=size * 1.55, textColor=colors.HexColor(color))
    p = Paragraph(escape(value).replace('\n', '<br/>'), style)
    _, height = p.wrap(width, H)
    p.drawOn(C, x, y - height)
    return height

def image(path, x, y, width, height):
    with Image.open(path) as im:
        iw, ih = im.size
    scale = min(width / iw, height / ih)
    dw, dh = iw * scale, ih * scale
    C.drawImage(str(path), x + (width - dw) / 2, y - dh, width=dw, height=dh, mask='auto')

def page(title, subtitle='검토용 제안 · 실제 앱 미적용'):
    global PAGE
    if PAGE:
        C.showPage()
    PAGE += 1
    text('MATDAGONG / DESIGN HANDOFF', 48, H - 27, 900, 9, True, CORAL)
    text(title, 48, H - 53, W - 96, 25, True)
    text(subtitle, 49, H - 97, W - 98, 10, False, GRAY)
    C.setStrokeColor(colors.HexColor('#E3E6EA'))
    C.line(48, 39, W - 48, 39)
    text('2026.11.18 · 맛다공 A · 기획/디자인 전달용', 48, 29, 900, 8, False, GRAY)
    text(f'{PAGE:02d}', W - 85, 29, 40, 9, True, CORAL)

def info(label, body, x, y, width, size=13):
    used = text(label, x, y, width, size, True)
    return used + 8 + text(body, x, y - used - 8, width, 11)
RULES = [
    ('밝고 단정한 사진 중심', '흰 바탕·차콜 본문·코랄 동작을 기본으로 합니다. 사진과 추천 이유를 먼저 보여주고 캐릭터는 환영·빈 상태에 절제해 사용합니다.'),
    ('입체와 평면의 역할', '대표 아이콘·배너는 입체 A, 작은 표시는 평면 A입니다. 다공 D는 상위 회사·공통 계정 브랜드로 구분합니다.'),
    ('저장·방문·기록 구분', '하트는 가볼 곳, 체크는 다녀온 곳, 펜은 내 기록입니다. 하트 저장이 방문이나 경험 신뢰를 뜻하지 않습니다.'),
    ('사람의 기록에서 출발', '사진·메뉴·가격·태그·이용 정보는 고른 맛객 한 명의 기록입니다. 신뢰 %와 취향 %를 분리합니다.'),
    ('흔들리지 않는 태그', '선택은 코랄 배경·테두리로 표현합니다. 체크 삽입으로 칩 폭을 바꾸지 않고 분류별 카운트만 강조합니다.'),
    ('공통 인터랙션', '뒤로·공유·하트의 크기와 배경을 통일합니다. 사진 아래 점은 최대 5개이고 끝점 축소와 이동을 부드럽게 연결합니다.'),
]
BOUNDARIES = [
    ('확정 기준', '현재 A 브랜드, 루트 탭 5개, 저장/방문/기록 구분, 맛객별 기록 경계, 공개 프로필과 비공개 추천 취향 분리.'),
    ('배치 제안', '사진 중심 발견 진입은 피드와 역할이 겹쳐 적용하지 않습니다. 지도·하단 목록 패널을 유지하고, 나의 모음 우선순위·긴 상세의 계층·일부 바로가기와 시트 분리는 검토할 디자인 제안입니다.'),
    ('현재 동작 유지', '카카오·네이버 로그인, 가입 3단계, 기록 5단계, 수정 시 장소 고정, 저장·권한·방문 확인 정책.'),
    ('준비 상태', '유료 구독은 개발 흐름이며 실제 결제·정산·교환·후원은 미연결입니다. 정책 본문은 법률 검토 전 초안입니다.'),
    ('범위 밖', '실제 앱 전체 UI 교체, DB·인증·보안 변경, 외부 콘솔 등록은 하지 않았습니다. 문서용 인물·장소·점수·수량은 예시입니다.'),
]

def make_pdf():
    page('맛다공 UI/UX 전체 화면 시안', '18개 보드 · 72개 화면/주요 상태 · 2026-11-18')
    text('새 브랜드와 함께,\n한 끼를 고르는 과정을 더 쉽게.', 54, 680, 1040, 32, True)
    text('사진으로 발견하고, 맛객의 경험으로 판단하고, 나의 장소로 이어지는 밝고 단정한 모바일 경험을 제안합니다.', 55, 563, 1040, 14)
    image(HERE / 'boards/01-overview.png', 48, 500, W - 96, 390)
    text('실제 앱 캡처·완료된 구현·승인된 정책 문서가 아닙니다. 이미지 속 예시보다 화면별 설명의 동작 기준을 우선합니다.', 55, 99, W - 110, 10, False, GRAY)
    page('브랜드 A 사용 기준', '대표 아이콘·로고·배너를 현재 입체 A안으로 갱신')
    image(BRAND / 'brand-identity.png', 48, 704, 578, 635)
    y = 682
    for label, body in [('대표 이미지', '쨍한 코랄의 입체 아이콘으로 브랜드를 기억시킵니다. 기존 물방울 마커 아이콘은 사용하지 않습니다.'), ('작은 표시', '평면 심볼·로고를 사용합니다. 입체형과 평면형은 같은 열린 원·분리된 포크 구조입니다.'), ('공통 계정', '다공 D는 상위 회사·공통 계정 브랜드이며 맛다공 A와 섞지 않습니다.'), ('두 가지 가이드', 'brand-identity.png는 로고·색상·여백 사용 기준, brand-guide.png는 캐릭터·표정·봉제인형 소개판입니다. 둘 다 유지합니다.'), ('기준 색상', 'Coral #EF365B / Charcoal #20252B / White #FFFFFF. 전체 UI는 밝은 바탕을 유지합니다.')]:
        y -= info(label, body, 664, y, 465) + 24
    page('디자인을 관통하는 여섯 가지 원칙')
    for i, (label, body) in enumerate(RULES):
        x, y = 52 + (i % 2) * 557, 688 - (i // 2) * 198
        text(f'0{i + 1}', x, y, 80, 22, True, CORAL)
        info(label, body, x + 59, y, 455, 15)
    page('핵심 이동 흐름과 상태의 의미')
    flows = [('01 · 처음 이용', '다공 로그인 → 서비스 소개 5장 → 사진·닉네임 → 취향 → 맛객 추천 → 발견'), ('02 · 오늘 갈 곳 찾기', '발견/지도 → 검색·필터 → 맛집 상세 → 맛객 기록 확인 → 가볼 곳 저장 또는 길찾기'), ('03 · 경험을 기록', '내 지도 → 빠른 방문 저장 또는 기록하기 → 장소 → 사진·메뉴 → 태그 → 이유·공개 → 확인·저장'), ('04 · 사람을 구독', '맛객 추천/검색 → 공개 프로필 → 신뢰·취향 확인 → 구독 → 피드·알림'), ('05 · 내 데이터 관리', '나 → 내 맛집 모음/개인 목록 → 상세·수정 → 공개 범위 변경 / 설정 → 프로필·취향·계정')]
    y = 690
    for label, body in flows:
        y -= info(label, body, 55, y, W - 110, 15) + 24
    text('상태 원칙: 하트 저장 ≠ 방문 기록 ≠ 추천 기록. 나만 보기도 방문 기록입니다. 별로였던 곳은 지도에서 제외하되 되돌릴 수 있습니다.', 55, 152, W - 110, 12, True, CORAL)
    page('화면 보드 목차', '각 보드 다음 페이지에 목적·주요 동작·현재 경로·구현 주의점을 수록')
    for i, g in enumerate(GROUPS):
        col, row = i // 9, i % 9
        x, y = 55 + col * 555, 694 - row * 66
        text(f"{g['n']:02d}", x, y, 48, 18, True, CORAL)
        text(g['title'], x + 48, y + 2, 430, 14, True)
        text(f"화면 {g['screens'][0]['id']} - {g['screens'][-1]['id']} / PDF {7 + i * 2}-{8 + i * 2}쪽", x + 48, y - 24, 440, 10, False, GRAY)
    page('확정된 기준과 제안의 경계')
    y = 696
    for label, body in BOUNDARIES:
        y -= info(label, body, 55, y, W - 110, 15) + 28
    text('현재 발견은 지도 중심입니다. 핵심 보드의 사진 추천 첫 화면은 검토할 제안이며, 현재 지도 기능은 별도 보드에 포함했습니다.', 55, 179, W - 110, 13, True, CORAL)
    for g in GROUPS:
        page(f"{g['n']:02d} · {g['title']}", g['summary'])
        image(HERE / 'boards' / f"{g['key']}.png", 48, 704, W - 96, 615)
        text('화면 ID로 다음 페이지 설명과 함께 검토하세요. 이미지의 문구·수량·사진은 문서용 예시입니다.', 55, 72, W - 110, 9, False, GRAY)
        page(f"{g['n']:02d} · 화면별 동작과 구현 근거", '정확한 동작 기준은 아래 설명과 현재 코드를 함께 확인')
        for i, s in enumerate(g['screens']):
            x, y = 50 + (i % 2) * 558, 701 - (i // 2) * 312
            C.setStrokeColor(colors.HexColor('#E1E5E9'))
            C.roundRect(x, y - 291, 535, 291, 12, stroke=1, fill=0)
            text(s['id'] + ' · ' + s['title'], x + 18, y - 17, 499, 15, True, CORAL)
            yy = y - 54
            for label, body in [('목적', s['purpose']), ('주요 동작', s['action']), ('동작 기준', s['rule']), ('현재 경로', s['route']), ('구현 근거', s['source'])]:
                height = text(label, x + 18, yy, 75, 9, True, GRAY)
                height = max(height, text(body, x + 96, yy, 420, 10))
                yy -= height + 8
            if yy < y - 286:
                raise ValueError('설명 카드 높이 초과: ' + s['id'])
    page('다음 담당자를 위한 검토 체크', '기획자·앱 디자이너·개발자가 화면 ID로 의견을 연결하는 순서')
    checks = [('1. 정보 구조', '사진 추천형 발견 진입 채택 여부, 지도·목록 전환, 나의 핵심 모음 순서를 확정합니다.'), ('2. 컴포넌트', '44px 이상 터치 영역, 390px 기준 화면, 16px 본문과 충분한 줄간격, 카드·시트·태그·사진·버튼의 규칙을 확정합니다. 수치는 제안 토큰입니다.'), ('3. 상태와 데이터', '내 기록/타인 기록/비공개/방문만 저장/가볼 곳/별로였던 곳/기록 없는 카카오 장소를 각각 확인합니다. 사진 공개 범위와 맛객별 데이터 경계를 유지합니다.'), ('4. 작성과 실패', '사진 추가·삭제는 저장 전 편집 상태와 서버 저장을 구분합니다. 오류 시 입력 유지·재시도·중복 저장 방지·삭제·탈퇴 확인 문구를 검증합니다.'), ('5. 실제 기기', '위치 거부·방문 거리 확인·키보드·긴 닉네임·사진 6장 이상·스와이프·모션 줄이기·카카오맵 전환·인증 복귀를 확인합니다.'), ('6. 출시 전 확인', '준비 중 결제·정산과 정책 초안을 운영 가능한 기능으로 오해시키지 않게 확인합니다. 이 문서는 법률·결제 승인을 대신하지 않습니다.')]
    y = 695
    for label, body in checks:
        y -= info(label, body, 55, y, W - 110, 14) + 21
    C.save()
    return PAGE
def uri(path):
    return 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

def make_html():
    boards = []
    for g in GROUPS:
        notes = []
        for s in g['screens']:
            source = s['source']
            target = ROOT.parent / source if source.startswith('dagong-auth/') else ROOT / 'frontend/src/screens' / source
            note = f"<article class='note'><b>{html.escape(s['id'])} · {html.escape(s['title'])}</b><p>{html.escape(s['purpose'])}</p><dl>"
            for label, key in [('주요 동작', 'action'), ('동작 기준', 'rule'), ('현재 경로', 'route')]:
                note += f"<dt>{label}</dt><dd>{html.escape(s[key])}</dd>"
            note += f"</dl><a href='{target.resolve().as_uri()}'>현재 코드 확인</a></article>"
            notes.append(note)
        search = html.escape(json.dumps(g, ensure_ascii=False), quote=True)
        board = f"<section class='board' id='g{g['n']}' data-search='{search}'><header><span>{g['n']:02d}</span><div><h2>{html.escape(g['title'])}</h2><p>{html.escape(g['summary'])}</p></div><a href='boards/{g['key']}.png' download>PNG 저장</a></header>"
        board += f"<button class='image' type='button' aria-label='{html.escape(g['title'])} 확대'><img loading='lazy' src='boards/{g['key']}.png' alt='{html.escape(g['title'])} 네 화면 시안'></button><div class='notes'>{''.join(notes)}</div></section>"
        boards.append(board)
    rules = ''.join(f'<article><h3>{html.escape(a)}</h3><p>{html.escape(b)}</p></article>' for a, b in RULES)
    boundaries = ''.join(f'<tr><th>{html.escape(a)}</th><td>{html.escape(b)}</td></tr>' for a, b in BOUNDARIES)
    nav = ''.join(f"<a href='#g{g['n']}'>{g['n']:02d} {html.escape(g['title'])}</a>" for g in GROUPS)
    doc = (HERE / 'template.html').read_text(encoding='utf-8-sig')
    replacements = {'__LOGO__': uri(BRAND / 'brand-logo.png'), '__IDENTITY__': uri(BRAND / 'brand-identity.png'), '__RULES__': rules, '__BOUNDARIES__': boundaries, '__NAV__': nav, '__BOARDS__': ''.join(boards)}
    for key, value in replacements.items():
        doc = doc.replace(key, value)
    (HERE / 'index.html').write_text(doc, encoding='utf-8')

if __name__ == '__main__':
    missing = [g['key'] for g in GROUPS if not (HERE / 'boards' / (g['key'] + '.png')).exists()]
    if missing:
        raise SystemExit('아직 없는 보드: ' + ', '.join(missing))
    make_html()
    print(json.dumps({'pages': make_pdf(), 'boards': len(GROUPS), 'screen_states': sum(len(g['screens']) for g in GROUPS)}, ensure_ascii=False))
