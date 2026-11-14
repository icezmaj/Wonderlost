import re, sys, os, posixpath
src, out = sys.argv[1], sys.argv[2]
L = open(src, encoding='utf8').read().split('\n')
# page shell: title..</style> and markup
s = next(i for i,l in enumerate(L) if l.startswith('<title>'))
e = next(i for i,l in enumerate(L) if l.startswith('<div id="app">'))
shell = '\n'.join(L[s:e+1])
open(os.path.join(out,'dist','wonderlost.html'),'w',encoding='utf8').write(
  '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  + '\n'.join(L[s:e]) + '\n</head><body>\n' + L[e] + '\n' + '\n'.join(L[e+1:]).replace('</body></html>','').rstrip() + '\n</body></html>\n')
css_s = next(i for i,l in enumerate(L) if i> s and l.startswith('<style>'))
css_e = next(i for i,l in enumerate(L) if i> css_s and l.startswith('</style>'))
os.makedirs(os.path.join(out,'src'),exist_ok=True)
open(os.path.join(out,'src','styles.css'),'w',encoding='utf8').write('\n'.join(L[css_s+1:css_e])+'\n')
i=0; n=0
while i < len(L):
    m = re.match(r"^__m\['(.+)'\] = \(function \(\) \{$", L[i])
    if not m: i+=1; continue
    path = m.group(1); j=i+1
    while L[j] != '})();': j+=1
    body = L[i+1:j]
    res=[]
    for l in body:
        mi = re.match(r"^const (\{.*\}) = __m\['(.+)'\];$", l)
        mr = re.match(r"^return \{(.*)\};$", l)
        if mi:
            rel = posixpath.relpath(mi.group(2), posixpath.dirname(path))
            if not rel.startswith('.'): rel='./'+rel
            names = mi.group(1).replace(': ', ' as ')
            res.append(f"import {names} from '{rel}';")
        elif mr:
            names = mr.group(1).strip()
            if names: res.append(f"export {{ {names} }};")
        else: res.append(l)
    p = os.path.join(out, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p,'w',encoding='utf8').write('\n'.join(res).strip('\n')+'\n'); n+=1
    i=j+1
print(n,'modules')
