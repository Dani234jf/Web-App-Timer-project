

const buttonChangeTimeMode = document.querySelector("#switchModeButton");
const timeModeText = document.querySelector("#time-state");
const buttonsFocusMode = Array.from(document.querySelectorAll("#focus-buttons > button"));
const buttonsBreakMode = Array.from(document.querySelectorAll("#break-buttons > button"));
const buttonStart = document.querySelector("#start-timer");
const buttonStop = document.querySelector("#end-timer");
const inputTimeMinutes = document.querySelector("#input-minutes");
const inputTimeSeconds = document.querySelector("#input-seconds");
const infoPopup = document.querySelector("#info-popup");
const buttonOpenHelp = document.querySelector("#help-button");
const buttonCloseHelp = document.querySelector("#close-help-section");
const helpSection = document.querySelector("#help-section");
const helpSectionBackground = document.querySelector("#help-section-background");
const infoPopupSize = {
    "x": infoPopup.getBoundingClientRect().width,
    "y": infoPopup.getBoundingClientRect().height 
};
const graphBars = Array.from(document.querySelectorAll(".graph-bar > div"));
const graphBarsText = Array.from(document.querySelectorAll(".graph-bar p"));
let isHouveringBars = false;
const allInteractableButtonsInputs = [inputTimeMinutes, inputTimeSeconds, ...buttonsBreakMode, ...buttonsFocusMode];
const timerCircle = document.querySelector("#outer-circle");
const maxTimeIndicator = document.querySelector("#max-time");
const daysGraphNumbers = Array.from(document.querySelectorAll("#numbers p"));
const currentDayElementStats = Array.from(document.querySelectorAll(".stat > .value"));
let daysGraphArray = [];
let hoverGraphBar = null;

let focusButtonsText = ["60:00", "45:00", "35:00", "25:00"];
let breakButtonsText = ["35:00", "25:00", "15:00", "05:00"];
let hoursFocusTimeGraph = [0,0,0,0,0,0,0,0,0,0];
let currentDayStats = [0,0,0,0];

class Time {
    constructor(minutes = 0, seconds = 0) {
        this.minutes = minutes;
        this.seconds = seconds;
    }
    parse() {
        return new Time(Number(this.minutes),Number(this.seconds)) 
    }
    static convertToText = (time) => {
        if ( time.seconds >= 60 ) {
            time.seconds = 0;
            time.minutes++;
        }
        time.seconds = Number(time.seconds);
        time.minutes = Number(time.minutes);
        let timeSecondsConv = time.seconds < 10 ? `0${time.seconds}` : time.seconds;
        let timeMinutesConv = time.minutes < 10 ? `0${time.minutes}` : time.minutes;
        return `${timeMinutesConv}:${timeSecondsConv}`;
    }
    static convertToTime = (time) => {
        let timeNumbers = time.split(':');
        if ( timeNumbers.length != 2 || isNaN(timeNumbers[0]) || isNaN(timeNumbers[1]) ) { throw new Error("Error in converting TimeString to Time object"); }
        return new Time(Number(timeNumbers[0]), Number(timeNumbers[1]));
    }
    isValid() {
        return ( !isNaN(this.minutes) && !isNaN(this.seconds) && this.minutes != "");
    }
    isEqual(time) {
        return ( this.seconds == time.seconds && this.minutes == time.minutes );
    }
}

class TimeMode {
    #timeMode;
    constructor(timeMode) {
        this.#timeMode = this.verifyMode(timeMode);
    }
    verifyMode = (timeMode) => {
        if ( timeMode == "FocusMode" || timeMode == "BreakMode" ) { return timeMode; }
        else { throw new Error(`Invalid timeMode, trying to verify => \"${timeMode}\"`); }
    }
    get() {
        return this.#timeMode;
    }
    set = (timeMode) => {
        this.#timeMode = this.verifyMode(timeMode);
    }
    switch() {
        if (this.#timeMode == "FocusMode") {
            this.#timeMode = "BreakMode";
        }
        else {
            this.#timeMode = "FocusMode";
        }
    }
}

let timeMode = new TimeMode("FocusMode");
let timeFocusModeSelection = 1;
let timeBreakModeSelection = 1;
let currentTimer = null;
let startTime = null;
let lastElapsedTime = 0;

const setSelectedButtonIndex = (collectionButtons, index) => {
    collectionButtons.forEach( (element,i) => {
        if ( i == index ) {
            element.classList.add("selected");
        }
        else {
            element.classList.remove("selected");
        }
    });
};

const setSelectedButton = (collectionButtons) => {
    collectionButtons.forEach( (element,i) => {
        element.addEventListener("click", () => {
            element.classList.add("selected");
            if ( collectionButtons == buttonsBreakMode ) { timeBreakModeSelection = i + 1; }
            else { timeFocusModeSelection = i + 1; }
            collectionButtons.forEach( (el,j) => {
                if ( j != i ) {
                    el.classList.remove("selected");
                }
            });
        });
    });
};

const getTimeFromInput = () => {
    return new Time(inputTimeMinutes.value, inputTimeSeconds.value);
};

const addTimeToButtonsStream = (timeMode) => {
    let timesButtons = [];
    let buttonsList = timeMode.get() == "FocusMode" ? buttonsFocusMode : buttonsBreakMode;
    for ( let i = 0; i < buttonsList.length; i++ ) {
        timesButtons.push(buttonsList[i].textContent);
    }
    buttonsList[0].innerHTML = Time.convertToText(getTimeFromInput());  
    for ( let i = 1; i < buttonsList.length; i++ ) {
        buttonsList[i].textContent = timesButtons[i-1];
    }
    if ( timeMode.get() == "FocusMode" ) {
        timeFocusModeSelection = 1;
        setSelectedButtonIndex(buttonsFocusMode, 0);
    }
    else {
        timeBreakModeSelection = 1;
        setSelectedButtonIndex(buttonsBreakMode, 0);
    }
};

const setInputText = () => {
    let activeTimeButtonsGroup = timeMode.get() == "FocusMode" ? buttonsFocusMode : buttonsBreakMode;
    let activetimeSelection = timeMode.get() == "FocusMode" ? timeFocusModeSelection : timeBreakModeSelection;
    
    let timeFromButton = Time.convertToTime(activeTimeButtonsGroup[activetimeSelection - 1].textContent);
    inputTimeMinutes.value = timeFromButton.minutes == 0 ? "00" : timeFromButton.minutes < 10 ? `0${timeFromButton.minutes}` : timeFromButton.minutes;
    inputTimeSeconds.value = timeFromButton.seconds == 0 ? "00" : timeFromButton.seconds < 10 ? `0${timeFromButton.seconds}` : timeFromButton.seconds;
};

const switchAllInteractions = (groupElements, enable) => {
    groupElements.forEach( (element) => {
        element.disabled = !enable;
    });
};

const timeContainsButtons = (time, buttonsGroup) => {
    for ( let element of buttonsGroup ) {
        let timeParsed = time.parse();
        let timeFromButtonParsed = Time.convertToTime(element.textContent).parse();
        if ( timeParsed.isEqual(timeFromButtonParsed) ) { return true;}
    }
    return false;
};

const getIndexButtonInGroup = (time, buttonsGroup) => {
    for ( let i = 0; i < buttonsGroup.length; i++ ) {
        let timeParsed = time.parse();
        let timeFromButtonParsed = Time.convertToTime(buttonsGroup[i].textContent).parse();
        if ( timeParsed.isEqual(timeFromButtonParsed) ) { return i + 1;}
    }
    return -1;
};

const setElapsedTimeStats = () => {
    let hours = lastElapsedTime / 3600;
    if ( timeMode.get() == "FocusMode" ) {
        currentDayStats[0]+= hours;
        hoursFocusTimeGraph[hoursFocusTimeGraph.length-1]+= hours;
        setGraphBars();
    }
    else {
        currentDayStats[1]+= hours;
    }
    setDayStats();
};

const setCurrentTimeOfTimer = () => {
    const timerIntreval = setInterval( () => {
        if ( currentTimer == null ) {
            clearInterval(timerIntreval);
            return;
        }
        let elapsedTime = (performance.now() - startTime) / 1000;
        lastElapsedTime = elapsedTime;
        let initialTimeInDecimal = Number(currentTimer.minutes) + (Number(currentTimer.seconds) / 60);
        let timeInDecimal = initialTimeInDecimal - ( elapsedTime / 60 );
        if (timeInDecimal < 0) {
            setElapsedTimeStats();
            clearInterval(timerIntreval);
            onTimerDeactivated();
            return;
        }

        let time = Time.convertToText(new Time(Math.floor(timeInDecimal), Math.round((timeInDecimal - Math.floor(timeInDecimal)) * 60)));
        setCurrentProgressTimer(timeInDecimal,initialTimeInDecimal);
        let partTime = time.split(':');
        inputTimeMinutes.value = partTime[0];
        inputTimeSeconds.value = partTime[1];
    }, 50);
};

const setCurrentProgressTimer = (progress, total) => {
    let progressAngle = (progress / total ) * 360 ;
    timerCircle.style.maskImage = `conic-gradient(from 90deg, transparent 0deg ${progressAngle}deg, black 0.01deg 180deg)`;
    timerCircle.style.webkitMaskImage = `conic-gradient(from 90deg, transparent 0deg ${progressAngle}deg, black 0.01deg 180deg)`;
};

const onTimerActivated = () => {
    switchAllInteractions(allInteractableButtonsInputs, false);
    document.querySelector("body").setAttribute("active","");
    maxTimeIndicator.textContent = Time.convertToText(currentTimer);
    timeModeText.textContent = `${timeModeText.textContent} ON`;
    startTime = performance.now();
    setCurrentTimeOfTimer();
};

const onTimerDeactivated = () => {
    currentTimer = null;
    startTime = null;
    document.querySelector("body").removeAttribute("active");
    switchAllInteractions(allInteractableButtonsInputs, true);
    setElapsedTimeStats();
    timeMode.switch();
    if ( timeMode.get() == "FocusMode" ) {
        timeModeText.textContent = "Focus Time";
    }
    else {
        timeModeText.textContent = "Break Time";
    }
    timerCircle.style.maskImage = `conic-gradient(from 90deg, transparent 0deg 0deg, black 0.01deg 180deg)`;
    timerCircle.style.webkitMaskImage = `conic-gradient(from 90deg, transparent 0deg 0deg, black 0.01deg 180deg)`;
    setInputText();
};

const generateDaysArray = () => {
    let todayTime = new Date();
    for ( let i = 9; i >= 0; i-- ) {
        daysGraphArray[i] = todayTime.getDate();
        todayTime.setDate( todayTime.getDate() - 1 );
    }
};

const synchronizeDays = () => {
    generateDaysArray();
    if (daysGraphArray.length != 10) { throw new Error("Cannot synchronize, daysGraphArray invalid."); }
    daysGraphNumbers.forEach( (element,i) => {
        element.textContent = daysGraphArray[i];
    });
};

const setGraphBars = () => {
    let maxHour = Math.max(...hoursFocusTimeGraph);
    let graphHeight = document.querySelector("#bars").getBoundingClientRect().height;
    
    for ( let i = 0; i < 10; i++ ) {
        let realtiveHoursHeight = (hoursFocusTimeGraph[i] / maxHour) * graphHeight;
        if ( maxHour <= 0 ) { 
            graphBars[i].style.opacity = 0;
        }
        else {
            graphBars[i].style.opacity = 1;
        }
        graphBars[i].style.height = `${realtiveHoursHeight}px`;
        
        let timeMin = Math.round( (hoursFocusTimeGraph[i] - Math.floor(hoursFocusTimeGraph[i])) * 60 );
        
        graphBarsText[i].textContent = `${Math.floor(hoursFocusTimeGraph[i])}h${timeMin}min`;
    }
    saveGraphHours();
};

const setDayStats = () => {
    for ( let i = 0; i < 4; i++ ) {
        if ( i >= 0 && i <= 1 ) {
            let timeMin = ( currentDayStats[i] - Math.floor(currentDayStats[i])) * 60;
            currentDayElementStats[i].textContent = `${Math.floor(currentDayStats[i])}h${Math.round(timeMin)}min`;
        }
        else {
            currentDayElementStats[i].textContent = currentDayStats[i];
        }
    }
    saveDayStats();
};

const setInfoPopUpText = () => {
    infoPopup.textContent = hoverGraphBar.previousElementSibling.textContent;
};

const setButtonsText = () => {
    for ( let i = 0; i < buttonsFocusMode.length; i++ ) {
        buttonsFocusMode[i].textContent = focusButtonsText[i];
    }
    for ( let i = 0; i < buttonsFocusMode.length; i++ ) {
        buttonsBreakMode[i].textContent = breakButtonsText[i];
    }
};

const updateButtonsTextVar = () => {
    console.log("updating buttons Text");
    for ( let i = 0; i < buttonsFocusMode.length; i++ ) {
        focusButtonsText[i] = buttonsFocusMode[i].textContent; 
    }
    for ( let i = 0; i < buttonsFocusMode.length; i++ ) {
        breakButtonsText[i] = buttonsBreakMode[i].textContent; 
    }
    saveButtonsText();
};

const moveHoursOfDaysGraph = (daysDif) => {
    if ( daysDif == 0 ) { return; }
    if ( daysDif > 10 ) {
        hoursFocusTimeGraph = [0,0,0,0,0,0,0,0,0,0];
    }
    else {
        let newHoursFocusTimeGraph = [0,0,0,0,0,0,0,0,0,0];
        for ( let i = 0; i < hoursFocusTimeGraph.length; i++ ) {
            if ( i - daysDif >= 0 ) {
                newHoursFocusTimeGraph[i - daysDif] = hoursFocusTimeGraph[i];
            }
        }
        hoursFocusTimeGraph = newHoursFocusTimeGraph;
    }
};

const updateGraphHoursFromDay = () => {

    if ( localStorage.getItem("lastDateVisited") == null ) {
        localStorage.setItem("lastDateVisited",JSON.stringify(new Date()));
        onFirstTimeLoadingSite();
    }
    else {
        loadGraphHours();
        console.log(`previus graph hours => ${hoursFocusTimeGraph}`);
        let todayDate = new Date();
        let lastDate = new Date(JSON.parse(localStorage.getItem("lastDateVisited")));
        todayDate.setHours(0,0,0,0);
        lastDate.setHours(0,0,0,0);
        let daysDif = Math.floor( ( todayDate - lastDate ) / (1000 * 60 * 60 * 24) );
        localStorage.setItem("lastDateVisited",JSON.stringify(new Date()));
        if ( daysDif > 0 ) {
            moveHoursOfDaysGraph(daysDif);
            currentDayStats = [0,0,0,0];
        }
        else {
            loadDayStats();
        }
        setGraphBars();
        loadButtonsText();
        console.log(`daysDif => ${daysDif}`);
        console.log(`current graph hours => ${hoursFocusTimeGraph}`);
    }
};

const throwErrorLoading = (dataName) => {
    throw Error(`Error loading saved data from ${dataName}`);
}

const saveButtonsText = () => {
    localStorage.setItem("focusButtonsText", JSON.stringify(focusButtonsText));
    localStorage.setItem("breakButtonsText", JSON.stringify(breakButtonsText));
};

const loadButtonsText = () => {
    let loadedData = JSON.parse(localStorage.getItem("focusButtonsText"));
    if ( loadedData != null ) {
        focusButtonsText = loadedData;
    } else { throwErrorLoading("buttonsTextFocusMode"); }
    loadedData = JSON.parse(localStorage.getItem("breakButtonsText"));
    if ( loadedData != null ) {
        breakButtonsText = loadedData;
    } else { throwErrorLoading("buttonsTextBreakMode"); }
};

const saveDayStats = () => {
    localStorage.setItem("currentDayStats", JSON.stringify(currentDayStats));
};

const loadDayStats = () => {
    currentDayStats = JSON.parse(localStorage.getItem("currentDayStats"));
};

const saveGraphHours = () => {
    localStorage.setItem("hoursFocusTimeGraph", JSON.stringify(hoursFocusTimeGraph));
}

const loadGraphHours = () => {
    let newHoursFocusTimeGraph = JSON.parse(localStorage.getItem("hoursFocusTimeGraph"));
    console.log(newHoursFocusTimeGraph);
    hoursFocusTimeGraph = newHoursFocusTimeGraph;
}

const onFirstTimeLoadingSite = () => {
    saveButtonsText();
    saveDayStats();
    saveGraphHours();
};

const forceReflow = (element) => {
    void element.offsetHeight;
}

setSelectedButton(buttonsBreakMode);
setSelectedButton(buttonsFocusMode);


updateGraphHoursFromDay();

synchronizeDays();
setGraphBars();
setDayStats();
setButtonsText();
setInputText();

buttonOpenHelp.addEventListener("click", () => {
    helpSection.style.display = "grid";
    helpSectionBackground.style.display = "block";
    forceReflow(helpSection);
    helpSection.classList.add("open");
});

buttonCloseHelp.addEventListener("click", () => {
    helpSection.classList.remove("open");
    setTimeout(() => {
        helpSection.style.display = "none";
        helpSectionBackground.style.display = "none";
    }, 250);
});

buttonChangeTimeMode.addEventListener("click", () => {
    timeMode.switch();
    setInputText();
    timeModeText.textContent = timeMode.get() == "FocusMode" ? "Focus Time" : "Break Time";
});

buttonsBreakMode.forEach( (element) => {
    element.addEventListener("click", () => {
        if ( timeMode.get() == "BreakMode" ) {
            setInputText();
        }
    });
});

buttonsFocusMode.forEach( (element) => {
    element.addEventListener("click", () => {
        if ( timeMode.get() == "FocusMode" ) {
            setInputText();
        }
    });
});

buttonStart.addEventListener("click", () => {
    let timeFromInput = getTimeFromInput();
    if ( timeFromInput.isValid() ) {
        if ( timeMode.get() == "FocusMode" && !timeContainsButtons(timeFromInput, buttonsFocusMode) ) {
            addTimeToButtonsStream(timeMode);
        }
        else if (timeMode.get() == "FocusMode" && timeContainsButtons(timeFromInput, buttonsFocusMode)) { 
            timeFocusModeSelection = getIndexButtonInGroup(timeFromInput, buttonsFocusMode);
            setSelectedButtonIndex(buttonsFocusMode,timeFocusModeSelection - 1);
        }
        if ( timeMode.get() == "BreakMode" && !timeContainsButtons(timeFromInput, buttonsBreakMode) ) {
            addTimeToButtonsStream(timeMode);
        }
        else if ( timeMode.get() == "BreakMode" && timeContainsButtons(timeFromInput, buttonsBreakMode) ) {
            timeBreakModeSelection = getIndexButtonInGroup(timeFromInput, buttonsBreakMode);
            setSelectedButtonIndex(buttonsBreakMode,timeBreakModeSelection - 1);
        }
    }
    if ( timeFromInput.isValid() ) {
        currentTimer = timeFromInput;
        onTimerActivated();
        if ( timeMode.get() == "FocusMode" ) {
            currentDayStats[2]++;
        }
        else {
            currentDayStats[3]++;
        }
        setDayStats();
        updateButtonsTextVar();
    }
});

buttonStop.addEventListener("click", () => {
    onTimerDeactivated();
})

document.querySelector("body").addEventListener("mousemove", (e) => {
    if ( isHouveringBars ) {
        infoPopup.classList.add("visible");
        infoPopup.setAttribute("mousepos","");
    }
    else {
        setTimeout( () => {
            if (!isHouveringBars) {
                infoPopup.classList.remove("visible");
                setTimeout( () => {
                    if (!isHouveringBars) {
                        infoPopup.removeAttribute("mousepos");
                    }
                }, 250);
            }
        }, 250)
    }
    if ( infoPopup.hasAttribute("mousepos") ) {
        infoPopup.style.top = `${e.clientY - infoPopupSize.y * 0.5}px`;
        infoPopup.style.left = `${e.clientX + infoPopupSize.x * 0.2}px`;
    }
})

graphBars.forEach( (bar) => {
    let bodyElement = document.querySelector("body");
    bar.addEventListener("mouseenter", () => {
        if (!bodyElement.hasAttribute("active")) {
            isHouveringBars = true;
            hoverGraphBar = bar;
            setInfoPopUpText();
        }
        else { isHouveringBars = false; }
    });
    bar.addEventListener("mouseleave", () => {
        isHouveringBars = false;
        hoverGraphBar = null;
    })
});
