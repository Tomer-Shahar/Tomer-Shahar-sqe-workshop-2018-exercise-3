/**
 * Script for performing symbol substitution on a given function and asserts which code paths will be true or false
 * for a given input
 *///

import * as esprima from 'esprima';
import {get_parsed_table} from './code-analyzer';

let global_args;
let input_args;
let input_func;
let local_arg_dict;

function get_args(user_func, input_argument_values){
    input_func = user_func;
    input_args = extract_arguments(input_argument_values);
    global_args = extract_global_arguments();
    local_arg_dict = create_local_arg_dict();
    return [input_args, global_args, local_arg_dict];
}

// Function that extracts the arguments from the argument text box
// returns each arg name and their input value.
function extract_arguments(argument_string){
    let parsed_args = {};
    let arg_names = extract_arg_names(input_func);
    let input_arg_array = extract_arg_values(argument_string);
    let arg_val, arg_type;
    for(let i = 0; i < arg_names.length; i++){
        if(input_arg_array.length !== 0){
            arg_val = input_arg_array[i];
            arg_type = extract_arg_types(input_arg_array[i]);
            arg_val = parse_arg_value(arg_val, arg_type);
        }
        else{
            arg_val = 0;
            arg_type = 'num';
        }
        let arg_name = arg_names[i];
        parsed_args[arg_name] = {'type': arg_type, 'value': arg_val};
    }
    return parsed_args;
}

function parse_arg_value(arg_val, arg_type){
    //transforms the value into a proper int / string / boolean / array.
    switch(arg_type) {
    case('num'):
        return Number(arg_val);
    case('bool'):
        return arg_val === 'true';
    case('string'):
        return arg_val; //arg_val.substring(1, arg_val.length-1); //remove the ' / "
    case('array'):
        return parse_to_array(arg_val);
    }

}

function parse_inner_array(currVal, arg_val, i, result) {
    let brackets = 1;
    currVal += arg_val.charAt(i); //Add the '['
    i++;
    while (brackets !== 0) {
        currVal += arg_val.charAt(i);
        if (arg_val.charAt(i) === '[')
            brackets++;
        if (arg_val.charAt(i) === ']')
            brackets--;
        i++;
    }
    let curr_array = parse_to_array(currVal);
    result.push(curr_array);
    currVal = '';
    return {currVal, i};
}

//parses a string such as "[2,3,['a',false],true]" into a proper array
function parse_to_array(arg_val){
    arg_val = arg_val.substring(1, arg_val.length-1);    let result = [], currVal = '';
    for (let i = 0; i < arg_val.length; i++) {
        if(arg_val.charAt(i) !== '['){
            if(arg_val.charAt(i) !== ','){
                currVal += arg_val.charAt(i);
                if(i === arg_val.length-1) { // For last input
                    currVal = parse_arg_value(currVal, extract_arg_types(currVal));                    result.push(currVal);
                }            }
            else{
                currVal = parse_arg_value(currVal, extract_arg_types(currVal));                result.push(currVal);                currVal = '';
            }
        }
        else{ //reached an array
            const __ret = parse_inner_array(currVal, arg_val, i, result);
            currVal = __ret.currVal;            i = __ret.i;
        }
    }
    return result;
}

function parse_inner_input_array(currVal, args, i, values) {
    let brackets = 1;
    currVal += args.charAt(i); //Add the '['
    i++;
    while (brackets !== 0) {
        currVal += args.charAt(i);
        if (args.charAt(i) === '[')
            brackets++;
        if (args.charAt(i) === ']')
            brackets--;
        i++;
    }
    values.push(currVal);
    currVal = '';
    return {currVal, i};
}

// function that returns an array containing the value of each input argument in a different cell.
function extract_arg_values(args){
    let values = [], currVal = '';
    args = args.replace(/\s+/g, '');
    for (let i = 0; i < args.length; i++) {
        if(args.charAt(i) !== '['){
            if(args.charAt(i) !== ','){
                currVal += args.charAt(i);
                if(i === args.length-1)                    values.push(currVal);
            }
            else{
                values.push(currVal);                currVal = '';
            }
        }
        else{ //reached an array
            const __ret = parse_inner_input_array(currVal, args, i, values);
            currVal = __ret.currVal;            i = __ret.i;
        }
    }
    return values;
}

// Returns a dictionary mapping between the local arguments and their values after substitution.
function insert_local_arg_value(function_table, i, local_args) {
    if(!global_args[function_table[i].Name] && !input_args[function_table[i].Name]) {
        let arg_value = generate_assignment_array(function_table[i]);
        if (local_args[function_table[i].Name]) {
            local_args[function_table[i].Name].push({value: arg_value, location: function_table[i].Line});
        } else {
            local_args[function_table[i].Name] = [{value: arg_value, location: function_table[i].Line}];
        }
    }
}

// the key will be the variable name, and the value is an array containing json object with the value AND line.
function create_local_arg_dict(){
    let local_args = {};
    let parsedCode = esprima.parse(input_func, {loc: true});
    let function_table = get_function_declaration(parsedCode);

    for (let i = 0; i < function_table.length; i++){
        if(function_table[i].Type === 'variable declaration' || function_table[i].Type === 'assignment expression'){
            insert_local_arg_value(function_table, i, local_args);

        }
    }
    return local_args;
}

function generate_assignment_array(row){
    //Generates an array containing the different values and operations in the given expression
    let expression = 'let ' + row.Name + ' = ' + row.Value;
    let value_arr = [];
    let exp = esprima.parse(expression).body[0];
    return value_arr.concat(extract_assignment(exp));
}

let extraction_func_map = {
    'VariableDeclaration' : extract_var_declaration,
    'Identifier' : extract_identifier,
    'Literal' : extract_literal,
    'VariableDeclarator' : extract_var_declarator,
    'BinaryExpression' : extract_binary_exp,
    'ArrayExpression' : extract_array_exp,
    'MemberExpression' : extract_member_exp,
    'UnaryExpression' : extract_unary_exp
};

function extract_unary_exp(expression){
    return [expression.operator].concat(extract_assignment(expression.argument));
}
function extract_var_declaration(expression){
    return extract_assignment(expression.declarations[0]);
}

function extract_identifier(expression){
    return [expression.name];

}

function extract_literal(expression){
    return [expression.raw];
}

function extract_var_declarator(expression){
    if(expression.init)
        return extract_assignment(expression.init);
}

function extract_binary_exp(expression){
    let left,right;

    left = extract_assignment(expression.left);
    right = extract_assignment(expression.right);
    if(expression.operator === '*' || expression.operator === '/'){
        left = ['('].concat(left).concat(')');
        right = ['('].concat(right).concat(')');
        return left.concat([expression.operator]).concat(right);
    }
    else
        return left.concat([expression.operator]).concat(right);
}
function extract_array_exp(expression){
    let result = [];
    for (let i = 0; i < expression.elements.length; i++) {
        result.push(extract_assignment(expression.elements[i])[0]);
    }
    return [result];
}

function extract_member_exp(expression){
    return [expression.object.name + '[' + expression.property.value +']'];
}

//recursively extract the values of a given expression. Returns an array
function extract_assignment(expression) {
    let extract_func = extraction_func_map[expression.type];
    return extract_func(expression);
}

function get_function_declaration(program_object) {
    program_object = program_object.body;
    for (let j = 0; j < program_object.length; j++) {
        if (program_object[j].type === 'FunctionDeclaration') {
            return get_parsed_table(program_object[j], input_func);
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

function extract_update_expression(global_var_decs, i, global_args) {
    let name = global_var_decs[i].expression.argument.name;
    let op = global_var_decs[i].expression.operator;
    if (op === '++')
        global_args[name][0] += 1;
    else
        global_args[name][0] -= 1;
}

function extract_global_arguments() {
    let global_var_decs = get_global_vars_declarations(input_func), global_args = {}, i = 0, val = [];
    while(i<global_var_decs.length){
        if(global_var_decs[i].type === 'VariableDeclaration'){
            for(let j = 0; j < global_var_decs[i].declarations.length; j++){
                let arg_name = global_var_decs[i].declarations[j].id.name;
                global_args[arg_name] = extract_assignment(global_var_decs[i].declarations[j]);
            }
        }
        else if(global_var_decs[i].expression.type === 'AssignmentExpression'){
            val = parse_global_var(extract_assignment(global_var_decs[i].expression.right), global_args);
            global_args[global_var_decs[i].expression.left.name] = val;
        }
        else { //it's an update expression
            extract_update_expression(global_var_decs, i, global_args);
        }
        i++;
    }
    return global_args;
}

function parse_inner_global_var(expression, i, global_args, result) {
    let name = expression[i];
    let val = global_args[name];
    if (val.length > 1) { // binary expression [ 3, +, 5, *, 2]
        val = parse_global_var(val, global_args);
    } else { // [5] or [ [4] ] or [ "boop" ] or [ [2,4,5] ]
        val = val[0];
    }
    result = result.concat(val);
    return result;
}
//Receives an array and parses it to remove any variables and leaves only literal values.
function parse_global_var(expression, global_args){
    let result = [];
    let op_set = new Set(['+', '-', '*', '/', '(', ')', '<', '>',]);

    for (let i = 0; i < expression.length; i++){
        if(expression[i] in global_args){
            result = parse_inner_global_var(expression, i, global_args, result);
            continue;
        }
        else if (!op_set.has(expression[i])){ // Not an operator symbol
            let exp = esprima.parse(''+expression[i]).body[0].expression;
            if(exp.type === 'MemberExpression'){
                result = result.concat(global_args[exp.object.name][0][exp.property.value]);
                continue;
            }
        }
        result = result.concat(expression[i]);
    }
    return result;
}

function extract_arg_names(input_func){
    // Returns an array containing the name of the function's arguments
    let arg_array = input_func.split('function')[1].split('{')[0].split('(')[1].split(')')[0].split(',');
    for (let i = 0; i < arg_array.length; i++) {
        arg_array[i] = arg_array[i].replace(/\s+/g, '');  // Remove whitespace
    }
    return arg_array;
}

function extract_arg_types(arg){
    //Returns the type of the argument: bool, array, string or num
    let type = check_first_char(arg);

    if(type)
        return type;

    if(arg === 'true' || arg === 'false')
        return 'bool';
    else
        return 'num';
}

function check_first_char(arg){
    if(arg.charAt(0) === '[')
        return 'array';
    if(arg.charAt(0) === '\'' || arg.charAt(0) === '"')
        return 'string';

    return null;
}

export{get_args, extract_arg_values, extract_arguments, extract_arg_names, extract_arg_types, extract_global_arguments,
    get_function_declaration, create_local_arg_dict, extract_assignment, generate_assignment_array};