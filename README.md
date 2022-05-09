# Squarespace Custom Form Pages

This plugin script allows you to separate Squarespace forms into a multi-page/multi-stepped form to breakdown long forms 
without the need to make connected forms or use third party extensions.

To use it in your form just create a new Line form field and name it "CustomPage=0" to begin splitting the form. 
The form will split between subsequent instances of "CustomPage=[NUMBER]" (or in two if there's only one).

For customization options, you can write them in the Description of the line field "CustomPage=0".

Options are: 
- "IncludeStep=" can be true or false. Shows numbered steps. *Default: True* 
