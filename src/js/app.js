import $ from 'jquery';
import {parseCode} from './code-analyzer';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let input_func = $('#codePlaceholder').val();
        let args = $('#inputArguments').val();

        let res = parseCode(input_func);
        let code_table = res[1];
        let func_args = extract_arguments(args, input_func);
        begin_code_analysis(code_table, input_func, func_args )
    });
});

function extract_arguments(argument_string, input_func){
// Function that extracts the arguments from the argument text box
// returns each arg name and their input value.

    let parsed_args = [];
    let arg_names = input_func.split('{')[0].split('(')[1].split(')')[0].split(',');
    let input_arg_array = extract_arg_values(argument_string);

    for (let i = 0; i < input_arg_array.length; i++) {
        let arg_val = input_arg_array[i];
        let arg_type = extract_arg_types(input_arg_array[i]);
        let arg_name = arg_names[i];

        parsed_args.push({'name': arg_name, 'type': arg_type, 'value': arg_val});
    }

    return parsed_args;
}

function extract_arg_types(arg){
    return 'I dunno lol';
}

function extract_arg_values(args){
    let values = [];
    let currVal = "";
    for (let i = 0; i < args.length; i++) {
        if(args.charAt(i) !== '['){
            if(args.charAt(i) !== ','){
                currVal += args.charAt(i);
            }
            else{
                values.push(currVal);
                currVal = "";
                i++
            }
        }
        else{ //reached an array
            while(args.charAt(i) !== ']'){
                currVal += args.charAt(i);
                i++;
            }
            currVal += args.charAt(i);
        }
    }
}

function begin_code_analysis(code_table, func, args){
    let symbol_table = {}
}

function generate_markup(code_row) {

    let line = code_row.Line;
    let type = code_row.Type;
    let name = code_row.Name;
    let condition = code_row.Condition.replace('<', '&lt;').replace('>','&gt;');
    let value = code_row.Value;

    if(!condition)
        condition = '';
    if(!value)
        value = '';
    return '<tr>' + '<td>' + line + '</td>' + '<td>' + type + '</td>' + '<td>' + name + '</td>' +
        '<td>' + condition + '</td>' + '<td>' + value + '</td>' + '</tr>';
}
