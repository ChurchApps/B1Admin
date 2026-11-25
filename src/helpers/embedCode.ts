// The snippet a church pastes into its own website to show a B1 page there. B1App serves the /embed/* routes,
// and each embedded page posts { type: "b1-embed-height", height } to its parent as its content resizes.

export type EmbedKind = "giving" | "form" | "calendar";

// The allowed-websites field on the site pages screen; /site/pages#embed-domains focuses it.
export const EMBED_DOMAINS_FIELD_ID = "embed-domains";

// allow: wallet payments (Apple Pay, Google Pay) and the calendar's "Copy ICS Link" need the host page's permission in a cross-origin frame.
const EMBEDS: Record<EmbedKind, { path: (id: string) => string; height: number; allow?: string }> = {
  giving: { path: () => "/embed/donate", height: 900, allow: "payment" },
  form: { path: (id) => "/embed/forms/" + encodeURIComponent(id), height: 800 },
  calendar: { path: (id) => "/embed/calendar/" + encodeURIComponent(id), height: 720, allow: "clipboard-write" }
};

const escapeAttribute = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The script trusts a message only from the B1 site's origin and only resizes the iframe that sent it, so several
// embeds can share a page. It is written without "<", ">" or "&" because website editors often encode those.
const resizeScript = (origin: string) => `<script>
(function () {
  var origin = ${JSON.stringify(origin)};
  if (window["b1Embed:" + origin]) return;
  window["b1Embed:" + origin] = true;
  window.addEventListener("message", function (event) {
    if (event.origin !== origin || !event.data || event.data.type !== "b1-embed-height") return;
    var height = Math.ceil(Number(event.data.height));
    if (!isFinite(height) || Math.sign(height) !== 1) return;
    Array.prototype.forEach.call(document.getElementsByTagName("iframe"), function (frame) {
      if (frame.contentWindow === event.source) frame.style.height = height + "px";
    });
  });
})();
</script>`;

/** siteUrl is the church's B1 site address, e.g. https://grace.b1.church. Returns "" when it is not a usable address. */
export const buildEmbedCode = (siteUrl: string, kind: EmbedKind, title: string, id = ""): string => {
  let origin: string;
  try { origin = new URL(siteUrl).origin; } catch { return ""; }
  if (!/^https?:\/\/[a-z0-9.-]+(:\d+)?$/.test(origin)) return "";
  const embed = EMBEDS[kind];
  const attributes = [
    `src="${escapeAttribute(origin + embed.path(id))}"`,
    `title="${escapeAttribute(title)}"`,
    'loading="lazy"',
    ...(embed.allow ? [`allow="${embed.allow}"`] : []),
    `height="${embed.height}"`,
    'style="width:100%;border:0"'
  ];
  return `<iframe ${attributes.join(" ")}></iframe>\n${resizeScript(origin)}`;
};
