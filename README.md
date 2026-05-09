# @lxgicstudios/ai-comment

Smart comment generator and organizer. Creates meaningful documentation for code automatically.

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
|




 [github.com/LXGIC-Studios](https://github.com/lxgicstudios)


- [npm Advanced SEO Guide](https://github.com/lxgicstudios/npm-seo-guide) - npm package optimization
- [AI Search Optimization](https://github.com/lxgicstudios/ai-seo-guide) - AI-powered SEO strategies

## 🚀 Built with ❤️ by LXGIC Studios

> This tool is part of the [lxgic studios](https://github.com/lxgicstudios) collection of AI-powered developer tools. We specialize in creating intelligent automation solutions that help developers build faster, smarter, and more efficiently.


**Discover more tools:** [lxgic studios GitHub](https://github.com/lxgicstudios)  
**Follow us on ** [@lxgicstudios](https://twitter.com/lxgicstudios)  
**Join our community:** [Discord Server](https://discord.gg/lxgicstudios)  

## 📄 License

MIT © 2025 LXGIC Studios. Built with ⚡ and AI.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.


<div align="center">
  <p>
    <a href="https://github.com/lxgicstudios/sponsor">
      <img src="https://img.shields.io/badge/-Sponsor%20Us-%23EA4AAA?style=for-the-badge&logo=github&logoColor=white" alt="Sponsor LXGIC Studios">
    </a>
    <a href="https://twitter.com/lxgicstudios">
      <img src="https://img.shields.io/badge/-Follow%20Us-%231DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Follow LXGIC Studios">
    </a>
    <a href="https://discord.gg/lxgicstudios">
      <img src="https://img.shields.io/badge/-Join%20Discord-%235865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Join Discord">
    </a>
  </p>
</div>

---

Built by [LXGIC Studios](https://github.com/lxgicstudios)

🔗 [GitHub](https://github.com/lxgicstudios) · [Twitter](https://x.com/lxgicstudios)

💡 Want more free tools like this? We have 100+ on our GitHub: [github.com/lxgicstudios](https://github.com/lxgicstudios)


---

**Built by [LXGIC Studios](https://lxgicstudios.com)**

🔗 [GitHub](https://github.com/LXGIC-Studios) · [Twitter](https://x.com/lxgicstudios)

💡 Want more free tools like this? We have 100+ on our GitHub: github.com/LXGIC-Studios

---

**Built by [LXGIC Studios](https://lxgicstudios.com)**

🔗 [GitHub](https://github.com/LXGIC-Studios) · [Twitter](https://x.com/lxgicstudios)

💡 Want more free tools like this? We have 100+ on our GitHub: github.com/LXGIC-Studios