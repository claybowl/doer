import { contextBridge } from "electron";

const serverUrlArg = process.argv.find((a) => a.startsWith("--doer-server-url="));
const serverUrl = serverUrlArg?.slice("--doer-server-url=".length) ?? null;

contextBridge.exposeInMainWorld("doer", {
	serverUrl,
});
