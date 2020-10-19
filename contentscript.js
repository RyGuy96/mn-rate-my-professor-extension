
/**
 * Along with background.js, this is the main extension script.
 * Collects and parses professor names, creates a URL for a GET request to RateMyProfessor.com, sends that URL to
 * background.js for lookup, parses JSON response, and finally adds a column with professor ratings and a tooltip for
 * each professor with summary statistics.
 * Note: Both a background.js and content.js script are needed, as both files are granted differing permission by Chrome.
 * TODO: this script really needs some at least rudimentary error handling.
 * TODO: make github issues instead of these todos so easier to track.
 * TODO: scrolling should have a scroll bar so obvious that you can scroll
 * @author: Ryan Lenea, Joseph Wright
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

    //RYAN DEBUGGING oct 19 start
    console.log("call to : " + "handlePagination()");
    //RYAN DEBUGGING oct 19 end

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

    //RYAN DEBUGGING oct 19 start
    console.log("call to : " + "handleIllegalClicks()");
    //RYAN DEBUGGING oct 19 end

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
 * TODO school data should be in json or xml doc not in code. Below almost worked, changed in manifest:
 * https://stackoverflow.com/questions/46667199/where-to-store-static-json-data-in-a-chrome-extension
 */
function getSchoolRMPId() {

    //RYAN DEBUGGING oct 19 start
    console.log("call to : " + "getSchoolRMPId()");
    //RYAN DEBUGGING oct 19 end

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

    return getUniCode(title);
}

/**
 * Get RMP id school code with school name.
 * @param title {string} name of school to lookup.
 * @returns {string} school code.
 */
function getUniCode(title) {
    let uni_codes = {
        "3A1214":["Winona"],
        "3A2752":["Rochester Community & Technical College"],
        "3A2986":["Vermilion Community College"],
        "3A2873":["Cloud Technical and Community College"],
        "3A833":["Cloud State University"],
        "3A937":["Southwest Minnesota State University"],
        "3A2815":["South Central College"],
        "3A2879":["Saint Paul College"],
        "3A5610":["Riverland"],
        "3A5236":["Willmar"],
        "3A2720":["Rainy River Community College"],
        "3A2683":["Pine Technical and Community College"],
        "3A2589":["Northwest Tech College"],
        "3A559":["Mankato"],
        "3A5399":["Metropolitan State"],
        "3A2465":["Minneapolis Comm"],
        "3A2468":["Minnesota State College Southeast"],
        "3A2058":["M State - Online"],
        "3A4640":["Moorhead"],
        "3A1832":["Century College"]
    };

    let code;
    Object.entries(uni_codes).forEach(([key,value]) => {
        if(title.includes(`${value}`)) {
            code = key;
        }
    });

    return code;
}


/**
 * All functionality to create a RMP column with tooltips and ensure multiple columns not added, encompassed here.
 * TODO: this should cache data so doesn't lookup a whole page of data on every page navigation.
 * TODO: this doesn't need to be it's own method - incorporate into locateThenCreatRMPColumn.
 */
function maintainRMPColumn() {

    //RYAN DEBUGGING oct 19 start
    console.log("call to : " + "maintainRMPColumn()");
    //RYAN DEBUGGING oct 19 end

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

    //RYAN DEBUGGING oct 19 start
    console.log("call to : " + "locateThenCreateRMPColumn");
    //RYAN DEBUGGING oct 19 end

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
        for (let j = 1, col; col = row.cells[j]; j++) {
            if (j === columnValue) {
                let professor = col.innerText;
                const name_array = professor.split('\n').filter(e => e)
                .filter(function (ele) { return ele.length > 1});
                     
                if (name_array[0]) createCellAndTooltip(name_array[0], newCell);
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
    let splitName =  fullName.split(",");
    let lastName = splitName[0].trim();
    let firstName = splitName[1].trim();
    myurl1 = myurl + firstName + "+" + lastName + "+AND+schoolid_s%" + getSchoolRMPId();
    getProfessorRating(myurl1, newCell);
    //RYAN DEBUGGING oct 19 start
    console.log("call to: " + "createCellAndTooltip");
    //RYAN DEBUGGING oct 19 end
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
                // TODO: max=20, is there reason for this? is it going to get more ratings than that?
                //RYAN DEBUGGING oct 19 start
                console.log("call to : " + "getProfessorRating");
                //RYAN DEBUGGING oct 19 end
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
 * TODO: this method is getting kinda long, shorten up.
 * Lookup professor data and add popup when hover over professor rating column with summary data.
 * Note: With the RMP API you can't get any of the cumulative rating statistics, so they are calculated independently here.
 * @param newCell {element} new cell to be added to table.
 * @param allprofRatingsURL {string} url for the given professor.
 * @param realFirstName {string} formatted first name.
 * @param realLastName {string} formatted last name.
 */
function addTooltip(newCell, allprofRatingsURL, realFirstName, realLastName) {

    //RYAN DEBUGGING oct 19 start
    console.log("call to : " + "addTooltip");
    //RYAN DEBUGGING oct 19 end

    chrome.runtime.sendMessage({
        url: allprofRatingsURL,
        type: "tooltip"
    }, function(response) {

        // Number of most popular tags for each professor to be added (RMP adds 5).
        const TAGS_PER_PROF = 5;

        // Json object.
        let resp = response.JSONresponse;

        //Build content for professor tooltip
        let easyRating = 0;
        let wouldTakeAgain = 0;
        let wouldTakeAgainNACount = 0;
        let attendanceRequired = 0;
        let attendanceRequiredNACount = 0;
        let profTags = {};
        let comments = {};

        // Calculate rating statistics, factoring in non-responders (N/A); gather comments.
        for (let i = 0; i < resp.ratings.length; i++) {

            // Difficulty.
            easyRating += resp.ratings[i].rEasy;
            if (resp.ratings[i].rWouldTakeAgain === "Yes") {
                wouldTakeAgain++;
            } else if (resp.ratings[i].rWouldTakeAgain === "N/A") {
                wouldTakeAgainNACount++;
            }

            // Attendance
            if (resp.ratings[i].attendance === "Mandatory") {
                attendanceRequired++;
            } else if (resp.ratings[i].attendance === "N/A") {
                attendanceRequiredNACount++;
            }

            // Keep running total of tag counts (three per review).
            let singleRatingTags = resp.ratings[i].teacherRatingTags;
            singleRatingTags.forEach(function (tag) {
                if (profTags.hasOwnProperty(tag)) {
                    profTags[tag]++;
                } else {
                    profTags[tag] = 1;
                }
            });

            // Keen running total of comments and the number of likes for each.
            comments[resp.ratings[i].rComments] = resp.ratings[i].helpCount

        } // End for.

        easyRating /= resp.ratings.length;

        if (resp.ratings.length > 1) {
            wouldTakeAgain = ((wouldTakeAgain / (resp.ratings.length - wouldTakeAgainNACount)) * 100)
                .toFixed(0)
                .toString() + "%";
        } else {
            wouldTakeAgain = "N/A";
        }


        if (resp.ratings.length > 1) {
            attendanceRequired = ((attendanceRequired / (resp.ratings.length - attendanceRequiredNACount)) * 100)
                .toFixed(0)
                .toString() + "%";
        } else {
            attendanceRequired = "N/A";
        }

        //TODO process of getting counts could be shorter.
        // Get x most mentioned tags for professor from hashmap of values.
        let topTags = sortByCount(profTags);
        topTags = topTags.slice(0, TAGS_PER_PROF);
        let tagsToInclude = [];
        for (let j = 0; j < topTags.length; j++) {
            tagsToInclude.push(topTags[j].name);
        }

        // Sort comments by helpfulness rating
        comments = sortByCount(comments);
        let commentsSorted = [];
        for (let k = 0; k < comments.length; k++) {
            commentsSorted.push(comments[k].name);
        }

        // New div with all comment review info for a single professor.
        let div = formatDataForTooltip(realFirstName, realLastName, allprofRatingsURL, easyRating, wouldTakeAgain, attendanceRequired, tagsToInclude, commentsSorted);

        newCell.class = "tooltip";
        putDataIntoTooltip(newCell, div);

    });

}


/**
 * Formats a given professor's stats into a div, to (elsewhere) be placed into a tooltip.
 * @param realFirstName {string} professor first name formatted.
 * @param realLastName {string} professor last name formatted.
 * @param allprofRatingsURL {string} url to rate my professor page for given professor.
 * @param easyRating {int} professors's difficulty rating.
 * @param wouldTakeAgain {int} percent of students who would take professor's class again.
 * @param attendanceRequired {int} percent of students who said attendance was mandatory.
 * @param tagsToInclude {array} most popular tags listed in reviews.
 * @param commentsSorted {array} reviews sorted by number of likes descending.
 * @returns {HTMLDivElement} the content to be placed into the tooltip.
 */
// function formatDataForTooltip(realFirstName, realLastName, allprofRatingsURL, easyRating, wouldTakeAgain, attendanceRequired, tagsToInclude, commentsSorted) {

function formatDataForTooltip(realFirstName, realLastName, allprofRatingsURL, easyRating, wouldTakeAgain, attendanceRequired, tagsToInclude, commentsSorted) {

    //RYAN DEBUGGING oct 19 start
    console.log("call to : " + "formatDataForTooltip");
    //RYAN DEBUGGING oct 19 end

    let title = document.createElement("h3");
    title.textContent = "Rate My Professor Details";

    let professorText = document.createElement("p");
    professorText.textContent = "Professor Name: " + realFirstName + " " + realLastName;

    // TODO, get this to work as a hyperlink
    // let professorRMPLink = document.createElement("p");
    // professorRMPLink.textContent = "Click to go to RateMyProfessors.com: " + allprofRatingsURL;

    let easyRatingText = document.createElement("p");
    easyRatingText.textContent = "Level of Difficulty" + ": " + easyRating.toFixed(1)
        .toString() + "/5.0";

    let wouldTakeAgainText = document.createElement("p");
    wouldTakeAgainText.textContent = "Would take again: " + wouldTakeAgain;

    let attendanceRequiredText = document.createElement("p");
    attendanceRequiredText.textContent = "Say Attendance Required: " + attendanceRequired;

    let topTagsText = document.createElement("p");
    topTagsText.textContent = "Top Tags: " + tagsToInclude.join(", ");

    let commentsHeader = document.createElement("p");
    commentsHeader.textContent = "Reviews (sorted by most thumbed up at top):";

    let div = document.createElement("div");
    div.appendChild(title);
    div.appendChild(professorText);
    // div.appendChild(professorRMPLink);
    div.appendChild(easyRatingText);
    div.appendChild(wouldTakeAgainText);
    div.appendChild(attendanceRequiredText);
    div.appendChild(topTagsText);
    div.appendChild(commentsHeader);

    // Add in all reviews.
    // TODO you'd think we could do this with </br> instead of having to make a new element for each review.
    for (let j = 0; j < commentsSorted.length; j++) {
        let commElem = document.createElement("p");
        if (commentsSorted[j] !== "No Comments") {
            commElem.innerText = commentsSorted[j];
            div.appendChild(commElem);
        }
    }

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
                    interactive: true,
                    contentAsHTML: true,
                    delay: 100,
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
 * TODO: there is a style in the style sheets that should apply this without having it here. Would allow further customization - Joe had idea after hackethon on correct file not being referenced.
 */
function applyStyles(ratingCell){
    ratingCell.innerHTML = "Overall Rating (click rating to go to RMP.com)";
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


/**
 * Sort a map by the value of the items descending.
 * @param wordsMap {map}
 * @returns {{name: string, total: *}[]}
 */
function sortByCount(wordsMap) {

    let finalWordsArray = [];
    finalWordsArray = Object.keys(wordsMap).map(function (key) {
        return {
            name: key,
            total: wordsMap[key]
        };
    });

    finalWordsArray.sort(function (a, b) {
        return b.total - a.total;
    });

    return finalWordsArray;
}