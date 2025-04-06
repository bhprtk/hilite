/**
 * Highlights the currently selected paragraph on page load based on saved highlights in Chrome storage.
 * Retrieves the highlight data for the current URL, finds the saved paragraph using XPath, and highlights it.
 */
window.onload = () => {
    // Get the current page URL
    const currentURL = window.location.href;

    // Retrieve highlights data from Chrome storage
    chrome.storage.sync.get({ highlights: {} }, (data) => {
        const highlights = data.highlights; // Extract the highlights object

        // Check if there are highlights for the current URL
        if (highlights[currentURL]) {
            // Get the currently selected highlight ID
            let selectedId = highlights[currentURL].selectedId;

            // Get the list of highlights for this URL
            let highlight = highlights[currentURL].highlightList;

            // Retrieve the XPath of the selected highlight
            let xpath = highlight[selectedId].xpath;

            // Highlight the paragraph using the stored XPath
            highlightParagraph(xpath);
        }
    });
};


/**
 * Listens for messages from other parts of the Chrome extension (e.g., popup or content scripts).
 * Handles the "highlightParagraph" action by invoking the `highlightParagraph` function with the specified XPath.
 *
 * @param {Object} message - The message object sent from the sender.
 * @param {Object} sender - Information about the message sender (e.g., the script or extension component).
 * @param {Function} sendResponse - Function to send a response back to the sender.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check if the message action is "highlightParagraph"
    if (message.action === "highlightParagraph") {
        // Destructure the highlight data from the message
        const { highlight } = message;
        const { xpath } = highlight;

        // Call the highlightParagraph function with the provided XPath
        highlightParagraph(xpath);

        // Send a success response back to the sender
        sendResponse({ status: "success", message: "Paragraph highlight toggled." });
    }
});


/**
 * Listens for messages from other parts of the Chrome extension (e.g., popup or background scripts).
 * Handles the "clearHighlights" action to remove the current paragraph highlight if present.
 *
 * @param {Object} message - The message object sent from the sender.
 * @param {Object} sender - Information about the message sender (e.g., the script or extension component).
 * @param {Function} sendResponse - Function to send a response back to the sender.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check if the message action is "clearHighlights"
    if (message.action === "clearHighlights") {
        // Find the currently highlighted element by its ID
        const el = document.getElementById("currHighlight");

        // If a highlighted element exists, clear its styles and attributes
        if (el) {
            el.style.background = ''; // Remove background color
            el.style.display = ''; // Reset display property
            el.removeAttribute('data-highlighted'); // Remove 'data-highlighted' attribute
            el.removeAttribute('id'); // Remove its unique ID
        }

        // Send a success response back to the sender
        sendResponse({ status: "success", message: "Paragraph highlight toggled." });
    }
});

/**
 * Highlights a paragraph based on the given XPath. If the paragraph is already highlighted,
 * it scrolls to the paragraph smoothly. If another paragraph is highlighted, the previous
 * highlight is removed before highlighting the target node.
 *
 * @param {string} xpath - The XPath expression used to locate the target paragraph in the DOM.
 */
const highlightParagraph = (xpath) => {
    // Resolve the target node using the provided XPath expression
    const xpathResult = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    );

    const targetNode = xpathResult.singleNodeValue; // Get the node corresponding to the XPath

    // If the target node is not found, log an error and exit
    if (!targetNode) {
        console.error('Target node not found.');
        sendResponse({ status: "error", message: "Target node not found." });
        return;
    }

    // Check if the target node is already highlighted
    if (targetNode.getAttribute('data-highlighted') === 'true') {
        // Scroll to the target node smoothly
        targetNode.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    } else {
        // Locate the currently highlighted element (if any)
        const el = document.getElementById("currHighlight");

        // If a previously highlighted element exists, remove its highlight
        if (el) {
            el.style.background = ''; // Reset background style
            el.style.display = ''; // Reset display style
            el.removeAttribute('data-highlighted'); // Remove the highlighted attribute
            el.removeAttribute('id'); // Remove the unique ID
        }

        // Highlight the target node
        targetNode.style.backgroundColor = 'yellow'; // Set highlight color
        targetNode.style.display = 'block'; // Ensure the element is visible
        targetNode.setAttribute('data-highlighted', 'true'); // Mark as highlighted
        targetNode.id = "currHighlight"; // Set a unique ID for the highlighted node

        // Scroll to the newly highlighted node smoothly
        targetNode.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }
};
