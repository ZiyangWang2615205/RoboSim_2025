export function formatDuration(milliseconds: number): string {
    const seconds = milliseconds / 1000;

    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    } else {
        return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    }
}

/**
 * Set the query parameters of the current URL, without reloading the page.
 * You should make sure that if the user loads into the page with the same
 * parameters, the page will load in the correct state.
 *
 * @param params The parameters to set.
 * @param reload Whether to reload the page.
 *
 * @example
 * // URL before: https://example.com/x
 *
 * setParams({ a: "1", b: "2" });
 *
 * // URL after: https://example.com/x?a=1&b=2
 */
export function setURLParams(
    params: { [key: string]: string | null },
    reload: boolean = false,
) {
    const url = new URL(window.location.href);

    for (const [key, value] of Object.entries(params)) {
        if (value === null) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    }

    if (!reload) {
        history.replaceState({}, "", url);
    } else {
        window.location.href = url.href;
    }
}
