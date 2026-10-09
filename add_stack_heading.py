from pathlib import Path
f=Path(r"C:\Users\Kaustuv Gupta\Desktop\portfolio\src\main.jsx")
s=f.read_text(encoding="utf-8")
old='<div className="section-label reveal"><span>05 — MY TECHSTACK</span><span>TOOLS I USE TO EXPLORE &amp; BUILD</span></div><div className="stack-cloud reveal">'
new='<div className="section-label reveal"><span>05 — MY TECHSTACK</span><span>TOOLS I USE TO EXPLORE &amp; BUILD</span></div><h2 className="stack-heading reveal">My Techstack<span className="blue-dot">.</span></h2><div className="stack-cloud reveal">'
assert old in s
f.write_text(s.replace(old,new,1),encoding="utf-8")
