"use strict";
/*
Squarespace Custom Pages for Forms
*/
var BoxType;
(function (BoxType) {
    BoxType[BoxType["First"] = 0] = "First";
    BoxType[BoxType["Last"] = 1] = "Last";
})(BoxType || (BoxType = {}));
var ButtonType;
(function (ButtonType) {
    ButtonType[ButtonType["Next"] = 0] = "Next";
    ButtonType[ButtonType["Prev"] = 1] = "Prev";
})(ButtonType || (ButtonType = {}));
var Direction;
(function (Direction) {
    Direction[Direction["Forward"] = 0] = "Forward";
    Direction[Direction["Backward"] = 1] = "Backward";
})(Direction || (Direction = {}));
var AnimType;
(function (AnimType) {
    AnimType[AnimType["Start"] = 0] = "Start";
    AnimType[AnimType["End"] = 1] = "End";
})(AnimType || (AnimType = {}));
let mainInfo = [];
document.addEventListener("DOMContentLoaded", () => {
    //TODO: Maybe a loading form thingie?
    const style = document.createElement("style");
    style.append(document.createTextNode(CustomPage.getCustomPageStyle()));
    document.head.append(style);
    //loop through sqs-block-form
    let formCount = 0;
    const formBlocks = document.getElementsByClassName("sqs-block-form");
    for (let block of formBlocks) {
        const blockId = block.id;
        mainInfo[formCount] = { id: blockId, step: 0 };
        let fieldArray = [];
        let requiredArr = [];
        let boxList = [];
        let currentPage;
        let pageCount = 0;
        let findZero = false;
        let pageArr = [];
        //#region Initiator Loop
        //loop through all forms (should be just 1)
        const formList = block.getElementsByTagName("form");
        for (let form of formList) {
            let formSize = getComputedStyle(form).width;
            //find the submit button
            const submitButton = form.querySelector(".form-button-wrapper");
            //loop through all field-list (should be just 1)
            const fieldList = form.getElementsByClassName("field-list");
            for (let fields of fieldList) {
                let count = 0;
                //loop through all the form fields, snapshot
                const fieldChildren = Array.from(fields.children);
                for (let field of fieldChildren) {
                    let found = false;
                    const fieldId = field.id;
                    fieldArray[count] = fieldId;
                    if (field.className.indexOf("required") != -1)
                        requiredArr[count] = fieldId;
                    //check if we're in a "Custom Page=" field...
                    if (field.className == "form-item section") {
                        const title = field.firstElementChild;
                        //found custompage=0 or next custompage!
                        if (title.className == "title" && title.innerText.indexOf("CustomPage=") != -1) {
                            field.style.display = "none";
                            const id = field.id;
                            let pageNo;
                            //make sure it's a number after the =
                            try {
                                pageNo = parseInt(title.innerText.split("=")[1]);
                            }
                            catch (error) {
                                console.error(`${error} \n Found: ${title.innerText} \n The CustomPage value is not a number!`);
                                return false;
                            }
                            currentPage = { id: id, fields: fieldArray, required: requiredArr };
                            pageArr[pageNo] = currentPage;
                            //page 0 can have parameters that apply to all other pages
                            if (pageNo == 0)
                                findZero = true;
                            boxList[pageNo] = CustomPage.setBoxes(blockId, pageNo, currentPage);
                            pageCount++;
                            fieldArray = [];
                            requiredArr = [];
                            count = 0;
                            found = true;
                        }
                    }
                    if (!found)
                        count++;
                }
                //we put the rest of fields into the last box
                let finalPage = { id: blockId, fields: fieldArray, required: requiredArr };
                pageArr[pageCount] = finalPage;
                boxList[pageCount] = CustomPage.setBoxes(blockId, pageCount, finalPage, BoxType.Last, submitButton);
                //we create the container and the overflow wrapper
                const container = CustomPage.createElement("div", `${blockId}-CustomPage-container`, "CustomPage-container");
                fields.prepend(container);
                const overflow = CustomPage.createElement("div", `${blockId}-CustomPage-overflow`, "CustomPage-overflow");
                fields.prepend(overflow);
                //OPTIONAL HERE: Add step indicators! little balls maybe??? 
                const steps = CustomPage.createSteps(mainInfo[formCount], pageCount, boxList);
                fields.prepend(steps);
                //Insert the nav buttons here
                const buttons = CustomPage.navButtons(mainInfo[formCount], pageCount, pageArr, boxList);
                fields.append(buttons);
                //We populate the container, moving every "page" into it
                CustomPage.setContainer(blockId, boxList);
                overflow.append(container);
                //render pages
                CustomPage.movePages(mainInfo[formCount], boxList);
                //we add the variables to the css after knowing the page count
                const root = document.documentElement;
                root.style.setProperty("--CustomPage-size", formSize);
                //root.style.setProperty("--CustomPage-container-size", `calc(${formSize} * ${pageCount + 1})`);
                root.style.setProperty("--CustomPage-container-size", formSize);
            }
        }
        //#endregion
        formCount++;
    }
});
var CustomPage;
(function (CustomPage) {
    function animateContainer(blockId, target, from, direction) {
        const root = document.documentElement;
        const container = document.getElementById(`${blockId}-CustomPage-container`);
        let width = getComputedStyle(root).getPropertyValue("--CustomPage-size");
        root.style.setProperty("--CustomPage-container-size", `calc(${width} * 2)`);
        const keyframes = [
            { transform: `translateX(calc(${direction == Direction.Forward ? 0 : width} * -1))` },
            { transform: `translateX(calc(${direction == Direction.Forward ? width : 0} * -1))` }
        ];
        //begin animation
        from.classList.remove("CustomPage-toggle");
        target.classList.remove("CustomPage-toggle");
        container.animate(keyframes, { iterations: 1, duration: 200, }).onfinish = () => {
            from.classList.add("CustomPage-toggle");
            root.style.setProperty("--CustomPage-container-size", width);
        };
    }
    CustomPage.animateContainer = animateContainer;
    function movePages(mainInfo, boxList, oldStep) {
        let animation = true;
        if (animation && oldStep != undefined) {
            let target = document.getElementById(boxList[mainInfo.step]);
            let from = document.getElementById(boxList[oldStep]);
            for (let i = 0; i < boxList.length; i++) {
                const pageEl = document.getElementById(boxList[i]);
                pageEl.classList.add("CustomPage-toggle");
            }
            let direction = mainInfo.step > oldStep ? Direction.Forward : Direction.Backward;
            animateContainer(mainInfo.id, target, from, direction);
        }
        else {
            for (let i = 0; i < boxList.length; i++) {
                const pageEl = document.getElementById(boxList[i]);
                if (i == mainInfo.step) {
                    pageEl.classList.remove("CustomPage-toggle");
                }
                else {
                    pageEl.classList.add("CustomPage-toggle");
                }
            }
        }
    }
    CustomPage.movePages = movePages;
    function moveRadios(mainInfo) {
        const radioId = `${mainInfo.id}-CustomPage-step-${mainInfo.step}`;
        const radio = document.getElementById(`${radioId}-input`);
        radio.checked = true;
        const radioWrap = document.getElementById(radioId);
        radioWrap === null || radioWrap === void 0 ? void 0 : radioWrap.setAttribute("custompage-step-check", "true");
    }
    function renderNav(mainInfo, pageCount) {
        const prev = document.getElementById(`${mainInfo.id}-prev-button`);
        const next = document.getElementById(`${mainInfo.id}-next-button`);
        prev.classList.remove("CustomPage-toggle");
        next.classList.remove("CustomPage-toggle");
        switch (mainInfo.step) {
            case 0:
                prev.classList.add("CustomPage-toggle");
                break;
            case pageCount:
                next.classList.add("CustomPage-toggle");
                break;
        }
    }
    function navButtons(mainInfo, pageCount, pageArr, boxList) {
        const blockId = mainInfo.id;
        //create the button container
        const bttnContainer = CustomPage.createElement("div", `${blockId}-CustomPage-button-container`, "CustomPage-buttonContainer");
        const next = CustomPage.createElement("div", `${blockId}-next-button`, `CustomPage-button`);
        next.innerText = "Next";
        next.tabIndex = 0;
        const prev = CustomPage.createElement("div", `${blockId}-prev-button`, `CustomPage-button`);
        prev.innerText = "Previous";
        prev.classList.add("CustomPage-toggle");
        prev.tabIndex = 0;
        const move = function (buttonType) {
            const oldStep = mainInfo.step;
            if (buttonType == ButtonType.Next) {
                if (!CustomPage.validatePage(pageArr[mainInfo.step].required))
                    return false;
                if (mainInfo.step != pageCount)
                    mainInfo.step++;
            }
            else {
                if (mainInfo.step != 0)
                    mainInfo.step--;
            }
            //document.documentElement.style.setProperty("--CustomPage-step", `${mainInfo.step}`);
            renderNav(mainInfo, pageCount);
            moveRadios(mainInfo);
            movePages(mainInfo, boxList, oldStep);
        };
        next.addEventListener("click", () => { move(ButtonType.Next); });
        prev.addEventListener("click", () => { move(ButtonType.Prev); });
        bttnContainer.append(next);
        bttnContainer.prepend(prev);
        return bttnContainer;
    }
    CustomPage.navButtons = navButtons;
    function createSteps(mainInfo, pageCount, boxList) {
        const id = mainInfo.id;
        const radioName = `${id}-CustomPage-steps`;
        const wrapper = createElement("div", radioName, "CustomPage-steps-wrapper");
        for (let i = 0; i <= pageCount; i++) {
            const wrap = createElement("div", `${id}-CustomPage-step-${i}`, "CustomPage-step");
            wrap.setAttribute("custompage-step-check", i == 0 ? "true" : "false");
            const radioId = `${id}-CustomPage-step-${i}-input`;
            const radio = createElement("input", radioId, "CustomPage-radio");
            if (i == 0)
                radio.setAttribute("checked", "true");
            radio.setAttribute("name", radioName);
            radio.setAttribute("type", "radio");
            radio.setAttribute("value", `${i}`);
            const label = createElement("label", `${id}-CustomPage-step-${i}-label`, "CustomPage-label");
            label.innerText = `${i + 1}`;
            label.setAttribute("for", radioId);
            wrap.append(radio);
            wrap.append(label);
            //click event to go to X page
            wrap.addEventListener("click", (e) => {
                if (wrap.getAttribute("custompage-step-check") == "true") {
                    let oldStep = mainInfo.step;
                    mainInfo.step = i;
                    movePages(mainInfo, boxList, oldStep);
                    radio.checked = true;
                    renderNav(mainInfo, pageCount);
                }
                else {
                    e.preventDefault();
                }
                ;
            });
            wrapper.append(wrap);
            if (i != pageCount) {
                const divider = createElement("div", `${id}-CustomPage-divider`, "CustomPage-step-divider");
                wrapper.append(divider);
            }
        }
        return wrapper;
    }
    CustomPage.createSteps = createSteps;
    function createElement(type, id, className) {
        const element = document.createElement(type);
        element.id = id;
        element.className = className;
        return element;
    }
    CustomPage.createElement = createElement;
    function setBoxes(blockId, pageNo, page, boxType, submitButton) {
        var _a;
        //create & position box
        const element = createElement("div", `${blockId}-CustomPage-box-${pageNo}`, "CustomPage-page");
        const fieldArr = page.fields;
        (_a = document.getElementById(fieldArr[fieldArr.length - 1])) === null || _a === void 0 ? void 0 : _a.after(element);
        //populate box
        for (let field of fieldArr) {
            const fieldElement = document.getElementById(field);
            element.append(fieldElement);
        }
        //if it's last box, append the submit button
        if (boxType == BoxType.Last && submitButton != undefined) {
            element.append(submitButton);
        }
        //Validation observer
        const config = { childList: true, subtree: true };
        const observer = new MutationObserver((mutations) => {
            const radio = document.getElementById(`${blockId}-CustomPage-step-${pageNo}-input`);
            for (const mutation of mutations) {
                radio.className = radio.className.replace(" CustomPage-radio-error", "");
                const added = mutation.addedNodes[0];
                if (added != undefined) {
                    if (added.nodeType == 1) {
                        if (added.className.indexOf("field-error") != -1) {
                            radio.className += " CustomPage-radio-error";
                            return;
                        }
                        ;
                    }
                }
            }
        });
        observer.observe(element, config);
        //finally return the box id to be set in main container
        return element.id;
    }
    CustomPage.setBoxes = setBoxes;
    function validatePage(required) {
        let test = true;
        let result;
        const requiredElements = required.map(v => document.getElementById(v));
        for (let field of requiredElements) {
            field.classList.remove("error");
            result = true;
            switch (true) {
                case (field.className.indexOf("address") != -1):
                    result = validateAddress(field);
                    break;
                case (field.className.indexOf("date") != -1):
                    break;
                case (field.className.indexOf("email") != -1):
                    break;
                case (field.className.indexOf("radio") != -1 || field.className.indexOf("checkbox") != -1):
                    break;
                case (field.className.indexOf("textarea") != -1):
                    break;
                case (field.className.indexOf("website") != -1):
                    break;
                default:
                    result = validateDefault(field);
                    break;
            }
            if (result)
                continue;
            field.classList.add("error");
            //TODO: <div class="field-error">THIS FIELD is required.</div> add these
            test = false;
        }
        return test;
    }
    CustomPage.validatePage = validatePage;
    function validateAddress(field) {
        const inputs = field.getElementsByTagName("input");
        for (let input of inputs) {
            if (input.name.indexOf("address2")) {
                if (input.value.length == 0)
                    return false;
            }
        }
        return true;
    }
    function validateDefault(field) {
        const inputs = field.getElementsByTagName("input");
        for (let input of inputs) {
            if (input.value.length == 0)
                return false;
        }
        return true;
    }
    function setContainer(blockId, pageList) {
        const container = document.getElementById(`${blockId}-CustomPage-container`);
        if (container == null)
            return false;
        for (let i = 0; i < pageList.length; i++) {
            container.append(document.getElementById(pageList[i]));
        }
    }
    CustomPage.setContainer = setContainer;
    function getCustomPageStyle() {
        const style = `
            :root{
                --CustomPage-container-size: 0px;
                --CustomPage-size: 0px;
                --CustomPage-step: 0;
                --CustomPage-animation-time: 300ms;
            }
            .CustomPage-invisible{
                visibility: hidden;
            }
            .CustomPage-toggle{
                display: none;
            }
            .CustomPage-overflow{
                width: var(--CustomPage-size);
                overflow: hidden;
            }
            .CustomPage-animation{
                transform: translateX(calc( (var(--CustomPage-size) * var(--CustomPage-step)) * -1 ));
                transition: transform var(--CustomPage-animation-time) ease-in-out;
            }
            .CustomPage-container{
                width: var(--CustomPage-container-size);
                display: flex;
            }
            .CustomPage-page{
                width: var(--CustomPage-size);
                padding: 16px;
            }
            .CustomPage-buttonContainer{
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 30px;
            }
            .CustomPage-button{
                border: 1px solid black;
                color: black;
                padding: 13px 20px;
                font-size: 16px;
                cursor: pointer;
                border-radius: 5px;
                transition: var(--CustomPage-animation-time);
            }
            .CustomPage-button:hover{
                background-color: #f3fcff;
            }
            .CustomPage-steps-wrapper{
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .CustomPage-step-divider{
                width: 10%;
                border: 2px solid lightgrey;
            }
            .CustomPage-step{
                display: flex;
                align-items: center;
                position: relative;
                cursor: pointer;
            }
            .CustomPage-radio{
                appearance: none;
                background-color: #fff;
                margin: 0;
                font: inherit;
                color: blue;
                width: 25px;
                height: 25px;
                box-shadow: inset 25px 25px lightblue;
                border-radius: 50%;
                display: grid;
                place-content: center;
                justify-items: center;
                align-items: center;
                cursor: pointer;
            }
            .CustomPage-radio::before{
                content: "";
                width: 25px;
                height: 25px;
                border-radius: 50%;
                transform: scale(0);
                transition: var(--CustomPage-animation-time) transform ease-in-out;
                box-shadow: inset 25px 25px blue;
            }
            .CustomPage-radio-error{
                box-shadow: inset 25px 25px #e6adad;
            }
            .CustomPage-radio-error::before{
                box-shadow: inset 25px 25px #cc3b3b;
            }
            .CustomPage-radio:checked::before {
                transform: scale(1);
              }
            .CustomPage-label{
                font-family: arial;
                color: white;
                position: absolute;
                margin-left: auto;
                margin-right: auto;
                left: 0;
                right: 0;
                text-align: center;
                cursor: pointer;
            }
            `;
        return style;
    }
    CustomPage.getCustomPageStyle = getCustomPageStyle;
})(CustomPage || (CustomPage = {}));
