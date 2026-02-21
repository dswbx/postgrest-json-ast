import { createHighlighter } from "shiki";

const highlighterPromise = createHighlighter({
   themes: ["andromeeda", "github-dark", "dracula"],
   langs: ["json", "http", "sql"],
});

const themes = {
   json: "dracula",
   http: "github-dark",
   sql: "github-dark",
} as const;

export async function highlight(code: string, lang: keyof typeof themes) {
   const hl = await highlighterPromise;
   return hl.codeToHtml(code, { lang, theme: themes[lang] });
}
