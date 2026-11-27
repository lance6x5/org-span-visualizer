# Contributing to Spanscope

Thanks for helping improve Spanscope! Bugs and ideas are tracked as [GitHub Issues](https://github.com/lance6x5/org-span-visualizer/issues).

## Reporting

- Use **Feedback → Report a bug / Request a feature** in the app, or open an issue with the [bug report](https://github.com/lance6x5/org-span-visualizer/issues/new?template=bug_report.yml) or [feature request](https://github.com/lance6x5/org-span-visualizer/issues/new?template=feature_request.yml) form.
- Never include real employee data. Reproduce with the sample CSV or made-up rows.

## Triage flow

1. Every new issue is labelled `triage` automatically (plus `bug` or `enhancement`).
2. The maintainer reviews it, removes `triage`, and relabels/prioritises it (or closes it with a reason).
3. Work happens on a branch, e.g. `fix/123-short-name` or `feat/123-short-name`.
4. Open a pull request whose description contains `Fixes #123` so the issue closes automatically on merge. CI runs the tests and build on every push.
5. User-facing changes are recorded in [CHANGELOG.md](CHANGELOG.md) under **Unreleased**, then moved into a versioned section when a release is tagged (see "Versioning" in the README).

## Licensing of contributions

Spanscope is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). By submitting a pull request, you agree that your contribution is licensed to Silverlight DevTech under the same terms, and that Silverlight DevTech may also offer it under its commercial licenses.

## Development

```bash
npm ci
npm run dev
npm test
```
