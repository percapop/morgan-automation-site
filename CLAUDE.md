# CLAUDE.md

One-page static website for **Morgan Automation**, a one-person AI automation business for small food and trade businesses in Europe. Hosted on GitHub Pages. The page's main job is to get visitors to use the contact form.

## Stack and constraints

- Plain HTML, CSS and vanilla JavaScript. No frameworks, animation libraries, package managers or build step.
- Files: `index.html`, `style.css`, `script.js`, `halftone.js`, `i18n.js`, `lang/*.js` (translations), `privacy.html` (separate privacy page, English only, linked from the main footer), `assets/brand/` (logo + icon), `assets/fonts/` (self-hosted woff2, plus chunked Noto Sans JP/SC). Relative paths only.
- The page must work with JavaScript off: all content visible, accordion panels open, contact form posts normally to Web3Forms (which shows its own confirmation page). An inline script in `<head>` adds a `js` class and removes it after 3s if `script.js` never ran.
- No runtime requests to other domains, with one approved exception: the contact form submits to `https://api.web3forms.com/submit`. Fonts are self-hosted: Fraunces (headings), DM Sans (body). Never use Inter, Roboto or Open Sans, and never link Google Fonts or other CDNs (GDPR). If Japanese text is added, self-host Noto Sans JP or BIZ UDGothic for it.

## Never add

- Secrets, API keys, tokens or credentials.
- Analytics, tracking pixels, third-party scripts, chat widgets or embeds.
- Cookies or browser storage.
- Any other form backend or third-party service without asking first. The contact form uses Web3Forms (owner-approved): `script.js` posts it as JSON with `fetch`, the visitor stays on the page and sees "Thanks, I'll reply within one working day" or an error with the email address. Field names are fixed: `access_key`, `subject`, `botcheck` (honeypot), `name`, `company`, `email`, `message`. The Web3Forms access key in `index.html` is public by design, not a secret; never add any other keys or tokens.
- Never submit the real form while testing (it emails the owner). Mock `fetch` instead.
- **Keep `privacy.html` in sync with reality.** If anything that touches personal data changes (form service, inbox provider, hosting, adding analytics, cookies or embeds), update the privacy page and its "Last updated" date in the same change.
- New sections, testimonials, client logos, stats or prices that the owner hasn't supplied.

## Content

- **All visible text comes from `content.md`.** Change copy there first, then in the HTML.
- Missing real content goes in a `<!-- TODO: … -->` comment in the HTML, never as visible placeholder text or a placeholder box.
- Don't name any client (e.g. Hokkai) without permission noted in `content.md`.
- Voice: "I", not "we". Concrete verbs (find, send, sort, track, answer, build). Never use: unlock, empower, seamless, leverage, streamline, robust, cutting-edge, elevate, harness, delve.
- Every button says "Let's talk" (owner's choice) and leads to the contact section, except the form's submit button, which says "Send my note". Never "Learn more" / "Get started". At most 2 CTAs per section.
- Subtitles are one sentence; longer text goes in body copy.
- Brand name in text is **Morgan Automation**; the logo artwork reads "Morgan Automations" (open question). Email is exactly `perseus@morganautomations.com`.

## Translations

- Languages: English (source, in `index.html`), Dutch, German, French, Japanese and Simplified Chinese. Switcher top right in the header; the choice lives in the URL (`?lang=nl`), never in cookies or storage.
- `i18n.js` finds text blocks (headings, paragraphs, list items, labels, button text, `aria-label`s, title, meta description) and looks each one up by its **English text** in `lang/<code>.js`. Inline tags (`<strong>`, `<a class="inline-link">`) are part of the key and must be kept in translations.
- **When you change English text in `index.html`, update the same key in all five `lang/*.js` files.** Missing keys fall back to English and are logged in the console as `[i18n] missing`.
- Mark text that must never be translated with `data-i18n-skip` (email address, ©).
- Runtime strings in `script.js` go through `t()`; add their English text as keys too.
- Japanese/Chinese use self-hosted Noto Sans JP / SC, split into unicode-range chunks and loaded only when that language is chosen (`assets/fonts/noto-sans-*.css`).
- Register: Dutch informal "je", German "Sie", French "vous" (non-breaking space before ? ! : ;), Japanese です/ます, Chinese 您. Translations are a draft: a native speaker should review them before launch.
- Every language must fit at 320px with no horizontal scroll (test them all after copy changes).

## Design rules

- Palette (tokens at the top of `style.css`), nothing else: `--paper #efe7da` (warm beige background), `--red #f03737` (accent + primary ink), `--coral #eb7b5c` (duotone ink), `--lilac #bb8dc1` (sparingly), `--green #2f8a5b` (scroll-progress bar and the form's success marker only), `--ink #2a1f29` (body text) with its tints, and white only for text on red buttons.
- Contrast: `--red` on paper is ~3.2:1, so red is only for large headings (24px+, or 19px+ bold), buttons, icons, underlines and focus rings, never body text. Buttons are "flow buttons" (a plain-CSS port of the shadcn FlowButton component; do not add React/Tailwind for it): 19px bold, solid pill at rest so it stands out from the background; on hover a circle of a contrasting colour fills from the centre and the arrows swap. Variants: default (red → plum), `.button-plum` (plum → red), `.button-on-dark` (red → paper, for plum backgrounds). Markup: in-arrow, `.flow-text`, `.flow-fill`, out-arrow. `--coral` and `--lilac` are decoration only (borders, markers, the halftone). Links are ink text with a red underline.
- Halftone (`halftone.js`, WebGL, no libraries): riso print of `--red` + `--coral`, with a little `--lilac` as a light third ink (`tritone`), multiplied through `--paper`. All settings and presets (`riso`, `lilac`, `duo`) are at the top of the file. It sits behind the hero only, is absolutely positioned (no layout shift), never fades in on scroll, prints no ink behind the text block (`data-calm`), pauses offscreen, and is a static frame under reduced motion. Without WebGL the plain paper shows.
- No CSS gradients, no box-shadows (use 1px borders), flat solid buttons.
- One background change only where content changes: the contact section (ink). No alternating section backgrounds. The footer is paper, ruled off with a 1px ink line.
- The logo mark is inline SVG in palette colours. `assets/brand/*.png` are still the old navy/blue artwork (only used for og:image and apple-touch-icon until re-exported).
- Type: Fraunces 600 for headings, DM Sans for body. Hero `--fs-hero` (36→72px) is about 2× h2. Headings line-height 1.1–1.3 with −0.02em on large ones; body 1.6–1.8.
- Layout: each section has its own structure (split + accordion, carousel, definition rows, prose, sticky box + FAQ, two-column form). Never three or more identical card grids. Text is left-aligned.
- Hero is sized to its content: what, for whom, one action. No 100vh, no hero image unless it's a real photo of the work.
- Icons: Lucide only, inline SVG symbols at the top of `<body>`, 20px, stroke 2. No emoji as icons.

## Motion

- No entrance or scroll-reveal animations. Content is never hidden waiting for JS or scroll.
- Allowed: 150ms hover transitions, arrow nudge, accordion fold, carousel drag + "Drag" cursor (mouse only), the header scroll-progress tracker (0% at top, 100% when `#contact` arrives) and a small palette-only confetti burst on reaching 100% and on a valid form submit (`confetti()` in `script.js`). Three small decorative creatures tell a caterpillar → cocoon → butterfly story down the page (inline SVG + CSS keyframes, palette only, `aria-hidden`): a caterpillar crawling along the line above "Find new customers", a cocoon hanging on silk from the top rule of "How a project runs", and a butterfly fluttering under the email in the contact section. Keep them tiny and quiet; they stop under reduced motion. All of it is off under `prefers-reduced-motion`. Timings are in `style.css` section 8.

## Accessibility and mobile

- Mobile-first CSS; no horizontal scroll at 320–375px.
- WCAG 2.2 AA: one `<h1>`, landmarks, visible focus, skip link, labelled form fields, 4.5:1 text contrast.
- Every link, button and field is at least 44×44px on mobile.
- Every `href="#contact"` link lands with the whole form, including "Send my note", on screen (`revealForm()` in `script.js`); an empty submit scrolls to the first empty field while keeping the button visible. Re-check at 375×667 after changing the form.

## Checking work

No tests or build. Before finishing a change:

1. Serve locally (`python -m http.server`) and check at 375px and 1280px. The first 375×667 screen must show what, for whom and the hero button.
2. Check with JavaScript off and with reduced motion on.
3. Test the contact form with `fetch` mocked: success shows the thank-you and clears the form, failure shows the error with the email link, an empty form never sends, a ticked honeypot never sends.
4. Validate HTML (https://validator.w3.org/) and run Lighthouse (aim for 95+).
