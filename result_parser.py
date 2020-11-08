import json, requests, xmltodict

def write_data(string_data, content_desc):
    outfile = input(f"Enter an output file name for {content_desc}: ")
    with open(outfile, "w") as f:
        f.write(string_data)

def get_precinct_data():
    data = json.loads(open("precincts.geojson").read())
    indices = {}
    for i in range(len(data["features"])):
        if "PRECINCT_ID" in data["features"][i]["properties"]:
            indices[data["features"][i]["properties"]["PRECINCT_ID"]] = i
            data["features"][i]["properties"]["races"] = {}
            data["features"][i]["geometry"]["coordinates"] = round_all_floats(data["features"][i]["geometry"]["coordinates"])
    return (data, indices)

def extract_precinct_vote_data(precincts):
    res = []
    for p in precincts:
        res.append({
            "pid": p["id"],
            "voters": int(p["regVoters"]),
            "ballots_cast": int(p["ballotsCast"]),
        })
    return res

def round_all_floats(value):
    if type(value) == "float":
        return round(value, 6)
    elif type(value) == "list":
        for i in range(len(value)):
            return round_all_floats(value[i])
    else:
        return value

def get_party_map(parties):
    final = {}
    for p in parties:
        final[p["id"]] = p
    return final

PARTY_COLORS = {
    "dem": "blue",
    "rep": "red",
    "lib": "goldenrod",
    "approved": "green",
    # "Maintained": "green",
    "rejected": "orange",
    # "Repealed": "orange",
    "nonpart": [
        "purple", "green", "yellow", "salmon", "wheat", "olivedrab", "magenta"
    ]
}

def get_party_color(name, party, nonpart_index):
    if name == "Approved" or name == "Maintained":
        return PARTY_COLORS["approved"]
    elif name == "Rejected" or name == "Repealed":
        return PARTY_COLORS["rejected"]
    elif "Democrat" in party or "Progressive" in party or "Socialist" in party:
        return PARTY_COLORS["dem"]
    elif "Republican" in party or "GOP" in party:
        return PARTY_COLORS["rep"]
    elif "Green" in party or "Libertarian" in party:
        return PARTY_COLORS["lib"]
    else:
        if nonpart_index < len(PARTY_COLORS["nonpart"]):
            return PARTY_COLORS["nonpart"][nonpart_index]
        else:
            return "lightpink"

if __name__ == "__main__":
    url = input("Enter a URL with XML data: ")
    response = requests.get(url)
    if response:
        res = xmltodict.parse(response.text, attr_prefix="", cdata_key="value")["Owner"]
        # final_result = {}
        # final_result["timestamp"] = res["ReportTime"]
        # final_result["precincts"] = res["JurisdictionMap"]["Jurisdiction"]["Precinct"]
        # final_result["parties"] = res["PartyMap"]["Party"]

        precinct_data = get_precinct_data()
        geojson = precinct_data[0]
        precinct_map = precinct_data[1]
        precinct_vote_data = extract_precinct_vote_data(res["JurisdictionMap"]["Jurisdiction"]["Precinct"])

        party_map = get_party_map(res["PartyMap"]["Party"])

        races = res["Election"]["ContestList"]["Contest"]

        race_map = {}

        for race in races:
            name = race["title"]
            race_id = race["id"]
            race_map[race_id] = {
                "name": name,
                "candidates": [],
                "ballots_cast": int(race["ballotsCast"]),
                "voters": int(race["regVoters"]),
                "overvotes": int(race["overVotes"]),
                "undervotes": int(race["underVotes"]),
            }
            for p in precinct_vote_data:
                if p["pid"] in precinct_map:
                    precinct_index = precinct_map[p["pid"]]
                    geojson["features"][precinct_index]["properties"]["ballots_cast"] = p["ballots_cast"]
                    geojson["features"][precinct_index]["properties"]["voters"] = p["voters"]
            for race_summary in race["ContestGroup"]["ContestGroupVotes"]:
                if race_summary["refPrecinctId"] in precinct_map:
                    precinct_index = precinct_map[race_summary["refPrecinctId"]]
                    geojson["features"][precinct_index]["properties"]["races"][race_id] = {
                        "name": name,
                        "ballots_cast": int(race_summary["ballotsCast"]),
                        "undervotes": int(race_summary["underVotes"]),
                        "overvotes": int(race_summary["overVotes"]),
                        "candidates": {},
                    }
            candidate_count = 0
            used_colors = set()
            for candidate in race["Candidate"]:
                color = get_party_color(candidate["name"], party_map[candidate["partyId"]]["name"], candidate_count)
                if color in used_colors:
                    color = get_party_color("", "", candidate_count)
                used_colors.add(color)
                race_map[race_id]["candidates"].append({
                    "name": candidate["name"],
                    "party": party_map[candidate["partyId"]]["name"],
                    "total_votes": int(candidate["votes"]),
                    "color": color,
                })
                candidate_count += 1
                for count in candidate["Votes"]:
                    if count["refPrecinctId"] in precinct_map:
                        precinct_index = precinct_map[count["refPrecinctId"]]
                        # if race_id in geojson["features"][precinct_index]["properties"]["races"]:
                        geojson["features"][precinct_index]["properties"]["races"][race_id]["candidates"][candidate["name"]] = {
                            "count": int(count["value"]),
                            "color": color,
                        }
                        # else:
                        #     geojson["features"][precinct_index]["properties"]["races"][race_id] = {
                        #         "name": name,
                        #         "candidates": {
                        #             candidate["name"]: int(count["value"]),
                        #         },
                        #     }
        write_data(json.dumps(geojson), "spatial data")
        write_data(json.dumps(race_map), "race data")
        # print(res)