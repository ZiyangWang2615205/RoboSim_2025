import { defineStaticElement } from "../utils";

await defineStaticElement(
    "chevron-left-icon",
    "/components/icons/chevron-left.html",
);

export function ChevronLeftIcon() {
    return document.createElement("chevron-left-icon");
}
