const fs = require('fs');
const code = fs.readFileSync('src/app/chat/page.js', 'utf8');
try {
  new Function(code);
} catch (e) {
  if (e.name !== 'SyntaxError') console.log('Syntax looks OK (except JSX which cant be evaluated by new Function)');
  else console.log(e);
}
