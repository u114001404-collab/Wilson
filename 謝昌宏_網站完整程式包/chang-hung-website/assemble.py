"""選用的打包腳本：把可讀原始碼轉為能離線開啟的單一 HTML。

網站本身不依賴 Python；一般使用只需要直接開啟 dist/index.html。
只有在修改分檔原始碼後、想重新產生單檔版時，才需要執行本檔。
"""
from pathlib import Path
import base64
import json
import mimetypes

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'source'

def data_uri(path):
    mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

html = (SOURCE / 'index.html').read_text(encoding='utf-8')
css = (SOURCE / 'styles.css').read_text(encoding='utf-8')
js = (SOURCE / 'script.js').read_text(encoding='utf-8')
assets = {}
for folder in ['assets', 'documents']:
    for path in sorted((SOURCE / folder).iterdir()):
        if path.is_file():
            name = path.relative_to(SOURCE).as_posix()
            assets[name] = data_uri(path)
            html = html.replace(f'src="{name}"', f'src="{assets[name]}"')
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '\n</style>')
html = html.replace('<script src="script.js"></script>', '<script>\n' + js + '\n</script>')
html = html.replace('<script type="application/json" id="assetData">{}</script>', '<script type="application/json" id="assetData">'+json.dumps(assets, ensure_ascii=False, separators=(',',':'))+'</script>')
out = ROOT / 'dist' / 'index.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print(f'Standalone HTML ready: {out} ({out.stat().st_size:,} bytes)')
