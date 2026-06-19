# Tailwind CSS Frontend Notes

Tailwind works best when component layout is planned from the outside in: container width, grid or flex behavior, spacing scale, typography scale, color roles, interaction states, and responsive breakpoints.

Responsive patterns:

- Start with mobile styles, then add `sm:`, `md:`, `lg:`, and `xl:` overrides only where layout or density actually changes.
- Prefer `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for card groups and product grids.
- Use `max-w-*`, `mx-auto`, and container padding such as `px-4 sm:px-6 lg:px-8` for stable page rhythm.
- Use `gap-*` rather than individual margins inside grids and flex groups.

UI polish checklist:

- Buttons need hover, focus-visible, disabled, and loading states.
- Cards need consistent padding, border color, shadow restraint, and predictable min heights.
- Text should never rely on negative tracking. Match type size to the surface: compact panels need compact headings.
- Dark mode should define backgrounds, borders, text, muted text, focus rings, and accent colors.

Common component patterns:

- Navbar: logo, primary links, secondary action, mobile disclosure.
- Hero: clear headline, supporting copy, primary CTA, secondary CTA, visible next-section hint.
- Product grid: image aspect ratio, title, price, badges, quick action, accessible labels.
- Pricing: plan name, price, feature list, primary action, comparison state.
- Forms: label, helper text, error state, focus style, submit status.
