const axios = require("axios");

const API_URL = "http://localhost:5000";
const TOKEN_REST_B = "c22064998cf35675d02e899ada2e388c"; // Restaurant B, Table 112
const TOKEN_REST_C = "6c37b7e10416209b71539d484e55a415"; // Restaurant C, Table 16
const INVALID_TOKEN = "invalid_token_xyz_123";

async function runTests() {
  console.log("=== STARTING CUSTOMER FLOW API TESTS ===");

  // 1. QR Validation
  console.log("\n1. Testing QR Validation...");
  try {
    const qrRes = await axios.get(`${API_URL}/qr/validate/${TOKEN_REST_B}`);
    console.log("✅ QR validation success:", qrRes.data.success);
    console.log(`Restaurant: ${qrRes.data.data.restaurantName}, Table: ${qrRes.data.data.tableNumber}`);
  } catch (e) {
    console.error("❌ QR validation failed:", e.message);
  }

  // 2. Invalid QR Code Validation
  console.log("\n2. Testing Invalid QR Code Validation...");
  try {
    await axios.get(`${API_URL}/qr/validate/${INVALID_TOKEN}`);
    console.error("❌ Invalid QR validation allowed an invalid token!");
  } catch (e) {
    console.log("✅ Invalid QR correctly rejected:", e.response?.data?.message || e.message);
  }

  // 3. Get Menu Scoped by Token
  console.log("\n3. Testing Digital Menu Retrieval...");
  let menuData = null;
  try {
    const menuRes = await axios.get(`${API_URL}/customer/menu`, { params: { token: TOKEN_REST_B } });
    console.log("✅ Menu retrieval success:", menuRes.data.success);
    menuData = menuRes.data.data;
    console.log(`Categories found: ${menuData.categories.length}`);
    console.log(`Addons found: ${menuData.addons.length}`);
  } catch (e) {
    console.error("❌ Menu retrieval failed:", e.response?.data?.message || e.message);
  }

  if (!menuData || menuData.categories.length === 0) {
    console.log("⚠️ No categories found. Cannot test cart validation and order creation.");
    return;
  }

  // Find a menu item to add to cart
  let targetItem = null;
  for (const cat of menuData.categories) {
    if (cat.menuItems && cat.menuItems.length > 0) {
      targetItem = cat.menuItems[0];
      break;
    }
  }

  if (!targetItem) {
    console.log("⚠️ No active menu items found. Skipping cart validation and order placement.");
    return;
  }

  console.log(`Found target item for order: "${targetItem.name}" (ID: ${targetItem.id}, Price: ${targetItem.price})`);

  // Pick variant if any
  const variantId = targetItem.variants && targetItem.variants.length > 0 ? targetItem.variants[0].id : null;
  const addonIds = menuData.addons && menuData.addons.length > 0 ? [menuData.addons[0].id] : [];

  console.log(`Selected variantId: ${variantId}, addonIds: ${JSON.stringify(addonIds)}`);

  // 4. Cart Validation
  console.log("\n4. Testing Cart Validation (Server-side price checking)...");
  let validationResult = null;
  try {
    const cartRes = await axios.post(
      `${API_URL}/customer/cart/validate?token=${TOKEN_REST_B}`,
      {
        items: [
          {
            menuItemId: targetItem.id,
            quantity: 2,
            variantId,
            addonIds
          }
        ]
      }
    );
    validationResult = cartRes.data.data;
    console.log("✅ Cart validation success:", cartRes.data.success);
    console.log("Calculated Subtotal:", validationResult.subtotal);
    console.log("Calculated Tax:", validationResult.tax);
    console.log("Calculated Grand Total:", validationResult.grandTotal);
  } catch (e) {
    console.error("❌ Cart validation failed:", e.response?.data?.message || e.message);
  }

  // 5. Order Creation
  console.log("\n5. Testing Order Creation...");
  let createdOrder = null;
  try {
    const orderRes = await axios.post(
      `${API_URL}/customer/orders?token=${TOKEN_REST_B}`,
      {
        customerName: "Test Customer John",
        customerPhone: "+1234567890",
        notes: "No onions, make it fast!",
        items: [
          {
            menuItemId: targetItem.id,
            quantity: 2,
            variantId,
            addonIds
          }
        ]
      }
    );
    createdOrder = orderRes.data.data;
    console.log("✅ Order creation success:", orderRes.data.success);
    console.log(`Order Number: ${createdOrder.orderNumber}`);
    console.log(`Initial Status: ${createdOrder.orderStatus}`);
  } catch (e) {
    console.error("❌ Order creation failed:", e.response?.data?.message || e.message);
  }

  if (!createdOrder) {
    return;
  }

  // 6. Order Status Tracking
  console.log("\n6. Testing Order Tracking & Status...");
  try {
    const trackRes = await axios.get(`${API_URL}/customer/orders/${createdOrder.id}`);
    console.log("✅ Full order details retrieval success:", trackRes.data.success);
    console.log("Tracked status:", trackRes.data.data.orderStatus);

    const statusOnlyRes = await axios.get(`${API_URL}/customer/orders/${createdOrder.id}/status`);
    console.log("✅ Status-only endpoint success:", statusOnlyRes.data.success);
    console.log("Status-only response:", statusOnlyRes.data.data);
  } catch (e) {
    console.error("❌ Order tracking failed:", e.response?.data?.message || e.message);
  }

  // 7. Multi-Tenant Isolation Verification
  console.log("\n7. Testing Multi-Tenant Isolation (Restaurant C item on Restaurant B QR)...");
  // Get an item from Restaurant C's menu first
  let restCMenu = null;
  try {
    const menuRes = await axios.get(`${API_URL}/customer/menu`, { params: { token: TOKEN_REST_C } });
    restCMenu = menuRes.data.data;
  } catch (e) {
    console.error("Failed to load Restaurant C menu for isolation test:", e.message);
  }

  let restCItem = null;
  if (restCMenu) {
    for (const cat of restCMenu.categories) {
      if (cat.menuItems && cat.menuItems.length > 0) {
        restCItem = cat.menuItems[0];
        break;
      }
    }
  }

  if (restCItem) {
    console.log(`Attempting to place an order for Restaurant C's item "${restCItem.name}" using Restaurant B's QR token...`);
    try {
      await axios.post(
        `${API_URL}/customer/orders?token=${TOKEN_REST_B}`,
        {
          customerName: "Imposter Customer",
          items: [
            {
              menuItemId: restCItem.id,
              quantity: 1
            }
          ]
        }
      );
      console.error("❌ SECURITY FAILURE: Allowed order placement of another restaurant's menu item!");
    } catch (e) {
      console.log("✅ SECURITY SUCCESS: Correctly blocked foreign restaurant item:", e.response?.data?.message || e.message);
    }
  } else {
    console.log("⚠️ No item found for Restaurant C. Skipping cross-tenant test.");
  }

  console.log("\n=== COMPLETED CUSTOMER FLOW API TESTS ===");
}

runTests();
