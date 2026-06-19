# Shopify Liquid and Shopline-Style Storefront Notes

Shopify Liquid:

- Sections live in `sections/`, snippets in `snippets/`, templates in `templates/`, and assets in `assets/`.
- Product cards usually need product image, title, price, compare-at price, vendor, badges, variant state, and accessible link text.
- Section schema should expose practical controls: heading, text, collection, products to show, color scheme, image ratio, button label, and button link.
- Use Liquid filters for escaping, money formatting, image URLs, default values, and conditional rendering.

Liquid product card checklist:

- Use semantic list markup for grids.
- Wrap product image and title in a product link.
- Include alt text from the image or product title.
- Handle sold-out and sale states.
- Keep quick-add controls accessible.

Shopline-style storefront guidance:

- Treat Shopline work as simple storefront templates: banners, product grids, category blocks, feature strips, testimonial sections, cart summaries, and responsive promotional layouts.
- Prefer clean HTML structure and CSS/Tailwind utility classes that can be adapted into the platform.
- Keep e-commerce CTAs visible and consistent across mobile and desktop.
