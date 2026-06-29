import { createLocalAgentJwt } from "../src/agent-auth-jwt.js";

const token = createLocalAgentJwt(
  "d1341c49-0639-4d60-b365-dfdb7e12790a",
  "ba1dcf35-9204-4273-97ad-2791577351cb",
  "claude_local",
  "run-" + Date.now()
);
console.log(token);
