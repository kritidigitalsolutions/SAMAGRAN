import app from "../backend/app.js";

// Force Express to initialize the router stack
if (!app._router) {
  app.use(() => {}); // This triggers router creation if not already created
}

function printRoutes(stack, prefix = "") {
  stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(", ").toUpperCase();
      console.log(`${methods} ${prefix}${layer.route.path}`);
    } else if (layer.name === "router" && layer.handle.stack) {
      let newPrefix = prefix;
      if (layer.regexp) {
        // Simple extraction of path prefix from regexp
        const match = layer.regexp.toString().match(/^\/\^\\(\/[a-zA-Z0-9_-]+)/);
        if (match) {
          newPrefix += match[1];
        }
      }
      printRoutes(layer.handle.stack, newPrefix);
    }
  });
}

console.log("Registered routes:");
printRoutes(app._router.stack);
