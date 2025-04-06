
// Set up context menus on extension installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "highlight",
        title: "HiLite",
        contexts: ["selection"]
    });
});

// Listen for clicks on context menu items
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "highlight") {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: highlightSelection,
        });
    } 
});


// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in background.js:", message);

    if (message.type === "highlightSelection") {
        console.log('here')
        highlightSelection();
        sendResponse({ status: "success" });
    }
});

// Function to highlight selected text with a specified color
function highlightSelection() {

    // create a check before highlighting
    // check if the curerent paragraph is already highlighted
    const selection = window.getSelection();
    const currentURL = window.location.href;
    const selectedText = selection.toString().trim();


    if (selection.rangeCount > 0) {

        const range = selection.getRangeAt(0);


        const xpath = getXPath(range.commonAncestorContainer);


        if (xpath.includes("currHighlight")) {
            const el = document.getElementById("currHighlight");
            if (el) {
                el.style.background = '';
                el.style.display = '';
                el.removeAttribute('data-highlighted');
                el.removeAttribute('id');

            }
        }


        const highlightData = {
            text: selectedText,
            xpath: getXPath(range.commonAncestorContainer)
        };


        chrome.storage.sync.get({ highlights: {} }, (data) => {
            const highlights = data.highlights;

            // If current page doesn't have any highlights
            if (!highlights[currentURL]) {
                highlights[currentURL] = {};
                highlights[currentURL].title = document.title;
                highlights[currentURL].selectedId = '';
                highlights[currentURL].highlightList = {};
            }


            // highlights[currentURL].highlightList.push(highlightData);
            const id = crypto.randomUUID();
            highlights[currentURL].highlightList[id] = highlightData;
            highlights[currentURL].selectedId = id;

            chrome.storage.sync.set({ highlights }, () => {
                // Highlight saved successfully
                // Create a span element to wrap the selected text
                const xpath = getXPath(range.commonAncestorContainer);
                // Resolve the target node using XPath
                const xpathResult = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                );

                const targetNode = xpathResult.singleNodeValue;

                if (targetNode.getAttribute('data-highlighted') === 'true') {
                    targetNode.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    });
                } else {
                    const el = document.getElementById("currHighlight");
                    // If el already exists, remove the highlight first
                    if (el) {
                        console.log('el: ', el);
                        el.style.background = '';
                        el.style.display = '';
                        el.removeAttribute('data-highlighted');
                        el.removeAttribute('id');

                    }
                    // After removing the highlight, create the element
                    targetNode.style.backgroundColor = 'yellow';
                    targetNode.style.display = 'block';
                    targetNode.setAttribute('data-highlighted', 'true');
                    targetNode.id = "currHighlight";
                    targetNode.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    });
                }
            });

        });

        selection.removeAllRanges();  // Clear the selection
    }

    function getXPath(node) {
        if (node.id) {
            return `//*[@id="${node.id}"]`;
        }
        const siblings = node.parentNode.childNodes;
        let index = 1;
        for (let i = 0; i < siblings.length; i++) {
            if (siblings[i] === node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    return `${getXPath(node.parentNode)}/${node.tagName.toLowerCase()}[${index}]`;
                } else if (node.nodeType === Node.TEXT_NODE) {
                    return `${getXPath(node.parentNode)}`;
                    // return `${getXPath(node.parentNode)}/text()[${index}]`;
                }
            }
            if (
                siblings[i].nodeType === Node.ELEMENT_NODE &&
                siblings[i].tagName === node.tagName
            ) {
                index++;
            }
        }
    }

}






