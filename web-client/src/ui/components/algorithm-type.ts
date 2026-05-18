import { loadTemplate } from "./utils";

const template = await loadTemplate("/components/algorithm-type.html");

customElements.define(
    "algorithm-type-picker",
    class extends HTMLElement {
        constructor() {
            super();

            const clone = template.content.cloneNode(true);
            const shadowRoot = this.attachShadow({ mode: "open" });
            shadowRoot.appendChild(clone);
        }

        connectedCallback() {
            const type =
                new URLSearchParams(window.location.search).get("type") ??
                "user";

            this.setSelected(type);

            this.shadowRoot
                ?.querySelector("#user")
                ?.addEventListener("click", () => {
                    this.dispatchEvent(
                        new CustomEvent("algorithm-type", {
                            composed: true,
                            detail: "user",
                        }),
                    );

                    this.setSelected("user");
                });

            this.shadowRoot
                ?.querySelector("#all")
                ?.addEventListener("click", () => {
                    this.dispatchEvent(
                        new CustomEvent("algorithm-type", {
                            composed: true,
                            detail: "all",
                        }),
                    );

                    this.setSelected("all");
                });
        }

        setSelected(type: string) {
            if (type === "user") {
                this.shadowRoot
                    ?.querySelector(`#user`)
                    ?.classList.add("selected");

                this.shadowRoot
                    ?.querySelector(`#all`)
                    ?.classList.remove("selected");
            } else {
                this.shadowRoot
                    ?.querySelector(`#all`)
                    ?.classList.add("selected");

                this.shadowRoot
                    ?.querySelector(`#user`)
                    ?.classList.remove("selected");
            }
        }
    },
);
