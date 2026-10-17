// Publica en producción etiquetando el despliegue con la versión y su motivo.
// Uso:  npm run release -- 1.2.0 "Motivo del cambio"   (actualiza version.js y package.json y publica)
//       npm run release                                  (publica con la versión que ya tiene version.js)
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const root = path.join(__dirname, '..'), vf = path.join(root, 'public', 'js', 'app', 'version.js'), pf = path.join(root, 'package.json');
const read = () => { const t = fs.readFileSync(vf, 'utf8'); return { version: /version: '([^']*)'/.exec(t)[1], notes: /notes: '((?:[^'\\]|\\.)*)'/.exec(t)[1].replace(/\\'/g, "'") }; };
const [ver, ...rest] = process.argv.slice(2);
if (ver) {
  if (!/^\d+\.\d+\.\d+$/.test(ver)) { console.error('La versión debe ser como 1.2.0'); process.exit(1); }
  const notes = rest.join(' ') || read().notes, date = new Date().toISOString().slice(0, 10);
  const esc = notes.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  fs.writeFileSync(vf, `// Versión de la aplicación. Única fuente: la actualiza «npm run release -- 1.2.0 "motivo"».\nconst APP_VERSION = { version: '${ver}', date: '${date}', notes: '${esc}' };\n`);
  const p = JSON.parse(fs.readFileSync(pf, 'utf8')); p.version = ver; fs.writeFileSync(pf, JSON.stringify(p, null, 2) + '\n');
}
const v = read(); console.log('Publicando v' + v.version + ' — ' + v.notes);
const r = spawnSync('vercel', ['--prod', '--yes', '--force', '--meta', 'version=' + v.version, '--meta', '"description=' + v.notes.replace(/"/g, "'") + '"'], { stdio: 'inherit', shell: true, cwd: root });
process.exit(r.status || 0);
