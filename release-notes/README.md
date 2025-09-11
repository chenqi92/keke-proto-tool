# Release Notes

This directory contains release notes for keke-proto-tool versions.

## File Structure

- `default-template.md` - Default template used when no version-specific notes exist
- `{version}.md` - Version-specific release notes (e.g., `0.0.5.md`)

## Release Process

### Automatic Release (Recommended)

1. Update the version in `package.json`
2. Commit and push to the `main` branch
3. The GitHub Actions workflow will automatically:
   - Create a new release
   - Build packages for all supported platforms
   - Upload packages to the release as they complete

### Manual Release

You can also trigger a release manually:

1. Go to the Actions tab in GitHub
2. Select "Release & Package" workflow
3. Click "Run workflow"
4. Choose whether to skip release creation (for testing)



## Supported Platforms

### Current Support
- ✅ Windows x64 (MSI, NSIS)
- ✅ Windows x86 (MSI, NSIS)
- ✅ macOS Intel x64
- ✅ macOS Apple Silicon (ARM64)
- ✅ Linux x64

### Planned Support
- 🔄 Linux ARM64 (cross-compilation setup in progress)

## Release Strategy

The new release process follows a **create-first, upload-later** strategy:

1. **Create Release**: A GitHub release is created immediately with release notes
2. **Build Packages**: Multiple build jobs run in parallel for different platforms
3. **Upload Assets**: As each build completes, its packages are uploaded to the existing release
4. **Cleanup**: Temporary artifacts are cleaned up after successful uploads

This approach ensures:
- Releases are created even if some builds fail
- Users can see the release immediately
- Packages are added as they become available
- Failed builds don't block the entire release

## Template Variables

- `{version}` - Will be replaced with the actual version number
