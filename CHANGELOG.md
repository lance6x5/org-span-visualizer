# Changelog

All notable changes to Spanscope are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.1] - 2026-11-27

### Changed
- Footer studio credit now uses the Silverlight DevTech company mark (the "47 Ag" periodic-table tile), replacing the interim crescent mark.

## [1.2.0] - 2026-11-27

### Added
- `LICENSE.md`: the PolyForm Noncommercial License 1.0.0, with the `Required Notice: Copyright 2026 Silverlight DevTech` line. Earlier versions had no license file (all rights reserved).
- Studio credit in the app footer: Silverlight DevTech mark (`public/silverlight-mark.svg`), "© 2026 Silverlight DevTech", a "Noncommercial license" link to `LICENSE.md`, and a "More apps" link to the apps homepage (https://lance6x5.github.io/). The mark is a bundled local file (`img-src 'self'`) and both links are ordinary navigations, so the CSP is unchanged and the app still makes no network calls to other origins.
- `author` and `copyright` meta tags in `index.html`.
- README: studio credit line, "License" and "Trademarks" sections; CONTRIBUTING: "Licensing of contributions".

### Changed
- Licensed under the PolyForm Noncommercial License 1.0.0 (source-available; commercial use requires a separate license from Silverlight DevTech). `package.json` now sets `"license": "PolyForm-Noncommercial-1.0.0"` and `"author": "Silverlight DevTech"`.

## [1.1.0] - 2026-11-27

### Added
- **Spanscope** branding: new name and tagline ("See every span of control at a glance") in the page title, meta description, app header, PWA manifest and README.
- Original logo (magnifier over a three-report org fan in healthy/narrow/wide colours) with an adaptive light/dark wordmark; new favicon, Apple touch icon and PWA icons (192, 512, maskable 512 PNG).
- App version shown in the footer (injected at build time from `package.json`), plus a Changelog link.
- In-app **Feedback** menu ("Report a bug", "Request a feature") that opens a pre-filled GitHub issue form in a new tab. Only the app version and browser string are pre-filled; no roster data and no network calls from the app.
- GitHub issue forms for bug reports and feature requests (blank issues disabled), `CONTRIBUTING.md` with the triage flow, and this changelog.

### Changed
- Violet brand palette wired into the light and dark theme tokens (accent, banner, header), keeping WCAG AA contrast.
- Export filenames now use the brand name (`spanscope-session.json`, `spanscope-org-chart.png/.svg`, `spanscope-flagged-managers.csv/.tsv`). Sessions exported by 1.0.0 still import.

## [1.0.0] - 2026-11-27

### Added
- CSV upload (drag and drop or file picker) parsed locally with PapaParse, with a downloadable 40-person sample roster.
- Column mapping with auto-detection for required (`employee_id`, `name`, `title`, `manager_id`) and optional (`department`, `location`, `employment_type`) fields.
- Data validation panel (missing managers, multiple roots, cycles, duplicate and blank IDs) with automatic repair.
- Configurable span thresholds and contractor handling; managers flagged healthy / narrow / wide.
- Collapsible, zoomable d3 org tree and compact list view, with search-to-focus.
- Analytics: headcount, managers, layers, average and median span, flagged managers list and span histogram.
- Exports: flagged managers as CSV/TSV (and copy for Excel), chart as PNG/SVG, and full session as JSON (re-importable).
- Opt-in local session saving (IndexedDB), reset-all-data, offline-capable PWA, light/dark mode, keyboard accessibility.
- Strict production Content-Security-Policy (`connect-src 'self'`) and GitHub Pages deployment via GitHub Actions.

[Unreleased]: https://github.com/lance6x5/org-span-visualizer/compare/v1.2.1...HEAD
[1.2.1]: https://github.com/lance6x5/org-span-visualizer/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/lance6x5/org-span-visualizer/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/lance6x5/org-span-visualizer/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/lance6x5/org-span-visualizer/releases/tag/v1.0.0
