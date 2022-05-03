/*
Squarespace Custom Pages for Forms
*/

type Page = {
    id: string,
    fields: string[]
};

enum BoxType{
  First, 
  Last
};

enum ButtonType{
    Next,
    Prev
}

document.addEventListener("DOMContentLoaded", () => {

    const style: HTMLStyleElement = document.createElement("style");
    style.append(document.createTextNode(CustomPage.getCustomPageStyle()));
    document.head.append(style);

    //loop through sqs-block
    const formBlocks: HTMLCollection = document.getElementsByClassName("sqs-block-form");
    for(let block of formBlocks){

        const blockId: string = block.id;

        let fieldArray: string[] = [];
        let pageList: string[] = [];
        let currentPage: Page;
        let pageCount: number = 0;
        let findZero: boolean = false;
        
        
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
                    fieldArray[count] = field.id;

                    //check if we're in a "Custom Page=" field...
                    if(field.className == "form-item section"){

                        const title: HTMLElement = <HTMLElement>field.firstElementChild;
                        //found!
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

                            currentPage = {id: id, fields: fieldArray}; 

                            //page 0 can have parameters that apply to all other pages
                            if (pageNo == 0) {
                                findZero = true;
                                pageList[pageNo] = CustomPage.setBoxes(blockId, pageNo, currentPage, BoxType.First);
                            } else {
                                pageList[pageNo] = CustomPage.setBoxes(blockId, pageNo, currentPage);
                            }

                            pageCount++;
                            fieldArray = [];
                            count = 0;
                            found = true;
                        }

                    }
                    if (!found) count++;
                }

                //we put the rest of fields into the last box
                let finalPage: Page = {id: blockId, fields: fieldArray};
                pageList[pageCount] = CustomPage.setBoxes(blockId, pageCount, finalPage, BoxType.Last, submitButton);
                
                //we create the container and the overflow wrapper
                const container = CustomPage.createElement("div", `${blockId}-CustomPage-container`, "CustomPage-container");
                fields.prepend(container);
                const overflow = CustomPage.createElement("div", `${blockId}-CustomPage-overflow`, "CustomPage-overflow");
                fields.prepend(overflow);

                //OPTIONAL HERE: Add step indicators! little balls maybe??? 
                const steps = CustomPage.createSteps(blockId, pageCount);
                fields.prepend(steps);

                //We populate the container, moving every "page" into it
                CustomPage.setContainer(blockId, pageList);
                overflow.append(container);
                
                //we add the variables to the css after knowing the page count
                const root = document.documentElement;
                root.style.setProperty("--CustomPage-size", formSize);
                root.style.setProperty("--CustomPage-container-size", `calc(${formSize} * ${pageCount + 1})`);
            }

        }
        //#endregion

        if (!findZero) console.error("Found no initial Custom Page! Make sure to have at least one CustomPage=0 in your separator list.");
        return false;

    }
});

namespace CustomPage{

    export function createSteps(id: string, pageCount: number): HTMLElement{

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
                    document.documentElement.style.setProperty("--CustomPage-step", `${i}`);
                    radio.checked = true;
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
        let requiredArr: HTMLElement[] = [];
        document.getElementById(fieldArr[fieldArr.length - 1])?.after(element);
    
        //populate box
        for (let field of fieldArr){
            const fieldElement = <HTMLElement>document.getElementById(field)
            element.append(fieldElement);

            //build a list of required fields
            if(fieldElement.className.indexOf("required") != -1) requiredArr.push(fieldElement);
        }

        //create the button container
        const bttnContainer = createElement("div", `${blockId}-CustomPage-button-container-${pageNo}`, "CustomPage-buttonContainer")
        element.append(bttnContainer);
    
        //add nav buttons
        let buttonArr: HTMLDivElement[] = [];
        switch (boxType) {
            case BoxType.First:
                buttonArr[0] = createButton(blockId, pageNo, ButtonType.Next, requiredArr);
                break;
            case BoxType.Last:
                buttonArr[0] = createButton(blockId, pageNo, ButtonType.Prev);
                break;
            default:
                buttonArr[1] = createButton(blockId, pageNo, ButtonType.Next, requiredArr);
                buttonArr[0] = createButton(blockId, pageNo, ButtonType.Prev);
                break;
        }
    
        for (let button of buttonArr){
            bttnContainer.append(button);
        }

        //if it's last box, append the submit button
        if(boxType == BoxType.Last && submitButton != undefined){
            element.append(submitButton);
        }

        //Validation observer
        const config = { childList: true, subtree: true };
        const observer = new MutationObserver((mutations)=>{
            const radio = <HTMLInputElement>document.getElementById(`${blockId}-CustomPage-step-${pageNo}-input`);
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



    function validatePage(required: HTMLElement[]): boolean{
        let test = true;
        let result: boolean;
        for (let field of required){
            field.className = field.className.replace("error", "");
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
            if (result) continue;
            field.className += " error";
            //TODO: <div class="field-error">THIS FIELD is required.</div> add these
            test = false;
        }
        return test;
    }

    function validateAddress(field: HTMLElement): boolean{
        const inputs = field.getElementsByTagName("input");
        for(let input of inputs){
            if(input.name.indexOf("address2")){
                if(input.value.length == 0) return false;
            }
        }
        return true;
    }
    function validateDefault(field: HTMLElement): boolean{
        const inputs = field.getElementsByTagName("input");
        for(let input of inputs){
            if (input.value.length == 0) return false;
        }
        return true;
    }

    function createButton(id: string, pageNo: number, buttonType: ButtonType, required?: HTMLElement[]): HTMLDivElement{
        
        let type: string = buttonType == ButtonType.Next ? "Next" : "Previous";

        const button: HTMLDivElement = <HTMLDivElement>createElement("div", `${id}-${type}-button-${pageNo}`, "CustomPage-button");
        button.innerText = type;
    
        let step: number = buttonType == ButtonType.Next ? pageNo + 1 : pageNo - 1;
        
        button.addEventListener("click",()=>{
            if(buttonType == ButtonType.Next && required != undefined){
                if(!validatePage(required)) return false;
            }
            document.documentElement.style.setProperty("--CustomPage-step", `${step}`);
            const radioId = `${id}-CustomPage-step-${step}`;
            const radio = <HTMLInputElement>document.getElementById(`${radioId}-input`);
            radio.checked = true;
            const radioWrap = document.getElementById(radioId);
            radioWrap?.setAttribute("custompage-step-check", "true");
        })
    
        return button;
    }
    
    export function setContainer(blockId: string, pageList: string[]){
        const container: HTMLElement | null = document.getElementById(`${blockId}-CustomPage-container`);
        if (container == null) return false;
        for (let i = 0; i < pageList.length; i++){
            container.append(document.getElementById(pageList[i])!);
        }
    }
    
    export function getCustomPageStyle () {
        const style = `
            :root{
                --CustomPage-container-size: 0px;
                --CustomPage-size: 0px;
                --CustomPage-step: 0;
                --CustomPage-animation-time: 0ms;
            }
            .CustomPage-overflow{
                width: var(--CustomPage-size);
                overflow: hidden;
            }
            .CustomPage-container{
                width: var(--CustomPage-container-size);
                display: flex;
                transform: translateX(calc( (var(--CustomPage-size) * var(--CustomPage-step)) * -1 ));
                transition: var(--CustomPage-animation-time) ease-in-out;
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
    
}

