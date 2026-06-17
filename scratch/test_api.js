async function test() {
  try {
    const res = await fetch("http://localhost:8000/api/admin/corporate-details", {
      headers: {
        Authorization: "Bearer invalid_token"
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response text:", text);
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

test();
