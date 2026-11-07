"""Генератор анатомической фигуры (вид спереди) для подсказок замеров.
Запуск: python3 scripts/gen-body-art.py — перезапишет src/components/bodyArt.ts
и сохранит превью art.png в текущую папку (нужен playwright)."""
import math, os, sys
BODY='M 91 50 C 91 62 90 70 86 76 C 78 80 66 82 57 86 C 49 90 48 102 52 110 C 56 114 64 112 69 114 C 71 128 75 142 76 155 C 77 168 67 180 66 196 C 65 230 70 270 74 302 C 75 312 70 328 72 345 C 74 370 80 392 81 404 C 81 410 74 414 75 418 C 76 423 92 423 94 418 C 94 410 92 400 93 392 C 95 365 96 340 93 318 C 91 300 96 250 99 216 L 100 214 L 101 216 C 104 250 109 300 107 318 C 104 340 105 365 107 392 C 108 400 106 410 106 418 C 108 423 124 423 125 418 C 126 414 119 410 119 404 C 120 392 126 370 128 345 C 130 328 125 312 126 302 C 130 270 135 230 134 196 C 133 180 123 168 124 155 C 125 142 129 128 131 114 C 136 112 144 114 148 110 C 152 102 151 90 143 86 C 134 82 122 80 114 76 C 110 70 109 62 109 50 Z'
ARM='M 56 87 C 47 93 45 108 46 122 C 46 138 44 150 43 160 C 42 178 40 196 40 210 C 39 222 38 238 43 246 C 47 250 51 246 51 238 C 51 228 50 218 49 210 C 50 196 54 178 56 162 C 58 148 62 128 66 114 C 64 104 60 92 56 87 Z'
MIRROR='translate(200 0) scale(-1 1)'

C = dict(gap='#5e1b17', m1='#d7675d', m2='#a63a31', fib='#6d1f1a', ten='#ead8c6', ten2='#cdb59f',
         skin1='#efc3a2', skin2='#c98d6b', hair='#2f2219', hair2='#4a3628', line='#4d1612')

def lerp(a,b,t): return (a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t)
def f(p): return f'{p[0]:.1f} {p[1]:.1f}'

def fibers(a0,a1,b0,b1,n,bow=0.0,w=0.45,op=0.55):
    """n волокон: от отрезка a0→a1 к отрезку b0→b1 (с лёгким изгибом)"""
    out=[]
    for i in range(n):
        t=(i+0.5)/n
        p=lerp(a0,a1,t); q=lerp(b0,b1,t)
        mx,my=(p[0]+q[0])/2,(p[1]+q[1])/2
        dx,dy=q[0]-p[0],q[1]-p[1]; L=math.hypot(dx,dy) or 1
        c=(mx-dy/L*bow, my+dx/L*bow)
        out.append(f'M {f(p)} Q {f(c)} {f(q)}')
    return f'<path d="{" ".join(out)}" fill="none" stroke="{C["fib"]}" stroke-width="{w}" stroke-opacity="{op}" stroke-linecap="round"/>'

muscles=[]  # (id, path, fibers_markup)
def M(id_, d, fib=''):
    muscles.append((id_, d, fib))

# --- шея ---
M('neck','M 90.6 50 C 90.8 60 90.2 69 88 75 C 92 78 96 80 100 80 L 100 50 Z', fibers((91,52),(99,52),(90,74),(99,79),5,0,0.4,0.4))
M('trap','M 90 60 C 90 70 87 75 82 78 C 75 81 66 83 58 86 C 66 86 80 83 97 80 C 94 74 92 68 90 60 Z',
  fibers((90,62),(84,79),(60,86),(96,80),7,0.5))
M('scm','M 88.6 50.5 C 91 60 94.4 70 98.6 78.6 L 95 79.6 C 91.6 71 89.4 62 88 52.6 Z', fibers((88.4,51),(90,51),(95.4,79.4),(98.4,78.6),4))
# --- дельта ---
M('delt','M 64 86 C 56 85 48 91 46.5 102 C 45.5 112 47.5 121 50 128 C 53 120 57 110 62 102 C 64 97 66 91 64 86 Z',
  fibers((63,86),(47,104),(51,127),(50,128),10,-1.2))
# --- грудь ---
M('pec','M 99 81 C 90 80 76 83 66 88 C 63 95 62 101 61 108 C 66 114 74 122 84 127 C 90 129 96 129 99 128 Z',
  fibers((99,82),(99,127),(64,92),(62,107),16,1.5))
# --- зубчатая ---
for i,y in enumerate((120,127,134)):
    M(f'ser{i}',f'M {69+i*1.2} {y} C {72+i} {y+0.5} {76+i} {y+2.5} {78.5+i} {y+5} C {76+i} {y+7} {72+i} {y+6} {70+i*1.2} {y+5} Z')
# --- косые ---
M('obl','M 80 124 C 76 130 73 140 76 155 C 77 167 70 180 70 192 C 76 197 84 202 92 208 L 89 196 C 88 180 88 160 88 135 C 86 130 83 126 80 124 Z',
  fibers((80,122),(70,190),(88,140),(92,210),11,0.3))
# --- пресс (кубики) ---
for i,(y0,y1) in enumerate(((129,145),(147,162.5),(164.5,180))):
    M(f'abs{i}',f'M 99 {y0} L 91 {y0} C 89 {y0} 88.5 {y0+1.5} 88.5 {y0+3.5} L 88.5 {y1-2} C 88.5 {y1-0.5} 89.5 {y1} 91 {y1} L 99 {y1} Z',
      fibers((90,y0),(98,y0),(90,y1),(98,y1),5,0))
M('abs3','M 99 182 L 91 182 C 89.3 182 88.6 183.5 88.8 185.5 C 89.5 194 91.5 201 96 207 C 97 208 98 208.5 99 208.5 Z',
  fibers((90,182),(98,182),(95,206),(98.5,208),5,0))
# --- руки ---
M('tri','M 47.5 108 C 46 120 45 136 44.3 152 C 46.5 150 48.5 140 49.3 128 C 49.8 120 49.3 112 47.5 108 Z',
  fibers((47,110),(48.8,112),(44.8,150),(46.5,148),3))
M('bic','M 60 108 C 55 112 50.5 125 50 138 C 49.6 148 50.4 156 52 160.5 C 54 158.5 56 152.5 57 146 C 59 134 61.5 120 60 108 Z',
  fibers((52,116),(60,110),(51.5,158),(55,154),6,0.4))
M('brach','M 49.5 146 C 48 151 46 156 44.5 161 L 51.5 161.5 C 50.6 156 50.2 150.5 49.5 146 Z')
M('brr','M 44.8 158 C 43 168 42 180 41.8 192 C 41.7 200 41.9 206 42.6 210 L 45.8 210 C 46 196 47.8 178 50 165 C 49 161.5 47 159 44.8 158 Z',
  fibers((45,160),(49,164),(42.4,208),(45.4,208),4))
M('flex','M 51.2 162 C 49.4 175 47.6 192 46.6 210 L 48.9 210 C 50 196 53 180 55.8 164 C 54.2 162.4 52.6 162 51.2 162 Z',
  fibers((51.5,163),(55,164),(47,208),(48.6,208),3))
# --- бедро ---
M('gmed','M 71 181 C 67.6 187 66.2 193 66.2 198 C 69 196.6 72.4 195.4 75.6 196.2 C 75 190 73.4 185 71 181 Z', fibers((70.5,182),(73,185),(66.8,197),(75,196),4))
M('pect','M 83 203 C 87 207 91 212 94.4 216 C 95.8 218 97.2 219 98.6 218.6 L 98.4 215.6 C 94 211.6 89.4 207.4 85.6 203.6 Z')
M('grac','M 98.6 222 C 96.8 250 94.4 280 93.2 300 L 91 299 C 92 278 94.4 252 96.4 226 Z', fibers((96.6,226),(98.4,222),(91.2,298),(93,300),2))
M('tfl','M 68 194 C 66 202 66 212 67 222 C 70 216 73 207 75.5 199 C 73 196 70.5 194 68 194 Z', fibers((70,195),(75,199),(67.5,220),(68,221),4))
M('vl','M 67 222 C 64 245 66 275 71 300 C 74 302 77.6 300.4 79.6 296.4 C 79 270 77.6 240 75.4 213 C 72 213.6 68.4 217.6 67 222 Z',
  fibers((68,222),(75,214),(72,299),(79.2,296),9,0.8))
M('rf','M 79.2 208 C 76.4 230 77.4 262 80.8 292 C 83 296.6 86.8 296.4 88.2 292 C 89.4 266 88.4 238 84 212 C 82.6 208.4 80.8 207.4 79.2 208 Z',
  fibers((79.8,211),(83.4,211),(81.2,292),(87.8,292),7,0))
M('vm','M 88.6 262 C 86.6 278 86.6 292 88.2 302 C 90.2 307 94.6 305 94.8 298 C 95 287 92.8 273 88.6 262 Z',
  fibers((88.4,266),(90,263),(88.6,302),(94.4,299),6,0.6))
M('add','M 97.5 217 C 91 223 86.6 236 85.6 252 C 88.6 248 92.6 238 99 227 L 99 218 Z', fibers((97,218),(99,226),(86,250),(87,248),5))
M('sart','M 75.5 196 C 80.5 220 86.5 260 91.2 300 C 92 305 92.2 310 92.4 314.5 L 95 312.5 C 94.2 296 89.2 256 80.4 218 C 79.4 210 78.4 202 77.6 196 Z',
  fibers((76,197),(77.5,197),(92.4,312),(94.6,311),3))
# --- голень ---
M('gas1','M 73.4 322 C 70.2 334 70.2 352 74 368 C 76 360 77.2 345 77.2 330 C 76.4 325 75.2 322 73.4 322 Z', fibers((73,323),(77,330),(73.8,366),(75.5,360),4))
M('gas2','M 93 320 C 95 332 96 348 94 362 C 92.2 355 91.2 340 91.2 328 C 91.3 324 92 321 93 320 Z', fibers((93,321),(91.4,328),(94,360),(92.6,355),3))
M('tib','M 79 323 C 77.8 345 79 370 82 392 L 85.6 392 C 85.8 370 85.2 345 85.6 323 C 83.4 321.6 81 321.6 79 323 Z', fibers((79.4,325),(85.2,325),(82.4,390),(85.4,390),5))
M('per','M 76.4 330 C 75.2 350 76.4 372 79.4 394 L 81.2 393 C 79.4 372 78.4 350 78.4 330 Z', fibers((76.6,332),(78.2,332),(79.6,392),(81,392),2))

defs=['<defs>',
 f'<linearGradient id="bf-m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{C["m1"]}"/><stop offset="1" stop-color="{C["m2"]}"/></linearGradient>',
 f'<linearGradient id="bf-s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{C["skin1"]}"/><stop offset="1" stop-color="{C["skin2"]}"/></linearGradient>',
 f'<radialGradient id="bf-h" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="{C["skin1"]}"/><stop offset="1" stop-color="{C["skin2"]}"/></radialGradient>',
 f'<linearGradient id="bf-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{C["hair2"]}"/><stop offset="1" stop-color="{C["hair"]}"/></linearGradient>']
for id_,d,_ in muscles:
    defs.append(f'<clipPath id="bf-c{id_}"><path d="{d}"/></clipPath>')
defs.append('</defs>')

half=[]
for id_,d,fib in muscles:
    half.append(f'<path d="{d}" fill="url(#bf-m)" stroke="{C["line"]}" stroke-width=".45"/>')
    if fib: half.append(f'<g clip-path="url(#bf-c{id_})">{fib}</g>')
# сухожилия и кости
half.append(f'<path d="M 98.5 80 C 88 79 72 82 63 86" fill="none" stroke="{C["ten"]}" stroke-width="1.6" stroke-linecap="round"/>')  # ключица
half.append(f'<ellipse cx="84.2" cy="307.5" rx="4.2" ry="5" fill="{C["ten2"]}" fill-opacity=".9"/><ellipse cx="83.6" cy="306.5" rx="2.4" ry="3" fill="{C["ten"]}" fill-opacity=".8"/>')  # надколенник
half.append(f'<path d="M 84.2 312.5 L 84.6 322" stroke="{C["ten2"]}" stroke-width="2.4" stroke-linecap="round" stroke-opacity=".85"/>')
half.append(f'<path d="M 86.4 326 C 86.8 350 87.2 372 88 392" fill="none" stroke="{C["ten2"]}" stroke-width=".8" stroke-opacity=".45"/>')  # край большеберцовой
half.append(f'<path d="M 81 393 C 82 398 83 402 83.5 405 M 87 394 C 88 398 88.5 402 88.5 405" fill="none" stroke="{C["ten"]}" stroke-width="1.2" stroke-linecap="round"/>')
half.append(f'<path d="M 42.5 207 L 49.5 207.5" stroke="{C["ten"]}" stroke-width="2" stroke-linecap="round"/>')  # запястье
# кисть и стопа — кожа
half.append(f'<path d="M 40.2 209 C 39 222 38 238 43 246 C 47 250 51 246 51 238 C 51 228 50 218 49.2 209 Z" fill="url(#bf-s)"/>')
half.append(f'<path d="M 43.6 232 L 43.4 245 M 46 233 L 46.3 247 M 48.4 232 L 49 245.5" stroke="{C["skin2"]}" stroke-width=".6" stroke-linecap="round"/>')
half.append(f'<path d="M 81 401 C 81 410 74 414 75 418 C 76 423 92 423 94 418 C 94 410 92.4 405 92.8 399 Z" fill="url(#bf-s)"/>')
half.append(f'<path d="M 78 419.5 L 78.5 422 M 81.5 420 L 82 422.6 M 85 420.3 L 85.3 422.8 M 88.4 420.2 L 88.6 422.6" stroke="{C["skin2"]}" stroke-width=".55" stroke-linecap="round"/>')
# белая линия живота и пупок
head=[]
head.append(f'<path d="M 100 128 L 100 208" stroke="{C["ten2"]}" stroke-width="1" stroke-opacity=".7"/>')
head.append(f'<ellipse cx="100" cy="160.5" rx="1.3" ry="1.8" fill="{C["gap"]}"/>')
# голова
head.append(f'<ellipse cx="83.6" cy="35" rx="2.8" ry="5" fill="{C["skin2"]}"/><ellipse cx="116.4" cy="35" rx="2.8" ry="5" fill="{C["skin2"]}"/>')
head.append(f'<ellipse cx="100" cy="33" rx="17" ry="22" fill="url(#bf-h)"/>')
head.append(f'<path d="M 83.2 31 C 81.6 17 90 9.5 100.5 9.5 C 111 9.5 119 16.5 117 31 C 115.6 25.5 113 21.5 108.5 19.5 C 102 22.5 93 21.2 88.4 22.8 C 85.6 24.6 84 27.6 83.2 31 Z" fill="url(#bf-hair)"/>')
head.append(f'<path d="M 88 14.5 C 93 13 98 13.4 103 15.6 M 92 11.6 C 99 11 106 12.6 111 16.4 M 86.4 19 C 90 17.2 95 16.8 99 18" fill="none" stroke="{C["hair2"]}" stroke-width=".7" stroke-linecap="round" opacity=".9"/>')
head.append(f'<path d="M 88.6 28.4 Q 92.6 26.4 96.4 28.2 M 103.6 28.2 Q 107.4 26.4 111.4 28.4" fill="none" stroke="{C["hair"]}" stroke-width="1.3" stroke-linecap="round"/>')
for ex in (92.6,107.4):
    head.append(f'<ellipse cx="{ex}" cy="32.4" rx="2.7" ry="1.4" fill="#fff"/><circle cx="{ex}" cy="32.4" r="1.15" fill="#3b2a20"/><circle cx="{ex+0.35}" cy="32" r=".35" fill="#fff"/>')
head.append(f'<path d="M 100 33.5 C 99.5 36.5 98.2 39.5 98 41 C 98.8 42.2 101.2 42.2 102 41" fill="none" stroke="{C["skin2"]}" stroke-width=".8" stroke-linecap="round"/>')
head.append(f'<path d="M 95.6 46.6 Q 100 48.8 104.4 46.6" fill="none" stroke="#a55d4c" stroke-width="1.1" stroke-linecap="round"/>')
head.append(f'<path d="M 87 44 C 90 50.5 95 54 100 54.6 C 105 54 110 50.5 113 44" fill="none" stroke="{C["skin2"]}" stroke-width=".7" stroke-opacity=".6"/>')

art = (''.join(defs)
  + f'<path d="{BODY}" fill="{C["gap"]}"/><path d="{ARM}" fill="{C["gap"]}"/><path d="{ARM}" fill="{C["gap"]}" transform="{MIRROR}"/>'
  + '<g>' + ''.join(half) + '</g>'
  + f'<g transform="{MIRROR}">' + ''.join(half) + '</g>'
  + ''.join(head))
open('art.svg.txt','w').write(art)
ts = ('/* Сгенерировано: анатомическая фигура (вид спереди) для подсказок замеров. id начинаются с bf- */\n'
      'export const BODY_ART =\n  ' + repr(art).replace("\\'", "'") + '\n')
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'components', 'bodyArt.ts'),'w').write(ts)
def band(cx,cy,rx,ry=4.5):
    return f'<path d="M {cx-rx} {cy} A {rx} {ry} 0 0 0 {cx+rx} {cy}" fill="none" stroke="#3e88f7" stroke-width="3.2" stroke-linecap="round"/>'
bands=[band(100,96,56),band(100,118,32),band(100,160,25),band(100,200,35),band(82,228,17.5),band(83,345,12),band(53.5,130,8.5),band(48.7,175,7.5)]
def svg(inner,bg,vb='0 0 200 452',w=300,h=678): return f'<svg viewBox="{vb}" width="{w}" height="{h}" style="background:{bg}">{inner}</svg>'
html=('<html><body style="margin:0;background:#000;display:flex;gap:8px;flex-wrap:wrap">'
  + svg(art,'#1c1c1e') + svg(art+''.join(bands),'#ffffff')
  + svg(art,'#1c1c1e','70 0 60 60',300,300)
  + '</body></html>')
open('art.html','w').write(html)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':920,'height':680}, device_scale_factor=2); pg.goto('file://'+os.getcwd()+'/art.html'); pg.screenshot(path='art.png'); b.close()
print(len(art))
