const elections = {
    "latest": {
        "name": "General Election, November 2020",
        "races": "races.json",
        "data": "latest.geojson",
    },
    // "2019gen": {
    //     "name": "General Election, November 2019",
    //     "races": "past/2019gen_races.json",
    //     "data": "past/2019gen_data.geojson",
    // },
    // "2018gen": {
    //     "name": "General Election, November 2018",
    //     "races": "past/2018gen_races.json",
    //     "data": "past/2018gen_data.geojson",
    // },
    // "2016gen": {
    //     "name": "General Election, November 2016",
    //     "races": "past/2016gen_races.json",
    //     "data": "past/2016gen_data.geojson",
    // },
}

function getRaces(completion) {
    let request = new XMLHttpRequest()
    request.open("GET", elections[Elex.selectedElection].races, true)
    request.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            Elex.races = JSON.parse(request.responseText)
            if (typeof(completion) == "function") {
                completion(Elex.races)
            }
        }
    }
    request.send()
    // return JSON.parse(request.responseText)
}

function populateSidebar(precinctInfo, precinctResults) {
    let race = Elex.races[Elex.selectedRaceID]
    // document.getElementById("det-race-name").innerHTML = race.name
    document.getElementById("det-reg-voters").innerHTML = race.voters
    document.getElementById("det-ballots-cast").innerHTML = race.ballots_cast
    document.getElementById("det-turnout").innerHTML = Math.round((race.ballots_cast / race.voters) * 100) + "%"
    document.getElementById("det-candidate-list").innerHTML = ""
    for (i in race.candidates) {
        let can = race.candidates[i]
        // let li = document.createElement("li")
        document.getElementById("det-candidate-list").innerHTML += `<div class="key-color" style="background-color: ${can.color}; height: 20px; width: 20px;"></div>`
        document.getElementById("det-candidate-list").innerHTML += "<b>" + can.name + "</b><br>"
        document.getElementById("det-candidate-list").innerHTML += "<i class='small'>County</i><br>" + can.total_votes + " (" + Math.round((can.total_votes / race.ballots_cast) * 100) + "%)"
        if (precinctInfo && precinctResults && precinctResults.candidates[can.name]) {
            let precicntCan = precinctResults.candidates[can.name]
            document.getElementById("det-candidate-list").innerHTML += "<br><i class='small'>" + precinctInfo.PRECINCT_N + "</i><br>" + precicntCan.count + " (" + Math.round((precicntCan.count / precinctInfo.ballots_cast) * 100) + "%)"
        }
        // document.getElementById("det-candidate-list").appendChild(li)
    }
    if (precinctInfo) {
        document.getElementById("det-precinct-name").innerHTML = precinctInfo.PRECINCT_N
        document.getElementById("det-precinct-reg-voters").innerHTML = precinctInfo.voters
        document.getElementById("det-precinct-ballots-cast").innerHTML = precinctResults.ballots_cast
        document.getElementById("det-precinct-turnout").innerHTML = Math.round((precinctInfo.ballots_cast / precinctInfo.voters)*100) + "%"
    }
    document.getElementById("precinct-detail").hidden = precinctInfo == null
}

function getData(completion) {
    let req = new XMLHttpRequest()
    req.open("GET", elections[Elex.selectedElection].data, true)
    req.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            Elex.resultData = JSON.parse(this.responseText)
            if (typeof(completion) == "function") {
                completion(Elex.resultData)
            }
        }
    }
    req.send()
}

function showRaceResults(usingRaceID) {
    let raceID
    if (typeof (usingRaceID) == "string") {
        raceID = usingRaceID
    } else {
        raceID = document.getElementById("race-list").value
        Elex.selectedRaceID = raceID
    }
    for (i = 0; i < Elex.resultData.features.length; i++) {
        let precintData = Elex.resultData.features[i].properties
        precintData.dcolor = "black"
        precintData.dopacity = 0.0
        if (precintData.races && precintData.races[raceID]) {
            let candidates = precintData.races[raceID].candidates
            let totalCast = precintData.races[raceID].ballots_cast
            let maxVotes = 0
            let winner = null
            Object.keys(candidates).forEach(k => {
                if (candidates[k].count > maxVotes) {
                    maxVotes = candidates[k].count
                    winner = k
                }
            })
            if (winner != null) {
                precintData.dcolor = candidates[winner].color
                precintData.dopacity = candidates[winner].count / totalCast
            }
        }
    }
    populateSidebar()
    if (Elex.map) {
        if (Elex.map.getLayer('precincts')) {
            Elex.map.removeLayer("precincts")
        }
        Elex.map.getSource("precincts").setData(Elex.resultData)
        Elex.map.addLayer({
            "id": "precincts",
            "type": "fill",
            "source": "precincts",
            "paint": {
                "fill-color": ["get", "dcolor"],
                "fill-outline-color": "black",
                "fill-opacity": ["get", "dopacity"],
            }
        });
    }
}

const Elex = {
    selectedElection: "latest",
    selectedRaceID: "300",
    resultData: null,
    map: null,
    races: null,
}