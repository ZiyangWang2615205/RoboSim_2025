import { defineStaticElement } from "../utils";

await defineStaticElement("spinner-icon", "/components/icons/spinner.html");

export function Spinner(color: string) {
    const element = document.createElement("spinner-icon");

    element.style.color = color;

    return element;
}
