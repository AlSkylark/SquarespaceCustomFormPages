/*
First we need to find the form block and it's ID
we search for sqs-block-form, get its ID and then look for the form label
once we find it, we need to find the section with class
form-item section.
Also identify the "field-list" class
find all custompage items, then find number 1
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
                pageList[pageCount] = CustomPage.setBoxes(blockId, pageCount, finalPage, BoxType.Last);
                
                
                const container: HTMLDivElement = document.createElement("div");
                container.id =`${blockId}-CustomPage-container`;
                container.className = "CustomPage Container";
                fields.prepend(container);

                const overflow: HTMLDivElement = document.createElement("div");
                overflow.id = `${blockId}-CustomPage-overflow`;
                overflow.className = "CustomPage Overflow";
                fields.prepend(overflow);
                
                CustomPage.setContainer(blockId, pageList);
                overflow.append(container);

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
    export function setBoxes(blockId: string, pageNo: number, page: Page, boxType?: BoxType): string{
        //create & position box
        const element: HTMLDivElement = document.createElement("div");
        element.id = `${blockId}-CustomPage-box-${pageNo}`;
        element.className = "CustomPage Page";
        const fieldArr: string[] = page.fields;
        document.getElementById(fieldArr[fieldArr.length - 1])?.after(element);
    
        //populate box
        for (let field of fieldArr){
            element.append(<HTMLElement>document.getElementById(field));
        }
    
        //optional: create step indicators
    
        //create the button container
        const bttnContainer: HTMLDivElement = document.createElement("div");
        bttnContainer.id = `${blockId}-CustomPage-button-container-${pageNo}`;
        bttnContainer.className = "CustomPage ButtonContainer";
        element.append(bttnContainer);
    
        //add nav buttons
        let buttonArr: HTMLDivElement[] = [];
        switch (boxType) {
            case BoxType.First:
                buttonArr[0] = createButton(blockId, pageNo, ButtonType.Next);
                break;
            case BoxType.Last:
                buttonArr[0] = createButton(blockId, pageNo, ButtonType.Prev);
                break;
            default:
                buttonArr[1] = createButton(blockId, pageNo, ButtonType.Next);
                buttonArr[0] = createButton(blockId, pageNo, ButtonType.Prev);
                break;
        }
    
        for (let button of buttonArr){
            bttnContainer.append(button);
        }
    
        //finally return the box id to be set in main container
        return element.id;
    }
    
    function createButton(id: string, pageNo: number, buttonType: ButtonType): HTMLDivElement{
        
        const button: HTMLDivElement = document.createElement("div");
        let type: string = buttonType == ButtonType.Next ? "Next" : "Previous";
        button.id = `${id}-${type}-button-${pageNo}`;
        button.className = "CustomPage Button";
        button.innerText = type;
    
        let step: number = buttonType == ButtonType.Next ? pageNo + 1 : pageNo - 1;
        
        button.addEventListener("click",()=>{
            document.documentElement.style.setProperty("--CustomPage-step", `${step}`);
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
            }
            .CustomPage.Overflow{
                width: var(--CustomPage-size);
                overflow: hidden;
            }
            .CustomPage.Container{
                width: var(--CustomPage-container-size);
                display: flex;
                transform: translateX(calc( (var(--CustomPage-size) * var(--CustomPage-step)) * -1 ));
                transition: 200ms;
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
    
}

