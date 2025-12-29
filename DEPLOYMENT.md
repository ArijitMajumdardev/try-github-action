# Deployment and Source Map Management

Simple guide for building, deploying, and debugging obfuscated code.

## Quick Overview

- **Build**: Automatic on every push to `main`
- **Production Files**: Download from GitHub Actions Artifacts
- **Source Maps**: Separate zip file, also in Artifacts
- **Debugging**: Download source maps, extract, translate errors

---

## How It Works

### Automatic Build Workflow

Every time you push to `main`:

1. GitHub Actions runs automatically
2. Builds your TypeScript → Obfuscated JavaScript
3. Creates **TWO artifacts**:
   - `production-files` - Only `.js` files (ready to deploy)
   - `sourcemaps` - Contains `.js.map` and source `.ts` files

### Where to Find Your Build

1. Go to your GitHub repository
2. Click the **Actions** tab
3. Click on the latest workflow run
4. Scroll to the **Artifacts** section at the bottom
5. Download:
   - `production-files` for deployment
   - `sourcemaps` for debugging

**Screenshot location**: Actions → Workflow Run → Artifacts (bottom of page)

---

## Downloading and Deploying

### Get Production Files

```bash
# Option 1: Download from GitHub UI
# Go to Actions → Latest run → Download "production-files"

# Option 2: Using GitHub CLI
gh run list --limit 1
gh run download {run-id} -n production-files
```

The `production-files` folder contains only:
- `index.js` (obfuscated, no source maps)
- `user.js` (obfuscated, no source maps)

Deploy these files to your production server.

---

## Debugging Production Errors

When an error occurs in production, here's how to debug it:

### Step 1: Download Source Maps

```bash
# From GitHub Actions page
# Download the "sourcemaps" artifact for the deployed build

# Or via CLI
gh run download {run-id} -n sourcemaps
```

You'll get: `sourcemaps.zip`

### Step 2: Extract Source Maps

```bash
unzip sourcemaps.zip
```

This creates:
```
dist/
├── index.js.map
└── user.js.map
src/
├── index.ts
└── user.ts
```

### Step 3: Copy to Your Project

```bash
# Copy source maps to your project's dist directory
cp dist/*.js.map ./dist/
```

### Step 4: Translate the Error

```bash
npm run translate
```

**Interactive mode**:
1. Paste your obfuscated error stack trace
2. Type `END` on a new line
3. Press Enter

**Example**:

**Input** (obfuscated error from production):
```
Error: Test error
    at _0x3a4f2b (d:\dist\user.js:98:19)
    at _0x1f8e3d (d:\dist\index.js:234:15)
END
```

**Output** (translated to original source):
```
========== TRANSLATED STACK TRACE ==========

Original:     at _0x3a4f2b (d:\dist\user.js:98:19)
  -> ../src/user.ts:17:14 | throw new Error("Test error");
     Function: userController

Original:     at _0x1f8e3d (d:\dist\index.js:234:15)
  -> ../src/index.ts:92:8 | await userController(req, res, next);
     Function: handleUserRequest
```

Now you know:
- **File**: `src/user.ts` line 17
- **Function**: `userController`
- **Code**: `throw new Error("Test error");`

---

## GitHub Actions Workflow

### Workflow File

**Location**: `.github/workflows/build-and-package.yml`

### What It Does

**7 simple steps**:
1. Checkout code
2. Setup Node.js
3. Install dependencies (`npm ci`)
4. Build project (`npm run build`)
5. Prepare production files (copy only `.js`, validate no `.map` files)
6. Create source maps archive (zip `.js.map` + `.ts` files)
7. Upload both artifacts

### Triggers

**Automatic**:
- Every push to `main` branch

**Manual**:
- Go to Actions → Build and Package → Run workflow

### Artifacts

| Artifact | Contents | Use For | Retention |
|----------|----------|---------|-----------|
| `production-files` | `*.js` only | Deploy to production | 90 days |
| `sourcemaps` | `*.js.map` + `*.ts` | Debugging errors | 90 days |

---

## Security

### What's Safe

✅ **Production artifact** - Only contains obfuscated `.js` files
✅ **Validation** - Workflow fails if source maps accidentally included
✅ **Separate storage** - Source maps never mixed with production code

### What to Protect

🔒 **Source maps artifact** - Contains your original unobfuscated code
- Only download when needed for debugging
- Don't commit to repository (already in `.gitignore`)
- Don't deploy to production servers

---

## Common Tasks

### Manually Trigger a Build

```bash
# Via GitHub CLI
gh workflow run build-and-package.yml

# Or via GitHub UI
# Actions → Build and Package → Run workflow
```

### Find Which Build Was Deployed

Check your deployment logs or production server for the commit SHA, then:

```bash
# List recent workflow runs
gh run list --workflow=build-and-package.yml

# Find the run for your commit
gh run list --workflow=build-and-package.yml --commit={sha}

# Download artifacts from that run
gh run download {run-id}
```

### Local Testing

```bash
# Build locally
npm run build

# Check what would be in production artifact
ls dist/*.js

# Check what would be in source maps
ls dist/*.js.map
ls src/*.ts
```

---

## Troubleshooting

### Problem: Can't Find Artifacts

**Solution**: Check that the workflow completed successfully:
```bash
gh run list --limit 5
# Look for green checkmark
```

If failed, view logs:
```bash
gh run view {run-id} --log
```

### Problem: Source Maps Don't Match Production Error

**Cause**: Downloaded source maps from wrong build

**Solution**: Ensure you download source maps from the exact same workflow run that was deployed:

1. Check your deployment logs for commit SHA
2. Find that commit's workflow run
3. Download source maps from that specific run

### Problem: Translation Shows Wrong Location

**Cause**: Source maps not copied to `dist/` directory

**Solution**:
```bash
# After extracting sourcemaps.zip, copy to dist/
cp dist/*.js.map ./dist/

# Verify files exist
ls ./dist/*.js.map
```

---

## File Structure

```
project-root/
├── .github/
│   └── workflows/
│       └── build-and-package.yml    # Simple workflow (7 steps)
├── src/                              # TypeScript source
│   ├── index.ts
│   └── user.ts
├── dist/                             # Build output (gitignored)
│   ├── *.js                          # Obfuscated JavaScript
│   └── *.js.map                      # Source maps (gitignored)
├── tools/                            # Debugging tools
│   ├── sourcemap-translator.ts
│   └── cli.ts
├── package.json
└── DEPLOYMENT.md                     # This file
```

---

## Quick Reference

### Download Artifacts

```bash
# List runs
gh run list

# Download specific run
gh run download {run-id}

# Download just production files
gh run download {run-id} -n production-files

# Download just source maps
gh run download {run-id} -n sourcemaps
```

### Debug an Error

```bash
# 1. Download source maps
gh run download {run-id} -n sourcemaps

# 2. Extract
unzip sourcemaps.zip

# 3. Copy to project
cp dist/*.js.map ./dist/

# 4. Translate
npm run translate
# Paste error, type END
```

### Workflow Commands

```bash
# Trigger build
gh workflow run build-and-package.yml

# View runs
gh run list --workflow=build-and-package.yml

# View specific run
gh run view {run-id}

# Download artifacts
gh run download {run-id}
```

---

## Additional Documentation

- `USAGE-GUIDE.md` - Using source maps in different scenarios
- `NAME-MAPPING-GUIDE.md` - What source maps reveal about your code
- `tools/README.md` - Translator tool documentation

---

**Last Updated**: 2025-12-28
