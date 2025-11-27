// Simple logger that prefixes ISO timestamps and writes directly to stdout/stderr
// to keep logs flushed immediately.
function timestamp() {
  return new Date().toISOString();
}

function format(args) {
  return args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
}

function info(...args) {
  process.stdout.write(`[${timestamp()}] ${format(args)}\n`);
}

function error(...args) {
  process.stderr.write(`[${timestamp()}] ${format(args)}\n`);
}

module.exports = { info, error };
