// Loads the app's plain scripts into one sandbox, the way the browser does, so they can be tested without a browser.
const vm = require('vm');
const fs = require('fs');
const path = require('path');

module.exports = function load(files) {
  const ctx = vm.createContext({ window: {}, console, URL, URLSearchParams, TextEncoder, btoa, crypto: require('crypto').webcrypto });
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(__dirname, '../../js', f), 'utf8'), ctx, { filename: f });
  return (code) => vm.runInContext(code, ctx);
};
