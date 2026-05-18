import { loadTemplate, createElement, updateSlots } from "./utils";
import "./icons/ellipses";
import { AlgorithmClientState } from "../../../../server/src/types/index.ts";
import { Spinner } from "./icons/spinner";
import { TickIcon } from "./icons/tick";
import { CrossIcon } from "./icons/cross";

const template = await loadTemplate("/components/client.html");

export class ClientSummaryElement extends HTMLElement {
    static observedAttributes = ["client-id"];

    constructor() {
        super();

        const clone = template.content.cloneNode(true);
        const shadowRoot = this.attachShadow({ mode: "open" });
        shadowRoot.appendChild(clone);
    }

    connectedCallback() {
        if (this.shadowRoot) {
            const menu = this.shadowRoot.querySelector(
                ".menu",
            ) as HTMLDivElement;

            const button = this.shadowRoot.querySelector("#menu-button");

            button?.addEventListener("click", () => {
                menu?.classList.toggle("hidden");
            });

            menu?.addEventListener("blur", () => {
                menu?.classList.add("hidden");
            });

            // Handle click outside element
            window.addEventListener("click", (event) => {
                if (event.target !== this) {
                    menu?.classList.add("hidden");
                }
            });

            // Handle click in element but outside menu
            this.shadowRoot.addEventListener("click", (event) => {
                if (
                    !menu?.contains(event.target as Node) &&
                    !button?.contains(event.target as Node)
                ) {
                    menu?.classList.add("hidden");
                }
            });
        }
    }

    attributeChangedCallback(attr: string, _: string, newValue: string) {
        if (attr === "client-id") {
            if (!this.shadowRoot) return;

            const summary_links =
                this.shadowRoot.querySelectorAll(".summary-link");

            for (const link of summary_links) {
                link.setAttribute("href", `/summary/${newValue}`);
            }

            const follow_links =
                this.shadowRoot.querySelectorAll(".follow-link");

            for (const link of follow_links) {
                link.setAttribute("href", `/follow/${newValue}`);
            }
        }
    }

    public setCompleted(completed: boolean) {
        if (this.shadowRoot) {
            const link = this.shadowRoot.querySelector(".follow-link");
            if (completed) {
                link?.classList.add("hidden");
            } else {
                link?.classList.remove("hidden");
            }
        }
    }
}

customElements.define("client-summary", ClientSummaryElement);

export interface ClientSummaryProps {
    /**
     * The id of the algorithm client
     */
    id: string;
    /**
     * Some text displaying basic information about the Algorithm Client
     * (e.g. its name and author).
     */
    properties: string;
    state: AlgorithmClientState;
    completed: number;
    skipped: number;
    failed: number;
}

/**
 * A HTML element that displays a summary of an Algorithm Client.
 */
export function ClientSummary({
    id,
    properties,
    state,
    completed,
    skipped,
    failed,
}: ClientSummaryProps): ClientSummaryElement {
    const client = createElement("client-summary", {
        properties,
        state: getIcon(state),
        completed: completed.toString(),
        skipped: skipped.toString(),
        failed: failed.toString(),
    }) as ClientSummaryElement;

    client.setAttribute("client-id", id);

    return client;
}

export function updateClientSummary(
    element: ClientSummaryElement,
    { id, properties, state, completed, skipped, failed }: ClientSummaryProps,
) {
    updateSlots(element, {
        properties,
        state: getIcon(state),
        completed: completed.toString(),
        skipped: skipped.toString(),
        failed: failed.toString(),
    });

    if (element.getAttribute("client-id") !== id) {
        element.setAttribute("client-id", id);
    }
}

function getIcon(state: AlgorithmClientState) {
    switch (state) {
        case AlgorithmClientState.Running:
            return Spinner("white");
        case AlgorithmClientState.Completed:
            return TickIcon("#15ff00");
        case AlgorithmClientState.Failed:
            return CrossIcon("#fa2323");
        default:
            throw new Error(`Unknown state: ${state}`);
    }
}
