import { defineStaticElement } from "../utils";

await defineStaticElement(
    "arrow-down-icon",
    "/components/icons/arrow-down.html",
);

export function ArrowDownIcon() {
    return document.createElement("arrow-down-icon");
}
