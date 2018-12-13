/**
 * Script for performing symbol substitution on a given function and asserts which code paths will be true or false
 * for a given input
 */

import * as esprima from 'esprima';
import * as substitutor from './symbol-substitution';
import {generate_parsed_table, parseCode} from "./code-analyzer";

let global_args;
let input_args;
let input_func;

const analyzed_code = (code_table, user_func, input_argument_values) => {
    input_func = user_func;

    input_func =
        "let g1 = 5;\n" +
        "let g2,g3;\n" +
        "g3 = 7 + g2 * 8;\n" +
        "function foo(x, y, z){\n" +
        "    let a = x + 1;\n" +
        "    let b = a + y;\n" +
        "    let c = 0;\n" +
        "    g1 = g1 + x;\n" +
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

    code_table = parseCode(input_func)[1];
    input_argument_values = '1, 2, 3';
    input_args = extract_arguments(input_argument_values);
    global_args = extract_global_arguments();
    let local_arg_dict = create_local_arg_dict();
    return substitutor.perform_substitution(input_args, global_args, local_arg_dict, input_func, code_table);
};

function create_local_arg_dict(){
    // Returns a dictionary mapping between the local arguments and their values after substitution.
    // the key will be the variable name, and the value is an array containing json object with the value AND line.
    let local_args = {};
    let parsedCode = esprima.parse(input_func, {loc: true});
    let function_table = get_function_declaration(parsedCode);

    for (let i = 0; i < function_table.length; i++) {
        if(function_table[i].Type === 'variable declaration' || function_table[i].Type === 'assignment expression'){
            if(!global_args[function_table[i].Name] && !input_args[function_table[i].Name]){
                let arg_value = generate_assignment_array(function_table[i]);
                //arg_value = substitute_value(arg_value, local_args, global_args);
                if(local_args[function_table[i].Name]){
                    local_args[function_table[i].Name].push({value: arg_value, location: function_table[i].Line})
                }
                else{
                    local_args[function_table[i].Name] = [{value: arg_value, location: function_table[i].Line}] ;
                }
            }
        }
    }
    return local_args;
}

function generate_assignment_array(row){
    //Generates an array containing the different values and operations in the given expression
    let expression = "let " + row.Name + " = " + row.Value;
    let value_arr = [];
    let exp = esprima.parse(expression).body[0];
    return value_arr.concat(extract_assignment(exp))
}

function extract_assignment(expression) {
    //recursively extract the values of a given expression. Returns an array

    switch(expression.type){
        case('VariableDeclaration'):
            return extract_assignment(expression.declarations[0]);
        case('Identifier'):
            return [expression.name];
        case('Literal'):
            return [expression.value];
        case('VariableDeclarator'):
            if(expression.init)
                return extract_assignment(expression.init);
            else
                return [null];
        case('BinaryExpression'):
            let left = extract_assignment(expression.left);
            let right = extract_assignment(expression.right);
            if(expression.operator === "*" || expression.operator === "/"){
                left = ["("].concat(left).concat(")");
                right = ["("].concat(right).concat(")");
                return left.concat([expression.operator]).concat(right);
            }
            else
                return left.concat([expression.operator]).concat(right);
    }
}

function extract_arguments(argument_string){
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

function get_function_declaration(program_object) {
    program_object = program_object.body;
    for (let j = 0; j < program_object.length; j++) {
        if (program_object[j].type === 'FunctionDeclaration') {
            return generate_parsed_table(program_object[j]);
        }
    }
}

function get_global_vars_declarations(input_func) {

    let parsed_code = esprima.parse(input_func).body;
    let global_vars = [];
    for (let i = 0; i < parsed_code.length; i++) {
        if(parsed_code[i].type === 'VariableDeclaration' || parsed_code[i].type === 'ExpressionStatement'){
            global_vars.push(parsed_code[i]);
        }
    }
    return global_vars;
}

function extract_global_arguments() {
    let i = 0;
    let global_args = {};
    let global_var_decs = get_global_vars_declarations(input_func);

    while(i<global_var_decs.length){
        if(global_var_decs[i].type === 'VariableDeclaration'){
            for(let j = 0; j < global_var_decs[i].declarations.length; j++){
                let arg_name = global_var_decs[i].declarations[j].id.name;
                global_args[arg_name] = extract_assignment(global_var_decs[i].declarations[j]);
            }
        }
        else if(global_var_decs[i].type === 'ExpressionStatement'){
            let arg_name = global_var_decs[i].expression.left.name;
            global_args[arg_name] = extract_assignment(global_var_decs[i].expression.right);
        }
        i++;
    }
    return global_args
}

function extract_arg_names(input_func=''){
    // Returns an array containing the name of the function's arguments
    let arg_array = input_func.split('function')[1].split('{')[0].split('(')[1].split(')')[0].split(',');
    for (let i = 0; i < arg_array.length; i++) {
        arg_array[i] = arg_array[i].replace(/\s+/g, '');  // Remove whitespace
    }
     return arg_array
 }

function extract_arg_types(arg){
    //Returns the type of the argument: bool, array, string or num
    if(arg.charAt(0) === '[')
        return 'array';
    if(arg === 'true' || arg === 'false')
        return 'bool';
    if(arg.charAt(0) === '\'' || arg.charAt(0) === '\"')
        return 'string';
    else
        return 'num';
}

function extract_arg_values(args){
    // function that returns an array containing the value of each input argument in a different cell.
    let values = [];
    let currVal = '';
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
                currVal = '';
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
            currVal = '';
        }
    }

    return values;
}

export{analyzed_code, extract_arg_values, extract_arguments, extract_arg_names, extract_arg_types, extract_global_arguments,
    get_function_declaration, create_local_arg_dict, extract_assignment, generate_assignment_array}