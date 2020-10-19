
/**
 * Along with content.js, this is the main extension script.
 * Listens to all chrome messages and responds accordingly by reloading page or returning JSON from a GET request to
 * RateMyProfessors.com to contentscript.js.
 * Note: Both a background.js and content.js script are needed, as both files are granted differing permission by Chrome.
 * @author: Ryan Lenea, Joseph Wright
 */


chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {

        // Run script to add and populate column on ...minnstate.edu page
        if (request.type === "reload") {
            chrome.tabs.executeScript({
                file: "contentscript.js"
            });
        }
        // Retrieve a professor rating
        else if (request.type === "profRating") {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", request.url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    // console.log(xhr.responseText);
                    sendResponse({ JSONresponse: JSON.parse(xhr.responseText) });
                }
            };
            xhr.send();
        // Add popups with summary information to Rate My Professor Column
        } else if (request.type === "tooltip") {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", request.url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    // console.log(xhr.responseText);
                    sendResponse({ JSONresponse: JSON.parse(xhr.responseText) });
                }
            };
            xhr.send();
        }
        return true;
    });




