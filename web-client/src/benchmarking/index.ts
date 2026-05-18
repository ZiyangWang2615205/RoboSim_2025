import "../ui/components/navbar";
import "../styles/leaderboard.css";

async function main() {
    // getting current box type and defaulting to type1
    const params = new URLSearchParams(window.location.search);
    const currentType = params.get("type") || "1";

    // setting up the toggle for box types
    const typeToggleButton = document.getElementById("type-toggle-btn");

    if (typeToggleButton) {
        // showing types to switch between
        typeToggleButton.textContent = `Switch to Type ${currentType === "1" ? "2" : "1"}`;
        
        // reloading page with new type in the url
        typeToggleButton.addEventListener("click", () => {
            const newType = currentType === "1" ? "2" : "1";
            window.location.href = `/benchmarking/?type=${newType}`;
        });
    }
}

main();