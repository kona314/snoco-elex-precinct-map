import json

geo = json.loads(open("precinct_map.geojson").read())
info = json.loads(open("test.json").read())["precincts"]

conversion = {}

for p in info:
    old = p["ImportID"]
    actual = p["id"]
    conversion[old] = actual

for i in range(len(geo["features"])):
    old = geo["features"][i]["properties"].pop("PRECINCT")
    if old in conversion:
        geo["features"][i]["properties"]["PRECINCT_ID"] = conversion[old]
        geo["features"][i]["properties"].pop("PERIMETER", None)
        geo["features"][i]["properties"].pop("STLength", None)
        geo["features"][i]["properties"].pop("Area", None)
        geo["features"][i]["properties"].pop("STArea", None)
        geo["features"][i]["properties"].pop("VOTEPREC", None)
        geo["features"][i]["properties"].pop("VOTEPREC_I", None)

with open("precincts.geojson", "w") as f:
    f.write(json.dumps(geo))