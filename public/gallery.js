/* 
Java Script Code, um alle Bilder in einer Gallery auf der Website mit dem 
jeweils gemessenen Gewicht anzuzeigen
*/
var datajson;
var data;


function checkIfToday(obj){
    const today = new Date();
    today.setHours(0,0,0,0);
    const objdate = new Date(obj.date);
    objdate.setHours(0,0,0,0);
    return today.getTime() === objdate.getTime();
}

function checkIfThisWeek(obj){
    const thisweek = new Date();
    thisweek.setDate(thisweek.getDate()-7);
    thisweek.setHours(0,0,0,0);
    const objdate = new Date(obj.date);
    objdate.setHours(0,0,0,0);
    return thisweek.getTime() <= objdate.getTime();
}

function sortStartingSmall(a,b){
    const weightA = parseFloat(a.weight.replace(",", "."));
    const weightB = parseFloat(b.weight.replace(",", "."));
    return weightA-weightB;
}

function sortStartingBig(a,b){
    const weightA = parseFloat(a.weight.replace(",", "."));
    const weightB = parseFloat(b.weight.replace(",", "."));
    return weightB-weightA;
}

function resetHighlights(){
    document.getElementById("buttonAlle").style.border = "none";
    document.getElementById("buttonHeute").style.border = "none";
    document.getElementById("buttonDieseWoche").style.border = "none";
    document.getElementById("buttonSmol").style.border = "none";
    document.getElementById("buttonBig").style.border = "none";
}

async function applyFilter(filter){
    var higlightedStyle;
    if(window.screen.width <= 480){
        higlightedStyle = `
            border: 2px solid white;
        `;
    } else{
        higlightedStyle = `
            border: 4px solid white;
         `;
    }

    resetHighlights();

    switch (filter) {
        case 1:
            data = data.filter(checkIfToday);
            document.getElementById("buttonHeute").style.cssText = higlightedStyle;
            break;
        case 2:
            data = data.filter(checkIfThisWeek);
            document.getElementById("buttonDieseWoche").style.cssText = higlightedStyle;
            break;
        case 3:
            data = data.sort(sortStartingSmall);
            document.getElementById("buttonSmol").style.cssText = higlightedStyle;
            break;
        case 4:
            data = data.sort(sortStartingBig);
            document.getElementById("buttonBig").style.cssText = higlightedStyle;
            break;
        default:
            document.getElementById("buttonAlle").style.cssText = higlightedStyle;
            break;
    }
}


async function loadJSONData(filter) {

    //get the metadata
    const response = await fetch("./data.json");
    datajson = await response.json();
    data = datajson.data;

    //no data there yet
    if(data == 0){
        //clear gallery-container
        var container = document.getElementById("gallery-container");
        while(container.firstChild){
            container.removeChild(container.firstChild);
        }

        //show "no data" text
        const text = document.createElement("h5");
        text.id = "datetext";
        text.innerText = "Noch keine Daten vorhanden";
        container.appendChild(text);

    } else {
        data.reverse(); //reverse order to show the newest pics first
        await applyFilter(filter); //check if filter is activated and style button accordingly

        //clear gallery-container
        var container = document.getElementById("gallery-container");
        while(container.firstChild){
            container.removeChild(container.firstChild);
        }
    
        //add img card to gallery for each data object (img+weight+date)
        data.forEach(obj => {
            var name = obj.img;
            var weight = obj.weight;
            var date = formatDate(obj.date);
    
            //text
            const imgcardtext = document.createElement("div");
            imgcardtext.id = "imgcardtext";
            
            const weighttext = document.createElement("h5");
            weighttext.id = "weighttext";
            weighttext.innerText = weight + " g";
    
            const datetext = document.createElement("h5");
            datetext.id = "datetext";
            datetext.innerText = date;

            //delete button
            const deleteButton = document.createElement("button");
            deleteButton.className = "btn";
            const i = document.createElement("i");
            i.className = "fa fa-trash";
            i.onclick = sendDeleteRequest(name);

            //img 
            const imgcard = document.createElement("div");
            imgcard.id = "imgcard";
            imgcard.className = "grid-item";
            const imgcont = document.createElement("div");
            imgcont.className = "container";
    
            const img = document.createElement("img");
            img.src = "/uploads/"+name;
            console.log(img.src);
            img.id = "image";
            img.alt = "tschweep"
            if(window.screen.width <= 480){
                img.width = 264;
                img.height = 198;
            } else{
                img.width = 320;
                img.height = 240;
                //img on hover
                img.onmouseenter = function(){
                    img.style.cssText  = `
                        border: 2px solid white;
                    `;
                    img.width = 316;
                    img.height = 236;
    
                };
                img.onmouseleave = function(){
                    img.style.border = "none";
                    img.width = 320;
                    img.height = 240;
                };
            }
            img.onclick = function(){
                console.log("img clicked");
                window.open(img.src);
            }
        
            //append
            deleteButton.appendChild(i);
            imgcont.appendChild(img);
            imgcont.appendChild(deleteButton);
            imgcardtext.appendChild(weighttext);
            imgcardtext.appendChild(datetext);
            imgcard.appendChild(imgcont);
            imgcard.appendChild(imgcardtext);
            container.appendChild(imgcard);
            
        });
    }

}

function formatDate(date){
    var dateobj = new Date(date);

    const options = {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      };
      
    var datestring = dateobj.toLocaleString("de-DE", options);
    return datestring;
}

function sendDeleteRequest(name){
    // console.log("deleting: " + name);
    // var myHeaders = new Headers();
    // myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    // var urlencoded = new URLSearchParams();
    // urlencoded.append("name", name);
    // urlencoded.append("password", "SWH2023");
    // urlencoded.append("type", "single");

    // var requestOptions = {
    // method: 'DELETE',
    // headers: myHeaders,
    // body: urlencoded,
    // redirect: 'follow'
    // };

    // fetch("https://smartesfutterhaus.onrender.com", requestOptions);
}
  
loadJSONData();



