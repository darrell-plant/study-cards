// normalize.test.js

function normalizeDeckTop(text, defaultName = "Example") {
  // 1) strip all leading whitespace/newlines
  text = text.replace(/^\s+/, "");

  // 2) ensure NAME header exists (case-insensitive, tolerate weird spacing)
  const m = text.match(/^(?:NAME\s*:\s*)([^\r\n]*)/im);
  if (m) {
    const name = m[1].trim();
    text = text.replace(/^(?:NAME\s*:\s*)(.*)/im, `NAME: ${name}`);
  } else {
    text = `NAME: ${defaultName}\n\n` + text;
  }

  // 3) normalize to exactly ONE empty line after the header
  text = text.replace(/^(NAME:.*?)(\r?\n\s*)+/, "$1\n\n");

  return text;
}

// --- Test cases
const EOL = "\n";
const cases = [
  {
    name: "Header + no blank line",
    input: `NAME: aaa${EOL}ありがとうございます${EOL}Thank you`,
    expected: `NAME: aaa${EOL}${EOL}ありがとうございます${EOL}Thank you`,
  },
  {
    name: "Header + one blank line",
    input: `NAME: aaa${EOL}${EOL}ありがとうございます${EOL}Thank you`,
    expected: `NAME: aaa${EOL}${EOL}ありがとうございます${EOL}Thank you`,
  },
  {
    name: "Header + many blank lines (and spaces)",
    input: `NAME: aaa${EOL}${EOL}   ${EOL}${EOL}ありがとうございます${EOL}Thank you`,
    expected: `NAME: aaa${EOL}${EOL}ありがとうございます${EOL}Thank you`,
  },
  {
    name: "No header, leading whitespace",
    input: `${EOL}  ${EOL}ありがとうございます${EOL}Thank you`,
    expected: `NAME: Example${EOL}${EOL}ありがとうございます${EOL}Thank you`,
  },
  {
    name: "Header weird spacing + case",
    input: `  name  :   GreEtInGs${EOL}${EOL}ありがとうございます${EOL}Thank you`,
    expected: `NAME: GreEtInGs${EOL}${EOL}ありがとうございます${EOL}Thank you`,
  },
  {
    name: "CRLF input",
    input: `NAME: test\r\n\r\nありがとうございます\r\nThank you\r\n`,
    expected: `NAME: test${EOL}${EOL}ありがとうございます\r\nThank you\r\n`,
  },
];

// --- Runner
function run() {
  let pass = 0;
  for (const c of cases) {
    const out = normalizeDeckTop(c.input);
    const ok = out === c.expected;
    if (ok) pass++;
    console.log(`\n=== ${c.name} ===`);
    console.log("Input:\n" + visualize(c.input));
    console.log("Output:\n" + visualize(out));
    console.log(ok ? "✅ PASS" : "❌ FAIL");
    if (!ok) {
      console.log("Expected:\n" + visualize(c.expected));
    }
  }
  console.log(`\n${pass}/${cases.length} tests passed`);
}

function visualize(s) {
  // Show EOLs and spaces visibly for easier diffing
  return s
    .replace(/\r\n/g, "␍␊\n")
    .replace(/\n/g, "␊\n")
    .replace(/ /g, "·");
}

run();