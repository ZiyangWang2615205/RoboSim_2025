import { AlgorithmInfo } from "../../../server/src/types";

/**
 * Show an error popup on the screen
 *
 * @param error The error message
 */
export function showError(error: string) {
    let error_element = document.getElementById("error");
    let error_content = error_element?.querySelector("#error-content");

    if (error_element && error_content) {
        error_content.textContent = error;
        error_element.style.bottom = "4%";
    }
}

/**
 * Stop showing the error popup, if there is one on the screen.
 */
export function clearError() {
    let error_element = document.getElementById("error");

    if (error_element) {
        error_element.style.bottom = "-10%";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    let close_error = document.getElementById("close-error");

    if (close_error) {
        close_error.addEventListener("click", () => {
            clearError();
        });
    }
});

/**
 * Displays the algorithm name and author
 */
export function showInfo(info: AlgorithmInfo | null) {
    let algorithm_name = document.getElementById("algorithm-name");

    if (algorithm_name) {
        if (info) {
            algorithm_name.textContent = info.name;
        } else {
            algorithm_name.textContent = "";
        }
    }

    let algorithm_author = document.getElementById("algorithm-author");

    if (algorithm_author) {
        if (info) {
            algorithm_author.textContent = info.author;
        } else {
            algorithm_author.textContent = "";
        }
    }
}
