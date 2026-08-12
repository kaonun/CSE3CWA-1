// Embedding JSON.stringify output directly inside an inline <script> tag is
// unsafe if the source data contains "</script" — it would prematurely close
// the tag and let arbitrary markup/script run. Escaping every "<" defeats
// that regardless of what the teacher typed into English word.
export function safeJsonForScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
