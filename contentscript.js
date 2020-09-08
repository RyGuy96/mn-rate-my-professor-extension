
//TODO: this really needs some at least rudimentary error handling
main();

/**
 * Set all listeners and populate current page with RMP data
 */
function main() {
    addRMPColumn();
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
 * TODO: this is ridiculously sloppy; extension shouldn't inhibit normal user behavior in any way.
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
 * Determine which school's registration page is being looked at by referencing location image in table
 * that can't be easily handled).
 * TODO school data should be in json or xml doc not a million if-elses: this almost worked, changed in manifest:
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
 * Add summary column with professor ratings.
 */
function addRMPColumn() {

    // Remove last column if one was prev added by extension
    if (document.getElementsByClassName("RMPCell").length > 0) {
        $('td.RMPCell:last-child').remove();
    }
    if($('.RMPHeader').length > 0){
        $('.RMPHeader').remove();
    }

    let table = document.querySelector("#searchResultsContainer > table");
    let className = "";
    if (table !== null) {
        let myurl = "https://search-production.ratemyprofessors.com/solr/rmp/select/?solrformat=true&rows=2&wt=json&q=";
        let newCell;
        let columnValue = 0;
        let found = false;
        for (let i = 0, row; row = table.rows[i]; i++) {
            if (i === 0) {
                let ratingCell = row.insertCell(row.length);
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

            } else {
                newCell = row.insertCell(row.length);
            }
            for (let j = 0, col; col = row.cells[j]; j++) {
                if (found && j === columnValue) {
                    let professor = col.innerText;
                    if (professor.indexOf(',') >= 0) {
                        let fullName = col.innerText;
                        fullName = fullName.replace(/(\r\n|\n|\r)/gm, "");
                        let splitName = fullName.split(",");
                        let lastName = splitName[0];
                        let firstName = splitName[1];
                        let middleName;
                        if (splitName.length > 2) {
                            middleName = splitName[2];
                            middleName = middleName.toLowerCase();
                        }
                        lastName = lastName.toLowerCase();
                        lastName = lastName.trim();
                        firstName = firstName.toLowerCase();
                        firstName = firstName.trim();
                        myurl1 = myurl + firstName + "+" + lastName + "+AND+schoolid_s%" + getSchoolRMPId();
                        let runAgain = true;
                        GetProfessorRating(myurl1, newCell, splitName, firstName, middleName, runAgain);
                    }
                }
                if ($(col).hasClass('yui-dt0-col-Instructor')) {
                    columnValue = j;
                    found = true;
                }
            }
        }
    }
}


/**
 * Lookup and populate professor ratings on Rate My Professor.
 */
function GetProfessorRating(myurl1, newCell, splitName, firstName) {

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
                AddTooltip(newCell, allprofRatingsURL, realFirstName, realLastName);
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
 * Add popup when hover over professor rating column with summary data.
 */
function AddTooltip(newCell, allprofRatingsURL, realFirstName, realLastName) {
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
        let div = document.createElement("div");
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
        div.appendChild(title);
        div.appendChild(professorText);
        div.appendChild(easyRatingText);
        div.appendChild(wouldTakeAgainText);
        div.appendChild(classText);
        div.appendChild(commentText);
        newCell.class = "tooltip";
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
    });
}