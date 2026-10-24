# Project design contract

Use the receiving repo's existing PRODUCT.md and DESIGN.md or equivalent sources.
The context helper resolves root and `.agents/context/` or `docs/` locations;
`IMPECCABLE_CONTEXT_DIR` supports an explicit fallback when local context is absent.
Keep scripts running from the receiving project, not the shared skill checkout.

Product truth belongs in PRODUCT.md. DESIGN.md owns the project's visual and
interaction contract. Where these already exist, update them in place. For a
missing design contract, record only established or explicitly agreed facts:

- Visual identity and references: tokens, typography, components, and assets;
  point to their owning files rather than copying token values.
- Layout and navigation: major surfaces, information shown together, responsive
  behavior, and what may be progressively disclosed.
- Interaction: supported input methods, automatic actions, feedback, stop/cancel
  meaning, error recovery, persistence, and established component behavior.
- Platforms and intentional differences: required surfaces, device/runtime scope,
  hardware constraints, and relevant accessibility needs.
- Acceptance: critical user journeys and links to the repo's verification policy.

Keep concrete task requests and temporary exceptions in the task's acceptance
checklist. Record undecided product choices as open. Do not inherit another
project's colors, panel arrangement, domain rules, or platform promises.
