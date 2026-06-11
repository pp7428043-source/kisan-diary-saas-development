import { db } from "./src/db";
import { users } from "./src/db/schema";

async function run() {
  try {
    const password = "password123";
    
    // Testing Web Crypto API availability
    if (typeof crypto === 'undefined' || !crypto.subtle) {
        console.log("Web Crypto API not available globally!");
    } else {
        console.log("Web Crypto API is available");
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    console.log("Hash created:", passwordHash);
    
    console.log("Testing DB insertion...");
    const [newUser] = await db
      .insert(users)
      .values({
        username: "testuser_piyush",
        passwordHash,
        name: "Test User",
        state: "Madhya Pradesh",
        language: "hi",
        phone: "usr_testuser_piyush", // This is 19 chars long! "usr_" + 15 chars. Wait... "usr_testuser_piyush" is 19 characters.
      })
      .returning();
      
    console.log("Inserted user:", newUser);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
run();
