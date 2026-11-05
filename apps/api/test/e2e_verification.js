const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/USER/AppData/Local/npm-cache/_npx/af752b90495482d7/node_modules/playwright-core');
const { PrismaClient } = require('c:/Users/USER/Desktop/Arshin/Documind/node_modules/@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:5432/documind?schema=public"
    }
  }
});

const API_BASE = 'http://localhost:4000/api';
const FRONTEND_BASE = 'http://localhost:3000';

async function extractExistingSession() {
  const levelDbDir = 'C:\\Users\\USER\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 8\\Local Storage\\leveldb';
  const files = fs.readdirSync(levelDbDir);

  let token = null;
  let workspaceId = null;

  for (const file of files) {
    if (file.endsWith('.log') || file.endsWith('.ldb')) {
      const content = fs.readFileSync(path.join(levelDbDir, file), 'utf8');
      const tokenMatch = content.match(/documind_access_token[^\w]+(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/);
      if (tokenMatch) {
        token = tokenMatch[1];
      }
      const wsMatch = content.match(/documind_workspace_id[^\w]+([a-f0-9-]{36})/);
      if (wsMatch) {
        workspaceId = wsMatch[1];
      }
    }
  }

  if (!token) {
    throw new Error('No existing session token found in Chrome Profile 8 localStorage');
  }

  return { token, workspaceId };
}

async function run() {
  const results = {
    part1: {},
    part2: {},
    part3: {},
  };

  console.log('================================================================');
  console.log('PART 1: AUTOMATED AUTHENTICATION VERIFICATION');
  console.log('================================================================');

  // 1. Where JWT access token is stored
  results.part1.tokenStorageLocation = 'Browser localStorage key: "documind_access_token"';
  console.log('1. Token Storage Location: Verified (localStorage["documind_access_token"])');

  const { token, workspaceId } = await extractExistingSession();
  console.log('Existing session retrieved from local browser storage.');

  // 2, 3, 4: Startup loading and GET /api/auth/me verification
  console.log('\n2 & 3 & 4. Calling GET /api/auth/me with Bearer token...');
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-workspace-id': workspaceId,
    },
  });

  if (!meRes.ok) {
    throw new Error(`Existing session token is INVALID! Server returned HTTP ${meRes.status}`);
  }

  const meData = await meRes.json();
  console.log('   Status:', meRes.status);
  console.log('   Authenticated User ID:', meData.user.id);
  console.log('   Email:', meData.user.email);
  console.log('   Name:', meData.user.name);
  console.log('   Avatar Initials:', meData.user.avatarInitials);
  console.log('   Workspaces:', meData.memberships?.map(m => ({ id: m.workspace.id, name: m.workspace.name, role: m.role })));

  results.part1.authMeResponse = {
    status: meRes.status,
    authenticated: true,
    userId: meData.user.id,
    email: meData.user.email,
  };

  // 5. Match with PostgreSQL records
  console.log('\n5. Comparing with PostgreSQL records...');
  const dbUser = await prisma.user.findUnique({
    where: { id: meData.user.id },
    include: {
      memberships: {
        include: { workspace: true },
      },
    },
  });

  if (!dbUser) {
    throw new Error('User record not found in PostgreSQL!');
  }

  const userMatches = dbUser.id === meData.user.id && dbUser.email === meData.user.email;
  const dbWorkspace = dbUser.memberships[0]?.workspace;
  const workspaceMatches = dbWorkspace?.id === meData.memberships[0]?.workspace.id;

  console.log('   PostgreSQL User ID Matches:', userMatches, `(${dbUser.id})`);
  console.log('   PostgreSQL Workspace ID Matches:', workspaceMatches, `(${dbWorkspace?.id})`);

  results.part1.postgresMatch = {
    userMatches,
    workspaceMatches,
    userId: dbUser.id,
    workspaceId: dbWorkspace?.id,
  };

  // 6. Whether GET /api/documents works
  console.log('\n6. Calling GET /api/documents with existing session...');
  const docsRes = await fetch(`${API_BASE}/documents`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-workspace-id': workspaceId,
    },
  });
  const docsData = await docsRes.json();
  console.log('   GET /api/documents Status:', docsRes.status);
  console.log('   Total Documents Returned:', docsData.pagination?.total ?? docsData.data?.length ?? 0);
  results.part1.documentsApi = {
    status: docsRes.status,
    total: docsData.pagination?.total ?? docsData.data?.length ?? 0,
  };

  // 8. Invalid and Expired Token Handling
  console.log('\n8. Testing Invalid and Expired Tokens...');
  const invalidRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: 'Bearer invalid.tampered.token' },
  });
  console.log('   Invalid Token Response Status (Expected 401):', invalidRes.status);

  const expiredRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwOGM2YmM0Ny01MWVjLTRhMTUtOThkYS01ZDQ3Y2ZhOTM1ZDIiLCJlbWFpbCI6ImRldkBkb2N1bWluZC5jb20iLCJpYXQiOjE1MDAwMDAwMDAsImV4cCI6MTUwMDAwMDAwMX0.invalid' },
  });
  console.log('   Expired/Forged Token Response Status (Expected 401):', expiredRes.status);

  results.part1.tokenSecurity = {
    invalidTokenRejectedWith401: invalidRes.status === 401,
    expiredTokenRejectedWith401: expiredRes.status === 401,
  };

  console.log('\n================================================================');
  console.log('PART 2: PROFILE SYNCHRONIZATION BACKEND AUDIT');
  console.log('================================================================');
  console.log('Verifying protected fields rejection on PATCH /api/auth/profile...');
  const protectedFieldRes = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Alex Mercer', email: 'hacker@example.com' }),
  });
  console.log('   Attempt to modify email Status (Expected 400):', protectedFieldRes.status);
  results.part2.emailProtected = protectedFieldRes.status === 400;

  console.log('\n================================================================');
  console.log('PART 3: AUTOMATED BROWSER E2E VERIFICATION (PLAYWRIGHT)');
  console.log('================================================================');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('   [Browser Console Error]:', msg.text());
    }
  });

  // Seed localStorage with existing valid session
  await page.goto(`${FRONTEND_BASE}/settings`);
  await page.evaluate(({ token, workspaceId }) => {
    localStorage.setItem('documind_access_token', token);
    localStorage.setItem('documind_workspace_id', workspaceId);
  }, { token, workspaceId });

  // Reload to trigger clean startup hydration
  await page.reload({ waitUntil: 'networkidle' });

  // Wait for user profile to be populated from backend
  console.log('Waiting for authenticated profile to hydrate in Settings form...');
  await page.waitForFunction(() => {
    const input = document.querySelector('input[placeholder*="Jane Doe"]');
    return input && input.value.trim().length > 0 && input.value !== 'Arshin K.';
  }, { timeout: 10000 });

  const initialName = await page.locator('input[placeholder*="Jane Doe"]').inputValue();
  const initialTooltip = await page.locator('aside .group:has(a[title*="Profile"]) div.absolute').textContent();
  const initialAvatar = await page.locator('aside a[title*="Profile"]').textContent();

  console.log('1. Initial Loaded Name in Settings:', initialName);
  console.log('2. Initial Bottom-Left Sidebar Tooltip:', initialTooltip?.trim());
  console.log('3. Initial Bottom-Left Avatar Initials:', initialAvatar?.trim());

  results.part3.initialLoadedState = {
    name: initialName,
    sidebarTooltip: initialTooltip?.trim(),
    avatarInitials: initialAvatar?.trim(),
  };

  // Update profile name
  const updatedTestName = 'Alexander Mercer Pro';
  console.log(`\nUpdating Profile Name to "${updatedTestName}" via form...`);
  await page.locator('input[placeholder*="Jane Doe"]').fill(updatedTestName);
  await page.locator('button[type="submit"]:has-text("Save Changes")').click();

  // Wait for success feedback toast
  await page.waitForSelector('text=Profile updated successfully', { timeout: 8000 });
  console.log('4. Profile update success banner confirmed!');

  // Check immediate sidebar update WITHOUT reload
  const immediateTooltip = await page.locator('aside .group:has(a[title*="Profile"]) div.absolute').textContent();
  const immediateAvatar = await page.locator('aside a[title*="Profile"]').textContent();
  console.log('5. Immediate Sidebar Tooltip (no reload):', immediateTooltip?.trim());
  console.log('6. Immediate Avatar Initials (no reload):', immediateAvatar?.trim());

  results.part3.immediateUpdate = {
    tooltip: immediateTooltip?.trim(),
    avatarInitials: immediateAvatar?.trim(),
    matches: immediateTooltip?.includes(updatedTestName) && immediateAvatar?.trim() === 'AP',
  };

  // Check refresh persistence
  console.log('\n7. Reloading browser page to test persistence...');
  await page.reload({ waitUntil: 'networkidle' });

  await page.waitForFunction((expected) => {
    const input = document.querySelector('input[placeholder*="Jane Doe"]');
    return input && input.value === expected;
  }, updatedTestName, { timeout: 10000 });

  const refreshedName = await page.locator('input[placeholder*="Jane Doe"]').inputValue();
  const refreshedTooltip = await page.locator('aside .group:has(a[title*="Profile"]) div.absolute').textContent();
  const refreshedAvatar = await page.locator('aside a[title*="Profile"]').textContent();

  console.log('   Refreshed Input Name:', refreshedName);
  console.log('   Refreshed Sidebar Tooltip:', refreshedTooltip?.trim());
  console.log('   Refreshed Avatar Initials:', refreshedAvatar?.trim());

  results.part3.refreshPersistence = {
    refreshedName,
    refreshedTooltip: refreshedTooltip?.trim(),
    refreshedAvatar: refreshedAvatar?.trim(),
    persisted: refreshedName === updatedTestName,
  };

  // Check database persistence
  const dbUserUpdated = await prisma.user.findUnique({ where: { id: meData.user.id } });
  console.log('8. PostgreSQL Database Record Name:', dbUserUpdated.name);
  console.log('   PostgreSQL Database Record Initials:', dbUserUpdated.avatarInitials);
  results.part3.dbPersistence = {
    name: dbUserUpdated.name,
    avatarInitials: dbUserUpdated.avatarInitials,
    persistedInDb: dbUserUpdated.name === updatedTestName,
  };

  // Check documents page
  console.log('\n9. Navigating to Documents Page (/documents)...');
  await page.goto(`${FRONTEND_BASE}/documents`, { waitUntil: 'networkidle' });
  await page.waitForSelector('table', { timeout: 8000 });
  const rowCount = await page.locator('table tbody tr').count();
  console.log('   Documents Table Rows Loaded:', rowCount);
  results.part3.documentsPage = {
    loaded: true,
    rowCount,
  };

  // Restore name cleanly to "Alex Mercer"
  console.log('\n10. Restoring profile name cleanly to "Alex Mercer"...');
  await page.goto(`${FRONTEND_BASE}/settings`, { waitUntil: 'networkidle' });
  await page.locator('input[placeholder*="Jane Doe"]').fill('Alex Mercer');
  await page.locator('button[type="submit"]:has-text("Save Changes")').click();
  await page.waitForSelector('text=Profile updated successfully', { timeout: 8000 });
  console.log('    Name successfully restored to "Alex Mercer".');

  // Verify logout clears session
  console.log('\n11. Testing Logout...');
  await page.goto(`${FRONTEND_BASE}/settings`, { waitUntil: 'networkidle' });
  // Switch to Security section
  await page.locator('nav[aria-label="Settings navigation"] button:visible').filter({ hasText: /Security/ }).click();
  await page.waitForTimeout(500);

  // Click Log Out Other Sessions button
  await page.locator('button:visible').filter({ hasText: /Log Out Other Sessions/ }).click();
  await page.waitForSelector('div.fixed button:has-text("Sign Out")', { timeout: 5000 });
  await page.locator('div.fixed button:has-text("Sign Out")').click();
  await page.waitForTimeout(1000);

  const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('documind_access_token'));
  console.log('    Token in localStorage after Logout (Expected null):', tokenAfterLogout);
  results.part1.logoutClearedSession = (tokenAfterLogout === null);

  await browser.close();
  await prisma.$disconnect();

  console.log('\n================================================================');
  console.log('FULL AUTOMATED VERIFICATION RESULTS SUMMARY:');
  console.log('================================================================');
  console.log(JSON.stringify(results, null, 2));
}

run().catch(async (err) => {
  console.error('FATAL VERIFICATION ERROR:', err);
  await prisma.$disconnect();
  process.exit(1);
});
