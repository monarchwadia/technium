# Procedures

This script describes common procedures.

## Publishing a package to npm

```bash
cd <package-name>
new_version=$(pnpm version patch)
git add .
git commit -m "$new_version"
git push && git push --tags
pnpm publish --access public
```

### Notes
- Make sure you're logged into npm: `npm login`
- Ensure all changes are committed before publishing
- The package uses `@technium/` scope and requires `--access public`
