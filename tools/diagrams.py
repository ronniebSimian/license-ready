# Draws the situation diagrams in states/idaho/diagrams/ as plain SVG.
# usage: python3 -I tools/diagrams.py [name ...]      (no names = all)
#
# Why code and not an image generator: in a traffic diagram the details ARE the lesson (which way the wheels
# point, which line is dashed, which lane the bus is in). Here every one of those is a number you can check.
#
# Visual language, shared by every diagram (keep it consistent):
#   - your car is green; other cars gray/blue; school bus yellow
#   - red octagon badge = this vehicle must stop; circled numbers = order of who goes first
#   - green arrow = your path; blue arrow = someone else's path; red X = don't do this
#   - no words, so one image works in every language (the fact's diagramDesc carries the words, as alt text)
#   - US right-hand traffic, top-down, "up" in the picture is the direction you are driving unless shown otherwise
import math, os, sys

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'states', 'idaho', 'diagrams')
W, H = 400, 300

C = dict(ground='#dde7d6', asphalt='#6b7178', curb='#c4c8c2', walk='#d9dcd6', white='#ffffff', yellow='#f2c230',
         you='#0e8a4b', other='#9aa3ab', blue='#3f72c9', bus='#f5b700', truck='#c8662a', glass='#cfe3f0',
         tire='#1f2522', red='#d62839', ink='#18211c', island='#b9d0a6', shoulder='#b7a98f')


class D:
    def __init__(self):
        self.parts = []

    def add(self, s):
        self.parts.append(s)
        return self

    def svg(self):
        defs = ''.join(
            f'<marker id="ah-{n}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">'
            f'<path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>' for n, c in (('you', C['you']), ('blue', C['blue']), ('ink', C['ink'])))
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img">'
                f'<defs>{defs}</defs><rect width="{W}" height="{H}" rx="14" fill="{C["ground"]}"/>' + ''.join(self.parts) + '</svg>\n')

    # ---- primitives ----
    def rect(self, x, y, w, h, fill, rx=0, extra=''):
        return self.add(f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{rx:g}" fill="{fill}" {extra}/>')

    def line(self, x1, y1, x2, y2, color, width=3, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ''
        return self.add(f'<line x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" stroke="{color}" stroke-width="{width:g}"{d}/>')

    def path(self, d, color, width=5, arrow=None, dash=None, halo=True):
        m = f' marker-end="url(#ah-{arrow})"' if arrow else ''
        da = f' stroke-dasharray="{dash}"' if dash else ''
        if halo:  # white outline so arrows read on asphalt and grass alike
            self.add(f'<path d="{d}" fill="none" stroke="#fff" stroke-width="{width + 4:g}" stroke-linecap="round" stroke-linejoin="round" opacity=".85"{da}/>')
        return self.add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width:g}" stroke-linecap="round" stroke-linejoin="round"{m}{da}/>')

    def car(self, x, y, heading=0, color=None, s=1.0, wheels=False, steer=0, lights=None):
        """Top-down car centered at x,y. heading: degrees clockwise from facing up. steer: front-wheel angle (+ = right)."""
        color = color or C['other']
        g = [f'<g transform="translate({x:g} {y:g}) rotate({heading:g}) scale({s:g})">']
        if wheels:
            for wx, wy, front in ((-13, -14, True), (13, -14, True), (-13, 12, False), (13, 12, False)):
                rot = steer if front else 0
                g.append(f'<rect x="{wx - 3}" y="{wy - 5}" width="6" height="10" rx="1.5" fill="{C["tire"]}" transform="rotate({rot:g} {wx} {wy})"/>')
        g.append(f'<rect x="-11" y="-21" width="22" height="42" rx="6" fill="{color}" stroke="rgba(0,0,0,.35)" stroke-width="1"/>')
        g.append(f'<rect x="-8" y="-12" width="16" height="8" rx="2" fill="{C["glass"]}"/>')
        g.append(f'<rect x="-8" y="9" width="16" height="5" rx="2" fill="{C["glass"]}"/>')
        if lights:  # e.g. emergency or school-bus flashers
            for lx, col in ((-7, lights[0]), (7, lights[1])):
                g.append(f'<circle cx="{lx}" cy="-1" r="3.2" fill="{col}"/><circle cx="{lx}" cy="-1" r="7" fill="{col}" opacity=".35"/>')
        g.append('</g>')
        return self.add(''.join(g))

    def bus(self, x, y, heading=0, flashing=True, arm=True):
        g = [f'<g transform="translate({x:g} {y:g}) rotate({heading:g})">',
             f'<rect x="-13" y="-38" width="26" height="76" rx="4" fill="{C["bus"]}" stroke="rgba(0,0,0,.4)" stroke-width="1"/>',
             f'<rect x="-10" y="-34" width="20" height="7" rx="2" fill="{C["glass"]}"/>',
             f'<line x1="-13" y1="-20" x2="13" y2="-20" stroke="#000" stroke-width="1.5"/>',
             f'<line x1="-13" y1="30" x2="13" y2="30" stroke="#000" stroke-width="1.5"/>']
        if flashing:
            for lx, ly in ((-9, -36), (9, -36), (-9, 36), (9, 36)):
                g.append(f'<circle cx="{lx}" cy="{ly}" r="3" fill="{C["red"]}"/><circle cx="{lx}" cy="{ly}" r="7" fill="{C["red"]}" opacity=".35"/>')
        if arm:  # stop arm swings out on the driver's (left) side
            g.append(f'<line x1="-13" y1="-24" x2="-24" y2="-24" stroke="#444" stroke-width="2"/>')
            g.append(octagon(-30, -24, 7))
        g.append('</g>')
        return self.add(''.join(g))

    def truck(self, x, y, heading=0, color=None):
        color = color or C['truck']
        return self.add(f'<g transform="translate({x:g} {y:g}) rotate({heading:g})">'
                        f'<rect x="-12" y="-52" width="24" height="22" rx="4" fill="{color}" stroke="rgba(0,0,0,.4)"/>'
                        f'<rect x="-9" y="-48" width="18" height="6" rx="2" fill="{C["glass"]}"/>'
                        f'<rect x="-13" y="-27" width="26" height="80" rx="2" fill="#e9ecef" stroke="rgba(0,0,0,.4)"/></g>')

    def stop_badge(self, x, y, r=10):
        return self.add(octagon(x, y, r))

    def number(self, x, y, n, color=None):
        color = color or C['ink']
        return self.add(f'<circle cx="{x:g}" cy="{y:g}" r="11" fill="#fff" stroke="{color}" stroke-width="2.5"/>'
                        f'<text x="{x:g}" y="{y + 5:g}" font-family="system-ui,sans-serif" font-size="15" font-weight="700" text-anchor="middle" fill="{color}">{n}</text>')

    def cross(self, x, y, r=10):
        return self.add(f'<circle cx="{x:g}" cy="{y:g}" r="{r + 3:g}" fill="#fff"/>'
                        f'<path d="M{x - r * .6:g},{y - r * .6:g} L{x + r * .6:g},{y + r * .6:g} M{x + r * .6:g},{y - r * .6:g} L{x - r * .6:g},{y + r * .6:g}" stroke="{C["red"]}" stroke-width="4" stroke-linecap="round"/>')

    def yield_sign(self, x, y, s=12):
        h = s * 1.732
        return self.add(f'<path d="M{x - s:g},{y - h / 2:g} L{x + s:g},{y - h / 2:g} L{x:g},{y + h / 2:g} z" fill="#fff" stroke="{C["red"]}" stroke-width="3.5" stroke-linejoin="round"/>')

    def stop_sign(self, x, y, r=8):
        return self.add(octagon(x, y, r, post=True))


def octagon(x, y, r, post=False):
    pts = ' '.join(f'{x + r * math.cos(math.radians(22.5 + 45 * i)):.1f},{y + r * math.sin(math.radians(22.5 + 45 * i)):.1f}' for i in range(8))
    return f'<polygon points="{pts}" fill="{C["red"]}" stroke="#fff" stroke-width="{1.5 if r < 9 else 2}"/>'


def pt(cx, cy, r, deg):
    a = math.radians(deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def vroad(d, x0, x1, top=0, bottom=H):
    d.rect(x0, top, x1 - x0, bottom - top, C['asphalt'])


def hroad(d, y0, y1, left=0, right=W):
    d.rect(left, y0, right - left, y1 - y0, C['asphalt'])


# ------------------------------------------------------------------------------------------------ diagrams

def roundabout():
    """Enter by turning right, travel counter-clockwise, yield to cars already in the circle (from your left)."""
    d = D(); cx, cy = 200, 150
    vroad(d, 170, 230); hroad(d, 120, 180)
    d.add(f'<circle cx="{cx}" cy="{cy}" r="88" fill="{C["asphalt"]}"/>')
    d.add(f'<circle cx="{cx}" cy="{cy}" r="44" fill="{C["island"]}" stroke="#fff" stroke-width="3"/>')
    for (x1, y1, x2, y2) in ((200, 238, 200, 300), (200, 62, 200, 0), (288, 150, 400, 150), (112, 150, 0, 150)):
        d.line(x1, y1, x2, y2, C['yellow'], 3)
    d.yield_sign(246, 262, 10)
    # car already circulating, coming from your left: it goes first
    x, y = pt(cx, cy, 66, 140)
    d.car(x, y, heading=140, color=C['blue'])
    d.number(x - 24, y + 4, 1, C['blue'])
    # you: enter turning right, go counter-clockwise, exit to the west (a left turn)
    a = pt(cx, cy, 66, 68); b = pt(cx, cy, 66, -168)
    d.path(f'M215,282 L215,246 Q216,226 {a[0]:.1f},{a[1]:.1f} A66,66 0 1 0 {b[0]:.1f},{b[1]:.1f} Q120,136 60,135', C['you'], arrow='you')
    d.car(215, 268, color=C['you'])
    d.number(242, 290, 2, C['you'])
    return d


def hill(kind):
    """Top-down: street climbs toward the top of the image (inset shows the slope). kind: uphill-curb | downhill-curb | no-curb."""
    d = D()
    edge = 300
    vroad(d, 70, edge)
    d.line(150, 0, 150, H, C['yellow'], 3, dash='16 12')
    if kind == 'no-curb':
        d.rect(edge, 0, 26, H, C['shoulder'])
    else:
        d.rect(edge, 0, 8, H, C['curb']); d.rect(edge + 8, 0, 40, H, C['walk'])
    # The car always faces the top of the picture, parked at the right edge; only the slope changes.
    # steer: + = wheels turned to the car's right (toward the curb/edge), - = to its left (away from the curb)
    steer = {'uphill-curb': -32, 'downhill-curb': 32, 'no-curb': 32}[kind]
    d.car(edge - 31, 150, color=C['you'], s=2.0, wheels=True, steer=steer)
    # side-view inset: the same car seen from its right side, nose to the right. Uphill = nose higher.
    d.rect(14, 14, 100, 74, '#fff', rx=10, extra='opacity=".92"')
    tilt = -24 if kind != 'downhill-curb' else 24
    if kind == 'no-curb':  # same rule both ways: show both slopes
        d.add(f'<path d="M20,80 L64,48 L108,80 z" fill="{C["asphalt"]}"/>')
        for x, t in ((42, -36), (86, 36)):
            d.add(side_car(x, 56, t, s=.7))
    else:
        d.add(f'<path d="{"M20,80 L108,40 L108,80 z" if tilt < 0 else "M20,40 L108,80 L20,80 z"}" fill="{C["asphalt"]}"/>')
        d.add(side_car(64, 52, tilt))
    return d


def side_car(x, y, tilt, s=1.0):
    """Tiny side-view car, nose to the right, for slope insets."""
    return (f'<g transform="translate({x:g} {y:g}) rotate({tilt:g}) scale({s:g})">'
            f'<rect x="-20" y="-6" width="40" height="11" rx="3" fill="{C["you"]}"/>'
            f'<path d="M-10,-6 L-6,-14 L8,-14 L13,-6 z" fill="{C["you"]}"/><path d="M2,-12.5 L7,-12.5 L10.5,-7 L2,-7 z" fill="{C["glass"]}"/>'
            f'<circle cx="-11" cy="6" r="5" fill="{C["tire"]}"/><circle cx="12" cy="6" r="5" fill="{C["tire"]}"/></g>')


def school_bus_four_lane():
    """Four lanes, two each way: traffic behind the bus stops; you, going the other way, may keep going."""
    d = D()
    vroad(d, 80, 320)
    d.line(197, 0, 197, H, C['yellow'], 3); d.line(203, 0, 203, H, C['yellow'], 3)
    d.line(140, 0, 140, H, C['white'], 3, dash='18 14'); d.line(260, 0, 260, H, C['white'], 3, dash='18 14')
    # northbound (right half): bus in the curb lane, cars behind it stopped
    d.bus(290, 120, heading=0)
    d.car(290, 222, color=C['other']); d.stop_badge(312, 222)
    d.car(230, 210, color=C['blue']); d.stop_badge(252, 210)
    # southbound (left half): you keep going, with care
    d.car(110, 90, heading=180, color=C['you'])
    d.path('M110,122 L110,250', C['you'], arrow='you')
    d.car(170, 200, heading=180, color=C['other'])
    d.path('M170,232 L170,290', C['blue'], arrow='blue')
    return d


def person(x, y, color='#33413a'):
    return f'<circle cx="{x:g}" cy="{y - 7:g}" r="4" fill="{color}"/><rect x="{x - 4:g}" y="{y - 2:g}" width="8" height="11" rx="3" fill="{color}"/>'


def bike(x, y, heading=0, color='#33413a'):
    """Top-down bicyclist: thin bike with a rider."""
    return (f'<g transform="translate({x:g} {y:g}) rotate({heading:g})">'
            f'<rect x="-1.5" y="-15" width="3" height="30" rx="1.5" fill="{color}"/>'
            f'<rect x="-8" y="-9" width="16" height="2.5" rx="1" fill="{color}"/>'
            f'<ellipse cx="0" cy="-1" rx="6" ry="5" fill="{C["blue"]}"/><circle cx="0" cy="-4" r="3.5" fill="#f1d3b3"/></g>')


def school_bus_two_lane():
    """Two-lane road: traffic in BOTH directions stops for the school bus."""
    d = D()
    vroad(d, 120, 280)
    d.line(200, 0, 200, H, C['yellow'], 3, dash='16 12')
    d.bus(240, 140, heading=0)
    for i, x in enumerate((186, 204, 222)):
        d.add(person(x, 86 - (i % 2) * 6))
    d.car(240, 250, color=C['other']); d.stop_badge(266, 250)
    d.car(160, 40, heading=180, color=C['you']); d.stop_badge(134, 40)
    return d


def center_turn_lane():
    """Shared center turn lane: solid yellow outside, dashed yellow inside; only for left turns, from either direction."""
    d = D()
    d.rect(0, 70, 80, 90, C['walk'])                      # parking lot on the left
    for x in (14, 34, 54):
        d.line(x, 74, x, 108, '#fff', 2)
    vroad(d, 80, 320)
    for x_solid, x_dash in ((157, 163), (243, 237)):
        d.line(x_solid, 0, x_solid, H, C['yellow'], 3)
        d.line(x_dash, 0, x_dash, H, C['yellow'], 3, dash='14 10')
    # white turn arrows painted in the center lane, one for each direction
    d.path('M200,262 L200,236 Q200,224 188,224', '#fff', width=4, arrow=None, halo=False)
    d.add('<path d="M190,217 L180,224 L190,231 z" fill="#fff"/>')
    d.path('M200,38 L200,64 Q200,76 212,76', '#fff', width=4, arrow=None, halo=False)
    d.add('<path d="M210,69 L220,76 L210,83 z" fill="#fff"/>')
    d.car(120, 52, heading=180, color=C['other']); d.path('M120,82 L120,130', C['blue'], arrow='blue')
    d.number(96, 40, 1, C['blue'])
    d.car(200, 170, color=C['you']); d.number(226, 186, 2, C['you'])
    d.path('M200,148 L200,128 Q200,115 170,113 L40,113', C['you'], arrow='you')
    return d


def solid_dashed_yellow():
    """Left: dashed line on your side, you may pass. Right: solid line on your side, you may not."""
    d = D()
    for ox, may_pass in ((0, True), (200, False)):
        vroad(d, ox + 30, ox + 170)
        your_side, other_side = (ox + 103, ox + 97)
        d.line(other_side, 0, other_side, H, C['yellow'], 3, dash=None if may_pass else '14 10')
        d.line(your_side, 0, your_side, H, C['yellow'], 3, dash='14 10' if may_pass else None)
        d.truck(ox + 135, 120, color='#7d8790')
        d.car(ox + 135, 262, color=C['you'])
        d.path(f'M{ox + 135},240 Q{ox + 135},210 {ox + 65},190 L{ox + 65},70 Q{ox + 65},40 {ox + 135},28', C['you'], arrow='you', dash=None if may_pass else '10 9')
        if not may_pass:
            d.cross(ox + 65, 130)
    d.rect(198, 0, 4, H, '#fff')
    return d


def intersection(d, signs=True):
    vroad(d, 160, 240); hroad(d, 110, 190)
    d.rect(160, 110, 80, 80, C['asphalt'])
    for (x1, y1, x2, y2) in ((200, 0, 200, 110), (200, 190, 200, 300), (0, 150, 160, 150), (240, 150, 400, 150)):
        d.line(x1, y1, x2, y2, C['yellow'], 3)
    if signs:
        for (x1, y1, x2, y2) in ((200, 196, 240, 196), (160, 104, 200, 104), (246, 110, 246, 150), (154, 150, 154, 190)):
            d.line(x1, y1, x2, y2, '#fff', 4)
        for x, y in ((252, 204), (148, 96), (254, 100), (146, 200)):
            d.stop_sign(x, y)


def four_way_same_time():
    """Two cars stop at the same time: the car on the left (you) lets the car on the right go first."""
    d = D(); intersection(d)
    d.car(270, 130, heading=270, color=C['blue']); d.number(270, 100, 1, C['blue'])
    d.path('M248,130 L60,130', C['blue'], arrow='blue')
    d.car(220, 222, color=C['you']); d.number(250, 238, 2, C['you'])
    return d


def t_intersection():
    """Your road ends at a T: let traffic on the through road, from both directions, go first."""
    d = D()
    hroad(d, 70, 150); vroad(d, 160, 240, top=150)
    d.line(0, 110, 400, 110, C['yellow'], 3)
    d.car(60, 130, heading=90, color=C['other']); d.path('M84,130 L150,130', C['blue'], arrow='blue'); d.number(60, 165, 1, C['blue'])
    d.car(340, 90, heading=270, color=C['other']); d.path('M316,90 L250,90', C['blue'], arrow='blue'); d.number(340, 55, 1, C['blue'])
    d.car(220, 200, color=C['you']); d.number(250, 220, 2, C['you'])
    d.path('M220,178 L220,150 Q220,132 250,132 L290,132', C['you'], arrow='you', dash='9 8')
    d.path('M212,178 L212,108 Q212,90 182,90 L130,90', C['you'], arrow='you', dash='9 8')
    return d


def move_over():
    """Passing a stopped emergency vehicle: slow down, and move to a lane that is not next to it."""
    d = D()
    vroad(d, 90, 250); d.rect(250, 0, 44, H, '#80868c')
    d.line(170, 0, 170, H, '#fff', 3, dash='18 14'); d.line(250, 0, 250, H, '#fff', 3)
    d.car(272, 110, color='#2b3a55', lights=(C['red'], C['blue']))
    d.car(210, 262, color=C['you'])
    d.path('M210,240 L210,215 Q210,185 130,165 L130,30', C['you'], arrow='you')
    return d


def thru_turn():
    """No direct left turn: go straight, U-turn at the next signal, come back, turn right."""
    d = D()
    hroad(d, 120, 160); vroad(d, 130, 270)
    d.line(0, 140, 130, 140, C['yellow'], 3); d.line(270, 140, 400, 140, C['yellow'], 3)
    for y0, y1 in ((60, 120), (160, 300)):
        d.rect(194, y0, 12, y1 - y0, C['island'])        # median, open at the U-turn spot and the crossing
    d.rect(194, 0, 12, 18, C['island'])
    d.add('<g transform="translate(300 34)"><rect x="-7" y="-18" width="14" height="36" rx="4" fill="#222"/>'
          f'<circle cy="-10" r="4" fill="#555"/><circle cy="0" r="4" fill="#555"/><circle cy="10" r="4" fill="{C["ok"] if "ok" in C else "#2ecc71"}"/></g>')
    d.path('M236,214 Q236,150 150,145', C['ink'], width=3, dash='6 6', arrow='ink', halo=False)
    d.cross(205, 168)
    d.car(236, 262, color=C['you'])
    d.path('M236,240 L236,60 Q236,32 200,32 Q164,32 164,60 L164,118 Q164,148 130,148 L20,148', C['you'], arrow='you')
    return d


def arm_signals():
    """Three arm signals, seen from behind the car: left = straight out, right = up, slow/stop = down."""
    d = D()
    for i, kind in enumerate(('left', 'right', 'stop')):
        ox = 10 + i * 130
        d.rect(ox, 10, 120, 280, '#ffffff', rx=12, extra='opacity=".55"')
        cx, by = ox + 72, 150
        d.add(f'<rect x="{cx - 42}" y="{by}" width="84" height="56" rx="10" fill="{C["you"]}"/>'
              f'<rect x="{cx - 34}" y="{by - 34}" width="68" height="38" rx="8" fill="{C["you"]}"/>'
              f'<rect x="{cx - 28}" y="{by - 28}" width="56" height="26" rx="5" fill="{C["glass"]}"/>'
              f'<circle cx="{cx - 14}" cy="{by - 14}" r="8" fill="#5a4636"/>'
              f'<rect x="{cx - 36}" y="{by + 38}" width="12" height="7" rx="2" fill="{C["red"]}"/><rect x="{cx + 24}" y="{by + 38}" width="12" height="7" rx="2" fill="{C["red"]}"/>'
              f'<rect x="{cx - 42}" y="{by + 54}" width="16" height="12" rx="3" fill="{C["tire"]}"/><rect x="{cx + 26}" y="{by + 54}" width="16" height="12" rx="3" fill="{C["tire"]}"/>')
        sx, sy = cx - 34, by - 12                         # driver's shoulder at the left window
        arm = {'left': f'M{sx},{sy} L{sx - 46},{sy}',
               'right': f'M{sx},{sy} L{sx - 26},{sy} L{sx - 26},{sy - 34}',
               'stop': f'M{sx},{sy} L{sx - 26},{sy} L{sx - 26},{sy + 34}'}[kind]
        d.add(f'<path d="{arm}" fill="none" stroke="#f1d3b3" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>')
        iy = 255
        if kind == 'left':
            d.path(f'M{cx + 22},{iy} L{cx - 26},{iy}', C['ink'], width=5, arrow='ink', halo=False)
        elif kind == 'right':
            d.path(f'M{cx - 22},{iy} L{cx + 26},{iy}', C['ink'], width=5, arrow='ink', halo=False)
        else:
            d.stop_badge(cx, iy, 13)
    return d


def truck_wide_right_turn():
    """A truck turning right swings left first; never drive into the space it leaves on its right."""
    d = D()
    hroad(d, 90, 150, left=140); vroad(d, 140, 260)
    d.line(200, 150, 200, 300, C['yellow'], 3); d.line(260, 120, 400, 120, C['yellow'], 3)
    d.truck(214, 217)
    d.add('<circle cx="225" cy="168" r="4" fill="#ff9f1c"/><circle cx="226" cy="268" r="4" fill="#ff9f1c"/>')
    d.path('M214,160 Q216,136 256,135 L388,135', C['blue'], arrow='blue')
    d.car(246, 272, color=C['you'])
    d.path('M246,250 L246,190', C['you'], arrow='you', dash='9 8'); d.cross(246, 216)
    return d


def blind_spots():
    """Mirrors miss the areas beside your rear corners: turn your head before changing lanes."""
    d = D()
    vroad(d, 60, 340)
    d.line(153, 0, 153, H, '#fff', 3, dash='18 14'); d.line(247, 0, 247, H, '#fff', 3, dash='18 14')
    for sgn in (-1, 1):
        mx = 200 + sgn * 20
        d.add(f'<path d="M{mx},{140} L{200 + sgn * 120},{300} L{200 + sgn * 160 if False else 200 + sgn * 62},{300} z" fill="#7fb3ff" opacity=".35"/>')
        d.add(f'<rect x="{200 + sgn * 70 - 40 if sgn > 0 else 200 - 70 - 40}" y="150" width="80" height="70" rx="10" fill="#ff9f1c" opacity=".45"/>')
    d.add('<path d="M190,170 L176,300 L224,300 L210,170 z" fill="#7fb3ff" opacity=".35"/>')
    d.car(106, 186, color=C['other'])
    d.car(200, 130, color=C['you'], s=1.6)
    return d


def freeway_entrance():
    """Freeway entrance: 1 ramp, 2 acceleration lane (speed up), 3 merging area (fit into a gap)."""
    d = D()
    vroad(d, 60, 200)
    d.add(f'<path d="M200,40 L250,95 L250,190 L360,300 L300,300 L200,200 z" fill="{C["asphalt"]}"/>')
    d.line(130, 0, 130, H, '#fff', 3, dash='18 14')
    d.line(200, 200, 200, 300, '#fff', 3); d.line(200, 40, 200, 200, '#fff', 3, dash='6 10')
    d.car(165, 205, color=C['other']); d.path('M165,182 L165,150', C['blue'], arrow='blue')
    d.car(165, 30, color=C['other'])
    d.car(226, 150, color=C['you'])
    d.path('M226,128 L226,112 Q226,90 165,84 L165,80', C['you'], arrow='you')
    d.number(318, 262, 1); d.number(278, 175, 2); d.number(258, 58, 3)
    return d


def bike_lane_dashed():
    """Turning right across a bike lane: merge into it where the line is dashed, after checking for bicyclists."""
    d = D()
    hroad(d, 60, 120); vroad(d, 110, 290)
    d.line(200, 120, 200, 300, C['yellow'], 3); d.line(0, 90, 110, 90, C['yellow'], 3); d.line(290, 90, 400, 90, C['yellow'], 3)
    d.rect(260, 120, 30, 180, '#5e8f6b')                   # bike lane (painted green here for clarity)
    d.line(260, 210, 260, 300, '#fff', 4); d.line(260, 120, 260, 210, '#fff', 4, dash='12 10')
    d.add(bike(275, 268))
    d.car(232, 205, color=C['you'])
    d.path('M232,184 L232,170 Q234,150 275,140 Q276,108 300,106 L388,106', C['you'], arrow='you')
    return d


DIAGRAMS = {
    'school-bus-two-lane': school_bus_two_lane,
    'center-turn-lane': center_turn_lane,
    'solid-dashed-yellow': solid_dashed_yellow,
    'four-way-same-time': four_way_same_time,
    't-intersection': t_intersection,
    'move-over': move_over,
    'thru-turn': thru_turn,
    'arm-signals': arm_signals,
    'truck-wide-right-turn': truck_wide_right_turn,
    'blind-spots': blind_spots,
    'freeway-entrance': freeway_entrance,
    'bike-lane-dashed': bike_lane_dashed,
    'roundabout': roundabout,
    'hill-uphill-curb': lambda: hill('uphill-curb'),
    'hill-downhill-curb': lambda: hill('downhill-curb'),
    'hill-no-curb': lambda: hill('no-curb'),
    'school-bus-four-lane': school_bus_four_lane,
}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name in sys.argv[1:] or DIAGRAMS:
        open(os.path.join(OUT, f'{name}.svg'), 'w').write(DIAGRAMS[name]().svg())
        print('wrote', name)
