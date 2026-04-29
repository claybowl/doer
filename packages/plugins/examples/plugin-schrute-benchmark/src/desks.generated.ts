// AUTO-GENERATED — do not edit by hand.
// Run: node scripts/generate-desks.mjs
// Source: desks/ (100 files across 10 departments)

export interface DeskDeliverable {
  filename: string;
  description: string;
}

export interface DeskCitation {
  source: string;
  code?: string;
  url: string;
  quote: string;
}

export interface DeskRubric {
  completion: string[];
  quality: string[];
  accuracy: string[];
  handoff: string[];
}

export interface DeskDefinition {
  id: string;
  dept: string;
  level: number;
  title: string;
  name: string;
  timeBudgetMin: number;
  brief: string;
  deliverables: DeskDeliverable[];
  citations: DeskCitation[];
  upstreamDeskIds: string[];
  downstreamDeskIds: string[];
  rubric: DeskRubric;
}

export const ALL_DESKS: DeskDefinition[] = [
  {
    "id": "ENG-L01-Marcus",
    "dept": "ENG",
    "level": 1,
    "title": "Junior Software Engineer",
    "name": "Marcus",
    "timeBudgetMin": 25,
    "brief": "You are Marcus, a Junior Software Engineer at a 100-person SaaS company. Today you have one bug ticket and one small data-handling task in your queue.\n\n1. Bug ticket TICKET-4421: \"Profile page crashes when user has no avatar URL\". Read the ticket, write a fix as a code patch (any language — TypeScript preferred), include a brief root-cause explanation, and write 1-2 test cases that would have caught it.\n\n2. Data utility: write a small script (any language) that reads a CSV of {user_id,event_name,timestamp} rows and outputs a JSON summary of event counts per user. Assume the CSV has ~10K rows; don't load it all into memory at once.\n\nYou should NOT design new architecture, ship anything to production, or scope-creep. Stay narrow. Aim for tight, well-tested code.",
    "deliverables": [
      {
        "filename": "ticket-4421-fix.md",
        "description": "Root-cause analysis (1 paragraph) + code patch (diff or full file) + 1-2 test case descriptions"
      },
      {
        "filename": "event-summary.{js,ts,py}",
        "description": "The streaming CSV-to-JSON-summary utility. Choose one language."
      },
      {
        "filename": "event-summary-test.md",
        "description": "Brief test plan: 3-4 input cases + expected outputs"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "15-1252.00",
        "url": "https://www.onetonline.org/link/summary/15-1252.00",
        "quote": "Modify existing software to correct errors, adapt it to new hardware, or upgrade interfaces and improve performance."
      },
      {
        "source": "O*NET",
        "code": "15-1252.00",
        "url": "https://www.onetonline.org/link/summary/15-1252.00",
        "quote": "Store, retrieve, and manipulate data for analysis of system capabilities and requirements."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm",
        "quote": "Software developers analyze users' needs and then design and develop software to meet those needs."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "ENG-L05-Amara"
    ],
    "rubric": {
      "completion": [
        "Did Marcus produce both deliverables (ticket fix + data utility)?",
        "Does the bug fix include a root-cause statement, not just a patch?",
        "Are at least 1-2 test cases described for the bug fix?",
        "Does the data utility produce JSON output, not just print to stdout?",
        "Is the test plan present as a separate deliverable?"
      ],
      "quality": [
        "Does the code follow standard idioms for the chosen language?",
        "Is the bug fix narrowly scoped (no unrelated refactoring)?",
        "Does the data utility actually stream (not load full CSV)?",
        "Are variable/function names clear and descriptive?",
        "Is the writing concise (no filler, no apologies)?"
      ],
      "accuracy": [
        "Does the root-cause analysis match the symptom described?",
        "Would the proposed fix actually resolve the null-avatar crash?",
        "Does the streaming approach handle the 10K row constraint correctly?",
        "Are the test cases technically valid (real edge cases, not duplicates)?",
        "Is the JSON output format internally consistent?"
      ],
      "handoff": [
        "Could a Tech Lead (ENG-L05) review this in under 5 minutes?",
        "Is the deliverable filename predictable from the ticket ID?",
        "Are dependencies (libraries, runtime version) stated explicitly?",
        "Is the patch self-contained (no missing context for review)?",
        "Did Marcus flag any blockers or open questions to the lead?"
      ]
    }
  },
  {
    "id": "ENG-L02-Priya",
    "dept": "ENG",
    "level": 2,
    "title": "Software Engineer II",
    "name": "Priya",
    "timeBudgetMin": 25,
    "brief": "You are Priya, a Software Engineer II. You own a feature this cycle: \"add CSV export to the user activity dashboard.\" The product spec is approved; design specs are minimal but acceptable.\n\nYour day:\n\n1. Read the (provided) feature spec and call out any ambiguities — at least 2 questions you'd send back to product before shipping.\n2. Write a short design note (1 page max) describing how you'd build it: the API endpoint shape, the file streaming strategy, how you handle datasets >100K rows, and the failure modes.\n3. Write the public function signatures (in TypeScript or Python) for the two key functions: `exportActivityToCSV(userId, dateRange)` and the streaming helper. No implementation yet — just the interface.\n4. Write 4-6 test cases (descriptions, not code) that you'd want to pass before merging.\n\nDo NOT write the full implementation. Your job today is making the work small and clear before coding.",
    "deliverables": [
      {
        "filename": "feature-questions.md",
        "description": "2-4 ambiguities/questions surfaced before implementation"
      },
      {
        "filename": "design-note.md",
        "description": "One-page design note: endpoint shape, streaming strategy, failure modes"
      },
      {
        "filename": "interfaces.ts",
        "description": "Public function signatures (no implementation) for the two key functions"
      },
      {
        "filename": "test-plan.md",
        "description": "4-6 test case descriptions covering happy path, large datasets, errors, and edge cases"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "15-1252.00",
        "url": "https://www.onetonline.org/link/summary/15-1252.00",
        "quote": "Analyze user needs and software requirements to determine feasibility of design within time and cost constraints."
      },
      {
        "source": "O*NET",
        "code": "15-1252.00",
        "url": "https://www.onetonline.org/link/summary/15-1252.00",
        "quote": "Design, develop and modify software systems, using scientific analysis and mathematical models to predict and measure outcomes and consequences of design."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm",
        "quote": "Software developers create flowcharts, diagrams, and other documentation that programmers need to write code for an application."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "ENG-L05-Amara"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the questions list contain at least 2 substantive ambiguities?",
        "Does the design note cover endpoint, streaming, and failure modes?",
        "Are both function signatures present in TypeScript/Python?",
        "Are at least 4 test cases described?"
      ],
      "quality": [
        "Are the questions specific (not generic 'what about errors')?",
        "Does the design note pick a streaming approach, not just list options?",
        "Are the function signatures typed precisely (no `any`)?",
        "Do the test cases cover at least one large-dataset scenario?",
        "Is the writing crisp (under 1 page for design note)?"
      ],
      "accuracy": [
        "Is the streaming approach actually viable at >100K rows?",
        "Are HTTP method/status codes correct for the endpoint?",
        "Are CSV escaping concerns addressed (commas, quotes, newlines)?",
        "Are the function signatures internally consistent?",
        "Do test cases reflect real failure modes, not invented ones?"
      ],
      "handoff": [
        "Could a Tech Lead approve the design note in 5 minutes?",
        "Are open questions clearly marked for product input?",
        "Are deliverables named predictably for the lead's review?",
        "Did Priya flag her blocker (waiting on PM answers) explicitly?",
        "Is the work scoped to fit in next sprint?"
      ]
    }
  },
  {
    "id": "ENG-L03-Chen",
    "dept": "ENG",
    "level": 3,
    "title": "Senior Software Engineer",
    "name": "Chen",
    "timeBudgetMin": 25,
    "brief": "You are Chen, a Senior Software Engineer. Design has shipped a spec for a new permissions UI (received from DES-L05-Yael). You own delivery of this feature end-to-end.\n\nYour day:\n\n1. Read the design spec. Translate it into 5-8 implementation tickets with crisp titles, scope statements, and rough effort estimates (S/M/L). Each ticket should be assignable to one person and completable in <1 day.\n2. Write a technical design doc (1.5 pages max) covering: the data model changes, the API surface, frontend component structure, backwards-compatibility approach, and rollout plan.\n3. Identify 2-3 risks or things that will go wrong, and what you're doing about each.\n4. Write a short consultation note for the security team — what they need to review and when.\n\nYou are the technical owner. If the design has gaps, name them. If a backwards-compat concern blocks the design, say so.",
    "deliverables": [
      {
        "filename": "implementation-tickets.md",
        "description": "5-8 tickets, each with title / scope / effort estimate / acceptance criteria"
      },
      {
        "filename": "tech-design.md",
        "description": "1.5-page technical design: data model, API, frontend, compat, rollout"
      },
      {
        "filename": "risks.md",
        "description": "2-3 named risks + the mitigation for each"
      },
      {
        "filename": "security-consult-note.md",
        "description": "Short note for security team — scope of review needed, deadline"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "15-1252.00",
        "url": "https://www.onetonline.org/link/summary/15-1252.00",
        "quote": "Design, develop and modify software systems, using scientific analysis and mathematical models to predict and measure outcomes and consequences of design."
      },
      {
        "source": "O*NET",
        "code": "15-1252.00",
        "url": "https://www.onetonline.org/link/summary/15-1252.00",
        "quote": "Consult with customers or other departments on project status, proposals, or technical issues, such as software system design or maintenance."
      },
      {
        "source": "O*NET",
        "code": "15-1252.00",
        "url": "https://www.onetonline.org/link/summary/15-1252.00",
        "quote": "Develop or direct software system testing or validation procedures, programming, or documentation."
      }
    ],
    "upstreamDeskIds": [
      "DES-L05-Yael"
    ],
    "downstreamDeskIds": [
      "ENG-L05-Amara"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Are there 5-8 tickets, each with title/scope/effort?",
        "Does the tech-design cover data model + API + frontend + compat + rollout?",
        "Are 2-3 risks named with mitigations?",
        "Does the security note specify scope and a deadline?"
      ],
      "quality": [
        "Are tickets atomic (one assignee, <1 day each)?",
        "Does the design doc make a clear architectural choice (not list options)?",
        "Are risks specific to this feature (not generic 'bugs might happen')?",
        "Is the rollout plan staged (flag, %)?",
        "Is the writing dense (under stated page limits)?"
      ],
      "accuracy": [
        "Do tickets sum to the spec (no dropped requirements, no scope creep)?",
        "Is the proposed data model compatible with typical RBAC patterns?",
        "Does the API design follow REST/RPC conventions consistently?",
        "Is the backwards-compat approach actually backwards-compatible?",
        "Are effort estimates plausible relative to typical SaaS engineering?"
      ],
      "handoff": [
        "Could ENG-L05-Amara assign tickets to L1/L2 ICs without rewriting them?",
        "Did Chen surface the design gaps back to DES-L05-Yael?",
        "Is the security consult timed early enough not to block ship?",
        "Does the tech design name a single owner per workstream?",
        "Are blockers / dependencies flagged explicitly?"
      ]
    }
  },
  {
    "id": "ENG-L04-Sergei",
    "dept": "ENG",
    "level": 4,
    "title": "Staff Engineer",
    "name": "Sergei",
    "timeBudgetMin": 35,
    "brief": "You are Sergei, a Staff Engineer. Three teams (auth, billing, integrations) are independently considering adopting a new event-streaming dependency (Kafka vs NATS vs Pulsar). Your job is to make the call and write it up so it sticks.\n\nYour day:\n\n1. Write an Architecture Decision Record (ADR) using the standard template (Context / Decision / Consequences / Status). Pick one of the three options. Defend it.\n2. Produce a dependency analysis: for each of the 3 teams, list how this decision affects their current systems and what they'll need to change. Be specific.\n3. Write a migration plan with phases (proof of concept → pilot team → broader rollout) and rough timing.\n4. Identify 2-3 things that could make this decision wrong in 18 months, and what you'd watch for.\n\nYou are not directly managing anyone. Your authority is technical credibility — the writing has to do the work.",
    "deliverables": [
      {
        "filename": "adr-event-streaming.md",
        "description": "ADR with Context/Decision/Consequences/Status sections; 1.5 pages max"
      },
      {
        "filename": "dependency-impact.md",
        "description": "Per-team impact analysis: auth, billing, integrations — what changes for each"
      },
      {
        "filename": "migration-plan.md",
        "description": "Phased rollout plan with rough timing"
      },
      {
        "filename": "decision-watchlist.md",
        "description": "2-3 indicators that would invalidate the decision; tripwires"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "15-1252.00",
        "url": "https://www.onetonline.org/link/summary/15-1252.00",
        "quote": "Confer with systems analysts, engineers, programmers and others to design systems and to obtain information on project limitations and capabilities, performance requirements and interfaces."
      },
      {
        "source": "O*NET",
        "code": "15-1252.00",
        "url": "https://www.onetonline.org/link/summary/15-1252.00",
        "quote": "Analyze information to determine, recommend, and plan installation of a new system or modification of an existing system."
      },
      {
        "source": "Industry Report",
        "code": "ThoughtWorks Tech Radar",
        "url": "https://www.thoughtworks.com/radar",
        "quote": "Used as the convention for ADR structure and for tracking dependency adoption phases."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "ENG-L05-Amara",
      "ENG-L08-Esther"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the ADR follow Context/Decision/Consequences/Status structure?",
        "Does the impact doc cover all 3 teams (auth, billing, integrations)?",
        "Does the migration plan have at least 3 phases?",
        "Are the watchlist tripwires concrete (not vague)?"
      ],
      "quality": [
        "Does the ADR pick one option and commit, not hedge?",
        "Does the impact doc tell each team what they'll change, not what they'll consider?",
        "Is the migration plan staged with checkpoints?",
        "Do the tripwires have measurable triggers (not 'if it gets bad')?",
        "Is technical reasoning sound (CAP, throughput, ops burden)?"
      ],
      "accuracy": [
        "Are the three options described correctly (Kafka/NATS/Pulsar properties)?",
        "Are claims about ops burden, throughput, and ecosystem realistic?",
        "Are the per-team impacts plausible given typical SaaS architectures?",
        "Does the migration timing reflect typical adoption realities?",
        "Are the watchlist indicators things you can actually observe?"
      ],
      "handoff": [
        "Could ENG-L05-Amara align her teams from this ADR alone?",
        "Could ENG-L08-Esther fund this decision without further questions?",
        "Did Sergei name the affected teams explicitly?",
        "Is each phase of the migration assigned a directional owner?",
        "Are next-step actions clear?"
      ]
    }
  },
  {
    "id": "ENG-L05-Amara",
    "dept": "ENG",
    "level": 5,
    "title": "Tech Lead",
    "name": "Amara",
    "timeBudgetMin": 35,
    "brief": "You are Amara, Tech Lead for the Platform team. Your reports today produced: a bug fix (Marcus, L1), a feature design (Priya, L2), an implementation plan (Chen, L3), and a streaming-platform ADR (Sergei, L4). You consume their work and turn it into a sprint-end summary plus next-cycle plan.\n\nYour day:\n\n1. Synthesize the four pieces of work into a concise sprint-end summary (1 page max) that your manager (ENG-L06-Yuki) can read in 3 minutes. Include what shipped, what's at risk, and one recommendation.\n2. Write next-cycle plan: 5-8 high-level workstreams with rough sizing and ownership. Use Sergei's ADR as input — what does cycle N+1 look like given the streaming decision?\n3. Code-review notes: pick ONE of the four pieces (your choice) and write a substantive code-review-style critique. What's missing, what's risky, what to push back on.\n4. Set performance expectations: define 2-3 measurable engineering targets for the team next cycle (e.g., \"P95 page load <300ms\", \"<2% test flake rate\").\n\nYou are the first synthesis tier. Your writing has to compress 4 ICs' work into a manager-digestible signal.",
    "deliverables": [
      {
        "filename": "sprint-summary.md",
        "description": "1-page synthesis of the team's output: shipped, at-risk, one recommendation"
      },
      {
        "filename": "next-cycle-plan.md",
        "description": "5-8 workstreams with size + owner for the next 2 weeks"
      },
      {
        "filename": "code-review-notes.md",
        "description": "Substantive critique of one of the four upstream deliverables"
      },
      {
        "filename": "perf-targets.md",
        "description": "2-3 measurable engineering targets with current baseline + target value"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "15-1252.00",
        "url": "https://www.onetonline.org/link/summary/15-1252.00",
        "quote": "Determine system performance standards."
      },
      {
        "source": "O*NET",
        "code": "11-3021.00",
        "url": "https://www.onetonline.org/link/summary/11-3021.00",
        "quote": "Assign and review the work of systems analysts, programmers, and other computer-related workers."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm",
        "quote": "Software developers may oversee the work of programmers and other software developers as a project leader."
      }
    ],
    "upstreamDeskIds": [
      "ENG-L01-Marcus",
      "ENG-L02-Priya",
      "ENG-L03-Chen",
      "ENG-L04-Sergei"
    ],
    "downstreamDeskIds": [
      "ENG-L06-Yuki"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the sprint summary reference all four upstream desks?",
        "Are 5-8 workstreams listed in the next-cycle plan?",
        "Is the code review substantive (not generic 'looks good')?",
        "Are 2-3 perf targets stated with baseline + target values?"
      ],
      "quality": [
        "Is the sprint summary scannable in <3 minutes?",
        "Does the code review push back on something specific?",
        "Are perf targets actually measurable (numeric)?",
        "Does the next-cycle plan reflect Sergei's ADR decision?",
        "Is the writing decisive, not tentative?"
      ],
      "accuracy": [
        "Does Amara correctly characterize each upstream's contribution?",
        "Are the perf-target baselines realistic for typical SaaS teams?",
        "Does the next-cycle plan respect Marcus/Priya's level (no overscoping)?",
        "Is the recommendation in sprint summary supported by the upstream evidence?",
        "Does Amara catch real issues in the code review (not invented ones)?"
      ],
      "handoff": [
        "Could ENG-L06-Yuki run a 1:1 with each report from this synthesis?",
        "Are blockers from the team flagged explicitly to the manager?",
        "Are upstream credit attributions clear (who did what)?",
        "Is the next-cycle plan ready to discuss in a planning meeting?",
        "Do perf targets feed into manager OKR-style reporting?"
      ]
    }
  },
  {
    "id": "ENG-L06-Yuki",
    "dept": "ENG",
    "level": 6,
    "title": "Engineering Manager",
    "name": "Yuki",
    "timeBudgetMin": 35,
    "brief": "You are Yuki, Engineering Manager for the Platform team. You have 5 reports including ENG-L05-Amara (Tech Lead) and four ICs. Today is Monday, weekly planning day.\n\nYour day:\n\n1. 1:1 prep: write short prep notes for 1:1s with two specific reports — Amara (Tech Lead — discuss the next-cycle plan she just sent up) and one IC of your choosing (pick from Marcus / Priya / Chen / Sergei). Each prep note: what you want to ask, what you'll listen for, one piece of feedback you owe.\n2. Weekly team plan: a one-page write-up the team will read Monday morning. Cover: priorities for the week, who's on call, what's blocked, what we're celebrating.\n3. Hiring update: you're hiring one mid-level engineer. Write a quick status: pipeline counts (top of funnel / phone screens / on-sites / offers), one bottleneck, one ask of your director.\n4. Risk you're escalating: identify ONE real risk from this week's signals and write 3-4 sentences on what it is, why it matters, and what you need from leadership.\n\nYou are the lowest people-management tier. Treat your team's time as your most expensive resource.",
    "deliverables": [
      {
        "filename": "1-on-1-prep.md",
        "description": "Prep for two 1:1s — Amara + one IC. Format: questions, what to listen for, feedback owed."
      },
      {
        "filename": "weekly-team-plan.md",
        "description": "One-page Monday plan: priorities, on-call, blockers, wins"
      },
      {
        "filename": "hiring-update.md",
        "description": "Pipeline status + one bottleneck + one ask of the director"
      },
      {
        "filename": "escalation.md",
        "description": "One named risk with what + why + ask (3-4 sentences each)"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3021.00",
        "url": "https://www.onetonline.org/link/summary/11-3021.00",
        "quote": "Direct daily operations of department, analyzing workflow, establishing priorities, developing standards and setting deadlines."
      },
      {
        "source": "O*NET",
        "code": "11-3021.00",
        "url": "https://www.onetonline.org/link/summary/11-3021.00",
        "quote": "Recruit, hire, train and supervise staff, or participate in staffing decisions."
      },
      {
        "source": "O*NET",
        "code": "11-3021.00",
        "url": "https://www.onetonline.org/link/summary/11-3021.00",
        "quote": "Assign and review the work of systems analysts, programmers, and other computer-related workers."
      }
    ],
    "upstreamDeskIds": [
      "ENG-L05-Amara"
    ],
    "downstreamDeskIds": [
      "ENG-L07-Ravi"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Are 1:1 prep notes for both Amara AND one IC present?",
        "Does the weekly plan cover priorities, on-call, blockers, wins?",
        "Does the hiring update include pipeline counts at all 4 stages?",
        "Is the escalation a single named risk, not a list?"
      ],
      "quality": [
        "Are 1:1 prep questions specific to the named report (not generic)?",
        "Does the weekly plan tell the team what to skip, not just what to do?",
        "Does the hiring update name one real bottleneck (not 'we need more candidates')?",
        "Is the escalation written for the director's pattern of attention?",
        "Does each piece have a clear owner / next step?"
      ],
      "accuracy": [
        "Does Yuki's plan reflect Amara's next-cycle plan upstream?",
        "Are pipeline counts internally consistent (offers ≤ on-sites ≤ phone screens ≤ top-of-funnel)?",
        "Is the on-call rotation realistic for a 5-person team?",
        "Does the escalation reflect a risk plausibly visible at this level?",
        "Are 1:1 questions appropriate to each report's level?"
      ],
      "handoff": [
        "Could ENG-L07-Ravi roll up Yuki's hiring update without rework?",
        "Is the escalation actionable by the director (clear ask)?",
        "Does Yuki connect Amara's perf-targets to her weekly plan?",
        "Are blockers visible to the team in the Monday plan?",
        "Could a peer manager run from the same playbook?"
      ]
    }
  },
  {
    "id": "ENG-L07-Ravi",
    "dept": "ENG",
    "level": 7,
    "title": "Senior Engineering Manager",
    "name": "Ravi",
    "timeBudgetMin": 45,
    "brief": "You are Ravi, Senior Engineering Manager. You manage three managers covering ~15 engineers across Platform, Integrations, and Frontend. Today the new product roadmap landed (from PROD-L08-Diego) and you have to translate it into a cycle plan.\n\nYour day:\n\n1. Cycle plan: a 1.5-page document mapping the roadmap themes onto your three teams. For each theme, name the lead team, the dependencies, and the rough sizing. Be honest about what won't fit.\n2. Project status report: a status across your three teams covering shipped last cycle, in-flight, and at-risk. One paragraph per team. The director will roll this up.\n3. Risk register: 4-6 risks with severity (H/M/L) and your mitigation. Cover technical risks AND people risks (attrition, burnout, hiring gaps).\n4. Asks: a short list of 2-4 things you need from your director (ENG-L08) or peer departments. Be specific — \"approval\", \"a meeting\", \"hiring slot\", etc.\n\nYou consume both upstream signals (your manager's reports + product roadmap) and you set direction. Your scope is a quarter, not a sprint.",
    "deliverables": [
      {
        "filename": "cycle-plan.md",
        "description": "1.5-page roadmap-to-team mapping with leads, dependencies, sizing, cuts"
      },
      {
        "filename": "status-report.md",
        "description": "Status across 3 teams: shipped, in-flight, at-risk (1 paragraph each)"
      },
      {
        "filename": "risk-register.md",
        "description": "4-6 risks with severity + mitigation; mix of technical and people risks"
      },
      {
        "filename": "asks.md",
        "description": "2-4 specific asks of director or peer depts"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3021.00",
        "url": "https://www.onetonline.org/link/summary/11-3021.00",
        "quote": "Direct daily operations of department, analyzing workflow, establishing priorities, developing standards and setting deadlines."
      },
      {
        "source": "O*NET",
        "code": "11-3021.00",
        "url": "https://www.onetonline.org/link/summary/11-3021.00",
        "quote": "Review project plans to plan and coordinate project activity."
      },
      {
        "source": "O*NET",
        "code": "11-3021.00",
        "url": "https://www.onetonline.org/link/summary/11-3021.00",
        "quote": "Consult with users, management, vendors, and technicians to assess computing needs and system requirements."
      }
    ],
    "upstreamDeskIds": [
      "ENG-L06-Yuki",
      "PROD-L08-Diego"
    ],
    "downstreamDeskIds": [
      "ENG-L08-Esther"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the cycle plan reference the roadmap from PROD-L08-Diego?",
        "Does the status report cover all three teams?",
        "Are 4-6 risks listed with severity AND mitigation?",
        "Are 2-4 specific asks listed (not vague)?"
      ],
      "quality": [
        "Does the cycle plan say what won't fit (not just what will)?",
        "Are risks specific (not 'general delivery risk')?",
        "Does the risk register include people risks, not only tech?",
        "Are asks scoped (one approval, not 'help me')?",
        "Is severity rationale visible (why H/M/L)?"
      ],
      "accuracy": [
        "Does the cycle plan honor capacity constraints (no team overcommitted)?",
        "Is the roadmap-to-team mapping plausible?",
        "Are risk severities calibrated (not all-H)?",
        "Does the status report distinguish 'shipped' from 'launched' correctly?",
        "Are dependencies between teams accurately stated?"
      ],
      "handoff": [
        "Could ENG-L08-Esther brief the VP from this status report?",
        "Are cuts to the roadmap explicit and reversible?",
        "Are asks routed to the right person (director vs peer dept)?",
        "Did Ravi pull from Yuki's escalation upstream?",
        "Is the cycle plan ready for kickoff with the three teams?"
      ]
    }
  },
  {
    "id": "ENG-L08-Esther",
    "dept": "ENG",
    "level": 8,
    "title": "Director of Engineering",
    "name": "Esther",
    "timeBudgetMin": 45,
    "brief": "You are Esther, Director of Engineering. You own the strategy and operating model for ~40 engineers across 3 senior managers' orgs. The CEO is asking for a clearer narrative on engineering health going into the board meeting.\n\nYour day:\n\n1. Department strategy memo: a 2-page document covering: where we invest next quarter, where we cut, what 'good' looks like in 6 months. This is the document the CTO and CEO read.\n2. Hiring plan: headcount asks for next quarter — by team, by level. State current headcount, target headcount, and the cost of NOT filling each slot. (Sent to FIN-L08-Pierre and HR-L08-Renaud for budgeting.)\n3. Launch readiness review: there's a major product launch in 30 days. Audit readiness across infra, security, monitoring, support — what's green, yellow, red. (This feeds MKT-L06-Tobias for release notes.)\n4. Tech debt position: write the org's stance on tech debt this quarter. What's allowed to slip, what's not, how much of capacity is reserved for it.\n\nYou are the highest level still close to operations. Below you everything is execution; above you everything is narrative.",
    "deliverables": [
      {
        "filename": "dept-strategy-memo.md",
        "description": "2-page strategy: invest, cut, definition-of-good for next 6 months"
      },
      {
        "filename": "hiring-plan.md",
        "description": "Headcount asks by team + level + cost of not filling"
      },
      {
        "filename": "launch-readiness.md",
        "description": "Audit across infra, security, monitoring, support: green/yellow/red"
      },
      {
        "filename": "tech-debt-position.md",
        "description": "Org stance on tech debt: what slips, what doesn't, capacity reserved"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3021.00",
        "url": "https://www.onetonline.org/link/summary/11-3021.00",
        "quote": "Develop computer information resources, providing for data security and control, strategic computing, and disaster recovery."
      },
      {
        "source": "O*NET",
        "code": "11-3021.00",
        "url": "https://www.onetonline.org/link/summary/11-3021.00",
        "quote": "Develop and interpret organizational goals, policies, and procedures."
      },
      {
        "source": "O*NET",
        "code": "11-3021.00",
        "url": "https://www.onetonline.org/link/summary/11-3021.00",
        "quote": "Stay abreast of advances in technology."
      }
    ],
    "upstreamDeskIds": [
      "ENG-L07-Ravi",
      "ENG-L04-Sergei"
    ],
    "downstreamDeskIds": [
      "ENG-L09-Tomás",
      "MKT-L06-Tobias",
      "FIN-L08-Pierre",
      "HR-L08-Renaud"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the strategy memo cover invest / cut / definition-of-good?",
        "Does the hiring plan state cost of NOT filling each slot?",
        "Does launch readiness use a green/yellow/red rating?",
        "Does tech debt position name a numeric capacity reserve?"
      ],
      "quality": [
        "Does the strategy memo make explicit cuts (not just additions)?",
        "Is the hiring plan defensible at the budget table?",
        "Does the readiness review name the launch blockers, not generic risks?",
        "Is the tech debt stance enforceable (not aspirational)?",
        "Is the writing dense enough to read in 5 minutes?"
      ],
      "accuracy": [
        "Are headcount numbers internally consistent with current state?",
        "Are the readiness ratings supported by evidence?",
        "Do strategy claims connect to Ravi's status report upstream?",
        "Is Sergei's ADR reflected in the strategy memo (streaming platform)?",
        "Is the tech debt capacity reserve realistic (~10-25% typical)?"
      ],
      "handoff": [
        "Could ENG-L09-Tomás brief the VP from the strategy memo?",
        "Could MKT-L06-Tobias write release notes from the launch readiness doc?",
        "Could FIN-L08-Pierre approve / cut headcount from this hiring plan?",
        "Could HR-L08-Renaud start sourcing from the hiring plan?",
        "Are downstream consumers each addressed by name in the relevant doc?"
      ]
    }
  },
  {
    "id": "ENG-L09-Tomás",
    "dept": "ENG",
    "level": 9,
    "title": "VP of Engineering",
    "name": "Tomás",
    "timeBudgetMin": 55,
    "brief": "You are Tomás, VP of Engineering. You report to the CTO and have peer-VPs in Product, Sales, and Operations. The org is preparing for a quarterly business review and a board meeting two weeks out.\n\nYour day:\n\n1. Cross-functional alignment doc: a 2-page document for the VP staff (Product, Sales, Ops) covering shared dependencies, shared risks, and where engineering needs help. Specifically address: a delayed Sales feature ask, an Ops infrastructure migration, and the next-cycle Product priorities.\n2. Quarterly OKR draft: 3-5 engineering OKRs for next quarter. Each with one objective and 2-4 measurable key results. Tie each to a business outcome.\n3. Exec-prep memo: a 1-page brief for your CTO covering what they should ask the board, what they should NOT bring up, and where you'd push back if pressed.\n4. Attrition & retention plan: 2 paragraphs on the team's attrition risk, who you're worried about losing, and what you're doing about it. Sensitive — but real.\n\nAt this level your output is read by people who don't have time to read carefully. Make every sentence earn its place.",
    "deliverables": [
      {
        "filename": "cross-fn-alignment.md",
        "description": "2-page VP-staff document covering deps, risks, asks across Product/Sales/Ops"
      },
      {
        "filename": "quarterly-okrs.md",
        "description": "3-5 OKRs with measurable KRs tied to business outcomes"
      },
      {
        "filename": "exec-prep-memo.md",
        "description": "1-page brief for CTO: what to ask, what to avoid, where to push"
      },
      {
        "filename": "attrition-retention.md",
        "description": "2 paragraphs on attrition risk + named retention plan"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3021.00",
        "url": "https://www.onetonline.org/link/summary/11-3021.00",
        "quote": "Meet with department heads, managers, supervisors, vendors, and others, to solicit cooperation and resolve problems."
      },
      {
        "source": "O*NET",
        "code": "11-3021.00",
        "url": "https://www.onetonline.org/link/summary/11-3021.00",
        "quote": "Develop and interpret organizational goals, policies, and procedures."
      },
      {
        "source": "Industry Report",
        "code": "Andreessen Horowitz: Eng Org Design",
        "url": "https://a16z.com/the-engineers-guide-to-startups/",
        "quote": "Used as the convention for OKR structure and VP-level cross-functional alignment patterns at scale-stage SaaS companies."
      }
    ],
    "upstreamDeskIds": [
      "ENG-L08-Esther"
    ],
    "downstreamDeskIds": [
      "ENG-L10-Cyrus"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the alignment doc address Product, Sales, AND Ops?",
        "Are 3-5 OKRs present with measurable KRs?",
        "Does the exec memo include 'what to avoid' (the harder ask)?",
        "Is attrition addressed by named risk areas (not generic)?"
      ],
      "quality": [
        "Does the alignment doc state explicit asks (not just shared concerns)?",
        "Are KRs actually measurable (number, %, deadline)?",
        "Is the exec memo respectful of the CTO's bandwidth?",
        "Does the attrition note balance honesty with discretion?",
        "Is every paragraph load-bearing?"
      ],
      "accuracy": [
        "Are OKRs aligned with Esther's strategy memo upstream?",
        "Do KR targets reflect the team's actual capacity (from Ravi's status)?",
        "Is the cross-fn doc consistent with peer VPs' likely positions?",
        "Are retention tactics realistic (not 'pay everyone more')?",
        "Does the exec memo reflect a real CTO/board dynamic?"
      ],
      "handoff": [
        "Could ENG-L10-Cyrus walk into the board meeting from this prep?",
        "Could a peer VP take action from the alignment doc without follow-up?",
        "Are OKRs ready to cascade to Esther (and below)?",
        "Is the attrition plan paired with HR-L08-Renaud explicitly?",
        "Does the exec memo set up a confident decision, not a hedge?"
      ]
    }
  },
  {
    "id": "ENG-L10-Cyrus",
    "dept": "ENG",
    "level": 10,
    "title": "Chief Technology Officer",
    "name": "Cyrus",
    "timeBudgetMin": 55,
    "brief": "You are Cyrus, Chief Technology Officer. You sit on the executive team and report to the CEO. The board meets in two weeks. You also have a make-or-break call this quarter on whether to invest in a new ML platform — a $2-3M ask.\n\nYour day:\n\n1. Tech vision update: a 1-page memo for the executive team and the board. Where the technology org is going over the next 18 months, what makes us hard to copy, and the one bet that matters most.\n2. Board pre-read on engineering health: 1 page covering team size, velocity trend, reliability metrics (SLO attainment), and the top 2 technical risks. The board has 3 minutes for this — make it count.\n3. Capital ask: a 2-page argument for the ML platform investment. State the cost, the expected return, the alternative (status quo), and your fallback (smaller version). Be honest about what you don't know.\n4. CEO 1:1 prep: 5-7 bullets for your CEO meeting tomorrow. Mix wins, asks, and one piece of news they should hear from you first.\n\nAt this level your job is decisions. Your writing exists to make decisions stick.",
    "deliverables": [
      {
        "filename": "tech-vision.md",
        "description": "1-page exec/board memo: 18-month direction, moat, one big bet"
      },
      {
        "filename": "board-pre-read-eng-health.md",
        "description": "1-page board pre-read: team, velocity, reliability, top 2 risks"
      },
      {
        "filename": "capital-ask-ml-platform.md",
        "description": "2-page investment argument: cost, ROI, alternative, fallback, unknowns"
      },
      {
        "filename": "ceo-1on1-prep.md",
        "description": "5-7 bullets for the CEO meeting: wins, asks, news"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Direct, plan, or implement policies, objectives, or activities of organizations or businesses to ensure continuing operations, to maximize returns on investments, or to increase productivity."
      },
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Prepare or present reports concerning activities, expenses, budgets, government statutes or rulings, or other items affecting businesses or program services."
      },
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Analyze operations to evaluate performance of a company or its staff in meeting objectives or to determine areas of potential cost reduction, program improvement, or policy change."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "ENG-L09-Tomás"
    ],
    "downstreamDeskIds": [],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the tech vision name ONE big bet (not a list of priorities)?",
        "Does the board pre-read fit on one page with all four sections?",
        "Does the capital ask state cost, ROI, alternative, fallback, unknowns?",
        "Are 5-7 CEO 1:1 bullets present?"
      ],
      "quality": [
        "Is the tech vision specific (a thing the company does, not a slogan)?",
        "Does the board pre-read use real numbers (not 'velocity trending up')?",
        "Does the capital ask include unknowns honestly (not just upside)?",
        "Is the CEO prep focused (no items the CEO should hear from someone else)?",
        "Is every document scannable in <3 minutes?"
      ],
      "accuracy": [
        "Does the vision align with Tomás's quarterly OKRs upstream?",
        "Are reliability/velocity numbers realistic for a 40-engineer org?",
        "Does the capital ask price ML platform investment plausibly ($2-3M scale)?",
        "Is the moat claim defensible (not vapor)?",
        "Does the fallback option actually save money relative to full ask?"
      ],
      "handoff": [
        "Could the CEO walk into the board meeting from the pre-read alone?",
        "Could the CFO model the capital ask without follow-up?",
        "Are next-step decisions named (who decides, by when)?",
        "Does the vision document set up the next quarter's OKR cascade?",
        "Could a board member ask 1-2 questions and get sufficient answers?"
      ]
    }
  },
  {
    "id": "PROD-L01-Jorge",
    "dept": "PROD",
    "level": 1,
    "title": "Associate Product Manager",
    "name": "Jorge",
    "timeBudgetMin": 25,
    "brief": "You are Jorge, an Associate Product Manager at a 100-person SaaS company. You are early in your PM career and own one narrow slice of the product: the user onboarding flow.\n\nYour day:\n\n1. You have a Jira ticket from engineering: they need acceptance criteria for a small onboarding change — the 'Skip Tour' button should be hidden for free-tier users. Write acceptance criteria that are clear enough for an engineer to implement and a QA person to test. Include at least 3 specific test cases.\n2. You received a user interview transcript from a UX researcher. Read the summary notes below and extract 3-5 user pain points in structured form (pain point → evidence quote → severity: high/medium/low). You are not designing a solution — just documenting the problem clearly.\n3. Update the onboarding funnel tracking doc: the current step-completion rates are Step 1: 94%, Step 2: 71%, Step 3: 48%, Step 4: 29%. Add a brief (3-4 sentence) narrative on where the biggest drop-off is and what it might mean.\n\nStay narrow. You are not re-designing the product. You are doing the documentation and analysis work that enables better decisions upstream.",
    "deliverables": [
      {
        "filename": "acceptance-criteria-skip-tour.md",
        "description": "Acceptance criteria for the Skip Tour button change, with ≥3 QA test cases"
      },
      {
        "filename": "user-pain-points.md",
        "description": "3-5 structured pain points extracted from interview: pain point, evidence quote, severity"
      },
      {
        "filename": "onboarding-funnel-notes.md",
        "description": "Step completion rates with a 3-4 sentence narrative on drop-off"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1199.00",
        "url": "https://www.onetonline.org/link/summary/13-1199.00",
        "quote": "Analyze data gathered and develop solutions or alternative methods of proceeding."
      },
      {
        "source": "O*NET",
        "code": "13-1199.00",
        "url": "https://www.onetonline.org/link/summary/13-1199.00",
        "quote": "Document findings of study and prepare recommendations for implementation of new systems, procedures, or organizational changes."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/management-analysts.htm",
        "quote": "Management analysts, often called management consultants, propose ways to improve an organization's efficiency."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "PROD-L05-Elena"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Do acceptance criteria include ≥3 specific QA test cases?",
        "Are 3-5 user pain points documented in structured form?",
        "Does each pain point include a severity rating?",
        "Does the funnel notes doc include the step completion numbers?"
      ],
      "quality": [
        "Are acceptance criteria written in a format an engineer can act on (not vague)?",
        "Are pain points grounded in evidence quotes (not inferred)?",
        "Is the funnel narrative analytical (not just restatement of numbers)?",
        "Is the writing concise (no filler)?",
        "Are test cases specific enough for a QA person to execute?"
      ],
      "accuracy": [
        "Do acceptance criteria match the scope (free-tier only, no regression)?",
        "Does the pain point severity reflect interview evidence correctly?",
        "Is the biggest drop-off identified as Step 2→3 (71%→48%)?",
        "Are test cases valid edge cases (not duplicates of each other)?",
        "Is the funnel narrative hypothesis-driven, not conclusive?"
      ],
      "handoff": [
        "Could an engineer implement the Skip Tour change from the acceptance criteria alone?",
        "Could PROD-L05-Elena synthesize these pain points without re-reading raw transcripts?",
        "Are deliverable filenames predictable and consistent?",
        "Does Jorge flag any blockers or ambiguities to upstream?",
        "Is the funnel doc ready to drop into a sprint review deck?"
      ]
    }
  },
  {
    "id": "PROD-L02-Nadia",
    "dept": "PROD",
    "level": 2,
    "title": "Product Manager",
    "name": "Nadia",
    "timeBudgetMin": 25,
    "brief": "You are Nadia, a Product Manager at a 100-person SaaS company. You own the integrations feature area — the set of third-party connectors users can add to the product.\n\nYour day:\n\n1. Write a one-pager for a new feature request that came in from sales: customers want a Zapier integration. The one-pager should cover: problem statement, proposed solution (high-level), success metrics (how will you know it worked?), and what you are NOT building. Keep it to one page.\n2. Prioritize 5 backlog items using a scoring framework of your choice (RICE, MoSCoW, or ICE). Show your work: state the score components and the final ranking. The 5 items are: (a) Zapier integration, (b) dark mode, (c) CSV export bug fix, (d) multi-seat billing, (e) mobile app.\n3. Write the weekly product update (3-5 bullets) for the all-hands channel. One bullet must reference the integrations roadmap. Keep it non-technical and readable by anyone in the company.\n\nYou are balancing sales requests, user value, and engineering capacity. Be decisive.",
    "deliverables": [
      {
        "filename": "zapier-integration-one-pager.md",
        "description": "One-pager: problem, proposed solution, success metrics, out-of-scope"
      },
      {
        "filename": "backlog-prioritization.md",
        "description": "5-item prioritized backlog with scoring framework, component scores, and rationale"
      },
      {
        "filename": "product-weekly-update.md",
        "description": "3-5 bullets for all-hands, non-technical, integrations roadmap reference included"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1199.00",
        "url": "https://www.onetonline.org/link/summary/13-1199.00",
        "quote": "Confer with personnel concerned to ensure successful functioning of newly implemented systems or procedures."
      },
      {
        "source": "O*NET",
        "code": "13-1199.00",
        "url": "https://www.onetonline.org/link/summary/13-1199.00",
        "quote": "Gather and organize information on problems or procedures."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/management-analysts.htm",
        "quote": "Management analysts recommend new systems, procedures, or organizational changes to improve efficiency."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "PROD-L05-Elena"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the one-pager include problem, solution, metrics, and out-of-scope sections?",
        "Are all 5 backlog items scored and ranked?",
        "Does the weekly update contain 3-5 bullets?",
        "Does the weekly update mention the integrations roadmap?"
      ],
      "quality": [
        "Does the one-pager fit one page (not a sprawling PRD)?",
        "Are success metrics measurable (not 'users will be happier')?",
        "Is the out-of-scope section explicit about what is cut?",
        "Does the prioritization show scoring components, not just opinions?",
        "Is the weekly update written for a non-technical audience?"
      ],
      "accuracy": [
        "Does the scoring framework produce a defensible order (e.g., CSV bug fix above dark mode)?",
        "Do the success metrics correspond to the stated problem?",
        "Is the Zapier integration scoped realistically (not a full iPaaS platform)?",
        "Are backlog scoring components plausible given a typical SaaS context?",
        "Does the weekly update accurately reflect what was described in the other deliverables?"
      ],
      "handoff": [
        "Could PROD-L05-Elena present the one-pager to a senior stakeholder without modification?",
        "Is the backlog ranking ready to drop into a sprint planning meeting?",
        "Could the all-hands update be copy-pasted into Slack without editing?",
        "Are assumptions in the one-pager made explicit?",
        "Does Nadia flag open questions for upstream review?"
      ]
    }
  },
  {
    "id": "PROD-L03-Kai",
    "dept": "PROD",
    "level": 3,
    "title": "Senior Product Manager",
    "name": "Kai",
    "timeBudgetMin": 25,
    "brief": "You are Kai, a Senior Product Manager. You own the collaboration feature area — real-time editing, comments, and sharing. You have an important inbound today: CS-L06-Lakshmi has sent over a consolidated bug list and feature request summary from the customer success team.\n\nYour day:\n\n1. Read Lakshmi's input (assume it contains: 3 bug reports around comment threading, 2 sharing permission edge cases, and 5 feature requests ranked by customer impact). Write a triage memo that: classifies each item as Bug/Enhancement/Won't Fix with a one-line rationale, assigns a rough priority (P0/P1/P2), and calls out any item that needs engineering investigation before you can fully prioritize.\n2. Write a full Product Requirements Document (PRD) for the top-priority feature request from Lakshmi's list. The PRD should include: background and context, user stories (≥3), functional requirements (numbered list), success metrics, and out-of-scope. Target length: 2-3 pages.\n3. Draft a reply to Lakshmi summarizing your triage decisions and next steps. Professional but direct — she's a cross-functional peer, not a customer.\n\nYou own the requirements and the prioritization call. If Lakshmi's feature requests conflict with roadmap priorities, say so and explain the trade-off.",
    "deliverables": [
      {
        "filename": "cs-triage-memo.md",
        "description": "Triage of Lakshmi's input: Bug/Enhancement/Won't Fix, P0/P1/P2, investigation flags"
      },
      {
        "filename": "prd-collaboration-feature.md",
        "description": "Full PRD for top feature: background, ≥3 user stories, functional reqs, metrics, out-of-scope"
      },
      {
        "filename": "reply-to-lakshmi.md",
        "description": "Cross-functional response to CS-L06-Lakshmi: triage summary, next steps, trade-off transparency"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1199.00",
        "url": "https://www.onetonline.org/link/summary/13-1199.00",
        "quote": "Confer with personnel concerned to ensure successful functioning of newly implemented systems or procedures."
      },
      {
        "source": "O*NET",
        "code": "13-1199.00",
        "url": "https://www.onetonline.org/link/summary/13-1199.00",
        "quote": "Review forms and reports and confer with management and users about format, distribution, and purpose, identifying problems and improvements."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/management-analysts.htm",
        "quote": "Management analysts must work with managers and other employees who implement any recommended changes."
      }
    ],
    "upstreamDeskIds": [
      "CS-L06-Lakshmi"
    ],
    "downstreamDeskIds": [
      "PROD-L05-Elena"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the triage memo classify all 10 items (3 bugs + 2 edge cases + 5 requests)?",
        "Does the PRD include background, ≥3 user stories, numbered functional requirements, metrics, out-of-scope?",
        "Is the reply addressed to CS-L06-Lakshmi by name?",
        "Does the triage memo flag items needing engineering investigation?"
      ],
      "quality": [
        "Are triage rationales one line each (not essays)?",
        "Are PRD user stories written in standard format (As a… I want… So that…)?",
        "Are functional requirements numbered and unambiguous?",
        "Does the reply to Lakshmi acknowledge her input and give clear next steps?",
        "Are success metrics tied to the specific feature (not generic 'NPS improvement')?"
      ],
      "accuracy": [
        "Are bug reports classified as Bugs (not Enhancements)?",
        "Are P0 items genuinely urgent (not just popular feature requests)?",
        "Does the PRD scope match the top-priority request, not a different one?",
        "Does Kai name actual trade-offs when deprioritizing items?",
        "Is the PRD internally consistent (requirements match user stories)?"
      ],
      "handoff": [
        "Could PROD-L05-Elena synthesize this PRD into a roadmap review without rework?",
        "Could an engineer estimate the top feature from the PRD alone?",
        "Could CS-L06-Lakshmi close the loop with customers from Kai's reply?",
        "Are investigation-flagged items clearly actionable for engineering?",
        "Does Kai surface any blocker that requires senior input?"
      ]
    }
  },
  {
    "id": "PROD-L04-Olamide",
    "dept": "PROD",
    "level": 4,
    "title": "Staff Product Manager",
    "name": "Olamide",
    "timeBudgetMin": 35,
    "brief": "You are Olamide, a Staff Product Manager. You are the most senior individual contributor on the product team, working across feature areas to drive cross-team initiatives. Today your focus is the annual OKR planning cycle and a multi-team dependency analysis.\n\nYour day:\n\n1. Draft the Product team's OKR proposal for next quarter. Write 2 Objectives with 3 Key Results each. Each Key Result must be measurable, have a baseline value and a target value, and name an owner (by role). Make the objectives ambitious but grounded — not marketing slogans.\n2. You've been asked to run a dependency audit for the next cycle. Three features are in flight across the product team: (a) real-time collaboration (Kai's area), (b) Zapier integration (Nadia's area), (c) mobile onboarding (Jorge's area). Write a dependency matrix: for each feature, list which engineering teams, design resources, and external dependencies it relies on. Flag any conflicts (two features needing the same design sprint, or same backend team).\n3. Write a 'definition of ready' checklist: what must be true before a feature enters engineering sprint planning. This will be used as the team standard going forward. 8-12 criteria, each a yes/no check.\n\nYou are operating at the intersection of strategy and execution. Your outputs should enable the Group PM to make trade-off calls with confidence.",
    "deliverables": [
      {
        "filename": "product-okr-proposal.md",
        "description": "2 Objectives × 3 Key Results, each with baseline, target, owner"
      },
      {
        "filename": "dependency-matrix.md",
        "description": "Cross-feature dependency matrix: engineering teams, design, external deps, conflict flags"
      },
      {
        "filename": "definition-of-ready.md",
        "description": "8-12 yes/no criteria that a feature must meet before entering sprint planning"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1199.00",
        "url": "https://www.onetonline.org/link/summary/13-1199.00",
        "quote": "Develop and implement records management program for filing, protection, and retrieval of records, and assure compliance with program."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Coordinate or participate in promotional activities or trade shows, working with developers, advertisers, or production managers, to market products or services."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/management-analysts.htm",
        "quote": "Management analysts must work with managers and other employees who implement any recommended changes."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "PROD-L05-Elena"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the OKR proposal have exactly 2 Objectives with 3 KRs each?",
        "Does each KR include a baseline, target, and owner?",
        "Does the dependency matrix cover all three features?",
        "Does the definition-of-ready have 8-12 criteria?"
      ],
      "quality": [
        "Are OKRs measurable (not aspirational platitudes)?",
        "Does the dependency matrix call out actual conflicts (not just list teams)?",
        "Are definition-of-ready criteria yes/no checkable (not subjective)?",
        "Is the OKR proposal scoped to one quarter (not a 3-year vision)?",
        "Are dependency conflicts actionable (with a suggested resolution)?"
      ],
      "accuracy": [
        "Are OKR baselines realistic for a 100-person SaaS company?",
        "Does the dependency matrix correctly identify shared resources as conflicts?",
        "Are definition-of-ready criteria consistent with standard PM practices?",
        "Are KR owners role-labeled (not generic 'product team')?",
        "Is the conflict analysis based on the actual features described (not invented ones)?"
      ],
      "handoff": [
        "Could PROD-L05-Elena use the OKR proposal in a stakeholder review without rewrites?",
        "Could the Group PM resolve flagged conflicts from the dependency matrix alone?",
        "Could any PM on the team use the definition-of-ready without additional explanation?",
        "Are open questions or blockers surfaced explicitly?",
        "Is the dependency matrix presented in a scannable table format?"
      ]
    }
  },
  {
    "id": "PROD-L05-Elena",
    "dept": "PROD",
    "level": 5,
    "title": "Group PM / Product Lead",
    "name": "Elena",
    "timeBudgetMin": 35,
    "brief": "You are Elena, Group PM and Product Lead. Your four ICs fed you their work today: Jorge (onboarding funnel analysis), Nadia (Zapier one-pager + backlog prioritization), Kai (CS triage memo + PRD for collaboration feature), and Olamide (OKR proposal + dependency matrix). You synthesize their output into the direction your manager Hassan needs.\n\nYour day:\n\n1. Write a sprint-end product summary (1 page max) for the Director of Product (PROD-L06-Hassan). Cover: what the team produced this sprint, what's at risk, and one decision you need Hassan to make.\n2. Using Olamide's OKR proposal as input, refine and finalize the product team's OKRs for presentation to Hassan. You may adjust wording, merge or split KRs, and add a brief (2-3 sentence) justification for each Objective.\n3. Write a feature-readiness assessment for the collaboration PRD Kai produced. Is it ready for engineering sprint planning? Use Olamide's definition-of-ready checklist as your scoring instrument. Provide a pass/fail for each criterion with a one-line note. Conclude with a go/no-go recommendation.\n4. Write a 2-3 sentence escalation note to Hassan on the most critical open dependency conflict from Olamide's matrix. State the conflict, the cost of not resolving it this week, and the decision you need from him.\n\nYou are the first management tier. Your job is to compress four ICs' work into clean signal for the Director.",
    "deliverables": [
      {
        "filename": "sprint-end-product-summary.md",
        "description": "1-page sprint summary: team output, risks, one decision needed from Hassan"
      },
      {
        "filename": "product-okrs-final.md",
        "description": "Refined OKR set: 2 Objectives × 3 KRs, with 2-3 sentence justification per Objective"
      },
      {
        "filename": "feature-readiness-assessment.md",
        "description": "Definition-of-ready scorecard for collaboration PRD with go/no-go recommendation"
      },
      {
        "filename": "escalation-note-hassan.md",
        "description": "2-3 sentence escalation to PROD-L06-Hassan on dependency conflict requiring his decision"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Formulate, direct, or coordinate marketing activities or policies to promote products or services, working with advertising and promotion managers."
      },
      {
        "source": "O*NET",
        "code": "13-1199.00",
        "url": "https://www.onetonline.org/link/summary/13-1199.00",
        "quote": "Analyze data gathered and develop solutions or alternative methods of proceeding."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/management-analysts.htm",
        "quote": "Management analysts recommend new systems, procedures, or organizational changes to improve efficiency."
      }
    ],
    "upstreamDeskIds": [
      "PROD-L01-Jorge",
      "PROD-L02-Nadia",
      "PROD-L03-Kai",
      "PROD-L04-Olamide"
    ],
    "downstreamDeskIds": [
      "PROD-L06-Hassan"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the sprint summary reference all four upstream ICs' work?",
        "Does the OKR doc include justification sentences for each Objective?",
        "Does the readiness assessment score each definition-of-ready criterion?",
        "Does the escalation note name the specific conflict and the decision needed?"
      ],
      "quality": [
        "Is the sprint summary scannable in <3 minutes?",
        "Does the OKR refinement add analytical value over Olamide's draft (not just reformatting)?",
        "Is the go/no-go recommendation explicit (not 'it depends')?",
        "Is the escalation note under half a page (not a full brief)?",
        "Is the writing decisive and managerial in tone?"
      ],
      "accuracy": [
        "Does Elena correctly characterize each IC's contribution?",
        "Does the readiness scorecard apply Olamide's criteria correctly to Kai's PRD?",
        "Does the escalation note identify the most critical conflict (not a minor one)?",
        "Are the refined OKRs still measurable after Elena's edits?",
        "Does the sprint summary identify real risks (not invented ones)?"
      ],
      "handoff": [
        "Could PROD-L06-Hassan run a product review with the team from the sprint summary?",
        "Could Hassan make the dependency decision from the escalation note without follow-up?",
        "Is Kai's PRD status (go/no-go) clear enough to communicate back to engineering?",
        "Are upstream attributions clear (who produced what)?",
        "Are blockers that require Hassan's authority flagged explicitly?"
      ]
    }
  },
  {
    "id": "PROD-L06-Hassan",
    "dept": "PROD",
    "level": 6,
    "title": "Director of Product",
    "name": "Hassan",
    "timeBudgetMin": 35,
    "brief": "You are Hassan, Director of Product. You manage a team of 5 PMs through Elena (Group PM). Today you received Elena's sprint synthesis, escalation note, and the refined OKRs. You also have a stakeholder alignment meeting to prep for and a PM performance review cycle to kick off.\n\nYour day:\n\n1. Review Elena's sprint summary and escalation note. Write a decision record resolving the dependency conflict she escalated: state the decision, the rationale, the trade-offs you are accepting, and who owns follow-through. This will be shared with Elena and the engineering leads.\n2. Write the product team's quarterly roadmap memo (1.5 pages): the 3-4 themes for the quarter, what we are deliberately NOT doing, and the one bet that if it works will matter most. This is the document that goes to the VP (PROD-L08-Diego) for approval.\n3. Prepare a 30-minute stakeholder alignment agenda for a cross-functional meeting with Engineering, Design, and CS. The agenda should include: pre-read link, objective of the meeting, 4-5 agenda items with time allocations, and desired outcomes.\n4. Write 2-3 performance coaching notes — one for an IC who is excelling (Jorge), one who is developing well (Nadia), one who needs a direct conversation about scope creep (assume a generic PM). Each note: 3-5 bullets, specific, actionable.\n\nYou are making calls that affect multiple teams. Be explicit about what you're deciding, not just recommending.",
    "deliverables": [
      {
        "filename": "dependency-decision-record.md",
        "description": "Decision on escalated conflict: decision, rationale, trade-offs, owner of follow-through"
      },
      {
        "filename": "quarterly-roadmap-memo.md",
        "description": "1.5-page roadmap: 3-4 themes, deliberate cuts, the one bet for the quarter"
      },
      {
        "filename": "stakeholder-alignment-agenda.md",
        "description": "30-min agenda: pre-read, objective, 4-5 timed items, desired outcomes"
      },
      {
        "filename": "pm-coaching-notes.md",
        "description": "3 coaching notes (excelling, developing, scope-creep) — 3-5 bullets each, specific"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Evaluate the financial aspects of product development, such as budgets, expenditures, research and development appropriations, or return-on-investment and profit-loss projections."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Establish and implement departmental policies, goals, objectives, and procedures, conferring with board members, organization officials, and staff members as necessary."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/marketing-managers.htm",
        "quote": "Marketing managers plan programs to generate interest in products or services and coordinate with other managers, including sales managers."
      }
    ],
    "upstreamDeskIds": [
      "PROD-L05-Elena"
    ],
    "downstreamDeskIds": [
      "PROD-L07-Mei"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the decision record include rationale and named follow-through owner?",
        "Does the roadmap memo name 3-4 themes and at least one explicit cut?",
        "Does the agenda have 4-5 timed items summing to ~30 minutes?",
        "Are there coaching notes for all three profiles (excelling, developing, scope-creep)?"
      ],
      "quality": [
        "Is the decision record a decision (not a recommendation to keep discussing)?",
        "Does the roadmap memo identify 'the one bet' explicitly?",
        "Is the agenda structured to reach a decision (not just share updates)?",
        "Are coaching notes specific to the individual (not copy-paste generic feedback)?",
        "Is the roadmap framing compelling enough for VP-level review?"
      ],
      "accuracy": [
        "Does the decision record address the specific conflict Elena escalated?",
        "Are roadmap themes consistent with the OKRs Elena refined?",
        "Do the agenda desired outcomes match the meeting's stated objective?",
        "Are coaching notes calibrated to seniority (APM vs PM feedback differs)?",
        "Does the 'one bet' in the roadmap have a clear hypothesis (not just an area)?",
        "Are trade-offs in the decision record honest (not just upside framing)?"
      ],
      "handoff": [
        "Could PROD-L07-Mei absorb the roadmap memo for a VP presentation without rework?",
        "Could Elena communicate the dependency decision to engineering from the decision record?",
        "Could the meeting participants prepare from the agenda alone?",
        "Could HR use the coaching notes to contextualize performance review ratings?",
        "Are next-step owners and deadlines named in at least the decision record and roadmap?"
      ]
    }
  },
  {
    "id": "PROD-L07-Mei",
    "dept": "PROD",
    "level": 7,
    "title": "Senior Director of Product",
    "name": "Mei",
    "timeBudgetMin": 45,
    "brief": "You are Mei, Senior Director of Product. You oversee multiple product areas through Hassan (Director) and report to Diego (VP of Product). Your scope spans the full product surface — you are responsible for the coherence of the product strategy across all teams.\n\nYour day:\n\n1. You have Hassan's quarterly roadmap memo. Write an executive summary (half page) suitable for the VP. Compress Hassan's themes into a narrative arc: where the product is today, what changes this quarter, and the one strategic assumption that must hold for the plan to work. Do not just re-list themes — synthesize them.\n2. Write a cross-functional product strategy brief (2 pages) that frames how Product, Engineering, Design, and CS will operate together this quarter. Cover: shared goals, key interfaces between teams, and how trade-offs will be adjudicated when teams disagree.\n3. Write a product metrics dashboard spec: list 8-10 product KPIs the company should track, organized by layer (acquisition, activation, retention, revenue). For each: metric name, definition, current value (use realistic estimates), target, and the team responsible for moving it.\n4. Prepare a 'state of the product' brief for new hires joining the product team this quarter — 1 page covering current product, market position, team structure, and top 3 priorities.\n\nYou are operating at strategic altitude but you must stay grounded in Hassan's operational output. Your synthesis is what makes Diego's VP decisions tractable.",
    "deliverables": [
      {
        "filename": "roadmap-exec-summary.md",
        "description": "Half-page VP-ready summary: narrative arc, strategic assumption for the quarter"
      },
      {
        "filename": "cross-functional-strategy-brief.md",
        "description": "2-page operating brief: shared goals, team interfaces, trade-off adjudication"
      },
      {
        "filename": "product-metrics-dashboard-spec.md",
        "description": "8-10 KPIs by AARRR layer: name, definition, current, target, owner"
      },
      {
        "filename": "state-of-product-new-hire.md",
        "description": "1-page new-hire brief: product, market, team structure, top 3 priorities"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Establish and implement departmental policies, goals, objectives, and procedures, conferring with board members, organization officials, and staff members as necessary."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Use sales forecasting or strategic planning to ensure the sale and profitability of products or services, analyzing business developments and monitoring market trends."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Direct and coordinate activities of businesses or departments concerned with the production, pricing, sales, or distribution of products."
      }
    ],
    "upstreamDeskIds": [
      "PROD-L06-Hassan"
    ],
    "downstreamDeskIds": [
      "PROD-L08-Diego"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the exec summary name the one strategic assumption?",
        "Does the cross-functional brief cover all four teams (Product, Eng, Design, CS)?",
        "Does the metrics spec include 8-10 KPIs with current and target values?",
        "Is the new-hire brief under one page?"
      ],
      "quality": [
        "Does the exec summary synthesize (not just list) Hassan's themes?",
        "Does the cross-functional brief explain HOW trade-offs are resolved (a process)?",
        "Are all KPI definitions unambiguous (one could implement tracking from them)?",
        "Is the strategic assumption falsifiable (not a truism)?",
        "Is the new-hire brief accessible to someone who just started their first PM role?"
      ],
      "accuracy": [
        "Does the exec summary accurately reflect Hassan's roadmap inputs?",
        "Are KPI current values realistic for a 100-person SaaS at typical growth stage?",
        "Does the cross-functional brief address the real friction points between Product and Engineering?",
        "Are team interfaces in the brief specific enough to be actionable?",
        "Are the top 3 priorities in the new-hire brief consistent with the OKRs upstream?"
      ],
      "handoff": [
        "Could PROD-L08-Diego approve or adjust the roadmap from the exec summary alone?",
        "Could Hassan run a cross-functional planning meeting from the strategy brief?",
        "Could a data analyst build the metrics dashboard from the spec without a follow-up meeting?",
        "Could a new PM understand their first-week priorities from the new-hire brief?",
        "Are downstream consumers named in the relevant deliverables?"
      ]
    }
  },
  {
    "id": "PROD-L08-Diego",
    "dept": "PROD",
    "level": 8,
    "title": "VP of Product",
    "name": "Diego",
    "timeBudgetMin": 45,
    "brief": "You are Diego, VP of Product. You own the product strategy and report to the CPO (Anika). Your most important output today is the roadmap — it goes to engineering to drive the next cycle plan. ENG-L07-Ravi is waiting on you to kick off cycle planning.\n\nYour day:\n\n1. Write the quarterly roadmap document for the engineering cycle plan hand-off (this goes to ENG-L07-Ravi). The document must include: the 3-4 product bets for the quarter, success criteria for each, estimated engineering team allocation (%), known constraints and risks, and a sequencing recommendation (which to start first). This is the primary cross-dept output of your role today.\n2. Write a hiring strategy memo for the product org: current team shape, gaps, 2-3 open roles you're seeking to fill next quarter, and the rationale for prioritizing those over alternatives. This goes to Anika for approval and to HR for sourcing.\n3. Write a 'product principles' document for the team — 5-7 short principles that guide product decisions at this company. Not aspirational posters — operational rules that change what you build and what you don't.\n4. Prepare a VP update for the CPO's weekly: 5-7 bullets covering wins, risks, a decision you made, and one ask from Beatrix.\n\nYou are the highest operational level in product. Below you is execution; above you is strategy and governance.",
    "deliverables": [
      {
        "filename": "quarterly-roadmap-eng-handoff.md",
        "description": "Roadmap for ENG-L07-Ravi: 3-4 bets, success criteria, team allocation %, constraints, sequencing"
      },
      {
        "filename": "product-hiring-strategy.md",
        "description": "Hiring memo: current team shape, gaps, 2-3 open roles with rationale — for CPO + HR"
      },
      {
        "filename": "product-principles.md",
        "description": "5-7 operational product principles that shape build decisions"
      },
      {
        "filename": "vp-update-for-cpo.md",
        "description": "5-7 bullets: wins, risks, a decision made, one ask from Beatrix"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Establish and implement departmental policies, goals, objectives, and procedures, conferring with board members, organization officials, and staff members as necessary."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Direct and coordinate activities of businesses or departments concerned with the production, pricing, sales, or distribution of products."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Use sales forecasting or strategic planning to ensure the sale and profitability of products or services, analyzing business developments and monitoring market trends."
      }
    ],
    "upstreamDeskIds": [
      "PROD-L07-Mei"
    ],
    "downstreamDeskIds": [
      "PROD-L09-Anika",
      "ENG-L07-Ravi"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the roadmap handoff include team allocation percentages?",
        "Does the roadmap handoff include a sequencing recommendation?",
        "Does the hiring memo name 2-3 specific open roles?",
        "Does the product principles doc have 5-7 distinct principles?"
      ],
      "quality": [
        "Are the engineering allocation percentages specific (not just 'most of the team')?",
        "Do product principles read as operational rules (not wall-art slogans)?",
        "Does the roadmap include known constraints (not just upside)?",
        "Is the hiring rationale defensible (trade-off explanation, not just a wish list)?",
        "Is the CPO update concise enough to scan in 2 minutes?"
      ],
      "accuracy": [
        "Are roadmap bets consistent with Mei's exec summary upstream?",
        "Does the sequencing recommendation acknowledge the dependency conflicts flagged earlier?",
        "Are allocation percentages internally consistent (sum to 100%)?",
        "Do product principles reflect choices that are actually in tension (not easy agreements)?",
        "Does the one ask in the CPO update require Beatrix's authority (not something Diego can decide)?"
      ],
      "handoff": [
        "Could ENG-L07-Ravi begin cycle planning from the roadmap handoff document alone?",
        "Could PROD-L09-Anika approve or adjust the hiring plan without follow-up?",
        "Could the product team apply the principles to a real prioritization decision today?",
        "Is the CPO update structured so Anika can raise it in an exec meeting?",
        "Are downstream consumers (ENG-L07-Ravi) named explicitly in the roadmap doc?"
      ]
    }
  },
  {
    "id": "PROD-L09-Anika",
    "dept": "PROD",
    "level": 9,
    "title": "SVP of Product",
    "name": "Anika",
    "timeBudgetMin": 55,
    "brief": "You are Anika, SVP of Product. You report to the CPO (Beatrix) and sit on the executive team. You are responsible for the product organization's strategic direction, budget, and cross-functional relationships at the exec level. Today is a high-stakes planning day.\n\nYour day:\n\n1. Write the quarterly product strategy narrative (2-3 pages) for the executive team and board packet. This is not a roadmap — it is the argument for WHY the roadmap is right. Cover: customer problem we're solving for, competitive landscape summary, our chosen strategic position, and why the choices we're making compound over time. This gets read by the CEO and the board.\n2. Review Diego's product principles document. Write a critical assessment: which principles are operational and battle-tested, which are aspirational and risk becoming ignored, and what you would add or cut. Be specific and direct.\n3. Write an exec alignment memo on the product-engineering relationship for the next cycle. The handoff from Diego to ENG-L07-Ravi is in flight — you want to pre-empt typical friction points. Cover: joint ownership expectations, how trade-offs are escalated, and what 'done' means for a feature before the product team hands off quality ownership to CS.\n4. Write your CPO 1:1 prep (5-7 bullets): wins, risks, a proposal for Beatrix, and one strategic question you want her read on before the board meeting.\n\nYou are the integrator between product execution and company strategy. Your documents are the scaffolding for decisions that span quarters.",
    "deliverables": [
      {
        "filename": "product-strategy-narrative.md",
        "description": "2-3 page exec/board narrative: customer problem, competitive position, why these bets compound"
      },
      {
        "filename": "product-principles-assessment.md",
        "description": "Critical review of Diego's principles: operational vs aspirational, additions and cuts"
      },
      {
        "filename": "product-engineering-exec-alignment.md",
        "description": "Exec alignment memo: joint ownership, escalation paths, definition of feature done"
      },
      {
        "filename": "cpo-1on1-prep.md",
        "description": "5-7 bullets for Beatrix: wins, risks, a proposal, one strategic question for board"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Review reports submitted by staff members to recommend approval or to suggest changes."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Establish and implement departmental policies, goals, objectives, and procedures, conferring with board members, organization officials, and staff members as necessary."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Use sales forecasting or strategic planning to ensure the sale and profitability of products or services, analyzing business developments and monitoring market trends."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "PROD-L08-Diego"
    ],
    "downstreamDeskIds": [
      "PROD-L10-Beatrix"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the strategy narrative cover all four sections (customer problem, competition, position, compounding)?",
        "Does the principles assessment give a specific recommendation for each principle?",
        "Does the alignment memo address escalation paths explicitly?",
        "Are 5-7 CPO 1:1 bullets present including a proposal and a strategic question?"
      ],
      "quality": [
        "Does the strategy narrative make an argument (not just describe the roadmap)?",
        "Is the competitive analysis specific (names real competitive categories, not 'the market')?",
        "Is the principles assessment direct about what should be cut (not just praise)?",
        "Does the alignment memo define 'done' unambiguously?",
        "Is the 1:1 prep written as if Beatrix has 3 minutes (tight, no padding)?"
      ],
      "accuracy": [
        "Does the strategy narrative align with Diego's roadmap and Mei's exec summary upstream?",
        "Is the 'compounding' argument logically sound (not just asserted)?",
        "Are the escalation paths in the alignment memo realistic for a 100-person company?",
        "Does the principles critique demonstrate understanding of what makes a good operational principle?",
        "Is the strategic question for Beatrix something that requires board-level input?"
      ],
      "handoff": [
        "Could a board member read the strategy narrative and understand the product strategy?",
        "Could PROD-L10-Beatrix walk into a board meeting using the strategy narrative as a pre-read?",
        "Could Diego use the alignment memo to frame the engineering relationship without Anika present?",
        "Is the proposal in the 1:1 prep clearly framed as a decision request (not an update)?",
        "Are downstream consumers and decision points named explicitly?"
      ]
    }
  },
  {
    "id": "PROD-L10-Beatrix",
    "dept": "PROD",
    "level": 10,
    "title": "Chief Product Officer",
    "name": "Beatrix",
    "timeBudgetMin": 55,
    "brief": "You are Beatrix, Chief Product Officer. You sit on the executive team, report to the CEO, and own the product vision for the entire company. Today is a board-prep week and a major strategic decision is on the table: whether to expand into a second product line or deepen the core product.\n\nYour day:\n\n1. Write the product vision memo for the board (1-2 pages). Where is this product going in 18-24 months? What is the durable wedge — the thing that makes the product genuinely hard to copy? What is the one bet that, if right, changes the trajectory of the company? The board has limited time. Every sentence must earn its place.\n2. Write a strategic options memo on the product expansion question: (a) double-down on core product, (b) launch adjacent product line, (c) platform play (open APIs + ecosystem). For each option: investment required, expected outcome, risk, and your recommendation with a clear rationale. Do not hedge — choose one and defend it.\n3. Board meeting prep: write the product section of the board pre-read (1 page). Cover: product health metrics (use real-looking numbers), top 3 risks, and 1-2 decisions you need from the board.\n4. CEO 1:1 prep: 5-7 bullets for your CEO meeting tomorrow. Mix: a win you want credited to the product org, an organizational ask, a risk the CEO needs to own, and the one strategic conversation you don't want them to be blindsided by in the board meeting.\n\nAt this level, your job is to be right about the future, and to make the case compellingly enough that the organization can act on it.",
    "deliverables": [
      {
        "filename": "product-vision-board-memo.md",
        "description": "1-2 page board memo: 18-24 month vision, durable wedge, one trajectory-changing bet"
      },
      {
        "filename": "strategic-options-memo.md",
        "description": "3-option analysis: core deepening, adjacent product, platform play — with explicit recommendation"
      },
      {
        "filename": "board-pre-read-product.md",
        "description": "1-page board pre-read: product health metrics, top 3 risks, 1-2 decisions needed from board"
      },
      {
        "filename": "ceo-1on1-prep.md",
        "description": "5-7 bullets: win to credit, org ask, risk for CEO to own, board blindspot conversation"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Direct, plan, or implement policies, objectives, or activities of organizations or businesses to ensure continuing operations, to maximize returns on investments, or to increase productivity."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Analyze operations to evaluate performance of a company or its staff in meeting objectives or to determine areas of potential cost reduction, program improvement, or policy change."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Use sales forecasting or strategic planning to ensure the sale and profitability of products or services, analyzing business developments and monitoring market trends."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "PROD-L09-Anika"
    ],
    "downstreamDeskIds": [],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the vision memo name ONE durable wedge (not a list)?",
        "Does the strategic options memo cover all three options with a single explicit recommendation?",
        "Does the board pre-read include metrics, risks, AND board decisions needed?",
        "Are 5-7 CEO 1:1 bullets present with the four required elements?"
      ],
      "quality": [
        "Does the vision memo make an argument for why this wedge is durable (not just described)?",
        "Does the strategic options memo choose a path and defend it (not hedge across all three)?",
        "Are board pre-read metrics real-looking numbers (not 'metrics trending positively')?",
        "Does the strategic options memo honestly state the risk of the chosen option?",
        "Is every document scannable in <3 minutes?"
      ],
      "accuracy": [
        "Does the vision memo align with Anika's strategy narrative upstream?",
        "Are the three strategic options genuinely distinct (not variants of the same choice)?",
        "Are product health metrics plausible for a 100-person SaaS (ARR, NPS, activation rate)?",
        "Is the 'one bet' in the vision memo consistent with the recommended option in the strategic memo?",
        "Does the CEO prep include a risk that genuinely requires CEO authority to own?"
      ],
      "handoff": [
        "Could the CEO walk into the board meeting from the pre-read and vision memo alone?",
        "Could the CFO and CTO model the recommended strategic option from the options memo?",
        "Could Anika brief the board's product committee from the vision memo without Beatrix present?",
        "Does the CEO prep name a specific conversation (not a vague 'alignment needed')?",
        "Are next-step decisions framed as 'who decides, by when'?"
      ]
    }
  },
  {
    "id": "DES-L01-Lena",
    "dept": "DES",
    "level": 1,
    "title": "Junior Product Designer",
    "name": "Lena",
    "timeBudgetMin": 25,
    "brief": "You are Lena, a Junior Product Designer at a 100-person SaaS company. You have one design ticket and one small visual task in your queue today.\n\n1. Design ticket DES-1102: \"Empty state screen for the notifications panel when a user has zero notifications.\" Read the ticket, produce a set of low-fidelity wireframes (3 states: first-time user, cleared-all, error) and a brief annotation for each state explaining what the user sees and what action they should take next.\n\n2. Icon audit: the team lead flagged that the settings icon in the nav bar is visually inconsistent with the rest of the icon set. Review the provided icon reference sheet and produce a corrected SVG-ready icon spec (describe the geometry in terms of grid, stroke weight, corner radius) that matches the existing system.\n\nStay narrowly scoped. Do not redesign the panel layout or change copy you were not asked to change. One deliverable per task.",
    "deliverables": [
      {
        "filename": "empty-state-wireframes.figma-export.png",
        "description": "Three annotated low-fidelity wireframe states (first-time, cleared-all, error) with per-state annotations"
      },
      {
        "filename": "icon-spec.md",
        "description": "Corrected settings icon specification: grid size, stroke weight, corner radius, alignment notes"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "27-1024.00",
        "url": "https://www.onetonline.org/link/summary/27-1024.00",
        "quote": "Create designs, concepts, and sample layouts, based on knowledge of layout principles and esthetic design concepts."
      },
      {
        "source": "O*NET",
        "code": "15-1255.00",
        "url": "https://www.onetonline.org/link/summary/15-1255.00",
        "quote": "Develop Web site maps, application models, image templates, or page templates that meet project goals, user needs, or industry standards."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "DES-L05-Yael"
    ],
    "rubric": {
      "completion": [
        "Did Lena produce wireframes for all three empty states (first-time, cleared-all, error)?",
        "Does each wireframe have a written annotation explaining user context and next action?",
        "Is the icon spec deliverable present as a separate file?",
        "Does the icon spec address grid, stroke weight, and corner radius?",
        "Did Lena stay within the stated scope (no unsolicited panel redesign)?"
      ],
      "quality": [
        "Are the wireframes low-fidelity (not high-polish) and focused on layout logic?",
        "Do annotations communicate intent clearly without design jargon overload?",
        "Is the icon spec precise enough for an engineer to implement without follow-up?",
        "Are the three wireframe states visually distinguishable from each other?",
        "Is the writing concise (no filler or apologies)?"
      ],
      "accuracy": [
        "Does the first-time empty state differ meaningfully from the cleared-all state?",
        "Does the error state communicate failure mode without alarming the user unnecessarily?",
        "Does the icon spec reference the same grid unit as the rest of the design system?",
        "Are the annotations accurate about what the user should do next?",
        "Does the corrected icon address the specific inconsistency flagged?"
      ],
      "handoff": [
        "Could DES-L05-Yael review both deliverables in under 5 minutes?",
        "Are filenames consistent with the ticket number referenced in the brief?",
        "Did Lena flag any ambiguity or missing context from the ticket?",
        "Is the icon spec self-contained (no missing reference to external files)?",
        "Are annotations written for a developer audience, not just a designer?"
      ]
    }
  },
  {
    "id": "DES-L02-Issa",
    "dept": "DES",
    "level": 2,
    "title": "Product Designer",
    "name": "Issa",
    "timeBudgetMin": 25,
    "brief": "You are Issa, a Product Designer. You have two related tasks today that both feed the upcoming onboarding redesign initiative.\n\n1. Wireframe the new user onboarding flow: 4-6 screens covering account setup, first workspace creation, team invite, and the 'aha moment' screen. Each screen needs annotated interaction notes — what tapping/clicking each element does, any conditional logic (e.g., 'skip if solo user'), and microcopy placeholders.\n\n2. Conduct a lightweight competitive audit: pick 2 comparable SaaS onboarding flows (name them, describe 2-3 design patterns each uses), then write a 1-page synthesis of what patterns we should borrow and what we should avoid. This informs the Design Lead's synthesis.\n\nYour wireframes are mid-fidelity — enough to communicate structure and interaction, not pixel-perfect. Prioritize flow logic over visual polish.",
    "deliverables": [
      {
        "filename": "onboarding-wireframes.figma-export.png",
        "description": "4-6 annotated mid-fidelity screens covering account setup, workspace creation, team invite, aha moment"
      },
      {
        "filename": "competitive-audit.md",
        "description": "2 competitor onboarding flows analyzed, patterns catalogued, 1-page synthesis of borrow/avoid"
      },
      {
        "filename": "interaction-notes.md",
        "description": "Per-screen interaction notes: tap targets, conditional logic, microcopy placeholders"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "15-1255.00",
        "url": "https://www.onetonline.org/link/summary/15-1255.00",
        "quote": "Conduct user research to determine design requirements and analyze user feedback to improve design quality."
      },
      {
        "source": "O*NET",
        "code": "27-1024.00",
        "url": "https://www.onetonline.org/link/summary/27-1024.00",
        "quote": "Prepare illustrations or rough sketches of material, discussing them with clients or supervisors and making necessary changes."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "DES-L05-Yael"
    ],
    "rubric": {
      "completion": [
        "Are 4-6 onboarding screens produced?",
        "Do screens cover all four stages (account setup, workspace, invite, aha moment)?",
        "Are 2 competitors named and analyzed with 2-3 patterns each?",
        "Is a borrow/avoid synthesis present as a separate document?",
        "Are interaction notes separated from the wireframe annotations?"
      ],
      "quality": [
        "Are wireframes mid-fidelity (not just boxes with no structure)?",
        "Does the competitive audit reference real, comparable SaaS products?",
        "Does the synthesis make concrete, actionable recommendations?",
        "Are conditional logic branches (e.g., solo vs. team) visually indicated?",
        "Is the writing scannable and free of vague design-speak?"
      ],
      "accuracy": [
        "Do the screens cover a realistic onboarding sequence without missing steps?",
        "Are the competitor patterns accurately described (not invented)?",
        "Does the synthesis connect competitor observations to this product's context?",
        "Are microcopy placeholders written in the correct tone and length?",
        "Are interaction notes technically plausible for a typical web app?"
      ],
      "handoff": [
        "Could DES-L05-Yael include these wireframes in a design review without rework?",
        "Are the interaction notes usable by an engineer without asking Issa for clarification?",
        "Is the competitive audit framed as design input, not just a feature list?",
        "Are screen names/IDs consistent across all three deliverables?",
        "Did Issa flag any open questions about the onboarding flow scope?"
      ]
    }
  },
  {
    "id": "DES-L03-Sofía",
    "dept": "DES",
    "level": 3,
    "title": "Senior Product Designer",
    "name": "Sofía",
    "timeBudgetMin": 25,
    "brief": "You are Sofía, a Senior Product Designer. You own end-to-end design for the permissions management UI — a new feature that lets workspace admins assign, revoke, and audit member roles. This work will be handed to engineering (ENG-L03-Chen) once approved.\n\nYour day:\n\n1. Design spec: produce a complete design specification document for the permissions UI. Cover: user flows (happy path + 2 edge cases), component inventory (which existing design system components are used vs. which are net-new), accessibility requirements (WCAG 2.1 AA minimum), and responsive behavior for 1280px and 375px breakpoints.\n2. Prototype notes: write a Figma prototype plan — which screens are linked, what interactions are demonstrated (hover states, modal open/close, role change confirmation), and what is intentionally left static.\n3. Gap analysis: identify 2-3 areas where the product requirements are ambiguous or under-specified and write a short note on each that the Design Lead can escalate to Product.\n\nYou are the technical owner of this design. If the requirements are wrong, say so in writing.",
    "deliverables": [
      {
        "filename": "permissions-design-spec.md",
        "description": "Full design spec: user flows, component inventory, accessibility requirements, responsive breakpoints"
      },
      {
        "filename": "prototype-plan.md",
        "description": "Figma prototype plan: linked screens, demonstrated interactions, static sections"
      },
      {
        "filename": "requirements-gaps.md",
        "description": "2-3 ambiguous/under-specified areas flagged for Design Lead to escalate to Product"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "15-1255.00",
        "url": "https://www.onetonline.org/link/summary/15-1255.00",
        "quote": "Research and apply innovative solutions for product design, visuals, and user experience to meet the needs of individual Web development projects."
      },
      {
        "source": "O*NET",
        "code": "27-1024.00",
        "url": "https://www.onetonline.org/link/summary/27-1024.00",
        "quote": "Review final layouts and suggest improvements, as needed."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/computer-and-information-technology/web-developers.htm",
        "quote": "Web designers are responsible for the visual aspects of websites, including layout, color, and font choices."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "DES-L05-Yael"
    ],
    "rubric": {
      "completion": [
        "Is a full design spec produced covering flows, components, a11y, and responsive?",
        "Are 2 edge cases included in the user flows (not just the happy path)?",
        "Is the component inventory split between existing system components and net-new?",
        "Is the prototype plan present listing linked screens and demonstrated interactions?",
        "Are 2-3 requirements gaps identified with written notes?"
      ],
      "quality": [
        "Are user flows specific to the permissions feature (not generic CRUD flows)?",
        "Does the a11y section reference WCAG 2.1 AA criteria explicitly?",
        "Does the prototype plan distinguish what is interactive vs. static (not aspirational)?",
        "Are gap notes written clearly enough for a PM to act on without design context?",
        "Is the spec dense enough to replace a design walkthrough meeting?"
      ],
      "accuracy": [
        "Is the component inventory consistent with a realistic design system (no invented components)?",
        "Are the responsive breakpoints (1280px / 375px) technically plausible for a web SaaS?",
        "Do user flows cover both admin and non-admin perspectives where relevant?",
        "Are accessibility notes technically correct (not just 'add alt text')?",
        "Do the flagged gaps identify actual decision points, not preference questions?"
      ],
      "handoff": [
        "Could DES-L05-Yael pass the design spec to ENG-L03-Chen without supplementary briefing?",
        "Are gap notes framed as escalation items, not complaints?",
        "Is the prototype plan specific enough for a non-Figma user to understand?",
        "Are component names consistent with what engineering would expect?",
        "Did Sofía name the downstream engineering consumer (ENG-L03-Chen) in the spec?"
      ]
    }
  },
  {
    "id": "DES-L04-Tariq",
    "dept": "DES",
    "level": 4,
    "title": "Staff Designer",
    "name": "Tariq",
    "timeBudgetMin": 35,
    "brief": "You are Tariq, a Staff Designer. You operate across two workstreams simultaneously and your output today feeds the Design Lead's synthesis.\n\n1. Design system audit: the component library has grown organically over two years. Audit the button, input, and modal components for inconsistencies (variant gaps, naming drift, undocumented states). Produce a concise audit report with a severity rating (critical / moderate / minor) for each issue and a recommended resolution.\n\n2. Cross-team coordination: Product has shipped a new requirements doc for the data export flow. Engineering flagged a concern about the proposed drag-and-drop interaction — it conflicts with an existing keyboard-navigation pattern. Facilitate a written design decision record (DDR) that captures: the original requirement, the engineering constraint, two design options with tradeoffs, and a recommended direction. This DDR goes to the Design Lead for approval before implementation.\n\n3. Interaction flow doc: produce an interaction flow document (not wireframes) for the data export feature covering the full user journey from trigger to file download, including error paths, loading states, and cancellation.\n\nYou are the cross-team connector. Your job is to surface conflicts early and ship a clear decision, not to keep everyone happy.",
    "deliverables": [
      {
        "filename": "design-system-audit.md",
        "description": "Audit of button, input, and modal components: issues with severity ratings and recommended resolutions"
      },
      {
        "filename": "data-export-ddr.md",
        "description": "Design decision record: original requirement, engineering constraint, two options with tradeoffs, recommendation"
      },
      {
        "filename": "interaction-flow.md",
        "description": "Full interaction flow for data export: trigger to download, error paths, loading states, cancellation"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "27-1024.00",
        "url": "https://www.onetonline.org/link/summary/27-1024.00",
        "quote": "Determine size and arrangement of illustrative material and copy, and select style and size of type."
      },
      {
        "source": "O*NET",
        "code": "15-1255.00",
        "url": "https://www.onetonline.org/link/summary/15-1255.00",
        "quote": "Perform Web site tests according to planned schedules, or after any Web site or product revision."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/computer-and-information-technology/web-developers.htm",
        "quote": "Web designers are responsible for the visual aspects of websites, including layout, color, and font choices."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "DES-L05-Yael"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the audit cover all three component types (button, input, modal)?",
        "Does each audit issue have a severity rating?",
        "Does the DDR include two distinct design options, not one option and a status quo?",
        "Does the interaction flow cover error paths and loading states, not just the happy path?"
      ],
      "quality": [
        "Are audit severity ratings justified (not assigned arbitrarily)?",
        "Does the DDR make a clear recommendation rather than deferring the decision?",
        "Is the interaction flow specific to data export (not a generic download pattern)?",
        "Are engineering constraints represented accurately in the DDR?",
        "Is the audit actionable (resolutions, not just a list of problems)?"
      ],
      "accuracy": [
        "Are the component inconsistencies realistic (naming drift, missing states, etc.)?",
        "Does the DDR accurately characterize the keyboard-navigation conflict?",
        "Do tradeoffs in the DDR reflect real design and engineering concerns?",
        "Are loading states in the interaction flow technically accurate for async file generation?",
        "Are severity ratings calibrated (not everything critical)?"
      ],
      "handoff": [
        "Could DES-L05-Yael approve the DDR without convening a meeting?",
        "Could an engineer implement the interaction flow without follow-up clarification?",
        "Is the audit report structured so a PM can understand component debt without design context?",
        "Are open decisions flagged explicitly in the DDR?",
        "Did Tariq attribute the engineering constraint to a named upstream stakeholder?"
      ]
    }
  },
  {
    "id": "DES-L05-Yael",
    "dept": "DES",
    "level": 5,
    "title": "Design Lead",
    "name": "Yael",
    "timeBudgetMin": 35,
    "brief": "You are Yael, Design Lead. Your four ICs delivered today: Lena (empty-state wireframes + icon spec), Issa (onboarding wireframes + competitive audit), Sofía (permissions design spec + gap analysis), and Tariq (design system audit + DDR + interaction flow). You synthesize their work into a design sprint summary and ship a finalized design package to engineering.\n\nYour day:\n\n1. Sprint synthesis: write a 1-page design sprint summary that your manager (DES-L06-Kofi) can read in 3 minutes. Cover: what shipped, what's at risk, the one recommendation that matters most this week.\n2. Engineering handoff package: Sofía's permissions design spec is approved. Prepare the formal handoff note to ENG-L03-Chen — include a link to the Figma file, a summary of net-new components, the accessibility requirements, and the list of open questions that engineering must resolve before starting implementation.\n3. Design critique notes: pick ONE of the four IC deliverables and write a substantive critique. What is working, what should be revised, and what would make it production-ready.\n4. Design system priority list: using Tariq's audit as input, produce a prioritized list of 5-7 component fixes for the next design system sprint, with a one-sentence rationale per item.",
    "deliverables": [
      {
        "filename": "design-sprint-summary.md",
        "description": "1-page sprint summary: shipped, at-risk, one recommendation for DES-L06-Kofi"
      },
      {
        "filename": "eng-handoff-permissions.md",
        "description": "Formal handoff note to ENG-L03-Chen: Figma link, net-new components, a11y requirements, open questions"
      },
      {
        "filename": "design-critique.md",
        "description": "Substantive critique of one IC deliverable: what works, what to revise, what makes it production-ready"
      },
      {
        "filename": "design-system-priorities.md",
        "description": "5-7 component fixes prioritized for next design system sprint, with rationale per item"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "27-1024.00",
        "url": "https://www.onetonline.org/link/summary/27-1024.00",
        "quote": "Review final layouts and suggest improvements, as needed."
      },
      {
        "source": "O*NET",
        "code": "15-1255.00",
        "url": "https://www.onetonline.org/link/summary/15-1255.00",
        "quote": "Collaborate with management or users to develop e-commerce strategies and to integrate these strategies with Web sites."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/computer-and-information-technology/web-developers.htm",
        "quote": "Web designers are responsible for the visual aspects of websites, including layout, color, and font choices."
      }
    ],
    "upstreamDeskIds": [
      "DES-L01-Lena",
      "DES-L02-Issa",
      "DES-L03-Sofía",
      "DES-L04-Tariq"
    ],
    "downstreamDeskIds": [
      "DES-L06-Kofi",
      "ENG-L03-Chen"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the sprint summary reference all four upstream ICs' contributions?",
        "Does the engineering handoff note address net-new components, a11y, and open questions?",
        "Is the design critique substantive (specific, not generic)?",
        "Are 5-7 design system priorities listed with rationale?"
      ],
      "quality": [
        "Is the sprint summary scannable in under 3 minutes?",
        "Does the engineering handoff give Chen everything needed without a follow-up meeting?",
        "Does the critique push back on something specific rather than just validating the work?",
        "Are design system priorities genuinely ranked (not alphabetical or random)?",
        "Is the writing decisive, not diplomatic to the point of being useless?"
      ],
      "accuracy": [
        "Does Yael accurately characterize each IC's contribution in the sprint summary?",
        "Does the engineering handoff correctly identify which components are net-new vs. existing?",
        "Is the critique specific to the IC's actual deliverable (not a generic design checklist)?",
        "Do design system priorities reflect Tariq's severity ratings (critical items first)?",
        "Is the recommendation in the sprint summary supported by the upstream evidence?"
      ],
      "handoff": [
        "Could ENG-L03-Chen begin implementation from the handoff note without contacting Yael?",
        "Could DES-L06-Kofi run a 1:1 with each IC using the sprint summary?",
        "Are blockers from the team flagged explicitly to the manager?",
        "Is the design system priority list ready to drop into a sprint planning meeting?",
        "Does the handoff note name ENG-L03-Chen explicitly as the recipient?"
      ]
    }
  },
  {
    "id": "DES-L06-Kofi",
    "dept": "DES",
    "level": 6,
    "title": "Design Manager",
    "name": "Kofi",
    "timeBudgetMin": 35,
    "brief": "You are Kofi, Design Manager. You manage five designers (Lena, Issa, Sofía, Tariq, and Yael) and own the team's execution quality and operational rhythm. Your manager is DES-L07-Mira.\n\nYour day:\n\n1. Team health check: based on the sprint summary from Yael (DES-L05), write a 1-page team status report for Mira. Include: output quality signal (what shipped and how good it is), one personnel note (a designer who is excelling or struggling), one process friction point, and your ask for the next two weeks.\n2. Design review prep: the onboarding redesign hits design review next week. Write a structured review agenda (5-7 items, each with facilitator name, time allocation, and the specific decision to be made). This is not a presentation — it is a decision-forcing agenda.\n3. Capacity plan: allocate the team's 35-minute design budget across the five open initiatives for the coming cycle. Show current/available allocation per designer, which initiative gets cut if a designer is sick, and your recommendation.\n4. Feedback delivery prep: write a concise performance note for one of your reports (pick any), suitable for a 1:1. Cover one strength, one growth area, one specific behavior to change, and one next step.",
    "deliverables": [
      {
        "filename": "team-status-report.md",
        "description": "1-page team status for DES-L07-Mira: output quality, personnel note, process friction, ask"
      },
      {
        "filename": "design-review-agenda.md",
        "description": "5-7 item structured review agenda with facilitator, time allocation, and decision per item"
      },
      {
        "filename": "capacity-plan.md",
        "description": "Cycle capacity allocation per designer, contingency if one is absent, recommendation"
      },
      {
        "filename": "performance-note.md",
        "description": "1:1 performance note for one report: strength, growth area, behavior to change, next step"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "27-1024.00",
        "url": "https://www.onetonline.org/link/summary/27-1024.00",
        "quote": "Confer with clients to discuss and determine layout design."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Direct the hiring, training, or performance evaluations of marketing or sales staff and oversee their daily activities."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/advertising-promotions-and-marketing-managers.htm",
        "quote": "Advertising, promotions, and marketing managers coordinate and assess the activities of their teams."
      }
    ],
    "upstreamDeskIds": [
      "DES-L05-Yael"
    ],
    "downstreamDeskIds": [
      "DES-L07-Mira"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the team status report cover output quality, personnel note, friction, and ask?",
        "Does the design review agenda have 5-7 items each with facilitator and decision?",
        "Does the capacity plan show per-designer allocation AND a contingency scenario?",
        "Does the performance note include all four elements (strength, growth, behavior, next step)?"
      ],
      "quality": [
        "Is the team status report honest (not just positive)?",
        "Is the design review agenda decision-forcing rather than informational?",
        "Is the capacity plan realistic (designers aren't scheduled at 100% capacity)?",
        "Is the performance note specific and behavioral (not vague praise/criticism)?",
        "Could all four documents be consumed in under 10 minutes total?"
      ],
      "accuracy": [
        "Does the team status reflect the actual state reported in Yael's sprint summary?",
        "Are the design review agenda items grounded in the real active work streams?",
        "Are capacity numbers internally consistent (don't sum to more than available hours)?",
        "Is the performance feedback specific to a real behavior, not a personality trait?",
        "Does the 'ask' in the status report align with a real blocker or need?"
      ],
      "handoff": [
        "Could DES-L07-Mira use the team status to brief up to DES-L08-Caelan?",
        "Could an IC facilitator run the design review from the agenda alone?",
        "Could Kofi hand off the capacity plan and have someone else manage the cycle?",
        "Is the performance note suitable to deliver verbatim in a 1:1?",
        "Are blockers and asks clearly attributed to Kofi (not deflected to the team)?"
      ]
    }
  },
  {
    "id": "DES-L07-Mira",
    "dept": "DES",
    "level": 7,
    "title": "Senior Design Manager",
    "name": "Mira",
    "timeBudgetMin": 45,
    "brief": "You are Mira, Senior Design Manager. You manage two design managers (Kofi and a second unnamed team) and own the design function's delivery across the full product surface. Your director is DES-L08-Caelan.\n\nYour day:\n\n1. Cycle plan: the new product cycle starts in one week. Write a two-page cycle ownership plan that covers: the three highest-priority design initiatives (with stated rationale), which manager owns each, the research work that needs to happen before design starts, and the definition of done for each initiative.\n2. Design quality standard update: the team has been inconsistent on interaction documentation. Write a 1-page updated standard for how interaction flows should be documented — what must be included, what format is acceptable, and what triggers a rework request. This becomes a team-level operating norm.\n3. Hiring input: Caelan has asked for a staffing brief. Write a 1-2 page brief covering: current team composition by level and specialization, where the capability gaps are, the profile of the one hire that would have the highest leverage, and salary band guidance.\n4. Stakeholder update: Product leadership asked for a design status update on two key initiatives. Write a 1-page stakeholder memo (not for designers — for PMs and execs) covering progress, risk, and what they need to decide.",
    "deliverables": [
      {
        "filename": "cycle-plan.md",
        "description": "Two-page cycle ownership plan: top 3 initiatives, owners, research prerequisites, definition of done"
      },
      {
        "filename": "interaction-doc-standard.md",
        "description": "1-page updated interaction documentation standard: required elements, format, rework triggers"
      },
      {
        "filename": "staffing-brief.md",
        "description": "1-2 page staffing brief: team composition, capability gaps, highest-leverage hire profile, salary band"
      },
      {
        "filename": "stakeholder-memo.md",
        "description": "1-page stakeholder memo for PM/exec: design progress, risk, decisions needed"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Formulate, direct, or coordinate marketing activities or policies to promote products or services, working with advertising or promotion managers."
      },
      {
        "source": "O*NET",
        "code": "27-1024.00",
        "url": "https://www.onetonline.org/link/summary/27-1024.00",
        "quote": "Research the target audience of projects."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/advertising-promotions-and-marketing-managers.htm",
        "quote": "Advertising, promotions, and marketing managers coordinate and assess the activities of their teams."
      }
    ],
    "upstreamDeskIds": [
      "DES-L06-Kofi"
    ],
    "downstreamDeskIds": [
      "DES-L08-Caelan"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the cycle plan cover all three initiatives with owner, research prereqs, and definition of done?",
        "Does the interaction doc standard specify what triggers a rework request?",
        "Does the staffing brief include salary band guidance?",
        "Is the stakeholder memo 1 page and targeted at non-designers?"
      ],
      "quality": [
        "Is the cycle plan genuinely prioritized (not a wish list of everything)?",
        "Is the interaction doc standard prescriptive enough to resolve the inconsistency it targets?",
        "Is the highest-leverage hire profile specific (seniority, specialization, experience markers)?",
        "Is the stakeholder memo written in PM/exec language (outcomes, not design process)?",
        "Are all four documents concrete rather than aspirational?"
      ],
      "accuracy": [
        "Does the cycle plan reflect the active work streams from Kofi's upstream status?",
        "Are the three prioritized initiatives consistent with known product priorities?",
        "Is the interaction doc standard technically consistent with current team practices?",
        "Is the salary band guidance realistic for a senior design hire in 2025?",
        "Does the stakeholder memo accurately reflect current design risks?"
      ],
      "handoff": [
        "Could DES-L08-Caelan brief the VP on design from the cycle plan and staffing brief?",
        "Could Kofi implement the interaction doc standard from the 1-pager alone?",
        "Is the stakeholder memo suitable to send directly to the product VP without edits?",
        "Are initiative owners named so Caelan can hold them accountable?",
        "Did Mira flag any decisions she needs from Caelan before the cycle starts?"
      ]
    }
  },
  {
    "id": "DES-L08-Caelan",
    "dept": "DES",
    "level": 8,
    "title": "Director of Design",
    "name": "Caelan",
    "timeBudgetMin": 45,
    "brief": "You are Caelan, Director of Design. You own the entire design function — product design, brand, and design systems — across a ~20-person design org. You report to the VP of Design (DES-L09-Rohan) and partner directly with the CPO and engineering leadership.\n\nYour day:\n\n1. Department strategy memo: write a 2-page strategy document covering: where the design function invests next quarter (with explicit cuts), what design's role is in the upcoming platform consolidation (partner or driver?), and what 'exceptional design quality' means for this company specifically.\n2. Design systems investment case: the design system team has a backlog of 40 open issues and three IC positions that have been vacant for 6 months. Write a 1-page business case for resolving this — cover the cost of inconsistency (developer time, QA debt, support tickets), the cost of hiring, and the risk of not acting.\n3. Hiring plan: headcount asks for next quarter by team and level, with cost of not filling each slot. (Feeds DES-L09-Rohan for budget discussions.)\n4. Brand guidelines review: the brand team produced a first draft of updated brand guidelines. Write a substantive review — what to approve, what to send back, and one principle that is currently missing from the guidelines entirely.",
    "deliverables": [
      {
        "filename": "design-dept-strategy.md",
        "description": "2-page strategy memo: investment areas, explicit cuts, design's role in platform consolidation, quality definition"
      },
      {
        "filename": "design-systems-business-case.md",
        "description": "1-page business case: cost of inconsistency, cost of hiring, risk of inaction"
      },
      {
        "filename": "hiring-plan.md",
        "description": "Headcount asks by team and level with cost-of-not-filling for each slot"
      },
      {
        "filename": "brand-guidelines-review.md",
        "description": "Substantive review: what to approve, what to revise, one missing principle"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Identify, develop, or evaluate marketing strategy, based on knowledge of establishment objectives, market characteristics, and cost and markup factors."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Evaluate the financial aspects of product development, such as budgets, expenditures, research and development appropriations, or return-on-investment and profit-loss projections."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/advertising-promotions-and-marketing-managers.htm",
        "quote": "Advertising, promotions, and marketing managers plan programs to generate interest in products or services."
      }
    ],
    "upstreamDeskIds": [
      "DES-L07-Mira"
    ],
    "downstreamDeskIds": [
      "DES-L09-Rohan"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the strategy memo cover invest, cut, platform role, and quality definition?",
        "Does the business case quantify cost of inconsistency (not just assert it)?",
        "Does the hiring plan include cost of not filling each slot?",
        "Does the brand review name exactly one missing principle?"
      ],
      "quality": [
        "Does the strategy memo make explicit cuts (not additions only)?",
        "Is the business case structured for a CFO/exec audience, not a design audience?",
        "Is the hiring plan defensible at a budget conversation?",
        "Is the brand guidelines review substantive (specific critiques, not 'looks good')?",
        "Is the quality definition in the strategy memo specific to this company's context?"
      ],
      "accuracy": [
        "Are the design system backlog numbers (40 issues, 3 vacancies) used consistently?",
        "Are cost-of-inconsistency estimates realistic (developer hours, QA overhead)?",
        "Does the strategy reflect Mira's cycle plan and staffing brief upstream?",
        "Is the brand review critique technically valid design feedback?",
        "Are headcount numbers internally consistent with current team size?"
      ],
      "handoff": [
        "Could DES-L09-Rohan take the hiring plan and business case into a budget meeting?",
        "Could the brand team act on the guidelines review without a follow-up call?",
        "Is the strategy memo ready for DES-L09-Rohan to brief the exec team?",
        "Are downstream decisions and owners named explicitly?",
        "Did Caelan flag what decisions Rohan needs to make before Caelan can proceed?"
      ]
    }
  },
  {
    "id": "DES-L09-Rohan",
    "dept": "DES",
    "level": 9,
    "title": "VP of Design",
    "name": "Rohan",
    "timeBudgetMin": 55,
    "brief": "You are Rohan, VP of Design. You sit on the product leadership team alongside the CPO, VP of Engineering, and VP of Product. You report to the Chief Design Officer (DES-L10-Ngozi) and represent design in all cross-functional forums.\n\nYour day:\n\n1. Design org quarterly review: prepare a 2-page quarterly review document for Ngozi. Cover: the design org's output and quality signal for the quarter, one win to publicize, one failure to own and what changes as a result, the team health signal, and the design org's goals for next quarter.\n2. Cross-functional alignment memo: the CPO wants to accelerate the platform consolidation by 6 weeks. Write a crisp memo (1 page) to the CPO laying out what that schedule change means for design capacity, what would have to be cut or descoped, and what you need from the CPO to commit to the accelerated timeline.\n3. Design strategy narrative: Ngozi has asked for a refreshed design strategy narrative to take to the board. Write a 1-page narrative (not a deck, a memo) that answers: what is this company's design philosophy, how is it differentiated, and why does it make the product harder to copy?\n4. VP peer prep: you have a quarterly sync with the VP of Engineering tomorrow. Write a 5-7 bullet prep note covering the shared topics, the one thing you want to resolve, and the one thing you're pre-committing to in front of them.",
    "deliverables": [
      {
        "filename": "design-quarterly-review.md",
        "description": "2-page quarterly review for Ngozi: output/quality signal, win, failure+fix, team health, next-quarter goals"
      },
      {
        "filename": "cpo-memo-timeline.md",
        "description": "1-page memo to CPO: capacity impact of 6-week acceleration, cuts needed, ask"
      },
      {
        "filename": "design-strategy-narrative.md",
        "description": "1-page board-ready narrative: design philosophy, differentiation, moat"
      },
      {
        "filename": "vp-sync-prep.md",
        "description": "5-7 bullet VP of Engineering sync prep: shared topics, one resolution target, one pre-commitment"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Use sales forecasting or strategic planning to ensure the sale and profitability of products, lines, or services, analyzing business developments and monitoring market trends."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Initiate market research studies, or analyze their findings."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/advertising-promotions-and-marketing-managers.htm",
        "quote": "Advertising, promotions, and marketing managers plan programs to generate interest in products or services."
      }
    ],
    "upstreamDeskIds": [
      "DES-L08-Caelan"
    ],
    "downstreamDeskIds": [
      "DES-L10-Ngozi"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the quarterly review cover all five sections (output, win, failure, team, goals)?",
        "Does the CPO memo state specific cuts or descopes, not just 'things will be affected'?",
        "Does the strategy narrative answer all three questions (philosophy, differentiation, moat)?",
        "Are 5-7 VP sync bullets present with resolution target and pre-commitment?"
      ],
      "quality": [
        "Does Rohan own the failure in the quarterly review (no deflection to the team)?",
        "Is the CPO memo written in CPO language (capacity, scope, risk — not design process)?",
        "Is the strategy narrative board-ready (no jargon, no hedging)?",
        "Does the VP sync prep identify a concrete resolution target, not a talking point?",
        "Is every document scannable in under 3 minutes?"
      ],
      "accuracy": [
        "Does the quarterly review align with Caelan's upstream strategy and hiring data?",
        "Is the 6-week acceleration impact realistic for a ~20-person design org?",
        "Is the design moat claim specific and defensible (not 'we care about users')?",
        "Are the VP sync topics appropriate to a design-engineering relationship?",
        "Does the next-quarter goal set reflect the failures and learnings of the quarter?"
      ],
      "handoff": [
        "Could DES-L10-Ngozi take the quarterly review into a board conversation?",
        "Could the CPO respond to Rohan's memo with a go/no-go decision?",
        "Is the design strategy narrative suitable to hand to the board without edits?",
        "Could the VP of Engineering run the sync from Rohan's prep note alone?",
        "Did Rohan flag what decisions or approvals are needed from Ngozi?"
      ]
    }
  },
  {
    "id": "DES-L10-Ngozi",
    "dept": "DES",
    "level": 10,
    "title": "Chief Design Officer",
    "name": "Ngozi",
    "timeBudgetMin": 55,
    "brief": "You are Ngozi, Chief Design Officer (CDO) and Chief Experience Officer. You sit on the executive team and own design as a company-level discipline — not just a function. You report to the CEO, present to the board, and set the vision for how the product feels, reads, and is remembered.\n\nYour day:\n\n1. Design vision memo: write a 1-page memo for the executive team and the board. Where is the company's design going over the next 18 months? What makes the experience hard to copy? What is the one bet that, if it lands, defines the next era of the product?\n2. Board pre-read on design health: 1 page covering design org size, quality signal (with a real metric — NPS correlation, task completion rate, design-to-engineering defect rate), top 2 experience risks, and what the board should ask the product team about experience quality.\n3. Design investment ask: there is a $1.5M ask on the table for a dedicated research and content design capability that doesn't exist today. Write a 2-page argument: what you're buying, what the return looks like in 18 months, the alternative (status quo), the fallback (smaller version), and what you don't yet know.\n4. CEO 1:1 prep: 5-7 bullets for your CEO meeting. Mix wins, asks, and one piece of news the CEO should hear from you first — not from the product team.",
    "deliverables": [
      {
        "filename": "design-vision.md",
        "description": "1-page exec/board memo: 18-month experience direction, moat, one big bet"
      },
      {
        "filename": "board-pre-read-design-health.md",
        "description": "1-page board pre-read: org size, quality metric, top 2 experience risks, questions for the board to ask"
      },
      {
        "filename": "research-content-investment-ask.md",
        "description": "2-page investment argument: capability, ROI in 18 months, status quo alternative, fallback, unknowns"
      },
      {
        "filename": "ceo-1on1-prep.md",
        "description": "5-7 bullets for CEO meeting: wins, asks, news the CEO should hear from Ngozi first"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Identify, develop, or evaluate marketing strategy, based on knowledge of establishment objectives, market characteristics, and cost and markup factors."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Evaluate the financial aspects of product development, such as budgets, expenditures, research and development appropriations, or return-on-investment and profit-loss projections."
      },
      {
        "source": "O*NET",
        "code": "27-1024.00",
        "url": "https://www.onetonline.org/link/summary/27-1024.00",
        "quote": "Research new software or design concepts."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "DES-L09-Rohan"
    ],
    "downstreamDeskIds": [],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the design vision name ONE big bet (not a list of priorities)?",
        "Does the board pre-read include a real, named quality metric?",
        "Does the investment ask cover all five elements (capability, ROI, alternative, fallback, unknowns)?",
        "Are 5-7 CEO 1:1 bullets present?"
      ],
      "quality": [
        "Is the design vision specific (a product experience claim, not a slogan)?",
        "Does the board pre-read use real numbers (not 'quality is improving')?",
        "Does the investment ask include unknowns honestly, not just upside?",
        "Is the CEO prep focused on items only Ngozi should surface (not things the CPO handles)?",
        "Is every document scannable in under 3 minutes?"
      ],
      "accuracy": [
        "Does the vision align with Rohan's quarterly strategy upstream?",
        "Is the quality metric (NPS correlation, task completion, defect rate) realistic and measurable?",
        "Does the investment ask price the research/content capability plausibly ($1.5M scale)?",
        "Is the moat claim defensible and specific to design (not a product or tech claim)?",
        "Does the fallback option materially reduce cost relative to the full ask?"
      ],
      "handoff": [
        "Could the CEO walk into the board meeting on design from the pre-read alone?",
        "Could the CFO model the investment ask without follow-up?",
        "Are next-step decisions named (who decides, by when)?",
        "Does the vision document set up the design org's next-quarter OKR cascade?",
        "Could a board member ask 1-2 questions and receive sufficient answers from the pre-read?"
      ]
    }
  },
  {
    "id": "SALES-L01-Aisha",
    "dept": "SALES",
    "level": 1,
    "title": "Sales Development Representative",
    "name": "Aisha",
    "timeBudgetMin": 25,
    "brief": "You are Aisha, a Sales Development Representative (SDR) at a 100-person SaaS company. Your job today is to work a prospecting block and document your outreach activity.\n\n1. Prospecting: Using the provided target account list, identify 10 new prospects who match the ideal customer profile (ICP). For each prospect record the company name, contact name, title, LinkedIn URL, and a one-sentence personalization hook. Output this as a structured CSV or table.\n\n2. Cold outreach: Write three cold-outreach email templates (each under 80 words) tailored to three different buyer personas: VP of Engineering, Head of Operations, and CFO. Each template should name a specific pain point and include a single clear call-to-action.\n\n3. Call notes: You took a 12-minute discovery call earlier today. Write up the call notes in a standard format: contact, company, date, pain points surfaced, objections raised, agreed next step.\n\nStay in prospecting mode — do not attempt to close deals or make pricing decisions. Flag anything that needs senior rep review.",
    "deliverables": [
      {
        "filename": "prospect-list.csv",
        "description": "10 prospects with company, contact, title, LinkedIn URL, and personalization hook"
      },
      {
        "filename": "cold-email-templates.md",
        "description": "Three sub-80-word cold email templates, one per buyer persona, each with a clear CTA"
      },
      {
        "filename": "discovery-call-notes.md",
        "description": "Structured call notes: contact, company, date, pain points, objections, next step"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "41-3091.00",
        "url": "https://www.onetonline.org/link/summary/41-3091.00",
        "quote": "Identify prospective customers using business directories, leads from clients, or information from conferences or trade shows."
      },
      {
        "source": "O*NET",
        "code": "41-3091.00",
        "url": "https://www.onetonline.org/link/summary/41-3091.00",
        "quote": "Contact prospective or existing customers to discuss how services can meet their needs."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/sales/sales-representatives-wholesale-and-manufacturing.htm",
        "quote": "Sales representatives spend much of their time traveling to and visiting with current and prospective customers."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "SALES-L05-Felipe"
    ],
    "rubric": {
      "completion": [
        "Is the prospect list present with all required fields for 10 contacts?",
        "Are three distinct cold email templates delivered?",
        "Does each template target a different buyer persona?",
        "Are discovery call notes present with all six required sections?",
        "Did Aisha flag any items requiring senior rep review?"
      ],
      "quality": [
        "Are personalization hooks specific (not generic 'I noticed your company…')?",
        "Does each email stay under 80 words?",
        "Is each CTA a single, unambiguous action (not multiple asks)?",
        "Are call notes written in a format a colleague could act on without follow-up?",
        "Is the prospect list free of duplicate entries?"
      ],
      "accuracy": [
        "Do the three email personas match the VP Engineering, Head of Operations, and CFO roles?",
        "Does each email's pain point align logically with the buyer persona?",
        "Are the call notes internally consistent (pain points and next step align)?",
        "Are prospect titles realistic for the target ICP?",
        "Is the prospect list structured in a valid CSV or table format?"
      ],
      "handoff": [
        "Could SALES-L05-Felipe act on the prospect list without reformatting it?",
        "Are objections in the call notes written as exact quotes or close paraphrases?",
        "Are next-step owners named (Aisha vs. prospect vs. AE)?",
        "Are any stalled or hot leads flagged with a priority note?",
        "Is each deliverable independently readable without context from the others?"
      ]
    }
  },
  {
    "id": "SALES-L02-Dimitri",
    "dept": "SALES",
    "level": 2,
    "title": "Business Development Representative",
    "name": "Dimitri",
    "timeBudgetMin": 25,
    "brief": "You are Dimitri, a Business Development Representative (BDR) at a 100-person SaaS company. You handle mid-funnel prospecting: moving leads from first touch to qualified opportunity.\n\n1. Sequence tracking: Review a provided 30-lead outreach sequence. Identify which leads are at each stage (day-1 email, day-3 follow-up, day-7 call, stalled). Produce a status table and flag the 5 leads most likely to convert based on engagement signals (opens, link clicks, reply sentiment).\n\n2. Follow-up outreach: For the top 3 engaged leads, write a personalized follow-up message (email or LinkedIn DM, under 100 words each) referencing their specific engagement signal and offering a concrete next step.\n\n3. CRM hygiene: Identify 5 common CRM data gaps in the lead list (e.g., missing phone, company size unknown, wrong title) and write a brief remediation checklist — what data to gather, where to look, and how to enter it.\n\n4. Market intel note: From the trade publications and alerts you reviewed this week, write a 3-bullet market conditions note flagging anything relevant to your outreach territory.",
    "deliverables": [
      {
        "filename": "sequence-status.md",
        "description": "Stage-by-stage status table for 30 leads, with top-5 conversion candidates flagged"
      },
      {
        "filename": "follow-up-messages.md",
        "description": "Three personalized follow-up messages (email or LinkedIn DM) referencing engagement signals"
      },
      {
        "filename": "crm-hygiene-checklist.md",
        "description": "5 identified CRM data gaps with remediation steps (data to gather, source, entry instructions)"
      },
      {
        "filename": "market-intel-note.md",
        "description": "3-bullet market conditions note relevant to outreach territory"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "41-3091.00",
        "url": "https://www.onetonline.org/link/summary/41-3091.00",
        "quote": "Attend sales or trade meetings or read related publications to obtain information about market conditions, business trends, regulations, or industry developments."
      },
      {
        "source": "O*NET",
        "code": "41-3091.00",
        "url": "https://www.onetonline.org/link/summary/41-3091.00",
        "quote": "Maintain customer records using automated systems."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/sales/sales-representatives-wholesale-and-manufacturing.htm",
        "quote": "Sales representatives spend much of their time traveling to and visiting with current and prospective customers."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "SALES-L05-Felipe"
    ],
    "rubric": {
      "completion": [
        "Is the sequence status table present and covers all 30 leads?",
        "Are exactly 5 top-conversion candidates flagged with reasoning?",
        "Are three follow-up messages present, one per top-engaged lead?",
        "Does the CRM hygiene checklist name exactly 5 gaps with remediation steps?",
        "Is the market intel note present with at least 3 bullets?"
      ],
      "quality": [
        "Do follow-up messages explicitly reference the engagement signal (e.g., 'you clicked the pricing link')?",
        "Is each follow-up under 100 words with a clear CTA?",
        "Are CRM gap remediation steps actionable (specific source + entry path)?",
        "Does the market intel note connect to territory strategy, not generic industry news?",
        "Is the status table scannable without reading every row?"
      ],
      "accuracy": [
        "Do the flagged conversion candidates align with engagement signal logic?",
        "Are all 30 leads accounted for in the status table?",
        "Are CRM data gaps realistic (types that commonly appear in lead records)?",
        "Is the market intel grounded in plausible current sources (publication names, dates)?",
        "Do follow-up messages match the lead's stage in the sequence?"
      ],
      "handoff": [
        "Could SALES-L05-Felipe prioritize the leads without reading all 30 rows?",
        "Are next-step owners clear in each follow-up message?",
        "Is the CRM checklist ready to hand to a data ops or admin contact?",
        "Are engagement signal descriptions precise enough to be verified in the CRM?",
        "Are any leads flagged as disqualified or out-of-ICP?"
      ]
    }
  },
  {
    "id": "SALES-L03-Camila",
    "dept": "SALES",
    "level": 3,
    "title": "Account Executive",
    "name": "Camila",
    "timeBudgetMin": 25,
    "brief": "You are Camila, an Account Executive at a 100-person SaaS company. You own a named account list of 25 mid-market prospects and are responsible for moving deals from qualified opportunity through to closed-won.\n\n1. Deal sheet: Choose one deal in your pipeline that is at the proposal stage. Write a one-page deal sheet covering: company profile (size, industry, pain point), decision-maker map (names, titles, influence), proposed solution (which product tier, why), price and contract terms being offered, competitive threats present, and recommended close strategy.\n\n2. Proposal email: Draft the accompanying proposal email (under 200 words) to the primary decision-maker that summarizes the value proposition and requests a 30-minute call to walk through the proposal.\n\n3. Competitive comparison: For one named competitor present in your deal, write a 1-page comparison table covering 5 dimensions (e.g., pricing, integrations, support, implementation speed, compliance). Include a talking-points section for how to handle the competitor objection in a live call.\n\nDo not negotiate pricing outside the approved discount schedule. Flag any request for non-standard terms to the Sales Lead.",
    "deliverables": [
      {
        "filename": "deal-sheet.md",
        "description": "One-page deal sheet: company profile, decision-maker map, solution, terms, competitive threats, close strategy"
      },
      {
        "filename": "proposal-email.md",
        "description": "Under-200-word proposal email to primary decision-maker with clear next-step ask"
      },
      {
        "filename": "competitive-comparison.md",
        "description": "1-page 5-dimension competitor comparison table plus live-call objection talking points"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "41-3091.00",
        "url": "https://www.onetonline.org/link/summary/41-3091.00",
        "quote": "Develop sales presentations or proposals to explain service specifications."
      },
      {
        "source": "O*NET",
        "code": "41-3091.00",
        "url": "https://www.onetonline.org/link/summary/41-3091.00",
        "quote": "Negotiate prices or terms of sales or service agreements."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/sales/sales-representatives-wholesale-and-manufacturing.htm",
        "quote": "Sales representatives spend much of their time traveling to and visiting with current and prospective customers."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "SALES-L05-Felipe"
    ],
    "rubric": {
      "completion": [
        "Is the deal sheet present with all six required sections?",
        "Is the proposal email present and under 200 words?",
        "Is the competitor comparison table present with exactly 5 dimensions?",
        "Does the comparison include a talking-points section for the live-call objection?",
        "Did Camila flag any non-standard terms for the Sales Lead?"
      ],
      "quality": [
        "Is the decision-maker map specific (names + titles + influence level)?",
        "Does the close strategy name concrete next steps with dates?",
        "Are all five comparison dimensions genuinely differentiating (not trivial)?",
        "Are objection talking points written as actual spoken language, not bullet fragments?",
        "Is the proposal email persuasive without being hyperbolic?"
      ],
      "accuracy": [
        "Do the proposed terms align with the approved discount schedule?",
        "Is the competitive comparison factually consistent (no contradictory claims)?",
        "Does the pain point in the deal sheet match the proposed solution tier?",
        "Are the decision-maker titles plausible for a mid-market company?",
        "Is the competitive threat realistic (a named, real-world-style competitor)?"
      ],
      "handoff": [
        "Could SALES-L05-Felipe review this deal in a pipeline meeting without extra context?",
        "Is any request for non-standard terms clearly flagged for escalation?",
        "Is the proposal email ready to send without further editing?",
        "Could a new AE cover this deal from the deal sheet alone?",
        "Are close strategy next steps owner-assigned with target dates?"
      ]
    }
  },
  {
    "id": "SALES-L04-Idris",
    "dept": "SALES",
    "level": 4,
    "title": "Senior Account Executive",
    "name": "Idris",
    "timeBudgetMin": 35,
    "brief": "You are Idris, a Senior Account Executive at a 100-person SaaS company. You handle the company's largest mid-market and entry-enterprise accounts and serve as a peer mentor for the SDR and AE team. Cross-team coordination is part of your role.\n\n1. Account plan: Produce a quarterly account plan for your top renewal account. Include: account health assessment (usage, support tickets, NPS if available), expansion opportunity map (which products/tiers they don't have yet), key stakeholder relationships, renewal risk factors, and a 90-day action plan with owner and milestone.\n\n2. Forecast update: Update your forecast log for this week. For each of your 7 open opportunities, record the current stage, deal size, probability, expected close date, and one risk or blocker. Produce a pipeline summary row (total weighted pipeline, total unweighted, deals at risk).\n\n3. Peer coaching note: You observed Camila (L3 AE) on a discovery call this week. Write a 1-page coaching note covering 2 things she did well and 2 specific areas to improve, each with a concrete behavior to practice.\n\n4. Cross-functional flag: One of your deals has a non-standard contractual ask (custom SLA terms). Write a 3-sentence escalation note to the Sales Lead summarizing the ask, the risk, and your recommended path.",
    "deliverables": [
      {
        "filename": "account-plan-q.md",
        "description": "Quarterly account plan: health, expansion map, stakeholders, risk factors, 90-day action plan"
      },
      {
        "filename": "forecast-update.md",
        "description": "Weekly forecast log for 7 opportunities plus pipeline summary row"
      },
      {
        "filename": "peer-coaching-note.md",
        "description": "1-page coaching note for Camila: 2 strengths, 2 improvement areas with concrete practice behaviors"
      },
      {
        "filename": "escalation-note.md",
        "description": "3-sentence escalation note on non-standard SLA request: ask, risk, recommended path"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "41-3091.00",
        "url": "https://www.onetonline.org/link/summary/41-3091.00",
        "quote": "Consult with clients after sales or contract signings to resolve problems and provide ongoing support."
      },
      {
        "source": "O*NET",
        "code": "41-3091.00",
        "url": "https://www.onetonline.org/link/summary/41-3091.00",
        "quote": "Monitor market conditions, innovations, and competitors' services, prices, and sales."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/sales/sales-representatives-wholesale-and-manufacturing.htm",
        "quote": "Sales representatives spend much of their time traveling to and visiting with current and prospective customers."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "SALES-L05-Felipe"
    ],
    "rubric": {
      "completion": [
        "Is the quarterly account plan present with all five sections?",
        "Does the forecast log cover all 7 opportunities with all required fields?",
        "Is the pipeline summary row present with weighted, unweighted, and at-risk totals?",
        "Is the peer coaching note present with 2 strengths and 2 improvement areas?",
        "Is the escalation note present and exactly 3 sentences?"
      ],
      "quality": [
        "Is the 90-day action plan time-bound with named owners and milestones?",
        "Are coaching improvement areas behavioral (not 'be more confident')?",
        "Does the expansion opportunity map identify specific product lines or tiers?",
        "Are risk factors in the forecast log specific enough to act on?",
        "Is the escalation note decision-ready without requiring follow-up questions?"
      ],
      "accuracy": [
        "Are deal stages consistent with a standard SaaS sales funnel (Prospect → Closed)?",
        "Are probability estimates aligned with stage (not arbitrarily high)?",
        "Does the account health assessment use observable signals (not assumptions)?",
        "Is the escalated contractual ask described accurately (specific clause, not vague 'custom terms')?",
        "Are coaching observations grounded in specific observed behaviors?"
      ],
      "handoff": [
        "Could SALES-L05-Felipe run the pipeline review meeting from the forecast update alone?",
        "Is the escalation note ready to forward to the Sales Lead without editing?",
        "Could a new AE inherit the account plan and continue execution?",
        "Are blockers in the forecast log owner-assigned?",
        "Is the coaching note written in a way Camila can read directly without embarrassment?"
      ]
    }
  },
  {
    "id": "SALES-L05-Felipe",
    "dept": "SALES",
    "level": 5,
    "title": "Sales Lead",
    "name": "Felipe",
    "timeBudgetMin": 35,
    "brief": "You are Felipe, Sales Lead for the commercial sales pod. Your four reports produced work this week: SDR prospecting and call notes (Aisha, L1), BDR sequence tracking and market intel (Dimitri, L2), AE deal sheet and proposal (Camila, L3), and Senior AE account plan and forecast (Idris, L4). You synthesize their output into a weekly roll-up for your manager Zara (L6 Sales Manager).\n\n1. Weekly roll-up: Write a 1-page synthesis of the pod's week for Zara. Cover: deals advanced, deals at risk, pipeline added (net new + expansion), SDR/BDR activity metrics (prospects touched, calls booked), and one team-level recommendation.\n\n2. Pipeline review prep: Build a structured pipeline review agenda for the 30-minute team meeting tomorrow. Include: which deals to discuss, what decision or input is needed from each rep, and time allocations.\n\n3. Coaching priorities: Based on the four upstream outputs, identify the top coaching need for each rep (one sentence each). Note any pattern across the team that should be addressed at the group level.\n\n4. Escalation triage: Idris flagged a non-standard SLA request. Assess it: should it go to Zara, to Legal, or can Felipe resolve it? Write a 1-paragraph decision with rationale.",
    "deliverables": [
      {
        "filename": "weekly-pod-rollup.md",
        "description": "1-page synthesis for Zara: deals advanced, at-risk, pipeline added, SDR/BDR metrics, one recommendation"
      },
      {
        "filename": "pipeline-review-agenda.md",
        "description": "Structured 30-minute pipeline review agenda with deal owners, needed decisions, and time slots"
      },
      {
        "filename": "coaching-priorities.md",
        "description": "Per-rep top coaching need (one sentence each) plus group-level pattern note"
      },
      {
        "filename": "escalation-triage.md",
        "description": "1-paragraph decision on Idris's non-standard SLA request: routing, rationale"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "41-1012.00",
        "url": "https://www.onetonline.org/link/summary/41-1012.00",
        "quote": "Monitor sales staff performance to ensure that goals are met."
      },
      {
        "source": "O*NET",
        "code": "41-1012.00",
        "url": "https://www.onetonline.org/link/summary/41-1012.00",
        "quote": "Provide staff with assistance in performing difficult or complicated duties."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/sales-managers.htm",
        "quote": "Sales managers direct organizations' sales teams. They set sales goals, analyze data, and develop training programs for organizations' sales representatives."
      }
    ],
    "upstreamDeskIds": [
      "SALES-L01-Aisha",
      "SALES-L02-Dimitri",
      "SALES-L03-Camila",
      "SALES-L04-Idris"
    ],
    "downstreamDeskIds": [
      "SALES-L06-Zara"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the weekly roll-up reference all four upstream reps' work?",
        "Does the pipeline review agenda include time allocations for each deal?",
        "Is there a coaching note for each of the four reps?",
        "Is the escalation triage decision present with a routing recommendation?"
      ],
      "quality": [
        "Is the roll-up scannable by Zara in under 3 minutes?",
        "Are pipeline metrics specific (numbers, not 'pipeline grew')?",
        "Are coaching priorities behavioral and actionable (not generic)?",
        "Does the pipeline review agenda specify what decision or input is needed per deal?",
        "Is the escalation decision reasoning clear and non-circular?"
      ],
      "accuracy": [
        "Does the roll-up accurately reflect the upstream deliverables from all four reps?",
        "Are SDR/BDR activity metrics distinct from AE deal metrics?",
        "Does the coaching pattern note identify a real common thread across reps?",
        "Is the escalation triage routing consistent with the severity of the SLA ask?",
        "Do deal status descriptions in the roll-up match the forecast update from Idris?"
      ],
      "handoff": [
        "Could Zara run a 1:1 with each rep from the coaching priorities alone?",
        "Is the pipeline review agenda ready to share with the team without editing?",
        "Are blockers in the roll-up owner-assigned with a target resolution date?",
        "Does the escalation triage name the next action and owner clearly?",
        "Could the roll-up feed directly into Zara's manager reporting without reformatting?"
      ]
    }
  },
  {
    "id": "SALES-L06-Zara",
    "dept": "SALES",
    "level": 6,
    "title": "Sales Manager",
    "name": "Zara",
    "timeBudgetMin": 35,
    "brief": "You are Zara, Sales Manager responsible for two commercial pods (8 reps total, including Felipe's pod). You report to Nathaniel (L7 Senior Sales Manager). Your week produces two critical downstream artifacts: a consolidated team forecast for Nathaniel and a deal-terms handoff to Finance.\n\n1. Team forecast consolidation: Take Felipe's pod roll-up and the equivalent from your second pod and produce a single manager-level forecast document. Include: total pipeline by stage, weighted forecast for the quarter, deals at risk with mitigation, and your personal call (commit vs. best-case vs. worst-case).\n\n2. Hiring and performance: One rep is underperforming against quota (below 60% attainment at mid-quarter). Write a performance conversation prep note: what data to cite, what behavioral changes to request, what support to offer, and the next checkpoint.\n\n3. Deal terms handoff (cross-dept): Two deals closed this week. Prepare the deal terms summary for FIN-L03-Hadiya in Finance. For each deal include: customer name, ARR, contract length, payment terms, any special billing conditions, and the rep who owns the relationship.\n\n4. Sales meeting: Write the agenda for your weekly all-hands sales meeting (60 min). Include: metrics review, deal spotlight, training segment topic, and team announcements.",
    "deliverables": [
      {
        "filename": "team-forecast-consolidated.md",
        "description": "Manager-level forecast: pipeline by stage, weighted Q forecast, at-risk deals, personal call (commit/best/worst)"
      },
      {
        "filename": "performance-conversation-prep.md",
        "description": "Prep note for underperforming rep: data to cite, behavioral asks, support offered, next checkpoint"
      },
      {
        "filename": "deal-terms-handoff-fin.md",
        "description": "Closed-deal terms summary for FIN-L03-Hadiya: customer, ARR, length, payment terms, billing conditions, rep owner"
      },
      {
        "filename": "sales-meeting-agenda.md",
        "description": "60-minute all-hands sales meeting agenda with time-boxed segments"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "41-1012.00",
        "url": "https://www.onetonline.org/link/summary/41-1012.00",
        "quote": "Prepare sales and inventory reports for management and budget departments."
      },
      {
        "source": "O*NET",
        "code": "41-1012.00",
        "url": "https://www.onetonline.org/link/summary/41-1012.00",
        "quote": "Confer with company officials to develop methods and procedures to increase sales, expand markets, and promote business."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/sales-managers.htm",
        "quote": "Sales managers direct organizations' sales teams. They set sales goals, analyze data, and develop training programs for organizations' sales representatives."
      }
    ],
    "upstreamDeskIds": [
      "SALES-L05-Felipe"
    ],
    "downstreamDeskIds": [
      "SALES-L07-Nathaniel",
      "FIN-L03-Hadiya"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the forecast cover pipeline by stage, weighted Q forecast, at-risk deals, and personal call?",
        "Is the performance conversation prep note present with all four sections?",
        "Does the deal terms handoff include both closed deals with all six required fields?",
        "Does the meeting agenda include all four required segments with time boxes?"
      ],
      "quality": [
        "Is the personal forecast call specific (not 'somewhere between best and worst')?",
        "Are at-risk deals in the forecast accompanied by concrete mitigation steps?",
        "Is the performance conversation prep written as coaching (not a PIP threat)?",
        "Is the deal terms handoff structured so Finance can invoice without follow-up?",
        "Is the meeting agenda balanced (not dominated by metrics review)?"
      ],
      "accuracy": [
        "Does the consolidated forecast incorporate both pods' inputs consistently?",
        "Are the deal terms in the Finance handoff consistent with the deals in the forecast?",
        "Does the underperformer data cite a specific attainment percentage, not vague underperformance?",
        "Are payment terms and billing conditions specific (net-30, annual upfront, etc.)?",
        "Does the commit/best/worst spread reflect realistic range (not identical numbers)?"
      ],
      "handoff": [
        "Could Nathaniel present the forecast to the VP without additional preparation?",
        "Is FIN-L03-Hadiya able to generate invoices from the handoff document without calling Zara?",
        "Is the performance conversation prep written so an HR rep could sit in and follow along?",
        "Are next-step owners named in the at-risk mitigations?",
        "Could a team member chair the sales meeting from the agenda alone?"
      ]
    }
  },
  {
    "id": "SALES-L07-Nathaniel",
    "dept": "SALES",
    "level": 7,
    "title": "Senior Sales Manager",
    "name": "Nathaniel",
    "timeBudgetMin": 45,
    "brief": "You are Nathaniel, Senior Sales Manager overseeing all commercial and mid-market segments, with Zara and one other Sales Manager as direct reports. You report to Iliana (L8 Director of Sales). You are two weeks from quarter end.\n\n1. Forecast roll-up for Iliana: Take the two managers' consolidated forecasts and produce a segment-level forecast document for the Director. Include a table of forecast vs. quota by segment, your overall commit, deals requiring Director-level involvement, and a risk-adjusted scenario (what happens if your top 3 deals slip).\n\n2. Sales cycle analysis: Review this quarter's closed-won and closed-lost data. Identify the top 3 reasons deals were lost and the top 3 patterns in won deals. Write a 1-page analysis with one tactical recommendation to improve win rate.\n\n3. Quota and territory review: One segment is consistently above quota while another is chronically below. Write a 1-page territory and quota rebalancing proposal for Iliana covering: data rationale, proposed changes, rep impact, and implementation timeline.\n\n4. Hiring loop: You have an open Senior AE role. Review three candidate summaries (write brief fictional ones) and produce a slate recommendation memo: who to advance to final round, who to pass on, and why.",
    "deliverables": [
      {
        "filename": "segment-forecast-for-director.md",
        "description": "Segment-level forecast for Iliana: quota vs. forecast table, overall commit, deals needing Director involvement, slip scenario"
      },
      {
        "filename": "sales-cycle-analysis.md",
        "description": "1-page closed-won/lost analysis: top 3 loss reasons, top 3 win patterns, one tactical win-rate recommendation"
      },
      {
        "filename": "territory-quota-rebalancing.md",
        "description": "1-page rebalancing proposal: data rationale, proposed changes, rep impact, implementation timeline"
      },
      {
        "filename": "hiring-slate-memo.md",
        "description": "Candidate slate recommendation: who advances, who passes, reasoning for each"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2022.00",
        "url": "https://www.onetonline.org/link/summary/11-2022.00",
        "quote": "Oversee regional and local sales managers and their staffs."
      },
      {
        "source": "O*NET",
        "code": "11-2022.00",
        "url": "https://www.onetonline.org/link/summary/11-2022.00",
        "quote": "Review operational records and reports to project sales and determine profitability."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/sales-managers.htm",
        "quote": "Sales managers direct organizations' sales teams. They set sales goals, analyze data, and develop training programs for organizations' sales representatives."
      }
    ],
    "upstreamDeskIds": [
      "SALES-L06-Zara"
    ],
    "downstreamDeskIds": [
      "SALES-L08-Iliana"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the segment forecast include a quota vs. forecast table and commit?",
        "Does the win/loss analysis name exactly 3 loss reasons and 3 win patterns?",
        "Is the territory rebalancing proposal present with all four sections?",
        "Does the hiring memo cover all three candidates with advance/pass decisions?"
      ],
      "quality": [
        "Is the slip scenario in the forecast quantified (dollar impact, not just 'revenue at risk')?",
        "Does the win/loss analysis derive the recommendation from the data (not generic advice)?",
        "Is the rebalancing proposal written so Iliana can present it to the VP?",
        "Are hiring decisions supported by specific evidence from the candidate summaries?",
        "Is every document concise enough for a Director to read in 5 minutes?"
      ],
      "accuracy": [
        "Does the segment forecast roll up correctly from the managers' inputs?",
        "Are loss reasons grounded in realistic SaaS sales failure modes (pricing, timing, competition)?",
        "Does the rebalancing proposal account for rep tenure and ramp time?",
        "Are the candidate evaluations consistent (same criteria applied to all three)?",
        "Does the commit number fall within the range of individual manager forecasts?"
      ],
      "handoff": [
        "Could Iliana present the segment forecast to the VP without additional prep?",
        "Is the rebalancing proposal decision-ready or does it need more data?",
        "Are deals flagged for Director involvement clearly described with the specific ask?",
        "Is the hiring memo ready to share with the recruiting team and hiring panel?",
        "Do win/loss recommendations feed into a training or playbook update?"
      ]
    }
  },
  {
    "id": "SALES-L08-Iliana",
    "dept": "SALES",
    "level": 8,
    "title": "Director of Sales",
    "name": "Iliana",
    "timeBudgetMin": 45,
    "brief": "You are Iliana, Director of Sales. You report to Bisi (L9 VP Sales) and manage the full commercial segment including Nathaniel's team. Two important cross-functional inputs arrived this week: LEGOPS-L07-Vidya sent contract redlines that affect your close motion on three enterprise deals, and MKT-L08-Caleb sent updated pipeline targets that will reset quota expectations for next quarter. You also received the segment forecast from Nathaniel.\n\n1. Department strategy memo: Write a 2-page memo for Bisi covering: current quarter attainment vs. plan, the impact of Vidya's contract redlines on three deals (name the deals, describe the hold-up, state your recommended response), how Caleb's pipeline targets change your Q+1 quota distribution, and your department's top 3 strategic priorities for next quarter.\n\n2. Quota planning update: Incorporate MKT-L08-Caleb's pipeline targets and produce an updated quota distribution plan for your two segments. Show old quota, new quota, delta, and rationale for each territory.\n\n3. Contract redline response plan: For each of the three deals affected by LEGOPS-L07-Vidya's redlines, write a one-paragraph close motion adjustment describing what changed, what the rep needs to do differently, and the revised expected close date.\n\n4. Hiring and team design: Write a 1-page headcount proposal for one new hire role. Include: role title, level, segment assignment, rationale (pipeline coverage math), and target start quarter.",
    "deliverables": [
      {
        "filename": "department-strategy-memo.md",
        "description": "2-page memo for Bisi: Q attainment, redline impact, pipeline target changes, Q+1 top 3 priorities"
      },
      {
        "filename": "quota-distribution-update.md",
        "description": "Updated quota plan: old quota, new quota, delta, rationale per territory — reflecting MKT-L08-Caleb's targets"
      },
      {
        "filename": "contract-redline-response-plan.md",
        "description": "Per-deal close motion adjustments for three deals affected by LEGOPS-L07-Vidya's redlines"
      },
      {
        "filename": "headcount-proposal.md",
        "description": "1-page new hire proposal: title, level, segment, pipeline coverage rationale, target start quarter"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2022.00",
        "url": "https://www.onetonline.org/link/summary/11-2022.00",
        "quote": "Plan and direct staffing, training, and performance evaluations to develop and control sales and service programs."
      },
      {
        "source": "O*NET",
        "code": "11-2022.00",
        "url": "https://www.onetonline.org/link/summary/11-2022.00",
        "quote": "Establish and monitor staff's sales goals."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/sales-managers.htm",
        "quote": "Sales managers direct organizations' sales teams. They set sales goals, analyze data, and develop training programs for organizations' sales representatives."
      }
    ],
    "upstreamDeskIds": [
      "SALES-L07-Nathaniel",
      "LEGOPS-L07-Vidya",
      "MKT-L08-Caleb"
    ],
    "downstreamDeskIds": [
      "SALES-L09-Bisi"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the strategy memo address all four required sections?",
        "Does the quota update reflect both old and new numbers with deltas?",
        "Does the redline response plan cover all three affected deals?",
        "Is the headcount proposal present with all five required fields?"
      ],
      "quality": [
        "Is the strategy memo written at VP-readability level (crisp, no fluff)?",
        "Do the close motion adjustments give reps actionable behavioral changes?",
        "Is the quota distribution rationale tied to pipeline coverage math (not gut feel)?",
        "Does the headcount proposal quantify the pipeline coverage gap it fills?",
        "Are Q+1 priorities numbered and ranked, not a flat list?"
      ],
      "accuracy": [
        "Does the redline response plan correctly characterize what LEGOPS-L07-Vidya changed?",
        "Does the quota update correctly incorporate MKT-L08-Caleb's pipeline targets?",
        "Are the Q attainment figures consistent with Nathaniel's upstream forecast?",
        "Are revised close dates in the redline response plan realistic (not wishful)?",
        "Is the pipeline coverage math in the headcount proposal internally consistent?"
      ],
      "handoff": [
        "Could Bisi present the strategy memo to the CRO without additional prep?",
        "Is the redline response plan ready to forward to each deal's rep immediately?",
        "Could the quota update feed directly into the comp system without reformatting?",
        "Is the headcount proposal ready to submit to HR for a job requisition?",
        "Are LEGOPS and MKT cross-department inputs acknowledged with their desk IDs?"
      ]
    }
  },
  {
    "id": "SALES-L09-Bisi",
    "dept": "SALES",
    "level": 9,
    "title": "VP of Sales",
    "name": "Bisi",
    "timeBudgetMin": 55,
    "brief": "You are Bisi, VP of Sales. You report to Adrian (L10 CRO) and own the full revenue number across commercial and enterprise segments. You are 10 days from quarter close. Your day involves exec-level reporting, cross-functional alignment, and forward planning for the next half-year.\n\n1. Exec revenue report: Prepare the weekly revenue report for Adrian and the executive team. Cover: QTD bookings vs. plan, pipeline coverage ratio, deals in the final stage (with close probability and owner), headcount vs. plan, and your personal call on whether the company closes the quarter on plan.\n\n2. Cross-functional alignment: Write a 1-page brief summarizing how sales depends on three other departments this quarter: what you need from Marketing (demand gen, MQLs), from Legal-Ops (contract velocity), and from Finance (deal desk, discount approvals). For each, state the current status and any escalation needed.\n\n3. Next-half planning: Produce a 2-page go-to-market strategy outline for H2. Cover: target segments, headcount additions, quota philosophy (growth vs. attainability), key plays to run, and the one metric you will be judged on.\n\n4. Board prep: Write 5 slides (as slide outlines, not full decks) for the board revenue section in the upcoming board meeting. Include: revenue performance, pipeline health, sales capacity, competitive landscape summary, and forward guidance.",
    "deliverables": [
      {
        "filename": "exec-revenue-report.md",
        "description": "Weekly exec revenue report: QTD vs. plan, pipeline coverage, final-stage deals, headcount, personal call"
      },
      {
        "filename": "cross-functional-alignment-brief.md",
        "description": "1-page brief on dependencies with Marketing, Legal-Ops, and Finance: status and escalations"
      },
      {
        "filename": "h2-gtm-strategy.md",
        "description": "2-page H2 go-to-market strategy: segments, headcount, quota philosophy, key plays, north star metric"
      },
      {
        "filename": "board-revenue-slide-outlines.md",
        "description": "5 board slide outlines: performance, pipeline, capacity, competitive, forward guidance"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2022.00",
        "url": "https://www.onetonline.org/link/summary/11-2022.00",
        "quote": "Direct, coordinate, and review sales and service accounting and record-keeping, as well as receiving and shipping."
      },
      {
        "source": "O*NET",
        "code": "11-2022.00",
        "url": "https://www.onetonline.org/link/summary/11-2022.00",
        "quote": "Determine price schedules and discount rates."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/sales-managers.htm",
        "quote": "Sales managers direct organizations' sales teams. They set sales goals, analyze data, and develop training programs for organizations' sales representatives."
      }
    ],
    "upstreamDeskIds": [
      "SALES-L08-Iliana"
    ],
    "downstreamDeskIds": [
      "SALES-L10-Adrian"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the exec revenue report include all five required sections?",
        "Does the alignment brief cover all three cross-functional dependencies?",
        "Does the H2 GTM strategy cover all five required elements?",
        "Are all five board slide outlines present with the specified topics?"
      ],
      "quality": [
        "Is the personal call in the exec report a clear binary (on plan / not on plan) with supporting evidence?",
        "Are escalations in the alignment brief specific enough to act on (name, ask, deadline)?",
        "Is the H2 quota philosophy a stated position (not a hedge)?",
        "Are board slide outlines written at board-audience level (strategic, not operational)?",
        "Is every document concise enough for an exec to read in under 5 minutes?"
      ],
      "accuracy": [
        "Does the pipeline coverage ratio use a realistic multiplier (e.g., 3x–4x for SaaS)?",
        "Are final-stage deal close probabilities consistent with stage definitions?",
        "Does the H2 headcount number align with the pipeline coverage required?",
        "Are cross-functional dependencies described accurately (not aspirational)?",
        "Is forward guidance in the board slides consistent with the QTD performance data?"
      ],
      "handoff": [
        "Could Adrian present the board slide outlines with minimal additional preparation?",
        "Is the cross-functional alignment brief ready to share with Marketing, Legal-Ops, and Finance leads?",
        "Could the H2 GTM strategy seed the next planning cycle without a separate kickoff doc?",
        "Are escalation owners and timelines named in the alignment brief?",
        "Could the exec revenue report be sent as-is to the executive team distribution list?"
      ]
    }
  },
  {
    "id": "SALES-L10-Adrian",
    "dept": "SALES",
    "level": 10,
    "title": "Chief Revenue Officer",
    "name": "Adrian",
    "timeBudgetMin": 55,
    "brief": "You are Adrian, Chief Revenue Officer. You sit on the executive team and own revenue from top-of-funnel through expansion. The board meets in three weeks. You have a go-to-market model to defend, a compensation plan restructure proposal on your desk, and a partnership deal in final negotiation.\n\n1. Revenue vision memo: Write a 1-page memo for the CEO and board on your 18-month revenue thesis: where growth is coming from, what segments you're doubling down on, and the one structural change that will define next year's trajectory. Be specific — name dollar targets, segment mix shifts, and the bet that could fail.\n\n2. Board pre-read on revenue health: 1 page covering: ARR, net revenue retention (NRR), pipeline coverage, quota attainment by segment, and the top 2 go-to-market risks. Board has 3 minutes.\n\n3. Compensation plan restructure: Summarize a proposed change to the rep commission structure (e.g., shifting from revenue-based to ARR-based commission with accelerators). State: current model, proposed model, expected behavior change, finance impact (cost as % of revenue), and the one objection you expect from the CFO.\n\n4. CEO 1:1 prep: 5-7 bullets for tomorrow's CEO meeting — wins, asks, early warnings, and one thing the CEO should hear from you before they hear it from the board.",
    "deliverables": [
      {
        "filename": "revenue-vision-memo.md",
        "description": "1-page CRO vision memo: 18-month revenue thesis, growth segments, one big structural bet"
      },
      {
        "filename": "board-pre-read-revenue-health.md",
        "description": "1-page board pre-read: ARR, NRR, pipeline coverage, attainment by segment, top 2 GTM risks"
      },
      {
        "filename": "comp-plan-restructure.md",
        "description": "Commission restructure proposal: current model, proposed model, behavior change, finance impact, CFO objection"
      },
      {
        "filename": "ceo-1on1-prep.md",
        "description": "5-7 bullet CEO meeting prep: wins, asks, early warnings, proactive disclosure"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Direct, plan, or implement policies, objectives, or activities of organizations or businesses to ensure continuing operations, to maximize returns on investments, or increase productivity."
      },
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Analyze operations to evaluate performance of a company or its staff in meeting objectives or to determine areas of potential cost reduction, program improvement, or policy change."
      },
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Negotiate or approve contracts or agreements with suppliers, distributors, federal or state agencies, or other organizational entities."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "SALES-L09-Bisi"
    ],
    "downstreamDeskIds": [],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the revenue vision name ONE structural bet (not a portfolio of priorities)?",
        "Does the board pre-read include all five required metrics sections?",
        "Does the comp plan proposal cover all five required elements?",
        "Are 5-7 CEO 1:1 bullets present?"
      ],
      "quality": [
        "Is the revenue vision specific (dollar targets, segment mix, named bet)?",
        "Does the board pre-read use actual numbers (not 'pipeline trending positive')?",
        "Does the comp plan proposal acknowledge the finance impact honestly (not just upside)?",
        "Is the CFO objection the real likely objection (not a strawman)?",
        "Is every document scannable in under 3 minutes?"
      ],
      "accuracy": [
        "Does the vision align with Bisi's H2 GTM strategy upstream?",
        "Are ARR and NRR figures realistic for a 100-person SaaS company?",
        "Does the comp plan finance impact use a plausible commission cost as % of revenue?",
        "Is the structural bet in the vision defensible (not vapor)?",
        "Are the top 2 GTM risks in the board pre-read grounded in the upstream pipeline data?"
      ],
      "handoff": [
        "Could the CEO walk into the board meeting from the board pre-read alone?",
        "Could the CFO model the comp plan restructure without follow-up?",
        "Are next-step decisions in the vision memo named (who decides, by when)?",
        "Does the vision memo set up the next annual planning cycle?",
        "Could a board member ask 1-2 questions and get sufficient answers from the pre-read?"
      ]
    }
  },
  {
    "id": "MKT-L01-Tamika",
    "dept": "MKT",
    "level": 1,
    "title": "Marketing Coordinator",
    "name": "Tamika",
    "timeBudgetMin": 25,
    "brief": "You are Tamika, a Marketing Coordinator at a 100-person SaaS company. You support the content and campaign team with coordination tasks, scheduling, and light copy.\n\nToday's work:\n\n1. Content calendar update: the social media schedule for next week is a mess — three posts are missing captions, two have broken image links, and one is scheduled for the wrong day (it references a webinar that already happened). Fix all five issues in the content calendar spreadsheet and flag any post that has no associated image asset.\n2. Campaign brief intake: a Sales rep emailed in a request for a one-pager targeting mid-market CFOs. Copy the request details into the standard campaign intake form, categorize the ask (top-funnel awareness vs. bottom-funnel enablement), and estimate a rough effort level (small/medium/large).\n\nDo not start writing the one-pager — that's for someone else. Your job is to get the request organized and ready to hand off.",
    "deliverables": [
      {
        "filename": "content-calendar-fixes.md",
        "description": "List of the five issues found + what was corrected for each, plus a flag list of posts missing image assets"
      },
      {
        "filename": "campaign-intake-form.md",
        "description": "Completed intake: requestor, target audience, funnel stage, effort estimate, requested due date, open questions"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1161.00",
        "url": "https://www.onetonline.org/link/summary/13-1161.00",
        "quote": "Prepare reports of findings, illustrating data graphically and translating complex findings into written text."
      },
      {
        "source": "O*NET",
        "code": "13-1161.00",
        "url": "https://www.onetonline.org/link/summary/13-1161.00",
        "quote": "Gather data on competitors and analyze their prices, sales, and methods of marketing and distribution."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/market-research-analysts.htm",
        "quote": "Market research analysts study market conditions to examine potential sales of a product or service."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "MKT-L05-Genevieve"
    ],
    "rubric": {
      "completion": [
        "Are all five content calendar issues listed and corrected?",
        "Is the flag list of image-less posts included?",
        "Is the campaign intake form fully populated (no blank required fields)?",
        "Is the funnel stage classification present (awareness vs. enablement)?",
        "Is an effort estimate (S/M/L) included?"
      ],
      "quality": [
        "Are the calendar corrections specific (not just 'fixed caption')?",
        "Does the intake form expose open questions that would block execution?",
        "Is the effort estimate justified with at least one sentence of reasoning?",
        "Is the writing concise and scannable?",
        "Did Tamika stay in scope (no copy written for the one-pager)?"
      ],
      "accuracy": [
        "Are calendar fix descriptions accurate to the problems stated?",
        "Is the funnel-stage classification appropriate for a CFO-targeted one-pager?",
        "Are open questions realistic (not invented problems)?",
        "Is the intake form structure consistent with standard marketing ops practice?",
        "Are all five issues addressed (none silently skipped)?"
      ],
      "handoff": [
        "Could MKT-L05-Genevieve assign the campaign immediately from this intake?",
        "Is the calendar deliverable self-contained (no need to re-open the original)?",
        "Are image-asset gaps actionable for a designer without further explanation?",
        "Is the requestor info complete enough for follow-up questions?",
        "Did Tamika flag the webinar scheduling error clearly (not buried)?"
      ]
    }
  },
  {
    "id": "MKT-L02-Lior",
    "dept": "MKT",
    "level": 2,
    "title": "Content Writer",
    "name": "Lior",
    "timeBudgetMin": 25,
    "brief": "You are Lior, a Content Writer on the marketing team. You write blog posts, email copy, and short-form social content that serves both brand awareness and demand generation goals.\n\nToday's work:\n\n1. Blog post draft: write a 600–800 word blog post on the topic \"How SaaS teams waste 20% of their week on manual data handoffs — and how to fix it.\" The audience is operations managers and team leads at mid-market companies. Lead with a concrete scenario, use two or three supporting data points (from publicly available research; cite them inline), and close with a soft CTA to request a demo.\n2. Email subject line test set: write five subject-line variants for a nurture email campaign promoting a free ROI calculator tool. Each variant should use a different persuasion technique (curiosity, scarcity, social proof, benefit-led, question-based). Include a one-line note on the technique used.\n\nAvoid generic B2B filler phrases like \"streamline your workflows\" without grounding them in specifics. Write like a person, not a content-farm.",
    "deliverables": [
      {
        "filename": "blog-draft-data-handoffs.md",
        "description": "600–800 word blog post with scenario lede, 2-3 cited data points, and soft CTA"
      },
      {
        "filename": "email-subject-lines.md",
        "description": "Five subject-line variants, each labeled with its persuasion technique and a one-line rationale"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "27-3043.00",
        "url": "https://www.onetonline.org/link/summary/27-3043.00",
        "quote": "Write fiction or nonfiction prose such as short stories, novels, biographies, articles, descriptive or critical analyses, and essays."
      },
      {
        "source": "O*NET",
        "code": "13-1161.00",
        "url": "https://www.onetonline.org/link/summary/13-1161.00",
        "quote": "Devise and evaluate methods and procedures for collecting data, such as surveys, opinion polls, or questionnaires."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/media-and-communication/writers-and-authors.htm",
        "quote": "Writers and authors develop written content for various types of media, including books, magazines, and online publications."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "MKT-L05-Genevieve"
    ],
    "rubric": {
      "completion": [
        "Is the blog post present and at least 600 words?",
        "Does the blog post include at least two cited data points?",
        "Are all five email subject-line variants written?",
        "Is each subject line labeled with its persuasion technique?",
        "Is a one-line rationale included for each subject line?"
      ],
      "quality": [
        "Does the blog post open with a concrete scenario (not a generic statement)?",
        "Are data citations specific enough to verify (author, publication, year)?",
        "Do the five subject-line techniques genuinely differ from one another?",
        "Is the blog CTA present but not heavy-handed?",
        "Is the writing free of filler phrases (streamline, leverage, etc.)?"
      ],
      "accuracy": [
        "Are the cited data points plausibly accurate (not invented statistics)?",
        "Is the target audience (ops managers, mid-market) reflected in the tone?",
        "Are the persuasion-technique labels correctly matched to the technique used?",
        "Is the 20%-time-wasted premise credibly supported by the content?",
        "Is the CTA relevant to the blog topic (not a generic 'contact us')?"
      ],
      "handoff": [
        "Could MKT-L05-Genevieve approve the blog post for publication with minor edits?",
        "Are inline citations formatted so an editor can verify them quickly?",
        "Are the subject lines ready for an A/B test setup without further editing?",
        "Is the blog post formatted in markdown suitable for CMS import?",
        "Did Lior flag any sourcing ambiguities or missing data clearly?"
      ]
    }
  },
  {
    "id": "MKT-L03-Cassandra",
    "dept": "MKT",
    "level": 3,
    "title": "Senior Marketing Specialist",
    "name": "Cassandra",
    "timeBudgetMin": 25,
    "brief": "You are Cassandra, a Senior Marketing Specialist owning the company's paid and organic search performance. You have full visibility into campaign analytics and are responsible for turning data into actionable recommendations.\n\nToday's work:\n\n1. Monthly attribution report: pull together last month's marketing attribution data across channels (paid search, organic, email, social, direct). Calculate channel-level cost per lead (CPL), conversion rate, and pipeline contribution. Identify the top-performing channel and the most underperforming one. State what you'd do with an extra $5,000 of monthly budget and why.\n2. SEO content gap analysis: the product team just added two new features (workflow automation and real-time alerting). Identify 5–8 high-intent search keywords for each feature. For each keyword: estimated monthly search volume range, competitor ranking presence (name at least one competitor per cluster), and a recommended content format (blog, landing page, comparison page, etc.).\n3. Hypothesis backlog: write 3 A/B test hypotheses for the homepage — one each targeting headline, CTA button, and social-proof section. For each: state the current state, the variant, and the expected direction of the metric.",
    "deliverables": [
      {
        "filename": "attribution-report.md",
        "description": "Channel-level table: CPL, conversion rate, pipeline contribution; top/bottom channel; $5K budget recommendation"
      },
      {
        "filename": "seo-gap-analysis.md",
        "description": "8–16 keywords across two feature clusters with volume estimate, competitor presence, and recommended content format"
      },
      {
        "filename": "ab-test-backlog.md",
        "description": "Three A/B test hypotheses (headline, CTA, social proof) with current state, variant, and expected metric direction"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1161.00",
        "url": "https://www.onetonline.org/link/summary/13-1161.00",
        "quote": "Measure and assess customer and employee satisfaction."
      },
      {
        "source": "O*NET",
        "code": "13-1161.00",
        "url": "https://www.onetonline.org/link/summary/13-1161.00",
        "quote": "Forecast and track marketing and sales trends, analyzing collected data."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/market-research-analysts.htm",
        "quote": "They use statistical software to analyze data and use their results to help management make informed decisions."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "MKT-L05-Genevieve"
    ],
    "rubric": {
      "completion": [
        "Is the attribution report present with all four required metrics per channel?",
        "Does the report name the top and bottom performer?",
        "Is the $5K budget recommendation stated with reasoning?",
        "Does the SEO gap analysis cover both feature clusters (5-8 keywords each)?",
        "Are three A/B test hypotheses present (headline, CTA, social proof)?"
      ],
      "quality": [
        "Are CPL / conversion-rate numbers internally consistent?",
        "Is at least one competitor named per keyword cluster in the SEO analysis?",
        "Are A/B hypotheses falsifiable (testable metric stated, not vague)?",
        "Does the budget recommendation connect to data in the attribution report?",
        "Is the SEO keyword selection genuinely high-intent (not generic)?"
      ],
      "accuracy": [
        "Are search volume estimates realistic for SaaS product feature keywords?",
        "Is the content format recommendation appropriate for each keyword's intent?",
        "Are conversion-rate values in a plausible SaaS range (1–15%)?",
        "Do A/B hypotheses name a measurable metric (CTR, bounce rate, etc.)?",
        "Is pipeline contribution attributed at the channel level, not lumped together?"
      ],
      "handoff": [
        "Could MKT-L05-Genevieve present the attribution report to the director without follow-up?",
        "Is the SEO gap analysis actionable for a content writer immediately?",
        "Are A/B hypotheses written so an engineer could instrument the test?",
        "Is the attribution table formatted so rows are sortable / comparable?",
        "Did Cassandra flag data quality issues or gaps in attribution coverage?"
      ]
    }
  },
  {
    "id": "MKT-L04-Rashid",
    "dept": "MKT",
    "level": 4,
    "title": "Marketing Operations Lead",
    "name": "Rashid",
    "timeBudgetMin": 35,
    "brief": "You are Rashid, the Marketing Operations Lead. You own the marketing tech stack, data integrity, and the processes that connect marketing activity to revenue reporting. You work across the team and serve as the go-to for campaign operations and analytics infrastructure.\n\nToday's work:\n\n1. Tech stack audit: the company runs HubSpot (CRM/marketing automation), a self-serve analytics layer (Amplitude), and a paid media dashboard (Google Ads + LinkedIn). Three workflows are broken: (a) form submissions from the webinar landing page are not syncing to HubSpot, (b) UTM parameters are being stripped on mobile redirects, and (c) the LinkedIn attribution window in HubSpot is set to 1-day click instead of the agreed 7-day click. Document each issue: root cause hypothesis, severity (revenue impact), and remediation steps.\n2. Lead-scoring model refresh: the current model is 18 months old. Using the ICP criteria (SMB/mid-market, Ops or Finance persona, 50–500 employees), rewrite the scoring rubric. Assign point values to demographic fit, behavioral signals (page visits, content downloads, webinar attendance), and negative signals (competitor domain email, student email). Total max score should be 100. Provide a worked example.\n3. Campaign operations SOP: write a one-page SOP for launching any new paid campaign — from brief approval to first-week reporting. Include a checklist and the ownership column (who does what).\n\nYour output feeds the marketing lead (MKT-L05-Genevieve) and the attribution work done by your IC reports.",
    "deliverables": [
      {
        "filename": "martech-issue-log.md",
        "description": "Three issue write-ups: root cause hypothesis, severity rating, and step-by-step remediation for each"
      },
      {
        "filename": "lead-scoring-model.md",
        "description": "Updated scoring rubric: demographic + behavioral + negative signals, point values summing to 100, worked example"
      },
      {
        "filename": "paid-campaign-launch-sop.md",
        "description": "One-page SOP: steps from brief approval to first-week reporting, checklist format, ownership column"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1161.00",
        "url": "https://www.onetonline.org/link/summary/13-1161.00",
        "quote": "Measure and assess customer and employee satisfaction."
      },
      {
        "source": "O*NET",
        "code": "13-1161.00",
        "url": "https://www.onetonline.org/link/summary/13-1161.00",
        "quote": "Develop and implement procedures for identifying advertising needs."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/market-research-analysts.htm",
        "quote": "Market research analysts study market conditions to examine potential sales of a product or service."
      },
      {
        "source": "Industry Report",
        "url": "https://www.marketo.com/marketing-operations/",
        "quote": "Marketing operations teams are responsible for technology infrastructure, data integrity, and process design that enable demand generation programs to scale."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "MKT-L05-Genevieve"
    ],
    "rubric": {
      "completion": [
        "Are all three martech issues documented?",
        "Does each issue entry include root cause, severity, and remediation steps?",
        "Does the lead-scoring model include all three signal categories?",
        "Do the point values sum to 100 with a worked example?",
        "Is the campaign launch SOP present with both checklist and ownership column?"
      ],
      "quality": [
        "Are root-cause hypotheses specific (not just 'misconfiguration')?",
        "Is the severity rating tied to revenue impact, not subjective priority?",
        "Are lead-scoring point values defensible (not arbitrary)?",
        "Is the SOP usable by a coordinator without asking Rashid follow-up questions?",
        "Is the worked example in the scoring model realistic?"
      ],
      "accuracy": [
        "Is the UTM-stripping issue plausibly caused by mobile redirects (technically correct)?",
        "Is the LinkedIn attribution window issue accurately described?",
        "Does the lead-scoring ICP match the stated criteria (SMB/mid-market, Ops/Finance)?",
        "Are negative signals reasonable (competitor domain, student email are standard)?",
        "Does the SOP cover the stated scope (brief approval → first-week reporting)?"
      ],
      "handoff": [
        "Could an engineer begin remediation for each martech issue from Rashid's notes alone?",
        "Could MKT-L05-Genevieve present the scoring model to Sales without Rashid present?",
        "Is the SOP checklist in a format a coordinator can use on their first campaign?",
        "Is the severity of the HubSpot sync issue (form submissions) clearly the highest priority?",
        "Are open questions or dependencies on engineering flagged explicitly?"
      ]
    }
  },
  {
    "id": "MKT-L05-Genevieve",
    "dept": "MKT",
    "level": 5,
    "title": "Marketing Lead",
    "name": "Genevieve",
    "timeBudgetMin": 35,
    "brief": "You are Genevieve, Marketing Lead for the demand generation sub-team. Four ICs report to you: Tamika (coordinator), Lior (content writer), Cassandra (senior specialist), and Rashid (marketing ops lead). Today they each delivered their work; you consume it and turn it into a team status summary and next-sprint plan.\n\nYour day:\n\n1. Sprint-end synthesis: write a 1-page summary for MKT-L06-Tobias covering what the team produced this sprint, what is at risk or blocked, and one recommendation. Specifically integrate: Tamika's content calendar fixes and campaign intake, Lior's blog draft and subject lines, Cassandra's attribution and SEO gap analysis, and Rashid's ops audit and scoring refresh.\n2. Next-sprint plan: define 4–6 campaign workstreams for the next two weeks. For each: name, owner, rough effort (days), priority (P1/P2/P3), and success metric. Use Cassandra's SEO gap and Rashid's SOP as input — what should the team build next?\n3. Performance coaching note: pick one IC and write a brief (5–7 bullet) coaching note. What did they do well, what's one area to sharpen, and what's one specific next opportunity for them?\n4. Team OKR check-in: the team's current-quarter OKR is 'Generate 300 MQLs from content by end of Q2.' Write a 3–5 sentence status update: where you are, what will get you there, what could stop you.\n\nYou are the first synthesis tier. Your writing compresses four ICs into a signal the manager can act on.",
    "deliverables": [
      {
        "filename": "sprint-summary.md",
        "description": "1-page synthesis: shipped work, blocked/at-risk items, one recommendation for MKT-L06-Tobias"
      },
      {
        "filename": "next-sprint-plan.md",
        "description": "4-6 workstreams with name, owner, effort, priority, and success metric"
      },
      {
        "filename": "coaching-note.md",
        "description": "5-7 bullet coaching note for one IC: what went well, one improvement area, one growth opportunity"
      },
      {
        "filename": "okr-check-in.md",
        "description": "3-5 sentence OKR status update: current position, path forward, key risk"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Formulate, direct, or coordinate marketing activities or policies to promote products or services, working with advertising and promotion managers."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Evaluate the financial aspects of product development, such as budgets, expenditures, research and development appropriations, or return-on-investment and profit-loss projections."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/advertising-promotions-and-marketing-managers.htm",
        "quote": "Marketing managers plan programs to generate interest in products or services and oversee marketing staff."
      }
    ],
    "upstreamDeskIds": [
      "MKT-L01-Tamika",
      "MKT-L02-Lior",
      "MKT-L03-Cassandra",
      "MKT-L04-Rashid"
    ],
    "downstreamDeskIds": [
      "MKT-L06-Tobias"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the sprint summary reference all four upstream IC contributions?",
        "Are 4-6 workstreams listed in the next-sprint plan?",
        "Is the coaching note at least 5 bullets for a named IC?",
        "Is the OKR check-in 3-5 sentences with current position and key risk?"
      ],
      "quality": [
        "Is the sprint summary scannable in under 3 minutes?",
        "Does the next-sprint plan use Cassandra's SEO gap and Rashid's SOP as inputs?",
        "Is the coaching note specific (not generic 'great job')?",
        "Does the OKR check-in name a concrete path to 300 MQLs?",
        "Is the recommendation in the sprint summary actionable for the manager?"
      ],
      "accuracy": [
        "Does the sprint summary correctly characterize each IC's contribution?",
        "Do priority ratings in the next-sprint plan align with the OKR?",
        "Is the MQL count in the OKR check-in realistic given the attribution data upstream?",
        "Are effort estimates in the sprint plan realistic (not all P1)?",
        "Is the coaching IC correctly attributed (not confused with another team member)?"
      ],
      "handoff": [
        "Could MKT-L06-Tobias run a team status update from the sprint summary alone?",
        "Are blockers from the team explicitly named for the manager?",
        "Is the next-sprint plan ready for a planning discussion without Genevieve present?",
        "Does the OKR check-in give Tobias enough signal to escalate if needed?",
        "Are IC credits clear (who did what) in the sprint summary?"
      ]
    }
  },
  {
    "id": "MKT-L06-Tobias",
    "dept": "MKT",
    "level": 6,
    "title": "Marketing Manager",
    "name": "Tobias",
    "timeBudgetMin": 35,
    "brief": "You are Tobias, Marketing Manager. You manage the demand gen team (through Genevieve) and own campaign execution, release communications, and the marketing team's relationship with Product and Engineering. Today you have three distinct work streams, one of which is externally driven by Engineering.\n\nYour day:\n\n1. Release notes (inbound from ENG-L08-Esther): Esther's launch readiness review just landed — the major product launch is 30 days out. Her green/yellow/red audit covers infra, security, monitoring, and support. Your job is to translate the green items into customer-facing release notes and draft a public-facing announcement email. For yellow items, note what customer messaging holds until resolved. Do NOT publish anything about red items.\n2. Campaign status review: using Genevieve's sprint summary (MKT-L05), write a 1-page campaign status update for your senior manager (MKT-L07-Yara). Cover what's on track, what's slipping, and what decision you're making without escalating (show judgment). Flag one item that does need the senior manager's call.\n3. Brand consistency audit: three pieces of content went live this week (blog post from Lior, a paid landing page from Cassandra's gap analysis, a sales one-pager from an earlier request). Write a brief brand audit: did they follow voice/tone guidelines, use the right logo variant, and include the correct legal footer? Approve, approve-with-changes, or reject each with one sentence of reason.\n\nYou are the manager who translates engineering reality into customer-ready language. Tobias does not ship anything that isn't ready.",
    "deliverables": [
      {
        "filename": "release-notes-draft.md",
        "description": "Customer-facing release notes for green launch items + announcement email draft; yellow items flagged as held"
      },
      {
        "filename": "campaign-status-update.md",
        "description": "1-page update for MKT-L07-Yara: on-track items, slipping items, one autonomous decision, one escalation"
      },
      {
        "filename": "brand-audit.md",
        "description": "Three content pieces audited for voice/tone, logo, and legal footer: approved / approved-with-changes / rejected with one-sentence reason each"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Formulate, direct, or coordinate marketing activities or policies to promote products or services, working with advertising and promotion managers."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Consult with buying personnel to gain advice regarding the types of products or services expected to be in demand."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/advertising-promotions-and-marketing-managers.htm",
        "quote": "Marketing managers work with department heads or staff to discuss topics such as budgets and contracts, marketing plans, and the selection of advertising media."
      }
    ],
    "upstreamDeskIds": [
      "MKT-L05-Genevieve",
      "ENG-L08-Esther"
    ],
    "downstreamDeskIds": [
      "MKT-L07-Yara"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the release notes draft address green items and flag yellow items?",
        "Does the campaign status update name one autonomous decision and one escalation?",
        "Does the brand audit cover all three content pieces?",
        "Is the announcement email draft included in the release notes deliverable?"
      ],
      "quality": [
        "Is the release notes language customer-appropriate (not internal-eng speak)?",
        "Does the campaign update give Yara enough context to act without follow-up?",
        "Is Tobias's autonomous decision defensible (not something he should escalate)?",
        "Are brand audit verdicts specific (not 'looks fine')?",
        "Is red-item information correctly withheld from the customer-facing draft?"
      ],
      "accuracy": [
        "Does the release notes content align with Esther's launch readiness green items?",
        "Is the yellow-item hold note accurate to the risk described in the readiness doc?",
        "Does the campaign status map to Genevieve's sprint summary?",
        "Are brand audit criteria (logo, voice, legal footer) correctly applied?",
        "Is the announcement email tone appropriate for the product's market position?"
      ],
      "handoff": [
        "Could MKT-L07-Yara make the escalation call from Tobias's status update alone?",
        "Could a designer action the brand audit changes without follow-up?",
        "Could the announcement email be sent with only a legal review remaining?",
        "Is ENG-L08-Esther's input clearly attributed in the release notes?",
        "Does Tobias clearly separate customer-ready content from held content?"
      ]
    }
  },
  {
    "id": "MKT-L07-Yara",
    "dept": "MKT",
    "level": 7,
    "title": "Senior Marketing Manager",
    "name": "Yara",
    "timeBudgetMin": 45,
    "brief": "You are Yara, Senior Marketing Manager. You own the marketing calendar, the brand narrative, and the relationship between marketing and the rest of the business. Tobias (MKT-L06) reports to you; your work feeds the Director of Marketing (MKT-L08-Caleb).\n\nToday's work:\n\n1. Quarterly campaign calendar: Q3 is six weeks out. Write the campaign calendar for the quarter: 8–12 campaign blocks (name, channel mix, audience segment, rough budget allocation as % of total, and expected MQL contribution). Campaigns must be sequenced — some depend on others (e.g., webinar comes after blog sequence). Highlight two campaigns with highest pipeline impact and one campaign you're cutting vs. last quarter and why.\n2. Brand narrative refresh: the company expanded its ICP last month to include enterprise buyers (500+ employees), alongside its existing SMB/mid-market focus. Rewrite the company's one-sentence positioning statement and tagline to accommodate the dual audience without becoming generic. Provide three alternatives and score each on: precision, memorability, and differentiation (1–5 scale). Recommend one.\n3. Cross-functional alignment memo: the product team is running a big-bet launch and wants marketing to run a simultaneous ABM (account-based marketing) campaign targeting 50 named accounts. Write a 1-page alignment memo to the Product Director (PROD) covering: what marketing will do, what marketing needs from Product (demo environment, customer references, pricing), timeline, and one risk if dependencies aren't met.\n4. Escalation resolution: Tobias flagged one campaign item needing your call. Address it — make the decision, state your reasoning (2–3 sentences), and write back a direction note for Tobias.",
    "deliverables": [
      {
        "filename": "q3-campaign-calendar.md",
        "description": "8-12 campaign blocks with channel mix, audience, budget %, MQL estimate; two highest-impact callouts; one cut vs. Q2 with rationale"
      },
      {
        "filename": "brand-narrative-refresh.md",
        "description": "Three positioning statement alternatives scored on precision, memorability, differentiation; one recommendation with rationale"
      },
      {
        "filename": "abm-alignment-memo.md",
        "description": "1-page memo to Product Director: marketing commitment, dependencies needed, timeline, risk if dependencies slip"
      },
      {
        "filename": "escalation-decision.md",
        "description": "Tobias's escalated item: decision + 2-3 sentence reasoning + direction note for Tobias"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Develop pricing strategies, balancing firm objectives and customer satisfaction."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Compile lists describing product or service offerings."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/advertising-promotions-and-marketing-managers.htm",
        "quote": "They plan, direct, and coordinate marketing policies and programs, such as determining the demand for products and services offered by a firm and its competitors."
      },
      {
        "source": "Industry Report",
        "url": "https://www.itsma.com/account-based-marketing-research/",
        "quote": "Account-based marketing programs that align closely with product launch timelines show 2x pipeline contribution compared to untimed outbound campaigns."
      }
    ],
    "upstreamDeskIds": [
      "MKT-L06-Tobias"
    ],
    "downstreamDeskIds": [
      "MKT-L08-Caleb"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the campaign calendar contain 8-12 blocks with all required fields?",
        "Are two highest-impact campaigns and one cut identified in the calendar?",
        "Does the brand refresh include three alternatives with scores?",
        "Is the ABM alignment memo present and addressed to the Product Director?"
      ],
      "quality": [
        "Is the campaign calendar sequenced (dependencies are logical)?",
        "Are the brand narrative alternatives genuinely distinct from one another?",
        "Is the scoring system (1-5) applied consistently across alternatives?",
        "Does the ABM memo name specific dependencies (not generic 'support from product')?",
        "Is the escalation decision clear and direction note actionable for Tobias?"
      ],
      "accuracy": [
        "Are budget % allocations realistic for a SaaS marketing budget (paid vs. content vs. events)?",
        "Does the brand refresh address both SMB/mid-market AND enterprise without being generic?",
        "Is the ABM timeline realistic for a 50-account named program?",
        "Is the escalation decision appropriately within Yara's authority level?",
        "Are MQL contribution estimates internally consistent with team capacity?"
      ],
      "handoff": [
        "Could MKT-L08-Caleb present the Q3 calendar to the CMO from this document?",
        "Could Tobias act on the escalation decision without follow-up from Yara?",
        "Is the ABM memo specific enough for the Product Director to confirm or reject dependencies?",
        "Does the brand recommendation include enough rationale for executive sign-off?",
        "Are the two highest-impact campaigns highlighted for budget prioritization?"
      ]
    }
  },
  {
    "id": "MKT-L08-Caleb",
    "dept": "MKT",
    "level": 8,
    "title": "Director of Marketing",
    "name": "Caleb",
    "timeBudgetMin": 45,
    "brief": "You are Caleb, Director of Marketing. You own the marketing department's strategy, headcount, and budget. You report to the VP Marketing (MKT-L09-Rosa) and manage Yara (MKT-L07) plus a broader team. Two cross-functional inputs are live today: pipeline target data coming from Legal-Ops (LEGOPS-L07-Vidya, vendor budget edge), and your output feeds directly into Sales quota planning (SALES-L08-Iliana).\n\nYour day:\n\n1. Department strategy memo: write a 2-page marketing strategy document covering the next quarter. Specifically: top three initiatives (with owner, budget, and success metrics), what you're stopping or de-prioritizing, and how marketing will support the company's $10M ARR target. This is what MKT-L09-Rosa reads before the executive team meeting.\n2. Pipeline targets for Sales: using Q3 campaign calendar data from Yara (MKT-L07) and the company's ARR target, write the pipeline target brief for SALES-L08-Iliana. Include: total MQL volume target, SQL conversion rate assumption, average contract value assumption, and how each major campaign contributes to the pipeline mix. This document directly enables quota planning.\n3. Vendor budget allocation: Vidya (LEGOPS-L07-Vidya) sent the vendor budget edge — a constraint on which external vendor contracts are approved this quarter. Using that input, write a marketing vendor spend plan: list your 4–6 active vendor contracts, their quarterly cost, whether each is within the approved envelope, and any substitution or renegotiation needed for over-budget items.\n4. Hiring update: the team has one open headcount — a Performance Marketing Manager. Write a two-paragraph role brief for Recruiting: why this role now, key responsibilities, and the two must-have qualifications.",
    "deliverables": [
      {
        "filename": "dept-strategy-memo.md",
        "description": "2-page strategy: top 3 initiatives with owner/budget/metrics, de-prioritizations, ARR contribution narrative"
      },
      {
        "filename": "pipeline-targets.md",
        "description": "Pipeline target brief for SALES-L08-Iliana: MQL volume, SQL conversion rate, ACV assumption, campaign-level contribution"
      },
      {
        "filename": "vendor-spend-plan.md",
        "description": "4-6 vendor contracts: quarterly cost, within-envelope status, substitution/renegotiation notes for any over-budget items"
      },
      {
        "filename": "role-brief-perf-marketing.md",
        "description": "Two-paragraph role brief for Recruiting: why now, key responsibilities, two must-have qualifications"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Formulate, direct, or coordinate marketing activities or policies to promote products or services, working with advertising and promotion managers."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Evaluate the financial aspects of product development, such as budgets, expenditures, research and development appropriations, or return-on-investment and profit-loss projections."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/advertising-promotions-and-marketing-managers.htm",
        "quote": "Marketing managers oversee marketing and promotions staff and manage activities designed to generate interest in their company's products or services."
      },
      {
        "source": "Industry Report",
        "url": "https://www.gartner.com/en/marketing/insights/annual-cmo-spend-survey",
        "quote": "Marketing budgets as a percentage of company revenue have stabilized at 9-10% for B2B technology companies, with performance marketing and content representing the largest allocations."
      }
    ],
    "upstreamDeskIds": [
      "MKT-L07-Yara",
      "LEGOPS-L07-Vidya"
    ],
    "downstreamDeskIds": [
      "MKT-L09-Rosa",
      "SALES-L08-Iliana"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the strategy memo cover all three sections (initiatives, stops, ARR narrative)?",
        "Does the pipeline brief include MQL volume, SQL rate, ACV, and campaign breakdown?",
        "Does the vendor spend plan cover 4-6 contracts with envelope status?",
        "Is the role brief two paragraphs with why-now, responsibilities, and qualifications?"
      ],
      "quality": [
        "Does the strategy memo make explicit trade-offs (what's stopped, not just what's added)?",
        "Is the pipeline brief actionable for quota planning without further inputs?",
        "Does the vendor plan identify specific over-budget items (not just 'review needed')?",
        "Are the two must-have qualifications defensible and not generic?",
        "Is the ARR contribution narrative in the strategy memo quantified?"
      ],
      "accuracy": [
        "Are initiative budgets internally consistent with the vendor spend plan?",
        "Does the pipeline math (MQL × SQL rate × ACV) plausibly reach the ARR target?",
        "Is Vidya's vendor budget constraint correctly applied to the spend plan?",
        "Are the over-budget remediation options realistic (substitution or renegotiation)?",
        "Does the strategy memo reflect Yara's Q3 campaign calendar as input?"
      ],
      "handoff": [
        "Could MKT-L09-Rosa present the strategy memo to the executive team without Caleb?",
        "Could SALES-L08-Iliana set quotas directly from the pipeline targets brief?",
        "Could Legal-Ops confirm compliance from the vendor spend plan?",
        "Could Recruiting post the role and screen candidates from the brief alone?",
        "Are downstream consumers (Rosa, Iliana) each addressed by name in the relevant doc?"
      ]
    }
  },
  {
    "id": "MKT-L09-Rosa",
    "dept": "MKT",
    "level": 9,
    "title": "VP Marketing",
    "name": "Rosa",
    "timeBudgetMin": 55,
    "brief": "You are Rosa, VP of Marketing. You sit on the leadership team, report to the CMO (MKT-L10-Ezekiel), and own the entire marketing function across demand gen, brand, content, and ops. You are two levels above execution and your job is to set direction, defend resources, and align marketing to the business.\n\nToday's work:\n\n1. Exec team marketing update: write a 1-page marketing brief for the weekly leadership team meeting. Cover: pipeline contribution vs. target (cite Caleb's pipeline brief), top campaign performance (signal vs. noise — pick 1-2 real wins and 1 real miss), budget health, and one strategic recommendation for the exec team to decide. Be honest about the miss — exec teams can smell spin.\n2. OKR cascade: the company's Q3 company-level OKR is 'Accelerate growth to $12M ARR run rate by end of Q3.' Write the marketing department's OKR contribution: two Objectives, each with 3 Key Results. Key Results must be measurable (numbers, not directions). Align to Caleb's strategy memo.\n3. Board marketing slide: the board meets in three weeks. Write the content for a single board slide on marketing performance: headline metric (one number), three supporting data points, and one forward-looking statement. Assume the board has 90 seconds for this slide.\n4. VP-level peer alignment: Marketing is asking Sales and Product to commit to joint campaign resources. Write a 1-page ask to the VP of Sales and VP of Product. What you're asking for, what marketing brings in return, and the decision deadline. Firm but collegial — you're asking peers, not subordinates.",
    "deliverables": [
      {
        "filename": "exec-marketing-update.md",
        "description": "1-page leadership team brief: pipeline vs. target, 1-2 wins + 1 miss, budget health, one strategic recommendation"
      },
      {
        "filename": "okr-cascade.md",
        "description": "Two Objectives with 3 KRs each, all KRs measurable, aligned to Q3 $12M ARR target"
      },
      {
        "filename": "board-marketing-slide.md",
        "description": "Board slide content: one headline metric, three data points, one forward-looking statement"
      },
      {
        "filename": "peer-alignment-ask.md",
        "description": "1-page joint campaign ask to VP Sales and VP Product: what marketing needs, what it gives, decision deadline"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Formulate, direct, or coordinate marketing activities or policies to promote products or services, working with advertising and promotion managers."
      },
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Direct, plan, or implement policies, objectives, or activities of organizations or businesses to ensure continuing operations, to maximize returns on investments, or to increase productivity."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/advertising-promotions-and-marketing-managers.htm",
        "quote": "Marketing managers plan programs to generate interest in products or services. They work with art directors, sales agents, and financial staff members."
      },
      {
        "source": "Industry Report",
        "url": "https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/the-new-model-for-consumer-goods",
        "quote": "Best-in-class B2B marketing organizations connect marketing OKRs directly to pipeline and revenue metrics, not activity metrics, to earn credibility at the executive table."
      }
    ],
    "upstreamDeskIds": [
      "MKT-L08-Caleb"
    ],
    "downstreamDeskIds": [
      "MKT-L10-Ezekiel"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the exec update include pipeline vs. target, wins/miss, budget, and recommendation?",
        "Does the OKR cascade have exactly two Objectives with 3 KRs each?",
        "Does the board slide include a headline metric, three data points, and a forward-looking statement?",
        "Is the peer alignment ask addressed to both VP Sales and VP Product?"
      ],
      "quality": [
        "Does the exec update acknowledge the miss honestly (not spun as neutral)?",
        "Are all six Key Results measurable with numbers (not 'improve' or 'increase')?",
        "Does the board slide content fit in 90 seconds (concise, no fluff)?",
        "Is the peer ask collegial rather than demanding?",
        "Is Rosa's strategic recommendation in the exec update one decision (not a list)?"
      ],
      "accuracy": [
        "Is pipeline vs. target sourced from Caleb's pipeline brief?",
        "Do the OKR Key Results sum to a plausible path to $12M ARR?",
        "Is the board headline metric one that a board member would actually care about?",
        "Are the campaign wins/miss credibly tied to attribution data upstream?",
        "Is the peer ask deadline realistic given the Q3 calendar?"
      ],
      "handoff": [
        "Could MKT-L10-Ezekiel present the board slide from Rosa's content without editing?",
        "Could Caleb update his strategy memo from the OKR cascade direction?",
        "Could the VP Sales respond to the peer ask without follow-up questions?",
        "Could the exec team make the strategic recommendation decision from Rosa's brief alone?",
        "Is Caleb's strategy memo clearly reflected as the upstream input?"
      ]
    }
  },
  {
    "id": "MKT-L10-Ezekiel",
    "dept": "MKT",
    "level": 10,
    "title": "Chief Marketing Officer",
    "name": "Ezekiel",
    "timeBudgetMin": 55,
    "brief": "You are Ezekiel, Chief Marketing Officer. You sit on the executive team, report to the CEO, and own the company's brand, demand generation, and market position. The board meets in three weeks. You have a $4.8M annual marketing budget, a team of 18, and a growth target that requires marketing-sourced pipeline to increase 35% year-over-year.\n\nYour day:\n\n1. Marketing vision memo: write a 1-page document for the executive team and board. Where is the company's market position going over the next 18 months? What makes the brand hard to copy? What is the one marketing bet that will define the year — and what does it cost? Be willing to kill a sacred cow if it's not working.\n2. Board pre-read on marketing health: 1 page. Headline number (pipeline contribution YTD), velocity trend (are MQLs accelerating or decelerating?), top campaign ROI and worst-performing campaign, and top 2 marketing risks. The board has 3 minutes — make every word earn its place.\n3. Budget reallocation decision: Q2 underspend of $180K needs to be redeployed into Q3 or returned to Finance. Analyze three redeployment options (you define them), state expected pipeline impact for each, and recommend one. Acknowledge the option you're not taking and why.\n4. CEO 1:1 prep: write 5-7 bullets for your CEO meeting this week. Mix: a market signal the CEO needs to hear, a win worth celebrating, a budget or resourcing ask, and one piece of news you're surfacing proactively (don't let them hear it from someone else first).",
    "deliverables": [
      {
        "filename": "marketing-vision.md",
        "description": "1-page exec/board memo: 18-month market position direction, brand moat, one big bet with cost"
      },
      {
        "filename": "board-pre-read-marketing.md",
        "description": "1-page board pre-read: pipeline YTD, MQL velocity trend, top and worst campaign ROI, top 2 risks"
      },
      {
        "filename": "budget-reallocation.md",
        "description": "Three Q3 redeployment options with expected pipeline impact; one recommendation with rationale; one explicit rejection"
      },
      {
        "filename": "ceo-1on1-prep.md",
        "description": "5-7 CEO prep bullets: market signal, win, ask, and one proactively surfaced item"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Formulate, direct, or coordinate marketing activities or policies to promote products or services, working with advertising and promotion managers."
      },
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Direct, plan, or implement policies, objectives, or activities of organizations or businesses to ensure continuing operations, to maximize returns on investments, or to increase productivity."
      },
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Prepare or present reports concerning activities, expenses, budgets, government statutes or rulings, or other items affecting businesses or program services."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "MKT-L09-Rosa"
    ],
    "downstreamDeskIds": [],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the vision memo name ONE big bet with a cost?",
        "Does the board pre-read fit on one page with all four required sections?",
        "Does the budget reallocation doc present all three options with pipeline impact?",
        "Are 5-7 CEO 1:1 bullets present with the four required types?"
      ],
      "quality": [
        "Is the marketing vision specific (a concrete direction, not a slogan)?",
        "Does the board pre-read use real numbers (not 'trending positively')?",
        "Does the budget recommendation acknowledge the rejected option explicitly?",
        "Is the CEO prep focused (no items the CEO should hear from someone else first)?",
        "Is every document scannable in under 3 minutes?"
      ],
      "accuracy": [
        "Does the vision align with Rosa's OKR cascade upstream?",
        "Are pipeline YTD and MQL velocity numbers realistic for a $4.8M budget SaaS team?",
        "Do the three redeployment options cost exactly $180K (or explain any variance)?",
        "Is the brand moat claim defensible (not vaporware positioning)?",
        "Are the top 2 marketing risks genuinely different from each other (not variations of the same risk)?"
      ],
      "handoff": [
        "Could the CEO walk into the board meeting armed with the pre-read alone?",
        "Could the CFO evaluate the budget reallocation recommendation without follow-up?",
        "Does the vision memo set up next quarter's OKR cascade?",
        "Could a board member ask 1-2 informed questions after reading the pre-read?",
        "Does the CEO 1:1 prep protect Ezekiel from being blindsided on the proactive item?"
      ]
    }
  },
  {
    "id": "CS-L01-Hina",
    "dept": "CS",
    "level": 1,
    "title": "Support Specialist",
    "name": "Hina",
    "timeBudgetMin": 25,
    "brief": "You are Hina, a Support Specialist on the Customer Success team at a 100-person SaaS company. Your queue has two tasks today.\n\n1. Ticket triage: you have 12 open support tickets assigned to your queue. Read through them, categorize each by type (billing, technical, onboarding, feature request), set a priority (P1/P2/P3), and write a one-sentence summary per ticket. Flag any P1s to your team lead (CS-L05-Theo) immediately.\n\n2. Knowledge base article: one recurring question has appeared 4 times this week — \"How do I export my account data as CSV?\" Write a clear, step-by-step help article for the knowledge base that a non-technical customer can follow. Include numbered steps, a screenshot placeholder, and a brief FAQ at the bottom (2-3 questions).\n\nDo not resolve tickets — triage and document only. If a ticket is unclear, note it as \"needs clarification\" rather than guessing. Your work feeds directly into the team health report that Theo produces each week.",
    "deliverables": [
      {
        "filename": "ticket-triage-log.md",
        "description": "12-row table: ticket ID, type, priority, one-sentence summary, flagged (Y/N)"
      },
      {
        "filename": "kb-export-csv.md",
        "description": "Step-by-step knowledge base article for exporting account data as CSV, with FAQ"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "43-4051.00",
        "url": "https://www.onetonline.org/link/summary/43-4051.00",
        "quote": "Keep records of customer interactions or transactions, recording details of inquiries, complaints, or comments, as well as actions taken."
      },
      {
        "source": "O*NET",
        "code": "43-4051.00",
        "url": "https://www.onetonline.org/link/summary/43-4051.00",
        "quote": "Refer unresolved customer grievances to designated departments for further investigation."
      },
      {
        "source": "Industry Report",
        "url": "https://www.zendesk.com/customer-experience/trends-report/",
        "quote": "Customers who receive fast, accurate first-response are 2.4x more likely to renew."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "CS-L05-Theo"
    ],
    "rubric": {
      "completion": [
        "Is the triage log present with all 12 tickets covered?",
        "Does each row include type, priority, and a one-sentence summary?",
        "Are P1 tickets explicitly flagged for escalation to CS-L05-Theo?",
        "Is the knowledge base article present as a separate file?",
        "Does the KB article include numbered steps and a FAQ section?"
      ],
      "quality": [
        "Are ticket categories consistent (no mixed categories in one row)?",
        "Is the KB article written for a non-technical audience (no jargon)?",
        "Are FAQ questions specific to the export workflow (not generic)?",
        "Is the triage log scannable in under 2 minutes?",
        "Does the KB article include a screenshot placeholder with descriptive label?"
      ],
      "accuracy": [
        "Do priority assignments match the described symptom severity?",
        "Is the ticket type classification internally consistent?",
        "Are 'needs clarification' tickets distinguished from resolved ones?",
        "Does the KB article describe a plausible SaaS export workflow?",
        "Is no ticket marked resolved when the task says triage only?"
      ],
      "handoff": [
        "Could CS-L05-Theo scan the triage log in a stand-up without asking follow-up questions?",
        "Are P1 escalation flags explicit enough for immediate action?",
        "Is the KB article ready for a content reviewer without further editing?",
        "Does the triage log use consistent ticket ID format throughout?",
        "Is the deliverable naming predictable (triage-log, kb article)?"
      ]
    }
  },
  {
    "id": "CS-L02-Marco",
    "dept": "CS",
    "level": 2,
    "title": "Customer Success Associate",
    "name": "Marco",
    "timeBudgetMin": 25,
    "brief": "You are Marco, a Customer Success Associate at a 100-person SaaS company. You handle a small book of accounts (15 accounts, mostly SMB) and own their onboarding experience for the first 90 days.\n\n1. Onboarding status update: three accounts are currently in week-2 of onboarding. For each, write a status note covering: what milestones they've hit, what's blocked, and your recommended next action. Be specific — generic notes like 'going well' are not useful.\n\n2. Churn risk flag: one of your accounts, Terralux Inc., has been unresponsive for 10 days after a billing inquiry. Draft a recovery email to their primary contact that is warm, concise, and surfaces the value they've gotten so far. Do not offer a discount — escalate that request to CS-L05-Theo if needed.\n\n3. CSAT response: you received a 2/5 CSAT score from Holloway Partners with a free-text comment: \"The dashboard is confusing and setup took too long.\" Write an internal note that (a) summarizes the complaint, (b) maps it to a known product issue if applicable, and (c) recommends an action (e.g., add to QBR agenda, flag to product team).\n\nAll three outputs feed the weekly team summary that Theo compiles.",
    "deliverables": [
      {
        "filename": "onboarding-status-wk2.md",
        "description": "Status notes for three week-2 accounts: milestones, blockers, next action"
      },
      {
        "filename": "terralux-recovery-email.md",
        "description": "Recovery email draft to Terralux Inc. — warm, concise, value-focused, no discount offer"
      },
      {
        "filename": "csat-internal-note.md",
        "description": "Internal CSAT note: complaint summary, product issue mapping, recommended action"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "43-4051.00",
        "url": "https://www.onetonline.org/link/summary/43-4051.00",
        "quote": "Confer with customers by telephone or in person to provide information about products or services, take or enter orders, cancel accounts, or obtain details of complaints."
      },
      {
        "source": "O*NET",
        "code": "43-4051.00",
        "url": "https://www.onetonline.org/link/summary/43-4051.00",
        "quote": "Contact customers to respond to inquiries or to notify them of claim investigation results or any planned adjustments."
      },
      {
        "source": "Industry Report",
        "url": "https://www.gainsight.com/blog/the-state-of-customer-success/",
        "quote": "CSMs who proactively surface churn signals in the first 90 days reduce involuntary churn by up to 30%."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "CS-L05-Theo"
    ],
    "rubric": {
      "completion": [
        "Are status notes present for all three week-2 accounts?",
        "Does each status note name milestones, blockers, and a next action?",
        "Is the Terralux recovery email present as a standalone draft?",
        "Is the CSAT internal note present with all three required sections?",
        "Does the CSAT note include a recommended action, not just a summary?"
      ],
      "quality": [
        "Are onboarding status notes specific (account names, real milestones, not 'going well')?",
        "Is the recovery email tone warm without being sycophantic?",
        "Does the CSAT note correctly distinguish complaint summary from recommended action?",
        "Is the recovery email under 150 words?",
        "Does the CSAT note avoid speculation about product intent?"
      ],
      "accuracy": [
        "Does the recovery email refrain from offering a discount?",
        "Is the Terralux situation characterized as unresponsive (not churned)?",
        "Does the onboarding status note flag blockers clearly (not conflated with risks)?",
        "Is the CSAT score (2/5) referenced correctly in the internal note?",
        "Does the CSAT note include a plausible product issue mapping?"
      ],
      "handoff": [
        "Could CS-L05-Theo include the onboarding notes in a team summary without rewriting?",
        "Is the recovery email ready to send after a manager spot-check?",
        "Does the CSAT internal note give the product team a clear action item?",
        "Are all three deliverables named predictably and separately?",
        "Is escalation to CS-L05-Theo named explicitly where needed?"
      ]
    }
  },
  {
    "id": "CS-L03-Babatunde",
    "dept": "CS",
    "level": 3,
    "title": "Customer Success Manager",
    "name": "Babatunde",
    "timeBudgetMin": 25,
    "brief": "You are Babatunde, a Customer Success Manager owning a book of 30 accounts, including 5 enterprise logos. You are one week out from quarterly business reviews (QBRs) for your top three accounts.\n\n1. QBR deck outline: for your largest account, Meridian Group (500 seats, $180K ARR, 14 months old), draft a QBR slide outline — 8-10 slides covering: executive summary, product adoption metrics, ROI achieved vs. projected, open issues, roadmap preview, and proposed expansion. Do not write full slide copy — headings and 2-3 bullet points per slide.\n\n2. Account health scorecard: using the provided signals (NPS 32, feature adoption 61%, last login 3 days ago, 2 open P2 tickets), calculate a composite account health score on a 0-100 scale. Document your weighting logic and classify the account as Green / Yellow / Red.\n\n3. Escalation triage: you have three accounts flagged as at-risk this week. For each, write a one-paragraph escalation summary: what happened, what you've tried, what you need from CS-L05-Theo. Do not wait for a weekly meeting — send this now.\n\nThis is execution-level CSM work. Your deliverables feed both your team lead (Theo) and will inform the QBR conversations next week.",
    "deliverables": [
      {
        "filename": "meridian-qbr-outline.md",
        "description": "8-10 slide QBR outline for Meridian Group: headings + 2-3 bullets per slide"
      },
      {
        "filename": "account-health-scorecard.md",
        "description": "Composite health score (0-100), weighting logic, Green/Yellow/Red classification for Meridian Group"
      },
      {
        "filename": "escalation-triage.md",
        "description": "Three at-risk account escalation summaries: what happened, tried, needed from lead"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "43-4051.00",
        "url": "https://www.onetonline.org/link/summary/43-4051.00",
        "quote": "Obtain and examine all relevant information to assess validity of complaints and to determine possible causes."
      },
      {
        "source": "O*NET",
        "code": "43-4051.00",
        "url": "https://www.onetonline.org/link/summary/43-4051.00",
        "quote": "Recommend improvements in products, packaging, shipping, service, or billing methods and procedures to prevent future problems."
      },
      {
        "source": "Industry Report",
        "url": "https://www.gainsight.com/blog/the-state-of-customer-success/",
        "quote": "Health scores combining adoption, NPS, and support load predict churn risk with greater accuracy than any single signal."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "CS-L05-Theo"
    ],
    "rubric": {
      "completion": [
        "Is the QBR outline present with 8-10 slides?",
        "Does each slide have a heading and 2-3 bullet points?",
        "Is the health scorecard present with a numeric score (0-100)?",
        "Is weighting logic for the health score documented?",
        "Are escalation summaries present for all three at-risk accounts?"
      ],
      "quality": [
        "Does the QBR outline include all six required sections (exec summary, adoption, ROI, issues, roadmap, expansion)?",
        "Is the health score classification (G/Y/R) consistent with the numeric score?",
        "Are escalation summaries actionable (name what is needed from the lead, not just what happened)?",
        "Is the QBR outline scannable without needing to read full slide copy?",
        "Does the health score weighting logic add up to 100%?"
      ],
      "accuracy": [
        "Does the health score correctly use all four provided signals (NPS, adoption, last login, open tickets)?",
        "Is the account context (500 seats, $180K ARR, 14 months) referenced correctly in the QBR?",
        "Are escalation summaries distinguishable from one another (not templated copies)?",
        "Is the NPS of 32 interpreted correctly (below industry threshold)?",
        "Does the QBR include an expansion proposal section as required?"
      ],
      "handoff": [
        "Could CS-L05-Theo action the escalation summaries without follow-up?",
        "Could Babatunde's sales counterpart use the QBR outline directly for prep?",
        "Does the health scorecard methodology explain itself to a non-CS audience?",
        "Are escalation summaries formatted for quick review (not buried in prose)?",
        "Is the QBR outline clearly labeled for Meridian Group (not generic)?"
      ]
    }
  },
  {
    "id": "CS-L04-Sigrid",
    "dept": "CS",
    "level": 4,
    "title": "Senior Customer Success Manager",
    "name": "Sigrid",
    "timeBudgetMin": 35,
    "brief": "You are Sigrid, a Senior CSM owning 20 enterprise accounts totaling $2.1M ARR. You are also the unofficial process owner for the CS team's QBR methodology — the templates and rubrics others follow come from you.\n\n1. NPS analysis: the quarterly NPS survey just closed. You have results for your 20 accounts: aggregate score is 41, with 8 promoters, 6 passives, and 6 detractors. Write a 1-page NPS analysis memo: headline number, segment breakdown by account tier (SMB vs. enterprise), top 3 themes from verbatim feedback, and 2-3 recommendations the team should act on next quarter.\n\n2. QBR template refresh: the current QBR template is 6 months old and missing an AI adoption section that customers keep asking about. Write a revised slide outline template (10-12 slides) that can be reused across all CSMs. Include slide titles, a 1-sentence instruction per slide, and flag which slides are mandatory vs. optional.\n\n3. Cross-functional input: you are preparing for a coordination meeting with the product team next week. Write a 1-page brief summarizing the top 5 feature requests and top 3 bug patterns from your accounts this quarter. This will feed into the CS-to-Product handoff managed by CS-L06-Lakshmi.\n\nYour outputs set standards for the rest of the CS team, not just your own accounts. Quality and repeatability matter as much as completeness.",
    "deliverables": [
      {
        "filename": "nps-analysis-q3.md",
        "description": "1-page NPS memo: headline score, tier breakdown, top 3 themes, 2-3 recommendations"
      },
      {
        "filename": "qbr-template-v2.md",
        "description": "10-12 slide QBR template with titles, per-slide instructions, mandatory/optional flags"
      },
      {
        "filename": "product-input-brief.md",
        "description": "1-page brief: top 5 feature requests + top 3 bug patterns from Sigrid's accounts this quarter"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "43-4051.00",
        "url": "https://www.onetonline.org/link/summary/43-4051.00",
        "quote": "Recommend improvements in products, packaging, shipping, service, or billing methods and procedures to prevent future problems."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Use sales forecasting or strategic planning to ensure the sale and profitability of products, lines, or services, analyzing business developments and monitoring market trends."
      },
      {
        "source": "Industry Report",
        "url": "https://www.gainsight.com/blog/the-state-of-customer-success/",
        "quote": "Teams that standardize QBR methodology see 20% higher renewal rates than those running ad-hoc reviews."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "CS-L05-Theo",
      "CS-L06-Lakshmi"
    ],
    "rubric": {
      "completion": [
        "Is the NPS analysis present with headline score, segment breakdown, themes, and recommendations?",
        "Does the QBR template have 10-12 slides with titles and per-slide instructions?",
        "Are mandatory vs. optional slides flagged in the QBR template?",
        "Is the product input brief present with 5 feature requests and 3 bug patterns?",
        "Are all three deliverables present as separate files?"
      ],
      "quality": [
        "Does the NPS memo correctly calculate the score from 8 promoters, 6 passives, 6 detractors?",
        "Are NPS recommendations specific (not generic 'improve onboarding')?",
        "Does the QBR template include the AI adoption section that was missing?",
        "Is the product input brief written for a product audience (not internal CS jargon)?",
        "Are recommendations tied to the verbatim theme analysis, not invented independently?"
      ],
      "accuracy": [
        "Is the NPS score computed correctly (promoters minus detractors, as % of respondents)?",
        "Does the SMB vs. enterprise breakdown use the account base (20 accounts) correctly?",
        "Is the QBR template versioned (v2) and dated?",
        "Do the 5 feature requests reflect real SaaS patterns (not filler)?",
        "Is the brief clearly labeled as feeding into CS-L06-Lakshmi's product handoff?"
      ],
      "handoff": [
        "Could a junior CSM (Marco or Babatunde) use the QBR template without guidance?",
        "Could CS-L05-Theo use the NPS memo in an exec summary without rewriting?",
        "Could CS-L06-Lakshmi send the product input brief to the product team directly?",
        "Are template instructions specific enough that different CSMs produce consistent output?",
        "Is downstream routing (Theo, Lakshmi) stated explicitly in the brief?"
      ]
    }
  },
  {
    "id": "CS-L05-Theo",
    "dept": "CS",
    "level": 5,
    "title": "Customer Success Lead",
    "name": "Theo",
    "timeBudgetMin": 35,
    "brief": "You are Theo, Customer Success Lead. You are the first synthesis tier for the CS team. Your four ICs (Hina, Marco, Babatunde, Sigrid) each fed you work this week: triage logs, onboarding notes, escalation triage, and NPS analysis respectively. You consume their output and turn it into a weekly team health report plus next-cycle priorities.\n\n1. Weekly CS health report: synthesize all four ICs' output into a 1-page team health snapshot. Cover: ticket queue status (volume, P1s, resolution rate), onboarding pipeline health (how many accounts are on track vs. at-risk), churn risk summary (accounts flagged, actions in flight), NPS trend, and one recommendation for the manager (CS-L06-Lakshmi).\n\n2. Next-cycle task assignments: write a concise task board for the next two weeks — 3-5 priorities per IC, with due dates and success criteria. Make decisions. Do not ask ICs to figure out their own priorities.\n\n3. Escalation review: of the escalations Babatunde flagged, decide which ones you can resolve yourself vs. which need to go to Lakshmi. Write a one-paragraph decision note per escalation.\n\nYou are the team's nerve center. The health report you produce is what Lakshmi reads before her manager sync. Quality of synthesis matters more than raw output volume.",
    "deliverables": [
      {
        "filename": "cs-team-health-weekly.md",
        "description": "1-page CS team health snapshot: tickets, onboarding pipeline, churn risk, NPS trend, one recommendation"
      },
      {
        "filename": "next-cycle-tasks.md",
        "description": "Task board for next 2 weeks: 3-5 priorities per IC with due dates and success criteria"
      },
      {
        "filename": "escalation-decisions.md",
        "description": "Per-escalation decision notes: resolve self vs. escalate to Lakshmi, with reasoning"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "43-4051.00",
        "url": "https://www.onetonline.org/link/summary/43-4051.00",
        "quote": "Check to ensure that appropriate changes were made to resolve customers' problems."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Direct the hiring, training, or performance evaluations of marketing or sales staff and oversee their daily activities."
      },
      {
        "source": "Industry Report",
        "url": "https://www.gainsight.com/blog/the-state-of-customer-success/",
        "quote": "CS leads who produce weekly health reports reduce manager decision latency by 40% compared to ad-hoc status updates."
      }
    ],
    "upstreamDeskIds": [
      "CS-L01-Hina",
      "CS-L02-Marco",
      "CS-L03-Babatunde",
      "CS-L04-Sigrid"
    ],
    "downstreamDeskIds": [
      "CS-L06-Lakshmi"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the health report reference all four upstream ICs' contributions?",
        "Does the task board cover all four ICs (Hina, Marco, Babatunde, Sigrid)?",
        "Is each IC assigned 3-5 next-cycle priorities?",
        "Does the escalation decisions file address all of Babatunde's flagged escalations?"
      ],
      "quality": [
        "Is the health report scannable in under 3 minutes?",
        "Does the recommendation to Lakshmi reflect the data (not a generic suggestion)?",
        "Are task assignments opinionated (Theo decides, not delegates decision-making)?",
        "Do success criteria in the task board have measurable outcomes?",
        "Are escalation decisions clearly reasoned (not just 'resolve' or 'escalate')?"
      ],
      "accuracy": [
        "Does the health report correctly synthesize (not just concatenate) the IC inputs?",
        "Are escalation decisions consistent with the information Babatunde provided?",
        "Does the NPS trend section use Sigrid's NPS data correctly?",
        "Are due dates in the task board realistic for a 2-week window?",
        "Does Theo accurately attribute which IC flagged which issue?"
      ],
      "handoff": [
        "Could CS-L06-Lakshmi brief her manager from the health report alone?",
        "Could each IC pick up their task board assignments without a meeting?",
        "Are escalations routed with enough context for Lakshmi to act without asking?",
        "Is the recommendation to Lakshmi formatted for a sync agenda?",
        "Does the health report have a clear timestamp / week label?"
      ]
    }
  },
  {
    "id": "CS-L06-Lakshmi",
    "dept": "CS",
    "level": 6,
    "title": "Customer Success Manager (People Manager)",
    "name": "Lakshmi",
    "timeBudgetMin": 35,
    "brief": "You are Lakshmi, CS Manager with five direct reports (Hina, Marco, Babatunde, Sigrid, and Theo). You own the health of the entire CS delivery team and report to Dion (CS-L07). You also manage the cross-functional relationship with the product team.\n\n1. Manager sync prep: Theo has handed you this week's CS team health report. Before your 1:1 with Dion, write a concise manager brief (half a page) that distills the team's health into 3-5 bullet points — wins, risks, asks. Include one specific ask of Dion (headcount, escalation support, tooling).\n\n2. Bug list and feature request handoff: using the product input brief from Sigrid (L4), compile a consolidated list of the top 5 bugs and top 5 feature requests from the CS team's accounts. Write a short cover note and send this package to PROD-L03-Kai for triage. Be clear about priority and account impact — Kai needs enough context to compare against the product backlog.\n\n3. Performance snapshot: write a one-paragraph performance note for each of your five reports. Be direct — what is each person doing well, and what is the one thing they should work on next cycle. These notes feed your quarterly review cycle.\n\nThe handoff to PROD-L03-Kai is a fixed cross-departmental edge. Make it count.",
    "deliverables": [
      {
        "filename": "manager-brief-wk.md",
        "description": "Half-page brief for Dion: 3-5 bullets on team health (wins, risks, asks), one specific ask"
      },
      {
        "filename": "cs-to-product-handoff.md",
        "description": "Cover note + top 5 bugs + top 5 feature requests for PROD-L03-Kai, with priority and account impact"
      },
      {
        "filename": "team-performance-snapshot.md",
        "description": "One-paragraph performance note per report (Hina, Marco, Babatunde, Sigrid, Theo)"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Direct the hiring, training, or performance evaluations of marketing or sales staff and oversee their daily activities."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Formulate, direct, or coordinate marketing activities or policies to promote products or services, working with advertising or promotion managers."
      },
      {
        "source": "Industry Report",
        "url": "https://www.gainsight.com/blog/the-state-of-customer-success/",
        "quote": "CS-to-Product feedback loops that are structured (not ad-hoc) drive measurably faster resolution of top customer friction points."
      }
    ],
    "upstreamDeskIds": [
      "CS-L05-Theo",
      "CS-L04-Sigrid"
    ],
    "downstreamDeskIds": [
      "CS-L07-Dion",
      "PROD-L03-Kai"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the manager brief contain 3-5 bullets (wins, risks, asks)?",
        "Is one specific ask of Dion included in the brief?",
        "Does the product handoff contain exactly 5 bugs and 5 feature requests?",
        "Are all five direct reports covered in the performance snapshot?"
      ],
      "quality": [
        "Is the manager brief concise (half a page, not a full report)?",
        "Does the product handoff include account impact for each item (not just a list)?",
        "Are performance notes direct and specific (not generic praise/criticism)?",
        "Is the cover note to Kai written for a product audience?",
        "Does the specific ask of Dion have a rationale attached?"
      ],
      "accuracy": [
        "Does the manager brief accurately reflect the health report from Theo?",
        "Is the product handoff clearly attributed to CS-team account feedback (not invented)?",
        "Do the performance notes match each person's role level and observed behavior?",
        "Is the routing to PROD-L03-Kai (not another product person) explicit?",
        "Does Lakshmi correctly escalate vs. resolve issues relative to her authority?"
      ],
      "handoff": [
        "Could CS-L07-Dion read the manager brief and walk into a skip-level without prep?",
        "Could PROD-L03-Kai triage the product handoff without a follow-up call?",
        "Are the performance notes ready to drop into a quarterly review template?",
        "Is the product handoff package self-contained (no reference to internal CS files)?",
        "Does the manager brief name the one ask with enough specificity to approve or reject?"
      ]
    }
  },
  {
    "id": "CS-L07-Dion",
    "dept": "CS",
    "level": 7,
    "title": "Senior Customer Success Manager",
    "name": "Dion",
    "timeBudgetMin": 45,
    "brief": "You are Dion, Senior CS Manager overseeing the delivery team (reporting to Astrid, CS-L08). You manage two CS managers (Lakshmi, L6, and one peer team) and own the operating rhythm for the entire CS function at the cycle level.\n\n1. Churn risk report: compile a department-wide churn risk list for the current quarter. Format: account name, ARR at risk, risk tier (High/Medium/Watch), primary risk driver, and assigned action owner. Your target is to name every account at material risk (>$20K ARR). This is the document Astrid uses in the leadership team meeting.\n\n2. CS cycle plan: write the plan for the next 6-week delivery cycle. Cover: team focus areas (max 3), key accounts requiring elevated attention, capacity headcount (who is at risk of overload), and one process improvement the team will ship this cycle.\n\n3. Voice-of-customer summary: synthesize the CSAT scores, NPS verbatims, and escalation patterns from the past quarter into a 1-page voice-of-customer (VoC) summary. This will be used in a cross-functional meeting with Product and Engineering. Be specific — themes, frequency, representative quotes, and a recommended priority ranking for the other teams.\n\n4. Manager 1:1 notes: for your 1:1 with Lakshmi, write 5-7 agenda bullets covering feedback on her recent manager brief, the product handoff quality, and growth areas for her reports.\n\nYou are accountable for the team's delivery rhythm and cross-functional reputation. The churn risk report and VoC summary are read by people outside CS.",
    "deliverables": [
      {
        "filename": "churn-risk-report-q.md",
        "description": "Department-wide churn risk list: account, ARR at risk, tier, risk driver, action owner"
      },
      {
        "filename": "cs-cycle-plan.md",
        "description": "6-week CS cycle plan: 3 focus areas, elevated accounts, capacity risk, 1 process improvement"
      },
      {
        "filename": "voc-summary-q.md",
        "description": "1-page voice-of-customer summary: themes, frequency, representative quotes, priority ranking"
      },
      {
        "filename": "lakshmi-1on1-notes.md",
        "description": "5-7 agenda bullets for Lakshmi 1:1: feedback, product handoff quality, report growth areas"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Initiate market research studies, or analyze their findings."
      },
      {
        "source": "O*NET",
        "code": "11-3051.00",
        "url": "https://www.onetonline.org/link/summary/11-3051.00",
        "quote": "Review operations and confer with technical or administrative staff to resolve production or processing problems."
      },
      {
        "source": "O*NET",
        "code": "11-3051.00",
        "url": "https://www.onetonline.org/link/summary/11-3051.00",
        "quote": "Develop or implement production tracking or quality control systems, analyzing production, quality control, maintenance, or other operational reports to detect production problems."
      },
      {
        "source": "Industry Report",
        "url": "https://www.gainsight.com/blog/the-state-of-customer-success/",
        "quote": "Quarterly churn risk reviews that include ARR-weighted priority tiers reduce unplanned churn by 25% on average."
      }
    ],
    "upstreamDeskIds": [
      "CS-L06-Lakshmi"
    ],
    "downstreamDeskIds": [
      "CS-L08-Astrid"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the churn risk report include all required fields (account, ARR, tier, driver, owner)?",
        "Does the cycle plan name exactly 3 team focus areas?",
        "Does the VoC summary include themes, frequency, quotes, and a priority ranking?",
        "Are 5-7 agenda bullets present in the 1:1 notes for Lakshmi?"
      ],
      "quality": [
        "Does the churn risk report include only accounts >$20K ARR at material risk?",
        "Are the cycle plan focus areas mutually exclusive and actionable?",
        "Does the VoC summary include verbatim-style representative quotes?",
        "Is the 1:1 feedback to Lakshmi direct and specific (not vague praise)?",
        "Is the VoC summary written for a cross-functional, non-CS audience?"
      ],
      "accuracy": [
        "Are churn risk tiers (High/Medium/Watch) consistently applied?",
        "Does the cycle plan reflect the actual team capacity situation?",
        "Does the VoC priority ranking align with the themes and frequency data?",
        "Does Dion's feedback to Lakshmi reference her actual recent outputs?",
        "Is the churn risk ARR totaled at the bottom of the report?"
      ],
      "handoff": [
        "Could CS-L08-Astrid walk into a leadership team meeting with the churn risk report?",
        "Could Astrid brief the exec team on VoC themes from the summary alone?",
        "Could Lakshmi run her own 1:1 from the agenda bullets without asking Dion for context?",
        "Is the cycle plan ready for a team kick-off meeting without revision?",
        "Does the VoC summary name which team (Product, Eng) should act on each priority?"
      ]
    }
  },
  {
    "id": "CS-L08-Astrid",
    "dept": "CS",
    "level": 8,
    "title": "Director of Customer Success",
    "name": "Astrid",
    "timeBudgetMin": 45,
    "brief": "You are Astrid, Director of Customer Success. You lead a team of ~25 CS professionals and sit on the GTM leadership team. You report to Idowu (CS-L09). Your scope includes strategy, hiring, cross-functional alignment, and owning the top 10 strategic accounts personally.\n\n1. CS department strategy memo: write a 2-page strategy document covering: where CS invests next quarter (focus bets), where it holds or reduces effort, what the department's North Star metric is for the next 6 months, and the top organizational risk (e.g., team burnout, tooling debt, coverage gap). This is the document Idowu and the CEO read.\n\n2. Hiring plan: you have headcount approval for 2 new CSM seats next quarter. Write a concise hiring brief: role levels, target profile, which segment/tier they'll own, and the cost/risk of NOT filling each seat within 90 days.\n\n3. Vendor budget allocation (LEGOPS-L07-Vidya inbound): you've received the vendor budget guidance from Legal Ops. Review it and write a one-page CS vendor stack assessment: which current tools renew, which are at-risk of being cut, and one new tool you'd advocate for. Include estimated spend impact.\n\n4. Executive account review: for your top strategic account (Aldgate Capital, 1,200 seats, $620K ARR), write a 1-page executive account brief: health status, relationship risk, expansion opportunity, and your recommended play for next quarter.\n\nYou are the department's strategic voice externally and operational backbone internally. Every document you produce is read by someone above you.",
    "deliverables": [
      {
        "filename": "cs-dept-strategy-memo.md",
        "description": "2-page CS strategy: invest/hold/reduce, North Star metric, top organizational risk"
      },
      {
        "filename": "cs-hiring-plan.md",
        "description": "Hiring brief for 2 CSM seats: level, profile, segment ownership, cost of not filling"
      },
      {
        "filename": "cs-vendor-stack-assessment.md",
        "description": "1-page vendor stack review: renew, at-risk, new tool recommendation, spend impact"
      },
      {
        "filename": "aldgate-account-brief.md",
        "description": "1-page executive account brief: health, relationship risk, expansion opportunity, recommended play"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3051.00",
        "url": "https://www.onetonline.org/link/summary/11-3051.00",
        "quote": "Develop budgets or approve expenditures for supplies, materials, or human resources, ensuring that materials, labor, or equipment are used efficiently to meet production targets."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Identify, develop, or evaluate marketing strategy, based on knowledge of establishment objectives, market characteristics, and cost and markup factors."
      },
      {
        "source": "O*NET",
        "code": "11-3051.00",
        "url": "https://www.onetonline.org/link/summary/11-3051.00",
        "quote": "Hire, train, evaluate, or discharge staff or resolve personnel grievances."
      },
      {
        "source": "Industry Report",
        "url": "https://www.gainsight.com/blog/the-state-of-customer-success/",
        "quote": "Directors of CS who publish a department strategy memo each quarter improve alignment with Sales and Product by 35%."
      }
    ],
    "upstreamDeskIds": [
      "CS-L07-Dion",
      "LEGOPS-L07-Vidya"
    ],
    "downstreamDeskIds": [
      "CS-L09-Idowu"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the strategy memo cover invest/hold/reduce, North Star metric, and top risk?",
        "Does the hiring plan cover both seats with level, profile, and cost of not filling?",
        "Does the vendor assessment cover renew/at-risk/new tool recommendation with spend impact?",
        "Does the account brief include health, relationship risk, expansion, and recommended play?"
      ],
      "quality": [
        "Does the strategy memo make explicit trade-offs (not just additions)?",
        "Is the North Star metric specific and measurable (not 'improve NPS')?",
        "Does the hiring brief state the business risk of a 90-day vacancy?",
        "Is the vendor assessment grounded in the LEGOPS-L07-Vidya budget guidance?",
        "Is the account brief written for an exec audience (no internal jargon)?"
      ],
      "accuracy": [
        "Does the strategy memo reference Dion's cycle plan and churn risk data upstream?",
        "Is the Aldgate Capital account brief consistent with the account details given ($620K ARR, 1,200 seats)?",
        "Is the vendor spend impact estimated (not left as 'TBD')?",
        "Does the hiring plan specify segment ownership for each seat (not generic)?",
        "Does the strategy reflect the current team size (~25 CS professionals)?"
      ],
      "handoff": [
        "Could CS-L09-Idowu brief the CEO from the strategy memo alone?",
        "Could HR start sourcing from the hiring brief without a follow-up call to Astrid?",
        "Could Finance model the vendor spend impact from the assessment?",
        "Is the account brief ready for an executive account call prep?",
        "Are the upstream inputs (Dion's work, Vidya's guidance) explicitly acknowledged?"
      ]
    }
  },
  {
    "id": "CS-L09-Idowu",
    "dept": "CS",
    "level": 9,
    "title": "VP of Customer Success",
    "name": "Idowu",
    "timeBudgetMin": 55,
    "brief": "You are Idowu, VP of Customer Success. You report to Talia (CS-L10, Chief Customer Officer) and sit on the GTM leadership team alongside Sales, Marketing, and Product VPs. You own the company's net revenue retention (NRR) number — 112% target for this fiscal year.\n\n1. NRR forecast: the quarter closes in 6 weeks. Using the department's churn risk report and expansion pipeline, write a 1-page NRR forecast. State: current trailing NRR, projected end-of-quarter NRR, the three scenarios (bear/base/bull), the key assumptions in each, and your recommended actions to protect the base case. This is the document Talia takes to the board.\n\n2. Cross-functional alignment memo: you are presenting at the GTM leadership meeting in 3 days. Write a 1-page memo for the Sales, Marketing, and Product VPs that summarizes: the CS team's top customer pain points this quarter, the handoffs that are working, and the one joint initiative you want to table for next quarter (propose it, don't just ask).\n\n3. CS org design review: headcount is frozen for one more quarter. Write a concise org design note: how do you reallocate your current team to maximize NRR impact given the constraint? Name specific people, segment reassignments, and the trade-offs you are accepting.\n\n4. Board pre-read contribution: Talia has asked for your input on the customer success section of the board pre-read. Write 1 page covering: NRR status, top churn risk summary (3 accounts), expansion wins this quarter, and the CS team's capacity headroom.\n\nAt this level, every document shapes decisions made by people who don't know the details. Your job is to make the right decision easy.",
    "deliverables": [
      {
        "filename": "nrr-forecast-q.md",
        "description": "1-page NRR forecast: trailing NRR, projected EOQ, bear/base/bull scenarios, recommended actions"
      },
      {
        "filename": "gtm-alignment-memo.md",
        "description": "1-page memo for GTM leadership: top pain points, working handoffs, one joint initiative proposal"
      },
      {
        "filename": "cs-org-design-note.md",
        "description": "Org design note: reallocation plan under headcount freeze, named people, trade-offs accepted"
      },
      {
        "filename": "board-pre-read-cs.md",
        "description": "1-page board pre-read input: NRR status, top 3 churn risks, expansion wins, capacity headroom"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Evaluate the financial aspects of product development, such as budgets, expenditures, research and development appropriations, or return-on-investment and profit-loss projections."
      },
      {
        "source": "O*NET",
        "code": "11-3051.00",
        "url": "https://www.onetonline.org/link/summary/11-3051.00",
        "quote": "Prepare and maintain production reports or personnel records."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Use sales forecasting or strategic planning to ensure the sale and profitability of products, lines, or services, analyzing business developments and monitoring market trends."
      },
      {
        "source": "Industry Report",
        "url": "https://www.gainsight.com/blog/the-state-of-customer-success/",
        "quote": "VP-level CS leaders who own NRR as a primary metric outperform peers on both retention and expansion revenue."
      }
    ],
    "upstreamDeskIds": [
      "CS-L08-Astrid"
    ],
    "downstreamDeskIds": [
      "CS-L10-Talia"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the NRR forecast include all three scenarios (bear/base/bull)?",
        "Does the GTM memo include a concrete joint initiative proposal (not just a question)?",
        "Does the org design note name specific people and segments?",
        "Does the board pre-read cover all four required sections?"
      ],
      "quality": [
        "Does the NRR forecast state key assumptions per scenario (not just numbers)?",
        "Is the GTM memo written for peer VPs (not for Idowu's direct team)?",
        "Does the org design note name the trade-offs explicitly (not just benefits)?",
        "Is the board pre-read tight enough for a 3-minute read?",
        "Does the recommended action in the NRR forecast have a named owner and deadline?"
      ],
      "accuracy": [
        "Is the 112% NRR target referenced in the forecast?",
        "Are the three churn risks in the board pre-read consistent with Astrid's churn risk report?",
        "Is the org design reallocation internally consistent (no more FTEs than available)?",
        "Does the GTM memo accurately characterize the state of CS-to-Product handoffs?",
        "Are the expansion wins in the board pre-read distinct from new logo wins?"
      ],
      "handoff": [
        "Could Talia take the board pre-read section to the board without rewriting?",
        "Could the GTM VP peers make a decision on the joint initiative from the memo alone?",
        "Could HR and Finance model the org design note without a call to Idowu?",
        "Does the NRR forecast set up Talia for a board Q&A on customer health?",
        "Is it clear which document goes to which audience (board, GTM, Talia)?"
      ]
    }
  },
  {
    "id": "CS-L10-Talia",
    "dept": "CS",
    "level": 10,
    "title": "Chief Customer Officer",
    "name": "Talia",
    "timeBudgetMin": 55,
    "brief": "You are Talia, Chief Customer Officer. You sit on the executive team, report to the CEO, and own the company's long-term customer relationships and revenue retention strategy. The board meets in two weeks. Your two biggest mandates this quarter: protect the company's NRR above 110%, and build the CS function into a revenue-generating motion (not just a retention function).\n\n1. Customer success vision: write a 1-page exec memo for the CEO and board articulating the 18-month CS vision. What does world-class customer success look like for this company? What is the single biggest strategic bet? Where are you explicitly NOT investing? This should be memorable and hard to misread.\n\n2. Board pre-read — CS section: the board meets in 14 days. Write the CS section of the board pre-read (1 page). Cover: NRR status vs. target, top churn risk summary (3 accounts, total ARR at risk), expansion wins, and the CS team's 90-day plan. Use Idowu's inputs. Make it count — board members have 4 minutes for this section.\n\n3. CS revenue strategy: CS is being asked to own a net-new expansion target of $800K next quarter. Write a 1-page strategy for how CS achieves this number: which account segments, which expansion motions (upsell, cross-sell, seat expansion), CS/Sales split on ownership, and the risk if the target is missed.\n\n4. CEO 1:1 prep: write 5-7 bullets for your weekly CEO 1:1 tomorrow. Mix: one win you want credit for, one risk they need to hear from you first, one ask (headcount, budget, or decision), and one cross-functional friction that needs CEO resolution.\n\nAt this level, your job is to make decisions stick and outcomes legible. Every word is load-bearing.",
    "deliverables": [
      {
        "filename": "cs-vision-memo.md",
        "description": "1-page 18-month CS vision: what world-class looks like, single biggest bet, explicit non-investments"
      },
      {
        "filename": "board-pre-read-cs-final.md",
        "description": "1-page board CS section: NRR vs. target, top 3 churn risks, expansion wins, 90-day plan"
      },
      {
        "filename": "cs-revenue-strategy.md",
        "description": "1-page expansion strategy: $800K target, segments, motions, CS/Sales split, miss risk"
      },
      {
        "filename": "ceo-1on1-prep.md",
        "description": "5-7 bullets for CEO 1:1: win, risk, ask, cross-functional friction needing CEO resolution"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Identify, develop, or evaluate marketing strategy, based on knowledge of establishment objectives, market characteristics, and cost and markup factors."
      },
      {
        "source": "O*NET",
        "code": "11-2021.00",
        "url": "https://www.onetonline.org/link/summary/11-2021.00",
        "quote": "Evaluate the financial aspects of product development, such as budgets, expenditures, research and development appropriations, or return-on-investment and profit-loss projections."
      },
      {
        "source": "O*NET",
        "code": "11-3051.00",
        "url": "https://www.onetonline.org/link/summary/11-3051.00",
        "quote": "Direct or coordinate production, processing, distribution, or marketing activities of industrial organizations."
      },
      {
        "source": "Industry Report",
        "url": "https://www.gainsight.com/blog/the-state-of-customer-success/",
        "quote": "Chief Customer Officers who tie CS to a revenue expansion target signal board-level maturity of the CS function."
      }
    ],
    "upstreamDeskIds": [
      "CS-L09-Idowu"
    ],
    "downstreamDeskIds": [],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the vision memo state ONE single biggest bet (not a list)?",
        "Does the board pre-read cover NRR, churn risks, expansion wins, and 90-day plan?",
        "Does the revenue strategy name specific expansion motions and the CS/Sales ownership split?",
        "Are 5-7 CEO 1:1 bullets present with the required mix (win, risk, ask, friction)?"
      ],
      "quality": [
        "Is the vision memo memorable and unambiguous (would two executives read it the same way)?",
        "Does the board pre-read use real numbers (not directional language like 'trending up')?",
        "Does the revenue strategy state what happens if the $800K target is missed?",
        "Is the CEO 1:1 prep focused on what Talia uniquely knows (not a status report)?",
        "Are non-investments in the vision memo explicit (not just 'we'll focus on X')?"
      ],
      "accuracy": [
        "Does the board pre-read use NRR figures consistent with Idowu's forecast upstream?",
        "Is the 110% NRR floor referenced as the protection threshold?",
        "Does the $800K expansion target break down plausibly across segments and motions?",
        "Do the top 3 churn risks in the board pre-read match the accounts Astrid flagged?",
        "Is the CS/Sales ownership split on expansion internally consistent with the team's current structure?"
      ],
      "handoff": [
        "Could the CEO walk into the board meeting from the board pre-read alone?",
        "Could the CFO model the CS revenue strategy without a follow-up call?",
        "Does the vision memo set up the next quarter's OKR cascade for Idowu?",
        "Could a board member ask 2-3 questions and get full answers from the pre-read?",
        "Does the CEO 1:1 prep include the one piece of news they should hear from Talia first?"
      ]
    }
  },
  {
    "id": "FIN-L01-Tyler",
    "dept": "FIN",
    "level": 1,
    "title": "AP/AR Specialist",
    "name": "Tyler",
    "timeBudgetMin": 25,
    "brief": "You are Tyler, an AP/AR Specialist at a 100-person SaaS company. You handle the daily transactional backbone of the finance function — invoices in, payments out, records clean.\n\nYour day:\n\n1. Process the AP batch: you have 12 vendor invoices sitting in the queue. Match each invoice against its purchase order, verify amounts, and code each line item to the correct GL account. Flag any that lack a PO or show a >5% variance.\n2. AR aging check: pull the current AR aging report from the accounting system. Identify all accounts 30+ days overdue. Draft a follow-up email template for the collections outreach on the two largest overdue balances.\n3. Bank reconciliation stub: reconcile today's bank feed (10 transactions) against the GL. Note any unmatched items and propose the correct GL treatment for each.\n\nDo not approve payments or write off balances — those require manager sign-off. Stay transactional.",
    "deliverables": [
      {
        "filename": "ap-batch-log.xlsx",
        "description": "12-row invoice log: vendor, PO reference, amount, GL code, match status (OK / FLAG), flag reason if applicable"
      },
      {
        "filename": "ar-aging-summary.md",
        "description": "Aging buckets (current, 30, 60, 90+ days), top-2 overdue accounts highlighted, draft collections email template"
      },
      {
        "filename": "bank-recon-stub.md",
        "description": "10-transaction reconciliation: matched vs. unmatched, proposed GL treatment for exceptions"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "43-3031.00",
        "url": "https://www.onetonline.org/link/summary/43-3031.00",
        "quote": "Match order forms with invoices, and record the necessary information."
      },
      {
        "source": "O*NET",
        "code": "43-3031.00",
        "url": "https://www.onetonline.org/link/summary/43-3031.00",
        "quote": "Reconcile or note and report discrepancies found in records."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/office-and-administrative-support/bookkeeping-accounting-and-auditing-clerks.htm",
        "quote": "Bookkeeping, accounting, and auditing clerks produce financial records for organizations."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "FIN-L05-Camille"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the AP batch log cover all 12 invoices?",
        "Are flagged invoices given explicit flag reasons?",
        "Does the AR aging summary include all four aging buckets?",
        "Is the bank reconciliation stub present with unmatched items noted?"
      ],
      "quality": [
        "Are GL codes plausible and consistently applied?",
        "Is the collections email professional and specific to the overdue accounts?",
        "Are the flag criteria (missing PO or >5% variance) applied correctly?",
        "Is the reconciliation stub structured so a manager can review it in under 2 minutes?",
        "Is the AR summary scannable (not a wall of text)?"
      ],
      "accuracy": [
        "Do invoice amounts, PO references, and GL codes form a consistent set?",
        "Are aging-bucket totals mathematically coherent?",
        "Are unmatched bank items described with enough detail to resolve?",
        "Does the flag logic correctly exclude items within the 5% tolerance?",
        "Are proposed GL treatments standard for the transaction types listed?"
      ],
      "handoff": [
        "Could FIN-L05-Camille approve or escalate flagged invoices from the AP log alone?",
        "Is the collections email ready to send with only recipient/amount substitution?",
        "Are unmatched reconciliation items clearly marked as needing manager decision?",
        "Would the AR aging summary feed into a monthly close report without rework?",
        "Did Tyler flag any items requiring manager approval rather than acting unilaterally?"
      ]
    }
  },
  {
    "id": "FIN-L02-Wendell",
    "dept": "FIN",
    "level": 2,
    "title": "Junior Accountant",
    "name": "Wendell",
    "timeBudgetMin": 25,
    "brief": "You are Wendell, a Junior Accountant at a 100-person SaaS company. You sit one step above data entry — you own month-end journal entries and basic financial statement prep for your assigned accounts.\n\nYour day:\n\n1. Prepare adjusting journal entries for this month's accruals. You have three items: (a) prepaid insurance amortization — $1,800/month; (b) accrued wages — $22,400 for the last 3 days of the month not yet in payroll; (c) depreciation on a $48,000 server rack over 36 months straight-line. Write each entry with debit/credit accounts, amounts, and a one-line memo.\n2. Trial balance check: a trial balance export has a $340 out-of-balance condition. Identify the most likely causes (transposition error, missing entry, etc.) and propose a step-by-step investigation plan.\n3. Draft the prepaid-expense roll-forward schedule for the month: open balance, additions, amortization, closing balance. Format as a simple table.\n\nDo not post entries to the ledger — the Senior Accountant (FIN-L03-Hadiya) reviews and posts.",
    "deliverables": [
      {
        "filename": "adjusting-entries.md",
        "description": "Three journal entries with debit/credit accounts, dollar amounts, and one-line memos for each"
      },
      {
        "filename": "trial-balance-investigation.md",
        "description": "Root-cause hypotheses for the $340 out-of-balance, step-by-step investigation checklist"
      },
      {
        "filename": "prepaid-rollforward.xlsx",
        "description": "Prepaid-expense schedule: opening balance, additions, amortization, closing balance by expense type"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "43-3031.00",
        "url": "https://www.onetonline.org/link/summary/43-3031.00",
        "quote": "Classify, record, and summarize numerical and financial data to compile and keep financial records, using journals and ledgers or computers."
      },
      {
        "source": "O*NET",
        "code": "13-2011.00",
        "url": "https://www.onetonline.org/link/summary/13-2011.00",
        "quote": "Prepare adjusting journal entries."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/accountants-and-auditors.htm",
        "quote": "Accountants and auditors prepare and examine financial records, identify potential areas of opportunity and risk, and provide solutions."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "FIN-L03-Hadiya",
      "FIN-L05-Camille"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Are all three adjusting journal entries documented?",
        "Does the trial balance investigation produce a step-by-step plan, not just guesses?",
        "Does the prepaid roll-forward have all four columns (open, add, amort, close)?",
        "Are debit/credit amounts present for each journal entry?"
      ],
      "quality": [
        "Are debits and credits correctly assigned for each entry type?",
        "Is the investigation plan actionable (not vague)?",
        "Is the prepaid roll-forward table clean and machine-readable?",
        "Are one-line memos descriptive enough for an auditor to understand the entry?",
        "Is the math correct on all three journal entries?"
      ],
      "accuracy": [
        "Is the prepaid insurance amortization calculated correctly ($1,800/month)?",
        "Is the accrued wages entry for the right amount ($22,400)?",
        "Is the depreciation entry $1,333.33/month ($48,000 / 36)?",
        "Are the hypothesized causes of the $340 discrepancy technically valid?",
        "Does the roll-forward closing balance equal opening + additions - amortization?"
      ],
      "handoff": [
        "Could FIN-L03-Hadiya post these entries without asking Wendell follow-up questions?",
        "Is each journal entry memo sufficient for an external auditor's review?",
        "Is the investigation checklist sequenced so the most common cause is checked first?",
        "Is the roll-forward formatted consistently with standard month-end close packages?",
        "Did Wendell flag any entries where he was uncertain about account classification?"
      ]
    }
  },
  {
    "id": "FIN-L03-Hadiya",
    "dept": "FIN",
    "level": 3,
    "title": "Staff Accountant",
    "name": "Hadiya",
    "timeBudgetMin": 25,
    "brief": "You are Hadiya, a Staff Accountant at a 100-person SaaS company. You own the monthly close for revenue and receivables, and you are the finance contact for new deal onboarding. Today is a busy close day with a cross-dept handoff landing in your queue.\n\nYour day:\n\n1. New deal intake from Sales: SALES-L06-Zara has passed over finalized deal terms for three new enterprise contracts. For each contract, determine the correct revenue recognition treatment under ASC 606 (point-in-time vs. over-time), draft the opening journal entries, and flag any multi-element arrangements that need a standalone selling price allocation memo.\n2. Monthly close — revenue reconciliation: reconcile billed ARR against the subscription ledger. Identify any timing differences between billing and revenue recognition. Summarize in a one-page close memo.\n3. Review Wendell's adjusting journal entries (FIN-L02-Wendell) and either approve them for posting or return with corrections. Document your review decision.\n\nYou are the first line of technical accounting judgment on the team. If you're unsure on a rev rec question, escalate to FIN-L05-Camille — do not guess.",
    "deliverables": [
      {
        "filename": "deal-intake-memo.md",
        "description": "Rev rec treatment for three new contracts: ASC 606 classification, opening journal entries, any SSP allocation flags"
      },
      {
        "filename": "revenue-recon.md",
        "description": "One-page monthly close memo reconciling billed ARR to recognized revenue, with variance explanations"
      },
      {
        "filename": "je-review-notes.md",
        "description": "Review decision on Wendell's three adjusting entries: approved / returned with specific corrections"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-2011.00",
        "url": "https://www.onetonline.org/link/summary/13-2011.00",
        "quote": "Prepare, examine, or analyze accounting records, financial statements, or other financial reports to assess accuracy, completeness, and conformance to reporting and procedural standards."
      },
      {
        "source": "O*NET",
        "code": "13-2011.00",
        "url": "https://www.onetonline.org/link/summary/13-2011.00",
        "quote": "Review accounts for discrepancies and reconcile differences."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/accountants-and-auditors.htm",
        "quote": "Accountants and auditors assess financial operations and work to help ensure that organizations run efficiently."
      }
    ],
    "upstreamDeskIds": [
      "SALES-L06-Zara",
      "FIN-L02-Wendell"
    ],
    "downstreamDeskIds": [
      "FIN-L05-Camille"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the deal intake memo address all three contracts?",
        "Does each contract entry include an ASC 606 classification (point-in-time or over-time)?",
        "Is the revenue reconciliation memo present and covering the full close period?",
        "Does the JE review note an explicit approve or return decision for each entry?"
      ],
      "quality": [
        "Are ASC 606 classifications logically justified, not just asserted?",
        "Does the revenue recon memo name specific variance line items, not just totals?",
        "Are corrections in the JE review specific enough for Wendell to act on?",
        "Is the deal intake memo structured so FIN-L05-Camille can review in <5 minutes?",
        "Does Hadiya escalate to Camille rather than guessing on genuinely ambiguous rev rec questions?"
      ],
      "accuracy": [
        "Are the ASC 606 classifications consistent with the contract terms provided by Zara?",
        "Do opening journal entries correctly establish contract asset or liability positions?",
        "Is the ARR-to-revenue variance explained without double-counting?",
        "Are Wendell's entries reviewed against standard accounting rules, not just spot-checked?",
        "Are any multi-element arrangements correctly identified where SSP allocation is required?"
      ],
      "handoff": [
        "Could FIN-L05-Camille post the entries from the deal intake memo without rework?",
        "Is Zara's deal terms input acknowledged explicitly in the deal intake memo?",
        "Could an external auditor trace each revenue recognition decision back to a contract clause?",
        "Are returned JE corrections written so Wendell can fix and resubmit without a meeting?",
        "Does the revenue recon memo satisfy the month-end close checklist standard?"
      ]
    }
  },
  {
    "id": "FIN-L04-Sven",
    "dept": "FIN",
    "level": 4,
    "title": "Senior Financial Analyst",
    "name": "Sven",
    "timeBudgetMin": 35,
    "brief": "You are Sven, a Senior Financial Analyst at a 100-person SaaS company. You own the financial model and variance analysis that feeds the monthly management pack. You work closely with the FP&A Lead (FIN-L05-Camille) and are the go-to for deep quantitative work.\n\nYour day:\n\n1. Budget vs. actuals variance analysis: pull the current month P&L actuals and compare against the approved budget. For each line with a variance >5% or >$10K, write a one-paragraph explanation of root cause and reforecast impact. Produce a structured variance table.\n2. SaaS metrics update: update the monthly SaaS metrics dashboard — MRR, ARR, net revenue retention, churn rate, CAC payback period. Use standard SaaS definitions. Flag any metric that moved >10% MoM and provide a one-line explanation.\n3. Scenario model: Camille asked for a 3-scenario (base, upside, downside) revenue model for next quarter. Build it. Each scenario must state the key assumption that differentiates it and a revenue number.\n4. Data quality check: review the source data Wendell and Hadiya produced (adjusting entries and revenue recon) for consistency before these numbers roll into the management pack.\n\nYou are the analytical backbone. If numbers don't tell a coherent story, say so.",
    "deliverables": [
      {
        "filename": "variance-analysis.xlsx",
        "description": "Budget-vs-actuals table with variance columns and one-paragraph root-cause explanation per material line"
      },
      {
        "filename": "saas-metrics.md",
        "description": "Monthly SaaS metrics dashboard: MRR, ARR, NRR, churn, CAC payback — with MoM delta flags"
      },
      {
        "filename": "scenario-model.xlsx",
        "description": "3-scenario revenue model for next quarter: base/upside/downside with key differentiating assumptions"
      },
      {
        "filename": "data-quality-notes.md",
        "description": "Consistency check: any discrepancies between Wendell's JEs and Hadiya's revenue recon before management pack rollup"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-2051.00",
        "url": "https://www.onetonline.org/link/summary/13-2051.00",
        "quote": "Inform investment decisions by analyzing financial information to forecast business, industry, or economic conditions."
      },
      {
        "source": "O*NET",
        "code": "13-2051.00",
        "url": "https://www.onetonline.org/link/summary/13-2051.00",
        "quote": "Employ financial models to develop solutions to financial problems or to assess the financial or capital impact of transactions."
      },
      {
        "source": "O*NET",
        "code": "13-2011.00",
        "url": "https://www.onetonline.org/link/summary/13-2011.00",
        "quote": "Analyze business operations, trends, costs, revenues, financial commitments, and obligations to project future revenues and expenses or to provide advice."
      }
    ],
    "upstreamDeskIds": [
      "FIN-L02-Wendell",
      "FIN-L03-Hadiya"
    ],
    "downstreamDeskIds": [
      "FIN-L05-Camille"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the variance analysis cover every material line (>5% or >$10K)?",
        "Are all five SaaS metrics present in the dashboard?",
        "Does the scenario model contain exactly three scenarios with distinct assumptions?",
        "Is the data quality check present and sourced from Wendell/Hadiya outputs?"
      ],
      "quality": [
        "Are variance root-cause explanations analytical (not just re-stating the number)?",
        "Are SaaS metric definitions standard and consistently applied?",
        "Do the three scenario assumptions genuinely differentiate outcomes (not just ±5% toggles)?",
        "Is the variance table scannable in <3 minutes for a senior manager?",
        "Does the data quality check call out specific discrepancies, not generic assurances?"
      ],
      "accuracy": [
        "Are variance percentages and dollar amounts internally consistent?",
        "Are SaaS metrics calculated from consistent numerator/denominator definitions?",
        "Does the scenario model math check out (revenue = volume × price or equivalent)?",
        "Are data quality flags traceable to specific cell references or line items?",
        "Is MoM flagging applied consistently (>10% threshold as specified)?"
      ],
      "handoff": [
        "Could FIN-L05-Camille drop the variance table directly into the management pack?",
        "Are scenario model assumptions stated clearly enough for the CFO to challenge them?",
        "Are data quality issues prioritized (blocking vs. informational)?",
        "Is the SaaS dashboard self-contained (no unexplained abbreviations)?",
        "Did Sven flag any numbers that require Camille's judgment before the pack is sent?"
      ]
    }
  },
  {
    "id": "FIN-L05-Camille",
    "dept": "FIN",
    "level": 5,
    "title": "FP&A Lead",
    "name": "Camille",
    "timeBudgetMin": 35,
    "brief": "You are Camille, the FP&A Lead at a 100-person SaaS company. You are the first synthesis tier for Finance — you consume the outputs of Tyler (AP/AR), Wendell (JEs), Hadiya (rev rec), and Sven (variance analysis + models), compress them into a management-ready monthly close package, and set the analytical agenda for the team.\n\nYour day:\n\n1. Monthly close package: synthesize the outputs from FIN-L01 through FIN-L04 into a 3-5 page management pack covering P&L, balance sheet highlights, cash position, and SaaS metrics. This goes to FIN-L06-Jamal for manager review.\n2. Forecast update: integrate Sven's 3-scenario model into the rolling 12-month forecast. Pick the base-case scenario and document why. Surface the two biggest forecast risks.\n3. Team review: write brief review notes on each IC's work product — what's ready, what needs revision, and one coaching point per person. This is your 1:1 prep material.\n4. Escalation log: any technical accounting questions from Hadiya, data inconsistencies from Sven, or overdue AP items from Tyler should be captured here with a recommended resolution or an escalation path.\n\nYou are the bridge between execution and management. You should produce material a VP can read in 10 minutes.",
    "deliverables": [
      {
        "filename": "monthly-close-package.md",
        "description": "3-5 page management pack: P&L summary, balance sheet highlights, cash position, SaaS metrics, key narratives"
      },
      {
        "filename": "forecast-update.xlsx",
        "description": "Rolling 12-month forecast updated with base-case scenario, forecast risk summary (top 2 risks)"
      },
      {
        "filename": "team-review-notes.md",
        "description": "Review notes for Tyler, Wendell, Hadiya, and Sven: status (ready/needs revision) and one coaching point each"
      },
      {
        "filename": "escalation-log.md",
        "description": "Open items from the team: unresolved accounting questions, data issues, AP exceptions — each with recommended action"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-2051.00",
        "url": "https://www.onetonline.org/link/summary/13-2051.00",
        "quote": "Present oral or written reports on general economic trends, individual corporations, and entire industries."
      },
      {
        "source": "O*NET",
        "code": "13-2051.00",
        "url": "https://www.onetonline.org/link/summary/13-2051.00",
        "quote": "Prepare plans of action for investment, using financial analyses."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/financial-analysts.htm",
        "quote": "Financial analysts provide guidance to businesses and individuals making investment decisions."
      }
    ],
    "upstreamDeskIds": [
      "FIN-L01-Tyler",
      "FIN-L02-Wendell",
      "FIN-L03-Hadiya",
      "FIN-L04-Sven"
    ],
    "downstreamDeskIds": [
      "FIN-L06-Jamal"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the close package include P&L, balance sheet, cash, and SaaS metrics?",
        "Does the forecast update name the base-case scenario and justify the choice?",
        "Are review notes present for all four ICs?",
        "Does the escalation log include recommended actions, not just a list of issues?"
      ],
      "quality": [
        "Is the close package narrative written for a VP — not a controller?",
        "Are the top-2 forecast risks quantified, not just named?",
        "Are coaching points actionable and specific to each IC's actual output?",
        "Is the escalation log prioritized (blocking vs. informational)?",
        "Does the close package compress the IC outputs without losing material information?"
      ],
      "accuracy": [
        "Are the numbers in the close package consistent with Sven's variance analysis?",
        "Is the base-case forecast derived from Sven's scenario model, not independently fabricated?",
        "Are escalation items traced to specific upstream work products?",
        "Are coaching points grounded in actual output quality, not generic advice?",
        "Is the cash position consistent with Tyler's AR aging and the bank recon?"
      ],
      "handoff": [
        "Could FIN-L06-Jamal run the management review meeting from the close package alone?",
        "Are the top-2 forecast risks in a format suitable for the CFO's board prep?",
        "Would each IC understand their coaching point without a meeting?",
        "Are escalation items written so Jamal can make a decision without re-reading source files?",
        "Is the monthly close package formatted consistently with prior months?"
      ]
    }
  },
  {
    "id": "FIN-L06-Jamal",
    "dept": "FIN",
    "level": 6,
    "title": "Accounting Manager",
    "name": "Jamal",
    "timeBudgetMin": 35,
    "brief": "You are Jamal, the Accounting Manager at a 100-person SaaS company. You run the monthly close process end-to-end, own the audit relationship, and are responsible for the integrity of the general ledger. Camille (FIN-L05) reports to you on the FP&A side; you also oversee the AP/AR and accounting ICs.\n\nYour day:\n\n1. Close sign-off: review Camille's monthly close package. Validate the key numbers against the GL, mark it ready for senior finance review, or return with specific line-item corrections. This review must be documented.\n2. Audit prep item: your external auditors have requested a schedule of all related-party transactions for the quarter. Compile the schedule from the GL and draft the accompanying disclosure memo.\n3. Policy enforcement: the AP team processed two invoices without a matching PO this month (flagged by Tyler). Write a one-page process improvement memo — what broke, what the fix is, and how you'll monitor going forward.\n4. Team capacity plan: with month-end behind you, plan next month's close schedule — assign owners to each close task (journal entries, recon, review, pack), set due dates, and identify any vacation/coverage risks.\n\nYou are accountable for zero material misstatements. If you're not sure, you call the auditor — you don't guess.",
    "deliverables": [
      {
        "filename": "close-review-sign-off.md",
        "description": "Line-item review of Camille's close package: ready / return decision with specific corrections if needed"
      },
      {
        "filename": "related-party-schedule.xlsx",
        "description": "Related-party transaction schedule for the quarter with disclosure memo draft"
      },
      {
        "filename": "ap-process-improvement.md",
        "description": "One-page memo: root cause of PO-bypass invoices, corrective action, monitoring mechanism"
      },
      {
        "filename": "close-schedule-next-month.md",
        "description": "Next month's close calendar: tasks, owners, due dates, coverage risks"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3031.00",
        "url": "https://www.onetonline.org/link/summary/11-3031.00",
        "quote": "Evaluate data pertaining to costs to plan budgets."
      },
      {
        "source": "O*NET",
        "code": "13-2011.00",
        "url": "https://www.onetonline.org/link/summary/13-2011.00",
        "quote": "Inspect account books and accounting systems for efficiency, effectiveness, and use of accepted accounting procedures to record transactions."
      },
      {
        "source": "O*NET",
        "code": "11-3031.00",
        "url": "https://www.onetonline.org/link/summary/11-3031.00",
        "quote": "Prepare financial or regulatory reports required by laws, regulations, or boards of directors."
      }
    ],
    "upstreamDeskIds": [
      "FIN-L05-Camille"
    ],
    "downstreamDeskIds": [
      "FIN-L07-Inez"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the close review sign-off include a ready/return decision for each section?",
        "Does the related-party schedule cover the full quarter?",
        "Does the AP process memo name both the root cause and a monitoring mechanism?",
        "Does the close schedule assign an owner to every task?"
      ],
      "quality": [
        "Are close review corrections specific (account, amount, entry) rather than general?",
        "Is the related-party disclosure memo in language suitable for external audit review?",
        "Does the process improvement memo go beyond 'train the team' to structural controls?",
        "Is the close schedule realistic given team size and the identified vacation risks?",
        "Is the sign-off memo structured so FIN-L07-Inez can approve without re-reading the pack?"
      ],
      "accuracy": [
        "Are corrections in the close review traceable to specific GL entries?",
        "Is the related-party schedule consistent with known vendor and investor relationships?",
        "Is the root cause of PO bypass grounded in the facts Tyler flagged (not hypothetical)?",
        "Are close schedule due dates internally consistent (dependencies respected)?",
        "Is the disclosure memo language consistent with standard accounting disclosure practice?"
      ],
      "handoff": [
        "Could FIN-L07-Inez approve the close package from Jamal's sign-off memo alone?",
        "Is the related-party schedule in audit-ready format?",
        "Would Tyler understand the AP process change from the memo without a meeting?",
        "Is the close schedule shareable with the team immediately (no further formatting)?",
        "Are any open items that require Inez's decision called out explicitly?"
      ]
    }
  },
  {
    "id": "FIN-L07-Inez",
    "dept": "FIN",
    "level": 7,
    "title": "Senior Finance Manager",
    "name": "Inez",
    "timeBudgetMin": 45,
    "brief": "You are Inez, Senior Finance Manager at a 100-person SaaS company. You own the financial planning cycle, treasury basics, and cross-functional financial governance. You sit between the Accounting Manager (Jamal, FIN-L06) and the Director of Finance (Pierre, FIN-L08), acting as the operational lead who translates business decisions into financial controls.\n\nYour day:\n\n1. Annual budget cycle — Phase 2 review: department budget submissions are in from all functions. You've received Jamal's close-validated numbers. Review submissions against the company's target growth rate and operating margin, flag any department overruns or underruns >$50K, and write a consolidated budget review memo for Pierre.\n2. Cash flow forecast update: update the 13-week rolling cash flow forecast. Inputs: AR aging (Tyler), accounts payable run-rate, payroll schedule, and the current cash balance. Identify any weeks where the cash balance falls below the $500K minimum threshold and recommend corrective action.\n3. Vendor payment terms review: three major vendor contracts are up for renewal. Analyze payment term options (net-30 vs. net-60 vs. net-90) and quantify the working capital impact of each. Recommend a position.\n4. Controls memo: following last month's PO bypass incident (Jamal's process memo), write a finance controls self-assessment covering the AP, payroll, and revenue recognition controls. Rate each control (effective / needs improvement / deficient) and propose a remediation timeline.\n\nYou bridge operations and strategy. Your outputs need to hold up to CFO scrutiny.",
    "deliverables": [
      {
        "filename": "budget-review-memo.md",
        "description": "Consolidated budget review: department-by-department summary, material variances flagged, recommendation for Pierre"
      },
      {
        "filename": "cash-flow-forecast.xlsx",
        "description": "13-week rolling cash flow: weekly receipts, disbursements, net, ending balance — with threshold breach flags and corrective actions"
      },
      {
        "filename": "vendor-payment-terms.md",
        "description": "Payment terms analysis for three contracts: working capital impact by scenario, recommended position"
      },
      {
        "filename": "controls-self-assessment.md",
        "description": "AP, payroll, and rev rec controls rated (effective/needs improvement/deficient) with remediation timeline"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3031.00",
        "url": "https://www.onetonline.org/link/summary/11-3031.00",
        "quote": "Develop or analyze information to assess the current or future financial status of firms."
      },
      {
        "source": "O*NET",
        "code": "11-3031.00",
        "url": "https://www.onetonline.org/link/summary/11-3031.00",
        "quote": "Oversee the flow of cash or financial instruments."
      },
      {
        "source": "O*NET",
        "code": "11-3031.00",
        "url": "https://www.onetonline.org/link/summary/11-3031.00",
        "quote": "Evaluate financial reporting systems, accounting or collection procedures, or investment activities and make recommendations for changes to procedures, operating systems, budgets, or other financial control functions."
      }
    ],
    "upstreamDeskIds": [
      "FIN-L06-Jamal"
    ],
    "downstreamDeskIds": [
      "FIN-L08-Pierre"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the budget review memo flag variances >$50K per department?",
        "Does the cash flow forecast cover 13 full weeks?",
        "Does the vendor analysis cover all three contracts with at least two payment term options?",
        "Does the controls self-assessment rate all three control areas (AP, payroll, rev rec)?"
      ],
      "quality": [
        "Is the budget review memo structured so Pierre can make decisions without reading department submissions?",
        "Does the cash flow forecast flag minimum balance breaches proactively?",
        "Is the vendor payment terms recommendation quantified (not just 'pick net-60')?",
        "Are controls ratings supported by evidence, not just assertions?",
        "Is the remediation timeline in the controls memo specific (dates, owners)?"
      ],
      "accuracy": [
        "Is the cash flow forecast consistent with Tyler's AR aging data?",
        "Are department budget variances calculated against the approved target, not the prior year?",
        "Is the working capital impact correctly modeled for each payment term scenario?",
        "Are control deficiency ratings consistent with the PO bypass incident evidence?",
        "Are threshold breach weeks correctly identified against the $500K minimum?"
      ],
      "handoff": [
        "Could FIN-L08-Pierre brief the CFO from the budget review memo alone?",
        "Is the cash flow forecast in a format Pierre can send to the bank relationship manager?",
        "Is the vendor recommendation written so Pierre can approve or modify in a single meeting?",
        "Could an external auditor use the controls self-assessment as an audit input?",
        "Are any items requiring Pierre's sign-off before Inez can proceed explicitly flagged?"
      ]
    }
  },
  {
    "id": "FIN-L08-Pierre",
    "dept": "FIN",
    "level": 8,
    "title": "Director of Finance",
    "name": "Pierre",
    "timeBudgetMin": 45,
    "brief": "You are Pierre, Director of Finance at a 100-person SaaS company. You own the financial strategy for the business below the CFO level — headcount budgets, departmental allocations, audit relationship, and the forward-looking financial model that the board will see. Today is a convergence day: three cross-functional handoffs have landed simultaneously, and you need to synthesize them into a coherent departmental financial plan.\n\nYour day:\n\n1. Comp budget — headcount handoff: HR-L08-Renaud has sent the approved headcount plan (new hires, backfills, role changes). Engineering Director Esther (ENG-L08-Esther) has sent the engineering hiring plan with cost-of-vacancy analysis. Integrate both into a single headcount-driven compensation budget. Identify the total comp impact, flag any roles where the budget is underfunded, and produce a reconciled headcount schedule by department.\n2. Vendor budget allocation: LEGOPS-L07-Vidya has passed the finalized vendor budget for the year. Map it against your departmental cost center structure. Flag any vendor commitments that exceed the approved departmental envelope and propose reallocation options.\n3. Department financial plan: produce a one-page financial summary for each of the five cost centers under your purview (Finance, HR, Legal/Ops, Facilities, IT). For each: budget, forecast, key risks, and one recommended action.\n4. Audit status: your external auditor has three open PBC (prepared-by-client) items. Write the responses and attach the supporting documentation list. Set a completion date for each item.\n\nYou are the last line of financial defense before the CFO. If a number doesn't hold up, it stops here.",
    "deliverables": [
      {
        "filename": "comp-budget-headcount.xlsx",
        "description": "Integrated headcount schedule: department, role, start date, annual comp, underfunded flags — sourced from HR and ENG hiring plans"
      },
      {
        "filename": "vendor-budget-allocation.md",
        "description": "Vendor commitments mapped to cost centers, envelope exceedances flagged, reallocation options proposed"
      },
      {
        "filename": "department-financial-plans.md",
        "description": "One-page summary per cost center (5 total): budget, forecast, key risks, recommended action"
      },
      {
        "filename": "audit-pbc-responses.md",
        "description": "Responses to three open PBC items: response text, supporting document list, completion date"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3031.00",
        "url": "https://www.onetonline.org/link/summary/11-3031.00",
        "quote": "Prepare operational or risk reports for management analysis."
      },
      {
        "source": "O*NET",
        "code": "11-3031.00",
        "url": "https://www.onetonline.org/link/summary/11-3031.00",
        "quote": "Establish procedures for custody or control of assets, records, loan collateral, or securities to ensure safekeeping."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/financial-managers.htm",
        "quote": "Financial managers create financial reports, direct investment activities, and develop plans for the long-term financial goals of their organization."
      }
    ],
    "upstreamDeskIds": [
      "FIN-L07-Inez",
      "HR-L08-Renaud",
      "ENG-L08-Esther",
      "LEGOPS-L07-Vidya"
    ],
    "downstreamDeskIds": [
      "FIN-L09-Naila"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the comp budget integrate both HR and ENG hiring plans?",
        "Does the vendor allocation memo cover all commitments from Vidya's input?",
        "Are all five cost centers covered in the department financial plans?",
        "Are all three PBC items addressed with completion dates?"
      ],
      "quality": [
        "Are underfunded roles identified with a specific dollar gap, not just flagged?",
        "Are reallocation options in the vendor memo actionable (not just 'cut vendor X')?",
        "Is each cost center plan one page and decision-ready for the CFO?",
        "Are PBC responses written in audit-quality language?",
        "Is the comp budget internally consistent across HR and ENG inputs?"
      ],
      "accuracy": [
        "Are role costs consistent with the comp bands from HR-L08-Renaud's headcount plan?",
        "Does the vendor allocation correctly map Vidya's commitments to the existing cost center structure?",
        "Are the five cost center forecasts consistent with Inez's bottom-up budget numbers?",
        "Are PBC responses factually consistent with the GL and close package?",
        "Are underfunded flags calculated against the correct approved envelope, not last year's budget?"
      ],
      "handoff": [
        "Could FIN-L09-Naila present the comp budget to the CFO without Pierre in the room?",
        "Could HR-L08-Renaud reconcile their headcount plan against Pierre's comp budget output?",
        "Could ENG-L08-Esther confirm their hiring plan is fully reflected in the comp budget?",
        "Are the PBC responses ready to email to the auditor without revision?",
        "Are items requiring CFO sign-off (budget exceedances, audit responses) explicitly escalated?"
      ]
    }
  },
  {
    "id": "FIN-L09-Naila",
    "dept": "FIN",
    "level": 9,
    "title": "VP Finance",
    "name": "Naila",
    "timeBudgetMin": 55,
    "brief": "You are Naila, VP Finance at a 100-person SaaS company. You translate the company's strategy into its financial operating model and are the primary CFO delegate for day-to-day financial governance. You own the annual plan, the investor relations calendar, and the relationship with the company's banking and insurance counterparties. Pierre (FIN-L08) reports to you.\n\nYour day:\n\n1. Annual operating plan (AOP) consolidation: Pierre has submitted the departmental financial plans. Consolidate them into a company-wide AOP. Include: total revenue, COGS breakdown, gross margin, operating expense by function, EBITDA, and cash flow from operations. Add a one-page executive narrative explaining the financial story of the year.\n2. Board pre-read prep: the CFO (Reginald, FIN-L10) is presenting to the board in 10 days. Prepare the financial section of the board pre-read: Q3 actuals vs. plan, Q4 forecast, FY outlook, and 3 key financial risks. Write it for a board audience — compressed, decision-oriented.\n3. Series B data room: the company is in a fundraising process. Two investors have requested a financial model and a SaaS metrics cohort analysis. Produce an investor-grade 3-year financial model (revenue, expenses, headcount, cash) and a cohort table showing net revenue retention by customer cohort.\n4. Banking covenant check: the company has a revolving credit facility with two financial covenants (minimum liquidity: $1M; leverage ratio: <3.0x TTM EBITDA). Verify current compliance and write a one-page covenant compliance memo.\n\nYou are the financial architect. Every number you produce is seen by investors or the board.",
    "deliverables": [
      {
        "filename": "aop-consolidated.xlsx",
        "description": "Company-wide AOP: revenue, COGS, gross margin, opex by function, EBITDA, cash flow from operations — with exec narrative"
      },
      {
        "filename": "board-pre-read-finance.md",
        "description": "Board financial section: Q3 actuals vs. plan, Q4 forecast, FY outlook, 3 key financial risks — board-ready language"
      },
      {
        "filename": "investor-financial-model.xlsx",
        "description": "Investor-grade 3-year model: revenue, expenses, headcount, cash — plus SaaS cohort NRR table"
      },
      {
        "filename": "covenant-compliance-memo.md",
        "description": "Revolving credit facility covenant check: current values vs. thresholds, compliance status, remediation plan if needed"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3031.00",
        "url": "https://www.onetonline.org/link/summary/11-3031.00",
        "quote": "Communicate with stockholders or other investors to provide information or to raise capital."
      },
      {
        "source": "O*NET",
        "code": "11-3031.00",
        "url": "https://www.onetonline.org/link/summary/11-3031.00",
        "quote": "Develop or analyze information to assess the current or future financial status of firms."
      },
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Direct or coordinate an organization's financial or budget activities to fund operations, maximize investments, or increase efficiency."
      }
    ],
    "upstreamDeskIds": [
      "FIN-L08-Pierre"
    ],
    "downstreamDeskIds": [
      "FIN-L10-Reginald"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the AOP include all six financial statement lines (revenue through OCF)?",
        "Does the board pre-read cover all four required sections (Q3A, Q4F, FY outlook, risks)?",
        "Does the investor model cover three years with headcount and cash?",
        "Does the covenant compliance memo address both covenants?"
      ],
      "quality": [
        "Is the AOP executive narrative a financial story, not a data dump?",
        "Is the board pre-read compressed to what a board member needs to make a decision?",
        "Is the investor model internally consistent (headcount drives cost, revenue drives cash)?",
        "Is the SaaS cohort NRR table in standard investor format?",
        "Is the covenant compliance memo auditable — with current ratio calculations shown?"
      ],
      "accuracy": [
        "Is the AOP consistent with Pierre's five cost center plans?",
        "Are Q3 actuals in the board pre-read consistent with the monthly close package?",
        "Do the three-year model growth assumptions align with the base-case scenario from Camille's forecast?",
        "Are covenant thresholds accurately stated ($1M liquidity, <3.0x leverage)?",
        "Is NRR calculated from actual cohort data, not estimated?"
      ],
      "handoff": [
        "Could FIN-L10-Reginald present the board financial section without revising a word?",
        "Could an investor take the financial model directly into their diligence process?",
        "Are covenant compliance findings written so the banking counterparty can act on them?",
        "Is the AOP in a format Pierre can distribute to department heads for headcount planning?",
        "Are any items requiring Reginald's CFO sign-off explicitly flagged?"
      ]
    }
  },
  {
    "id": "FIN-L10-Reginald",
    "dept": "FIN",
    "level": 10,
    "title": "Chief Financial Officer",
    "name": "Reginald",
    "timeBudgetMin": 55,
    "brief": "You are Reginald, Chief Financial Officer of a 100-person SaaS company. You own the company's financial narrative — to the board, to investors, to the banking syndicate, and to the CEO. Naila (FIN-L09) runs operations; you run the financial mind of the company.\n\nYour day:\n\n1. Board pre-read package — final sign-off: Naila has produced the financial section of the board pre-read. Review it, add your CFO commentary (a 2-3 paragraph letter to the board), and sign off. Your commentary must address: the company's financial health at a glance, the one decision you need the board to make, and the biggest risk on the horizon.\n2. CEO financial briefing: the CEO wants a 15-minute briefing deck on the company's financial position before the board meeting. Produce a 5-slide structure covering: burn rate and runway, revenue quality (retention, mix, growth), unit economics (CAC payback, LTV/CAC), near-term cash triggers, and your recommended capital allocation for the next 6 months.\n3. Capital structure decision: the company is choosing between extending its revolver, raising a Series B, or pursuing revenue-based financing. Write a 1-2 page capital structure memo that lays out the tradeoffs, recommends a path, and states the conditions under which the recommendation would change.\n4. Outbound to EXEC: package the board pre-read financial section (with your commentary) for EXEC-L10-Konstantin, the board chair, per the pre-meeting protocol.\n\nYou are the financial conscience of the company. When the numbers are wrong, you say so. When the board needs clarity, you give it.",
    "deliverables": [
      {
        "filename": "board-pre-read-final.md",
        "description": "Naila's financial section with Reginald's 2-3 paragraph CFO commentary: health at a glance, decision needed, biggest risk"
      },
      {
        "filename": "ceo-financial-briefing.md",
        "description": "5-slide structure: burn/runway, revenue quality, unit economics, cash triggers, capital allocation recommendation"
      },
      {
        "filename": "capital-structure-memo.md",
        "description": "1-2 page memo: revolver vs. Series B vs. RBF tradeoffs, recommended path, conditions for changing the recommendation"
      },
      {
        "filename": "exec-board-package.md",
        "description": "Board pre-read financial section packaged for EXEC-L10-Konstantin, including CFO commentary and any board-specific context"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Direct or coordinate an organization's financial or budget activities to fund operations, maximize investments, or increase efficiency."
      },
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Prepare or present reports concerning activities, expenses, budgets, government statutes or rulings, or other items affecting businesses."
      },
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Confer with board members, organization officials, or staff members to discuss issues, coordinate activities, or resolve problems."
      }
    ],
    "upstreamDeskIds": [
      "FIN-L09-Naila"
    ],
    "downstreamDeskIds": [
      "EXEC-L10-Konstantin"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the CFO commentary address all three required elements (health, decision needed, biggest risk)?",
        "Does the CEO briefing cover all five slide topics?",
        "Does the capital structure memo address all three financing options?",
        "Is the board package explicitly addressed to EXEC-L10-Konstantin?"
      ],
      "quality": [
        "Is the CFO commentary written in a voice appropriate for a board letter — not a management memo?",
        "Is the CEO briefing structured for a 15-minute verbal presentation, not a reading document?",
        "Does the capital structure memo state clear conditions for changing the recommendation?",
        "Is the board package self-contained (no unexplained jargon or missing context)?",
        "Is the capital recommendation defensible against a second-opinion challenge?"
      ],
      "accuracy": [
        "Is the CFO commentary consistent with the financial numbers in Naila's board pre-read?",
        "Are unit economics in the CEO briefing consistent with Sven's SaaS metrics output?",
        "Does the burn/runway figure in the CEO briefing match the covenant compliance analysis?",
        "Are the three financing options accurately characterized (cost, dilution, covenants)?",
        "Is EXEC-L10-Konstantin named correctly and the package formatted per board protocol?"
      ],
      "handoff": [
        "Could EXEC-L10-Konstantin present the board financial section from the package without calling Reginald?",
        "Could the CEO walk into the board meeting with only the CEO briefing deck?",
        "Is the capital structure memo written so the board can vote on it without additional analysis?",
        "Would an institutional investor find the capital structure reasoning coherent and complete?",
        "Are any items requiring full board vote (vs. CFO discretion) clearly identified?"
      ]
    }
  },
  {
    "id": "HR-L01-Aaliyah",
    "dept": "HR",
    "level": 1,
    "title": "People Ops Coordinator",
    "name": "Aaliyah",
    "timeBudgetMin": 25,
    "brief": "You are Aaliyah, a People Ops Coordinator at a 100-person SaaS company. You are the first point of contact for new-hire logistics and routine HR administration. Your work today is narrow, concrete, and time-boxed.\n\n1. Onboarding packet: a new software engineer is starting Monday. Assemble a single-page onboarding checklist that covers: IT provisioning, Slack access, benefits enrollment deadline, first-week schedule, and emergency contact form. Cross-reference the current employee handbook for policy details.\n\n2. Employment records update: three employees changed their preferred names last week. Update the tracking spreadsheet with corrected entries and flag the downstream systems (payroll, directory) that need matching updates.\n\n3. Job posting draft: the Recruiting team needs a basic posting for a Customer Success Associate. Write a 200-word job description using standard language — responsibilities, qualifications, and benefits bullet points. Do not invent compensation figures.\n\nStay strictly in scope. Do not make policy decisions, extend offers, or alter salary data.",
    "deliverables": [
      {
        "filename": "onboarding-checklist-engineer.md",
        "description": "Single-page new-hire checklist: IT, Slack, benefits enrollment, first-week schedule, emergency contact"
      },
      {
        "filename": "name-change-log.csv",
        "description": "Updated records with old name, new name, employee ID, and list of downstream systems flagged for update"
      },
      {
        "filename": "job-posting-cs-associate.md",
        "description": "200-word job description for Customer Success Associate with responsibilities, qualifications, and benefits bullets"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1071.00",
        "url": "https://www.onetonline.org/link/summary/13-1071.00",
        "quote": "Prepare or maintain employment records related to events, such as hiring, termination, leaves, transfers, or promotions, using human resources management system software."
      },
      {
        "source": "O*NET",
        "code": "13-1071.00",
        "url": "https://www.onetonline.org/link/summary/13-1071.00",
        "quote": "Schedule or conduct new employee orientations."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/human-resources-specialists.htm",
        "quote": "Human resources specialists recruit, screen, and interview job applicants and place them in positions within an organization."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "HR-L05-Estelle"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the onboarding checklist cover all five listed areas (IT, Slack, benefits, schedule, emergency contact)?",
        "Does the name-change log include old name, new name, employee ID, and downstream flags?",
        "Is the job posting approximately 200 words?",
        "Are responsibilities, qualifications, and benefits sections present in the posting?"
      ],
      "quality": [
        "Is the checklist formatted so a new hire can follow it without asking questions?",
        "Are downstream systems flagged specifically (not just 'notify HR systems')?",
        "Does the job posting use standard, neutral language (no invented salary figures)?",
        "Is each deliverable self-contained and free of placeholder text?",
        "Is the writing concise with no filler?"
      ],
      "accuracy": [
        "Does the onboarding timeline reflect a Monday start (not a generic template)?",
        "Are the name-change rows correctly formatted as CSV?",
        "Does the job posting match a real Customer Success Associate scope?",
        "Are benefits enrollment deadlines plausibly stated (not impossible timelines)?",
        "Are downstream system categories realistic (payroll, directory, email)?"
      ],
      "handoff": [
        "Could HR-L05-Estelle review and approve all three deliverables without follow-up questions?",
        "Is the name-change log in a format that payroll can ingest directly?",
        "Is the job posting ready to publish with no further editing required?",
        "Are any open questions or blockers explicitly flagged?",
        "Is the onboarding checklist ordered chronologically from pre-arrival through end of week one?"
      ]
    }
  },
  {
    "id": "HR-L02-Nikolai",
    "dept": "HR",
    "level": 2,
    "title": "Recruiter",
    "name": "Nikolai",
    "timeBudgetMin": 25,
    "brief": "You are Nikolai, a Recruiter at a 100-person SaaS company. You own a small pipeline of active roles and are responsible for moving candidates through screening and coordinating interviews. Today you have three tasks.\n\n1. Candidate shortlist: you received 40 applications for an open Backend Engineer role. Screen the applicant list against the job requirements (minimum 3 years backend experience, Python or Go, prior SaaS company). Write a shortlist of the top 5 candidates with a one-sentence rationale for each.\n\n2. Interview scheduling: two candidates for the Product Designer role are ready for a panel interview. Draft a scheduling email to each candidate, propose three date/time slots, and write a brief internal calendar invite description for the four-person interview panel.\n\n3. Pipeline status report: your manager (HR-L05-Estelle) asked for a weekly pipeline snapshot. Produce a concise table showing each open role, number of applicants, stage of top candidate, and target hire date.\n\nDo not make final hiring decisions — those require manager sign-off. Stay in sourcing and coordination mode.",
    "deliverables": [
      {
        "filename": "backend-engineer-shortlist.md",
        "description": "Top 5 candidates with one-sentence rationale each, ranked by fit to stated requirements"
      },
      {
        "filename": "interview-schedule-emails.md",
        "description": "Candidate-facing scheduling emails (2) and internal panel calendar invite description"
      },
      {
        "filename": "pipeline-status.md",
        "description": "Weekly pipeline table: open roles, applicant count, top-candidate stage, target hire date"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1071.00",
        "url": "https://www.onetonline.org/link/summary/13-1071.00",
        "quote": "Review employment applications and job orders to match applicants with job requirements."
      },
      {
        "source": "O*NET",
        "code": "13-1071.00",
        "url": "https://www.onetonline.org/link/summary/13-1071.00",
        "quote": "Perform searches for qualified job candidates, using sources such as computer databases, networking, Internet recruiting resources, media advertisements, job fairs, recruiting firms, or employee referrals."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/human-resources-specialists.htm",
        "quote": "Human resources specialists recruit, screen, and interview job applicants and place them in positions within an organization."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "HR-L05-Estelle"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the shortlist contain exactly 5 candidates with individual rationales?",
        "Are both candidate scheduling emails present plus the panel invite description?",
        "Does the pipeline table include all four required columns?",
        "Is the pipeline table present as a table (not prose)?"
      ],
      "quality": [
        "Are rationales in the shortlist specific to the stated requirements (not generic praise)?",
        "Are the scheduling emails professional, warm, and free of filler?",
        "Does each time slot in the email include timezone?",
        "Is the pipeline table scannable at a glance?",
        "Is every document free of placeholder names or dummy data?"
      ],
      "accuracy": [
        "Do the shortlist rationales reference the stated minimum requirements (3 years, Python/Go, SaaS)?",
        "Are target hire dates plausible (not same day, not 2 years out)?",
        "Does the calendar invite description name all four panel members?",
        "Is the shortlist ranking order consistent with stated rationales?",
        "Are candidate pipeline stages realistic (applied, phone screen, panel, offer)?"
      ],
      "handoff": [
        "Could HR-L05-Estelle approve the shortlist for manager review without rework?",
        "Could the panel calendar invite be sent directly from the draft?",
        "Does the pipeline report give Estelle enough signal for a 5-minute status call?",
        "Are any blockers (e.g., panel member unavailability) flagged explicitly?",
        "Is the shortlist formatted so a hiring manager can read it in under 3 minutes?"
      ]
    }
  },
  {
    "id": "HR-L03-Zoë",
    "dept": "HR",
    "level": 3,
    "title": "Senior Recruiter",
    "name": "Zoë",
    "timeBudgetMin": 25,
    "brief": "You are Zoë, a Senior Recruiter at a 100-person SaaS company. You own complex, senior-level searches end-to-end: sourcing strategy, candidate experience, offer calibration, and close. You are also expected to improve recruiting processes, not just execute them.\n\n1. Sourcing strategy: the company needs to hire a Principal Data Scientist. Write a sourcing plan — which channels you will use, what the Boolean search strings look like, what passive-candidate outreach looks like, and what a realistic 60-day funnel projection is (applications → screens → onsite → offers → hires).\n\n2. Offer letter draft: a finalist candidate for the Senior Product Manager role has verbally accepted. Draft the offer letter covering role, start date, base salary ($175,000), equity (0.10% over 4 years, 1-year cliff), PTO policy, and at-will employment notice. Leave salary and equity fields as placeholders for legal review.\n\n3. Recruiting process retrospective: the last three engineering hires took 92, 78, and 110 days from job open to offer accepted — all above the 60-day target. Write a one-page root-cause analysis and three specific process improvements for next quarter.\n\nThis is fully owned work. Surface your reasoning, not just the output.",
    "deliverables": [
      {
        "filename": "principal-data-scientist-sourcing-plan.md",
        "description": "Sourcing channels, Boolean strings, passive outreach template, and 60-day funnel projection"
      },
      {
        "filename": "offer-letter-draft-spm.md",
        "description": "Offer letter draft with role, start date, comp, equity, PTO, at-will clause; salary/equity as placeholders for legal"
      },
      {
        "filename": "recruiting-retro.md",
        "description": "Root-cause analysis of 3 overlong hires + 3 concrete process improvements for next quarter"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1071.00",
        "url": "https://www.onetonline.org/link/summary/13-1071.00",
        "quote": "Develop or implement recruiting strategies to meet current or anticipated staffing needs."
      },
      {
        "source": "O*NET",
        "code": "13-1071.00",
        "url": "https://www.onetonline.org/link/summary/13-1071.00",
        "quote": "Inform job applicants of details such as duties and responsibilities, compensation, benefits, schedules, working conditions, or promotion opportunities."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/human-resources-specialists.htm",
        "quote": "Human resources specialists recruit, screen, and interview job applicants and place them in positions within an organization."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "HR-L05-Estelle"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the sourcing plan include Boolean strings (not just channel names)?",
        "Does the funnel projection include all five stages: applications, screens, onsite, offers, hires?",
        "Does the offer letter include all six components (role, start, salary, equity, PTO, at-will)?",
        "Does the retro identify root causes (not just symptoms) and name 3 improvements?"
      ],
      "quality": [
        "Are the Boolean strings syntactically valid (AND/OR/NOT operators, quoted phrases)?",
        "Does the offer letter read as a real legal document (not a template list)?",
        "Is the retro analysis causal, not just descriptive ('sourcing took too long because...')?",
        "Are the three process improvements specific and actionable (not 'communicate better')?",
        "Is the funnel projection numeric with realistic conversion rates?"
      ],
      "accuracy": [
        "Is the $175K salary and 0.10% equity in line with Principal/Senior PM market ranges?",
        "Is the 1-year cliff correctly described in the offer letter?",
        "Do the three hiring durations (92, 78, 110 days) appear in the retro as evidence?",
        "Is the 60-day funnel target referenced in both the sourcing plan and the retro?",
        "Are the sourcing channels realistic for a Principal Data Scientist role?"
      ],
      "handoff": [
        "Could HR-L05-Estelle forward the offer letter to legal with no additional edits?",
        "Could a hiring manager begin sourcing immediately from the plan?",
        "Are the retro improvements assigned to specific owners or roles?",
        "Does the sourcing plan give a clear start-of-week action list?",
        "Are placeholder fields in the offer letter clearly marked for legal review?"
      ]
    }
  },
  {
    "id": "HR-L04-Manolo",
    "dept": "HR",
    "level": 4,
    "title": "People Business Partner",
    "name": "Manolo",
    "timeBudgetMin": 35,
    "brief": "You are Manolo, a People Business Partner (PBP) at a 100-person SaaS company. You are embedded with the Engineering and Product orgs (~50 people), acting as the strategic HR contact for those teams. Your work today crosses compensation analysis, performance advisory, and policy coordination.\n\n1. Comp benchmarking memo: the Engineering leadership team is asking whether the current salary bands for Senior and Staff Engineers are competitive. Pull together a benchmarking memo that compares the internal bands to three market references (Radford/Mercer tiers, Levels.fyi median, local cost-of-labor index). Identify any roles that are clearly off-band and recommend whether to adjust this cycle or hold for the next annual review.\n\n2. Performance improvement plan (PIP) draft: a Senior Engineer has had two quarters of below-expectations ratings and the engineering manager wants to begin a formal PIP. Write the PIP document covering: the specific performance gaps, measurable improvement targets, a 90-day timeline with 30/60/90 checkpoints, and support resources offered.\n\n3. Policy clarification note: three engineers asked about the remote work reimbursement policy (home office stipend, internet subsidy). Write a concise internal FAQ (5-7 Q&As) grounded in the current policy, flagging any ambiguities that need legal or leadership sign-off before publishing.\n\nYou are the cross-functional connector. Your output has to work for both the engineering manager and the HR function.",
    "deliverables": [
      {
        "filename": "comp-benchmarking-memo.md",
        "description": "Benchmarking memo comparing internal Senior/Staff Engineer bands to 3 market sources; band gap analysis and cycle recommendation"
      },
      {
        "filename": "pip-senior-engineer.md",
        "description": "PIP document: performance gaps, measurable targets, 90-day timeline with 30/60/90 checkpoints, support resources"
      },
      {
        "filename": "remote-work-faq.md",
        "description": "5-7 Q&A FAQ on home office stipend and internet subsidy policy; ambiguities flagged for legal/leadership review"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1141.00",
        "url": "https://www.onetonline.org/link/summary/13-1141.00",
        "quote": "Evaluate job positions, determining classification, exempt or non-exempt status, and salary."
      },
      {
        "source": "O*NET",
        "code": "13-1141.00",
        "url": "https://www.onetonline.org/link/summary/13-1141.00",
        "quote": "Develop, implement, administer, and evaluate personnel and labor relations programs, including performance appraisal, affirmative action, and employment equity programs."
      },
      {
        "source": "O*NET",
        "code": "13-1071.00",
        "url": "https://www.onetonline.org/link/summary/13-1071.00",
        "quote": "Advise management on organizing, preparing, or implementing recruiting or retention programs."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/compensation-benefits-and-job-analysis-specialists.htm",
        "quote": "Compensation, benefits, and job analysis specialists oversee wage and nonwage programs that an organization provides to its employees."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "HR-L05-Estelle"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the benchmarking memo reference at least 3 market data sources?",
        "Does the PIP include 30/60/90 day checkpoints with measurable targets at each?",
        "Does the FAQ contain 5-7 Q&As (not more, not fewer)?",
        "Are ambiguous policy areas flagged explicitly in the FAQ?"
      ],
      "quality": [
        "Does the benchmarking memo distinguish between Senior and Staff Engineer bands (not combined)?",
        "Are PIP targets specific and measurable (not 'improve communication')?",
        "Does the FAQ use plain English accessible to engineers, not HR jargon?",
        "Does the comp memo make a clear recommendation (adjust now vs. hold)?",
        "Is the PIP structured so the manager can run each checkpoint meeting from the doc?"
      ],
      "accuracy": [
        "Are the three market reference sources cited by name (Radford, Levels.fyi, etc.)?",
        "Is the PIP timeline 90 days with checkpoints at exactly 30, 60, and 90 days?",
        "Are the performance gaps in the PIP tied to specific behaviors, not personality?",
        "Is the remote work reimbursement FAQ factually consistent (no contradictions)?",
        "Is the comp band recommendation supported by the benchmarking evidence presented?"
      ],
      "handoff": [
        "Could HR-L05-Estelle approve the benchmarking memo for Director review?",
        "Could the engineering manager deliver the PIP meeting from this document alone?",
        "Could the FAQ be published to the internal wiki with only the flagged items resolved?",
        "Are all three deliverables labeled with the intended audience (manager, HR, all-hands)?",
        "Does the comp memo state clearly which roles are at risk of attrition if bands aren't adjusted?"
      ]
    }
  },
  {
    "id": "HR-L05-Estelle",
    "dept": "HR",
    "level": 5,
    "title": "People Operations Lead",
    "name": "Estelle",
    "timeBudgetMin": 35,
    "brief": "You are Estelle, People Operations Lead at a 100-person SaaS company. Four ICs report into your area today: Aaliyah (onboarding and admin), Nikolai (recruiting pipeline), Zoë (senior recruiting), and Manolo (business partnership). You synthesize their work and own a small portfolio of your own people-program deliverables.\n\n1. Synthesis: review and consolidate the work from your four ICs into a People Ops weekly snapshot — one document a VP could read in 5 minutes. Include: recruiting pipeline health (roles, stages, blockers), onboarding status (new hires landing this week), compensation flags (any open band issues), and employee relations items (any PIPs active, any policy escalations).\n\n2. Onboarding program design: the current new-hire experience scores a 7/10 in the quarterly survey. Write a redesigned 30-day onboarding plan template — structured week-by-week — that a hiring manager and coordinator can execute without HR present for every step. Include measurable success criteria (e.g., \"new hire completes tool setup by day 3\").\n\n3. Attrition analysis: there have been 5 voluntary departures in the last 90 days (Engineering: 2, Sales: 2, Product: 1). Analyze the exit interview data and produce a 1-page attrition memo: pattern identification, highest-risk retention segments, and two recommended retention interventions with estimated cost.\n\nYou are the first synthesis tier. Your writing compresses team output into manager-readable signal.",
    "deliverables": [
      {
        "filename": "people-ops-weekly-snapshot.md",
        "description": "VP-ready 5-minute read: recruiting pipeline, onboarding status, comp flags, employee relations items"
      },
      {
        "filename": "onboarding-30day-template.md",
        "description": "Week-by-week 30-day onboarding plan with measurable success criteria per milestone"
      },
      {
        "filename": "attrition-memo.md",
        "description": "1-page attrition analysis: patterns, at-risk segments, 2 retention interventions with estimated cost"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1071.00",
        "url": "https://www.onetonline.org/link/summary/13-1071.00",
        "quote": "Analyze employment-related data and prepare required reports."
      },
      {
        "source": "O*NET",
        "code": "13-1141.00",
        "url": "https://www.onetonline.org/link/summary/13-1141.00",
        "quote": "Plan, develop, evaluate, improve, and communicate methods and techniques for selecting, promoting, compensating, evaluating, and training workers."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/human-resources-specialists.htm",
        "quote": "Human resources specialists recruit, screen, and interview job applicants and place them in positions within an organization."
      }
    ],
    "upstreamDeskIds": [
      "HR-L01-Aaliyah",
      "HR-L02-Nikolai",
      "HR-L03-Zoë",
      "HR-L04-Manolo"
    ],
    "downstreamDeskIds": [
      "HR-L06-Karim"
    ],
    "rubric": {
      "completion": [
        "All three deliverables present?",
        "Does the weekly snapshot reference input from all four ICs?",
        "Does the onboarding template span a full 30 days, week by week?",
        "Does the attrition memo cover all 5 departures across the three departments?",
        "Are 2 retention interventions named with cost estimates?"
      ],
      "quality": [
        "Is the weekly snapshot scannable in under 5 minutes?",
        "Does the onboarding template include success criteria (not just activities)?",
        "Is the attrition analysis causal (not just a count of departures)?",
        "Are retention intervention costs stated as a range with rationale?",
        "Does the synthesis document compress — not merely list — IC work?"
      ],
      "accuracy": [
        "Do the pipeline numbers in the snapshot align with Nikolai's report?",
        "Are the 5 departures correctly attributed to Engineering (2), Sales (2), Product (1)?",
        "Is the 7/10 onboarding survey score referenced as the baseline in the new template?",
        "Are comp flags from Manolo's benchmarking memo reflected in the snapshot?",
        "Are at-risk retention segments identified by role/level, not just department?"
      ],
      "handoff": [
        "Could HR-L06-Karim brief a VP from the weekly snapshot without additional context?",
        "Can a hiring manager run the 30-day onboarding template without Estelle present?",
        "Are retention intervention recommendations addressed to a named decision-maker?",
        "Are blockers from any IC deliverable escalated in the snapshot?",
        "Are upstream ICs (Aaliyah, Nikolai, Zoë, Manolo) credited for their contributions?"
      ]
    }
  },
  {
    "id": "HR-L06-Karim",
    "dept": "HR",
    "level": 6,
    "title": "People Manager",
    "name": "Karim",
    "timeBudgetMin": 35,
    "brief": "You are Karim, People Manager at a 100-person SaaS company. You manage a team of 4 HR specialists and own the day-to-day operations of the People function. You receive synthesized output from Estelle (HR-L05) and translate it into action plans, program decisions, and manager coaching.\n\n1. Quarterly people program plan: based on Estelle's weekly snapshot and attrition memo, write a one-page plan for the next 90 days of People programming. Cover: recruiting goals (headcount targets, time-to-hire targets), retention interventions to run, performance review cycle status, and employee engagement initiative. State explicit owners and completion dates for each item.\n\n2. Manager coaching guide: three people managers in Engineering asked for help running Q3 performance reviews. Write a concise manager guide — how to prepare for the conversation, what good feedback looks like vs. bad, how to document the rating, and what to do when a manager and employee disagree on the rating.\n\n3. Employee survey design: the Q3 engagement survey is due next month. Design the survey — 10 questions maximum, each with a Likert scale (1-5) plus one open-text option. Include a brief rationale for why each question is included (based on what the attrition data suggests is at risk).\n\nYou plan and delegate; you do not do IC recruiting work yourself.",
    "deliverables": [
      {
        "filename": "q3-people-program-plan.md",
        "description": "90-day People program plan: recruiting goals, retention interventions, perf review status, engagement initiative, owners and dates"
      },
      {
        "filename": "manager-perf-review-guide.md",
        "description": "Guide for people managers: conversation prep, feedback quality, documentation, rating disputes"
      },
      {
        "filename": "q3-engagement-survey.md",
        "description": "10-question engagement survey with Likert scales, one open-text option, and rationale for each question"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3121.00",
        "url": "https://www.onetonline.org/link/summary/11-3121.00",
        "quote": "Plan, direct, supervise, and coordinate work activities of subordinates and staff relating to employment, compensation, labor relations, and employee relations."
      },
      {
        "source": "O*NET",
        "code": "11-3121.00",
        "url": "https://www.onetonline.org/link/summary/11-3121.00",
        "quote": "Analyze training needs to design employee development, language training, and health and safety programs."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/human-resources-managers.htm",
        "quote": "Human resources managers plan, direct, and coordinate the administrative functions of an organization."
      }
    ],
    "upstreamDeskIds": [
      "HR-L05-Estelle"
    ],
    "downstreamDeskIds": [
      "HR-L07-Brigit"
    ],
    "rubric": {
      "completion": [
        "All three deliverables present?",
        "Does the 90-day plan cover all four areas: recruiting, retention, perf review, engagement?",
        "Does each program item have an explicit owner and completion date?",
        "Does the manager guide cover all four topics: prep, feedback quality, documentation, disputes?",
        "Does the survey have exactly 10 questions with rationale for each?"
      ],
      "quality": [
        "Is the 90-day plan concrete enough that progress could be tracked weekly?",
        "Does the manager guide give a real example of good feedback vs. bad (not just labels)?",
        "Are survey questions distinct (no overlap between questions)?",
        "Is the survey rationale tied to attrition data from Estelle's memo?",
        "Is the plan formatted so it could become a project board without rewriting?"
      ],
      "accuracy": [
        "Do recruiting targets in the plan align with Estelle's pipeline snapshot?",
        "Are performance review timelines realistic for a Q3 cycle?",
        "Are retention interventions from Estelle's memo reflected in the program plan?",
        "Does the manager guide correctly describe what documentation is required for a rating dispute?",
        "Are the 10 survey questions covering distinct engagement dimensions?"
      ],
      "handoff": [
        "Could HR-L07-Brigit run a team planning meeting from the 90-day plan?",
        "Could an engineering manager run a performance review meeting with only this guide?",
        "Is the survey ready to be handed to a survey platform (Typeform, Culture Amp) with no rewrites?",
        "Are ownership assignments in the plan named to specific roles (not 'the team')?",
        "Does the plan call out dependencies on other departments (e.g., Finance for compensation adjustments)?"
      ]
    }
  },
  {
    "id": "HR-L07-Brigit",
    "dept": "HR",
    "level": 7,
    "title": "Senior HR Manager",
    "name": "Brigit",
    "timeBudgetMin": 45,
    "brief": "You are Brigit, Senior HR Manager at a 100-person SaaS company. You own the full HR operating cycle for half the company — Engineering, Product, and Design — and manage the team of specialists underneath Karim. You also own cross-functional people programs and the HR compliance posture.\n\n1. Cycle plan: Q3 performance reviews start in 3 weeks. Write the full review cycle plan — key dates, manager training schedule, calibration meeting structure, rating distribution guidance, and promotion nomination process. This is the operating document that runs the cycle. The plan feeds into Renaud's (HR-L08) Director review and the FIN/LEGOPS budget conversations.\n\n2. Compliance audit: an employment attorney flagged that the company's offer letter templates and FLSA exempt/non-exempt classifications may not reflect the latest regulatory guidance. Write a compliance gap analysis covering: FLSA classification risk across Engineering titles, I-9 record retention, and California pay transparency requirements. Rate each item Red/Yellow/Green and recommend remediation steps.\n\n3. LEGOPS vendor budget edge: LEGOPS-L07-Vidya flagged that the external HR vendor (background check provider) contract is up for renewal and may exceed the approved vendor budget. Write a vendor assessment memo: current cost, usage metrics, two alternative providers with cost comparison, and a recommendation (renew/renegotiate/switch) with rationale.\n\nYour output informs the Director's budget and headcount decisions. Be specific about dollars, timelines, and risk levels.",
    "deliverables": [
      {
        "filename": "q3-perf-review-cycle-plan.md",
        "description": "Full review cycle operating doc: key dates, manager training, calibration structure, rating distribution guidance, promotion nominations"
      },
      {
        "filename": "compliance-gap-analysis.md",
        "description": "FLSA, I-9, and CA pay transparency gap analysis with Red/Yellow/Green ratings and remediation steps"
      },
      {
        "filename": "hr-vendor-assessment.md",
        "description": "Background check vendor memo: current cost, usage, 2 alternatives with cost comparison, renew/renegotiate/switch recommendation"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3121.00",
        "url": "https://www.onetonline.org/link/summary/11-3121.00",
        "quote": "Analyze statistical data and reports to identify and determine causes of personnel problems and develop recommendations for improvement of organization's personnel policies and practices."
      },
      {
        "source": "O*NET",
        "code": "11-3121.00",
        "url": "https://www.onetonline.org/link/summary/11-3121.00",
        "quote": "Prepare personnel forecast to project employment needs."
      },
      {
        "source": "O*NET",
        "code": "11-3121.00",
        "url": "https://www.onetonline.org/link/summary/11-3121.00",
        "quote": "Study legislation, arbitration decisions, and collective bargaining contracts to assess industry trends."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/human-resources-managers.htm",
        "quote": "Human resources managers plan, direct, and coordinate the administrative functions of an organization."
      }
    ],
    "upstreamDeskIds": [
      "HR-L06-Karim",
      "LEGOPS-L07-Vidya"
    ],
    "downstreamDeskIds": [
      "HR-L08-Renaud"
    ],
    "rubric": {
      "completion": [
        "All three deliverables present?",
        "Does the cycle plan include all five components: dates, training, calibration, distribution guidance, promotions?",
        "Does the compliance gap analysis cover all three areas: FLSA, I-9, CA pay transparency?",
        "Is each compliance item rated Red/Yellow/Green with remediation steps?",
        "Does the vendor memo include exactly 2 alternative providers with cost comparison?"
      ],
      "quality": [
        "Is the cycle plan detailed enough to run the review without additional planning meetings?",
        "Does the compliance analysis explain the legal risk, not just name the regulation?",
        "Is the vendor recommendation supported by the cost comparison data (not opinion)?",
        "Does the cycle plan include a manager training schedule with dates and format?",
        "Is the vendor memo written at a level Renaud can take directly to a budget meeting?"
      ],
      "accuracy": [
        "Are FLSA classification risks grounded in actual Engineering title patterns (IC, Staff, Principal)?",
        "Is California pay transparency law correctly described (SB 1162 requirements)?",
        "Are I-9 retention timelines accurately stated (3 years from hire or 1 year post-termination)?",
        "Is the 3-week lead time to review cycle start reflected throughout the cycle plan?",
        "Does the vendor budget flag from LEGOPS-L07-Vidya appear as the prompt for the assessment?"
      ],
      "handoff": [
        "Could HR-L08-Renaud approve the cycle plan for company-wide distribution?",
        "Could legal counsel act on the compliance gap analysis without requesting additional data?",
        "Could procurement run the vendor decision from this memo alone?",
        "Are the compliance Red items prioritized over Yellow and Green in the remediation steps?",
        "Does the cycle plan include a named communications owner for manager announcements?"
      ]
    }
  },
  {
    "id": "HR-L08-Renaud",
    "dept": "HR",
    "level": 8,
    "title": "Director of People",
    "name": "Renaud",
    "timeBudgetMin": 45,
    "brief": "You are Renaud, Director of People at a 100-person SaaS company. You own the full People strategy and headcount planning across all departments. You are the primary interface between HR and Finance, and you serve as the HR lead on cross-functional programs involving Engineering and Legal-Ops.\n\nYour day:\n\n1. Headcount plan: the CEO is requesting a Q3/Q4 headcount plan by the end of the week. Build a department-by-department hiring plan: current headcount per dept, approved open roles, requested new roles, and priority rank. Include the cost of NOT filling the top 3 critical roles (revenue impact or delivery risk). This document goes to FIN-L08-Pierre for comp budget alignment.\n\n2. Engineering hiring asks: ENG-L08-Esther sent over engineering's hiring requirements for next quarter — 4 new ICs and 1 senior engineering manager. Incorporate those asks into the headcount plan and write a 1-page response to Esther explaining which roles you can resource immediately, which are queue-pending, and what the timeline looks like for each.\n\n3. Comp framework update: based on Brigit's compliance analysis (HR-L07) and benchmarking work, write the updated compensation philosophy statement and revised salary band table for Engineering levels L3–L7. The comp framework feeds the Finance budget conversation directly.\n\n4. People strategy memo: write a 2-page memo for the CHRO (HR-L10-Demetrius) summarizing the state of the people function: key risks (attrition, compliance gaps, comp competitiveness), investment priorities for next half, and one program you are recommending to sunset.\n\nYou are the department translator — converting operational HR data into executive-level decisions.",
    "deliverables": [
      {
        "filename": "headcount-plan-q3q4.md",
        "description": "Department headcount plan: current state, open roles, new requests, priority rank, cost of not filling top 3 roles"
      },
      {
        "filename": "eng-hiring-response.md",
        "description": "1-page response to ENG-L08-Esther: which roles are immediately resourced, which are queued, timeline for each"
      },
      {
        "filename": "comp-framework-update.md",
        "description": "Updated comp philosophy statement and Engineering L3-L7 salary band table"
      },
      {
        "filename": "people-strategy-memo.md",
        "description": "2-page memo to CHRO: key risks, investment priorities for next half, one program to sunset"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3121.00",
        "url": "https://www.onetonline.org/link/summary/11-3121.00",
        "quote": "Prepare personnel forecast to project employment needs."
      },
      {
        "source": "O*NET",
        "code": "11-3121.00",
        "url": "https://www.onetonline.org/link/summary/11-3121.00",
        "quote": "Analyze and modify compensation and benefits policies to establish competitive programs and ensure compliance with legal requirements."
      },
      {
        "source": "O*NET",
        "code": "11-3121.00",
        "url": "https://www.onetonline.org/link/summary/11-3121.00",
        "quote": "Plan, direct, supervise, and coordinate work activities of subordinates and staff relating to employment, compensation, labor relations, and employee relations."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/human-resources-managers.htm",
        "quote": "Human resources managers plan, direct, and coordinate the administrative functions of an organization."
      }
    ],
    "upstreamDeskIds": [
      "HR-L07-Brigit",
      "ENG-L08-Esther"
    ],
    "downstreamDeskIds": [
      "HR-L09-Niamh",
      "FIN-L08-Pierre"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the headcount plan cover all departments (not just Engineering)?",
        "Does the headcount plan include cost of not filling for the top 3 critical roles?",
        "Does the Engineering hiring response address all 5 roles Esther requested?",
        "Does the people strategy memo name exactly one program to sunset?"
      ],
      "quality": [
        "Is the headcount plan defensible at a Finance budget meeting?",
        "Does the Engineering hiring response give Esther a clear timeline (not 'soon')?",
        "Does the comp framework include a band table with numeric ranges, not just principles?",
        "Is the people strategy memo 2 pages or less (not padded)?",
        "Is the 'cost of not filling' argument concrete (revenue risk, delivery delay, not vague)?",
        "Does the comp philosophy statement address market positioning (e.g., 50th vs. 75th percentile)?"
      ],
      "accuracy": [
        "Are the Engineering roles from Esther (4 ICs + 1 senior EM) reflected in the headcount plan?",
        "Does the comp framework reference Brigit's benchmarking analysis as a source?",
        "Are salary band ranges plausible for SaaS Engineering L3-L7 in 2024?",
        "Do the people strategy risks align with evidence from earlier in the HR chain?",
        "Does FIN-L08-Pierre appear as the named recipient of the headcount plan?"
      ],
      "handoff": [
        "Could FIN-L08-Pierre model the comp budget from the headcount plan and comp framework?",
        "Could ENG-L08-Esther start sourcing her priority roles from the hiring response?",
        "Could HR-L09-Niamh build the VP-level narrative from the people strategy memo?",
        "Are all four deliverables clearly labeled with their intended recipient?",
        "Does the headcount plan include a submission deadline for Finance review?"
      ]
    }
  },
  {
    "id": "HR-L09-Niamh",
    "dept": "HR",
    "level": 9,
    "title": "VP People",
    "name": "Niamh",
    "timeBudgetMin": 55,
    "brief": "You are Niamh, VP of People at a 100-person SaaS company. You sit on the extended leadership team, reporting to the CHRO (HR-L10-Demetrius). You own the company's people strategy, budget, and culture systems. You serve as the executive interface for HR into the CEO, CFO, and all department heads.\n\n1. Board people update: the board meets in 10 days and the CEO has asked for a 1-page people metrics snapshot. Produce it. Required sections: headcount (current, delta from last quarter, by dept), voluntary attrition rate (trailing 12 months vs. industry benchmark), time-to-hire by function, engagement survey score trend, and top 2 people risks with a mitigation status.\n\n2. Org design recommendation: the company is considering separating the current combined People Ops / Recruiting function into two separate teams. Write a 2-page org design proposal covering: current state, proposed state (org chart outline), rationale, transition risks, headcount implications, and timeline. This feeds Demetrius's board decision.\n\n3. Executive team calibration prep: the CEO has asked you to facilitate the upcoming executive team talent calibration — where each executive rates their top team members on performance and potential. Write the facilitation guide: agenda, calibration criteria definitions, how to handle disagreements, and what the outputs should be.\n\n4. People budget narrative: Finance closes the H2 budget next week. Write the People budget narrative — a 1-page justification for the People org's H2 ask, covering headcount spend, programs spend, and the ROI case for the two largest new investments.\n\nAt this level you translate people data into board-level business narrative.",
    "deliverables": [
      {
        "filename": "board-people-snapshot.md",
        "description": "1-page board metrics snapshot: headcount, attrition rate vs. benchmark, time-to-hire, engagement trend, top 2 risks with mitigation status"
      },
      {
        "filename": "org-design-proposal.md",
        "description": "2-page org design proposal: current vs. proposed state, rationale, transition risks, headcount implications, timeline"
      },
      {
        "filename": "exec-calibration-guide.md",
        "description": "Executive talent calibration facilitation guide: agenda, criteria definitions, dispute handling, outputs"
      },
      {
        "filename": "people-budget-narrative.md",
        "description": "1-page H2 budget justification: headcount spend, programs spend, ROI case for top 2 new investments"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3121.00",
        "url": "https://www.onetonline.org/link/summary/11-3121.00",
        "quote": "Advise managers on organizational policy matters, such as equal employment opportunity and sexual harassment, and recommend needed changes."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Review financial statements, sales or activity reports, or other performance data to measure productivity or goal achievement or to identify areas needing cost reduction or program improvement."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Establish or implement departmental policies, goals, objectives, or procedures in conjunction with board members, organization officials, or staff members."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/human-resources-managers.htm",
        "quote": "Human resources managers plan, direct, and coordinate the administrative functions of an organization."
      }
    ],
    "upstreamDeskIds": [
      "HR-L08-Renaud"
    ],
    "downstreamDeskIds": [
      "HR-L10-Demetrius"
    ],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the board snapshot include all five required sections?",
        "Does the org design proposal include an org chart outline of proposed state?",
        "Does the calibration guide include all four components: agenda, criteria, disputes, outputs?",
        "Does the budget narrative cover headcount spend, programs spend, and ROI for 2 investments?"
      ],
      "quality": [
        "Is the board snapshot readable in under 3 minutes by a board member unfamiliar with HR detail?",
        "Does the org design proposal make a clear recommendation (not 'here are options')?",
        "Does the calibration guide anticipate the hardest facilitation moment (two executives disagree)?",
        "Is the budget ROI case grounded in a specific business outcome (not 'better culture')?",
        "Is the attrition rate compared to a named industry benchmark (not generic 'industry average')?"
      ],
      "accuracy": [
        "Are the board metrics consistent with numbers established earlier in the HR chain?",
        "Is the org design headcount implication realistic for a 5-person HR team splitting into two?",
        "Does the calibration criteria match standard 9-box or equivalent framework correctly?",
        "Is time-to-hire by function consistent with recruiting data from Nikolai/Zoë?",
        "Does the budget narrative reflect Renaud's headcount plan numbers?"
      ],
      "handoff": [
        "Could HR-L10-Demetrius use the board snapshot as the basis for the board people discussion?",
        "Could the CEO make a go/no-go org design decision from the proposal alone?",
        "Could the executive team run the calibration meeting using only the facilitation guide?",
        "Could the CFO approve or cut the People H2 budget from the narrative without a follow-up call?",
        "Are open decisions and named decision-makers identified in each deliverable?"
      ]
    }
  },
  {
    "id": "HR-L10-Demetrius",
    "dept": "HR",
    "level": 10,
    "title": "Chief People Officer",
    "name": "Demetrius",
    "timeBudgetMin": 55,
    "brief": "You are Demetrius, Chief People Officer (CHRO) at a 100-person SaaS company. You sit on the executive team and report directly to the CEO. The board meets in 10 days. You have two capital-level conversations this quarter: a request to fund a leadership development program ($400K) and a decision on whether to build or buy the company's next-generation HRIS platform.\n\n1. People vision memo: write a 1-page memo for the CEO and board. Where is the people function going over the next 18 months? What is the talent strategy for scaling from 100 to 200 employees? What is the company's identity as an employer — the one thing that makes it hard to leave and hard to replicate?\n\n2. Board pre-read on people health: 1 page. Team size, voluntary attrition rate (name the number and the benchmark), eNPS trend, time-to-fill for critical roles, and the top 2 talent risks with status. The board reads this in 3 minutes — make every sentence carry information.\n\n3. Capital ask — leadership development: write a 2-page investment case for the $400K leadership development program. State the problem it solves (first-time manager failure rate, promotion-to-regret rate, whatever you have data on), the program design, expected outcomes, measurement plan, and the cost of not doing it.\n\n4. CEO 1:1 prep: 5-7 bullets for your weekly CEO meeting. Mix: a win, a risk the CEO needs to know about, one decision you need from them, and one thing you're hearing from employees that leadership doesn't know yet.\n\nAt this level your job is people capital allocation and culture stewardship. Your writing should make decisions stick.",
    "deliverables": [
      {
        "filename": "people-vision.md",
        "description": "1-page people vision: 18-month talent strategy for 100→200 scale, employer identity, one big bet"
      },
      {
        "filename": "board-pre-read-people-health.md",
        "description": "1-page board pre-read: team size, attrition rate vs. benchmark, eNPS trend, time-to-fill, top 2 talent risks with status"
      },
      {
        "filename": "capital-ask-leadership-development.md",
        "description": "2-page investment case: problem statement with data, program design, expected outcomes, measurement plan, cost of not doing it"
      },
      {
        "filename": "ceo-1on1-prep.md",
        "description": "5-7 bullets: a win, a risk, one decision needed from CEO, one signal from employees leadership doesn't know yet"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-3121.00",
        "url": "https://www.onetonline.org/link/summary/11-3121.00",
        "quote": "Plan, organize, direct, control, or coordinate the personnel, training, or labor relations activities of an organization."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Direct and coordinate activities of businesses or departments concerned with the production, pricing, sales, or distribution of products."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Review financial statements, sales or activity reports, or other performance data to measure productivity or goal achievement or to identify areas needing cost reduction or program improvement."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "HR-L09-Niamh"
    ],
    "downstreamDeskIds": [],
    "rubric": {
      "completion": [
        "All four deliverables present?",
        "Does the people vision name ONE employer identity claim (not a list of values)?",
        "Does the board pre-read include all five required data points?",
        "Does the capital ask include a measurement plan (not just expected outcomes)?",
        "Are exactly 5-7 CEO 1:1 bullets present, covering all four required types?"
      ],
      "quality": [
        "Is the people vision specific enough that a competitor could not copy it unchanged?",
        "Does the board pre-read use actual numbers, not directional language ('trending up')?",
        "Does the capital ask include a 'cost of not doing it' argument that is concrete?",
        "Is the CEO 1:1 bullet about 'what employees are saying' genuinely unexpected (not HR boilerplate)?",
        "Is every document scannable in under 3 minutes?"
      ],
      "accuracy": [
        "Does the people vision reflect the 100→200 scale trajectory (not a generic mission statement)?",
        "Do board pre-read metrics align with numbers from Niamh's snapshot upstream?",
        "Is the $400K leadership development ask referenced in the capital ask document?",
        "Does the capital ask cite a real data point on first-time manager failure or similar?",
        "Does the people vision connect to the 18-month horizon (not just this quarter)?"
      ],
      "handoff": [
        "Could the CEO walk into the board meeting on people topics from the pre-read alone?",
        "Could the CFO approve or cut the leadership development program from the capital ask?",
        "Does the CEO 1:1 prep include a decision that requires a yes/no answer from the CEO?",
        "Does the people vision set up the next 2-quarter OKR cascade for the People org?",
        "Could a board member ask 2-3 questions from the pre-read and get sufficient answers from these documents?"
      ]
    }
  },
  {
    "id": "LEGOPS-L01-Dana",
    "dept": "LEGOPS",
    "level": 1,
    "title": "Paralegal I",
    "name": "Dana",
    "timeBudgetMin": 25,
    "brief": "You are Dana, a Paralegal I at a 100-person SaaS company. You sit on the Legal & Operations team and handle foundational document work that keeps the contract pipeline moving.\n\nToday you have two tasks. First, a vendor has returned a signed NDA and you need to process it: file the executed copy in the contract management system under the correct vendor folder, update the NDA tracker spreadsheet with the execution date and expiry (one year from signing), and send a confirmation email acknowledging receipt.\n\nSecond, the General Counsel has asked you to pull together a simple summary of your standard SaaS Master Service Agreement (MSA) template — one page, plain language, hitting the key clauses (payment terms, limitation of liability, IP ownership, termination, data handling). This summary will be used in an upcoming sales onboarding session.\n\nStay narrow. Do not draft new legal language; summarize what exists. Flag any clause in the template you find ambiguous so counsel can review.",
    "deliverables": [
      {
        "filename": "nda-filing-confirmation.md",
        "description": "Confirmation note: vendor name, execution date, expiry date, storage path in contract management system, and next-action owner"
      },
      {
        "filename": "msa-plain-language-summary.md",
        "description": "One-page plain-language summary of the standard MSA template covering: payment terms, liability cap, IP ownership, termination rights, data handling. Flag any ambiguous clause."
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "23-2011.00",
        "url": "https://www.onetonline.org/link/summary/23-2011.00",
        "quote": "Prepare affidavits or other documents, such as legal correspondence, and organize and maintain documents in paper or electronic filing system."
      },
      {
        "source": "O*NET",
        "code": "23-2011.00",
        "url": "https://www.onetonline.org/link/summary/23-2011.00",
        "quote": "Prepare, edit, or review legal documents, including legislation, briefs, pleadings, appeals, wills, contracts, and real estate closing statements."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/legal/paralegals-and-legal-assistants.htm",
        "quote": "Paralegals and legal assistants perform a variety of tasks to support lawyers."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "LEGOPS-L05-Hideo"
    ],
    "rubric": {
      "completion": [
        "Is the NDA filing confirmation note produced?",
        "Does the confirmation include execution date, expiry date, and storage path?",
        "Is the MSA plain-language summary produced?",
        "Does the summary cover all five required clause categories?",
        "Are ambiguous clauses flagged explicitly?"
      ],
      "quality": [
        "Is the confirmation note formatted for quick scan (no paragraphs of prose)?",
        "Is the MSA summary written in plain language (no legalese)?",
        "Is the summary scoped to one page or fewer?",
        "Are flagged ambiguities specific (named clause, not 'section 3 is unclear')?",
        "Is the writing free of filler and apologies?"
      ],
      "accuracy": [
        "Does the expiry date correctly add one year to the execution date?",
        "Does the storage path follow the expected vendor folder convention?",
        "Does the MSA summary accurately reflect standard SaaS contract terms?",
        "Are payment term details (net days, late fees) correctly captured?",
        "Is the IP ownership clause correctly characterized (work-for-hire vs. license)?"
      ],
      "handoff": [
        "Could LEGOPS-L05-Hideo find the filed NDA from the confirmation note alone?",
        "Is the next-action owner named in the filing confirmation?",
        "Could a sales rep use the MSA summary in a customer conversation without legal coaching?",
        "Are flagged ambiguities routed to the right reviewer?",
        "Is the NDA tracker update clearly described so anyone could verify it?"
      ]
    }
  },
  {
    "id": "LEGOPS-L02-Saoirse",
    "dept": "LEGOPS",
    "level": 2,
    "title": "Paralegal II",
    "name": "Saoirse",
    "timeBudgetMin": 25,
    "brief": "You are Saoirse, a Paralegal II at a 100-person SaaS company. You handle more complex document tasks than L1 and are the team's go-to for contract research and tracker maintenance.\n\nToday you have three tasks. First, a sales rep flagged that a prospect is asking about GDPR data processing addendum (DPA) requirements. Pull together a two-to-three paragraph research note summarizing what a standard DPA must contain under GDPR Article 28 — subject matter, duration, nature and purpose of processing, categories of data subjects, and obligations/rights of the controller. No legal opinions; just a factual summary the senior counsel can use as a starting point.\n\nSecond, the contract management spreadsheet has 12 entries marked 'pending signature.' Review each entry and categorize it: (a) waiting on counter-party, (b) waiting on internal approval, or (c) stale/needs follow-up (no activity >30 days). Produce a triage table.\n\nThird, pull the three most recent executed vendor agreements from the filing system and confirm that each has an attached certificate of insurance (COI). Flag any that are missing.",
    "deliverables": [
      {
        "filename": "gdpr-dpa-research-note.md",
        "description": "2-3 paragraph factual summary of GDPR Article 28 DPA requirements: subject matter, duration, nature/purpose of processing, categories of data, controller/processor obligations"
      },
      {
        "filename": "contract-triage-table.md",
        "description": "Table of 12 pending-signature contracts categorized as: (a) waiting on counter-party, (b) waiting on internal approval, (c) stale/needs follow-up. Include last-activity date."
      },
      {
        "filename": "coi-audit-note.md",
        "description": "For each of the 3 most recent executed vendor agreements: vendor name, agreement date, COI present (Y/N), and action required if missing"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "23-2011.00",
        "url": "https://www.onetonline.org/link/summary/23-2011.00",
        "quote": "Investigate facts and law of cases and search pertinent sources, such as public records and internet sources, to determine causes of action and to prepare cases."
      },
      {
        "source": "O*NET",
        "code": "23-2011.00",
        "url": "https://www.onetonline.org/link/summary/23-2011.00",
        "quote": "Gather and analyze research data, such as statutes, decisions, and legal articles, codes, and documents."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/legal/paralegals-and-legal-assistants.htm",
        "quote": "Paralegals and legal assistants perform a variety of tasks to support lawyers."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "LEGOPS-L05-Hideo"
    ],
    "rubric": {
      "completion": [
        "Is the GDPR DPA research note produced?",
        "Does the research note cover all five Article 28 elements?",
        "Is the contract triage table produced with all three categories?",
        "Does the COI audit note cover all three vendor agreements?",
        "Are missing COIs explicitly flagged with action required?"
      ],
      "quality": [
        "Is the GDPR note factual only (no legal opinions)?",
        "Is the triage table scannable in under one minute?",
        "Does each triage row include a last-activity date?",
        "Is the COI audit structured as a table (not prose)?",
        "Is writing concise with no filler?"
      ],
      "accuracy": [
        "Does the DPA note accurately reflect GDPR Article 28 requirements?",
        "Is 'stale' correctly defined as >30 days no activity?",
        "Are categories (a), (b), (c) mutually exclusive and collectively exhaustive?",
        "Is the COI check clearly defined (attached file, not verbal confirmation)?",
        "Are vendor agreement dates correctly pulled from executed docs?"
      ],
      "handoff": [
        "Could LEGOPS-L05-Hideo action the contract triage without follow-up questions?",
        "Could senior counsel use the DPA note without re-researching from scratch?",
        "Is the COI audit actionable (clear owner for each missing COI)?",
        "Are all three deliverables independently usable?",
        "Did Saoirse flag any blockers (e.g., missing access to filing system)?"
      ]
    }
  },
  {
    "id": "LEGOPS-L03-Mateus",
    "dept": "LEGOPS",
    "level": 3,
    "title": "Junior Counsel",
    "name": "Mateus",
    "timeBudgetMin": 25,
    "brief": "You are Mateus, a Junior Counsel at a 100-person SaaS company. You own first-pass contract drafting and review, operating under supervision of senior counsel.\n\nToday you are drafting the first version of a vendor NDA for a new infrastructure provider. The vendor is a cloud storage company that will have access to customer metadata (not content). Use the company's standard bilateral NDA template as your base, but apply these specific modifications: (1) narrow the confidentiality carve-out for 'publicly available information' to exclude information made public through the vendor's own breach; (2) add a data handling clause requiring the vendor to notify the company within 48 hours of any suspected security incident; and (3) set the term to 3 years with automatic renewal unless terminated on 60 days' notice.\n\nAlongside the draft, write a brief redline memo explaining each modification and the business rationale. Mateus should flag any provisions in the template that are inconsistent with the modifications, and note any legal questions that should be reviewed by senior counsel before the draft is sent to the vendor.",
    "deliverables": [
      {
        "filename": "vendor-nda-draft-v1.md",
        "description": "First-draft bilateral NDA with three custom modifications applied: public-info carve-out narrowed, 48-hour breach notification added, 3-year term with auto-renewal"
      },
      {
        "filename": "redline-memo.md",
        "description": "Memo explaining each of the three modifications, business rationale, template inconsistencies flagged, and open questions for senior counsel review"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "23-1011.00",
        "url": "https://www.onetonline.org/link/summary/23-1011.00",
        "quote": "Prepare, draft, and review legal documents, such as wills, deeds, patent applications, mortgages, leases, and contracts."
      },
      {
        "source": "O*NET",
        "code": "23-1011.00",
        "url": "https://www.onetonline.org/link/summary/23-1011.00",
        "quote": "Advise clients concerning business transactions, claim liability, advisability of prosecuting or defending lawsuits, or legal rights and obligations."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/legal/lawyers.htm",
        "quote": "Lawyers advise and represent individuals, businesses, and government agencies on legal issues and disputes."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "LEGOPS-L05-Hideo"
    ],
    "rubric": {
      "completion": [
        "Is the NDA draft produced?",
        "Are all three modifications present in the draft?",
        "Is the redline memo produced?",
        "Does the memo explain each modification with business rationale?",
        "Are open questions for senior counsel explicitly flagged?"
      ],
      "quality": [
        "Is the 48-hour breach notification clause operationally specific (written notice, named contact)?",
        "Does the public-info carve-out narrowing use precise legal language?",
        "Is the auto-renewal mechanism clearly drafted (notice period, effective date)?",
        "Does the redline memo distinguish business rationale from legal risk?",
        "Is the draft free of internal contradictions with the base template?"
      ],
      "accuracy": [
        "Does the public-info carve-out modification logically close the breach-disclosure loophole?",
        "Is the 3-year term with 60-day termination notice correctly stated?",
        "Are template inconsistencies genuinely inconsistent (not false positives)?",
        "Does the data handling clause meet baseline incident-notification standards?",
        "Is the bilateral NDA structure preserved (obligations on both parties)?"
      ],
      "handoff": [
        "Could LEGOPS-L05-Hideo do a senior review from the draft + memo alone?",
        "Are open questions specific enough to yield yes/no answers from senior counsel?",
        "Is the draft formatted for clean redlining (not a wall of text)?",
        "Are section references in the memo tied to actual NDA section numbers?",
        "Could the draft be sent to the vendor after one senior review pass?"
      ]
    }
  },
  {
    "id": "LEGOPS-L04-Klara",
    "dept": "LEGOPS",
    "level": 4,
    "title": "Counsel",
    "name": "Klara",
    "timeBudgetMin": 35,
    "brief": "You are Klara, Counsel at a 100-person SaaS company. You own full-cycle contract negotiation for mid-market deals and vendor agreements, operating with significant independence but escalating material risk to Senior Counsel.\n\nToday you have three items. First, a mid-market customer has returned your standard MSA with 14 redlines. Triage the redlines: categorize each as (a) acceptable as-is, (b) acceptable with minor counter, or (c) escalate to senior counsel. For (b) items, draft the counter-language. For (c) items, write a one-sentence escalation note explaining the risk.\n\nSecond, a new SaaS sub-processor agreement landed from a data infrastructure vendor. Review it for compliance with your company's standard data processing obligations (GDPR Article 28, CCPA service provider requirements). Note any gaps.\n\nThird, draft a short compliance memo (one page) summarizing your company's current obligations under CCPA for a product team asking whether they can use a new third-party analytics SDK. Cover: what counts as 'selling' data under CCPA, the service provider exception, and what contractual clause would be required to use the SDK without triggering sale obligations.",
    "deliverables": [
      {
        "filename": "redline-triage.md",
        "description": "Table of 14 customer redlines: clause name, category (a/b/c), counter-language for (b) items, escalation note for (c) items"
      },
      {
        "filename": "sub-processor-gap-analysis.md",
        "description": "Gap analysis of vendor sub-processor agreement vs. GDPR Art. 28 and CCPA service provider requirements. Each gap: clause missing, standard requirement, risk level (H/M/L)."
      },
      {
        "filename": "ccpa-sdk-memo.md",
        "description": "One-page compliance memo for product team: CCPA 'sale' definition, service provider exception, required contractual clause to use analytics SDK without triggering sale obligations"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "23-1011.00",
        "url": "https://www.onetonline.org/link/summary/23-1011.00",
        "quote": "Negotiate contractual agreements."
      },
      {
        "source": "O*NET",
        "code": "23-1011.00",
        "url": "https://www.onetonline.org/link/summary/23-1011.00",
        "quote": "Interpret laws, rulings and regulations for individuals and businesses."
      },
      {
        "source": "O*NET",
        "code": "13-1041.00",
        "url": "https://www.onetonline.org/link/summary/13-1041.00",
        "quote": "Identify compliance issues that require follow-up or investigation."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "LEGOPS-L05-Hideo"
    ],
    "rubric": {
      "completion": [
        "Is the redline triage table produced with all 14 items categorized?",
        "Does the triage include counter-language for all (b) items?",
        "Does the triage include escalation notes for all (c) items?",
        "Is the sub-processor gap analysis produced?",
        "Is the CCPA SDK memo produced?"
      ],
      "quality": [
        "Is counter-language legally precise (not paraphrased intent)?",
        "Are gap analysis risk levels calibrated (not all-H)?",
        "Does the CCPA memo distinguish 'sale' from 'share' correctly?",
        "Is the service provider exception explained with the key contractual element (limiting use restriction)?",
        "Is escalation reasoning specific enough for senior counsel to act without re-reading the redline?"
      ],
      "accuracy": [
        "Does the gap analysis correctly apply GDPR Article 28 sub-processor requirements?",
        "Does the CCPA memo correctly characterize the service provider exception?",
        "Is the required contractual clause (limiting use to performing services) accurately stated?",
        "Are (a) items genuinely non-material changes?",
        "Does the gap analysis cover both GDPR and CCPA independently?"
      ],
      "handoff": [
        "Could LEGOPS-L05-Hideo approve the (b) counter-language without re-reading the original redlines?",
        "Could the product team act on the CCPA memo without further legal consultation?",
        "Are gap analysis items prioritized so the vendor knows which gaps are blocking?",
        "Is the redline triage formatted to paste directly into a reply email?",
        "Did Klara flag any items requiring legal counsel sign-off before customer response?"
      ]
    }
  },
  {
    "id": "LEGOPS-L05-Hideo",
    "dept": "LEGOPS",
    "level": 5,
    "title": "Senior Counsel",
    "name": "Hideo",
    "timeBudgetMin": 35,
    "brief": "You are Hideo, Senior Counsel at a 100-person SaaS company. You supervise the two paralegals (Dana, Saoirse) and the two junior attorneys (Mateus, Klara), review and approve their work product, and handle any matter that exceeds their authority threshold.\n\nToday you have four inputs landing simultaneously. From Dana: a filed NDA confirmation and an MSA plain-language summary. From Saoirse: a GDPR DPA research note, a contract triage table, and a COI audit. From Mateus: a vendor NDA draft v1 and redline memo. From Klara: a customer redline triage, sub-processor gap analysis, and CCPA memo.\n\nYour tasks: (1) Review and approve or revise Mateus's vendor NDA draft — mark up any language issues and either clear the draft for external delivery or send back with specific revision instructions. (2) Review Klara's customer redline triage — approve (b) counter-language items and make a final call on the (c) escalation items. (3) Draft a prioritized work queue for the two paralegals based on Dana's NDA status and Saoirse's contract triage table. (4) Write a one-page IT policy memo establishing the company's standard cloud vendor security requirements, incorporating the COI gap findings Saoirse surfaced.\n\nYou are the synthesis layer. Your job is to clear work from IC queue and generate policy guidance.",
    "deliverables": [
      {
        "filename": "nda-review-decision.md",
        "description": "Review decision for Mateus's vendor NDA draft v1: approve for delivery OR return with markup. If markup: specific revision instructions keyed to clause numbers."
      },
      {
        "filename": "redline-final-positions.md",
        "description": "Final approved positions on Klara's 14 customer redlines: (b) items confirmed or revised, (c) items resolved with decision and rationale"
      },
      {
        "filename": "paralegal-work-queue.md",
        "description": "Prioritized task list for Dana and Saoirse: task, priority (P1/P2/P3), deadline, and any inputs they need from senior staff"
      },
      {
        "filename": "cloud-vendor-security-policy.md",
        "description": "One-page IT policy memo: standard security requirements for all cloud vendors (COI minimums, incident notification, data handling, audit rights)"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "23-1011.00",
        "url": "https://www.onetonline.org/link/summary/23-1011.00",
        "quote": "Supervise legal assistants."
      },
      {
        "source": "O*NET",
        "code": "23-1011.00",
        "url": "https://www.onetonline.org/link/summary/23-1011.00",
        "quote": "Analyze the probable outcomes of cases, using knowledge of legal precedents."
      },
      {
        "source": "O*NET",
        "code": "13-1041.00",
        "url": "https://www.onetonline.org/link/summary/13-1041.00",
        "quote": "Verify that all firm and regulatory policies and procedures have been documented, implemented, and communicated."
      }
    ],
    "upstreamDeskIds": [
      "LEGOPS-L01-Dana",
      "LEGOPS-L02-Saoirse",
      "LEGOPS-L03-Mateus",
      "LEGOPS-L04-Klara"
    ],
    "downstreamDeskIds": [
      "LEGOPS-L06-Anneliese"
    ],
    "rubric": {
      "completion": [
        "Is the NDA review decision produced with a clear approve/return verdict?",
        "If returned, are revision instructions keyed to clause numbers?",
        "Are all 14 customer redlines resolved in the final positions doc?",
        "Is the paralegal work queue produced with priorities and deadlines?",
        "Is the cloud vendor security policy memo produced?"
      ],
      "quality": [
        "Are NDA revision instructions specific enough for Mateus to act without a follow-up call?",
        "(c) escalation decisions must include rationale, not just a verdict",
        "Does the work queue distinguish P1 (blocking) from P2/P3 (time-sensitive/routine)?",
        "Does the security policy go beyond COI to cover incident notification and audit rights?",
        "Is the security policy written as an internal policy (enforceable), not a wish list?"
      ],
      "accuracy": [
        "Do NDA markup decisions align with the company's standard template positions?",
        "Are customer redline decisions legally defensible (not just commercially convenient)?",
        "Does the work queue reflect actual urgency from the triage table (not arbitrary priority)?",
        "Does the COI minimum standard reflect reasonable vendor risk categories?",
        "Is the security policy consistent with the DPA obligations Saoirse surfaced?"
      ],
      "handoff": [
        "Could Mateus deliver the NDA to the vendor the same day from Hideo's decision?",
        "Could Klara send the customer response from the final positions doc?",
        "Could the paralegals start the work queue without a verbal briefing?",
        "Could Anneliese (L06) incorporate the security policy into vendor onboarding without revision?",
        "Did Hideo surface any open items that need escalation to the Operations Manager?"
      ]
    }
  },
  {
    "id": "LEGOPS-L06-Anneliese",
    "dept": "LEGOPS",
    "level": 6,
    "title": "Operations Manager",
    "name": "Anneliese",
    "timeBudgetMin": 35,
    "brief": "You are Anneliese, Operations Manager at a 100-person SaaS company. You sit at the legal-ops interface: you own the vendor onboarding process, the ops playbook library, and the company's RACI framework. You manage no attorneys directly — your reports are the ops coordinators — but you collaborate closely with Hideo (Senior Counsel) and report up to Vidya (Senior Procurement & Vendor Ops).\n\nToday you have three items. First, Hideo has delivered a new cloud vendor security policy. Your job is to operationalize it: translate the policy requirements into a vendor onboarding checklist (the practical steps ops coordinators run for every new cloud vendor) and identify which existing process steps need to change.\n\nSecond, Vidya has flagged that the company's RACI chart for vendor contracting is outdated — it still references roles that no longer exist. Update the RACI for the vendor contract lifecycle (NDA → MSA → sub-processor agreement → renewal) with current role names. Roles to map: Paralegal I/II, Counsel, Senior Counsel, Operations Manager, Senior Procurement Lead (Vidya), Director Ops (Soren).\n\nThird, write a 1-page ops playbook entry for the 'contract renewal reminder' process: 90-day and 30-day touchpoints, owner at each stage, escalation path if a vendor does not respond, and hand-off to legal for renewal negotiations.",
    "deliverables": [
      {
        "filename": "vendor-onboarding-checklist.md",
        "description": "Checklist translating Hideo's cloud vendor security policy into step-by-step ops coordinator actions: each step, owner, required artifact, and gating condition for next step"
      },
      {
        "filename": "vendor-contract-raci.md",
        "description": "Updated RACI table for vendor contract lifecycle (NDA → MSA → sub-processor agreement → renewal). Rows = activities, Columns = current role titles. R/A/C/I for each cell."
      },
      {
        "filename": "contract-renewal-playbook.md",
        "description": "One-page ops playbook entry: 90-day and 30-day renewal touchpoints, owner at each stage, escalation path for non-responsive vendors, hand-off to legal"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Establish or implement departmental policies, goals, objectives, or procedures in conjunction with board members, organization officials, or staff members."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Direct administrative activities directly related to making products or providing services."
      },
      {
        "source": "O*NET",
        "code": "13-1041.00",
        "url": "https://www.onetonline.org/link/summary/13-1041.00",
        "quote": "Verify that all firm and regulatory policies and procedures have been documented, implemented, and communicated."
      }
    ],
    "upstreamDeskIds": [
      "LEGOPS-L05-Hideo"
    ],
    "downstreamDeskIds": [
      "LEGOPS-L07-Vidya"
    ],
    "rubric": {
      "completion": [
        "Is the vendor onboarding checklist produced?",
        "Is the RACI table produced with all six current roles mapped?",
        "Is the contract renewal playbook entry produced?",
        "Does the checklist translate every policy requirement into a discrete step?",
        "Does the renewal playbook include both 90-day and 30-day touchpoints?"
      ],
      "quality": [
        "Is each checklist step atomic (one action, one owner, one artifact)?",
        "Does the RACI distinguish Responsible from Accountable (not conflated)?",
        "Is the escalation path in the renewal playbook specific (named role, named channel)?",
        "Are gating conditions in the checklist binary (pass/fail, not 'review and assess')?",
        "Is the playbook entry written to be executed by a coordinator without coaching?"
      ],
      "accuracy": [
        "Does the checklist cover all requirements from Hideo's security policy (COI, incident notification, audit rights)?",
        "Are RACI assignments consistent with how work actually flows (Legal = R for NDA, not ops)?",
        "Does the renewal playbook correctly route to Hideo for negotiation at the legal hand-off point?",
        "Are deprecated role names absent from the RACI?",
        "Does the playbook correctly identify Anneliese as A (accountable) for the ops stages?"
      ],
      "handoff": [
        "Could an ops coordinator run the vendor onboarding checklist from day one without training?",
        "Could Vidya (L07) present the updated RACI to the department without revision?",
        "Is the renewal playbook formatted for the ops playbook library (consistent with other entries)?",
        "Did Anneliese flag any policy requirements that ops cannot enforce without tooling?",
        "Could Legal use the RACI to understand their own responsibilities without asking Anneliese?"
      ]
    }
  },
  {
    "id": "LEGOPS-L07-Vidya",
    "dept": "LEGOPS",
    "level": 7,
    "title": "Senior Procurement & Vendor Operations Lead",
    "name": "Vidya",
    "timeBudgetMin": 45,
    "brief": "You are Vidya, Senior Procurement & Vendor Operations Lead at a 100-person SaaS company. You are the highest out-degree node in the company's operational DAG this cycle. Today you own two things that cascade to every other department: the contract redline package that unblocks Sales from closing, and the annual vendor budget allocation that tells every department head what they have to work with.\n\nFirst, the Sales team is blocked on a late-stage enterprise deal. The prospect has returned a 22-clause redline on your MSA. Anneliese has handed you the ops-side analysis; Legal (Hideo) has cleared the legal positions. Your job is to synthesize both into a final contract redline package — a clean version of the MSA with your positions applied, plus a one-page cover memo for the Sales Director (Iliana, SALES-L08) summarizing the three remaining open issues and your recommended resolution for each. This document is the close-motion input.\n\nSecond, the annual vendor budget cycle has landed. You have been given total vendor spend authority of $2.4M across 9 department budget lines. Allocate the budget across all nine receiving departments, document the allocation rationale for each, and produce a master vendor budget allocation memo that each department Director (L08) will use to negotiate their own vendor contracts for the coming year. The nine receiving L08 directors are: Petra (EXEC), Esther (ENG), Diego (PROD), Caelan (DES), Iliana (SALES), Caleb (MKT), Astrid (CS), Pierre (FIN), and Renaud (HR). Each allocation must include: the department's budget line, the key vendor categories it covers, any cross-department shared-vendor pools, and one compliance constraint from the legal and security policy framework.\n\nThis is a coordination apex. You are not just allocating funds — you are setting the operating envelope for the whole company's vendor relationships. Be specific. Be defensible. Be complete.",
    "deliverables": [
      {
        "filename": "msa-redline-package.md",
        "description": "Final MSA with all 22 redlines resolved (clean version with accepted/counter language applied), plus one-page cover memo for SALES-L08-Iliana: three remaining open issues with recommended resolution for each"
      },
      {
        "filename": "vendor-budget-allocation.md",
        "description": "Master vendor budget allocation memo: total $2.4M allocated across 9 departments. For each of the nine L08 directors (Petra/EXEC, Esther/ENG, Diego/PROD, Caelan/DES, Iliana/SALES, Caleb/MKT, Astrid/CS, Pierre/FIN, Renaud/HR): budget line amount, key vendor categories, shared-pool items, one compliance constraint. Rationale for each allocation."
      },
      {
        "filename": "vendor-spend-dashboard.md",
        "description": "Summary table: department, allocated amount, % of total, top 2 vendor categories, shared pool contributions, and compliance flag. Designed for Director-level review at-a-glance."
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Direct or coordinate financial or budget activities to fund operations, maximize investments, or increase efficiency."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Monitor suppliers to ensure that they efficiently and effectively provide needed goods or services within budgetary limits."
      },
      {
        "source": "O*NET",
        "code": "23-1011.00",
        "url": "https://www.onetonline.org/link/summary/23-1011.00",
        "quote": "Negotiate contractual agreements."
      }
    ],
    "upstreamDeskIds": [
      "LEGOPS-L06-Anneliese"
    ],
    "downstreamDeskIds": [
      "SALES-L08-Iliana",
      "EXEC-L08-Petra",
      "ENG-L08-Esther",
      "PROD-L08-Diego",
      "DES-L08-Caelan",
      "MKT-L08-Caleb",
      "CS-L08-Astrid",
      "FIN-L08-Pierre",
      "HR-L08-Renaud"
    ],
    "rubric": {
      "completion": [
        "Is the MSA redline package produced with a clean final version?",
        "Does the cover memo identify exactly three open issues with recommended resolutions?",
        "Is the vendor budget allocation memo produced?",
        "Does the allocation memo address all nine L08 departments individually?",
        "Is the vendor spend dashboard produced?"
      ],
      "quality": [
        "Does the cover memo give Iliana a clear recommended close path (not a list of options)?",
        "Does each department allocation include a compliance constraint from the security/legal framework?",
        "Are allocation rationales differentiated (ENG vs. HR are not the same argument)?",
        "Does the spend dashboard fit on one page and support at-a-glance comparison?",
        "Does the memo distinguish department-specific budgets from shared-vendor pools?"
      ],
      "accuracy": [
        "Do the nine department allocations sum to exactly $2.4M?",
        "Are the three remaining MSA open issues genuinely the most material unresolved points?",
        "Does the allocation reflect realistic vendor spend patterns by department (ENG infrastructure > HR software)?",
        "Are shared-pool items allocated once (not double-counted across departments)?",
        "Does each compliance constraint match the policy outputs from LEGOPS-L05/L06 upstream?"
      ],
      "handoff": [
        "Could SALES-L08-Iliana take the redline package directly into a customer negotiation call?",
        "Could each L08 director use their budget line to issue an RFP or PO without follow-up from Vidya?",
        "Is the spend dashboard formatted for the Director-level review meeting (not an internal working doc)?",
        "Did Vidya flag any department allocation that requires additional legal or board approval?",
        "Could LEGOPS-L08-Soren present the full allocation to the COO from this memo alone?"
      ]
    }
  },
  {
    "id": "LEGOPS-L08-Soren",
    "dept": "LEGOPS",
    "level": 8,
    "title": "Director of Operations",
    "name": "Soren",
    "timeBudgetMin": 45,
    "brief": "You are Soren, Director of Operations at a 100-person SaaS company. You own department strategy, vendor program governance, the IT policy portfolio, and hiring for the Legal & Operations team. You report to Adaobi (VP Legal & Ops) and manage Vidya's team and Anneliese's ops coordinators.\n\nToday is a heavy strategy day. Vidya has delivered the vendor budget allocation and the MSA redline package. You have four tasks.\n\nFirst, the company is approaching 100 employees and the CEO has asked you to draft an IT Acceptable Use Policy (AUP) for all company systems and devices. This is a company-wide policy, not a vendor-facing one. Cover: permitted and prohibited uses of company systems, BYOD rules, remote access requirements, data classification handling (public/internal/confidential/restricted), incident reporting obligations, and enforcement consequences. Aim for 2 pages.\n\nSecond, review Vidya's vendor budget allocation memo and prepare a Director's summary for Adaobi: confirm the allocations are consistent with the company's procurement governance framework, flag any department allocation that exceeds prior-year spend by more than 25%, and note any shared-pool decisions that require VP or board approval.\n\nThird, draft a business continuity plan (BCP) overview — not the full plan, but a 1-page executive summary covering: critical operations (top 5 by business impact), primary threat scenarios, recovery time objectives (RTOs) for each critical operation, and the departmental owner responsible for each stream.\n\nFourth, build the Legal & Operations hiring plan for the next two quarters: roles, justification, level, and expected hire date. Prioritize based on current team gaps.",
    "deliverables": [
      {
        "filename": "it-acceptable-use-policy.md",
        "description": "2-page company-wide IT AUP: permitted and prohibited uses, BYOD rules, remote access requirements, data classification handling, incident reporting, enforcement consequences"
      },
      {
        "filename": "vendor-budget-director-summary.md",
        "description": "Director's review of Vidya's allocation: procurement governance check, departments exceeding 25% YoY increase flagged, shared-pool items requiring VP/board approval noted"
      },
      {
        "filename": "bcp-executive-summary.md",
        "description": "1-page BCP executive summary: top 5 critical operations, primary threat scenarios, RTOs for each, departmental owner for each recovery stream"
      },
      {
        "filename": "legops-hiring-plan.md",
        "description": "Two-quarter hiring plan for Legal & Operations: role title, level, justification (gap), expected hire date, priority (P1/P2)"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Review financial statements, sales or activity reports, or other performance data to measure productivity or goal achievement or to identify areas needing cost reduction or program improvement."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Establish or implement departmental policies, goals, objectives, or procedures in conjunction with board members, organization officials, or staff members."
      },
      {
        "source": "O*NET",
        "code": "13-1041.00",
        "url": "https://www.onetonline.org/link/summary/13-1041.00",
        "quote": "Keep informed regarding pending industry changes, trends, or best practices."
      }
    ],
    "upstreamDeskIds": [
      "LEGOPS-L07-Vidya"
    ],
    "downstreamDeskIds": [
      "LEGOPS-L09-Adaobi"
    ],
    "rubric": {
      "completion": [
        "Is the IT AUP produced?",
        "Is the vendor budget director's summary produced?",
        "Is the BCP executive summary produced?",
        "Is the Legal & Ops hiring plan produced?",
        "Does the AUP cover all six required sections?"
      ],
      "quality": [
        "Is the AUP written as an enforceable policy (consequences stated, not aspirational)?",
        "Does the director's summary distinguish 'flag' items from 'approved as-is' items?",
        "Does the BCP executive summary give each critical operation a specific RTO (hours/days, not 'ASAP')?",
        "Is the hiring plan prioritized with rationale (gap description, not just role title)?",
        "Are data classification tiers in the AUP operationally defined (what goes in each tier)?"
      ],
      "accuracy": [
        "Does the AUP correctly characterize BYOD security requirements (MDM enrollment, remote wipe)?",
        "Does the director's summary correctly calculate 25% YoY thresholds from Vidya's allocation?",
        "Are BCP RTOs realistic for a 100-person SaaS company (not enterprise-scale)?",
        "Does the hiring plan reflect actual gaps (not a wish list)?",
        "Does the AUP enforcement section reference an actual disciplinary process?"
      ],
      "handoff": [
        "Could Adaobi (L09) take the hiring plan to a board compensation committee without revision?",
        "Could the IT team publish the AUP company-wide from Soren's draft?",
        "Could Adaobi present the BCP summary to the CEO or board from this one page?",
        "Is the director's summary self-contained enough for Adaobi to approve allocations without reviewing Vidya's raw memo?",
        "Did Soren escalate any items that require Adaobi's sign-off before proceeding?"
      ]
    }
  },
  {
    "id": "LEGOPS-L09-Adaobi",
    "dept": "LEGOPS",
    "level": 9,
    "title": "VP Legal & Operations",
    "name": "Adaobi",
    "timeBudgetMin": 55,
    "brief": "You are Adaobi, VP of Legal & Operations at a 100-person SaaS company. You own the legal function, the operations function, and regulatory compliance. You report to Theodora (COO/General Counsel) and hold the budget authority for the Legal & Ops department. You are the exec sponsor for major vendor negotiations and the primary liaison to outside counsel.\n\nToday is a cross-functional leadership day. Soren has delivered the IT AUP, vendor budget director's summary, BCP executive summary, and hiring plan. You have five tasks.\n\nFirst, prepare the quarterly Legal & Ops review for Theodora: a 2-page department memo covering (a) legal matters status (active contracts in negotiation, any disputes, regulatory filings pending), (b) ops performance (vendor program health, BCP readiness, policy coverage), (c) team capacity and the hiring plan recommendation, and (d) budget outlook vs. actuals.\n\nSecond, the company has been notified of a new state data privacy law (assume: a state CPRA-equivalent) that takes effect in 180 days. You need to produce a regulatory readiness roadmap: which existing policies need updating, what new processes must be built, which teams are affected, and a 90-60-30-day action plan with owners.\n\nThird, evaluate and approve or modify Soren's hiring plan. Apply VP-level judgment: which roles are P1 (block everything else to hire), which are P2 (hire if budget clears), and which should be deferred. Write a brief rationale for each decision.\n\nFourth, prepare your CEO/exec team 1:1 prep: 5-7 bullets for Theodora's review — wins, risks, asks, and one item Theodora should hear from you before anyone else surfaces it.",
    "deliverables": [
      {
        "filename": "legops-quarterly-review.md",
        "description": "2-page quarterly department memo for Theodora: legal matters status, ops performance, team capacity + hiring recommendation, budget outlook vs. actuals"
      },
      {
        "filename": "privacy-law-readiness-roadmap.md",
        "description": "Regulatory readiness roadmap for new state CPRA-equivalent: affected policies, new processes required, teams affected, 90-60-30-day action plan with named owners"
      },
      {
        "filename": "hiring-plan-vp-decision.md",
        "description": "VP-level decision on Soren's hiring plan: P1/P2/deferred for each role with rationale, revised headcount budget if any cuts made"
      },
      {
        "filename": "ceo-1on1-prep.md",
        "description": "5-7 bullets for Theodora 1:1: wins, risks, asks, and one item for Theodora's ears first"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Plan or direct activities, such as sales promotions, that require coordination with other department managers."
      },
      {
        "source": "O*NET",
        "code": "23-1011.00",
        "url": "https://www.onetonline.org/link/summary/23-1011.00",
        "quote": "Perform administrative and management functions related to the practice of law."
      },
      {
        "source": "O*NET",
        "code": "13-1041.00",
        "url": "https://www.onetonline.org/link/summary/13-1041.00",
        "quote": "Provide assistance to internal or external auditors in compliance reviews."
      }
    ],
    "upstreamDeskIds": [
      "LEGOPS-L08-Soren"
    ],
    "downstreamDeskIds": [
      "LEGOPS-L10-Theodora"
    ],
    "rubric": {
      "completion": [
        "Is the quarterly review memo produced?",
        "Does the review cover all four sections (legal, ops, team, budget)?",
        "Is the privacy law readiness roadmap produced?",
        "Does the roadmap include a 90-60-30-day action plan with named owners?",
        "Is the hiring plan VP decision produced with rationale for each role?"
      ],
      "quality": [
        "Does the quarterly review fit in 2 pages and be scannable by a C-level in 3 minutes?",
        "Does the privacy roadmap name specific policies and processes (not 'update privacy program')?",
        "Are hiring plan decisions differentiated (not all P1)?",
        "Does the CEO prep include a specific 'hear from me first' item (something genuinely sensitive)?",
        "Is budget outlook section in the quarterly review based on numbers (not narrative)?"
      ],
      "accuracy": [
        "Does the privacy roadmap correctly identify CPRA-equivalent obligations (opt-out rights, sensitive data, contractor requirements)?",
        "Does the 90-60-30 day timeline allow realistic execution for a 100-person company?",
        "Are hiring plan decisions consistent with budget constraints Soren surfaced?",
        "Does the quarterly review accurately reflect the BCP status Soren delivered?",
        "Are regulatory filing deadlines (if any) correctly computed from the 180-day window?"
      ],
      "handoff": [
        "Could Theodora present the quarterly review to the board without additional prep?",
        "Could affected team leads start the 90-day privacy readiness track from the roadmap alone?",
        "Could the People team open requisitions from the approved hiring plan immediately?",
        "Is the CEO prep formatted for a 15-minute standing meeting (not a document review)?",
        "Did Adaobi surface any items requiring Theodora's decision before the quarter ends?"
      ]
    }
  },
  {
    "id": "LEGOPS-L10-Theodora",
    "dept": "LEGOPS",
    "level": 10,
    "title": "Chief Operating Officer / General Counsel",
    "name": "Theodora",
    "timeBudgetMin": 55,
    "brief": "You are Theodora, Chief Operating Officer and General Counsel at a 100-person SaaS company. You are both a C-level executive and the company's top legal officer — a dual mandate that gives you authority over all operational functions and the full legal risk posture of the company. You report to the CEO and present to the board. You have final sign-off on vendor contracts above $250K, all regulatory filings, and all company-wide policies.\n\nToday Adaobi has delivered the quarterly review, privacy law readiness roadmap, hiring plan decision, and CEO prep. You have four tasks.\n\nFirst, prepare the board legal & ops pre-read: a 1-page memo covering the company's current legal risk posture (active litigation or disputes, top 3 regulatory exposures, insurance coverage adequacy), operational health (BCP readiness, vendor program status, policy coverage), and two decisions you need the board to make this quarter (budget approval, policy ratification, or material contract approval).\n\nSecond, prepare the company's regulatory compliance calendar for the next 12 months: all known filing deadlines, certification renewals, policy review dates (including the new state privacy law 180-day window), and the internal owner for each item.\n\nThird, draft your position on the two most material open legal risks facing the company: for each, state the risk, your current mitigation posture, the residual risk, and your recommendation (accept, transfer via insurance, remediate, or escalate). This goes directly to the CEO.\n\nFourth, write the COO/GC operating principles memo — a short document (1 page) articulating how Legal & Ops makes decisions at this company: what goes to legal review, what goes to board, what the ops team can approve without escalation, and the one principle that governs every close call. This is a living policy document.",
    "deliverables": [
      {
        "filename": "board-legops-pre-read.md",
        "description": "1-page board pre-read: legal risk posture (litigation, top 3 regulatory exposures, insurance), operational health (BCP, vendor program, policy coverage), two board decisions required this quarter"
      },
      {
        "filename": "compliance-calendar-12mo.md",
        "description": "12-month regulatory compliance calendar: filing deadlines, certification renewals, policy review dates, internal owner for each. Includes 180-day new privacy law window."
      },
      {
        "filename": "top-legal-risks-ceo-memo.md",
        "description": "CEO memo on 2 most material legal risks: risk description, current mitigation posture, residual risk, recommendation (accept/transfer/remediate/escalate)"
      },
      {
        "filename": "coo-gc-operating-principles.md",
        "description": "1-page operating principles memo: what goes to legal review, what goes to board, what ops can approve autonomously, the one governing principle for every close call"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Review financial statements, sales or activity reports, or other performance data to measure productivity or goal achievement or to identify areas needing cost reduction or program improvement."
      },
      {
        "source": "O*NET",
        "code": "23-1011.00",
        "url": "https://www.onetonline.org/link/summary/23-1011.00",
        "quote": "Evaluate findings and develop strategies and arguments in preparation for presentation of cases."
      },
      {
        "source": "O*NET",
        "code": "13-1041.00",
        "url": "https://www.onetonline.org/link/summary/13-1041.00",
        "quote": "Prepare reports of activities, evaluations, recommendations, or decisions."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "LEGOPS-L09-Adaobi"
    ],
    "downstreamDeskIds": [],
    "rubric": {
      "completion": [
        "Is the board pre-read produced?",
        "Is the compliance calendar produced with all four item types?",
        "Is the CEO legal risks memo produced with exactly 2 risks analyzed?",
        "Is the COO/GC operating principles memo produced?",
        "Does the board pre-read request exactly two specific board decisions?"
      ],
      "quality": [
        "Does the board pre-read fit on one page and be readable by a board member in 3 minutes?",
        "Is each compliance calendar entry actionable (deadline + owner + artifact, not just a date)?",
        "Does the CEO memo state residual risk honestly (not 'manageable with best practices')?",
        "Does the operating principles memo include the one governing principle as a clearly named heuristic?",
        "Is the distinction between legal review, board approval, and ops autonomy operationally specific?"
      ],
      "accuracy": [
        "Does the compliance calendar include the 180-day privacy law deadline from Adaobi's roadmap?",
        "Are legal risk recommendations (accept/transfer/remediate/escalate) correctly matched to risk severity?",
        "Does the board pre-read accurately reflect the BCP and vendor program status from the department?",
        "Is the insurance coverage adequacy assessment grounded in the COI audit data from the team?",
        "Are the two board decisions genuinely board-level (not VP-approvable)?"
      ],
      "handoff": [
        "Could the board chair distribute the pre-read to directors without editing?",
        "Could Adaobi execute the compliance calendar without additional context from Theodora?",
        "Could the CEO brief outside counsel from the legal risks memo?",
        "Could a new COO use the operating principles memo to run the department from day one?",
        "Did Theodora close the loop on all items Adaobi escalated?"
      ]
    }
  },
  {
    "id": "EXEC-L01-Roy",
    "dept": "EXEC",
    "level": 1,
    "title": "BizOps Coordinator",
    "name": "Roy",
    "timeBudgetMin": 25,
    "brief": "You are Roy, a BizOps Coordinator at a 100-person SaaS company. Your job is to keep the operational machinery running at the IC level — gathering data, maintaining trackers, and flagging problems before they become fires.\n\nToday you have two tasks. First: the weekly metrics tracker is stale. Pull the latest figures for headcount by department, open requisitions, and monthly recurring revenue from the shared data sources (treat them as provided), and update the master ops-metrics spreadsheet. Flag any row where a metric has moved more than 10% week-over-week with a brief annotation explaining what changed.\n\nSecond: a vendor invoice has come in for a SaaS tool the company uses. Cross-check the line items against the contract terms on file, note any discrepancy, and write a short memo (3-4 sentences) recommending whether to approve, dispute, or escalate the invoice.\n\nStay atomic. Do not redesign the tracker, propose new vendor relationships, or draft a procurement policy. Your deliverables go directly to Octavio (Chief of Staff, EXEC-L05).",
    "deliverables": [
      {
        "filename": "ops-metrics-update.xlsx",
        "description": "Updated weekly metrics tracker with headcount, open reqs, MRR; rows with >10% WoW change annotated"
      },
      {
        "filename": "invoice-review-memo.md",
        "description": "3-4 sentence memo: discrepancies found (if any), recommendation to approve/dispute/escalate, rationale"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1111.00",
        "url": "https://www.onetonline.org/link/summary/13-1111.00",
        "quote": "Gather and organize information on problems or procedures."
      },
      {
        "source": "O*NET",
        "code": "13-1111.00",
        "url": "https://www.onetonline.org/link/summary/13-1111.00",
        "quote": "Review forms and reports and confer with management and users about format, distribution, and purpose, identifying problems and improvements."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/management-analysts.htm",
        "quote": "Management analysts, often called management consultants, recommend ways to improve an organization's efficiency."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "EXEC-L05-Octavio"
    ],
    "rubric": {
      "completion": [
        "Are both deliverables present (tracker update + invoice memo)?",
        "Does the tracker include headcount, open reqs, and MRR columns?",
        "Are WoW outliers (>10%) annotated with a reason?",
        "Does the invoice memo include a clear recommend/dispute/escalate recommendation?",
        "Is the memo 3-4 sentences (not a wall of text)?"
      ],
      "quality": [
        "Are the annotations specific (not 'metrics changed')?",
        "Is the recommendation backed by a concrete discrepancy finding?",
        "Is the tracker update free of formatting breaks or formula errors?",
        "Is the writing direct and free of hedging?",
        "Does Roy stay in scope (no policy proposals, no new vendor analysis)?"
      ],
      "accuracy": [
        "Is the 10% threshold applied correctly (not 9%, not 11%)?",
        "Does the invoice cross-check reference specific contract line items?",
        "Are headcount and MRR figures plausible for a 100-person SaaS company?",
        "Is the memo recommendation consistent with the discrepancy finding?",
        "Are column headers in the tracker consistent with prior format?"
      ],
      "handoff": [
        "Could Octavio (EXEC-L05) consume both deliverables in under 3 minutes?",
        "Are flagged metrics clearly marked so the Chief of Staff can act immediately?",
        "Is the invoice memo self-contained (no follow-up needed from Roy)?",
        "Does Roy note any data source issues that blocked a metric update?",
        "Are filenames predictable and consistent with the naming convention?"
      ]
    }
  },
  {
    "id": "EXEC-L02-Imani",
    "dept": "EXEC",
    "level": 2,
    "title": "BizOps Analyst",
    "name": "Imani",
    "timeBudgetMin": 25,
    "brief": "You are Imani, a BizOps Analyst. You are one rung above data entry — you analyze and synthesize, not just transcribe. Your work feeds the Chief of Staff's weekly briefing.\n\nToday you have three tasks. First: the sales team closed a large enterprise deal last week and the CEO wants to understand its unit economics. You've been given deal size, implementation cost, expected churn rate, and support load. Calculate ARR, gross margin contribution, and estimated customer lifetime value. Present the numbers in a one-page analysis with a 2-sentence executive summary at the top.\n\nSecond: there is a draft proposal from the Facilities team to switch office locations. Identify 2-3 operational risks in that proposal (e.g., lease overlap costs, staff commute impact, IT migration) and write a brief risk log.\n\nThird: a recurring Monday status report is due. Compile 5-6 bullet-point updates across departments (use plausible but concrete details) that summarize what's on track and what's blocked.\n\nYour output goes to Octavio (EXEC-L05). Concise beats comprehensive.",
    "deliverables": [
      {
        "filename": "deal-unit-economics.md",
        "description": "One-page analysis: ARR, gross margin, LTV calculation with 2-sentence exec summary"
      },
      {
        "filename": "facilities-risk-log.md",
        "description": "2-3 identified operational risks for the office relocation proposal, each with a short description"
      },
      {
        "filename": "monday-status-report.md",
        "description": "5-6 bullet-point cross-department status updates: on-track items and blockers"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1111.00",
        "url": "https://www.onetonline.org/link/summary/13-1111.00",
        "quote": "Analyze data gathered and develop solutions or alternative methods of proceeding."
      },
      {
        "source": "O*NET",
        "code": "13-1111.00",
        "url": "https://www.onetonline.org/link/summary/13-1111.00",
        "quote": "Document findings of study and prepare recommendations for implementation of new systems, procedures, or organizational changes."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/management-analysts.htm",
        "quote": "Management analysts, often called management consultants, recommend ways to improve an organization's efficiency."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "EXEC-L05-Octavio"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the unit-economics analysis include ARR, gross margin, and LTV?",
        "Does the risk log contain 2-3 named risks (not a vague paragraph)?",
        "Does the status report contain 5-6 bullets with concrete details?",
        "Is a 2-sentence executive summary present at the top of the unit-economics doc?"
      ],
      "quality": [
        "Are LTV and gross margin formulas applied correctly?",
        "Are the risks in the risk log operationally specific (not generic 'change is hard')?",
        "Is the exec summary actually a summary (not a restatement of headings)?",
        "Do status bullets distinguish on-track from blocked items clearly?",
        "Is the writing lean (no filler sentences)?"
      ],
      "accuracy": [
        "Is ARR derived consistently from deal size (not inflated)?",
        "Are the 2-3 risks plausible for an office relocation scenario?",
        "Is LTV calculation methodology standard (ARR ÷ churn rate)?",
        "Do status report bullets reference plausible departments (not invented orgs)?",
        "Are gross margin figures realistic for a SaaS business (~60-80%)?"
      ],
      "handoff": [
        "Could Octavio (EXEC-L05) include the unit-economics summary directly in his briefing?",
        "Is the risk log formatted so a decision-maker can act on it?",
        "Are blockers in the status report clear enough for Octavio to escalate?",
        "Does Imani flag any data gaps that would affect accuracy?",
        "Are all three deliverables named consistently?"
      ]
    }
  },
  {
    "id": "EXEC-L03-Atticus",
    "dept": "EXEC",
    "level": 3,
    "title": "Sr BizOps Analyst",
    "name": "Atticus",
    "timeBudgetMin": 25,
    "brief": "You are Atticus, a Senior BizOps Analyst. You own a full initiative end-to-end, not just a task. This cycle your charter is the company's first operating cadence review — a quarterly look at whether the company's internal meetings, reporting rhythms, and decision-making forums are working.\n\nYour day: conduct the cadence review and produce a clear output the Chief of Staff can act on.\n\n1. Audit the current meeting slate: assume the company runs a weekly all-hands, a monthly leadership review, two weekly stand-ups per functional team, and a quarterly board package process. For each, assess whether it's necessary, well-attended, and decision-oriented. Flag the 1-2 that look like waste.\n2. Draft a revised meeting architecture — a leaner version of the current slate. Justify each change (kill, consolidate, or keep) in one sentence.\n3. Write a recommendations memo (1 page max): state the problem, your 3 highest-impact changes, and the one change you'd implement this week if you had approval.\n\nYou are the most senior IC here. Your output should be opinionated, not both-sides. Octavio (EXEC-L05) will carry this forward.",
    "deliverables": [
      {
        "filename": "cadence-audit.md",
        "description": "Assessment of current meeting slate: necessity, attendance, decision-orientation; 1-2 flagged as waste"
      },
      {
        "filename": "revised-meeting-architecture.md",
        "description": "Leaner meeting slate with one-sentence justification per change (kill/consolidate/keep)"
      },
      {
        "filename": "cadence-recommendations-memo.md",
        "description": "1-page memo: problem statement, 3 high-impact changes, one immediate recommendation"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1111.00",
        "url": "https://www.onetonline.org/link/summary/13-1111.00",
        "quote": "Plan study of work problems and procedures, such as organizational change, communications, information flow, integrated production methods, inventory control, or cost analysis."
      },
      {
        "source": "O*NET",
        "code": "13-1111.00",
        "url": "https://www.onetonline.org/link/summary/13-1111.00",
        "quote": "Document findings of study and prepare recommendations for implementation of new systems, procedures, or organizational changes."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/management-analysts.htm",
        "quote": "Management analysts, often called management consultants, recommend ways to improve an organization's efficiency."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "EXEC-L05-Octavio"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the audit cover all five named meeting types?",
        "Are 1-2 meetings flagged as waste with reasoning?",
        "Does the revised architecture provide a one-sentence justification per change?",
        "Does the memo include a single named immediate recommendation?"
      ],
      "quality": [
        "Is the audit opinionated (does it pick a clear stance)?",
        "Does the revised architecture actually result in fewer total meetings?",
        "Is the memo problem statement crisp (1-2 sentences, not a preamble)?",
        "Are the 3 recommendations prioritized by impact, not just listed?",
        "Is the writing concise enough to fit the 1-page memo constraint?"
      ],
      "accuracy": [
        "Are the meeting types assessed plausible for a 100-person SaaS company?",
        "Do the waste flags have real operational justifications (not invented ones)?",
        "Is the recommended immediate change achievable within a week?",
        "Does the revised architecture maintain coverage of key decision forums?",
        "Are the 3 recommendations internally consistent (no contradictions)?"
      ],
      "handoff": [
        "Could Octavio (EXEC-L05) present the memo in a leadership meeting without editing?",
        "Is the revised meeting architecture formatted for easy comparison to the current slate?",
        "Are the recommendations specific enough for the Chief of Staff to act on immediately?",
        "Does Atticus flag any organizational dependencies that Octavio needs to manage?",
        "Is the immediate recommendation scoped to what Atticus actually has authority to recommend?"
      ]
    }
  },
  {
    "id": "EXEC-L04-Sunita",
    "dept": "EXEC",
    "level": 4,
    "title": "Strategic Initiatives Lead",
    "name": "Sunita",
    "timeBudgetMin": 35,
    "brief": "You are Sunita, Strategic Initiatives Lead. You operate across team boundaries, taking on high-priority projects that don't fit cleanly inside any one department. This cycle you own two cross-functional initiatives simultaneously.\n\nInitiative A — OKR alignment: the company just finished its quarterly OKR setting process, but three departments have OKRs that are either unmeasurable or contradict each other. You've been given the OKR outputs from Engineering, Sales, and Marketing (treat them as provided). Identify the conflicts and gaps, and write a short alignment brief that Octavio (EXEC-L05) can use to run a 30-minute alignment session.\n\nInitiative B — New tool evaluation: the company is considering adopting a business intelligence tool (pick one realistic option, e.g., Metabase, Looker, or Hex). You've been asked to scope the evaluation: produce a 1-page requirements list and a vendor comparison matrix with 3-4 criteria and two shortlisted tools.\n\nSunita's role requires you to coordinate without authority. Frame every output as something that helps others make decisions faster — not as a directive.",
    "deliverables": [
      {
        "filename": "okr-alignment-brief.md",
        "description": "Identified OKR conflicts and gaps across Eng/Sales/Marketing + facilitation guide for 30-min alignment session"
      },
      {
        "filename": "bi-tool-requirements.md",
        "description": "1-page requirements list for the BI tool evaluation: key use cases, must-haves, nice-to-haves"
      },
      {
        "filename": "bi-tool-vendor-matrix.md",
        "description": "Comparison matrix: 2 shortlisted tools × 3-4 evaluation criteria with scores and recommendation"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "13-1111.00",
        "url": "https://www.onetonline.org/link/summary/13-1111.00",
        "quote": "Confer with personnel concerned to ensure successful functioning of newly implemented systems or procedures."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Plan or direct activities, such as sales promotions, that require coordination with other department managers."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/business-and-financial/management-analysts.htm",
        "quote": "Management analysts, often called management consultants, recommend ways to improve an organization's efficiency."
      }
    ],
    "upstreamDeskIds": [],
    "downstreamDeskIds": [
      "EXEC-L05-Octavio"
    ],
    "rubric": {
      "completion": [
        "Are all three deliverables present?",
        "Does the OKR brief cover all three named departments (Eng, Sales, Marketing)?",
        "Are at least 2 concrete OKR conflicts or gaps identified?",
        "Does the BI requirements doc distinguish must-haves from nice-to-haves?",
        "Does the vendor matrix cover exactly 2 shortlisted tools and 3-4 criteria?"
      ],
      "quality": [
        "Does the OKR alignment brief give Octavio a runnable meeting structure?",
        "Are OKR conflicts specific (not 'goals are misaligned' generically)?",
        "Does the vendor matrix include a clear recommendation, not just scores?",
        "Are requirements grounded in real BizOps use cases (not generic BI needs)?",
        "Is all writing framed as enabling decisions, not as directives?"
      ],
      "accuracy": [
        "Are the OKR conflicts plausible for Eng/Sales/Marketing at this company stage?",
        "Are the named BI tools real products with the features cited?",
        "Do evaluation criteria map to actual BizOps workflow requirements?",
        "Is the recommended tool consistent with the matrix scores?",
        "Does the facilitation guide fit a 30-minute session realistically?"
      ],
      "handoff": [
        "Could Octavio (EXEC-L05) run the alignment session directly from the brief?",
        "Is the vendor matrix self-contained enough for a buy decision without follow-up?",
        "Are open questions or blockers in the OKR process flagged explicitly?",
        "Does Sunita note which departments she coordinated with vs. still needs to align?",
        "Are deliverable formats consistent with exec-level readability expectations?"
      ]
    }
  },
  {
    "id": "EXEC-L05-Octavio",
    "dept": "EXEC",
    "level": 5,
    "title": "Chief of Staff",
    "name": "Octavio",
    "timeBudgetMin": 35,
    "brief": "You are Octavio, Chief of Staff. Your four direct inputs arrived today: Roy's ops-metrics update and invoice review (L01), Imani's unit-economics analysis and Monday status report (L02), Atticus's cadence review (L03), and Sunita's OKR alignment brief and BI tool evaluation (L04). You consume their work and turn it into a coherent executive briefing package.\n\nYour day:\n\n1. Weekly exec briefing: a 1-page synthesis for Hannelore (Director of BizOps, EXEC-L06) that covers the most important signals from across all four upstream desks. What's on fire, what's on track, and one action item you're escalating.\n2. CEO agenda prep: the CEO has a 30-minute internal review meeting this week. Draft the agenda: 5-6 items with time allocations and the owner for each item. Pull from the upstream work to justify what's included.\n3. Decision log: identify 2-3 decisions that surfaced in the upstream work that are unresolved and need an owner. Write a brief decision log entry for each: what the decision is, who needs to make it, and when it needs to be resolved.\n4. Ops metrics commentary: pick the one metric from Roy's tracker that concerns you most and write 2-3 sentences explaining why and what you'd do about it.\n\nYou are the first synthesis tier. Your job is to compress signal, not amplify noise.",
    "deliverables": [
      {
        "filename": "weekly-exec-briefing.md",
        "description": "1-page synthesis for EXEC-L06: key signals from all four upstream desks, one escalated action"
      },
      {
        "filename": "ceo-agenda.md",
        "description": "Draft 30-min CEO meeting agenda: 5-6 items with time allocations and owners"
      },
      {
        "filename": "decision-log.md",
        "description": "2-3 unresolved decisions from upstream work: what, who owns it, when needed"
      },
      {
        "filename": "metrics-commentary.md",
        "description": "2-3 sentences on the most concerning metric from Roy's tracker + recommended response"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Review financial statements, sales or activity reports, or other performance data to measure productivity or goal achievement or to identify areas needing cost reduction or program improvement."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Establish or implement departmental policies, goals, objectives, or procedures in conjunction with board members, organization officials, or staff members."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "EXEC-L01-Roy",
      "EXEC-L02-Imani",
      "EXEC-L03-Atticus",
      "EXEC-L04-Sunita"
    ],
    "downstreamDeskIds": [
      "EXEC-L06-Hannelore"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the exec briefing reference signals from all four upstream desks?",
        "Does the CEO agenda have 5-6 items with time allocations and owners?",
        "Does the decision log contain 2-3 entries with what/who/when structure?",
        "Does the metrics commentary name a specific metric (not a vague one)?"
      ],
      "quality": [
        "Is the exec briefing scannable in under 3 minutes?",
        "Does the CEO agenda reflect real priorities (not a boilerplate list)?",
        "Are decision log entries specific enough to act on?",
        "Does the metrics commentary explain WHY it's concerning (not just that it changed)?",
        "Is the recommended response in the metrics commentary actionable?"
      ],
      "accuracy": [
        "Does Octavio correctly attribute each signal to the right upstream desk?",
        "Are time allocations in the CEO agenda realistic (sum to 30 minutes)?",
        "Are decision owners assigned to roles that plausibly hold that authority?",
        "Does the decision log reflect issues that actually surfaced in the upstream work?",
        "Is the escalated action item something that genuinely needs director attention?"
      ],
      "handoff": [
        "Could Hannelore (EXEC-L06) run a leadership review from the briefing alone?",
        "Is the CEO agenda ready to send as-is without reformatting?",
        "Are decision log owners named by role (not just 'someone in leadership')?",
        "Does Octavio connect Sunita's OKR alignment brief to the decision log?",
        "Could a peer Chief of Staff interpret and run from these deliverables?"
      ]
    }
  },
  {
    "id": "EXEC-L06-Hannelore",
    "dept": "EXEC",
    "level": 6,
    "title": "Director of BizOps",
    "name": "Hannelore",
    "timeBudgetMin": 35,
    "brief": "You are Hannelore, Director of Business Operations. You manage Octavio and his BizOps IC team. Today is a planning and people-management day — you received Octavio's weekly exec briefing and CEO agenda draft, and now you need to shape the week.\n\nYour day:\n\n1. 1:1 prep for Octavio: write your prep notes for your weekly 1:1 with Octavio. What will you probe on from the exec briefing? Is the CEO agenda draft the right shape? What feedback do you owe him? Format: 3-4 questions you'll ask, 1 thing you'll listen for, 1 piece of feedback.\n2. Team priorities memo: a short internal doc (half page) the BizOps team reads Monday morning. What are the top 3 priorities this week, what's deprioritized, and who owns what.\n3. Vendor escalation: Octavio flagged an invoice discrepancy (from Roy's work). Make the call: approve, dispute, or escalate to Finance? Write 2-3 sentences documenting your decision and reasoning.\n4. Headcount request: you believe you need a fifth BizOps IC next quarter. Write a 1-paragraph headcount justification you could send to Bashir (VP BizOps, EXEC-L07).\n\nYou manage a small team but report to a VP. Your outputs should reflect that middle position — you execute detail AND communicate up.",
    "deliverables": [
      {
        "filename": "1on1-prep-octavio.md",
        "description": "1:1 prep for Octavio: 3-4 questions, 1 listening intent, 1 feedback item"
      },
      {
        "filename": "team-priorities-memo.md",
        "description": "Half-page Monday priorities memo: top 3 priorities, deprioritized items, owners"
      },
      {
        "filename": "vendor-escalation-decision.md",
        "description": "2-3 sentence decision memo: approve/dispute/escalate invoice + documented rationale"
      },
      {
        "filename": "headcount-justification.md",
        "description": "1-paragraph headcount ask for VP: role, rationale, business impact"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Perform personnel functions, such as selection, training, or evaluation."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Direct and coordinate activities of businesses or departments concerned with the production, pricing, sales, or distribution of products."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "EXEC-L05-Octavio"
    ],
    "downstreamDeskIds": [
      "EXEC-L07-Bashir"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the 1:1 prep include 3-4 questions, a listening intent, and one feedback item?",
        "Does the team memo state top 3 priorities, deprioritized items, and owners?",
        "Is the vendor decision memo 2-3 sentences with a clear approve/dispute/escalate call?",
        "Is the headcount justification a single paragraph addressed to the VP?"
      ],
      "quality": [
        "Are the 1:1 questions probing (not yes/no or generic)?",
        "Does the team memo communicate what NOT to work on (not just what to do)?",
        "Is the vendor decision documented with reasoning (not just a label)?",
        "Does the headcount justification tie the role to a measurable business need?",
        "Is every piece of writing direct and written for a busy reader?"
      ],
      "accuracy": [
        "Do the 1:1 questions reference Octavio's actual upstream deliverables?",
        "Is the vendor escalation decision consistent with the discrepancy Roy flagged?",
        "Does the headcount ask reflect the team's realistic current load?",
        "Are priorities consistent with the signals in Octavio's exec briefing?",
        "Is the headcount ask scoped to next quarter (not immediate)?"
      ],
      "handoff": [
        "Could Bashir (EXEC-L07) use the headcount justification without additional context?",
        "Is the vendor decision self-contained for Finance's records?",
        "Does the team memo give Octavio enough context to run the week independently?",
        "Are the 1:1 prep notes specific enough for a follow-up if Hannelore is out?",
        "Does Hannelore connect the team priorities to Octavio's CEO agenda draft?"
      ]
    }
  },
  {
    "id": "EXEC-L07-Bashir",
    "dept": "EXEC",
    "level": 7,
    "title": "VP Business Operations",
    "name": "Bashir",
    "timeBudgetMin": 45,
    "brief": "You are Bashir, VP of Business Operations. You own the operational infrastructure of the company — how it runs day-to-day and how it plans. You have Hannelore as a direct report, and you sit one level below Petra (SVP Operations).\n\nThe company is four weeks from its annual planning cycle. This is your most important quarterly moment. Your day is planning-heavy.\n\n1. Annual planning framework: write a 2-page process document for how the company will run its annual planning cycle. Cover: timeline (working backward from board approval), who is responsible for each step, and what artifacts each team must produce. You are designing the process — not running it.\n2. Headcount review: Hannelore submitted a headcount justification for a fifth BizOps IC. Review it and write your approval decision: approve with conditions, defer, or deny. Two paragraphs — one on your reasoning, one on what Hannelore needs to do next.\n3. Operating rhythm audit: you suspect the monthly leadership review meeting is too long and too low-signal. Write a 3-bullet diagnosis and a proposed fix in 2-3 sentences.\n4. Cross-functional risk flag: identify one cross-functional risk (spanning at least two departments) that you've observed this quarter and escalate it to Petra (EXEC-L08) in a 1-paragraph briefing note.\n\nAt this level your deliverables shape how hundreds of people work. Design for clarity and durability.",
    "deliverables": [
      {
        "filename": "annual-planning-framework.md",
        "description": "2-page planning process document: timeline, owners, required artifacts per team"
      },
      {
        "filename": "headcount-decision.md",
        "description": "2-paragraph response to Hannelore's headcount ask: approval decision + next steps"
      },
      {
        "filename": "leadership-review-fix.md",
        "description": "3-bullet diagnosis of the monthly leadership review problem + 2-3 sentence proposed fix"
      },
      {
        "filename": "cross-fn-risk-escalation.md",
        "description": "1-paragraph cross-functional risk briefing note to EXEC-L08-Petra"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Establish or implement departmental policies, goals, objectives, or procedures in conjunction with board members, organization officials, or staff members."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Direct or coordinate financial or budget activities to fund operations, maximize investments, or increase efficiency."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "EXEC-L06-Hannelore"
    ],
    "downstreamDeskIds": [
      "EXEC-L08-Petra"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the annual planning framework cover timeline, owners, and required artifacts?",
        "Does the headcount decision include both a ruling and a next-steps paragraph?",
        "Does the leadership review diagnosis have exactly 3 bullets plus a fix?",
        "Is the cross-functional risk briefing addressed explicitly to EXEC-L08-Petra?"
      ],
      "quality": [
        "Does the planning framework work backward from a fixed board approval date?",
        "Is the headcount decision genuinely evaluative (not a rubber stamp)?",
        "Are the 3 diagnosis bullets specific to the leadership review (not generic meeting complaints)?",
        "Is the proposed fix for the leadership review actionable within 2 weeks?",
        "Is the risk escalation framed as something Petra needs to act on (not just FYI)?"
      ],
      "accuracy": [
        "Is the annual planning timeline realistic for a 100-person company (6-8 weeks typical)?",
        "Does the headcount decision respond to Hannelore's actual justification?",
        "Are the cross-functional departments named in the risk escalation plausible?",
        "Does the planning framework require the right artifact types (OKRs, budgets, headcount)?",
        "Is the leadership review fix consistent with Atticus's cadence audit upstream?"
      ],
      "handoff": [
        "Could Petra (EXEC-L08) use the risk escalation without requesting a follow-up call?",
        "Could Hannelore run the next step from the headcount decision without ambiguity?",
        "Could any department head follow the planning framework without Bashir's narration?",
        "Are owners in the planning framework named by role (not just 'team leads')?",
        "Does the leadership review fix give Hannelore a clear implementation instruction?"
      ]
    }
  },
  {
    "id": "EXEC-L08-Petra",
    "dept": "EXEC",
    "level": 8,
    "title": "SVP Operations",
    "name": "Petra",
    "timeBudgetMin": 45,
    "brief": "You are Petra, SVP of Operations. You report to Kwame (President, EXEC-L09). You received Bashir's cross-functional risk escalation and annual planning framework this morning. Now it's your job to elevate those inputs into department-level strategy and executive-tier outputs.\n\nYour day:\n\n1. Operational strategy memo: a 2-page strategy document for the Operations org for the next two quarters. Address: top operational priorities, 2-3 structural changes you're making (e.g., to team structure, tooling, or process), and the one bet you're not making (something you're consciously deprioritizing and why).\n2. Risk response: Bashir escalated a cross-functional risk. Assess it and decide: is this a BizOps problem, a leadership-team problem, or a structural problem? Write your classification and a 1-paragraph response plan.\n3. Hiring strategy for Operations: the company is growing and Ops needs two more senior hires in the next 6 months. Write a 1-page hiring brief: roles, rationale, and sequencing (which hire first and why).\n4. Peer-alignment note: you have peer SVPs in Engineering, Product, and Sales. Write a short (5-bullet) sync agenda for the monthly SVP roundtable. Include at least one item that requires a joint decision.\n\nYou own the operational fabric of the company. Your documents should reflect that scope.",
    "deliverables": [
      {
        "filename": "ops-strategy-memo.md",
        "description": "2-page Ops strategy for next two quarters: priorities, structural changes, one conscious deprioritization"
      },
      {
        "filename": "risk-response-plan.md",
        "description": "Risk classification (BizOps/leadership/structural) + 1-paragraph response plan"
      },
      {
        "filename": "ops-hiring-brief.md",
        "description": "1-page hiring brief: 2 senior roles, rationale, sequencing with justification"
      },
      {
        "filename": "svp-roundtable-agenda.md",
        "description": "5-bullet sync agenda for monthly SVP roundtable with one joint-decision item"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Direct and coordinate activities of businesses or departments concerned with the production, pricing, sales, or distribution of products."
      },
      {
        "source": "O*NET",
        "code": "11-1021.00",
        "url": "https://www.onetonline.org/link/summary/11-1021.00",
        "quote": "Monitor suppliers to ensure that they efficiently and effectively provide needed goods or services within budgetary limits."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "EXEC-L07-Bashir"
    ],
    "downstreamDeskIds": [
      "EXEC-L09-Kwame"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the ops strategy memo cover priorities, structural changes, AND a deprioritization?",
        "Does the risk response include a classification and a response plan?",
        "Does the hiring brief cover 2 roles with rationale and sequencing?",
        "Does the SVP roundtable agenda have exactly 5 bullets with one joint-decision item?"
      ],
      "quality": [
        "Is the deprioritization in the ops strategy memo explicitly justified (not just omitted)?",
        "Does the risk classification add value beyond restating the risk?",
        "Does the sequencing in the hiring brief explain why one role comes first?",
        "Is the joint-decision item in the roundtable agenda framed as a real choice to make?",
        "Is every document written at SVP level (strategic, not operational task lists)?"
      ],
      "accuracy": [
        "Does the ops strategy reflect Bashir's annual planning framework upstream?",
        "Does the risk response classify the risk using a defensible framework?",
        "Are the two senior Ops roles realistic for this company stage?",
        "Does the SVP agenda include at least one item from another function (not just Ops updates)?",
        "Are the structural changes in the ops strategy specific (not 'improve processes')?"
      ],
      "handoff": [
        "Could Kwame (EXEC-L09) present the ops strategy to the CEO from this document?",
        "Is the risk response plan actionable by the team named in the classification?",
        "Could a recruiter begin sourcing from the hiring brief without a follow-up call?",
        "Is the roundtable agenda formatted to circulate to peer SVPs as a pre-read?",
        "Does Petra's strategy memo set up the annual plan Bashir is running?"
      ]
    }
  },
  {
    "id": "EXEC-L09-Kwame",
    "dept": "EXEC",
    "level": 9,
    "title": "President",
    "name": "Kwame",
    "timeBudgetMin": 55,
    "brief": "You are Kwame, President. You report to Konstantin (CEO, EXEC-L10) and run the day-to-day of the business — GTM, Ops, and cross-functional execution. The company is four weeks from its annual board meeting. Petra (SVP Ops) sent you her strategy memo and hiring brief this morning. Finance (FIN-L10-Reginald) will deliver the board forecast to Konstantin shortly; your job is to make sure the operational narrative is board-ready.\n\nYour day:\n\n1. Operating plan narrative: a 2-page document for the board pre-read. Translate Petra's ops strategy and the company's operational state into a board-digestible story. Cover: what we shipped this year, where we fell short, and what we're betting on next year. This is a narrative, not a data dump.\n2. Cross-functional Q4 review: a 1-page document summarizing how the four major functions (Engineering, Sales, Operations, Finance) performed against plan this quarter. For each, one win, one miss, one forward implication.\n3. CEO prep brief: 4-6 bullets for Konstantin. What does he need to know before the board meeting? Include one thing the board will likely push on and how you'd suggest he respond.\n4. Org structure recommendation: you think one VP-level structural change is needed before the next fiscal year. Write a 1-paragraph recommendation to Konstantin — what to change, why, and the risk of not acting.\n\nYou are one degree from the board. Write accordingly.",
    "deliverables": [
      {
        "filename": "operating-plan-narrative.md",
        "description": "2-page board pre-read narrative: shipped, fell short, next year bet"
      },
      {
        "filename": "q4-cross-fn-review.md",
        "description": "1-page Q4 review: win/miss/forward implication for Eng, Sales, Ops, Finance"
      },
      {
        "filename": "ceo-prep-brief.md",
        "description": "4-6 bullet CEO prep: key signals + anticipated board pushback + suggested response"
      },
      {
        "filename": "org-structure-recommendation.md",
        "description": "1-paragraph VP-level structural change recommendation to Konstantin"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Confer with board members, organization officials, or staff members to discuss issues, coordinate activities, or resolve problems."
      },
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Analyze operations to evaluate performance of a company or its staff in meeting objectives or to determine areas of potential cost reduction, program improvement, or policy change."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "EXEC-L08-Petra"
    ],
    "downstreamDeskIds": [
      "EXEC-L10-Konstantin"
    ],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the operating plan narrative cover all three sections (shipped, fell short, next year)?",
        "Does the Q4 review cover all four functions with win/miss/forward structure?",
        "Does the CEO prep brief include an anticipated board pushback with a suggested response?",
        "Is the org structure recommendation scoped to a VP-level change?"
      ],
      "quality": [
        "Is the operating plan a narrative (not a bullet-list data dump)?",
        "Are the Q4 misses stated honestly (not euphemized)?",
        "Is the board pushback in the CEO prep brief genuinely difficult (not softball)?",
        "Is the org recommendation written as a recommendation (takes a stance)?",
        "Does every document reflect Kwame's role as the person who runs the business?"
      ],
      "accuracy": [
        "Does the operating plan narrative align with Petra's upstream ops strategy?",
        "Are the four function summaries in the Q4 review internally consistent?",
        "Does the CEO prep brief reference what FIN-L10-Reginald's forecast will likely show?",
        "Is the org structure change scoped to next fiscal year (not immediate)?",
        "Are 'shipped' and 'fell short' claims plausible for a 100-person SaaS company?"
      ],
      "handoff": [
        "Could Konstantin walk into the board meeting with only Kwame's CEO prep brief?",
        "Is the operating plan narrative ready to include in the board pre-read packet?",
        "Does the Q4 review give each function leader a clear signal on their standing?",
        "Could a board member ask 1-2 questions and have them answered by the narrative?",
        "Does the org recommendation give Konstantin enough context to decide in one conversation?"
      ]
    }
  },
  {
    "id": "EXEC-L10-Konstantin",
    "dept": "EXEC",
    "level": 10,
    "title": "Chief Executive Officer",
    "name": "Konstantin",
    "timeBudgetMin": 55,
    "brief": "You are Konstantin, Chief Executive Officer. You report to the board. The annual board meeting is in three weeks. Kwame (President, EXEC-L09) sent up his operating plan narrative, Q4 cross-functional review, and CEO prep brief this morning. FIN-L10-Reginald delivered the board forecast package, which includes annual revenue actuals, a three-year projection model, and a sensitivity analysis.\n\nThis is the highest-leverage week of your quarter. Everything you produce will be read by investors, board members, and senior leaders.\n\nYour day:\n\n1. CEO letter: a 1-page letter to the board — your voice, your framing. Where the company is, where it's going, and the one decision the board needs to make this cycle. Not a summary of slide 3. A letter.\n2. Board pre-read package cover: a 1-page executive overview that frames the full board package. Readers include board members who have 5 minutes. Give them: the key number, the key bet, and the key risk. Nothing else.\n3. Annual company priorities: 3-5 priorities for the coming year, stated with enough clarity that every department can derive their OKRs from them. Not 'grow revenue' — something a VP can operationalize.\n4. Capital allocation signal: Reginald's forecast shows three investment scenarios (conservative, base, aggressive). Write 1 page stating which scenario you are committing to, why, and what you are explicitly trading off to fund it.\n\nAt this level, your writing IS the company's decision-making apparatus. Every sentence has institutional weight.",
    "deliverables": [
      {
        "filename": "ceo-board-letter.md",
        "description": "1-page CEO letter to the board: company state, direction, one decision the board must make"
      },
      {
        "filename": "board-pre-read-cover.md",
        "description": "1-page executive overview: key number, key bet, key risk — nothing else"
      },
      {
        "filename": "annual-company-priorities.md",
        "description": "3-5 operationalizable company priorities for the coming year"
      },
      {
        "filename": "capital-allocation-decision.md",
        "description": "1-page capital allocation commitment: chosen scenario, rationale, explicit trade-offs"
      }
    ],
    "citations": [
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Direct, plan, or implement policies, objectives, or activities of organizations or businesses to ensure continuing operations, to maximize returns on investments, or to increase productivity."
      },
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Prepare or present reports concerning activities, expenses, budgets, government statutes or rulings, or other items affecting businesses or program services."
      },
      {
        "source": "O*NET",
        "code": "11-1011.00",
        "url": "https://www.onetonline.org/link/summary/11-1011.00",
        "quote": "Confer with board members, organization officials, or staff members to discuss issues, coordinate activities, or resolve problems."
      },
      {
        "source": "BLS OOH",
        "url": "https://www.bls.gov/ooh/management/top-executives.htm",
        "quote": "Top executives plan strategies and policies to ensure that an organization meets its goals."
      }
    ],
    "upstreamDeskIds": [
      "EXEC-L09-Kwame",
      "FIN-L10-Reginald"
    ],
    "downstreamDeskIds": [],
    "rubric": {
      "completion": [
        "Are all four deliverables present?",
        "Does the CEO letter name ONE decision the board must make (not a list)?",
        "Does the board pre-read cover contain exactly three elements: key number, key bet, key risk?",
        "Are 3-5 annual priorities stated (not more, not fewer)?",
        "Does the capital allocation decision name the chosen scenario and its trade-offs?"
      ],
      "quality": [
        "Is the CEO letter in a distinctive voice (not a formatted report)?",
        "Does the board pre-read cover fit on one page with room to breathe?",
        "Are the annual priorities operationalizable by a VP (specific enough to write OKRs from)?",
        "Does the capital allocation decision acknowledge what is being sacrificed (not just what is gained)?",
        "Is every document suitable for an audience that has 5 minutes, not 50?"
      ],
      "accuracy": [
        "Does the CEO letter reflect Kwame's operating narrative upstream?",
        "Does the capital allocation decision engage with Reginald's (FIN-L10) three scenarios?",
        "Are the annual priorities consistent with the company's stage (100-person SaaS)?",
        "Is the key risk in the board pre-read cover grounded in the Q4 cross-fn review?",
        "Are trade-offs in the capital decision realistic (not hypothetical)?",
        "Does the board pre-read reference real financial data from FIN-L10-Reginald's forecast?"
      ],
      "handoff": [
        "Could the board chair open the meeting from the CEO letter alone?",
        "Could each VP derive their annual OKRs from the company priorities without clarification?",
        "Could the CFO model next year's budget from the capital allocation decision?",
        "Does the board pre-read cover give a first-time board member the essential context?",
        "Could Kwame run the company for 2 weeks from the annual priorities if Konstantin were unavailable?"
      ]
    }
  }
];

/** Unique department codes, in canonical order. */
export const DEPT_CODES = [
  "ENG", "PROD", "DES", "SALES", "MKT", "CS", "FIN", "HR", "LEGOPS", "EXEC",
] as const;
export type DeptCode = typeof DEPT_CODES[number];

/** Map from department folder name → DEPT code. */
export const FOLDER_TO_DEPT: Record<string, DeptCode> = {
  "engineering": "ENG",
  "product": "PROD",
  "design": "DES",
  "sales": "SALES",
  "marketing": "MKT",
  "customer-success": "CS",
  "finance": "FIN",
  "hr": "HR",
  "legal-ops": "LEGOPS",
  "executive": "EXEC",
};
