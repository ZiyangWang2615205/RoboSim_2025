import { loadTemplate } from "./utils";
import { ChevronLeftIcon } from "./icons/chevron-left";
import { ChevronRightIcon } from "./icons/chevron-right";
import { setURLParams } from "../../utils";

const template = await loadTemplate("/components/pagination.html");

customElements.define(
    "pagination-bar",
    class extends HTMLElement {
        static observedAttributes = ["page", "total-pages"];

        constructor() {
            super();

            const clone = template.content.cloneNode(true);
            const shadowRoot = this.attachShadow({ mode: "open" });
            shadowRoot.appendChild(clone);
        }

        attributeChangedCallback(attr: string, _old: string, _new: string) {
            if (attr === "page" || attr === "total-pages") {
                this.renderPages();
            }
        }

        private renderPages() {
            const page_attr = this.getAttribute("page");
            const total_attr = this.getAttribute("total-pages");
            const container = this.shadowRoot?.querySelector("#container");

            console.log(page_attr, total_attr, container);

            if (page_attr === null || total_attr === null || !container) {
                return;
            }

            const page = Number.parseInt(page_attr);
            const total_pages = Number.parseInt(total_attr);

            const left_arrow = createArrowButton(page, "left", total_pages);
            const page_buttons = createPageButtons(page, total_pages);
            const right_arrow = createArrowButton(page, "right", total_pages);

            container.replaceChildren(left_arrow, ...page_buttons, right_arrow);
        }
    },
);

function createPageButtons(page: number, total_pages: number): HTMLElement[] {
    if (total_pages <= 7) {
        return Array.from({ length: total_pages }, (_, i) =>
            createPageButton(i + 1, page === i + 1),
        );
    }

    const elements = [];

    elements.push(createPageButton(1, page === 1));
    elements.push(createPageButton(2, page === 2));

    if (page < 5) {
        // 1, 2, 3, 4, 5, ..., n-1, n
        elements.push(createPageButton(3, page === 3));
        elements.push(createPageButton(4, page === 4));
        elements.push(createPageButton(5, page === 5));

        elements.push(createEllipses());

        elements.push(createPageButton(total_pages - 1, false));
        elements.push(createPageButton(total_pages, false));
    } else if (total_pages - page < 4) {
        // 1, 2, ..., n-4, n-3, n-2, n-1, n
        elements.push(createEllipses());

        for (let i = total_pages - 4; i <= total_pages; i++) {
            elements.push(createPageButton(i, page === i));
        }
    } else {
        // 1, 2, ..., p - 1, p, p + 1, ..., n-1, n
        elements.push(createEllipses());

        elements.push(createPageButton(page - 1, false));
        elements.push(createPageButton(page, true));
        elements.push(createPageButton(page + 1, false));

        elements.push(createEllipses());

        elements.push(createPageButton(total_pages - 1, false));
        elements.push(createPageButton(total_pages, false));
    }

    console.log(elements);
    console.assert(
        elements.filter((e) => e.localName === "button").length === 7,
    );

    return elements;
}

function createArrowButton(
    page: number,
    direction: "left" | "right",
    total_pages: number,
): HTMLElement {
    const element = document.createElement("button");

    if (direction === "left") {
        element.appendChild(ChevronLeftIcon());

        if (page === 1) {
            element.classList.add("disabled");
            element.disabled = true;
        } else {
            element.addEventListener("click", () => {
                setURLParams(
                    {
                        page: (page - 1).toString(),
                    },
                    true,
                );
            });
        }
    } else {
        element.appendChild(ChevronRightIcon());

        if (page === total_pages) {
            element.classList.add("disabled");
            element.disabled = true;
        } else {
            element.addEventListener("click", () => {
                setURLParams(
                    {
                        page: (page + 1).toString(),
                    },
                    true,
                );
            });
        }
    }

    return element;
}

function createPageButton(page: number, current: boolean): HTMLElement {
    const element = document.createElement("button");

    element.textContent = page.toString();

    if (current) {
        element.classList.add("selected");
        element.disabled = true;
    } else {
        element.addEventListener("click", () => {
            setURLParams(
                {
                    page: page.toString(),
                },
                true,
            );
        });
    }

    return element;
}

function createEllipses(): HTMLElement {
    const element = document.createElement("p");
    element.textContent = "...";
    return element;
}
