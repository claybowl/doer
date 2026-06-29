import { createLocalAgentJwt } from "../src/agent-auth-jwt.js";

const token = createLocalAgentJwt(
  "98d5eca0-efc7-4d8f-8877-226452bd5fdb",
  "ba1dcf35-9204-4273-97ad-2791577351cb",
  "claude_local",
  "run-" + Date.now()
);
console.log(token);
