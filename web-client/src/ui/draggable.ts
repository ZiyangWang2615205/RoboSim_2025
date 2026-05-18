export function makeDraggable(element: HTMLElement, handle: HTMLElement) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    handle.addEventListener('mousedown', (e: MouseEvent) => {
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;

        // disabled CSS transitions during drag (makes it much more smooth)
        element.style.transition = 'none';

        // made a switch from right-positioned to left-positioned for dragging
        if (element.style.right && !element.style.left) {
            element.style.left = element.getBoundingClientRect().left + 'px';
            element.style.right = 'auto';
        }

        // switch from bottom-positioned to top-positioned for dragging
        if (element.style.bottom && !element.style.top) {
            element.style.top = element.getBoundingClientRect().top + 'px';
            element.style.bottom = 'auto';
        }

        e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isDragging) return;

        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        // keep at least the drag handle visible on screen
        const handleHeight = handle.offsetHeight;
        const minVisibleWidth = 100;

        const minX = -(element.offsetWidth - minVisibleWidth);
        const maxX = window.innerWidth - minVisibleWidth;
        const minY = 0;
        const maxY = window.innerHeight - handleHeight;

        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));

        element.style.left = newX + 'px';
        element.style.top = newY + 'px';
        element.style.position = 'fixed';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        element.style.transition = '';
    });
}
