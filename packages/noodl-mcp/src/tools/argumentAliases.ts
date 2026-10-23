/**
 * P112 OWN-026 FIX-04 C — the spellings a model reaches for, taken as the call they mean.
 *
 * `refuseUnknownArguments` refuses a key a tool does not have, and names the one it meant (`didYouMean`). That is
 * right for a key that could mean several things. For the few below it is a turn spent on spelling: the meaning is
 * not in doubt, and the next call always sends the right name. Refused calls in t2-nodegx-c01…c03, by the server's
 * own message: `get_node_type` 11 of 26 (`typeName` ×3, `node_type` ×3, `nodeType`, `ports: true` ×2,
 * `detail: "brief"`, nine names past the cap), `drive_page`'s `wait_for: { text_contains }` 7, `search_project`'s
 * `query` 1.
 *
 * Each entry rewrites the arguments as sent, before the unknown-key check and the schema, on both doors (the SDK's
 * `validateToolInput` and `call_tool`'s own parse). A rename happens only when the real name is absent, so a call
 * that sends both is still refused for the extra key. Nothing here guesses: every alias means exactly the argument
 * it becomes.
 */

type Args = Record<string, unknown>;

const isRecord = (v: unknown): v is Args => !!v && typeof v === 'object' && !Array.isArray(v);

/** `from` → `to` for each alias, when `to` is not already there. */
function rename(args: Args, to: string, from: readonly string[]): Args {
  if (to in args) return args;
  const alias = from.find((key) => key in args);
  if (!alias) return args;
  const { [alias]: value, ...rest } = args;
  return { ...rest, [to]: value };
}

const NODE_TYPE_NAME_ALIASES = [
  'typeName',
  'typeNames',
  'type_name',
  'node_type',
  'nodeType',
  'node_types',
  'nodeTypes',
  'types',
  'type',
  'names',
  'name'
] as const;

const DETAIL_ALIASES: Record<string, 'summary' | 'full'> = {
  brief: 'summary',
  short: 'summary',
  compact: 'summary',
  ports: 'summary',
  complete: 'full',
  all: 'full',
  verbose: 'full',
  long: 'full',
  detailed: 'full'
};

function getNodeType(args: Args): Args {
  let out = rename(args, 'type_names', NODE_TYPE_NAME_ALIASES);
  if (typeof out.type_names === 'string') {
    // `"Group"`, or `"Group, Text"` — a list written as one string.
    const names = out.type_names
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    out = { ...out, type_names: names };
  }
  if (typeof out.detail === 'string' && DETAIL_ALIASES[out.detail.toLowerCase()]) {
    out = { ...out, detail: DETAIL_ALIASES[out.detail.toLowerCase()] };
  }
  // `ports: true` means "show me the ports", which the default answer already is (every port, one line each).
  if (typeof out.ports === 'boolean') {
    const { ports: _ports, ...rest } = out;
    out = rest;
  }
  return out;
}

/** `wait_for: { text_contains }` — a target's spelling; `wait_for.text` already matches part of the page's text. */
function drivePage(args: Args): Args {
  if (!Array.isArray(args.steps)) return args;
  let changed = false;
  const steps = args.steps.map((step) => {
    if (!isRecord(step) || !isRecord(step.wait_for)) return step;
    const wait = step.wait_for;
    if (typeof wait.text_contains !== 'string' || 'text' in wait) return step;
    changed = true;
    const { text_contains, ...rest } = wait;
    return { ...step, wait_for: { ...rest, text: text_contains } };
  });
  return changed ? { ...args, steps } : args;
}

const ALIASES: Record<string, (args: Args) => Args> = {
  get_node_type: getNodeType,
  drive_page: drivePage,
  search_project: (args) => rename(args, 'text', ['query'])
};

/** The arguments as the tool spells them. Anything not in the table comes back as it was sent. */
export function normalizeArguments(tool: string, args: unknown): unknown {
  const fix = ALIASES[tool];
  if (!fix || !isRecord(args)) return args;
  return fix(args);
}
