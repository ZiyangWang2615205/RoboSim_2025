import "./styles/auth.css";

// bind with event listener
const usernameInput = document.getElementById("username") as HTMLInputElement;
const passwordInput = document.getElementById("password") as HTMLInputElement;
const loginButton = document.getElementById("login-btn") as HTMLButtonElement;
const registerText = document.querySelector("#successful-register") as HTMLElement;

const params = new URLSearchParams(window.location.search);
console.log(params.get("register"));

if (params.get("register") === "successful") {
    registerText.style.display = "block";
}

loginButton.addEventListener("click", async (event) => {
    loginButton.disabled = true; // avoid many times submit
    try {
        event.preventDefault(); // prevent auto refresh
        const username = usernameInput.value;
        const password = passwordInput.value;
        // check username and password have value
        if (!username || !password) {
            popup("Please fill in all fields");
            return;
        }
        // attempt to fetch login api
        const response = await fetch("/api/auth/login", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });
        // respone without 200 status code
        if (!response.ok) {
            console.log(response);
            popup("Invalid Username or Password");
        } else {
            window.location.href = `/dashboard/`; // redirect to the dashboard
        }
    } catch (error) {
        alert(error);
    } finally {
        loginButton.disabled = false; // recovery
    }
});

function popup(text: string){
    console.error(text);
    const popupText = document.getElementById("popupText");
    popupText!.innerText = text;
    return;
}
