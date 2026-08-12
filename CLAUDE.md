# Project guidelines

## Scope discipline
This is a small, modular prototype — NOT a full application. The end goal is that
this logic gets absorbed into aicoo's main product (aicoo-core-dev), not that this
grows into a standalone app. Because of this:
- Prefer small, isolated, composable modules over large all-in-one components
- Every new feature should be something that could be lifted out and dropped into
  another codebase with minimal rewiring (e.g. pure functions for data transforms,
  clearly separated data/UI/export layers — this pattern is already used in
  src/export/, src/store/, src/types/)
- Avoid speculative complexity. Don't build configuration options, abstractions, or
  edge-case handling for needs that haven't been explicitly requested
- When in doubt between "more features" and "simpler, cleaner code" — choose simpler

## Design quality
The UI should feel as clean, simple, and intuitive as production tools from
Google, Amazon, or similar — not like a typical developer prototype. When building
or modifying UI:
- Favor whitespace, clear visual hierarchy, and restraint over cramming in options
- Keep interactions obvious without needing explanation (self-evident icons, clear
  labels, sensible defaults)
- Reuse the same spacing/color/typography patterns already established in the app
  instead of introducing new styles per component
- When adding a new UI element, ask "would this look at home in a well-designed
  SaaS product?" — if not, simplify it
