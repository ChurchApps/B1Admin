// The self-host image serves B1Admin under /admin/ (VITE_BASE_PATH), so a root-relative link that bypasses the
// router (a plain href, window.open, location.href) lands on B1App. Prefix those with the app's base path.
export const withBase = (path: string, base: string = import.meta.env.BASE_URL) => base.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
