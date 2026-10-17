// Release: bump version, commit, tag, push to GitHub, then deploy to Vercel.
// Usage:
//   npm run release -- 1.3.0 "Reason for the change"   bump + commit + tag + push + deploy
//   npm run release                                    use the version already in version.js
// Flags (after the arguments): --no-git (skip commit/tag/push), --no-deploy (skip Vercel)
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const root = path.join(__dirname, '..');
const vf = path.join(root, 'public', 'js', 'app', 'version.js'), pf = path.join(root, 'package.json');
const args = process.argv.slice(2), flags = args.filter(a => a.startsWith('--')), pos = args.filter(a => !a.startsWith('--'));
const noGit = flags.includes('--no-git'), noDeploy = flags.includes('--no-deploy');
const fail = msg => { console.error('\n✖ ' + msg); process.exit(1); };

const read = () => {
  const t = fs.readFileSync(vf, 'utf8');
  return { version: /version: '([^']*)'/.exec(t)[1], notes: /notes: '((?:[^'\\]|\\.)*)'/.exec(t)[1].replace(/\\(.)/g, '$1') };
};
// Runs a command in the project folder; captures output unless `show` is set.
const run = (cmd, a, show) => spawnSync(cmd, a, { cwd: root, encoding: 'utf8', stdio: show ? 'inherit' : 'pipe' });
const git = (a, show) => run('git', a, show);

const [ver, ...rest] = pos;
if (ver) {
  if (!/^\d+\.\d+\.\d+$/.test(ver)) fail('The version must look like 1.2.0');
  const notes = rest.join(' ') || read().notes, date = new Date().toISOString().slice(0, 10);
  const esc = notes.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  fs.writeFileSync(vf, `// Application version. Single source: updated by \`npm run release -- 1.2.0 "reason"\`.\nconst APP_VERSION = { version: '${ver}', date: '${date}', notes: '${esc}' };\n`);
  const p = JSON.parse(fs.readFileSync(pf, 'utf8')); p.version = ver;
  fs.writeFileSync(pf, JSON.stringify(p, null, 2) + '\n');
}
const v = read(), tag = 'v' + v.version;
console.log(`Releasing ${tag} — ${v.notes}`);

if (!noGit) {
  if (git(['rev-parse', '--is-inside-work-tree']).status !== 0) fail('This folder is not a git repository. Run "git init" and add the GitHub remote, or use --no-git.');
  if (git(['remote', 'get-url', 'origin']).status !== 0) fail('No "origin" remote. Add it with: git remote add origin <github-url>');
  const msg = `${tag}: ${v.notes}`;
  git(['add', '-A']);
  if (git(['diff', '--cached', '--quiet']).status !== 0) {
    if (git(['commit', '-m', msg], true).status !== 0) fail('git commit failed.');
  } else console.log('Nothing new to commit.');
  const hasTag = git(['rev-parse', '-q', '--verify', `refs/tags/${tag}`]).status === 0;
  if (hasTag) {
    const onHead = git(['rev-parse', `${tag}^{commit}`]).stdout.trim() === git(['rev-parse', 'HEAD']).stdout.trim();
    if (!onHead) fail(`Tag ${tag} already exists on a different commit. Use a new version number.`);
    console.log(`Tag ${tag} already points to this commit.`);
  } else if (git(['tag', '-a', tag, '-m', msg], true).status !== 0) fail('git tag failed.');
  if (git(['push', 'origin', 'HEAD', '--follow-tags'], true).status !== 0) fail('git push failed. Nothing was deployed.');
  console.log(`✔ GitHub updated (${tag}).`);
}

if (!noDeploy) {
  const a = ['--prod', '--yes', '--force', '--meta', 'version=' + v.version, '--meta', '"description=' + v.notes.replace(/"/g, "'") + '"'];
  const r = spawnSync('vercel', a, { cwd: root, stdio: 'inherit', shell: true });
  if (r.status) fail('Vercel deploy failed (GitHub was already updated).');
}
