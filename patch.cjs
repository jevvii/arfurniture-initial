const fs = require('fs');
const glob = require('glob');
const files = glob.sync('server/routes/*.mjs');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/new ObjectId\(([^)\s]+[^)]*)\)/g, '(ObjectId.isValid($1) ? new ObjectId($1) : $1)');
  fs.writeFileSync(file, content);
  console.log('Patched ' + file);
});
