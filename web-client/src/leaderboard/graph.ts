import Chart from 'chart.js/auto';
import { createGraph } from '../ui/graph';
import "../ui/components/navbar";

type AlgorithmClient = {
    acid: string;
    name: string;
}

type Scenario = {
    sid: string;
    name: string;
}

let chart: Chart;

generateDefaultGraph();
populateScenarioDropdown();
populateACDropdown();
updateInputs();



function updateInputs() {
    let expandedAC = false;

    const generateButton = document.getElementById("generateButton")!;
    const selectAC = document.getElementById("selectAC")!;
    const selectScenarios = document.getElementById("selectScenarios") as HTMLSelectElement;
    const selectYaxis = document.getElementById("selectYAxis") as HTMLSelectElement;


    generateButton.addEventListener("click", generateGraph);

    selectAC.addEventListener("click", function () {
        const checkboxes = document.getElementById("checkboxesAC")!;
        if (!expandedAC) {
            checkboxes.style.display = "block";
            expandedAC = true;
        } else {
            checkboxes.style.display = "none";
            expandedAC = false;
        }
    });
    
    // close checkbox dropdowns when user clicks outside
    document.addEventListener("click", function(e){
        let target = e.target as HTMLElement;
        // check that the target isnt the area that triggers the dropdown (id overAC), the label (which has parent checkboxesAC) 
        // or the checkbox itself (whose id starts with AC)
        if(target.id !== 'overAC' && !target.id.startsWith("AC") && target.parentElement!.id !== "checkboxesAC"){
            const checkboxes = document.getElementById("checkboxesAC")!;
            checkboxes.style.display = "none";
            expandedAC = false;
        }
    });

    // change ACs listed in dropdown depending on what scenarios and y-axis options are selected
    selectScenarios.addEventListener("change", () => populateACDropdown(selectScenarios.value, selectYaxis.value))
    selectYaxis.addEventListener("change", () => populateACDropdown(selectScenarios.value, selectYaxis.value))
}

async function generateDefaultGraph() {
    // get scenarios
    let response = await fetch(`/api/scenarios`);
    const scenarios: Array<Scenario> = await response.json();
    //get top 10 acs
    response = await fetch(`/api/graph/top-acs/timetaken/default/10`);
    const dataAC: Array<AlgorithmClient> = await response.json();

    const acs = makeDuplicateACsDistinct(dataAC);

    let datasets: {label: string; data: any; borderWidth: number}[] = [];
    let xlabels = [];
    // add all AC names to xlabels
    for (let acObj of acs){
        xlabels.push(acObj.name)
    }
    datasets = await generateDataSets("Time Taken", scenarios, acs)

    // generate the graph
    if (chart) chart.destroy();
    const canvas = document.getElementById("chart") as HTMLCanvasElement;
    chart = createGraph(canvas, "Top 10 Best Performing Algorithms", xlabels, "Algorithms", "Time Taken (s)", datasets, true);
}

async function generateGraph() {
    // //clear any previous error messages
    // const errormsgs = document.getElementsByClassName("error-msg");
    // // we must use this method as the array gets smaller each time we call remove
    // const len = errormsgs.length
    // for (let i = 0; i < len; i++){
    //     errormsgs.item(0)!.remove();
    // }

    // check which boxes are checked
    const checkboxes = document.getElementsByTagName("input");
    const labels = document.getElementsByTagName("label");
    const acsChecked: AlgorithmClient[] = [];

    const ySelect = (document.getElementById("selectYAxis") as HTMLSelectElement)
    const scenarioSelect = (document.getElementById("selectScenarios") as HTMLSelectElement)
    
    // add all checked acs to acsChecked list
    for (let checkbox of checkboxes){
        if (checkbox.checked){
            const id = checkbox.id;

            // get the parent label element 
            const label = checkbox.parentElement as HTMLLabelElement;
            if (id.startsWith("AC")){
                acsChecked.push({name: label!.innerText, acid: id.substring("AC".length)});
            }
        }
    }    
    // do not generate graph if no options have been selected for scenario or y-axis
    if (scenarioSelect.value == "Select Scenario" || ySelect.value == "Select Y-Axis Option/s"){
        return;
    }

    // fetch the data corresponding to the boxes that are checked
    let datasets: {label: string; data: any; borderWidth: number}[] = [];
    let xlabels = [];
    let ylabel;
    let displayLegend: boolean = true;

    if (ySelect.value == "Time Taken") ylabel = "Time Taken (s)";
    else if (ySelect.value == "Number of Moves") ylabel = "Number of Moves";
    else if (ySelect.value == "Energy Used") ylabel = "Energy Used"; // Energy part needs to implement --------------------------
    // add all AC names to xlabels
    for (let ACObj of acsChecked){
        xlabels.push(ACObj.name)
    }

    if (scenarioSelect.value == "All Scenarios"){
        const response = await fetch(`/api/scenarios`);
        const scenarios: Scenario[] = await response.json();
        datasets = await generateDataSets(ySelect.value, scenarios, acsChecked);
    }
    else{ // individual scenario has been selected
        const scenarios: Scenario[] = [{sid: scenarioSelect.value, name:""}]
        datasets = await generateDataSets(ySelect.value, scenarios, acsChecked);
        displayLegend = false;
    }

    // generate the graph
    if (chart) chart.destroy();
    const canvas = document.getElementById("chart") as HTMLCanvasElement;
    chart = createGraph(canvas, "Top 10 Best Performing Algorithms", xlabels, "Algorithms", ylabel!, datasets, displayLegend);

}

function createErrorMsg(acName: string, scenarioName: string){
    // let text = document.createElement("p");
    // text.insertAdjacentText
    // text.textContent = "Algorithm: '" + acName + "' has not completed scenario: '" + scenarioName + "'.";
    // text.className = "error-msg"
    // let graphOpts = document.getElementById("graph-options")!;
    // graphOpts.insertAdjacentElement('afterend',text);
}

async function generateDataSets(yOpt: string, scenarios: Scenario[], acs: AlgorithmClient[]){
    let datasets: {label: string; data: any; borderWidth: number}[] = [];
    for (let scenario of scenarios){
        let data = [];
        // fix to safely grab id
        const sId = (scenario as any).id || (scenario as any).SID || scenario.sid;

        for (let acObj of acs){
            if (yOpt == "Time Taken"){
                let response = await fetch(`/api/graph/timetaken/${sId}/${acObj.acid}`);
                let resObj: Array<{time_taken: string}> = await response.json();

                // if we get no data back, show an error message
                if (resObj.length == 0){
                    data.push(0);
                    createErrorMsg(acObj.name, scenario.name);
                }
                else data.push((resObj[0].time_taken as unknown as number)/1000); // convert from ms to s
            }
            else if (yOpt == "Number of Moves"){
                let response = await fetch(`/api/graph/movecount/${sId}/${acObj.acid}`);
                let resObj: Array<{move_count: string}> = await response.json();

                // if we get no data back, show an error message
                if (resObj.length == 0){
                    data.push(0);
                    createErrorMsg(acObj.name, scenario.name);
                }
                else data.push((resObj[0].move_count as unknown as number));
            }
            else if (yOpt == "Energy Used") {
                let response = await fetch(`/api/graph/energyused/${sId}/${acObj.acid}`);
                let resObj: Array<{energy_used: string}> = await response.json();

                // if we get no data back, show an error message
                if (resObj.length == 0){
                    data.push(0);
                    createErrorMsg(acObj.name, scenario.name);
                }
                else data.push((resObj[0].energy_used as unknown as number)); 
            }
        }
        if (scenario.name == "") datasets.push({label: "", data: data, borderWidth: 1});
        else datasets.push({label: scenario.name, data: data, borderWidth: 1});
    }
    return datasets;
}

async function populateScenarioDropdown(){
    const selectScenarios = document.getElementById("selectScenarios") as HTMLSelectElement;

    try {
        const response = await fetch(`/api/scenarios`);
        const data: Array<Scenario> =
            await response.json();

        data.forEach((item) => {
            const option = document.createElement("option");

            // fix to safely grabbing id
            const scenarioId = (item as any).id || (item as any).SID || item.sid;
            option.value = String(scenarioId);

            option.text = item.name;
            selectScenarios.appendChild(option);
        });
    } catch (error) {
        console.error("Error fetching data: ", error);
    }
}

async function populateACDropdown(sid: string = "default", yAxis: string = "Time Taken"){
    const checkboxAC = document.getElementById("checkboxesAC") as HTMLElement;
    // delete current children
    checkboxAC.replaceChildren();
    // if 'All Scenarios' has been selected, get default ACs
    if (sid == "All Scenarios"){
        sid = "default";
    }

    try {
        // get the top 10 acs
        let response;
        if (yAxis == "Time Taken"){
            response = await fetch(`/api/graph/top-acs/timetaken/${sid}/10`);
        }
        else if (yAxis == "Number of Moves"){
            response = await fetch(`/api/graph/top-acs/movecount/${sid}/10`);
        }
        else if (yAxis == "Energy Used") { // ------------------- need to implement energy used API (related to database)----------------------------- 
            response = await fetch(`/api/graph/top-acs/energyused/${sid}/10`);
        }

        let dataAC: Array<AlgorithmClient> =
            await response!.json();

        const acs = makeDuplicateACsDistinct(dataAC);

        // add each ac to the html
        for (let ac of acs){
            const labelAC = document.createElement("label");
            const checkAC = document.createElement("input");
            checkAC.id = "AC"+ac.acid;
            checkAC.type = "checkbox";
            checkboxAC.appendChild(labelAC);
            labelAC.appendChild(checkAC);
            labelAC.insertAdjacentText('beforeend', " "+ac.name);
        }
    } catch (error) {
        console.error("Error fetching data: ", error);
    }
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
                        acsDistinct.push({acid: item.acid, name: item.name + " - " + count})
                        count++;
                        currentIsAdded = true;
                    }
                    // add duplicate and add it to added set
                    acsDistinct.push({acid: acs[j].acid, name: acs[j].name + " - " + count})
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
