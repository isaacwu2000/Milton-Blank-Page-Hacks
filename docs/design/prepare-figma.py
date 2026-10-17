"""Compose Figma-importable vector specimens with outlined Lexend labels.

Run: uv run --no-project --with 'fonttools[woff]' python docs/design/prepare-figma.py
Original boards retain editable text; this import avoids missing-font rendering.
"""
from pathlib import Path
import xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

BASE = Path(__file__).resolve().parent
ET.register_namespace('', 'http://www.w3.org/2000/svg')
NS = '{http://www.w3.org/2000/svg}'
font = TTFont(BASE.parents[1] / 'Web/frontend/public/fonts/lexend-latin.woff2')
fonts = {}
root = ET.Element(NS + 'svg', {'width': '1520', 'height': '2180', 'viewBox': '0 0 1520 2180'})

def convert(element, inherited_color='#171e22'):
    color = element.get('color', inherited_color)
    for key, value in list(element.attrib.items()):
        if value == 'currentColor':
            element.set(key, color)
    for child in list(element):
        convert(child, color)
        if child.tag != NS + 'text':
            continue
        weight = int(child.get('font-weight', '400'))
        if weight not in fonts:
            fonts[weight] = instantiateVariableFont(font, {'wght': weight}, inplace=False)
        instance = fonts[weight]
        glyphs = instance.getGlyphSet()
        cmap = instance.getBestCmap()
        size = float(child.get('font-size', '16'))
        scale = size / instance['head'].unitsPerEm
        tracking = float(child.get('letter-spacing', '0'))
        letters = ''.join(child.itertext())
        advances = [glyphs[cmap.get(ord(letter), '.notdef')].width * scale + tracking for letter in letters]
        x = float(child.get('x', '0'))
        if child.get('text-anchor') == 'end':
            x -= sum(advances) - tracking
        group = ET.Element(NS + 'g', {'fill': child.get('fill', color), 'aria-label': letters})
        y = float(child.get('y', '0'))
        for letter, advance in zip(letters, advances):
            pen = SVGPathPen(glyphs)
            glyphs[cmap.get(ord(letter), '.notdef')].draw(pen)
            if pen.getCommands():
                ET.SubElement(group, NS + 'path', {'d': pen.getCommands(), 'transform': f'translate({x:g} {y:g}) scale({scale:g} {-scale:g})'})
            x += advance
        element.insert(list(element).index(child), group)
        element.remove(child)

for filename, x, y in [('brand-concepts/brand-board.svg', '40', '40'), ('icon-concepts/icon-board.svg', '160', '1200')]:
    board = ET.parse(BASE / filename).getroot()
    board.set('x', x)
    board.set('y', y)
    convert(board)
    root.append(board)
ET.ElementTree(root).write(BASE / 'figma-concept-board.svg', encoding='unicode')
