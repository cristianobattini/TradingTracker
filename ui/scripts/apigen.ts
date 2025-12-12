import { createClient } from "@hey-api/openapi-ts";

try {
  await createClient({
    input: "http://localhost:8000/openapi.json",
    output: "./src/client",
  });
} catch (e) {
  console.error("Error generating API client", e);
}