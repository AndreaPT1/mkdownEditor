# Contributing To mkdownEditor

Thanks for taking a look at mkdownEditor. This project works best with focused,
practical contributions that make the editor easier to use, easier to package, or
easier to understand.

## Good First Contributions

- Fix a small editor bug with clear reproduction steps
- Improve Markdown editing behavior without changing the whole interaction model
- Polish platform-specific packaging notes
- Tighten documentation where setup or release behavior is unclear
- Add a regression test or manual verification note for a bug you fixed

## Local Setup

```bash
npm install
npm run tauri dev
```

Create a production build with:

```bash
npm run tauri build
```

You will also need Rust and the Tauri 2 prerequisites for your operating system.

## Pull Request Style

- Keep PRs narrow. One meaningful change per PR is easiest to review.
- Explain the user-visible behavior you changed.
- Include the platform you tested on.
- Avoid large rewrites unless there is an issue discussing the direction first.
- Do not add placeholder signing, release, or certificate configuration.

## Reporting Bugs

Please include:

- Operating system and version
- mkdownEditor version or commit
- Steps to reproduce
- Expected result
- Actual result
- Screenshots or logs if they clarify the problem

## Project Tone

mkdownEditor is intentionally small and pragmatic. Contributions should preserve
that feeling: a calm Markdown editor with native packaging, not a sprawling
writing platform.
