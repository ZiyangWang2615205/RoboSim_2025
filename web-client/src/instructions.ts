import "./styles/instructions.css";
import "./ui/components/navbar";
import { marked } from "marked";

const tabs = document.querySelectorAll<HTMLButtonElement>(".doc-tab");
const content = document.getElementById("doc-content") as HTMLDivElement | null;
const downloadLink = document.getElementById("download-link") as HTMLAnchorElement | null;

// map URL doc keys to markdown file paths
const docMap: Record<string, string> = {
  "getting-started": "/docs/getting-started.md",
  "submission-format": "/docs/submission-format.md",
  faq: "/docs/FAQ.md",
};

// convert heading text into a URL-friendly anchor id
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

// custom marked renderer so markdown headings get stable id attributes
const renderer = new marked.Renderer();
renderer.heading = ({ tokens, depth }) => {
  const text = tokens.map((token) => token.raw).join("").trim();
  const id = slugify(text);
  return `<h${depth} id="${id}">${text}</h${depth}>`;
};

marked.setOptions({
  breaks: true,
  gfm: true,
  renderer,
});

// update the browser url without reloading the page
function updateUrl(docKey: string, hash = "") {
  const url = new URL(window.location.href);
  url.searchParams.set("doc", docKey);
  url.hash = hash;
  window.history.replaceState({}, "", url.toString());
}

// update active button styling based on the selected doc path
function setActiveTab(path: string) {
  tabs.forEach((tab) => {
    const tabPath = tab.dataset.doc;
    if (tabPath === path) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });
}

// scroll to a heading if the url contains a hash like #installation
function scrollToHash() {
  const hash = window.location.hash;
  if (!hash) return;

  const targetId = decodeURIComponent(hash.slice(1));
  const targetElement = document.getElementById(targetId);

  if (targetElement) {
    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

// Load and render a markdown document
async function loadDoc(path: string, docKey?: string) {
  if (!content) return;

  content.innerHTML = "<p>Loading documentation...</p>";

  try {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Failed to load document: ${path}`);
    }

    const markdownText = await response.text();
    const renderedHtml = marked.parse(markdownText) as string;

    content.innerHTML = renderedHtml;

    if (downloadLink) {
      downloadLink.href = path;
    }

    setActiveTab(path);

    if (docKey) {
      updateUrl(docKey, window.location.hash);
    }

    // wait one frame to make sure headings are in the DOM before scrolling
    requestAnimationFrame(() => {
      scrollToHash();
    });
  } catch (error) {
    console.error(error);
    content.innerHTML =
      "<p>Failed to load documentation. Please try again later.</p>";
  }
}

// handle clicks on the top document buttons
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const path = tab.dataset.doc;
    if (!path) return;

    let matchedKey: string | undefined;

    for (const [key, value] of Object.entries(docMap)) {
      if (value === path) {
        matchedKey = key;
        break;
      }
    }

    // clear the hash when switching docs from the top buttons
    window.history.replaceState({}, "", `${window.location.pathname}?doc=${matchedKey ?? ""}`);

    loadDoc(path, matchedKey);
  });
});

// handle clicks on links inside rendered markdown content
document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const link = target.closest("a");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href) return;

  const url = new URL(href, window.location.origin);

  // intercept link like /instructions?doc=...
  if (url.pathname === "/instructions" && url.searchParams.has("doc")) {
    event.preventDefault();

    const docKey = url.searchParams.get("doc");
    if (!docKey) return;

    const path = docMap[docKey];
    if (!path) return;

    // Preserve hash such as #installation or #common-errors
    window.history.replaceState({}, "", url.toString());

    loadDoc(path, docKey);
  }
});

// on initial page load, read ?doc=... from the url
const initialDocKey = new URLSearchParams(window.location.search).get("doc");

if (initialDocKey && docMap[initialDocKey]) {
  loadDoc(docMap[initialDocKey], initialDocKey);
} else {
  loadDoc("/docs/getting-started.md", "getting-started");
}
