
/**
 * Along with background.js, this is the main extension script.
 * Collects and parses professor names, creates a URL for a GET request to RateMyProfessor.com, sends that URL to
 * background.js for lookup, parses JSON response, and finally adds a column with professor ratings and a tooltip for
 * each professor with summary statistics.
 * Note: Both a background.js and content.js script are needed, as both files are granted differing permission by Chrome.
 * TODO: this script really needs some at least rudimentary error handling.
 * @author: Ryan Lenea
 */

main();

/**
 * Set all listeners and populate current page with RMP data
 */
function main() {
    maintainRMPColumn();
    handlePagination();
    handleIllegalClicks();
}


/**
 * Set listeners to reload script to create new column if paginator clicked.
 */
function handlePagination() {
    let elems = [];

    let topNav = document.querySelector("#yui-dt0-paginator0");
    let bottomNav = document.querySelector("#yui-dt0-paginator1");

    elems.push.apply(elems, topNav.querySelectorAll("a.yui-pg-page,span.yui-pg-page"));
    elems.push.apply(elems, bottomNav.querySelectorAll("a.yui-pg-page,span.yui-pg-page"));

    for (let i = 0; i < elems.length; i++) {
        elems[i].addEventListener("click", function() {
            chrome.runtime.sendMessage({
                url: "",
                type: "reload",
                response: {}
            });
        });
    }

}


/**
 * Reload whole page for illegal button clicks (next, last, etc. all result in virtual cascading button clicks
 * that can't be easily handled).
 * TODO: this is ridiculously sloppy; extension shouldn't inhibit normal user behavior in any way!
 */
function handleIllegalClicks() {
    let elems2 = [];

    let topNav = document.querySelector("#yui-dt0-paginator0");
    let bottomNav = document.querySelector("#yui-dt0-paginator1");

    elems2.push.apply(elems2, topNav.querySelectorAll("a.yui-pg-first,a.yui-pg-previous,a.yui-pg-next,a.yui-pg-last"));
    elems2.push.apply(elems2, bottomNav.querySelectorAll("a.yui-pg-first,a.yui-pg-previous,a.yui-pg-next,a.yui-pg-last"));

    for (let step1 = 0; step1 < elems2.length; step1++) {
        elems2[step1].addEventListener("click", function () {
            window.location.reload();
        });
    }

}


/**
 * Determine which school's registration page is being looked at by referencing location image.
 * TODO school data should be in json or xml doc not a million if-elses. Below almost worked, changed in manifest:
 * https://stackoverflow.com/questions/46667199/where-to-store-static-json-data-in-a-chrome-extension
 */
function getSchoolRMPId() {

    // Location cells often empty, so need to search whole table until find one
    let title;
    locationCells = $(".yui-dt0-col-loc,.yui-dt-col-loc,.yui-dt-last");
    for (let i = 1; i < locationCells.length; i++){
        try {
            let locationImg = locationCells.find('img:first')[i];
            title = locationImg.getAttribute("title");
            break;
        } catch (TypeError) {
            if (i = locationCells.length - 1){
                return "";
            }
        }
    }

    if (title.includes("Winona") || title.includes("WSU")) {
        return "3A1214"
    }
    else if (title.includes("Rochester Community & Technical College") ) {
        return "3A2752"
    }
    else if (title.includes("Vermilion Community College") ) {
        return "3A2986"
    }
    else if (title.includes("Cloud Technical and Community College") ) {
        return "3A2873"
    }
    else if (title.includes("Cloud State University") ) {
        return "3A833"
    }
    else if (title.includes("Southwest Minnesota State University") ) {
        return "3A937"
    }
    else if (title.includes("South Central College") ) {
        return "3A2815"
    }
    else if (title.includes("Saint Paul College") ) {
        return "3A2879"
    }
    else if (title.includes("Riverland") ) {
        return "3A5610"
    }
    else if (title.includes("Willmar") ) { //Ridgewater
        return "3A5236" //another campus should include 3A5638
    }
    else if (title.includes("Rainy River Community College") ) {
        return "3A2720"
    }
    else if (title.includes("Pine Technical and Community College") ) {
        return "3A2683"
    }
    else if (title.includes("Northwest Tech College") ) {
        return "3A2589"
    }

}


/**
 * All functionality to create a RMP column with tooltips and ensure multiple columns not added, encompassed here.
 * TODO: this should cache data so doesn't lookup a whole page of data on every page navigation.
 * TODO: this doesn't need to be it's own method - incorporate into locateThenCreatRMPColumn.
 */
function maintainRMPColumn() {

    removeOldColumn();
    let table = document.querySelector("#searchResultsContainer > table");
    if (table !== null) {
        locateThenCreateRMPColumn(table);
    }

}


/**
 * Locates where the the RMP cells should be added (the last column), looks up the information, and populates it.
 * @param table {element} the table holding most of the relevant page information.
 */
function locateThenCreateRMPColumn(table) {

    let newCell;
    let columnValue = 0;
    let ratingCell;

    // Iterates over rows
    for (let i = 0, row; row = table.rows[i]; i++) {

        // Adds header cell with sytles if first row, otherwise a blank cell to hold professor ratings.
        if (i === 0) {
            ratingCell = row.insertCell(row.length);
            applyStyles(ratingCell);
        } else {
            newCell = row.insertCell(row.length);
        }

        // Iterates over columns to get the last column which is populated with ratings.
        for (let j = 0, col; col = row.cells[j]; j++) {
            if (j === columnValue) {
                let professor = col.innerText;
                if (professor.indexOf(',') >= 0) {
                    let fullName = col.innerText;
                    createCellAndTooltip(fullName, newCell);
                }
            }
            if ($(col).hasClass('yui-dt0-col-Instructor')) {
                columnValue = j;
            }
        }

    }

}


/**
 * Parse name, lookup RMP rating, and populate single cell.
 * @param fullName {String} professor name from ...minnstate.edu page.
 * @param newCell {element} new cells where professor data to be added.
 */
function createCellAndTooltip(fullName, newCell){
    let myurl = "https://search-production.ratemyprofessors.com/solr/rmp/select/?solrformat=true&rows=2&wt=json&q=";
    fullNameFormatted = fullName.replace(/(\r\n|\n|\r)/gm, "");
    let splitName =  fullNameFormatted.split(",");
    let lastName = splitName[0].trim();
    let firstName = splitName[1].trim();
    myurl1 = myurl + firstName + "+" + lastName + "+AND+schoolid_s%" + getSchoolRMPId();
    getProfessorRating(myurl1, newCell);
}


/**
 * Lookup professor rating on Rate My Professors and populate single tooltip.
 */
function getProfessorRating(myurl1, newCell) {

    chrome.runtime.sendMessage({
        url: myurl1,
        type: "profRating"
    }, function(response) {
        let resp = response.JSONresponse;
        let numFound = resp.response.numFound;
        //Add professor data if found
        if (numFound > 0) {
            let profID = resp.response.docs[0].pk_id;
            let realFirstName = resp.response.docs[0].teacherfirstname_t;
            let realLastName = resp.response.docs[0].teacherlastname_t;
            let profRating = resp.response.docs[0].averageratingscore_rf;
            if (profRating !== undefined) {
                let profURL = "http://www.ratemyprofessors.com/ShowRatings.jsp?tid=" + profID;
                newCell.innerHTML = "<a href=\"" + profURL + "\" target=\"_blank\">" + profRating + "</a>";
                let allprofRatingsURL = "https://www.ratemyprofessors.com/paginate/professors/ratings?tid=" + profID + "&page=0&max=20";
                addTooltip(newCell, allprofRatingsURL, realFirstName, realLastName);
            } else {
                newCell.innerHTML = "N/A";
            }
        } else {
            newCell.innerHTML = "N/A";
        }
        newCell.className = "RMPCell";
    });
}


/**
 * Lookup professor data and add popup when hover over professor rating column with summary data.
 * Note: With the RMP API you can't get many of the rating statistics, so they are calculated independently here.
 * @param newCell {element} new cell to be added to table.
 * @param allprofRatingsURL {string} url for the given professor.
 * @param realFirstName {string} formatted first name.
 * @param realLastName {string} formatted last name.
 */
function addTooltip(newCell, allprofRatingsURL, realFirstName, realLastName) {

    chrome.runtime.sendMessage({
        url: allprofRatingsURL,
        type: "tooltip"
    }, function(response) {

        let resp = response.JSONresponse;

        //Build content for professor tooltip
        let easyRating = 0;
        let wouldTakeAgain = 0;
        let wouldTakeAgainNACount = 0;
        let foundFirstReview = false;
        let firstReview = "";

        for (let i = 0; i < resp.ratings.length; i++) {
            easyRating += resp.ratings[i].rEasy;
            if (resp.ratings[i].rWouldTakeAgain === "Yes") {
                wouldTakeAgain++;
            } else if (resp.ratings[i].rWouldTakeAgain === "N/A") {
                wouldTakeAgainNACount++;
            }
            if (!foundFirstReview) {
                firstReview = resp.ratings[i].rComments;
                foundFirstReview = true;
            }
        }

        if (!foundFirstReview) {
            firstReview = "N/A";
        }

        easyRating /= resp.ratings.length;

        if (resp.ratings.length > 1) {
            wouldTakeAgain = ((wouldTakeAgain / (resp.ratings.length - wouldTakeAgainNACount)) * 100)
                .toFixed(0)
                .toString() + "%";
        } else {
            wouldTakeAgain = "N/A";
        }


        let div = formatDataForTooltip(realFirstName, realLastName, easyRating, wouldTakeAgain, firstReview);
        newCell.class = "tooltip";
        putDataIntoTooltip(newCell, div);

    });

}

/**
 * Formats a given professor's stats into a div, to (elsewhere) be placed into a tooltip.
 * @param realFirstName {string} professor first name formatted.
 * @param realLastName {string} professor last name formatted.
 * @param easyRating {int} professors's difficulty rating.
 * @param wouldTakeAgain {int} percent of students who would take professor's class again.
 * @param firstReview {string} the most recent review.
 * @returns {HTMLDivElement} the content to be placed into the tooltip.
 */
function formatDataForTooltip(realFirstName, realLastName, easyRating, wouldTakeAgain, firstReview) {

    let title = document.createElement("h3");
    title.textContent = "Rate My Professor Details";

    let professorText = document.createElement("p");
    professorText.textContent = "Professor Name: " + realFirstName + " " + realLastName;

    let easyRatingText = document.createElement("p");
    easyRatingText.textContent = "Level of Difficulty" + ": " + easyRating.toFixed(1)
        .toString() + "/5.0";

    let wouldTakeAgainText = document.createElement("p");
    wouldTakeAgainText.textContent = "Would take again: " + wouldTakeAgain;

    let classText = document.createElement("p");
    classText.textContent = "Most recent review: ";

    let commentText = document.createElement("p");
    commentText.textContent = firstReview;
    commentText.classList.add('paragraph');

    let div = document.createElement("div");
    div.appendChild(title);
    div.appendChild(professorText);
    div.appendChild(easyRatingText);
    div.appendChild(wouldTakeAgainText);
    div.appendChild(classText);
    div.appendChild(commentText);

    return div;
}


/**
 * Add popup with when professor rating is hovered over.
 * @param newCell {element} the table cell to have the popup.
 * @param div {element} holds the popup info.
 */
function putDataIntoTooltip(newCell, div){
    newCell.addEventListener("mouseenter", function() {
        //Only create tooltip once
        if (!$(newCell)
            .hasClass('tooltipstered')) {
            $(this)
                .tooltipster({
                    animation: 'grow',
                    theme: 'tooltipster-default',
                    side: 'right',
                    content: div,
                    contentAsHTML: true,
                    delay: 100
                })
                .tooltipster('show');
        }
    });
}



/**
 * Remove last column if one was previously added by extension.
 */
function removeOldColumn(){
    if (document.getElementsByClassName("RMPCell").length > 0) {
        $('td.RMPCell:last-child').remove();
    }
    let existingRMPColumn = $('.RMPHeader');
    if(existingRMPColumn.length > 0){
        existingRMPColumn.remove();
    }
}


/**
 * Apply syles to tooltip and to header column.
 * @param ratingCell {element}
 */
function applyStyles(ratingCell){
    ratingCell.innerHTML = "Overall Rating";
    ratingCell.style.fontWeight = "bold";
    ratingCell.style.verticalAlign = "bottom";
    ratingCell.style.paddingLeft = "1em";
    ratingCell.style.paddingRight = "1em";
    ratingCell.style.fontSize = "12px";
    ratingCell.style.color = "white";
    ratingCell.style.backgroundColor = "#222222";
    ratingCell.className = "RMPHeader";
    ratingCell.borderColor = "#f71169"
}