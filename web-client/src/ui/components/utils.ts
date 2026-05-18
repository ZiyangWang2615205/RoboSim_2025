const parser = new DOMParser();

/**
 * Read and parse a template from a HTML file.
 *
 * @param file The path to the HTML file, relative to the `public` directory
 *   (e.g. `/components/client.html`).
 */
export async function loadTemplate(file: string): Promise<HTMLTemplateElement> {
    const content = await fetch(file, { credentials: "same-origin" });
    const text = await content.text();

    return parser
        .parseFromString(text, "text/html")
        .querySelector("template") as HTMLTemplateElement;
}

/**
 * A shortcut to create `<span slot="slotName"></span>`. These allow you to
 * fill slots in a template.
 */
export function createSlot(slotName: string) {
    const slot = document.createElement("span");
    slot.setAttribute("slot", slotName);
    return slot;
}

/**
 * Define a custom HTML element from a template file.
 *
 * @param tagName The name of the custom element.
 * @param file The path to the HTML file, relative to the `public` directory.
 */
export async function defineStaticElement(tagName: string, file: string) {
    const template = await loadTemplate(file);

    customElements.define(
        tagName,
        class extends HTMLElement {
            constructor() {
                super();

                const clone = template.content.cloneNode(true);
                const shadowRoot = this.attachShadow({ mode: "open" });
                shadowRoot.appendChild(clone);
            }
        },
    );
}

/**
 * Create an HTML element with slots. A thin wrapper around
 * `document.createElement()`.
 *
 * @param tagName The name of the custom element.
 * @param slots A map of slot names to content.
 *
 * @example
 * const element = createElement("my-custom-element", {
 *   slot_1: "foo",
 *   slot_2: document.createElement("br"),
 * })
 *
 * // Results in:
 * // <my-custom-element>
 * //   <span slot="slot_1">foo</span>
 * //   <span slot="slot_2">
 * //     <br />
 * //    </span>
 * // </my-custom-element>
 */
export function createElement(
    tagName: string,
    slots: { [key: string]: string | HTMLElement } = {},
): HTMLElement {
    const element = document.createElement(tagName);

    for (const [name, content] of Object.entries(slots)) {
        const slot = createSlot(name);

        if (typeof content === "string") {
            slot.textContent = content;
        } else {
            slot.appendChild(content);
        }

        element.appendChild(slot);
    }

    return element;
}

export function updateSlots(
    element: HTMLElement,
    slots: { [key: string]: string | HTMLElement } = {},
) {
    for (const [name, content] of Object.entries(slots)) {
        const slot = element.querySelector(`span[slot="${name}"]`);

        if (slot) {
            if (typeof content === "string") {
                if (slot.textContent !== content) {
                    slot.textContent = content;
                }
            } else {
                if (slot.firstChild !== content) {
                    slot.replaceChildren(content);
                }
            }
        } else {
            throw new Error(`Slot ${name} not found`);
        }
    }
}
