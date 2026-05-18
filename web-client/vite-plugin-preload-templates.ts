import { HtmlTagDescriptor, Plugin } from "vite";

/**
 * A Vite plugin that inserts `<link rel="preload">` tags for HTML files in
 * `/public/components/` that are used to define custom web components. This is
 * useful because we know that the templates will be loaded as soon as the page
 * is loaded (in order to define the custom web components), but the browser
 * is unaware of this until it executes the JavaScript file that loads the
 * template and defines the web component (which will happen after the page is
 * loaded). Preloading the templates allow browsers to start fetching templates
 * before the page has been loaded.
 */
export default function preloadTemplates(): Plugin {
    // A map from modules to the template files they import
    const templateFiles: Map<string, Set<string>> = new Map();

    // A map from HTML files to the template files they import
    const templateMap: Map<string, Set<string>> = new Map();

    return {
        name: "vite-plugin-preload-templates",

        moduleParsed(info) {
            const id = info.id;
            const code = info.code;

            if (code === null) {
                return;
            }

            if (!id.endsWith("js") && !id.endsWith("ts")) {
                return;
            }

            const matches: Set<string> = new Set();

            // Find all calls to `loadTemplate()`
            const loadTemplateMatches = code.matchAll(
                /loadTemplate\(["']([^"']+)["']\)/g,
            );

            for (const [_, file] of loadTemplateMatches) {
                matches.add(file);
            }

            // Find all calls to `defineStaticElement()`
            const staticElementMatches = code.matchAll(
                /defineStaticElement\(["'][^"']+["'], ["']([^"']+)["']\)/g,
            );

            for (const [_, file] of staticElementMatches) {
                matches.add(file);
            }

            if (matches.size > 0) {
                templateFiles.set(id, matches);
            }
        },

        buildEnd() {
            // We wait for building to end because we want the `importers`
            // property of modules to be populated, which we can only guarantee
            // after every module has been parsed.
            for (const [file, templates] of templateFiles) {
                const explored: Set<string> = new Set();

                // A recursive function to find all modules importing a given
                // module, and all modules importing them, and so on. Aims to
                // populate `importMap`.
                const getImporters = (id: string) => {
                    if (explored.has(id)) {
                        return;
                    }
                    explored.add(id);

                    const templateSet = templateMap.get(id);
                    if (templateSet) {
                        for (const template of templates) {
                            templateSet.add(template);
                        }
                    } else {
                        templateMap.set(id, new Set(templates));
                    }

                    const info = this.getModuleInfo(id);

                    if (info === null) {
                        console.log(`No info for file: ${id}`);
                    } else {
                        for (const importer_id of info.importers) {
                            getImporters(importer_id);
                        }
                    }
                };

                getImporters(file);
            }
        },

        // Transforms all "main" HTML files
        transformIndexHtml(html, { filename }) {
            const templates = templateMap.get(filename);

            if (!templates) {
                return;
            }

            // Insert the preload tags for each loaded template
            return {
                html,
                tags: Array.from(templates).map(
                    (file): HtmlTagDescriptor => ({
                        tag: "link",
                        attrs: {
                            rel: "preload",
                            crossorigin: "anonymous",
                            href: file,
                            as: "fetch",
                        },
                        injectTo: "head",
                    }),
                ),
            };
        },
    };
}
