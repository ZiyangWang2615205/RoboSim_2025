import Chart from 'chart.js/auto';
import { createGraph, createGraph2Ys } from '../ui/graph';
import "../ui/components/navbar";

type AlgorithmClient  = {
    ACID: string;
    name: string;
}

type Scenario  = {
    SID: string;
    name: string;
}

let chart: Chart;

generateScenarioGraph();
checkSwitchButton();


async function generateScenarioGraph() {
    // get acid from url
    const path_components = window.location.pathname.split("/");
    const urlacid = path_components[path_components.length - 1];

    // get scenarios
    let response = await fetch(`/api/graph/scenariosrun/${urlacid}`);
    const scenarios: Array<Scenario> = await response.json();

    // add all scenario names to xlabels
    let xlabels = [];
    for (let scenario of scenarios){
        xlabels.push(scenario.name)
    }
    let datasets = await generateDataSetsScenarios(scenarios, urlacid!)


    // generate the graph
    if (chart) chart.destroy();
    const canvas = document.getElementById("chart") as HTMLCanvasElement;
    chart = createGraph2Ys(canvas, "Current Algorithm's Performance", xlabels, "Scenarios", "Time Taken (s)", "Move Count", "Energy Used", datasets, true);
}

async function generateAcGraph(yOpt: string) {
    // change variables based on yOpt
    let fetchURL = "";
    let yLabel = "";
    if (yOpt === "Time Taken"){
        fetchURL = "/api/graph/top-acs/timetaken/default/10";
        yLabel = "Time Taken (s)";
    }
    else if (yOpt === "Move Count"){
        fetchURL = "/api/graph/top-acs/movecount/default/10";
        yLabel = "Move Count";
    }
    else if (yOpt === "Energy Used"){
        fetchURL = "/api/graph/top-acs/energyused/default/10";
        yLabel = "Energy Used";
    }
    else return;


    // get scenarios
    let response = await fetch(`/api/scenarios`);
    const scenarios: Array<Scenario> = await response.json();
    // get acid from url
    const path_components = window.location.pathname.split("/");
    const urlacid = path_components[path_components.length - 1];
    //get top 10 acs
    response = await fetch(fetchURL);
    const dataAC: Array<AlgorithmClient> = await response.json();

    const acs = makeDuplicateACsDistinct(dataAC);

    // add url acid to list of algorithm clients, at the beginning
    acs.unshift({ACID: urlacid!, name: "Current Algorithm"})

    // add all AC names to xlabels
    let xlabels = [];
    for (let acObj of acs){
        xlabels.push(acObj.name)
    }
    let datasets = await generateDataSetsAcs(yOpt, scenarios, acs)

    // generate the graph
    if (chart) chart.destroy();
    const canvas = document.getElementById("chart") as HTMLCanvasElement;
    chart = createGraph(canvas, "Current Algorithm Compared to Top 10 Best Performing Algorithms", xlabels, "Algorithms", yLabel, datasets, true);
}

async function generateDataSetsScenarios(scenarios: Scenario[], acid: string) {
    let datasets: {label: string; yAxisID: string, data: any; borderWidth: number}[] = [];
    let dataTime = [];
    let dataMoves = [];
    let dataEnergy = []
    for (let scenario of scenarios){
        // fetch time data
        let response = await fetch(`/api/graph/timetaken/${scenario.SID}/${acid}`);
        let resTime: Array<{time_taken: string}> = await response.json();
        if (resTime.length != 0){
                dataTime.push((resTime[0].time_taken as unknown as number)/1000); // convert from ms to s
        }

        // fetch move count data
        response = await fetch(`/api/graph/movecount/${scenario.SID}/${acid}`);
        let resMoves: Array<{move_count: string}> = await response.json();
        if (resMoves.length != 0){
                dataMoves.push(resMoves[0].move_count as unknown as number);
        }

        // fetch energy used data  -------------------------------------------------------energy needs to be implement
        response = await fetch(`/api/graph/energyused/${scenario.SID}/${acid}`);
        let resEnergy: Array<{energy_used: string}> = await response.json();
        if (resEnergy.length != 0){
                dataEnergy.push(resEnergy[0].energy_used as unknown as number);
        }
    }
    datasets.push({label: "Time Taken (s)", yAxisID: "y1", data: dataTime, borderWidth: 1});
    datasets.push({label: "Move Count", yAxisID: "y2", data: dataMoves, borderWidth: 1});
    datasets.push({label: "Energy Used", yAxisID: "y3", data: dataMoves, borderWidth: 1});
    return datasets;
}

async function generateDataSetsAcs(yOpt: string, scenarios: Scenario[], acs: AlgorithmClient[]){
    let datasets: {label: string; data: any; borderWidth: number}[] = [];
    for (let scenario of scenarios){
        let data = [];
        for (let acObj of acs){
            if (yOpt == "Time Taken"){
                let response = await fetch(`/api/graph/timetaken/${scenario.SID}/${acObj.ACID}`);
                let resObj: Array<{time_taken: string}> = await response.json();
                if (resObj.length != 0){
                    data.push((resObj[0].time_taken as unknown as number)/1000); // convert from ms to s
                }
                else data.push(0)
            } else if (yOpt == "Move Count") {
                let response = await fetch(`/api/graph/movecount/${scenario.SID}/${acObj.ACID}`);
                let resObj: Array<{move_count: string}> = await response.json();
                if (resObj.length != 0){
                    data.push((resObj[0].move_count as unknown as number));
                }
                else data.push(0)
            } else if (yOpt == "Energy Used") { // ------------------------------- Energy needs to be implement
                let response = await fetch(`/api/graph/energyused/${scenario.SID}/${acObj.ACID}`);
                let resObj: Array<{energy_used: string}> = await response.json();
                if (resObj.length != 0){
                    data.push((resObj[0].energy_used as unknown as number));
                }
                else data.push(0)
            } 
        }
        datasets.push({label: scenario.name, data: data, borderWidth: 1});
    }
    return datasets;
}

function makeDuplicateACsDistinct(acs: AlgorithmClient[]){
    let added: Set<AlgorithmClient> = new Set;
    let acsDistinct: AlgorithmClient[] = [];

    acs.forEach((item, index) => {
        let currentIsAdded = false;
        let count = 1;
        // only add item if it is not in added set
        if (!added.has(item)){
            // check for duplicate names
            for (let j = index + 1; j < acs.length; j++){
                if (acs[j].name === item.name){
                    // if there is a duplicate name
                    // only add current item once
                    if (!currentIsAdded){
                        acsDistinct.push({ACID: item.ACID, name: item.name + " - " + count})
                        count++;
                        currentIsAdded = true;
                    }
                    // add duplicate and add it to added set
                    acsDistinct.push({ACID: acs[j].ACID, name: acs[j].name + " - " + count})
                    count++;
                    added.add(acs[j])
                }
            }
            if (!currentIsAdded){ 
                //add current normally (in the case of no duplicates)
                acsDistinct.push(item);
            }
        }
    });
    return acsDistinct;
}

function checkSwitchButton(){
    const switchButton = document.getElementById("switchViewButton");
    const yAxisButton = document.getElementById("yAxisButton");
    let view: string = "Scenario";
    let yOpt: string = "Time Taken";

    switchButton!.addEventListener("click", function(){
        if (view == "Scenario"){
            view = "AC"
            generateAcGraph(yOpt);
            yAxisButton!.hidden = false;
        }
        else if (view == "AC"){
            view = "Scenario";
            generateScenarioGraph();
            yAxisButton!.hidden = true;
        }
    })

    yAxisButton!.addEventListener("click", function(){
        if (view == "AC"){
            if (yOpt === "Time Taken") {
                yOpt = "Move Count";
            } else if (yOpt === "Move Count") {
                yOpt = "Energy Used";
            } else if (yOpt === "Energy Used") {
                yOpt = "Time Taken";
            }
            generateAcGraph(yOpt);
        }
    })
}
