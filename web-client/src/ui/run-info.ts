export function displayScenarioName(name: string) {
    const scenarioName = document.getElementById("scenario_name");
    if (!scenarioName) return;
    scenarioName.textContent = "Scenario: " + name;
}

// TODO: Possibly use this?
export function displayScenarioPicker({
    scenarios,
    currentlyPickedScenario,
    onChange,
}: {
    scenarios: string[];
    currentlyPickedScenario?: string | null;
    onChange: (scenario: string) => void;
}) {
    const scenarioPicker = document.getElementById("scenario-picker");
    if (!scenarioPicker) return;

    scenarioPicker.innerHTML = ""; // Clear existing picker

    const picker = document.createElement("select");

    // Append currently following client first if provided
    if (
        currentlyPickedScenario &&
        scenarios.includes(currentlyPickedScenario)
    ) {
        console.log("abcabc");
        const option = document.createElement("option");
        option.textContent = currentlyPickedScenario;
        picker.appendChild(option);
    }

    // Append remaining clients, excluding the currently following one
    for (const scenario of scenarios) {
        if (scenario !== currentlyPickedScenario) {
            const option = document.createElement("option");
            option.textContent = scenario;
            picker.appendChild(option);
        }
    }

    picker.onchange = () => {
        onChange(picker.value);
    };

    scenarioPicker.appendChild(picker);
}

export function displayEndStateReached() {
    const stateEnded = document.getElementById("has-ended");
    if (!stateEnded) return;
    stateEnded.textContent = "End State Reached ✅";
}

export function resetEndStateReached() {
    const stateEnded = document.getElementById("has-ended");
    if (!stateEnded) return;
    stateEnded.textContent = "End State Reached ❌";
}
