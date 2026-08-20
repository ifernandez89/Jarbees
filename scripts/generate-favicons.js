const fs = require('fs');
const path = require('path');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;

const publicDir = path.join(__dirname, '..', 'public');
const inputs = [
  path.join(publicDir, 'favicon-16.png'),
  path.join(publicDir, 'favicon-32.png'),
  path.join(publicDir, 'favicon-48.png'),
];

(async () => {
  try {
    const buf = await pngToIco(inputs);
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buf);
    console.log('favicon.ico creado en public/');
  } catch (err) {
    console.error('Error generando favicon.ico:', err);
    process.exit(1);
  }
})();
