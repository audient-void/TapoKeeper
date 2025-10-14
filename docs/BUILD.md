# Building TapoKeeper for Distribution

## Current Status ✅ WORKING

**Webpack + pkg (currently configured)**: Works perfectly! ES modules are bundled to CommonJS with webpack, then packaged into a standalone executable with pkg.

## Quick Start

```bash
# Build executable for Windows (37MB standalone .exe)
npm run build

# Build for all platforms (Windows, macOS, Linux)
npm run build:all
```

The executable will be created in `dist/tapokeeper.exe` and includes everything needed to run.

## How It Works

The build process uses a two-step approach to handle ES modules:

1. **Webpack bundles ES modules → CommonJS**: `index.js` (ES modules) → `dist/tapokeeper.cjs` (CommonJS)
2. **pkg packages CommonJS → executable**: `dist/tapokeeper.cjs` → `dist/tapokeeper.exe`

This solves pkg's ES module limitation while maintaining full functionality.

## Alternative Solutions (Not Currently Used)

### Option 1: Use Batch File (Simplest - Works Now)

Use the included `tapokeeper.bat` file:

```bash
# Run directly
tapokeeper.bat --help

# Or create shortcut
# Right-click tapokeeper.bat → Create Shortcut → Rename to "TapoKeeper"
```

**Distribution**: Package the entire folder (index.js, package.json, node_modules, tapokeeper.bat, env.example) as a zip file. Users need Node.js installed.

### Option 2: Use Batch File (Requires Node.js)

Use the included `tapokeeper.bat` file - works immediately but users need Node.js installed.

### Option 3: Use Bun

Bun has native ES module support but may have networking/handshake issues with the Tapo library.

### Option 4: Node.js Native SEA (Single Executable Application)

Node.js v20+ has experimental SEA support, but it only supports CommonJS, so you'd still need to bundle first.

### Option 5: Convert to CommonJS

Rewrite the entire codebase to use `require()` instead of `import`, but this loses the benefits of ES modules.

## Build Process Details

### Step 1: Bundle with Webpack

Webpack configuration (`webpack.config.cjs`) converts ES modules to CommonJS:

```javascript
module.exports = {
  entry: './index.js',
  target: 'node',
  output: {
    filename: 'tapokeeper.cjs',
    module: false,
  },
  externals: {
    'local-devices': 'commonjs2 local-devices'
  }
};
```

This handles:
- ES module → CommonJS conversion
- Top-level await
- `import.meta.url` references
- Dynamic requires in dependencies (axios, tp-link-tapo-connect)

### Step 2: Package with pkg

The bundled CommonJS file is then packaged with pkg into a standalone executable that includes:
- Node.js runtime (v18)
- Your application code
- All dependencies

## Testing

```bash
# Test the bundled file
node dist/tapokeeper.cjs --help

# Test the executable
./dist/tapokeeper.exe --help
./dist/tapokeeper.exe --dump --verbose
```

## Distribution

The `dist/tapokeeper.exe` file is completely standalone:
- No Node.js installation required
- No dependencies needed
- Can be distributed as a single file
- ~37MB file size

Users can run it directly:
```bash
tapokeeper.exe --help
tapokeeper.exe --dump csv
```
