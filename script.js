const elections = {
    defaultElectionId: "2021gen",

    // test: {
    //     name: "Test",
    //     races: "past/test.json",
    //     data: "past/test.geojson",
    //     defaultRaceId: "3",
    // },
    "2021gen": {
        name: "2021 General",
        races: "past/2021gen_races.json",
        data: "past/2021gen.geojson",
        defaultRaceId: "9",
    },
    "2021prim": {
        name: "2021 Primary",
        races: "past/2021primary_races.json",
        data: "past/2021primary_data.geojson",
        defaultRaceId: "3",
    },
    "2020gen": {
        name: "2020 General",
        races: "past/2020gen_races.json",
        data: "past/2020gen_data.geojson",
        defaultRaceId: "300",
    },
    // "2020presprimary": {
    //     name: "2020 Presidential Primary",
    //     races: "past/2020presprimary_races.json",
    //     data: "past/2020presprimary.geojson",
    //     defaultRaceId: "111",
    // },
    // "2019gen": {
    //     name: "2019 General",
    //     races: "past/2019gen_races.json",
    //     data: "past/2019gen_data.geojson",
    //     defaultRaceId: "423",
    // },
    // "2018gen": {
    //     name: "2018 General",
    //     races: "past/2018gen_races.json",
    //     data: "past/2018gen_data.geojson",
    //     defaultRaceId: "43",
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
    document.getElementById("det-overundervotes").innerHTML = race.overvotes + "/" + race.undervotes
    document.getElementById("det-turnout").innerHTML = Math.round((race.ballots_cast / race.voters) * 100) + "%"
    document.getElementById("det-candidate-list").innerHTML = ""
    const votesForCandidatesInRace = race.ballots_cast - race.overvotes - race.undervotes
    const votesForCandidatesInPrecinct = precinctResults ? precinctResults.ballots_cast - precinctResults.overvotes - precinctResults.undervotes : 0
    for (i in race.candidates) {
        let can = race.candidates[i]
        // let li = document.createElement("li")
        document.getElementById("det-candidate-list").innerHTML += `<div class="key-color" style="background-color: ${can.color}; height: 20px; width: 20px;"></div>`
        document.getElementById("det-candidate-list").innerHTML += "<b>" + can.name + "</b><br>"
        const candidatePercent = can.total_votes / votesForCandidatesInRace
        document.getElementById("det-candidate-list").innerHTML += "<i class='small'>County</i><br>" + can.total_votes + " (" + Math.round(candidatePercent * 100) + "%)"
        if (precinctInfo && precinctResults && precinctResults.candidates[can.name]) {
            let precicntCan = precinctResults.candidates[can.name]
            const precinctCandidatePercent = precicntCan.count / votesForCandidatesInPrecinct
            const percentageDifference = precinctCandidatePercent - candidatePercent 
            const displayDiff = Math.round(percentageDifference * 1000)/10
            document.getElementById("det-candidate-list").innerHTML += "<br><i class='small'>" + precinctInfo.PRECINCT_N + "</i><br>" + precicntCan.count + " (" + Math.round(precinctCandidatePercent * 100) + "%) <small class='text-secondary'>" + (displayDiff > 0 ? "+" : displayDiff == 0 ? "±" : "") + displayDiff + "%</small>"
        }
        // document.getElementById("det-candidate-list").appendChild(li)
    }
    if (precinctInfo) {
        document.getElementById("det-precinct-name").innerHTML = precinctInfo.PRECINCT_N
        document.getElementById("det-precinct-reg-voters").innerHTML = precinctInfo.voters
        document.getElementById("det-precinct-ballots-cast").innerHTML = precinctResults.ballots_cast
        document.getElementById("det-precinct-overundervotes").innerHTML = precinctResults.overvotes + "/" + precinctResults.undervotes
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

function showRaceResults(raceID) {
    document.getElementById("race-list").value = raceID
    Elex.selectedRaceID = raceID
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
        Elex.map.getSource("precincts-"+Elex.selectedElection).setData(Elex.resultData)
        Elex.map.addLayer({
            "id": "precincts",
            "type": "fill",
            "source": "precincts-"+Elex.selectedElection,
            "paint": {
                "fill-color": ["get", "dcolor"],
                "fill-outline-color": "black",
                "fill-opacity": ["get", "dopacity"],
            }
        });
    }
}

const Elex = {
    selectedElection: elections.defaultElectionId,
    selectedRaceID: elections[elections.defaultElectionId].defaultRaceId,
    resultData: null,
    map: null,
    races: null,
}