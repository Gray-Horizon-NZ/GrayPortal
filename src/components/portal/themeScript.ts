// Inline blocking script — runs before paint so the stored theme preference
// never flashes to the default before snapping to the real value (same
// technique next-themes uses). Reads a single localStorage key; any error
// (private browsing, storage disabled) silently falls back to dark.
export const PORTAL_THEME_STORAGE_KEY = "gh-portal-theme";

export const PORTAL_THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${PORTAL_THEME_STORAGE_KEY}");var el=document.querySelector(".ghp-root");if(el&&(t==="light"||t==="dark")){el.setAttribute("data-portal-theme",t);}}catch(e){}})();`;
