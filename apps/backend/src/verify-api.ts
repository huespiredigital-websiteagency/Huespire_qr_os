async function runTests() {
  const BASE_URL = 'http://localhost:5000';
  console.log('Starting verification tests for Phase 2 APIs...');

  let ownerToken = '';
  let superAdminToken = '';
  let restaurantId = '';
  let starterPlanId = '';
  let growthPlanId = '';
  let testBranchId = '';
  let testStaffId = '';

  // Helper function for fetch requests
  async function apiCall(path: string, method: string, body?: any, token?: string, host?: string): Promise<{ status: number; data: any }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (host) {
      headers['Host'] = host;
    }
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const status = response.status;
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }
    return { status, data };
  }

  // 1. Fetch plans (Public)
  console.log('\n--- Test 1: GET /plans (Public) ---');
  const plansRes = await apiCall('/plans', 'GET');
  console.log('Status:', plansRes.status);
  console.log('Body:', JSON.stringify(plansRes.data, null, 2));
  if (plansRes.status !== 200 || !Array.isArray(plansRes.data)) {
    throw new Error('GET /plans failed');
  }
  const plans = plansRes.data;
  const starterPlan = plans.find((p: any) => p.code === 'STARTER');
  const growthPlan = plans.find((p: any) => p.code === 'GROWTH');
  if (!starterPlan || !growthPlan) {
    throw new Error('STARTER or GROWTH plan not found in plan list');
  }
  starterPlanId = starterPlan.id;
  growthPlanId = growthPlan.id;
  console.log(`Starter Plan ID: ${starterPlanId}, Growth Plan ID: ${growthPlanId}`);

  // 2. Clean up test users/restaurants to allow re-runs
  // We can login as Super Admin using admin@restaurantos.com (password: SuperAdmin@2026)
  console.log('\n--- Test 2: Login as Super Admin ---');
  const adminLogin = await apiCall('/auth/login', 'POST', {
    email: 'admin@restaurantos.com',
    password: 'SuperAdmin@2026',
  });
  console.log('Status:', adminLogin.status);
  if (adminLogin.status === 200 && adminLogin.data.success) {
    superAdminToken = adminLogin.data.data.accessToken;
    console.log('Super Admin logged in successfully.');
  } else {
    console.warn('Super Admin login failed. Seed might be missing or user credentials differ.');
  }

  // 3. Register a new Owner & Restaurant
  console.log('\n--- Test 3: POST /auth/register (Public) ---');
  const testEmail = `tester-${Date.now()}@example.com`;
  const registerRes = await apiCall('/auth/register', 'POST', {
    name: 'John Tester',
    email: testEmail,
    password: 'Password123!',
  });
  console.log('Status:', registerRes.status);
  console.log('Body:', JSON.stringify(registerRes.data, null, 2));
  if (registerRes.status !== 201 || !registerRes.data.success) {
    throw new Error('Registration failed');
  }
  restaurantId = registerRes.data.data.restaurant.id;
  const subdomain = registerRes.data.data.restaurant.subdomain;
  console.log(`Registered Restaurant ID: ${restaurantId}, Subdomain: ${subdomain}`);

  // 4. Login as Owner
  console.log('\n--- Test 4: POST /auth/login (Public) ---');
  const loginRes = await apiCall('/auth/login', 'POST', {
    email: testEmail,
    password: 'Password123!',
  });
  console.log('Status:', loginRes.status);
  if (loginRes.status !== 200 || !loginRes.data.success) {
    throw new Error('Login failed');
  }
  ownerToken = loginRes.data.data.accessToken;
  console.log('Logged in successfully. Token acquired.');

  // 5. List available operational roles
  console.log('\n--- Test 5: GET /roles (Authenticated) ---');
  const rolesRes = await apiCall('/roles', 'GET', undefined, ownerToken);
  console.log('Status:', rolesRes.status);
  console.log('Body:', JSON.stringify(rolesRes.data, null, 2));
  if (rolesRes.status !== 200 || !rolesRes.data.success) {
    throw new Error('GET /roles failed');
  }

  // 6. Get Subscription Details
  console.log('\n--- Test 6: GET /subscriptions/me (Tenant Context) ---');
  const subRes = await apiCall('/subscriptions/me', 'GET', undefined, ownerToken, `${subdomain}.localhost`);
  console.log('Status:', subRes.status);
  console.log('Body:', JSON.stringify(subRes.data, null, 2));
  if (subRes.status !== 200 || !subRes.data.success) {
    throw new Error('GET /subscriptions/me failed');
  }
  if (subRes.data.data.planId !== starterPlanId) {
    throw new Error('Initial subscription should be on STARTER plan');
  }

  // 7. Get Restaurant Settings
  console.log('\n--- Test 7: GET /restaurants/me ---');
  const restGetRes = await apiCall('/restaurants/me', 'GET', undefined, ownerToken, `${subdomain}.localhost`);
  console.log('Status:', restGetRes.status);
  console.log('Body:', JSON.stringify(restGetRes.data, null, 2));
  if (restGetRes.status !== 200 || !restGetRes.data.success) {
    throw new Error('GET /restaurants/me failed');
  }

  // 8. Update Restaurant Settings
  console.log('\n--- Test 8: PATCH /restaurants/me ---');
  const restPatchRes = await apiCall('/restaurants/me', 'PATCH', {
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    taxPercentage: 12.5,
  }, ownerToken, `${subdomain}.localhost`);
  console.log('Status:', restPatchRes.status);
  console.log('Body:', JSON.stringify(restPatchRes.data, null, 2));
  if (restPatchRes.status !== 200 || !restPatchRes.data.success) {
    throw new Error('PATCH /restaurants/me failed');
  }
  if (Number(restPatchRes.data.data.settings.taxPercentage) !== 12.5) {
    throw new Error('taxPercentage was not updated correctly');
  }

  // 9. List Branches
  console.log('\n--- Test 9: GET /branches ---');
  const branchesGetRes = await apiCall('/branches', 'GET', undefined, ownerToken, `${subdomain}.localhost`);
  console.log('Status:', branchesGetRes.status);
  console.log('Body:', JSON.stringify(branchesGetRes.data, null, 2));
  if (branchesGetRes.status !== 200 || !branchesGetRes.data.success) {
    throw new Error('GET /branches failed');
  }

  // 10. Create Branch (Within limit - Starter maxBranches: 1)
  console.log('\n--- Test 10: POST /branches (Create first branch - main branch) ---');
  const initialBranchesCount = branchesGetRes.data.data.length;
  console.log('Initial branches count:', initialBranchesCount);

  let branchCreateRes;
  if (initialBranchesCount === 0) {
    branchCreateRes = await apiCall('/branches', 'POST', {
      name: 'Main Street Branch',
      code: 'MAIN-ST',
      address: '123 Main Street',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      openingTime: '08:00',
      closingTime: '22:00',
    }, ownerToken, `${subdomain}.localhost`);
    console.log('Status:', branchCreateRes.status);
    console.log('Body:', JSON.stringify(branchCreateRes.data, null, 2));
    if (branchCreateRes.status !== 201 || !branchCreateRes.data.success) {
      throw new Error('Creating first branch failed');
    }
  }

  // 11. Create a second branch (Should hit Starter plan limit: maxBranches = 1)
  console.log('\n--- Test 11: POST /branches (Exceed limit) ---');
  const branchLimitRes = await apiCall('/branches', 'POST', {
    name: 'Second Branch',
    code: 'SEC-BR',
    address: '456 Second Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    openingTime: '09:00',
    closingTime: '23:00',
  }, ownerToken, `${subdomain}.localhost`);
  console.log('Status (Expect 403):', branchLimitRes.status);
  console.log('Body:', JSON.stringify(branchLimitRes.data, null, 2));
  if (branchLimitRes.status !== 403) {
    throw new Error('Expected 403 Forbidden due to quota limit');
  }

  // 12. Upgrade Subscription
  console.log('\n--- Test 12: POST /subscriptions/upgrade ---');
  const upgradeRes = await apiCall('/subscriptions/upgrade', 'POST', {
    planId: growthPlanId,
  }, ownerToken, `${subdomain}.localhost`);
  console.log('Status:', upgradeRes.status);
  console.log('Body:', JSON.stringify(upgradeRes.data, null, 2));
  if ((upgradeRes.status !== 200 && upgradeRes.status !== 201) || !upgradeRes.data.success) {
    throw new Error('Upgrade subscription failed');
  }
  if (upgradeRes.data.data.planId !== growthPlanId) {
    throw new Error('Upgrade planId mismatch');
  }

  // 13. Create second branch now (Should succeed after upgrade - Growth maxBranches: 3)
  console.log('\n--- Test 13: POST /branches (Create second branch after upgrade) ---');
  const branchSecondRes = await apiCall('/branches', 'POST', {
    name: 'Second Branch',
    code: 'SEC-BR',
    address: '456 Second Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    openingTime: '09:00',
    closingTime: '23:00',
  }, ownerToken, `${subdomain}.localhost`);
  console.log('Status:', branchSecondRes.status);
  console.log('Body:', JSON.stringify(branchSecondRes.data, null, 2));
  if (branchSecondRes.status !== 201 || !branchSecondRes.data.success) {
    throw new Error('Creating second branch after upgrade failed');
  }
  testBranchId = branchSecondRes.data.data.id;

  // 14. Update Branch
  console.log('\n--- Test 14: PATCH /branches/:id ---');
  const branchPatchRes = await apiCall(`/branches/${testBranchId}`, 'PATCH', {
    phone: '+919999988888',
  }, ownerToken, `${subdomain}.localhost`);
  console.log('Status:', branchPatchRes.status);
  console.log('Body:', JSON.stringify(branchPatchRes.data, null, 2));
  if (branchPatchRes.status !== 200 || !branchPatchRes.data.success) {
    throw new Error('Updating branch failed');
  }
  if (branchPatchRes.data.data.phone !== '+919999988888') {
    throw new Error('Branch phone was not updated');
  }

  // 15. Onboard/Invite Staff
  console.log('\n--- Test 15: POST /staff/invite ---');
  const staffEmail = `staff-${Date.now()}@example.com`;
  const staffInviteRes = await apiCall('/staff/invite', 'POST', {
    firstName: 'Jane',
    lastName: 'Staffer',
    email: staffEmail,
    phone: '+919876543210',
    roleCode: 'MANAGER',
  }, ownerToken, `${subdomain}.localhost`);
  console.log('Status:', staffInviteRes.status);
  console.log('Body:', JSON.stringify(staffInviteRes.data, null, 2));
  if (staffInviteRes.status !== 201 || !staffInviteRes.data.success) {
    throw new Error('Inviting staff failed');
  }
  testStaffId = staffInviteRes.data.data.id;

  // 16. Get Staff List
  console.log('\n--- Test 16: GET /staff ---');
  const staffGetRes = await apiCall('/staff', 'GET', undefined, ownerToken, `${subdomain}.localhost`);
  console.log('Status:', staffGetRes.status);
  console.log('Body:', JSON.stringify(staffGetRes.data, null, 2));
  if (staffGetRes.status !== 200 || !staffGetRes.data.success) {
    throw new Error('GET /staff failed');
  }

  // 17. Modify Staff Configurations
  console.log('\n--- Test 17: PATCH /staff/:id ---');
  const staffPatchRes = await apiCall(`/staff/${testStaffId}`, 'PATCH', {
    firstName: 'Jane Updated',
    roleCode: 'CASHIER',
  }, ownerToken, `${subdomain}.localhost`);
  console.log('Status:', staffPatchRes.status);
  console.log('Body:', JSON.stringify(staffPatchRes.data, null, 2));
  if (staffPatchRes.status !== 200 || !staffPatchRes.data.success) {
    throw new Error('Updating staff configurations failed');
  }
  if (staffPatchRes.data.data.role !== 'CASHIER' || staffPatchRes.data.data.firstName !== 'Jane Updated') {
    throw new Error('Staff update values mismatch');
  }

  // 18. Soft Delete Staff
  console.log('\n--- Test 18: DELETE /staff/:id ---');
  const staffDeleteRes = await apiCall(`/staff/${testStaffId}`, 'DELETE', undefined, ownerToken, `${subdomain}.localhost`);
  console.log('Status:', staffDeleteRes.status);
  console.log('Body:', JSON.stringify(staffDeleteRes.data, null, 2));
  if (staffDeleteRes.status !== 200 || !staffDeleteRes.data.success) {
    throw new Error('Deleting staff failed');
  }

  // 19. Soft Delete Branch
  console.log('\n--- Test 19: DELETE /branches/:id ---');
  const branchDeleteRes = await apiCall(`/branches/${testBranchId}`, 'DELETE', undefined, ownerToken, `${subdomain}.localhost`);
  console.log('Status:', branchDeleteRes.status);
  console.log('Body:', JSON.stringify(branchDeleteRes.data, null, 2));
  if (branchDeleteRes.status !== 200 || !branchDeleteRes.data.success) {
    throw new Error('Deleting branch failed');
  }

  console.log('\n=======================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY! ✅');
  console.log('=======================================');
}

runTests().catch((error) => {
  console.error('\n=======================================');
  console.error('TEST FAILED ❌');
  console.error(error);
  console.error('=======================================');
  process.exit(1);
});
