import { defineStaticElement } from "../utils";

await defineStaticElement("cross-icon", "/components/icons/cross.html");

export function CrossIcon(color: string) {
    const element = document.createElement("cross-icon");

    element.style.color = color;

    return element;
}
