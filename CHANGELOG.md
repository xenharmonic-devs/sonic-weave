# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.12.1] - 2026-04-07

### Added
- Added repeated augmented/diminished parsing test coverage.
- Added this changelog and backfilled recent release notes.

### Changed
- Migrated the project to ESM (`NodeNext`) and updated imports/exports accordingly.
- Updated dependencies.

### Fixed
- Fixed diminished-chaining behavior in parsing.

## [0.12.0] - 2026-04-02

### Added
- Added `isoharmonic` and `isorescale` functions to the library.
- Added tests for CLI format handling.

### Changed
- Made Commander optional in the CLI with a clearer message when it is missing.
- Improved loop execution performance with early-break optimization.
- Updated dependency sets and GitHub Actions Node.js versions.
- Polished README/documentation pages and expanded type documentation.

### Fixed
- Fixed parser recovery in the REPL after parser errors.
- Fixed `paren-counter` handling of nested function calls.
- Fixed handling of commas/subgroups and several grammar/performance issues.
- Tightened FJS edge-case handling (including large prime-limit and accidental requirements).

## [0.11.0] - 2025-01-25

### Changed
- Converted to real cents when prime exponents run out of precision.
- Performed maintenance updates for documentation and Typedoc tooling.

## [0.10.10] - 2024-12-10

### Added
- Added support for lone vals in `commaBasis` and `mappingBasis`.
- Added support for containers as spread arguments.
- Added negation support for the `~=` operator.

### Fixed
- Fixed typos in user-facing error messages.

[Unreleased]: https://github.com/xenharmonic-devs/sonic-weave/compare/v0.12.1...HEAD
[0.12.1]: https://github.com/xenharmonic-devs/sonic-weave/compare/v0.12.0..v0.12.1
[0.12.0]: https://github.com/xenharmonic-devs/sonic-weave/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/xenharmonic-devs/sonic-weave/compare/v0.10.10...v0.11.0
[0.10.10]: https://github.com/xenharmonic-devs/sonic-weave/compare/v0.10.9...v0.10.10
