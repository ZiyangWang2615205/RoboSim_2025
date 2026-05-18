import { defineStaticElement } from "../utils";

await defineStaticElement(
    "chevron-right-icon",
    "/components/icons/chevron-right.html",
);

export function ChevronRightIcon() {
    return document.createElement("chevron-right-icon");
}
