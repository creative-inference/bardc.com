/**
 * Simple Masonry Layout Script
 * Adjusts `grid-row-end` based on content height to create a dense packing effect.
 */

function resizeMasonryItem(item) {
    // Get the grid object, its row-gap, and the size of its implicit rows
    const grid = document.querySelector('.masonry-grid');
    if (!grid) return;

    const rowGap = parseInt(window.getComputedStyle(grid).getPropertyValue('gap')) || 0;
    const rowHeight = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-auto-rows')) || 0;

    // We need to access the content inside the item to measure its true height.
    const content = item.querySelector('.masonry-content');
    if (!content) return;

    // Direct image check - if there's an image outside content, include it
    // In our structure, image is outside .masonry-content, so we should measure the whole item's content
    // Actually, .masonry-content has padding, but the image is a sibling.
    // Let's measure the total height of all children.

    // Better approach: Measure the scrollHeight or offsetHeight of the *children wrapper*?
    // In our specific HTML, we have optional <img> then <div class="masonry-content">.
    // The item itself is the container. We can't measure the item's height directly because it's controlled by gridRowEnd.
    // We must measure the inner content.

    // Let's calculate total height of children
    let totalHeight = 0;
    Array.from(item.children).forEach(child => {
        totalHeight += child.getBoundingClientRect().height;
    });

    // The logic:
    // rowSpan = Math.ceil((totalHeight + rowGap) / (rowHeight + rowGap))

    // NOTE: If images are lazy loaded, they might have 0 height initially. 
    // We use ResizeObserver below to handle that.

    const rowSpan = Math.ceil((totalHeight + rowGap) / (rowHeight + rowGap));

    item.style.gridRowEnd = `span ${rowSpan}`;
}

function resizeAllMasonryItems() {
    const allItems = document.querySelectorAll('.masonry-item');
    for (let i = 0; i < allItems.length; i++) {
        resizeMasonryItem(allItems[i]);
    }
}

// Watch for size changes (e.g. images loading)
const observer = new ResizeObserver((entries) => {
    for (let entry of entries) {
        // We observe the children, or the item?
        // If we observe the item, resizing it might trigger infinite loop if we are not careful.
        // But we are changing grid-row-end, which changes height.
        // Safest is to observe the *content* children.
        // For simplistic usage, we can re-run resize on the specific parent item of the changed element.

        const target = entry.target;
        // Find the parent .masonry-item
        const item = target.closest('.masonry-item');
        if (item) {
            resizeMasonryItem(item);
        }
    }
});

function observeItems() {
    const allItems = document.querySelectorAll('.masonry-item');
    allItems.forEach(item => {
        // Observe direct children (Image and Content div)
        Array.from(item.children).forEach(child => {
            observer.observe(child);
        });

        // Also run initial sizing
        resizeMasonryItem(item);

        // Handle image load explicitly for good measure
        const imgs = item.querySelectorAll('img');
        imgs.forEach(img => {
            if (!img.complete) {
                img.onload = () => resizeMasonryItem(item);
            }
        });
    });
}


// Run on load and resize
window.addEventListener('load', observeItems);
window.addEventListener('resize', resizeAllMasonryItems);

// Also run immediately in case DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeItems);
} else {
    observeItems();
}
