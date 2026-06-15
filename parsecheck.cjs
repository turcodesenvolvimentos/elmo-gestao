const ts = require('typescript');
const fs = require('fs');
const code = fs.readFileSync('src/app/api/boletim/route.ts','utf8');
const sf = ts.createSourceFile('f.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const d = sf.parseDiagnostics || [];
console.log('parseDiagnostics:', d.length);
d.slice(0,15).forEach(x=>{const p=sf.getLineAndCharacterOfPosition(x.start);console.log((p.line+1)+':'+(p.character+1), ts.flattenDiagnosticMessageText(x.messageText,'\n'))});
