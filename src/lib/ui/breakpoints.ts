// Mirrors --gh-bp-mobile / --gh-bp-tablet in src/app/tokens.css.
// CSS custom properties can't gate @media queries, so client components
// that need JS-side breakpoint checks (e.g. MobileNav) read these instead.
export const BP_MOBILE = 640;
export const BP_TABLET = 1024;
