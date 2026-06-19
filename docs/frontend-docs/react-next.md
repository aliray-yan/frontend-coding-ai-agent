# React and Next.js Frontend Notes

React components should keep rendering logic readable and state close to the interaction that owns it. Build reusable sections only when reuse is clear.

Component guidance:

- Keep props explicit and typed.
- Split large UI into layout, section, and primitive components.
- Avoid premature global state; use local state for isolated UI and context only for shared app concerns.
- Preserve existing behavior when editing a component.

Next.js guidance:

- Put route UI in `app/` or `pages/` depending on project structure.
- Use server components for static/data-heavy rendering and client components for stateful browser interactions.
- Keep client boundaries small: mark the lowest interactive component with `"use client"`.
- Use `next/image` for optimized images when available.

Frontend implementation checklist:

- Explain where each file belongs.
- Include imports and exported component names.
- Keep class names responsive and accessible.
- Add empty, loading, and error states for data-driven UI.
- Maintain semantic HTML: headings in order, buttons for actions, links for navigation.
