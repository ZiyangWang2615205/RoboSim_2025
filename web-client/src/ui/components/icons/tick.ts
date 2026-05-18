import { defineStaticElement } from "../utils";

await defineStaticElement("tick-icon", "/components/icons/tick.html");

export function TickIcon(color: string) {
    const element = document.createElement("tick-icon");

    element.style.color = color;

    return element;
}
