# ai-comment

[![npm version](https://img.shields.io/npm/v/ai-comment.svg)](https://www.npmjs.com/package/ai-comment)
[![npm downloads](https://img.shields.io/npm/dm/ai-comment.svg)](https://www.npmjs.com/package/ai-comment)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


Add meaningful inline comments to complex code. Explains the WHY, not the WHAT.

## Install

```bash
npm install -g ai-comment
```

## Usage

```bash
npx ai-comment ./src/algorithm.ts
# → Comments added to ./src/algorithm.ts

npx ai-comment ./src/utils.js --style detailed
# → More verbose explanations

npx ai-comment ./src/parser.ts --dry-run
# → Preview without modifying the file
```

## Setup

```bash
export OPENAI_API_KEY=sk-...
```

## Styles

- `concise` - Short, to-the-point comments (default)
- `detailed` - More thorough explanations
- `beginner` - Explains concepts for junior developers

## License

MIT
