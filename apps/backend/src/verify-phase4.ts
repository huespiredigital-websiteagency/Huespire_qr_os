import fetch from "node-fetch";

async function runTests() {
  const BASE_URL = "http://localhost:5000";
  console.log("Starting verification tests for Phase 4 (Tables & QR)...");

  let ownerToken = "";
  let restaurantId = "";
  let branchId = "";
  let tableId = "";
  let table1Token = "";

  async function apiCall(
    path: string, 
    method: string, 
    body?: any, 
    token?: string
  ): Promise<{ status: number; data: any; headers: any }> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${method === "GET" && body ? `${path}?${new URLSearchParams(body).toString()}` : path}`, {
      method,
      headers,
      body: method !== "GET" && body ? JSON.stringify(body) : undefined,
    });
    const status = response.status;
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }
    return { status, data, headers: response.headers };
  }

  // 1. Register a new Owner & Restaurant
  console.log("\n--- Test 1: Register New Owner & Restaurant ---");
  const testEmail = `tester-p4-${Date.now()}@example.com`;
  const registerRes = await apiCall("/auth/register", "POST", {
    name: "John Table Tester",
    email: testEmail,
    password: "Password123!",
  });
  console.log("Status:", registerRes.status);
  if (registerRes.status !== 201) {
    throw new Error("Registration failed");
  }
  restaurantId = registerRes.data.data.restaurant.id;
  console.log("Restaurant Registered ID:", restaurantId);

  // 2. Login as Owner
  console.log("\n--- Test 2: Login as Owner ---");
  const loginRes = await apiCall("/auth/login", "POST", {
    email: testEmail,
    password: "Password123!",
  });
  ownerToken = loginRes.data.data.accessToken;
  console.log("Logged in. Token acquired.");

  // 3. Create a Branch
  console.log("\n--- Test 3: Create Branch ---");
  const branchRes = await apiCall("/branches", "POST", {
    name: "Main Dining",
    code: "MAIN",
    address: "123 Main Street",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    openingTime: "09:00",
    closingTime: "22:00",
  }, ownerToken);
  console.log("Status:", branchRes.status);
  if (branchRes.status !== 201) {
    throw new Error("Branch creation failed");
  }
  branchId = branchRes.data.data.id;
  console.log("Branch ID:", branchId);

  // 4. Create Tables and Verify QR Code Generation
  console.log("\n--- Test 4: Create Table 1 ---");
  const table1Res = await apiCall("/tables", "POST", {
    tableName: "Table 1",
    tableNumber: 1,
    branchId: branchId,
    seatingCapacity: 4,
    notes: "Window side",
  }, ownerToken);
  console.log("Status:", table1Res.status);
  console.log("Body:", JSON.stringify(table1Res.data, null, 2));
  if (table1Res.status !== 201 && table1Res.status !== 200) {
    throw new Error("Table creation failed");
  }
  tableId = table1Res.data.data.id;
  table1Token = table1Res.data.data.qrCode.qrToken;
  console.log(`Table Created ID: ${tableId}, QR Token: ${table1Token}`);

  // 5. Verify validation: Duplicate table number within the same branch
  console.log("\n--- Test 5: Create Duplicate Table Number (Expect 409) ---");
  const duplicateRes = await apiCall("/tables", "POST", {
    tableName: "Table 1 Dup",
    tableNumber: 1,
    branchId: branchId,
  }, ownerToken);
  console.log("Status (Expect 409):", duplicateRes.status);
  if (duplicateRes.status !== 409) {
    throw new Error("Expected 409 for duplicate table number, got " + duplicateRes.status);
  }

  // 6. Verify table subscription quota (Starter has max 20 tables)
  console.log("\n--- Test 6: Exceeding Subscription Limit (Starter: 20 max) ---");
  console.log("Creating tables 2 through 20 in a loop...");
  for (let num = 2; num <= 20; num++) {
    const res = await apiCall("/tables", "POST", {
      tableName: `Table ${num}`,
      tableNumber: num,
      branchId: branchId,
    }, ownerToken);
    if (res.status !== 201 && res.status !== 200) {
      throw new Error(`Failed to create table ${num}, status: ${res.status}`);
    }
  }

  console.log("Attempting to create Table 21 (Expect 403)...");
  const table21Res = await apiCall("/tables", "POST", {
    tableName: "Table 21",
    tableNumber: 21,
    branchId: branchId,
  }, ownerToken);
  console.log("Status (Expect 403):", table21Res.status);
  if (table21Res.status !== 403) {
    throw new Error("Expected 403 for table limit quota, got " + table21Res.status);
  }

  // 7. Verify QR scan validation (Public)
  console.log("\n--- Test 7: Public QR Validation ---");
  const valRes = await apiCall(`/qr/validate/${table1Token}`, "GET");
  console.log("Status:", valRes.status);
  console.log("Body:", JSON.stringify(valRes.data, null, 2));
  if (valRes.status !== 200 || !valRes.data.success) {
    throw new Error("QR token validation failed");
  }

  // 8. Verify QR code image rendering (Public)
  console.log("\n--- Test 8: Public QR Image Rendering (PNG) ---");
  const response = await fetch(`${BASE_URL}/qr/image/${table1Token}?format=png`);
  console.log("Status:", response.status);
  console.log("Content-Type:", response.headers.get("content-type"));
  if (response.status !== 200 || response.headers.get("content-type") !== "image/png") {
    throw new Error("QR image retrieval failed");
  }

  // 9. Verify QR token regeneration
  console.log("\n--- Test 9: Regenerate QR Token ---");
  const regenRes = await apiCall("/qr/regenerate", "POST", {
    tableId: tableId,
  }, ownerToken);
  console.log("Status:", regenRes.status);
  const newTable1Token = regenRes.data.data.qrToken;
  console.log(`Old Token: ${table1Token}, New Token: ${newTable1Token}`);
  if (table1Token === newTable1Token) {
    throw new Error("Token did not change after regeneration");
  }

  console.log("Validating old token (Expect 404)...");
  const oldValRes = await apiCall(`/qr/validate/${table1Token}`, "GET");
  console.log("Status (Expect 404):", oldValRes.status);
  if (oldValRes.status !== 404) {
    throw new Error("Expected old token to be invalid, got " + oldValRes.status);
  }

  console.log("Validating new token (Expect 200)...");
  const newValRes = await apiCall(`/qr/validate/${newTable1Token}`, "GET");
  console.log("Status:", newValRes.status);
  if (newValRes.status !== 200) {
    throw new Error("New token validation failed");
  }

  // 10. Update table status
  console.log("\n--- Test 10: Update Table Status ---");
  const updateRes = await apiCall(`/tables/${tableId}`, "PATCH", {
    status: "OCCUPIED",
  }, ownerToken);
  console.log("Status:", updateRes.status);
  console.log("New Status:", updateRes.data.data.status);
  if (updateRes.status !== 200 || updateRes.data.data.status !== "OCCUPIED") {
    throw new Error("Table status update failed");
  }

  // 11. Soft delete Table
  console.log("\n--- Test 11: Soft Delete Table ---");
  const deleteRes = await apiCall(`/tables/${tableId}`, "DELETE", undefined, ownerToken);
  console.log("Status:", deleteRes.status);
  if (deleteRes.status !== 200) {
    throw new Error("Table deletion failed");
  }

  console.log("Validating deleted table's QR token (Expect 400/404)...");
  const deletedValRes = await apiCall(`/qr/validate/${newTable1Token}`, "GET");
  console.log("Status (Expect 400/404):", deletedValRes.status);
  if (deletedValRes.status !== 400 && deletedValRes.status !== 404) {
    throw new Error("Expected validation to fail for deleted table");
  }

  console.log("\n=======================================");
  console.log("ALL PHASE 4 BACKEND TESTS PASSED SUCCESS! ✅");
  console.log("=======================================");
}

runTests().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
