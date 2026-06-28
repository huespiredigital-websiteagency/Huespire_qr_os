const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const axios = require("axios");

const API_URL = "http://localhost:5000";
const TOKEN_REST_B = "c22064998cf35675d02e899ada2e388c"; // Restaurant B, Table 112
const TOKEN_REST_C = "6c37b7e10416209b71539d484e55a415"; // Restaurant C, Table 16

async function runTests() {
  console.log("=== STARTING TABLE SESSION INTEGRATION TESTS ===");

  try {
    // Clean up any existing open sessions for the test tables to start fresh
    const qrB = await prisma.qRCode.findUnique({
      where: { qrToken: TOKEN_REST_B },
    });
    if (qrB) {
      await prisma.tableSession.updateMany({
        where: { tableId: qrB.tableId, status: "OPEN" },
        data: { status: "CLOSED", closedAt: new Date() }
      });
      console.log("🧹 Cleaned up existing open sessions for Restaurant B table.");
    }

    // Get a menu item for Restaurant B
    const menuRes = await axios.get(`${API_URL}/customer/menu?token=${TOKEN_REST_B}`);
    const menuData = menuRes.data.data;
    if (!menuData || menuData.categories.length === 0) {
      throw new Error("No menu categories found. Please seed the DB first.");
    }
    const itemB = menuData.categories[0].menuItems[0];
    const priceB = Number(itemB.price);

    console.log(`Using menu item "${itemB.name}" (Price: ${priceB})`);

    // --- TEST 1: First customer scans and places an order ---
    console.log("\n--- TEST 1: Placing first order (should create new open session) ---");
    const order1Res = await axios.post(
      `${API_URL}/customer/orders?token=${TOKEN_REST_B}`,
      {
        customerName: "Alice",
        customerPhone: "+1111111111",
        items: [{ menuItemId: itemB.id, quantity: 1 }]
      }
    );

    const order1 = order1Res.data.data;
    console.log(`✅ Order 1 Placed: ${order1.orderNumber}`);
    console.log(`Session ID: ${order1.sessionId}`);
    console.log(`Session Number: ${order1.session?.sessionNumber}`);
    console.log(`Session Status: ${order1.session?.status}`);
    console.log(`Session Total Amount: ${order1.session?.totalAmount}`);

    if (!order1.sessionId || order1.session?.status !== "OPEN") {
      throw new Error("Order 1 failed to create an OPEN table session.");
    }

    const firstSessionId = order1.sessionId;

    // --- TEST 2: Second customer (different phone/details) places an order on the same table ---
    console.log("\n--- TEST 2: Placing second order (should reuse same open session) ---");
    const order2Res = await axios.post(
      `${API_URL}/customer/orders?token=${TOKEN_REST_B}`,
      {
        customerName: "Bob",
        customerPhone: "+2222222222",
        items: [{ menuItemId: itemB.id, quantity: 2 }]
      }
    );

    const order2 = order2Res.data.data;
    console.log(`✅ Order 2 Placed: ${order2.orderNumber}`);
    console.log(`Session ID: ${order2.sessionId}`);
    console.log(`Session Number: ${order2.session?.sessionNumber}`);

    if (order2.sessionId !== firstSessionId) {
      throw new Error("Order 2 created a new session instead of reusing the active open one.");
    }
    console.log("✅ Verified: Order 2 correctly reused the same session!");

    // --- TEST 3: Validate bill consolidation on the TableSession ---
    console.log("\n--- TEST 3: Validating bill consolidation ---");
    const sessionDetails = await prisma.tableSession.findUnique({
      where: { id: firstSessionId },
      include: { orders: true }
    });

    const expectedTotal = priceB * 1 + priceB * 2; // Order 1 (1 qty) + Order 2 (2 qty)
    const sessionTotal = Number(sessionDetails.totalAmount);
    console.log(`Orders in session: ${sessionDetails.orders.length}`);
    console.log(`Expected combined bill: ${expectedTotal}`);
    console.log(`Actual session consolidated bill: ${sessionTotal}`);

    if (sessionTotal !== expectedTotal) {
      throw new Error(`Consolidated total mismatch. Expected ${expectedTotal}, got ${sessionTotal}`);
    }
    console.log("✅ Verified: Combined bill consolidated correctly!");

    // --- TEST 4: Closing the session and placing a new order ---
    console.log("\n--- TEST 4: Closing session and starting a new one ---");
    await prisma.tableSession.update({
      where: { id: firstSessionId },
      data: { status: "CLOSED", closedAt: new Date() }
    });
    console.log("✅ Session CLOSED by cashier simulation.");

    const order3Res = await axios.post(
      `${API_URL}/customer/orders?token=${TOKEN_REST_B}`,
      {
        customerName: "Charlie",
        customerPhone: "+3333333333",
        items: [{ menuItemId: itemB.id, quantity: 1 }]
      }
    );

    const order3 = order3Res.data.data;
    console.log(`✅ Order 3 Placed: ${order3.orderNumber}`);
    console.log(`New Session ID: ${order3.sessionId}`);
    console.log(`New Session Number: ${order3.session?.sessionNumber}`);

    if (order3.sessionId === firstSessionId) {
      throw new Error("Order 3 reused the closed session instead of creating a new one.");
    }
    console.log("✅ Verified: Successfully created a new session after closing the previous one!");

    // --- TEST 5: Multi-Tenant Security Isolation ---
    console.log("\n--- TEST 5: Verifying Multi-Tenant Isolation ---");
    // Verify Restaurant C scans don't merge into Restaurant B sessions
    const qrC = await prisma.qRCode.findUnique({
      where: { qrToken: TOKEN_REST_C },
    });
    if (qrC) {
      await prisma.tableSession.updateMany({
        where: { tableId: qrC.tableId, status: "OPEN" },
        data: { status: "CLOSED", closedAt: new Date() }
      });
    }

    const menuCRes = await axios.get(`${API_URL}/customer/menu?token=${TOKEN_REST_C}`);
    const menuCData = menuCRes.data.data;
    const itemC = menuCData.categories[0].menuItems[0];

    const orderCRes = await axios.post(
      `${API_URL}/customer/orders?token=${TOKEN_REST_C}`,
      {
        customerName: "Dave",
        customerPhone: "+4444444444",
        items: [{ menuItemId: itemC.id, quantity: 1 }]
      }
    );

    const orderC = orderCRes.data.data;
    console.log(`Restaurant C Order Placed: ${orderC.orderNumber}`);
    console.log(`Restaurant C Session ID: ${orderC.sessionId}`);

    if (orderC.sessionId === order3.sessionId) {
      throw new Error("Restaurant C order joined Restaurant B's active table session!");
    }
    console.log("✅ Verified: Restaurant C session is isolated from Restaurant B session.");

    console.log("\n🎉 ALL TABLE SESSION INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉");

  } catch (e) {
    console.error("❌ Test suite failed:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
