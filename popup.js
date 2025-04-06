/**
 * Initializes the popup interface when the DOM content is fully loaded.
 * Retrieves highlights data from Chrome storage and displays highlights
 * for the current page and a dashboard of all highlights. Also adds event
 * listeners for searching and clearing highlights.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Query the currently active tab in the current window
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentURL = tabs[0].url; // Get the URL of the active tab

        // Retrieve highlights data from Chrome storage
        chrome.storage.sync.get({ highlights: {} }, (data) => {
            let highlights = data.highlights; // All stored highlights
            let filteredHighlights = JSON.parse(JSON.stringify(highlights)); // Create a copy for filtering

            // Select DOM elements for highlights and search inputs
            const highlightsContainer = document.getElementById('highlights-container');
            const searchInput = document.getElementById("search-input");
            const dashboardContainer = document.getElementById('dashboard-container');
            const dashboardSearchInput = document.getElementById("dashboard-search-input");

            /////////////////////////////////////////////////////////////
            // Display Dashboard Highlights
            /////////////////////////////////////////////////////////////
            if (Object.keys(highlights).length) {
                // Display the dashboard if highlights exist
                displayDashboard(filteredHighlights, highlights, dashboardContainer);

                // Add search functionality to the dashboard
                dashboardSearchInput.addEventListener("input", () => {
                    searchDashboard(dashboardSearchInput.value, highlights, dashboardContainer);
                });
            } else {
                // Show message if there are no highlights
                const textContainer = document.createElement('h3');
                textContainer.className = "no-data-text";
                textContainer.textContent = "No Highlights added yet.";
                dashboardContainer.appendChild(textContainer);
            }

            /////////////////////////////////////////////////////////////
            // Display Highlights for the Current Page
            /////////////////////////////////////////////////////////////
            let hasHighlights = highlights[currentURL] && Object.keys(highlights[currentURL].highlightList).length;

            if (hasHighlights) {
                // Display the page title for the current URL
                const pageTitle = highlights[currentURL].title;
                document.getElementById("page-title").textContent = pageTitle;

                // Display the initial highlights list for the current page
                displayInitialList(filteredHighlights, highlights, currentURL, highlightsContainer);

                // Add search functionality for the current page's highlights
                searchInput.addEventListener("input", () => {
                    search(searchInput.value, highlights, currentURL, highlightsContainer);
                });
            } else {
                // Show message if there are no highlights for the current page
                const textContainer = document.createElement('h3');
                textContainer.className = "no-data-text";
                textContainer.textContent = "No Highlights for this page yet.";
                highlightsContainer.appendChild(textContainer);
            }

            /////////////////////////////////////////////////////////////
            // Clear Highlights Button
            /////////////////////////////////////////////////////////////
            const clearButton = document.getElementById("clear-button");
            clearButton.addEventListener('click', () => clearHighlights(filteredHighlights, highlights));
        });
    });
});


/**
 * Filters and displays highlights on the dashboard based on the user's search query.
 *
 * @param {string} query - The search term entered by the user.
 * @param {Object} highlights - An object containing all saved highlights across multiple URLs.
 * @param {HTMLElement} dashboardContainer - The container element where the dashboard is displayed.
 */
function searchDashboard(query, highlights, dashboardContainer) {
    // Create a deep copy of the highlights object to allow modifications without affecting the original
    let filteredHighlights = JSON.parse(JSON.stringify(highlights));

    // If the query is empty, display all highlights
    if (!query) {
        displayDashboard(filteredHighlights, highlights, dashboardContainer);
    } else {
        // Get all URLs (keys) from the highlights object
        const links = Object.keys(filteredHighlights);
        let results = {}; // Object to store filtered results

        // Iterate over each link and check if it matches the query
        links.forEach(link => {
            // Check if the link or its title contains the search query (case-insensitive)
            if (
                link.toLowerCase().includes(query.toLowerCase()) ||
                filteredHighlights[link].title.toLowerCase().includes(query.toLowerCase())
            ) {
                results[link] = filteredHighlights[link]; // Add matching link to the results
            }
        });

        // Display the filtered results on the dashboard
        displayDashboard(results, highlights, dashboardContainer);
    }
}



/**
 * Clears the currently selected highlight both in the popup and on the webpage.
 * Also updates the Chrome storage to reflect the cleared highlight state.
 *
 * @param {Object} filteredHighlights - An object containing filtered highlights for the current URL.
 * @param {Object} highlights - An object containing all saved highlights across multiple URLs.
 */
function clearHighlights(filteredHighlights, highlights) {
    // Query the currently active tab in the current window
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentURL = tabs[0].url; // Get the URL of the active tab

        // Remove the highlight indication in the popup (if any)
        const el = document.querySelector('[selectedListItem="true"]');
        if (el) {
            el.style.background = 'none'; // Reset the background style
            el.removeAttribute('selectedListItem'); // Remove the selected attribute
        }

        // Clear the selectedId for the current URL in the highlights data
        highlights[currentURL].selectedId = '';
        filteredHighlights[currentURL].selectedId = '';

        // Update the cleared highlights in Chrome storage
        chrome.storage.sync.set({ highlights }, () => {
            if (chrome.runtime.lastError) {
                // Log an error if there is an issue with the storage operation
                console.error("Error:", chrome.runtime.lastError.message);
            } else {
                // Notify the content script to clear the highlight on the webpage
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: "clearHighlights" }, // Message to clear highlights
                    (response) => {
                        if (response && response.status === "success") {
                            console.log(response.message); // Log success message from content script
                        } else {
                            console.error("Error clearing highlights on the webpage.");
                        }
                    }
                );
            }
        });
    });
}


/**
 * Filters and displays highlights for the current page based on the user's search query.
 *
 * @param {string} query - The search term entered by the user.
 * @param {Object} highlights - An object containing all saved highlights across multiple URLs.
 * @param {string} currentURL - The URL of the current page.
 * @param {HTMLElement} highlightsContainer - The container element where the highlights are displayed.
 */
function search(query, highlights, currentURL, highlightsContainer) {
    // Create a deep copy of the highlights object to allow filtering without affecting the original data
    let filteredHighlights = JSON.parse(JSON.stringify(highlights));

    // If the query is empty, display the initial list of highlights
    if (!query) {
        displayInitialList(filteredHighlights, highlights, currentURL, highlightsContainer);
    } else {
        // Get the list of highlights for the current page
        const list = filteredHighlights[currentURL].highlightList;

        let results = {}; // Object to store filtered results

        // Iterate over each highlight and check if the text matches the query
        Object.keys(list).forEach(id => {
            if (list[id].text.toLowerCase().includes(query.toLowerCase())) {
                results[id] = list[id]; // Add matching highlights to the results
            }
        });

        // Update the highlightList for the current page with the filtered results
        filteredHighlights[currentURL].highlightList = results;

        // Display the filtered highlights list
        displayInitialList(filteredHighlights, highlights, currentURL, highlightsContainer);
    }
}



/**
 * Displays a dashboard of all saved highlights for each URL.
 * Highlights the current page's URL and allows users to delete entries or open URLs in a new tab.
 *
 * @param {Object} filteredHighlights - A filtered version of the highlights object, showing only relevant highlights.
 * @param {Object} highlights - The original object containing all saved highlights across multiple URLs.
 * @param {HTMLElement} dashboardContainer - The container element where the dashboard items are displayed.
 */
function displayDashboard(filteredHighlights, highlights, dashboardContainer) {
    // Query the currently active tab to highlight the current URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // Clear the dashboard container
        dashboardContainer.innerHTML = '';

        const currentURL = tabs[0].url; // Get the URL of the active tab

        // Get all saved URLs (keys) from the filtered highlights
        const links = Object.keys(filteredHighlights);

        // Iterate over each saved URL and create a dashboard entry
        links.forEach(link => {
            const linkItem = document.createElement("div");
            linkItem.className = 'dashboard-item'; // Class for styling each dashboard item

            // Create a container for the text (title and URL)
            const textContainer = document.createElement('div');
            textContainer.className = 'dashboard-text-container';

            // Create and set the title of the saved URL
            const title = document.createElement('h3');
            title.textContent = filteredHighlights[link].title;

            // Create and set the URL of the saved link
            const href = document.createElement('div');
            href.textContent = link;

            // Create a delete button with an icon
            const deleteButton = document.createElement('button');
            deleteButton.className = 'list-options-buttons';
            const trashIcon = document.createElement('img');
            trashIcon.src = "assets/delete.svg"; // Path to the delete icon
            trashIcon.className = 'list-option-button-icon';
            deleteButton.appendChild(trashIcon);

            // Add a click event listener to the delete button
            deleteButton.addEventListener('click', () => {
                // Remove the highlight from both filtered and original highlights
                delete filteredHighlights[link];
                delete highlights[link];

                // Update the highlights in Chrome storage
                chrome.storage.sync.set({ highlights }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Error:", chrome.runtime.lastError.message);
                    } else {
                        // Remove the dashboard item from the DOM
                        linkItem.remove();
                    }
                });
            });

            // Append the title and URL to the text container
            textContainer.appendChild(title);
            textContainer.appendChild(href);

            // Add a click event listener to the text container to open the link
            textContainer.addEventListener("click", () => {
                window.open(link, "_blank", "noopener,noreferrer");
            });

            // Highlight the current page's URL in the dashboard
            if (currentURL === link) {
                linkItem.style.background = 'yellow'; // Highlight styling
            }

            // Append the text container and delete button to the dashboard item
            linkItem.appendChild(deleteButton);
            linkItem.appendChild(textContainer);

            // Append the dashboard item to the dashboard container
            dashboardContainer.appendChild(linkItem);
        });
    });
}


function displayInitialList(filteredHighlights, highlights, currentURL, highlightsContainer) {
    highlightsContainer.innerHTML = '';

    let selectedId = filteredHighlights[currentURL].selectedId;


    // check if the selectedid is in the current list
    let highlightsHasSelectedId = false;
    let idArr = Object.keys(filteredHighlights[currentURL].highlightList);

    if (idArr.indexOf(selectedId) > -1) {
        highlightsHasSelectedId = true;
    }

    const { highlightList } = filteredHighlights[currentURL];

    /////////////////////////////////////////////////////////////// Display each highlight
    Object.keys(highlightList).forEach((id) => {


        const highlight = highlightList[id];
        const { text } = highlight;
        const listItem = document.createElement('div');
        listItem.className = 'highlight-item';


        /////////////////////////////////////////////////////// Create a container for the text
        const textContainer = document.createElement('div');
        textContainer.className = 'highlight-text-container';
        textContainer.textContent = text;

        listItem.appendChild(textContainer);

        // listItem.textContent = text;
        highlightsContainer.appendChild(listItem);


        const listOptions = document.createElement('div');
        listOptions.className = 'highlight-list-options';

        const deleteButton = document.createElement('button');
        // const favoriteButton = document.createElement('button');

        deleteButton.className = 'list-options-buttons';
        // favoriteButton.className = 'list-options-buttons';

        // Add trash icon to delete button
        const trashIcon = document.createElement('img');
        trashIcon.src = "assets/delete.svg";
        trashIcon.className = 'list-option-button-icon';
        deleteButton.appendChild(trashIcon);

        //////////////////////////////////////////////////////////// Delete button event listener
        deleteButton.addEventListener('click', (event) => {
            event.preventDefault();
            const { highlightList } = highlights[currentURL];

            if (selectedId === id) {
                listItem.style.background = 'none';
                listItem.removeAttribute('selectedListItem');
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(
                        tabs[0].id,
                        { action: "clearHighlights" },
                        (response) => {
                            if (response && response.status === "success") {
                                console.log(response.message);
                            } else {
                                console.error("Error highlighting text.");
                            }
                        }
                    );

                });
            }

            highlights[currentURL].selectedId = '';
            filteredHighlights[currentURL].selectedId = '';
            delete highlightList[id];
            if (!Object.keys(highlightList).length) {
                delete highlights[currentURL];
            }
            chrome.storage.sync.set({ highlights }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error:", chrome.runtime.lastError.message);
                } else {
                    // Remove listitem from DOM
                    listItem.remove();
                    highlightsHasSelectedId = false;

                }
            });
        });


        // Add heart icon to favorite button
        const heartIcon = document.createElement('img');
        heartIcon.src = "assets/heart.svg";
        heartIcon.className = 'list-option-button-icon';
        // favoriteButton.appendChild(heartIcon);

        // Add the option buttons to list options
        listOptions.appendChild(deleteButton);
        // listOptions.appendChild(favoriteButton);

        // listItem.appendChild(document.createElement("hr"))
        listItem.appendChild(listOptions);

        if (selectedId === id) {
            listItem.style.background = 'yellow';
            listItem.setAttribute('selectedListItem', 'true');
        }


        textContainer.addEventListener('click', (event) => {
            event.preventDefault();

            // If selectedId exists there should be a highlight in the highlightList
            // highlightsHasSelectedId cannot exist if selectedId doesn't exist


            // selectedId = true
            const el = document.querySelector('[selectedListItem="true"]');
            if (el) {
                highlightsHasSelectedId = true

            }


            if (selectedId && highlightsHasSelectedId) {
                // there already is a selected listItem
                el.style.background = 'none';
                el.removeAttribute('selectedListItem');
                // console.log('element: ', el);
            }
            // change background of this listItem
            listItem.setAttribute('selectedListItem', 'true');
            listItem.style.background = 'yellow';

            selectedId = id;
            highlights[currentURL].selectedId = id;
            highlightsHasSelectedId = false;



            chrome.storage.sync.set({ highlights }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error:", chrome.runtime.lastError.message);
                } else {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        // Send a message to the content script
                        chrome.tabs.sendMessage(
                            tabs[0].id,
                            { action: "highlightParagraph", highlight: highlight },
                            (response) => {
                                if (response && response.status === "success") {
                                    console.log(response.message);
                                } else {
                                    console.error("Error highlighting text.");
                                }
                            }
                        );
                    });
                }
            })



        });
    })

}

/**
 * Initializes the tab switching functionality once the DOM content is fully loaded.
 * Each tab click will activate the corresponding tab and slide the content slider
 * to display the associated content.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Select all tab elements
    const tabs = document.querySelectorAll(".tab");

    // Select the content slider element
    const slider = document.querySelector(".content-slider");

    /**
     * Iterate over each tab and add a click event listener.
     * When a tab is clicked, it becomes active, and the slider updates its position.
     */
    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            // Remove the "active" class from all tabs
            tabs.forEach((t) => t.classList.remove("active"));

            // Add the "active" class to the clicked tab
            tab.classList.add("active");

            // Retrieve the index of the clicked tab from the "data-tab" attribute
            const tabIndex = parseInt(tab.getAttribute("data-tab"), 10);

            // Update the transform style of the slider to slide to the corresponding content
            slider.style.transform = `translateX(-${tabIndex * 100}%)`;
        });
    });
});



