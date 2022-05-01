"use strict";
/*
TODO: Validation on each "NEXT" press!
loop through required fields...
if empty, add "error" to the class (remove as soon as there's a change)
add <div class="field-error">{FIELDNAME} is required.</div>
*/
var BoxType;
(function (BoxType) {
    BoxType[BoxType["First"] = 0] = "First";
    BoxType[BoxType["Last"] = 1] = "Last";
})(BoxType || (BoxType = {}));
;
var ButtonType;
(function (ButtonType) {
    ButtonType[ButtonType["Next"] = 0] = "Next";
    ButtonType[ButtonType["Prev"] = 1] = "Prev";
})(ButtonType || (ButtonType = {}));
document.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.append(document.createTextNode(CustomPage.getCustomPageStyle()));
    document.head.append(style);
    //loop through sqs-block
    const formBlocks = document.getElementsByClassName("sqs-block-form");
    for (let block of formBlocks) {
        const blockId = block.id;
        let fieldArray = [];
        let pageList = [];
        let currentPage;
        let pageCount = 0;
        let findZero = false;
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
                    fieldArray[count] = field.id;
                    //check if we're in a "Custom Page=" field...
                    if (field.className == "form-item section") {
                        const title = field.firstElementChild;
                        //found!
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
                            currentPage = { id: id, fields: fieldArray };
                            //page 0 can have parameters that apply to all other pages
                            if (pageNo == 0) {
                                findZero = true;
                                pageList[pageNo] = CustomPage.setBoxes(blockId, pageNo, currentPage, BoxType.First);
                            }
                            else {
                                pageList[pageNo] = CustomPage.setBoxes(blockId, pageNo, currentPage);
                            }
                            pageCount++;
                            fieldArray = [];
                            count = 0;
                            found = true;
                        }
                    }
                    if (!found)
                        count++;
                }
                //we put the rest of fields into the last box
                let finalPage = { id: blockId, fields: fieldArray };
                pageList[pageCount] = CustomPage.setBoxes(blockId, pageCount, finalPage, BoxType.Last, submitButton);
                //we create the container and the overflow wrapper
                const container = CustomPage.createElement("div", `${blockId}-CustomPage-container`, "CustomPage Container");
                fields.prepend(container);
                const overflow = CustomPage.createElement("div", `${blockId}-CustomPage-overflow`, "CustomPage Overflow");
                fields.prepend(overflow);
                //OPTIONAL HERE: Add step indicators! little balls maybe??? 
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
        if (!findZero)
            console.error("Found no initial Custom Page! Make sure to have at least one CustomPage=0 in your separator list.");
        return false;
    }
});
var CustomPage;
(function (CustomPage) {
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
        const element = createElement("div", `${blockId}-CustomPage-box-${pageNo}`, "CustomPage Page");
        const fieldArr = page.fields;
        let requiredArr = [];
        (_a = document.getElementById(fieldArr[fieldArr.length - 1])) === null || _a === void 0 ? void 0 : _a.after(element);
        //populate box
        for (let field of fieldArr) {
            const fieldElement = document.getElementById(field);
            element.append(fieldElement);
            //build a list of required fields
            if (fieldElement.className.indexOf("required") != -1)
                requiredArr.push(fieldElement);
        }
        console.log(`The required fields for page ${pageNo} are: `, requiredArr);
        //create the button container
        const bttnContainer = createElement("div", `${blockId}-CustomPage-button-container-${pageNo}`, "CustomPage ButtonContainer");
        element.append(bttnContainer);
        //add nav buttons
        let buttonArr = [];
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
        for (let button of buttonArr) {
            bttnContainer.append(button);
        }
        //if it's last box, append the submit button
        if (boxType == BoxType.Last && submitButton != undefined) {
            element.append(submitButton);
        }
        //finally return the box id to be set in main container
        return element.id;
    }
    CustomPage.setBoxes = setBoxes;
    function validatePage(required) {
        //TODO: VALIDATE the next click!
        return false;
    }
    function createButton(id, pageNo, buttonType, required) {
        let type = buttonType == ButtonType.Next ? "Next" : "Previous";
        const button = createElement("div", `${id}-${type}-button-${pageNo}`, "CustomPage Button");
        button.innerText = type;
        let step = buttonType == ButtonType.Next ? pageNo + 1 : pageNo - 1;
        button.addEventListener("click", () => {
            if (buttonType == ButtonType.Next && required != undefined) {
                if (!validatePage(required))
                    return false;
            }
            document.documentElement.style.setProperty("--CustomPage-step", `${step}`);
        });
        return button;
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
            }
            .CustomPage.Overflow{
                width: var(--CustomPage-size);
                overflow: hidden;
            }
            .CustomPage.Container{
                width: var(--CustomPage-container-size);
                display: flex;
                transform: translateX(calc( (var(--CustomPage-size) * var(--CustomPage-step)) * -1 ));
                transition: 200ms ease-in-out;
            }
            .CustomPage.Page{
                width: var(--CustomPage-size);
                padding: 16px;
            }
            .CustomPage.ButtonContainer{
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 30px;
            }
            .CustomPage.Button{
                border: 1px solid black;
                color: black;
                padding: 13px 20px;
                font-size: 16px;
                cursor: pointer;
                border-radius: 5px;
                transition: 300ms;
            }
            .CustomPage.Button:hover{
                background-color: #f3fcff;
            }
    
            `;
        return style;
    }
    CustomPage.getCustomPageStyle = getCustomPageStyle;
})(CustomPage || (CustomPage = {}));
