import React from "react";
import { createRoot } from "react-dom/client";

function App() {
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
			<p>Desktop shell — K2 smoke screen.</p>
			<p style={{ opacity: 0.6, fontSize: "0.85rem" }}>
				K3 will spawn the Express server and replace this with the real UI.
			</p>
		</div>
	);
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
