export interface OversightGoal {
	id: string;
	title: string;
	description: string | null;
	status: string;
	level: string;
	parentId: string | null;
}

export interface OversightActivityEvent {
	id: string;
	action: string;
	entityType: string;
	entityId: string;
	details: Record<string, unknown> | null;
	createdAt: Date;
}

export interface OversightAgent {
	id: string;
	name: string;
	title: string | null;
	role: string;
	status: string;
	budgetMonthlyCents: number;
	spentMonthlyCents: number;
	activeGoals: OversightGoal[];
	recentActivity: OversightActivityEvent[];
}

export interface OversightData {
	agents: OversightAgent[];
	windowDays: number;
	generatedAt: Date;
}
