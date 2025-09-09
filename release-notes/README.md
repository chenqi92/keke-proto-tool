# Release Notes

This directory contains version-specific release notes for the application.

## Structure

- Each version should have its own markdown file named `{version}.md` (e.g., `1.0.0.md`, `1.2.3.md`)
- If a version-specific file doesn't exist, the workflow will use `default-template.md` as a fallback

## Format

Release notes should follow this general structure:

```markdown
# Version {version}

## 🚀 New Features
- Feature 1
- Feature 2

## 🐛 Bug Fixes
- Fix 1
- Fix 2

## 🔧 Improvements
- Improvement 1
- Improvement 2

## 📦 Dependencies
- Updated dependency 1
- Updated dependency 2

## 🔄 Breaking Changes
- Breaking change 1 (if any)

## 📝 Notes
- Additional notes
```

## Usage

The GitHub Actions workflow will automatically:
1. Detect version changes in `package.json`
2. Look for a release notes file matching the new version
3. Use the version-specific notes if available, or fall back to the default template
4. Create a GitHub release with the appropriate notes
