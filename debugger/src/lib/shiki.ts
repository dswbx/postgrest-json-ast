import { createHighlighter } from "shiki";

const highlighterPromise = createHighlighter({
   themes: ["andromeeda", "github-dark", "dracula"],
   langs: ["json", "http"],
});

const themes = {
   json: "dracula",
   http: "github-dark",
};

export async function highlight(code: string, lang: "json" | "http") {
   const hl = await highlighterPromise;
   return hl.codeToHtml(code, { lang, theme: themes[lang] });
}
