---
name: deliverable
description: >
  Produce real files (.docx, .xlsx, .pdf, .pptx, .png, .csv) as client-
  visible deliverables, not markdown. Use this skill ANY time your work
  output will be seen by a non-technical client or reader. Covers the
  scratch-vs-deliverable distinction, inline Python recipes for the two
  most common formats (Word + Excel), and how to promote a produced file
  to the Doer Deliverables table so it shows up in Fernweh and the client
  Portal.
---

# Deliverable Skill

## The rule

Clients expect **files** — the kind they open in Word, Excel, Preview, or Keynote. They do NOT want markdown. Markdown is for scratch, planning, and inter-agent communication. Any output a human client will see needs to be a real file in an industry-standard format.

| Audience | Output |
|---|---|
| Other agents, internal notes, planning | `.md` is fine — keep it in your workspace |
| A human client, a reader outside Doer | Produce a real file: `.docx` / `.xlsx` / `.pdf` / `.pptx` / `.csv` / `.png` |

If you're unsure, default to a file. Producing a client-facing deliverable as markdown is treated as a correctness bug.

## When this skill activates

- You've been asked to write a report, brief, proposal, summary, analysis, executive memo, or any other client-visible prose → **produce a `.docx`**.
- You've been asked to build a tracker, roster, ledger, spreadsheet, budget, forecast, metrics snapshot, or table → **produce an `.xlsx`**.
- You've been asked to produce a presentation or deck → **produce a `.pptx`**.
- You've been asked to extract data for a client download → **produce a `.csv`**.
- You've been asked to show a chart, diagram, or visualization inline → **produce a `.png`** (plus the raw data as `.csv` if useful).

## Produce the file

Your workspace has Python. Install format-specific libraries if missing:

```bash
pip install --break-system-packages python-docx openpyxl
```

### Word (`.docx`) — the `python-docx` recipe

```python
from docx import Document
from docx.shared import Pt

doc = Document()

# Title
h = doc.add_heading("Q4 Strategy Brief — Acme Corp", level=1)

# Body paragraph
p = doc.add_paragraph(
    "Executive summary. One to three sentences setting context and "
    "what's being asked of the reader."
)
for run in p.runs:
    run.font.size = Pt(11)

doc.add_heading("Three Strategic Initiatives", level=2)

# Bulleted list
for item in [
    "Initiative one — the what, the why, and the owner.",
    "Initiative two — the what, the why, and the owner.",
    "Initiative three — the what, the why, and the owner.",
]:
    doc.add_paragraph(item, style="List Bullet")

doc.add_heading("Next Steps", level=2)
doc.add_paragraph("Owner. Action. When. Success criteria.")

doc.save("/tmp/q4-strategy-brief.docx")
```

Notes: use `add_heading` for section breaks, `add_paragraph` for body, `style="List Bullet"` / `"List Number"` for lists. For tables use `doc.add_table(rows=1, cols=3)` + `.cell(row, col).text = "..."`. Keep fonts defaulting to Calibri 11 unless the client specifies a brand stack.

### Excel (`.xlsx`) — the `openpyxl` recipe

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

wb = Workbook()
ws = wb.active
ws.title = "Agent Roster"

# Header row
headers = ["Agent", "Role", "Status", "Last Heartbeat", "Budget Used"]
for col_idx, header in enumerate(headers, start=1):
    cell = ws.cell(row=1, column=col_idx, value=header)
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor="1F2937")
    cell.alignment = Alignment(horizontal="center")

# Data rows
rows = [
    ["Alex the Architect", "Engineer", "Running", "2m ago", "42%"],
    ["Priya the PM", "PM", "Idle", "1h ago", "18%"],
    ["Sam the Strategist", "CEO", "Active", "just now", "7%"],
]
for row_idx, row in enumerate(rows, start=2):
    for col_idx, val in enumerate(row, start=1):
        ws.cell(row=row_idx, column=col_idx, value=val)

# Auto-size columns (approximate — openpyxl doesn't do real autosize)
for col_idx, header in enumerate(headers, start=1):
    col_letter = get_column_letter(col_idx)
    max_len = max(len(str(header)), *(len(str(r[col_idx - 1])) for r in rows))
    ws.column_dimensions[col_letter].width = max_len + 4

# Freeze header
ws.freeze_panes = "A2"

wb.save("/tmp/agent-roster.xlsx")
```

Notes: `ws.column_dimensions["A"].width = 20` for manual widths. Use multiple sheets via `wb.create_sheet("name")`. For number formatting: `cell.number_format = "$#,##0.00"`. For charts see `openpyxl.chart`.

### Other formats (brief)

- **`.pdf`** — use `reportlab` (`pip install reportlab`). Simpler path: produce `.docx` then use `libreoffice --headless --convert-to pdf` if available. Produce `.pdf` directly only when layout fidelity matters.
- **`.pptx`** — use `python-pptx` (`pip install python-pptx`). Create slides with `prs.slides.add_slide(layout)`; add text via `slide.shapes.title.text = "..."` and `slide.placeholders[1].text = "..."`.
- **`.csv`** — standard library `csv.writer` is fine. Add UTF-8 BOM if Excel will read it: `open("file.csv", "w", encoding="utf-8-sig")`.
- **`.png`** charts — use `matplotlib` (`plt.savefig("/tmp/chart.png", dpi=144, bbox_inches="tight")`).

## Promote the file to a Deliverable

Once the file exists on disk, POST it to the Deliverables endpoint so it shows up in Fernweh and becomes shareable via the client Portal.

```bash
FILE_PATH="/tmp/q4-strategy-brief.docx"
KIND="docx"
FILENAME="Q4-Strategy-Brief.docx"
TITLE="Q4 Strategy Brief — Acme Corp"
DESCRIPTION="Executive summary plus three strategic initiatives."

# If your wake context has a DOER_TASK_ID (issue that triggered you),
# attach this deliverable to that issue for traceability.
ISSUE_ID_ARG=""
if [ -n "$DOER_TASK_ID" ]; then
  ISSUE_ID_ARG="-F issueId=$DOER_TASK_ID"
fi

curl -X POST "$DOER_API_URL/api/companies/$DOER_COMPANY_ID/deliverables" \
  -H "Authorization: Bearer $DOER_API_KEY" \
  -H "X-Doer-Run-Id: $DOER_RUN_ID" \
  -F "file=@$FILE_PATH;type=application/octet-stream" \
  -F "kind=$KIND" \
  -F "filename=$FILENAME" \
  -F "title=$TITLE" \
  -F "description=$DESCRIPTION" \
  $ISSUE_ID_ARG
```

On success you'll get back JSON with the created deliverable (`id`, `storagePath`, `clientVisible: false`, etc.). The file is now stored in Doer's object store with a SHA-256 checksum and will appear in Fernweh → Deliverables.

### Fields you control

| Field | Required | Notes |
|---|---|---|
| `file` | yes | Multipart binary. 50 MB cap. |
| `kind` | yes | `docx` \| `xlsx` \| `pdf` \| `pptx` \| `md` \| `png` \| `jpg` \| `csv` \| `html` \| `json` \| `other` |
| `filename` | yes | What the client sees when they download. Keep it human: `Q4-Brief.docx`, not `q4brief.docx`. |
| `title` | yes | Title shown in Fernweh and Portal. Differ from filename when helpful — e.g. filename `weekly-brief-2026-04-23.docx`, title `Weekly Ops Brief — 2026-04-23`. |
| `description` | no | One or two sentences describing what the file contains. Shown as card subtitle. |
| `projectId` | no | Link to a project. Fernweh groups deliverables under Projects. |
| `issueId` | no | Link to the issue that produced the work. Pull from `DOER_TASK_ID` when available. |
| `routineRunId` | no | For scheduled routine output — attach the run id. |
| `metadata` | no | JSON string. Free-form: `{"template":"quarterly-brief","version":"2026-q4"}`. |

### Fields you do NOT control

- `storagePath`, `contentType`, `sizeBytes`, `checksumSha256` — server-assigned from the upload.
- `clientVisible` — defaults `false`. A human (Clay / team) flips it to true in Fernweh before any client sees it. Opt-in is deliberate.
- `producedByAgentId`, `producedByRunId` — server pulls from your run JWT.

### Idempotency

The server enforces a unique `storage_path` per deliverable. If you call the endpoint twice with the same file content, the second call gets a new `id` and a new storage key — it's a new deliverable row, not a duplicate. If you want to update an existing deliverable's file, soft-delete the old one (`DELETE /api/deliverables/:id`) and create a new one; in-place content updates aren't supported in v1.

## What NOT to do

- ❌ Return the report as inline markdown in an issue comment and call it a deliverable.
- ❌ Save the file to `/tmp` and never POST it — it won't show up anywhere.
- ❌ Use `application/octet-stream` as a kind. Use the specific kind; the server sets content-type.
- ❌ Upload a `.md` file as a client deliverable unless the client specifically asked for markdown source (rare).
- ❌ Flip `clientVisible: true` yourself via `PATCH`. That's a human call.
- ❌ Post the same file multiple times hoping one will "stick" — each call creates a new row.

## If something fails

- **400 Invalid metadata** — check `kind` is in the enum list.
- **413 / "File exceeds 50 MB bytes"** — too large. Trim, or split into multiple deliverables.
- **401 / 403** — your run JWT is missing or the `companyId` doesn't match your agent's company. Check `DOER_API_KEY` and `DOER_COMPANY_ID`.
- **500** — server issue. Leave a blocked-status comment on the triggering issue and exit the heartbeat. Don't retry silently.

## Recap — the three-line form

1. Write the file on disk with the right library (`python-docx`, `openpyxl`, `reportlab`, `python-pptx`, etc.).
2. `curl -F file=@path …` to `POST /api/companies/$DOER_COMPANY_ID/deliverables` with `kind`, `filename`, `title`, and (when available) `issueId` / `projectId`.
3. Tell the human in an issue comment: "Deliverable `<title>` is ready in Fernweh; `clientVisible` defaults off until you flip it."

Markdown is for us. Files are for them.
