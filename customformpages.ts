/*
Squarespace Custom Pages for Forms
*/

type Page = {
    id: string,
    fields: string[],
    required: string[],
    params?: Map<any,any>
}


type Forms = {
    id: string,
    step: number
}

enum BoxType{
  First, 
  Last
}

enum ButtonType{
    Next,
    Prev
}

enum Direction{
    Forward,
    Backward
}

enum AnimType{
    Start,
    End
}

let mainInfo: Forms[] = [];

document.addEventListener("DOMContentLoaded", () => {
    //TODO: Maybe a loading form thingie?

    const style: HTMLStyleElement = document.createElement("style");
    style.append(document.createTextNode(CustomPage.getCustomPageStyle()));
    document.head.append(style);

    //loop through sqs-block-form
    let formCount = 0;
    const formBlocks = <HTMLCollectionOf<HTMLElement>>document.getElementsByClassName("sqs-block-form");
    for(let block of formBlocks){
        
        const blockId: string = block.id;
        mainInfo[formCount] = {id: blockId, step: 0};

        let fieldArray: string[] = [];
        let requiredArr: string[] = [];

        let boxList: string[] = [];
        let currentPage: Page;
        let pageCount: number = 0;
        let findZero: boolean = false;
        let pageArr: Page[] = [];
        
        //#region Initiator Loop
        //loop through all forms (should be just 1)
        const formList: HTMLCollection = block.getElementsByTagName("form");
        for (let form of formList){
            let formSize = getComputedStyle(form).width;

            //find the submit button
            const submitButton: HTMLElement = <HTMLElement>form.querySelector(".form-button-wrapper");
            
            //loop through all field-list (should be just 1)
            const fieldList: HTMLCollection = form.getElementsByClassName("field-list");
            for(let fields of fieldList){
                let count: number = 0

                //loop through all the form fields, snapshot
                const fieldChildren: Array<HTMLElement> = Array.from(<HTMLCollectionOf<HTMLElement>>fields.children);
                for (let field of fieldChildren){
                    let found: boolean = false;

                    const fieldId = field.id;
                    fieldArray[count] = fieldId;
                    if(field.className.indexOf("required") != -1) requiredArr[count] = fieldId;

                    //check if we're in a "Custom Page=" field...
                    if(field.className == "form-item section"){

                        const title: HTMLElement = <HTMLElement>field.firstElementChild;
                        //found custompage=0 or next custompage!
                        if(title.className == "title" && title.innerText.indexOf("CustomPage=") != -1) {
                            field.style.display = "none";
                            const id: string = field.id;
                            let pageNo: number;

                            //make sure it's a number after the =
                            try {
                                pageNo = parseInt(title.innerText.split("=")[1]);
                            } catch (error) {
                                console.error(`${error} \n Found: ${title.innerText} \n The CustomPage value is not a number!`);
                                return false;
                            }

                            //page 0 can have parameters that apply to all other pages
                            let pageParams = new Map();
                            if (pageNo == 0) {
                                findZero = true;
                                const description = <HTMLElement>field?.children[1];
                                if (description != undefined)
                                pageParams = CustomPage.processParams(description.innerText);
                            }
                            currentPage = {id: id, fields: fieldArray, required: requiredArr, params: pageParams}; 
                            pageArr[pageNo] = currentPage;
                            boxList[pageNo] = CustomPage.setBoxes(blockId, pageNo, currentPage);
                            

                            pageCount++;
                            fieldArray = [];
                            requiredArr = [];
                            count = 0;
                            found = true;
                        }

                    }
                    if (!found) count++;
                }

                //we put the rest of fields into the last box
                let finalPage: Page = {id: blockId, fields: fieldArray, required: requiredArr};
                pageArr[pageCount] = finalPage;
                boxList[pageCount] = CustomPage.setBoxes(blockId, pageCount, finalPage, BoxType.Last, submitButton);
                
                //we create the container and the overflow wrapper
                const container = CustomPage.createElement("div", `${blockId}-CustomPage-container`, "CustomPage-container");
                fields.prepend(container);

                const overflow = CustomPage.createElement("div", `${blockId}-CustomPage-overflow`, "CustomPage-overflow");
                fields.prepend(overflow);

                //Step indicators, should be optional
                let includeSteps = <string>pageArr[0]?.params?.get("IncludeSteps");
                if(includeSteps == undefined || includeSteps.indexOf("true") != -1){
                    const steps = CustomPage.createSteps(mainInfo[formCount], pageCount, boxList);
                    fields.prepend(steps);
                }

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
                root.style.setProperty("--CustomPage-container-size", formSize);
            }

        }
        //#endregion

        formCount++;
    }
});

namespace CustomPage{

    //TODO: Parse the split[1] bit, then adapt the code to parsed strings!
    export function processParams(parameters: string){
        const params = new Map<string,any>();
        const initArr = parameters.split(";");
        for (let item of initArr){
            const split = item.split("=");
            params.set(split[0], split[1]);
        }
        return params;
    }

    function animateContainer(blockId: string, target: HTMLElement, from: HTMLElement, direction?: Direction){
        const root = document.documentElement;
        const container = <HTMLElement>document.getElementById(`${blockId}-CustomPage-container`);

        let width = getComputedStyle(root).getPropertyValue("--CustomPage-size");
        root.style.setProperty("--CustomPage-container-size", `calc(${width} * 2)`);

        const keyframes = [
            {transform: `translateX(calc(${direction == Direction.Forward ? 0 : width} * -1))`},
            {transform: `translateX(calc(${direction == Direction.Forward ? width : 0} * -1))`}
        ];

        //begin animation
        from.classList.remove("CustomPage-toggle");
        target.classList.remove("CustomPage-toggle");

        container.animate(keyframes, {iterations: 1, duration: 200, }).onfinish = ()=>{
            from.classList.add("CustomPage-toggle");
            root.style.setProperty("--CustomPage-container-size", width);
        };

    }

    export function movePages(mainInfo: Forms, boxList: string[], oldStep?: number, animation: boolean = false){
        if(animation && oldStep != undefined){

            let target = <HTMLElement>document.getElementById(boxList[mainInfo.step]);
            let from = <HTMLElement>document.getElementById(boxList[oldStep]);
            for(let i = 0; i < boxList.length; i++){
                const pageEl = <HTMLElement>document.getElementById(boxList[i]); 
                pageEl.classList.add("CustomPage-toggle");
            }
            let direction = mainInfo.step > oldStep ? Direction.Forward : Direction.Backward;
            animateContainer(mainInfo.id, target, from, direction);


        } else {

            for(let i = 0; i < boxList.length; i++){
                const pageEl = <HTMLElement>document.getElementById(boxList[i]);
                if (i == mainInfo.step) { 
                    pageEl.classList.remove("CustomPage-toggle"); 
                } 
                else { 
                    pageEl.classList.add("CustomPage-toggle"); 
                } 
            }

        }
    }

    function moveRadios(mainInfo: Forms){
        const radioId = `${mainInfo.id}-CustomPage-step-${mainInfo.step}`;
        const radio = <HTMLInputElement>document.getElementById(`${radioId}-input`);
        radio.checked = true;
        const radioWrap = document.getElementById(radioId);
        radioWrap?.setAttribute("custompage-step-check", "true");
    }

    function renderNav(mainInfo: Forms, pageCount: number){
        const prev = <HTMLElement>document.getElementById(`${mainInfo.id}-prev-button`);
        const next = <HTMLElement>document.getElementById(`${mainInfo.id}-next-button`);

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

    export function navButtons(mainInfo: Forms, pageCount: number, pageArr: Page[], boxList: string[]): HTMLElement {
        const blockId = mainInfo.id;
        const hasSteps = pageArr[0]?.params?.get("IncludeSteps") == "true" ? true : false;
        //create the button container
        const bttnContainer = CustomPage.createElement("div", `${blockId}-CustomPage-button-container`, "CustomPage-buttonContainer")

        const next = CustomPage.createElement("div", `${blockId}-next-button`, `CustomPage-button`);
        next.innerText = "Next";
        next.tabIndex = 0;
        const prev = CustomPage.createElement("div", `${blockId}-prev-button`, `CustomPage-button`);
        prev.innerText = "Previous";
        prev.classList.add("CustomPage-toggle");
        prev.tabIndex = 0;

        const move = function (buttonType: ButtonType){
            const oldStep = mainInfo.step;
            if(buttonType == ButtonType.Next){
                if (!CustomPage.validatePage(pageArr[mainInfo.step].required)) return false;
                if (mainInfo.step != pageCount) mainInfo.step++;
            } else {
                if (mainInfo.step != 0) mainInfo.step--;
            }

            //document.documentElement.style.setProperty("--CustomPage-step", `${mainInfo.step}`);
            renderNav(mainInfo, pageCount);
            if (hasSteps) moveRadios(mainInfo);
            movePages(mainInfo, boxList, oldStep);
        }

        next.addEventListener("click", ()=>{ move(ButtonType.Next) });
        prev.addEventListener("click", ()=>{ move(ButtonType.Prev) });

        bttnContainer.append(next);
        bttnContainer.prepend(prev);

        return bttnContainer;
    }

    export function createSteps(mainInfo: Forms, pageCount: number, boxList: string[]): HTMLElement{
        const id = mainInfo.id;
        const radioName = `${id}-CustomPage-steps`;
        const wrapper = createElement("div", radioName, "CustomPage-steps-wrapper");

        for (let i = 0; i <= pageCount; i++) {
            
            const wrap = createElement("div", `${id}-CustomPage-step-${i}`, "CustomPage-step");
            wrap.setAttribute("custompage-step-check", i == 0 ? "true" : "false");

            const radioId = `${id}-CustomPage-step-${i}-input`;
            const radio = <HTMLInputElement>createElement("input", radioId, "CustomPage-radio");
            if (i == 0 ) radio.setAttribute("checked","true");
            radio.setAttribute("name", radioName);
            radio.setAttribute("type","radio");
            radio.setAttribute("value", `${i}`);
            

            const label = createElement("label", `${id}-CustomPage-step-${i}-label`, "CustomPage-label");
            label.innerText = `${i + 1}`;
            label.setAttribute("for", radioId);

            wrap.append(radio);
            wrap.append(label);

            //click event to go to X page
            wrap.addEventListener("click", (e)=>{
                if(wrap.getAttribute("custompage-step-check") == "true") {
                    if((<HTMLElement>e.target).tagName.indexOf("LABEL") == -1) {
                        e.preventDefault();
                        return false;
                    } 
                    
                    let oldStep = mainInfo.step;
                    mainInfo.step = i;
                    if (oldStep == i) {
                        e.preventDefault(); 
                        return false;
                    }
                    movePages(mainInfo, boxList, oldStep);
                    radio.checked = true;
                    renderNav(mainInfo, pageCount);
                } else { 
                    e.preventDefault();
                };
            });

            wrapper.append(wrap);
            if (i != pageCount ) {
                const divider = createElement("div", `${id}-CustomPage-divider`, "CustomPage-step-divider"); 
                wrapper.append(divider);
            }

        }

        return wrapper;

    }

    export function createElement(type: keyof HTMLElementTagNameMap, id: string, className: string): HTMLElement{
        const element: HTMLElement = document.createElement(type);
        element.id = id;
        element.className = className;
        return element;
    }

    export function setBoxes(blockId: string, pageNo: number, page: Page, boxType?: BoxType, submitButton?: HTMLElement): string{
        //create & position box
        const element = createElement("div", `${blockId}-CustomPage-box-${pageNo}`, "CustomPage-page");
        const fieldArr: string[] = page.fields;
    
        document.getElementById(fieldArr[fieldArr.length - 1])?.after(element);
    
        //populate box
        for (let field of fieldArr){
            const fieldElement = <HTMLElement>document.getElementById(field)
            element.append(fieldElement);
        }

        //if it's last box, append the submit button
        if(boxType == BoxType.Last && submitButton != undefined){
            element.append(submitButton);
        }

        //Validation observer
        const config = { childList: true, subtree: true };
        const observer = new MutationObserver((mutations)=>{
            const radio = <HTMLInputElement>document.getElementById(`${blockId}-CustomPage-step-${pageNo}-input`);
            if (radio == undefined) return false;
            for(const mutation of mutations){
                radio.className = radio.className.replace(" CustomPage-radio-error", "");
                const added = <HTMLElement>mutation.addedNodes[0]
                if(added != undefined){
                    if(added.nodeType == 1){
                        if(added.className.indexOf("field-error") != -1) {
                            radio.className += " CustomPage-radio-error";
                            return;
                        };
                    }
                }
            }
        });
        observer.observe(element, config);
    
        //finally return the box id to be set in main container
        return element.id;
    }

    export function validatePage(required: string[]): boolean{
        let test = true;
        let result: boolean;
        const requiredElements = required.map(v => <HTMLElement>document.getElementById(v));
        requiredElements.forEach((field) => {
            field.classList.remove("error");
            result = true;
            switch (true) {
                case (field.className.indexOf("address") != -1):
                    result = validateAddress(field);
                    break;

                case (field.className.indexOf("date") != -1):
                    result = validateDate(field);
                    break;

                case (field.className.indexOf("email") != -1):
                    result = validateEmailWeb(field);
                    break;

                case (field.className.indexOf("radio") != -1 || field.className.indexOf("checkbox") != -1):
                    result = validateChecks(field);
                    break;

                case (field.className.indexOf("textarea") != -1):
                    result = validateDefault(field, "textarea");
                    break;

                case (field.className.indexOf("website") != -1):
                    result = validateEmailWeb(field, true);
                    break;

                default:
                    result = validateDefault(field);
                    break;
            }
            if (result) return;
            field.classList.add("error");
            //TODO: <div class="field-error">THIS FIELD is required.</div> add these
            test = false;
        });
        return test;
    }

    function validateChecks(field: HTMLElement): boolean{
        const inputs = field.getElementsByTagName("input");
        for(const input of inputs){
            if (input.checked) return true;
        }
        return false;
    }

    function validateEmailWeb(field: HTMLElement, isWebsite: boolean = false): boolean{
        //from emailregex.com
        const regex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
        const webex = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/

        const inputs = field.getElementsByTagName("input");
        for(let input of inputs){
            if (input.value.length == 0) return false;
            if (isWebsite){
                if (!webex.test(input.value)) return false;
            } else {
                if (!regex.test(input.value)) return false;
            }
        }
        
        return true;
    }

    function validateDate(field: HTMLElement): boolean{
        const inputs = field.getElementsByTagName("input");

        const process = (numStr: string, max: number, min: number = 1) => {
            let num = numStr == undefined ? NaN : parseInt(numStr);
            if(isNaN(num)) return false;
            if(num > max || num < min) return false;
            return true;
        }

        //day
        let day = inputs[0].value;
        if (!process(day, 31)) return false;

        //month
        let month = inputs[1].value;
        if (!process(month, 12)) return false;

        //year
        let year = inputs[2].value;
        if (!process(year, 3000, 1800)) return false;

        return true;
    }

    function validateAddress(field: HTMLElement): boolean{
        const inputs = field.getElementsByTagName("input");
        for(let input of inputs){
            if(input.name.indexOf("address2") == -1){
                if (input.value.length < 2) return false;
                if(input.value.length == 0) return false;
            }
        }
        return true;
    }

    function validateDefault(field: HTMLElement, tag: keyof HTMLElementTagNameMap = "input"): boolean{
        const inputs = <any>field.getElementsByTagName(tag);
        for(let input of inputs){
            if (input.value.length == 0) return false;
        }
        return true;
    }
    
    export function setContainer(blockId: string, pageList: string[]){
        const container: HTMLElement | null = document.getElementById(`${blockId}-CustomPage-container`);
        if (container == null) return false;
        for (let i = 0; i < pageList.length; i++){
            container.append(document.getElementById(pageList[i])!);
        }
    }
    
    export function getCustomPageStyle () {
        const style = `/*
        * Prefixed by https://autoprefixer.github.io
        * PostCSS: v8.4.12,
        * Autoprefixer: v10.4.4
        * Browsers: last 4 version
        */
        
        
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
                    .CustomPage-container{
                        width: var(--CustomPage-container-size);
                        display: -webkit-box;
                        display: -ms-flexbox;
                        display: flex;
                    }
                    .CustomPage-page{
                        width: var(--CustomPage-size);
                        padding: 16px;
                    }
                    .CustomPage-buttonContainer{
                        display: grid;
                        grid-gap: 10px;
                        justify-content: center;
                        margin-top: 30px;
                        grid-auto-flow: column;
                    }
                    .CustomPage-button{
                        border: 1px solid black;
                        color: black;
                        padding: 13px 20px;
                        font-size: 16px;
                        cursor: pointer;
                        border-radius: 5px;
                        -webkit-transition: var(--CustomPage-animation-time);
                        -o-transition: var(--CustomPage-animation-time);
                        transition: var(--CustomPage-animation-time);
                    }
                    .CustomPage-button:hover{
                        background-color: #f3fcff;
                    }
                    .CustomPage-steps-wrapper{
                        display: -webkit-box;
                        display: -ms-flexbox;
                        display: flex;
                        -webkit-box-align: center;
                            -ms-flex-align: center;
                                align-items: center;
                        -webkit-box-pack: center;
                            -ms-flex-pack: center;
                                justify-content: center;
                    }
                    .CustomPage-step-divider{
                        width: 10%;
                        border: 2px solid lightgrey;
                    }
                    .CustomPage-step{
                        display: grid;
                        align-content: center;
                        justify-content: center;
                        justify-items: center;
                        align-items: center;
                        position: relative;
                        cursor: pointer;
                    }
                    .CustomPage-radio{
                        -webkit-appearance: none;
                           -moz-appearance: none;
                                appearance: none;
                        background-color: #fff;
                        border: transparent;
                        margin: 0;
                        font: inherit;
                        color: blue;
                        width: 25px;
                        height: 25px;
                        -webkit-box-shadow: inset 25px 25px lightblue;
                                box-shadow: inset 25px 25px lightblue;
                        border-radius: 50%;
                        display: -ms-grid;
                        display: grid;
                        place-content: center;
                        justify-items: center;
                        -webkit-box-align: center;
                            -ms-flex-align: center;
                                align-items: center;
                        cursor: pointer;
                    }
                    .CustomPage-radio::before{
                        content: "";
                        width: 25px;
                        height: 25px;
                        border: transparent;
                        border-radius: 50%;
                        -webkit-transform: scale(0);
                            -ms-transform: scale(0);
                                transform: scale(0);
                        -webkit-transition: var(--CustomPage-animation-time) transform ease-in-out;
                        -o-transition: var(--CustomPage-animation-time) transform ease-in-out;
                        transition: var(--CustomPage-animation-time) transform ease-in-out;
                        -webkit-box-shadow: inset 25px 25px blue;
                                box-shadow: inset 25px 25px blue;
                    }
                    .CustomPage-radio-error{
                        -webkit-box-shadow: inset 25px 25px #e6adad;
                                box-shadow: inset 25px 25px #e6adad;
                    }
                    .CustomPage-radio-error::before{
                        -webkit-box-shadow: inset 25px 25px #cc3b3b;
                                box-shadow: inset 25px 25px #cc3b3b;
                    }
                    .CustomPage-radio:checked::before {
                        -webkit-transform: scale(1);
                            -ms-transform: scale(1);
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
    
}

