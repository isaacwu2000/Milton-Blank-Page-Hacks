"""Render validated report data to a summary and complete per-session chat PDFs."""
import json
import re
import sys
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, KeepTogether, PageBreak
from reportlab.graphics.shapes import Drawing, Line, Circle, Rect, String
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader, PdfWriter

INK = colors.HexColor('#17252b')
TEAL = colors.HexColor('#28685b')
MUTED = colors.HexColor('#566970')
FONT = 'Lexend'
FONT_BOLD = 'LexendSemiBold'
assets = Path(__file__).resolve().parent.parent/'assets'
pdfmetrics.registerFont(TTFont(FONT, str(assets/'Lexend-Regular.ttf')))
pdfmetrics.registerFont(TTFont(FONT_BOLD, str(assets/'Lexend-SemiBold.ttf')))
styles = getSampleStyleSheet()
for name in ['Normal', 'Title', 'Heading1', 'Heading2', 'Heading3']:
    styles[name].fontName = FONT
    styles[name].textColor = INK
for name in ['Title', 'Heading1', 'Heading2', 'Heading3']:
    styles[name].fontName = FONT_BOLD
styles['Normal'].fontSize = 10
styles['Normal'].leading = 15
styles['Normal'].spaceAfter = 7
styles['Title'].fontSize = 23
styles['Title'].leading = 28
styles['Title'].alignment = TA_LEFT
styles['Heading2'].fontSize = 14
styles['Heading2'].leading = 19
styles['Heading2'].spaceBefore = 16
styles['Heading2'].spaceAfter = 8
styles['Heading2'].keepWithNext = True
styles['Heading3'].keepWithNext = True
styles.add(ParagraphStyle('Caption', fontName=FONT, fontSize=8, leading=11, textColor=MUTED, spaceAfter=12))
styles.add(ParagraphStyle('Student', parent=styles['Normal'], textColor=TEAL))


def text(value, style='Normal'):
    return Paragraph(escape(str(value)).replace('\n', '<br/>'), styles[style])


def footer(canvas, document):
    canvas.setFont(FONT, 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(40, 25, 'LearnUnlock / Agentic evaluation / Provisional app-visible evidence')
    canvas.drawRightString(572, 25, str(document.page))


def chart_drawing(chart):
    rows = chart['rows']
    height = max(110, 65 + len(rows) * 36)
    drawing = Drawing(532, height)
    left, right = 270, 450
    span = right - left
    max_count = max([1] + [row.get('value', 0) for row in rows])
    def x(value):
        return left + value * span
    for fraction in [0, .25, .5, .75, 1]:
        point = x(fraction)
        drawing.add(Line(point, 12, point, height - 17, strokeColor=colors.HexColor('#e6edee')))
        drawing.add(String(point, height - 9, f'{int(fraction*100)}%' if chart['type'] == 'rate' else f'{fraction*max_count:g}', fontName=FONT, fontSize=8, textAnchor='middle', fillColor=MUTED))
    if not rows:
        drawing.add(String(0, 50, 'No eligible observations.', fontName=FONT, fontSize=10, fillColor=MUTED))
    for index, row in enumerate(rows):
        y = height - 38 - index * 36
        label = row['label']
        # Wrap long labels at spaces so their complete meaning remains readable.
        chunks = []
        current = ''
        for word in label.split():
            if len(current + ' ' + word) > 42 and current:
                chunks.append(current)
                current = word
            else:
                current = (current + ' ' + word).strip()
        if current:
            chunks.append(current)
        for offset, chunk in enumerate(chunks):
            drawing.add(String(0, y + 4 - offset * 10, chunk, fontName=FONT, fontSize=8, fillColor=INK))
        if chart['type'] == 'rate':
            rate = row.get('rate')
            if rate is not None:
                low, high = row['interval']
                drawing.add(Line(x(low), y, x(high), y, strokeColor=TEAL, strokeWidth=2))
                drawing.add(Circle(x(rate), y, 3, fillColor=TEAL, strokeColor=TEAL))
                label = f"{row['successes']}/{row['opportunities']} ({rate:.0%})"
            else:
                label = 'n=0'
            drawing.add(String(right + 8, y - 3, label, fontName=FONT, fontSize=8, fillColor=INK))
            if row.get('unknown') or row.get('notApplicable'):
                drawing.add(String(left, y - 14, f"{row.get('unknown',0)} unknown; {row.get('notApplicable',0)} N/A", fontName=FONT, fontSize=7, fillColor=MUTED))
        else:
            end = x(row['value'] / max_count)
            drawing.add(Rect(left, y - 5, max(1, end-left), 10, fillColor=TEAL, strokeColor=None))
            drawing.add(String(right+8, y-3, str(row['value']), fontName=FONT, fontSize=8, fillColor=INK))
    return drawing


def screenshot(shot, max_height=240, keep=True):
    image = Image(shot['path'])
    scale = min(532/image.imageWidth, max_height/image.imageHeight)
    image.drawWidth, image.drawHeight = image.imageWidth*scale, image.imageHeight*scale
    image.hAlign = 'LEFT'
    block = [image, Spacer(1, 5), text(shot['caption'], 'Caption')]
    return KeepTogether(block) if keep else block


def document(path, story, title):
    SimpleDocTemplate(str(path), pagesize=(612,792), rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=42, title=title, author='LearnUnlock evaluation tool').build(story, onFirstPage=footer, onLaterPages=footer)


def main(model_path, output_path):
    model = json.loads(Path(model_path).read_text())
    output = Path(output_path)
    separate_chats = model.get('reportFormat') == 'separate-chat-exports' or (model['skillVersion'] == '6' and model.get('reportFormat') != 'single-evaluation')
    unified = not separate_chats and (model.get('reportFormat') == 'single-evaluation' or model['skillVersion'] == '5')
    separated = 'evaluatorNotes' in model and not unified and not separate_chats
    story = [text('LearnUnlock evaluation' if unified else ('LearnUnlock Tutor report' if separated else 'LearnUnlock evaluation'), 'Title'), text(model['runId'] if separated else f"{model['runId']} · {model['evaluator']} · app version: {model['appVersion']}", 'Caption')]
    timing = f"Start: {model.get('startedAt','unknown (not captured)')} | End: {model.get('endedAt','unknown (not captured)')} | Zone: {model.get('timeZone','unknown')}"
    metadata = [text(timing, 'Caption'), text(f"Local commit: {model.get('localCommit','unknown')} | Deployed commit: {model.get('deployedCommit','unknown')}", 'Caption'), text(f"{len(model['cases'])} case attempts; {model['retries']} retries; {model['incomplete']} incomplete/blocked. Skill {model['skillVersion']}, rubric {model['rubricVersion']}.")]
    if unified or separate_chats:
        story.append(text(timing, 'Caption'))
    elif not separated:
        story.extend(metadata)
    else:
        story.append(text(timing, 'Caption'))
    if model.get('summary'):
        for section, heading in [('minus','Minus'), ('plus','Plus'), ('interesting','Interesting')]:
            if not model['summary'][section] and not (section == 'minus' and model['summary'].get('auxiliaryFailures')):
                continue
            pending_heading = [text(heading, 'Heading2')]
            groups = [(None, model['summary'][section])]
            if section == 'minus':
                groups.append((None if unified else 'Auxiliary failures', model['summary'].get('auxiliaryFailures', [])))
            for subheading, items in groups:
                if subheading and items:
                    pending_heading.append(text(subheading, 'Heading3'))
                for item in items:
                    block = pending_heading + [text(f"• {item['id']}: {item['text']}")]
                    pending_heading = []
                    block.extend(text(f"{item['id']} record: {record}", 'Caption') for record in item['records'])
                    for shot in item.get('screenshots', []):
                        block.extend(screenshot({**shot, 'caption': f"{item['id']}: {shot['caption']}"}, 210 if len(item.get('screenshots', [])) > 1 else 280, keep=False))
                    story.append(KeepTogether(block))
            if section == 'minus' and model['summary'].get('minusContext'):
                story.extend([text('Failure context', 'Heading3'), text(model['summary']['minusContext'])])
    else:
        story.append(text('Findings', 'Heading2'))
        story.extend(text(finding) for finding in model['findings'])
    category = next((chart for chart in model['charts'] if chart['id'].startswith('categories-') and chart['rows']), None)
    if category and not model.get('summary'):
        story.append(KeepTogether([text('Category results', 'Heading2'), text(category['subtitle'], 'Caption'), chart_drawing(category)]))
    uncertainty = [text('Scope and uncertainty', 'Heading2'), text('Scores are provisional reviewer judgments. Unknowns and N/A are excluded and shown separately. Wilson intervals are two-sided 80%; repeated events within a chat are correlated, so event intervals are approximate. One case cannot establish cross-subject reliability. First-attempt and retry results remain separate.')]
    if not separated and not unified and not separate_chats:
        story.extend(uncertainty)
    event_chart = next((chart for chart in model['charts'] if chart['id'].startswith('opportunities-') and chart['rows']), None)
    if event_chart:
        for offset in range(0, len(event_chart['rows']), 12):
            part = {**event_chart, 'rows': event_chart['rows'][offset:offset+12]}
            story.append(KeepTogether([text('Eligible-event success', 'Heading2'), text(event_chart['subtitle'], 'Caption'), chart_drawing(part)]))
    for shot in model.get('screenshots', []):
        story.append(screenshot(shot))
    if not model.get('summary'):
        story.append(text('The separate chart gallery includes subject/check rates, exclusions, failure counts, attempt coverage and compatible before/after comparisons. Complete chats and evidence remain separate from this short summary.', 'Caption'))
    summary = output/('evaluation.pdf' if separate_chats else 'summary.pdf')
    document(summary, story, 'LearnUnlock evaluation summary')
    summary_reader = PdfReader(summary)
    word_count = len(re.findall(r'\S+', '\n'.join(page.extract_text() or '' for page in summary_reader.pages)))
    if word_count > 1000:
        raise ValueError(f'Summary contains {word_count} words, exceeding 1000. Reduce findings/screenshots/charts.')
    validation = {'summaryWords':word_count,'summaryPages':len(summary_reader.pages),'chats':[]}
    if separated:
        notes = [text('Evaluator notes', 'Title'), text(model['runId'], 'Caption'), text(timing, 'Caption')]
        for section, heading, prefix in [('minus','Minus','M'), ('plus','Plus','P'), ('interesting','Interesting','I')]:
            if not model['evaluatorNotes'][section] and not (section == 'minus' and model['evaluatorNotes'].get('auxiliaryFailures')):
                continue
            pending_heading = [text(heading, 'Heading2')]
            groups = [(None, model['evaluatorNotes'][section])]
            if section == 'minus':
                groups.append(('Auxiliary failures', model['evaluatorNotes'].get('auxiliaryFailures', [])))
            index = 0
            for subheading, items in groups:
                if subheading and items:
                    pending_heading.append(text(subheading, 'Heading3'))
                for note in items:
                    index += 1
                    item = {'text': note} if isinstance(note, str) else note
                    block = pending_heading + [text(f"• {prefix}{index}: {item['text']}")]
                    pending_heading = []
                    block.extend(text(f"{prefix}{index} record: {record}", 'Caption') for record in item.get('records', []))
                    for shot in item.get('screenshots', []):
                        block.extend(screenshot({**shot, 'caption': f"{prefix}{index}: {shot['caption']}"}, 220, keep=False))
                    notes.append(KeepTogether(block))
        notes_path = output/'evaluator-notes.pdf'
        document(notes_path, notes, 'LearnUnlock evaluator notes')
        validation['evaluatorNotesPages'] = len(PdfReader(notes_path).pages)
    for case in model['cases']:
        for session in case['sessions']:
            safe_id = re.sub(r'[^a-zA-Z0-9_-]', '_', session['id'])
            if session.get('nativePdf'):
                target = output/f'chat-{safe_id}.pdf'
                target.write_bytes(Path(session['nativePdf']).read_bytes())
                reader = PdfReader(target)
                validation['chats'].append({'file':target.name,'messages':len(session['messages']),'pages':len(reader.pages),'captureComplete':session['captureComplete'],'nativeExport':True})
                if session.get('observations'):
                    observations = output/f'chat-{safe_id}-observations.pdf'
                    document(observations, [text('Visible tools, proposals and saved state', 'Title'), text(session['url'], 'Caption'), *[text(item) for item in session['observations']]], 'LearnUnlock supplemental tool records')
                    validation['chats'][-1]['observationsFile'] = observations.name
                continue
            story = [text('Student conversation', 'Title'), text(f"{case['id']} / attempt {case['attempt']} / {session['id']}", 'Caption'), text(session['url'])]
            story.append(text(timing, 'Caption'))
            if not session['captureComplete']:
                story.append(text('INCOMPLETE CAPTURE: consult capture notes and the linked app session.', 'Heading2'))
            if session.get('captureNotes'):
                story.extend(text(note, 'Caption') for note in session['captureNotes'])
            for index, message in enumerate(session['messages']):
                story.append(text(f"{index+1}. {message['role'].capitalize()}", 'Heading2'))
                # Long messages may span pages; every paragraph is retained.
                for paragraph in message['text'].split('\n\n'):
                    story.append(text(paragraph, 'Student' if message['role']=='student' else 'Normal'))
                for shot in message.get('screenshots', []):
                    story.append(screenshot(shot, 280))
            if session.get('observations'):
                story.append(PageBreak())
                story.append(text('Visible tools, proposals and saved state', 'Heading2'))
                story.extend(text(observation) for observation in session['observations'])
            target = output/f'chat-{safe_id}.pdf'
            document(target, story, f"LearnUnlock chat: {session['id']}")
            reader = PdfReader(target)
            validation['chats'].append({'file':target.name,'messages':len(session['messages']),'pages':len(reader.pages),'captureComplete':session['captureComplete']})
    cover = output/'full-chat-cover.pdf'
    document(cover, [text('Full chat exports', 'Title'), text(model['runId'], 'Caption'), text(timing, 'Caption'), text('Chat records follow in case order. Native app exports stay unchanged. Generated transcript captures are supplemental and labeled.'), *[text(f"{case['id']}: {case.get('device','device not recorded')} · {case.get('viewport',{}).get('width','?')} × {case.get('viewport',{}).get('height','?')}") for case in model['cases']]], 'LearnUnlock full chat exports')
    combined = PdfWriter()
    combined.append(str(cover))
    for chat in validation['chats']:
        combined.append(str(output/chat['file']))
        if chat.get('observationsFile'):
            combined.append(str(output/chat['observationsFile']))
    combined.write(str(output/'full-chats.pdf'))
    cover.unlink()
    validation['fullChatsPages'] = len(PdfReader(output/'full-chats.pdf').pages)
    if unified:
        # Append native export pages after the short report; keep evaluator judgments in chat.
        evaluation = PdfWriter()
        evaluation.append(str(summary))
        evaluation.append(str(output/'full-chats.pdf'))
        evaluation.write(str(output/'evaluation.pdf'))
        validation['evaluationPages'] = len(PdfReader(output/'evaluation.pdf').pages)
        summary.unlink()
        (output/'full-chats.pdf').unlink()
        for chat in validation['chats']:
            (output/chat['file']).unlink()
            if chat.get('observationsFile'):
                (output/chat['observationsFile']).unlink()
    print(json.dumps(validation, indent=2))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
