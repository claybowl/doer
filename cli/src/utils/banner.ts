import pc from "picocolors";

// DOER — green D, cyan gear-O, blue "er" (brand gradient)
const DOER_D = [
  "██████╗ ",
  "██╔══██╗",
  "██║  ██║",
  "██║  ██║",
  "██████╔╝",
  "╚═════╝ ",
] as const;

const DOER_O = [
  " ██████╗ ",
  "██╔═══██╗",
  "██║ ¤ ██║",
  "██║   ██║",
  "╚██████╔╝",
  " ╚═════╝ ",
] as const;

const DOER_ER = [
  "███████╗██████╗ ",
  "██╔════╝██╔══██╗",
  "█████╗  ██████╔╝",
  "██╔══╝  ██╔══██╗",
  "███████╗██║  ██║",
  "╚══════╝╚═╝  ╚═╝",
] as const;

const TAGLINE = "Build to last. Progress to stay.";

export function printPaperclipCliBanner(): void {
  const lines = [
    "",
    ...DOER_D.map((d, i) => pc.green(d) + pc.cyan(DOER_O[i]) + pc.blue(DOER_ER[i])),
    pc.blue("  ─────────────────────────────────"),
    pc.bold(pc.white(`  ${TAGLINE}`)),
    "",
  ];

  console.log(lines.join("\n"));
}
