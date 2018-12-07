/**
 * Script for performing symbol substitution on a given function and asserts which code paths will be true or false
 * for a given input
 */

import * as esprima from 'esprima';
import {parseCode, generate_parsed_table} from "./code-analyzer";

const analyzed_code = (code_table, input_func, input_argument_values) => {
    input_func = "let g1 = 5;\n" +
        "let g2,g3;\n" +
        "function foo(x, y, z){\n" +
        "    let a = x + 1;\n" +
        "    let b = a + y;\n" +
        "    let c=0;\n" +
        "    \n" +
        "    if (b < z) {\n" +
        "        c = c + 5;\n" +
        "        return x + y + z + c;\n" +
        "    } else if (b < z * 2) {\n" +
        "        c = c + x + 5;\n" +
        "        return x + y + z + c;\n" +
        "    } else {\n" +
        "        c = c + z + 5;\n" +
        "        return x + y + z + c;\n" +
        "    }\n" +
        "}\n" +
        "let g4 = 10";
    input_argument_values = '1,"2",3';
    code_table = parseCode(input_func)[1];
    let func_args = extract_arguments(input_argument_values, input_func);
    let parsed_func = symbol_substitution(code_table, input_func);
    parsed_func = color_function(parsed_func, func_args);
    return parsed_func;
};

function color_function(parsed_func, func_args) {
    return undefined;
}

function symbol_substitution(code_table, input_func) {
    let symbol_table = create_symbol_table(code_table, input_func);

}

function create_symbol_table(code_table, input_func){
    //Receives the input func, code table and creates a map mapping between the local
    //arguments and the function arguments (including global arguments..)
    let function_arguments = extract_arg_names(input_func);
    let global_arguments = extract_global_arguments(input_func);
    let local_arguments = extract_local_arguments(input_func, global_arguments, function_arguments);

    let symbol_table = {};

    for (let i = 0; i < local_arguments.length; i++) {

    }

    return symbol_table;
}

function extract_global_arguments(input_func) {
    let i = 0;
    let global_args = {};
    let parsedCode = esprima.parse(input_func).body;

    while(i<parsedCode.length){
        if(parsedCode[i].type === 'VariableDeclaration'){
            for (let j = 0; j < parsedCode[i].declarations.length; j++) {
                let arg_name = parsedCode[i].declarations[j].id.name;
                let arg_value = parsedCode[i].declarations[j].init;
                if(arg_value){
                    arg_value = arg_value.value;
                }
                global_args[arg_name] = arg_value;
            }
        }
        i++;
    }

    return global_args
}

function extract_local_arguments(input_func, global_args, function_args){
    let local_args = {};
    let parsedCode = esprima.parse(input_func, {loc: true}).body;
    let function_table = [];

    for (let j = 0; j < parsedCode.length; j++) {
        if(parsedCode[j].type === 'FunctionDeclaration'){
            function_table = generate_parsed_table(parsedCode[j]);
            break
        }
    }
    for (let i = 0; i < function_table.length; i++) {
        if(function_table[i].Type === 'variable declaration'){
            if(!global_args[function_table[i].Name] && !function_args.includes(function_table[i].Name)){
                local_args[function_table[i].Name] = {value: function_table[i].Value, location: function_table[i].Line} ;
            }
        }
    }
    return local_args;
}

function extract_arguments(argument_string, input_func){
// Function that extracts the arguments from the argument text box
// returns each arg name and their input value.

    let parsed_args = {};
    let arg_names = extract_arg_names(input_func);
    let input_arg_array = extract_arg_values(argument_string);

    for(let i = 0; i < input_arg_array.length; i++){
        let arg_val = input_arg_array[i];
        let arg_type = extract_arg_types(input_arg_array[i]);
        let arg_name = arg_names[i];

        parsed_args[arg_name] = {'type': arg_type, 'value': arg_val};
    }

    return parsed_args;
}

function extract_arg_names(input_func=""){
    // Returns an array containing the name of the function's arguments
    let arg_array = input_func.split('function')[1].split('{')[0].split('(')[1].split(')')[0].split(',');
    for (let i = 0; i < arg_array.length; i++) {
        arg_array[i] = arg_array[i].replace(/\s+/g, '');  // Remove whitespace
    }
     return arg_array
 }

function extract_arg_types(arg){
    //Returns the type of the argument: bool, array, string or num
    if(arg.charAt(0) === "[")
        return "array";
    if(arg === "true" || arg === "false")
        return "bool";
    if(arg.charAt(0) === "\'" || arg.charAt(0) === "\"")
        return "string";
    else
        return "num";
}

function extract_arg_values(args){
    // function that returns an array containing the value of each input argument in a different cell.
    let values = [];
    let currVal = "";
    args = args.replace(/\s+/g, '');

    for (let i = 0; i < args.length; i++) {
        if(args.charAt(i) !== '['){
            if(args.charAt(i) !== ','){
                currVal += args.charAt(i);
                if(i === args.length-1) // For last input
                    values.push(currVal);
            }
            else{
                values.push(currVal);
                currVal = "";
            }
        }
        else{ //reached an array
            let brackets = 1;
            currVal += args.charAt(i); //Add the '['
            i++;
            while(brackets !== 0){
                currVal += args.charAt(i);
                if(args.charAt(i) === '[')
                    brackets++;
                if(args.charAt(i) === ']')
                    brackets--;
                i++;
            }
            values.push(currVal);
            currVal = "";
        }
    }

    return values;
}

export{analyzed_code, extract_arg_values, extract_arguments, extract_arg_names, extract_arg_types, create_symbol_table,
extract_global_arguments, color_function, extract_local_arguments, symbol_substitution}