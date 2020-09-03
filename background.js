
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {

        if (request.type === "reload") {
            chrome.tabs.executeScript({
                file: "contentscript.js"
            });
        }
        else if (request.type === "profRating") {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", request.url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    console.log(xhr.responseText);
                    sendResponse({ JSONresponse: JSON.parse(xhr.responseText) });
                }
            };
            xhr.send();
        } else if (request.type === "tooltip") {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", request.url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    console.log(xhr.responseText);
                    sendResponse({ JSONresponse: JSON.parse(xhr.responseText) });
                }
            };
            xhr.send();
        }
        return true;
    });




