import { escapeHtml } from "./escapeHtml.js";

export function documentShell({ title, theme = "light", styles, body, script }) {
  const documentTheme = theme === "dark" ? "dark" : "light";

  return `<!DOCTYPE html>
<html lang="en" data-theme="${documentTheme}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${styles}</style>
</head>
<body>
${body}
<script>${script}</script>
</body>
</html>
`;
}
