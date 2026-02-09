#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

// ── ANSI Colors ──
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgYellow: "\x1b[43m",
  black: "\x1b[30m",
};

const isTTY = process.stdout.isTTY;

function paint(color: string, text: string): string {
  return isTTY ? `${color}${text}${c.reset}` : text;
}

// ── Help ──
function showHelp(): void {
  console.log(`
${paint(c.bgYellow + c.black + c.bold, " ai-comment ")} ${paint(c.dim, "v1.0.0")}

${paint(c.bold, "Auto-generate JSDoc comments for TypeScript/JavaScript functions.")}

${paint(c.yellow, "USAGE")}
  ai-comment <file-or-dir> [options]

${paint(c.yellow, "ARGUMENTS")}
  ${paint(c.green, "<file-or-dir>")}   File or directory to process

${paint(c.yellow, "OPTIONS")}
  ${paint(c.cyan, "--jsdoc-only")}     Only add JSDoc to functions (skip file headers)
  ${paint(c.cyan, "--style <s>")}      Comment style: terse or detailed (default: detailed)
  ${paint(c.cyan, "--dry-run")}        Preview changes without writing files
  ${paint(c.cyan, "--recursive")}      Process directories recursively (default: true)
  ${paint(c.cyan, "--ext <exts>")}     File extensions to process (default: ts,tsx,js,jsx)
  ${paint(c.cyan, "--json")}           Output results as JSON
  ${paint(c.cyan, "--help")}           Show this help message

${paint(c.yellow, "FEATURES")}
  - Detects function declarations, arrow functions, and class methods
  - Extracts parameter names, types, and return types from TypeScript
  - Generates @param, @returns, @throws tags
  - Preserves existing JSDoc comments (won't overwrite)
  - Supports async functions and generator functions
  - Handles default parameter values
  - Works with TypeScript generics

${paint(c.yellow, "EXAMPLES")}
  ${paint(c.dim, "# Add JSDoc to a single file")}
  ai-comment src/utils.ts

  ${paint(c.dim, "# Process entire directory")}
  ai-comment src/

  ${paint(c.dim, "# Terse style (shorter comments)")}
  ai-comment src/utils.ts --style terse

  ${paint(c.dim, "# Dry run to preview")}
  ai-comment src/ --dry-run

  ${paint(c.dim, "# Only specific extensions")}
  ai-comment lib/ --ext js,jsx

${paint(c.dim, "Built by LXGIC Studios")} ${paint(c.blue, "https://github.com/lxgicstudios/ai-comment")}
`);
}

// ── Types ──
interface FunctionInfo {
  name: string;
  params: ParamInfo[];
  returnType: string;
  isAsync: boolean;
  isGenerator: boolean;
  isExported: boolean;
  isStatic: boolean;
  className?: string;
  generics?: string;
  lineNumber: number;
  hasExistingComment: boolean;
}

interface ParamInfo {
  name: string;
  type: string;
  defaultValue?: string;
  isOptional: boolean;
  isRest: boolean;
  destructured?: string;
}

interface ProcessResult {
  file: string;
  functions: number;
  commented: number;
  skipped: number;
}

// ── Function Detection ──
function parseFunctions(source: string): FunctionInfo[] {
  const lines = source.split("\n");
  const functions: FunctionInfo[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments, imports, empty lines
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") ||
        trimmed.startsWith("import ") || trimmed.startsWith("export type") ||
        trimmed.startsWith("export interface") || trimmed === "") {
      continue;
    }

    // Check if previous line(s) have a JSDoc comment
    const hasExistingComment = checkExistingComment(lines, i);

    let funcInfo: FunctionInfo | null = null;

    // Regular function declaration
    // export async function name<T>(params): ReturnType {
    funcInfo = parseRegularFunction(trimmed, i);

    // Arrow function assigned to const/let/var
    // export const name = async (params): ReturnType => {
    if (!funcInfo) {
      funcInfo = parseArrowFunction(trimmed, lines, i);
    }

    // Class method
    // async methodName(params): ReturnType {
    // static methodName(params): ReturnType {
    // public methodName(params): ReturnType {
    if (!funcInfo) {
      funcInfo = parseClassMethod(trimmed, i);
    }

    if (funcInfo) {
      funcInfo.hasExistingComment = hasExistingComment;
      functions.push(funcInfo);
    }
  }

  return functions;
}

function checkExistingComment(lines: string[], lineIdx: number): boolean {
  // Look backwards for JSDoc ending with */
  for (let i = lineIdx - 1; i >= Math.max(0, lineIdx - 20); i--) {
    const trimmed = lines[i].trim();
    if (trimmed === "") continue;
    if (trimmed.endsWith("*/") || trimmed.startsWith("/**") || trimmed.startsWith("* ") || trimmed === "*") {
      return true;
    }
    // If we hit a non-comment non-empty line, stop
    if (!trimmed.startsWith("//") && !trimmed.startsWith("/*") && !trimmed.startsWith("*") && !trimmed.startsWith("@")) {
      break;
    }
  }
  return false;
}

function parseRegularFunction(line: string, lineNumber: number): FunctionInfo | null {
  // Match: (export)? (async)? function* ?name<generics>(params): returnType
  const regex = /^(export\s+)?(default\s+)?(async\s+)?function\s*(\*)?\s*(\w+)?\s*(<[^>]+>)?\s*\(([^)]*)\)\s*(?::\s*([^{]+?))?\s*\{?/;
  const match = line.match(regex);
  if (!match) return null;

  const [, exportPart, , asyncPart, generatorStar, name, generics, paramsStr, returnType] = match;

  return {
    name: name || "anonymous",
    params: parseParams(paramsStr || ""),
    returnType: cleanType(returnType || inferReturnType(asyncPart, generatorStar)),
    isAsync: !!asyncPart,
    isGenerator: !!generatorStar,
    isExported: !!exportPart,
    isStatic: false,
    generics: generics?.trim(),
    lineNumber: lineNumber + 1,
    hasExistingComment: false,
  };
}

function parseArrowFunction(line: string, lines: string[], lineNumber: number): FunctionInfo | null {
  // Match: (export)? (const|let|var) name(: type)? = (async)? (params): returnType =>
  const regex = /^(export\s+)?(const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(async\s+)?\(?([^)]*?)\)?\s*(?::\s*([^=>{]+?))?\s*=>/;
  const match = line.match(regex);
  if (!match) return null;

  const [, exportPart, , name, asyncPart, paramsStr, returnType] = match;

  // Skip if it looks like a simple value assignment
  if (!line.includes("=>")) return null;

  return {
    name,
    params: parseParams(paramsStr || ""),
    returnType: cleanType(returnType || inferReturnType(asyncPart)),
    isAsync: !!asyncPart,
    isGenerator: false,
    isExported: !!exportPart,
    isStatic: false,
    lineNumber: lineNumber + 1,
    hasExistingComment: false,
  };
}

function parseClassMethod(line: string, lineNumber: number): FunctionInfo | null {
  // Match: (public|private|protected)? (static)? (async)? methodName(params): returnType {
  const regex = /^(public|private|protected)?\s*(static)?\s*(async)?\s*(get|set)?\s*(\w+)\s*(<[^>]+>)?\s*\(([^)]*)\)\s*(?::\s*([^{]+?))?\s*\{?/;
  const match = line.match(regex);
  if (!match) return null;

  const [, visibility, staticPart, asyncPart, getSet, name, generics, paramsStr, returnType] = match;

  // Skip constructor detection since that's typically obvious
  // Skip if it looks like a function call (no visibility, no async, etc)
  if (!visibility && !staticPart && !asyncPart && !getSet) {
    // It might be just a function call, need at least opening brace on same line
    if (!line.trim().endsWith("{")) return null;
  }

  // Skip common non-method patterns
  if (["if", "for", "while", "switch", "catch", "constructor"].includes(name)) return null;

  return {
    name: getSet ? `${getSet} ${name}` : name,
    params: parseParams(paramsStr || ""),
    returnType: cleanType(returnType || inferReturnType(asyncPart)),
    isAsync: !!asyncPart,
    isGenerator: false,
    isExported: false,
    isStatic: !!staticPart,
    generics: generics?.trim(),
    lineNumber: lineNumber + 1,
    hasExistingComment: false,
  };
}

function parseParams(paramsStr: string): ParamInfo[] {
  if (!paramsStr.trim()) return [];

  const params: ParamInfo[] = [];
  let depth = 0;
  let current = "";

  // Split by comma, respecting nested brackets
  for (const ch of paramsStr) {
    if (ch === "(" || ch === "<" || ch === "{" || ch === "[") depth++;
    if (ch === ")" || ch === ">" || ch === "}" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      params.push(parseOneParam(current.trim()));
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    params.push(parseOneParam(current.trim()));
  }

  return params;
}

function parseOneParam(param: string): ParamInfo {
  const isRest = param.startsWith("...");
  if (isRest) param = param.slice(3);

  // Check for destructured params: { a, b }: Type
  const destructuredMatch = param.match(/^(\{[^}]+\}|\[[^\]]+\])\s*(?::\s*(.+?))?(?:\s*=\s*(.+))?$/);
  if (destructuredMatch) {
    return {
      name: "options",
      type: cleanType(destructuredMatch[2] || "object"),
      defaultValue: destructuredMatch[3]?.trim(),
      isOptional: !!destructuredMatch[3],
      isRest,
      destructured: destructuredMatch[1],
    };
  }

  // Regular param: name?: Type = default
  const match = param.match(/^(\w+)\s*(\?)?\s*(?::\s*(.+?))?(?:\s*=\s*(.+))?$/);
  if (!match) {
    return { name: param, type: "unknown", isOptional: false, isRest };
  }

  const [, name, optional, type, defaultValue] = match;
  return {
    name,
    type: cleanType(type || inferTypeFromDefault(defaultValue) || "any"),
    defaultValue: defaultValue?.trim(),
    isOptional: !!optional || !!defaultValue,
    isRest,
  };
}

function cleanType(type: string | undefined): string {
  if (!type) return "void";
  return type.trim().replace(/\s+/g, " ");
}

function inferReturnType(asyncPart?: string, generatorStar?: string): string {
  if (generatorStar) return asyncPart ? "AsyncGenerator" : "Generator";
  if (asyncPart) return "Promise";
  return "void";
}

function inferTypeFromDefault(defaultValue?: string): string | undefined {
  if (!defaultValue) return undefined;
  const trimmed = defaultValue.trim();
  if (trimmed === "true" || trimmed === "false") return "boolean";
  if (/^['"]/.test(trimmed)) return "string";
  if (/^\d/.test(trimmed)) return "number";
  if (trimmed.startsWith("[")) return "array";
  if (trimmed.startsWith("{")) return "object";
  if (trimmed === "null") return "null";
  if (trimmed === "undefined") return "undefined";
  return undefined;
}

// ── Comment Generation ──
function generateJSDoc(func: FunctionInfo, style: "terse" | "detailed"): string {
  const lines: string[] = [];

  // Description
  const desc = generateDescription(func, style);
  lines.push(`/**`);
  lines.push(` * ${desc}`);

  if (style === "detailed" && func.generics) {
    lines.push(` *`);
    // Extract type params
    const typeParams = func.generics.slice(1, -1).split(",").map((t) => t.trim());
    for (const tp of typeParams) {
      const tpName = tp.split(/\s/)[0];
      lines.push(` * @template ${tpName}`);
    }
  }

  // Parameters
  if (func.params.length > 0) {
    if (style === "detailed") lines.push(` *`);
    for (const param of func.params) {
      const optional = param.isOptional ? " (optional)" : "";
      const rest = param.isRest ? "..." : "";
      const defaultStr = param.defaultValue ? ` Defaults to ${param.defaultValue}.` : "";
      const paramDesc = generateParamDescription(param, style);

      if (style === "terse") {
        lines.push(` * @param {${param.type}} ${rest}${param.name} ${paramDesc}`);
      } else {
        lines.push(` * @param {${param.type}} ${rest}${param.name} - ${paramDesc}${optional}${defaultStr}`);
      }
    }
  }

  // Return type
  if (func.returnType && func.returnType !== "void") {
    const returnDesc = generateReturnDescription(func, style);
    lines.push(` * @returns {${func.returnType}} ${returnDesc}`);
  }

  lines.push(` */`);
  return lines.join("\n");
}

function generateDescription(func: FunctionInfo, style: "terse" | "detailed"): string {
  const name = func.name.replace(/^(get|set)\s+/, "");
  const words = splitCamelCase(name);

  if (func.name.startsWith("get ")) {
    return style === "terse"
      ? `Gets the ${words.toLowerCase()}.`
      : `Gets the ${words.toLowerCase()} value.`;
  }
  if (func.name.startsWith("set ")) {
    return style === "terse"
      ? `Sets the ${words.toLowerCase()}.`
      : `Sets the ${words.toLowerCase()} value.`;
  }

  // Verb-based descriptions
  const firstWord = words.split(" ")[0].toLowerCase();
  const rest = words.split(" ").slice(1).join(" ").toLowerCase();

  const verbMap: Record<string, string> = {
    get: "Retrieves",
    set: "Sets",
    is: "Checks if",
    has: "Checks whether",
    can: "Determines if",
    should: "Determines whether to",
    create: "Creates",
    make: "Creates",
    build: "Builds",
    init: "Initializes",
    initialize: "Initializes",
    setup: "Sets up",
    parse: "Parses",
    format: "Formats",
    convert: "Converts",
    transform: "Transforms",
    validate: "Validates",
    check: "Checks",
    find: "Finds",
    search: "Searches for",
    fetch: "Fetches",
    load: "Loads",
    save: "Saves",
    store: "Stores",
    update: "Updates",
    delete: "Deletes",
    remove: "Removes",
    add: "Adds",
    insert: "Inserts",
    append: "Appends",
    push: "Pushes",
    pop: "Pops",
    merge: "Merges",
    split: "Splits",
    join: "Joins",
    map: "Maps",
    filter: "Filters",
    reduce: "Reduces",
    sort: "Sorts",
    render: "Renders",
    display: "Displays",
    show: "Shows",
    hide: "Hides",
    toggle: "Toggles",
    enable: "Enables",
    disable: "Disables",
    start: "Starts",
    stop: "Stops",
    run: "Runs",
    execute: "Executes",
    process: "Processes",
    handle: "Handles",
    on: "Handles the",
    emit: "Emits",
    send: "Sends",
    receive: "Receives",
    read: "Reads",
    write: "Writes",
    open: "Opens",
    close: "Closes",
    connect: "Connects to",
    disconnect: "Disconnects from",
    log: "Logs",
    print: "Prints",
    debug: "Debugs",
    test: "Tests",
    assert: "Asserts",
    throw: "Throws",
    catch: "Catches",
    try: "Tries to",
    resolve: "Resolves",
    reject: "Rejects",
    wrap: "Wraps",
    unwrap: "Unwraps",
    encode: "Encodes",
    decode: "Decodes",
    encrypt: "Encrypts",
    decrypt: "Decrypts",
    hash: "Hashes",
    sign: "Signs",
    verify: "Verifies",
    register: "Registers",
    unregister: "Unregisters",
    subscribe: "Subscribes to",
    unsubscribe: "Unsubscribes from",
    listen: "Listens for",
    watch: "Watches for changes in",
    observe: "Observes",
    notify: "Notifies",
    reset: "Resets",
    clear: "Clears",
    flush: "Flushes",
    clean: "Cleans",
    normalize: "Normalizes",
    sanitize: "Sanitizes",
    escape: "Escapes",
    unescape: "Unescapes",
    compare: "Compares",
    equals: "Checks equality of",
    clone: "Clones",
    copy: "Copies",
    move: "Moves",
    swap: "Swaps",
    replace: "Replaces",
    apply: "Applies",
    use: "Uses",
    configure: "Configures",
    destroy: "Destroys",
    dispose: "Disposes of",
    mount: "Mounts",
    unmount: "Unmounts",
    attach: "Attaches",
    detach: "Detaches",
    bind: "Binds",
    unbind: "Unbinds",
    compose: "Composes",
    decompose: "Decomposes",
    aggregate: "Aggregates",
    collect: "Collects",
    gather: "Gathers",
    extract: "Extracts",
    inject: "Injects",
    interpolate: "Interpolates",
    calculate: "Calculates",
    compute: "Computes",
    count: "Counts",
    measure: "Measures",
    track: "Tracks",
    schedule: "Schedules",
    delay: "Delays",
    retry: "Retries",
    throttle: "Throttles",
    debounce: "Debounces",
    cache: "Caches",
    memoize: "Memoizes",
    serialize: "Serializes",
    deserialize: "Deserializes",
    stringify: "Converts to string representation of",
    generate: "Generates",
    compile: "Compiles",
    evaluate: "Evaluates",
    export: "Exports",
    import: "Imports",
  };

  const verb = verbMap[firstWord];
  if (verb && rest) {
    return style === "terse"
      ? `${verb} ${rest}.`
      : `${verb} the ${rest}.`;
  }
  if (verb) {
    return `${verb} the ${name.toLowerCase()}.`;
  }

  return style === "terse"
    ? `${words}.`
    : `Handles ${words.toLowerCase()} logic.`;
}

function splitCamelCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/_/g, " ");
}

function generateParamDescription(param: ParamInfo, style: "terse" | "detailed"): string {
  if (param.destructured) {
    return style === "terse" ? "Options" : "Configuration options";
  }

  const name = param.name;
  const words = splitCamelCase(name).toLowerCase();

  // Common parameter name patterns
  const descMap: Record<string, string> = {
    callback: "Callback function to invoke",
    cb: "Callback function",
    fn: "Function to execute",
    handler: "Handler function",
    listener: "Event listener",
    predicate: "Predicate function to test",
    comparator: "Comparison function",
    key: "Key identifier",
    value: "Value to set",
    name: "Name identifier",
    id: "Unique identifier",
    index: "Index position",
    count: "Number of items",
    size: "Size value",
    length: "Length value",
    width: "Width value",
    height: "Height value",
    depth: "Depth level",
    level: "Level value",
    path: "File or URL path",
    url: "URL string",
    uri: "URI string",
    src: "Source value",
    dest: "Destination value",
    source: "Source value",
    target: "Target value",
    input: "Input data",
    output: "Output destination",
    data: "Data to process",
    config: "Configuration object",
    options: "Configuration options",
    opts: "Options object",
    props: "Properties object",
    args: "Arguments to pass",
    params: "Parameters object",
    query: "Query string or object",
    filter: "Filter criteria",
    selector: "Selector string",
    pattern: "Pattern to match",
    regex: "Regular expression",
    template: "Template string",
    format: "Format string",
    type: "Type identifier",
    mode: "Operating mode",
    flag: "Boolean flag",
    enabled: "Whether to enable",
    message: "Message string",
    text: "Text content",
    label: "Label text",
    title: "Title text",
    description: "Description text",
    content: "Content value",
    body: "Request body",
    payload: "Data payload",
    result: "Result value",
    response: "Response object",
    request: "Request object",
    req: "HTTP request",
    res: "HTTP response",
    err: "Error object",
    error: "Error to handle",
    timeout: "Timeout in milliseconds",
    delay: "Delay in milliseconds",
    interval: "Interval in milliseconds",
    duration: "Duration value",
    max: "Maximum value",
    min: "Minimum value",
    limit: "Limit value",
    offset: "Offset value",
    start: "Start position",
    end: "End position",
    from: "Starting value",
    to: "Target value",
    prefix: "Prefix string",
    suffix: "Suffix string",
    separator: "Separator string",
    delimiter: "Delimiter character",
    encoding: "Character encoding",
    charset: "Character set",
    locale: "Locale identifier",
    lang: "Language code",
    port: "Port number",
    host: "Hostname",
    ctx: "Context object",
    context: "Execution context",
    scope: "Scope object",
    state: "State object",
    store: "Store instance",
    cache: "Cache instance",
    db: "Database instance",
    client: "Client instance",
    connection: "Connection instance",
    stream: "Stream instance",
    buffer: "Buffer data",
    chunk: "Data chunk",
    event: "Event object",
    element: "DOM element",
    node: "Node instance",
    parent: "Parent reference",
    child: "Child reference",
    children: "Child elements",
    items: "Array of items",
    list: "List of values",
    arr: "Array of values",
    array: "Array to process",
    obj: "Object to process",
    map: "Map instance",
    set: "Set instance",
    file: "File path or object",
    filename: "File name",
    filepath: "File path",
    dir: "Directory path",
    directory: "Directory path",
    folder: "Folder path",
    ext: "File extension",
    color: "Color value",
    style: "Style configuration",
    className: "CSS class name",
    token: "Authentication token",
    secret: "Secret value",
    password: "Password string",
    username: "Username string",
    email: "Email address",
    user: "User object",
    role: "User role",
    permission: "Permission identifier",
    version: "Version string",
    tag: "Tag identifier",
  };

  if (descMap[name]) {
    return descMap[name];
  }

  if (style === "terse") {
    return `The ${words}`;
  }
  return `The ${words} value`;
}

function generateReturnDescription(func: FunctionInfo, _style: "terse" | "detailed"): string {
  const name = func.name.replace(/^(get|set)\s+/, "");
  const words = splitCamelCase(name).toLowerCase();

  if (func.name.startsWith("get ") || func.name.startsWith("is") || func.name.startsWith("has")) {
    return `The ${words} value`;
  }
  if (func.name.startsWith("create") || func.name.startsWith("build") || func.name.startsWith("make")) {
    return `The created ${words.replace(/^create |^build |^make /, "")}`;
  }
  if (func.isAsync) {
    return `A promise that resolves when complete`;
  }

  return `The result`;
}

// ── File Processing ──
function processFile(filePath: string, style: "terse" | "detailed", dryRun: boolean): ProcessResult {
  const source = readFileSync(filePath, "utf8");
  const functions = parseFunctions(source);

  let commented = 0;
  let skipped = 0;
  const lines = source.split("\n");
  const insertions: Map<number, string> = new Map();

  for (const func of functions) {
    if (func.hasExistingComment) {
      skipped++;
      continue;
    }

    const jsDoc = generateJSDoc(func, style);
    const lineIdx = func.lineNumber - 1;

    // Get indentation of the function line
    const indent = lines[lineIdx].match(/^(\s*)/)?.[1] || "";
    const indentedDoc = jsDoc
      .split("\n")
      .map((l) => indent + l)
      .join("\n");

    insertions.set(lineIdx, indentedDoc);
    commented++;
  }

  if (commented > 0 && !dryRun) {
    // Build new source with insertions
    const newLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (insertions.has(i)) {
        newLines.push(insertions.get(i)!);
      }
      newLines.push(lines[i]);
    }
    writeFileSync(filePath, newLines.join("\n"), "utf8");
  }

  return {
    file: filePath,
    functions: functions.length,
    commented,
    skipped,
  };
}

function collectFiles(target: string, extensions: string[], recursive: boolean): string[] {
  const files: string[] = [];

  try {
    const stat = statSync(target);
    if (stat.isFile()) {
      const ext = extname(target).slice(1);
      if (extensions.includes(ext)) {
        files.push(target);
      }
      return files;
    }

    if (stat.isDirectory()) {
      const entries = readdirSync(target);
      for (const entry of entries) {
        if (entry.startsWith(".") || entry === "node_modules" || entry === "dist" || entry === "build") continue;
        const fullPath = join(target, entry);
        const entryStat = statSync(fullPath);
        if (entryStat.isFile()) {
          const ext = extname(entry).slice(1);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        } else if (entryStat.isDirectory() && recursive) {
          files.push(...collectFiles(fullPath, extensions, recursive));
        }
      }
    }
  } catch {
    // Skip inaccessible files/dirs
  }

  return files;
}

// ── Main ──
function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const styleIdx = args.indexOf("--style");
  const style: "terse" | "detailed" = (styleIdx !== -1 && args[styleIdx + 1] === "terse") ? "terse" : "detailed";

  const extIdx = args.indexOf("--ext");
  const extensions = extIdx !== -1 && args[extIdx + 1]
    ? args[extIdx + 1].split(",")
    : ["ts", "tsx", "js", "jsx"];

  const dryRun = args.includes("--dry-run");
  const jsonOutput = args.includes("--json");
  const recursive = !args.includes("--no-recursive");

  // Find target
  const positional = args.filter(
    (a, i) =>
      !a.startsWith("--") &&
      (i === 0 || (args[i - 1] !== "--style" && args[i - 1] !== "--ext"))
  );
  const target = positional[0];

  if (!target) {
    console.error(paint(c.red, "Error: No file or directory specified."));
    process.exit(1);
  }

  const files = collectFiles(target, extensions, recursive);

  if (files.length === 0) {
    console.error(paint(c.yellow, `No matching files found in "${target}".`));
    process.exit(0);
  }

  const results: ProcessResult[] = [];

  if (!jsonOutput) {
    console.log("");
    console.log(paint(c.bgYellow + c.black + c.bold, " ai-comment "));
    console.log("");
    console.log(`  ${paint(c.bold, "Target:")}     ${paint(c.cyan, target)}`);
    console.log(`  ${paint(c.bold, "Files:")}      ${paint(c.green, String(files.length))}`);
    console.log(`  ${paint(c.bold, "Style:")}      ${paint(c.yellow, style)}`);
    console.log(`  ${paint(c.bold, "Extensions:")} ${paint(c.dim, extensions.join(", "))}`);
    if (dryRun) console.log(`  ${paint(c.bold, "Dry run:")}   ${paint(c.yellow, "enabled")}`);
    console.log("");
  }

  let totalFunctions = 0;
  let totalCommented = 0;
  let totalSkipped = 0;

  for (const file of files) {
    const result = processFile(file, style, dryRun);
    results.push(result);
    totalFunctions += result.functions;
    totalCommented += result.commented;
    totalSkipped += result.skipped;

    if (!jsonOutput && (result.commented > 0 || result.skipped > 0)) {
      const relPath = relative(process.cwd(), file);
      const icon = result.commented > 0
        ? (dryRun ? paint(c.yellow, "\u25CB") : paint(c.green, "\u2713"))
        : paint(c.dim, "\u2013");
      console.log(
        `  ${icon} ${paint(c.white, relPath.padEnd(40))} ` +
        `${paint(c.green, "+" + result.commented)} commented  ` +
        `${paint(c.dim, result.skipped + " skipped")}`
      );
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify({
      target,
      style,
      dryRun,
      files: results,
      totals: {
        files: files.length,
        functions: totalFunctions,
        commented: totalCommented,
        skipped: totalSkipped,
      },
    }, null, 2));
  } else {
    console.log("");
    console.log(
      `  ${paint(c.bold, "Total:")} ${paint(c.green, String(totalCommented))} functions commented, ` +
      `${paint(c.dim, String(totalSkipped) + " already documented")}`
    );
    if (dryRun) {
      console.log(paint(c.yellow, "\n  Dry run complete. No files were modified."));
    }
    console.log("");
  }
}

main();
