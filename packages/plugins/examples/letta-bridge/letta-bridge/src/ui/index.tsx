import { useState, useCallback, useRef, useEffect } from "react";
import {
	usePluginData,
	usePluginAction,
	usePluginStream,
	type PluginWidgetProps,
	type PluginPageProps,
	type PluginSettingsPageProps,
} from "@doerai/plugin-sdk/ui";
import type { LettaAgent, AgentsData } from "../types.js";

// --- Connection Widget (Dashboard) ---

interface HealthData {
	status: "connected" | "error" | "unconfigured";
	agentCount?: number;
	message?: string;
	checkedAt?: string;
}

export function ConnectionWidget({ context }: PluginWidgetProps) {
	const { data, loading, error, refresh } = usePluginData<HealthData>("health");
	const syncAgents = usePluginAction("sync-agents");
	const [syncing, setSyncing] = useState(false);

	const handleSync = async () => {
		setSyncing(true);
		try {
			await syncAgents({ companyId: context.companyId });
			refresh();
		} finally {
			setSyncing(false);
		}
	};

	if (loading) return <div style={widgetStyle}>Connecting to Letta...</div>;
	if (error) return <div style={widgetStyle}>Error: {error.message}</div>;

	const isConnected = data?.status === "connected";

	return (
		<div style={widgetStyle}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<strong>Letta Connection</strong>
				<div style={{
					width: 8,
					height: 8,
					borderRadius: "50%",
					background: isConnected ? "#10b981" : data?.status === "error" ? "#ef4444" : "#f59e0b"
				}} />
			</div>

			<div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
				{data?.status === "connected" ? (
					<>{data.agentCount} agents available</>
				) : data?.status === "unconfigured" ? (
					<>Not configured</>
				) : (
					<>{data?.message}</>
				)}
			</div>

			{isConnected && (
				<button onClick={handleSync} disabled={syncing} style={{ marginTop: 12, fontSize: 11 }}>
					{syncing ? "Syncing..." : "↻ Sync Now"}
				</button>
			)}

			<div style={{ marginTop: 8, fontSize: 10, color: "#999" }}>
				Checked: {data?.checkedAt ? new Date(data.checkedAt).toLocaleTimeString() : "never"}
			</div>
		</div>
	);
}

const widgetStyle: React.CSSProperties = {
	padding: 16,
	borderRadius: 8,
	background: "#f8f9fa",
	border: "1px solid #e9ecef"
};

// --- Settings Page ---

export function SettingsPage({ context }: PluginSettingsPageProps) {
	const { data, loading, refresh } = usePluginData<HealthData>("health");
	const testConnection = usePluginAction("test-connection");
	const syncAgents = usePluginAction("sync-agents");

	const [apiKey, setApiKey] = useState("");
	const [baseUrl, setBaseUrl] = useState("https://api.letta.com");
	const [testing, setTesting] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [testResult, setTestResult] = useState<string | null>(null);

	const handleTest = async () => {
		setTesting(true);
		setTestResult(null);
		try {
			const result = await testConnection({ companyId: context.companyId });
			setTestResult(`Connected! Found ${result.agentCount} agents.`);
		} catch (err) {
			setTestResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
		} finally {
			setTesting(false);
		}
	};

	const handleSync = async () => {
		setSyncing(true);
		try {
			const result = await syncAgents({ companyId: context.companyId });
			setTestResult(`Synced ${result.synced} agents`);
			refresh();
		} catch (err) {
			setTestResult(`Sync failed: ${err instanceof Error ? err.message : "Unknown error"}`);
		} finally {
			setSyncing(false);
		}
	};

	return (
		<div style={{ maxWidth: 600, padding: 24 }}>
			<h2>Letta Connection</h2>
			<p style={{ color: "#666" }}>Import your Letta agents into Doer</p>

			<div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
				<div>
					<label style={labelStyle}>Base URL</label>
					<input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} style={inputStyle} />
				</div>

				<div>
					<label style={labelStyle}>API Key</label>
					<input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="let-..." style={inputStyle} />
				</div>

				<div style={{ display: "flex", gap: 8 }}>
					<button onClick={handleTest} disabled={testing || !apiKey}>Test</button>
					<button onClick={handleSync} disabled={syncing || !apiKey}>Sync</button>
				</div>

				{testResult && (
					<div style={{ padding: "12px 16px", borderRadius: 6, background: testResult.startsWith("Connected") ? "#d4edda" : "#f8d7da", color: testResult.startsWith("Connected") ? "#155724" : "#721c24" }}>
						{testResult}
					</div>
				)}
			</div>
		</div>
	);
}

const labelStyle: React.CSSProperties = { display: "block", marginBottom: 4, fontSize: 12, color: "#666", fontWeight: 500 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 };

// --- Message Types ---

interface ChatMessage {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: Date;
	streaming?: boolean;
}

// --- Agent Browser Page with Chat ---

function MessageBubble({ msg }: { msg: ChatMessage }) {
	const isUser = msg.role === "user";
	return (
		<div style={{
			display: "flex",
			justifyContent: isUser ? "flex-end" : "flex-start",
			marginBottom: 12
		}}>
			<div style={{
				maxWidth: "70%",
				padding: "10px 14px",
				borderRadius: 12,
				background: isUser ? "#6c63ff" : "#f0f0f0",
				color: isUser ? "white" : "#333",
				fontSize: 14,
				lineHeight: 1.5,
				wordWrap: "break-word"
			}}>
				{msg.content}
				{msg.streaming && <span style={{ opacity: 0.5 }}>▊</span>}
			</div>
		</div>
	);
}

export function AgentBrowserPage({ context }: PluginPageProps) {
	const { data, loading, error, refresh } = usePluginData<AgentsData>("letta-agents", { companyId: context.companyId });
	const sendMessage = usePluginAction("send-message");

	// Chat state
	const [selectedAgent, setSelectedAgent] = useState<LettaAgent | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputMessage, setInputMessage] = useState("");
	const [sending, setSending] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const [streamChannel, setStreamChannel] = useState<string | null>(null);

	// Subscribe to streaming responses
	const { events: streamEvents, connected } = usePluginStream<{
		type: string;
		content: string;
		role: string;
	}>(streamChannel || "__never__", { companyId: context.companyId ?? undefined });

	// Auto-scroll to bottom
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	// Handle incoming stream events
	useEffect(() => {
		if (streamEvents.length === 0) return;

		const lastEvent = streamEvents[streamEvents.length - 1];

		if (lastEvent.type === "chunk") {
			setMessages(prev => {
				const last = prev[prev.length - 1];
				if (last && last.role === "assistant" && last.streaming) {
					const updated = [...prev];
					updated[updated.length - 1] = { ...last, content: last.content + lastEvent.content };
					return updated;
				} else {
							return [...prev, { id: `stream-${Date.now()}`, role: "assistant", content: lastEvent.content, timestamp: new Date(), streaming: true }];
				}
			});
		}
		if (lastEvent.type === "done") {
			setMessages(prev => {
				const last = prev[prev.length - 1];
				if (last && last.streaming) {
					const updated = [...prev];
					updated[updated.length - 1] = { ...last, streaming: false };
					return updated;
				}
				return prev;
			});
			setSending(false);
		}
	}, [streamEvents]);

	const handleSend = async () => {
		if (!selectedAgent || !inputMessage.trim() || sending) return;

		const messageText = inputMessage.trim();
		const channel = `chat:${selectedAgent.id}:${Date.now()}`;

		// Add user message immediately
		const userMessage: ChatMessage = {
			id: `user-${Date.now()}`,
			role: "user",
			content: messageText,
			timestamp: new Date()
		};
		setMessages(prev => [...prev, userMessage]);
		setInputMessage("");
		setSending(true);
		setStreamChannel(channel);

		try {
			await sendMessage({
				companyId: context.companyId,
				lettaAgentId: selectedAgent.id,
				message: messageText,
				streamChannel: channel
			});
		} catch (err) {
			setMessages(prev => [...prev, {
				id: `error-${Date.now()}`,
				role: "system",
				content: `Error: ${err instanceof Error ? err.message : "Failed to send"}`,
				timestamp: new Date()
			}]);
			setSending(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	if (loading) return <div style={{ padding: 24 }}>Loading Letta agents...</div>;
	if (error) return <div style={{ padding: 24, color: "red" }}>Error: {error.message}</div>;
	if (data?.error) return <div style={{ padding: 24, color: "red" }}>Error: {data.error}</div>;

	return (
		<div style={{ display: "flex", height: "100vh" }}>
			{/* Sidebar - Agent List */}
			<div style={{ width: 320, borderRight: "1px solid #ddd", overflowY: "auto", padding: 16, background: "#fafafa" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
					<h3 style={{ margin: 0 }}>Letta Agents</h3>
					<button onClick={refresh} style={{ fontSize: 12 }}>↻</button>
				</div>

				{data?.agents.map((agent) => (
					<div
						key={agent.id}
						onClick={() => {
							setSelectedAgent(agent);
							setMessages([]); // Clear chat on agent switch
						}}
						style={{
							padding: "12px 16px",
							borderRadius: 8,
							marginBottom: 8,
							cursor: "pointer",
							background: selectedAgent?.id === agent.id ? "#e3e3ff" : "white",
							border: selectedAgent?.id === agent.id ? "2px solid #6c63ff" : "1px solid #e0e0e0"
						}}
					>
						<div style={{ fontWeight: 600, fontSize: 14 }}>{agent.name}</div>
						<div style={{ fontSize: 12, color: "#666", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
							{agent.description || "No description"}
						</div>
						{agent.llm_config?.model && (
							<div style={{ fontSize: 10, color: "#999", marginTop: 4 }}>
								{agent.llm_config.model}
							</div>
						)}
					</div>
				))}
			</div>

			{/* Main - Chat Interface */}
			<div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 0 }}>
				{!selectedAgent ? (
					<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#666" }}>
						Select an agent to start chatting
					</div>
				) : (
					<>
						{/* Header */}
						<div style={{ padding: "16px 24px", borderBottom: "1px solid #ddd", background: "#fff" }}>
							<h2 style={{ margin: 0, fontSize: 18 }}>{selectedAgent.name}</h2>
							<div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{selectedAgent.id}</div>
						</div>

						{/* Messages */}
						<div
							ref={scrollRef}
							style={{ flex: 1, overflowY: "auto", padding: 24, background: "#f5f5f5" }}
						>
							{messages.length === 0 ? (
								<div style={{ textAlign: "center", color: "#999", marginTop: 100 }}>
									Start typing to chat with {selectedAgent.name}
								</div>
								) : (
								messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
							)}
						</div>

						{/* Input */}
						<div style={{ padding: 16, borderTop: "1px solid #ddd", background: "#fff" }}>
							<div style={{ display: "flex", gap: 12 }}>
								<textarea
									value={inputMessage}
									onChange={(e) => setInputMessage(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder={`Message ${selectedAgent.name}...`}
									style={{
										flex: 1,
										padding: "10px 14px",
										borderRadius: 8,
										border: "1px solid #ddd",
										fontSize: 14,
										resize: "none",
										minHeight: 44,
										maxHeight: 120
									}}
									rows={1}
								/>
								<button
									onClick={handleSend}
									disabled={!inputMessage.trim() || sending}
									style={{
										padding: "10px 20px",
										background: sending ? "#ccc" : "#6c63ff",
										color: "white",
										border: "none",
										borderRadius: 8,
										cursor: sending ? "not-allowed" : "pointer",
										fontSize: 14,
										fontWeight: 500
									}}
								>
									{sending ? "..." : "Send"}
								</button>
							</div>
							<div style={{ fontSize: 11, color: "#999", marginTop: 8 }}>
								Press Enter to send, Shift+Enter for new line
								{connected && <span style={{ marginLeft: 8, color: "#10b981" }}>● streaming</span>}
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
