import { defineStaticElement } from "../utils";

await defineStaticElement("arrow-up-icon", "/components/icons/arrow-up.html");

export function ArrowUpIcon() {
    return document.createElement("arrow-up-icon");
}
