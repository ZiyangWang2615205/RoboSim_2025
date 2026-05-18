import "../ui/components/navbar.ts";

for (const section_container of document.querySelectorAll(
    ".section-container",
)) {
    section_container
        .querySelector(".section-header")
        ?.addEventListener("click", () => {
            const section = section_container.querySelector(".section");
            const icon = section_container.querySelector("i");

            if (!section || !icon) {
                return;
            }

            if (section.classList.contains("hidden")) {
                section.classList.remove("hidden");
                icon.style.transform = "rotate(180deg)";
            } else {
                section.classList.add("hidden");
                icon.style.transform = "rotate(0deg)";
            }
        });
}

async function getInfo() {
    const displayUsername = document.getElementById("display-username");
    if (!displayUsername) {
        return;
    }
    displayUsername.innerHTML = await fetchUsername();

    const displayName = document.getElementById("display-name");
    if (!displayName) {
        return;
    }
    displayName.innerHTML = await fetchName();

    const tokenText = document.getElementById("token-text");
    if (!tokenText) {
        return;
    }
    tokenText.innerText = await fetchToken();
}

async function fetchUsername() {
    const res = await fetch("/api/account/get-username");
    const data = await res.json();
    return data.username;
}

async function fetchName() {
    const res = await fetch("/api/account/get-name");
    const data = await res.json();
    return data.name;
}

async function fetchToken(){
    const res = await fetch("/api/token");
    const data = await res.text();
    return data;
}

async function updatePassword() {
    const oldPasswordElement = document.getElementById(
        "old-password",
    ) as HTMLInputElement;
    const newPasswordElement = document.getElementById(
        "new-password",
    ) as HTMLInputElement;
    const confirmPasswordElement = document.getElementById(
        "confirm-password",
    ) as HTMLInputElement;

    if (!oldPasswordElement || !newPasswordElement || !confirmPasswordElement) {
        return;
    }

    if (newPasswordElement.value !== confirmPasswordElement.value) {
        alert("Please check password consistency");
        return;
    }

    const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            oldPassword: oldPasswordElement.value,
            newPassword: newPasswordElement.value,
        }),
    });

    if (!res.ok) {
        alert("Cannot change password. Please try again later.");
    } else {
        alert("Successfully changed password");
        oldPasswordElement.value = "";
        newPasswordElement.value = "";
        confirmPasswordElement.value = "";
    }
}

document
    .querySelector("#update-password")
    ?.addEventListener("click", updatePassword);

async function updateName() {
    const newNameElement = document.getElementById(
        "new-name",
    ) as HTMLInputElement;
    if (!newNameElement) {
        alert("Please input the new name");
    } else {
        const res = await fetch("/api/account/change-name", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                newName: newNameElement.value,
            }),
        });
        if (!res.ok) {
            alert("Cannot change name. Please try again later.");
        } else {
            alert("Successfully changed name");
            newNameElement.value = "";
            window.location.reload(); // reload the page to refresh updated name
        }
    }
}

document.querySelector("#update-name")?.addEventListener("click", updateName);

async function updateUsername() {
    const newUsernameElement = document.getElementById(
        "new-username",
    ) as HTMLInputElement;
    if (!newUsernameElement) {
        alert("Please input the required attribute");
    } else {
        const res = await fetch("/api/account/change-username", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                newUsername: newUsernameElement.value,
            }),
        });

        if (!res.ok) {
            alert("Cannot change username. Please try again later.");
        } else {
            alert("Successfully changed username");
            newUsernameElement.value = "";
            window.location.reload(); // reload the page to refresh the username
        }
    }
}

document
    .querySelector("#update-username")
    ?.addEventListener("click", updateUsername);

async function copyToken(){
    /*let token = document.getElementById("token-text")?.innerText
    if (!token) return
    try {
        await navigator.clipboard.writeText(token);
      } catch (err) {
        alert('Failed to copy: '+ err);
      }    */
    const token = document.getElementById("token-text")?.innerText?.trim();
    if (!token) {
        alert("No token found");
        return;
    }
    try {
        //if running locally then keep original method
        if (window.isSecureContext && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(token);
        } else {
            //if not, create a new place to copy it
            const textarea = document.createElement("textarea");
            textarea.value = token;
            textarea.setAttribute("readonly", "");
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            textarea.style.top = "0";
            document.body.appendChild(textarea);

            //make sure textarea has been chosen
            textarea.focus();
            textarea.select();

            //make sure it copy fully
            textarea.setSelectionRange(0, textarea.value.length);

            const ok = document.execCommand("copy");
            //clear text area
            document.body.removeChild(textarea);

            if (!ok) {
                throw new Error("Fallback copy failed");
            }
        }
    } catch (err) {
        console.error("Failed to copy:", err);
        alert("Failed to copy token. Please copy it manually.");
    }
}

document
    .querySelector("#copy-token")?.addEventListener("click", copyToken);

getInfo();
