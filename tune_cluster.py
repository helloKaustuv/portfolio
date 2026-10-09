from pathlib import Path
f=Path(r"C:\Users\Kaustuv Gupta\Desktop\portfolio\src/main.jsx")
s=f.read_text(encoding="utf-8").replace("mobile ? 290 : 530","mobile ? 230 : 460").replace("mobile ? 63 : 81","mobile ? 58 : 75")
f.write_text(s,encoding="utf-8")
