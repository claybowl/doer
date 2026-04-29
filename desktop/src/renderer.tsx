import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

declare global {
	interface Window {
		doer?: { serverUrl: string | null };
	}
}

type HealthState = { status: "loading" | "ok" | "error"; detail?: string };

function App() {
	const serverUrl = window.doer?.serverUrl ?? null;
	const [health, setHealth] = useState<HealthState>({ status: "loading" });

	useEffect(() => {
		if (!serverUrl) {
			setHealth({ status: "error", detail: "No server URL injected." });
			return;
		}
		fetch(`${serverUrl}/api/health`)
			.then(async (r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				const body = await r.text();
				setHealth({ status: "ok", detail: body.slice(0, 200) });
			})
			.catch((e: Error) => setHealth({ status: "error", detail: e.message }));
	}, [serverUrl]);

	return (
		<div
			style={{
				fontFamily: "system-ui, sans-serif",
				padding: "2rem",
				color: "#e6e6e6",
				background: "#0e1116",
				minHeight: "100vh",
			}}
		>
			<h1 style={{ marginTop: 0 }}>Doer</h1>
			<p>K3 smoke screen — Express in main process.</p>
			<dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1rem", maxWidth: 700 }}>
				<dt>Server URL</dt>
				<dd style={{ margin: 0, fontFamily: "monospace" }}>{serverUrl ?? "(none)"}</dd>
				<dt>/api/health</dt>
				<dd style={{ margin: 0, fontFamily: "monospace", color: health.status === "ok" ? "#7ee787" : health.status === "error" ? "#ff7b72" : "#d2a8ff" }}>
					{health.status === "loading" ? "checking…" : health.status === "ok" ? "✅ ok" : `❌ ${health.detail}`}
				</dd>
			</dl>
			{health.status === "ok" && health.detail && (
				<pre style={{ background: "#161b22", padding: "1rem", borderRadius: 8, marginTop: "1rem", maxWidth: 700, overflow: "auto" }}>
					{health.detail}
				</pre>
			)}
		</div>
	);
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
