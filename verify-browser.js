const { spawn } = require('child_process');
const http = require('http');

async function testWithBrowser() {
  console.log('Testing with real browser...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9222;

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:3000/',
  ]);

  try {
    // Wait for Chrome to bind port
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get list of targets
    const targets = await new Promise((resolve, reject) => {
      http.get(`http://localhost:${port}/json`, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });

    console.log('Found targets in Chrome:', targets.length);
    const pageTarget = targets.find((t) => t.type === 'page');
    console.log('Active Page URL in browser:', pageTarget ? pageTarget.url : 'none');

    // Wait a couple seconds to observe transition from / to /login (for unauthenticated session)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const updatedTargets = await new Promise((resolve, reject) => {
      http.get(`http://localhost:${port}/json`, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => resolve(JSON.parse(raw)));
      }).on('error', reject);
    });

    const finalTarget = updatedTargets.find((t) => t.type === 'page');
    console.log('Final Page URL in browser:', finalTarget ? finalTarget.url : 'none');

    if (finalTarget && finalTarget.url.includes('/login')) {
      console.log('✓ Successfully verified that unauthenticated visitor is redirected to /login!');
    } else {
      console.log('Current page:', finalTarget?.url);
    }
  } finally {
    chrome.kill();
  }
}

testWithBrowser().catch((err) => {
  console.error('Browser test failed:', err);
  process.exit(1);
});

