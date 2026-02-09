# @lxgicstudios/ai-comment

[![npm version](https://img.shields.io/npm/v/@lxgicstudios/ai-comment)](https://www.npmjs.com/package/@lxgicstudios/ai-comment)
[![license](https://img.shields.io/npm/l/@lxgicstudios/ai-comment)](LICENSE)
[![node](https://img.shields.io/node/v/@lxgicstudios/ai-comment)](package.json)

Auto-generate JSDoc comments for TypeScript and JavaScript functions. Detects signatures, parameters, and return types. Preserves existing comments. Zero dependencies.

## Install

```bash
npm install -g @lxgicstudios/ai-comment
```

Or run directly:

```bash
npx @lxgicstudios/ai-comment src/
```

## Usage

```bash
# Add JSDoc to a single file
ai-comment src/utils.ts

# Process entire directory
ai-comment src/

# Terse style (shorter comments)
ai-comment src/utils.ts --style terse

# Dry run to preview changes
ai-comment src/ --dry-run

# Only specific extensions
ai-comment lib/ --ext js,jsx

# JSON output
ai-comment src/ --json
```

## Features

- Detects function declarations, arrow functions, and class methods
- Extracts parameter names, types, and return types from TypeScript
- Generates `@param`, `@returns`, `@template` tags
- Smart descriptions based on function name patterns (150+ verb mappings)
- Smart parameter descriptions based on common naming conventions
- Preserves existing JSDoc comments (won't overwrite)
- Supports async functions and generator functions
- Handles destructured parameters
- Handles TypeScript generics
- Two styles: terse (minimal) and detailed (full descriptions)
- Recursive directory processing
- Skips node_modules, dist, and build directories
- Colorful terminal output
- Zero external dependencies (regex-based parsing)

## Options

| Flag | Description |
|------|-------------|
| `--style <s>` | Comment style: `terse` or `detailed` (default: detailed) |
| `--dry-run` | Preview changes without writing files |
| `--ext <exts>` | File extensions to process (default: ts,tsx,js,jsx) |
| `--no-recursive` | Don't process subdirectories |
| `--json` | Output results as JSON |
| `--help` | Show help message |

## Example Output

Given this TypeScript function:

```typescript
export async function fetchUserData(userId: string, options?: RequestOptions): Promise<User> {
```

The tool generates:

```typescript
/**
 * Fetches the user data.
 *
 * @param {string} userId - Unique identifier
 * @param {RequestOptions} options - Configuration options (optional)
 * @returns {Promise<User>} A promise that resolves when complete
 */
export async function fetchUserData(userId: string, options?: RequestOptions): Promise<User> {
```

## License

MIT - [LXGIC Studios](https://lxgicstudios.com)
