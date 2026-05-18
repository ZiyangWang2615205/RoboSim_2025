import { AlgorithmClientState } from "../../../server/src/types/index.ts";
import {
    ClientSummary,
    ClientSummaryElement,
    updateClientSummary,
} from "../ui/components/client.js";
import { AlgorithmState } from "../../../server/src/types/index.ts";

const client_list = document.querySelector("#clients");

if (client_list === null) {
    throw new Error("Client list not found");
}

/**
 * Handles server-sent events on the dashboard page.
 */
export class SSEHandler {
    private eventSource: EventSource | null = null;
    private type: "user" | "all";
    private limit: number = 20;
    private complete: boolean = false;
    private sentinel: HTMLDivElement | null = null;

    constructor(type: "user" | "all") {
        this.type = type;
        this.connect();
    }

    private connect() {
        this.eventSource?.close();

        const url = new URL("/api/algorithms", window.location.href);
        url.searchParams.set("type", this.type);
        url.searchParams.set("limit", this.limit.toString());

        this.eventSource = new EventSource(url);

        this.eventSource.addEventListener("message", ({ data }) => {
            console.log(data);
            const info = JSON.parse(data) as AlgorithmState[];

            // Show/hide the "no algorithms" message
            const no_algorithms = document.getElementById("no-algorithms");
            if (no_algorithms) {
                if (info.length === 0) {
                    no_algorithms.style.display = "block";
                } else {
                    no_algorithms.style.display = "none";
                }
            }

            updateClients(info);

            if (!this.sentinel) {
                this.setupInfiniteScroll();
            }
        });

        this.eventSource.addEventListener("complete", () => {
            // In this case, the server sent us the complete list of clients,
            // so increaseLimit() becomes a no-op.
            this.complete = true;
        });
    }

    /**
     * Increase the number of clients to request from the server.
     */
    increaseLimit() {
        if (this.complete) {
            return;
        }

        this.limit += 20;
        this.connect();
    }

    setType(type: "user" | "all") {
        this.type = type;
        this.limit = 20;
        this.complete = false;
        this.connect();
    }

    close() {
        this.eventSource?.close();
    }

    private setupInfiniteScroll() {
        const container = document.getElementById("scroll-container");

        const sentinel = document.createElement("div");
        this.sentinel = sentinel;

        container?.appendChild(sentinel);

        // This observer is used to implement infinite scrolling
        // The callback is called whenever the viewer reaches the end of the page.
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    this.increaseLimit();
                }
            }
        });

        // Give the browser a chance to render the elements before detecting
        // scroll events.
        setTimeout(() => observer.observe(sentinel));
    }
}

/**
 * Updates the list of clients on the dashboard page. Clients with the same ID
 * will be updated rather than replaced completely.
 */
function updateClients(new_clients: AlgorithmState[]) {
    if (!client_list) return;

    const clients = client_list.querySelectorAll(
        "client-summary",
    ) as NodeListOf<ClientSummaryElement>;

    console.log(clients);

    if (clients.length === 0) {
        for (const client of new_clients) {
            client_list.appendChild(createSummary(client));
        }

        return;
    }

    let current_index = 0,
        replace_index = 0;

    while (replace_index < new_clients.length) {
        const new_client = new_clients[replace_index];

        if (current_index < clients.length) {
            const client = clients[current_index];

            if (client.getAttribute("client-id") === new_client.id) {
                console.log("updating");
                updateSummary(client, new_client);
                current_index++;
                replace_index++;
            } else {
                console.log("appending");
                client_list.insertBefore(createSummary(new_client), client);
                replace_index++;
            }
        } else {
            console.log("appending");
            client_list.appendChild(createSummary(new_client));
            replace_index++;
        }
    }

    for (let i = current_index; i < clients.length; i++) {
        console.log("removing");
        const client = clients[i];
        client.remove();
    }
}

function createSummary({
    id,
    name,
    author,
    state,
    completed,
    failed,
    skipped,
}: AlgorithmState) {
    const element = ClientSummary({
        id,
        properties: `${name} - ${author}`,
        state,
        completed,
        failed,
        skipped,
    });

    if (state !== AlgorithmClientState.Running) {
        element.setCompleted(true);
    }

    return element;
}

function updateSummary(
    element: ClientSummaryElement,
    { id, name, author, state, completed, failed, skipped }: AlgorithmState,
) {
    updateClientSummary(element, {
        id,
        properties: `${name} - ${author}`,
        state,
        completed,
        failed,
        skipped,
    });

    if (state !== AlgorithmClientState.Running) {
        element.setCompleted(true);
    }
}
