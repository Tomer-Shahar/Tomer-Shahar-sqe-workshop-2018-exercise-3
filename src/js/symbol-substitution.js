import * as esprima from 'esprima';
import {extract_assignment} from './function-parser';

// This json object will map between the different expressions of the original code.
// Each expression in the original code has a different type and needs a specific parse method.

let expression_to_function = {
    'Program' : compProgram,
    'FunctionDeclaration' : compFuncDec,
    'BlockStatement' : compBlockStatement,
    'VariableDeclaration' : compVarDeclarationExp,
    'AssignmentExpression' : compAssignmentExp,
    'IfStatement' : compIfExp,
    'ReturnStatement' : compReturnExp,
    'ForStatement' : compForExp,
    'WhileStatement' : compWhileExp,
    'ExpressionStatement' : compExpStatement,
    'UpdateExpression' : compUpdateExpression
};

let input_code;
let input_args;
let global_args;
let local_arg_dict;
let local_arg_indices = {};
let args_to_decrement = [];

function perform_substitution(user_input_args, global_arguments, local_args, input_func){
    input_code = input_func;
    input_args = user_input_args;
    //global_args = parse_global_args(global_arguments);
    global_args = global_arguments;
    local_arg_dict = local_args;
    let parsed_code = esprima.parse(input_func, {loc: true});
    for (const [key] of Object.entries(local_arg_dict)) {
        local_arg_indices[key] = 0;
    }

    return get_substituted_code(parsed_code);
}

function clear_memory(){
    input_code = '';
    input_args = {};
    global_args = {};
    local_arg_dict = {};
    local_arg_indices = {};
    args_to_decrement = [];
}

function compIfExp(if_exp){

    let condition = sub_equation(generate_code_string(if_exp.test.loc));
    let result = 'if (' + condition + ') {';
    let space = make_space(if_exp.loc.start.column);
    result = '<div>' + space +  evaluate_expression(condition, result) + '</div>';
    result = result + get_substituted_code(if_exp.consequent, true);
    clear_inner_block_args();
    if (if_exp.alternate == null) //No else or else-if (code just continues)
        return result + '<div>' + make_space(if_exp.loc.start.column) + '}</div>';
    if (if_exp.alternate.type==='IfStatement') // else_if
        return result + compElseIfExp(if_exp.alternate);
    else{ //else
        result += '<div>' + make_space(if_exp.loc.start.column) + '} else { </div>';
        result += get_substituted_code(if_exp.alternate, true);//Gets the <div> by itself
        result += '<div>' + make_space(if_exp.loc.start.column) + '}</div>';
        clear_inner_block_args();
        return result;
    }
}

function compElseIfExp(else_if_exp){

    let condition = sub_equation(generate_code_string(else_if_exp.test.loc));
    let result = '} else if (' + condition + ') {';
    result = '<div>' + make_space(else_if_exp.loc.start.column-7) + evaluate_expression(condition, result) + '</div>';
    result = result + get_substituted_code(else_if_exp.consequent, true);
    clear_inner_block_args();

    if (else_if_exp.alternate == null)
        return result + '<div>' + make_space(else_if_exp.loc.start.column-7) + '}</div>';
    if (else_if_exp.alternate.type==='IfStatement') // else-if
        return result + compElseIfExp(else_if_exp.alternate);
    else { //else
        result += '<div>' + make_space(else_if_exp.loc.start.column - 7) + '} else { </div>';
        result += get_substituted_code(else_if_exp.alternate, true);//Gets the <div> by itself
        result += '<div>' + make_space(else_if_exp.loc.start.column - 7) + '}</div>';
        clear_inner_block_args();
        return result;
    }
}

function compForExp(for_exp){
    let inner_statement = input_code.split('\n')[for_exp.loc.start.line-1]; // "let i=0; i < c+x; i = i+1"
    inner_statement = inner_statement.substring(for_exp.init.loc.start.column, for_exp.update.loc.end.column);
    inner_statement = parse_for_inner_statement(inner_statement);
    let result = '<div>' + make_space(for_exp.loc.start.column) + 'for (' + inner_statement + '){</div>';
    result = result +
        get_substituted_code(for_exp.body, true) +
        '<div>' + make_space(for_exp.loc.start.column) + '}</div>';
    clear_inner_block_args();
    return result;
}

function parse_for_inner_statement(inner_statement){
    inner_statement = inner_statement.split(';'); //["let i=0", "i < y + 1 + x", "i = i+1"]
    let parsed_statement = [];
    inner_statement[0] = inner_statement[0].split('let')[1].trim(); // "i=0"
    for (let i = 0; i < 3; i++) {
        parsed_statement[i] = sub_equation(inner_statement[i]);
    }

    return parsed_statement.join('; ');
}

function compWhileExp(while_exp){
    let condition = sub_equation(generate_code_string(while_exp.test.loc));
    let result = '<div>' + make_space(while_exp.loc.start.column) + 'while (' + condition + '){</div>';
    let while_body = get_substituted_code(while_exp.body, true);
    result =
        result +
        while_body +
        '<div>' + make_space(while_exp.loc.start.column) + '}</div>';

    clear_inner_block_args();
    return result;
}

function get_substituted_code(parsed_code, in_condition_block=false) {

    let comp_function = expression_to_function[parsed_code.type];
    return '' + (comp_function(parsed_code, in_condition_block));
}

function clear_inner_block_args(){
    for (let i = 0; i < args_to_decrement.length; i++) {
        let arg_name = args_to_decrement[i];
        local_arg_dict[arg_name].splice(local_arg_indices[arg_name], 1);
        local_arg_indices[arg_name]--;
    }
    args_to_decrement = [];
}

function parse_global(condition, i) {
    let name = condition[i];
    let val = global_args[name];
    if (val.length > 1) { // binary expression [ 3, +, 5, *, 2]
        val = parse_condition(val);
    } else { // [5] or [ [4] ] or [ "boop" ] or [ [2,4,5] ]
        val = val[0];
    }
    return val;
}
//Receives an array and parses it to remove any variables and leaves only literal values.
function parse_condition(condition){
    let op_set = new Set(['+', '-', '*', '/', '(', ')', '<', '>','!=', '!==', '==', '===']), result = [];

    for (let i = 0; i < condition.length; i++){
        if(condition[i] in global_args){
            let val = parse_global(condition, i);
            result = result.concat(val);
        }
        else if(condition[i] in input_args){
            let val = input_args[condition[i]].value;
            result = result.concat(val);
        }
        else if (!op_set.has(condition[i])){ // Not an operator symbol
            result = result.concat(check_member_expression(condition[i]));
        }
        else
            result = result.concat(condition[i]);
    }
    return result;
}

function check_member_expression(exp){

    let parsed_exp = esprima.parse(''+exp).body[0].expression;
    if(parsed_exp.type === 'MemberExpression'){
        let name = parsed_exp.object.name;
        let idx = parsed_exp.property.value;
        return find_and_extract_array_val(name, idx);
    }
    else{
        return exp;
    }

}

function evaluate_expression(condition, if_row){
    // Attaches the appropriate color if the condition is true or false.
    // "b + y + g[1] < (z) * (a[0])"

    condition = esprima.parse(condition).body[0].expression; //{type:binary expression ... }
    condition = comp_binary_expression(condition); // [b + y + 0 < (z) * (a)]
    condition = parse_condition(condition);
    condition = condition.join(' ');

    if(eval(condition)){
        if_row = '<span class=true>' + if_row + '</span>';
    }
    else{
        if_row = '<span class=false>' + if_row + '</span>';
    }

    return if_row;
}

function sub_equation(equation) {
    //Receives an equation as a STRING and returns it after being properly parsed, as a STRING

    equation = esprima.parse(equation).body[0].expression; //{type:binary expression ... }
    equation = comp_binary_expression(equation); // [b + y + 0 < (z) * (a)]
    equation = sub_exp_to_array(equation);// [x + 1 + y < z * (x + 1)]
    equation = equation.join(' '); // "x + 1 + y < z * ( x + 1 )"
    let regex_1 = new RegExp(/\( /, 'g');
    equation = equation.replace(regex_1, '('); // "x + 1 + y < z * (x + 1 )"
    let regex_2 = new RegExp(/ \)/, 'g');
    equation = equation.replace(regex_2, ')'); // "x + 1 + y < z * (x + 1)"
    return equation;
}

function compVarDeclaratorExp(var_dec, in_condition_block){

    if(var_dec.init) {
        get_updated_arg_value(var_dec.id.name, var_dec.init);
    }

    if (in_condition_block) { //Declared a variable for the first time in a new block..
        local_arg_indices[var_dec.id.name] = 0;
        args_to_decrement.push(var_dec.id.name);
    }

    return '';
}

function compAssignmentExp(assignment_exp, in_condition_block){
    let arg_name = assignment_exp.left.name;
    let new_val = get_updated_arg_value(arg_name, assignment_exp.right);

    if(arg_name in local_arg_dict){
        if(in_condition_block){
            local_arg_indices[arg_name] += 1;
            args_to_decrement.push(arg_name);
        }
        let index = local_arg_indices[arg_name];
        local_arg_dict[arg_name][index].value = new_val;
        return '';
    }
    else{ //function or global argument. Return it!
        return '<div>' + make_space(assignment_exp.loc.start.column) +
            arg_name + ' = ' + sub_equation(new_val.join(' ')) + ';</div>';
    }
}

function get_updated_arg_value(arg_name, init) {
    //Function that updates the value of the argument in the local/global dictionary to be only dependant on literal
    //values and/or function arguments (c : c+5 --> c : 5 or b : a + y --> b : x + 1 + y)
    init = comp_binary_expression(init);
    return sub_exp_to_array(init);
}

function compVarDeclarationExp(var_dec_exp, in_condition_block){
    let result = '';
    for(let i = 0; i < var_dec_exp.declarations.length; i++) {
        let v_code = var_dec_exp.declarations[i];

        result += compVarDeclaratorExp(v_code, in_condition_block);
    }
    return result;
}

function compBlockStatement(block_exp, in_condition_block){
    let result = '';

    for(let i=0; i<block_exp.body.length; i++){
        let code = block_exp.body[i];

        result = result + get_substituted_code(code, in_condition_block);
    }
    return result;
}

function after_plus_or_minus_and_is_last(equation, i) {
    return (equation[i - 1] === '+' || equation[i - 1] === '-') && i === equation.length - 1;
}

function after_comparison_and_before_multiplication_or_division(equation, i) {
    return (equation[i - 1] === '<' || equation[i - 1] === '<') && (equation[i + 1] !== '*' && equation[i + 1] !== '/');
}

function remove_zeroes(equation, new_equation, i) {
    if (equation.length === 1) { //equation: [ '0' ]
        new_equation = new_equation.concat(equation[i]);
    } else if (i === 0) { //Equation begins with a 0
        i++;
    }
    else if (after_plus_or_minus_and_is_last(equation, i)) {
        new_equation.length = new_equation.length - 1; //remove last item ?

    } else if (after_comparison_and_before_multiplication_or_division(equation, i)) {
        i++;
    }
    else { //i = 0 --> i = 0
        new_equation = new_equation.concat(equation[i]);
    }
    return {new_equation, i};
}

function parse_closing_bracket(close_bracket_idx, new_equation, open_bracket_idx, equation, i) {
    close_bracket_idx = new_equation.length;
    if (close_bracket_idx - open_bracket_idx === 2) { //Only one parameter between the brackets. Bye-bye brackets
        new_equation.splice(open_bracket_idx, 1);
    } else {
        new_equation = new_equation.concat([equation[i]]);
    }
    return new_equation;
}

// input: [0 + x + ( 0 + 1) * ( y ) + 0 < ( 0 ) * ( 0 + x + 1 + 0)]
function is_zero(equation, i) {
    return equation[i] === '0' || equation[i] === 0;
}

// output: [x + 1 * y < 0 * ( x + 1 )]
function remove_zeros_and_brackets_from_array(equation){
    let new_equation = [], open_bracket_idx = 0, close_bracket_idx = 0;
    for (let i = 0; i < equation.length ; i++) {
        if(is_zero(equation, i)){
            const __ret = remove_zeroes(equation, new_equation, i);
            new_equation = __ret.new_equation;            i = __ret.i;
        }
        else if(equation[i] === '('){
            new_equation = new_equation.concat(equation[i]);
            open_bracket_idx = new_equation.length-1;
        }
        else if(equation[i] === ')'){
            new_equation = parse_closing_bracket(close_bracket_idx, new_equation, open_bracket_idx, equation, i);
        }
        else{
            new_equation = new_equation.concat([equation[i]]);
        }
    }
    return new_equation;
}

function find_and_extract_array_val(name, idx) {
    //receives an arg name and index. The name is the name of a variable of type array, and the index is the index
    //of the desired cell.

    if (name in global_args) {
        return global_args[name][0][idx];
    } else if (name in input_args) {
        return  input_args[name][idx];
    } else {
        let local_idx = local_arg_indices[name];
        let local_array = local_arg_dict[name][local_idx].value[0];
        return local_array[idx];
    }
}

// Receives an array such as ["a", "+", "b[1]", "+", "g2"] and returns ["x", "+", "1", "+", "3", "+", "g2"]
function sub_exp_to_array(expression) {
    let result = [];
    let op_set = new Set(['+', '-', '*', '/', '(', ')', '<', '>','!=', '!==', '==', '===', '=']);
    for (let i = 0; i < expression.length; i++){
        if(expression[i] in local_arg_dict){
            let arg_value = local_arg_dict[expression[i]][local_arg_indices[expression[i]]].value;
            result = result.concat(sub_exp_to_array(arg_value)); continue;
        }
        else if (!op_set.has(expression[i])){
            let exp = esprima.parse(''+expression[i]).body[0].expression;
            if(exp.type === 'MemberExpression'){
                result = result.concat(concat_array_member_if_not_local(exp.object.name, exp.property.value));
                continue;
            }
        }
        result = result.concat(expression[i]);
    }
    return remove_zeros_and_brackets_from_array(result);
}

function concat_array_member_if_not_local(name, idx){
    if(name in local_arg_dict){
        return find_and_extract_array_val(name, idx);
    }
    else{
        return '' + name + '[' + idx + ']'; //g1[3]
    }
}

let comp_exp_map = {
    'Identifier' : extract_identifier,
    'Literal' : extract_literal,
    'BinaryExpression' : extract_binary_exp,
    'ArrayExpression' : extract_array_exp,
    'MemberExpression' : extract_member_exp,
    'AssignmentExpression' : extract_assignment_exp
};

function extract_identifier(expression){
    return [expression.name];
}

function extract_literal(expression){
    return [expression.raw];
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
        result.push(comp_binary_expression(expression.elements[i])[0]);
    }
    return [result];
}

function extract_member_exp(expression){
    return [expression.object.name + '[' + expression.property.value +']'];
}

function extract_assignment_exp(expression) {
    return comp_binary_expression(expression.left).concat(['=']).concat(comp_binary_expression(expression.right));
}

function comp_binary_expression(expression){
    //recursively extract the values of a given expression. Returns an array
    let extract_func = comp_exp_map[expression.type];
    return extract_func(expression);
}

function create_input_arg_string() {
    let result = [];
    for (const [key] of Object.entries(input_args)) {
        result.push(key);
    }
    return result.join(', ');
}

function compReturnExp(return_exp){
    return '<div>' + make_space(return_exp.loc.start.column) + 'return ' +
        sub_equation(generate_code_string(return_exp.argument.loc)) + ';</div>';
}

function compProgram(program, in_condition_block){
//function for computing program expression (the main object)

    let result = '';
    for(let i = 0; i < program.body.length; i++) {
        let exp = program.body[i];
        if(exp.type === 'FunctionDeclaration')
            result = result + get_substituted_code(exp, in_condition_block);
    }
    return result;
}

function compUpdateExpression(update_exp){
    let name = update_exp.argument.name;
    let op = update_exp.operator;
    if(name in input_args){
        if(op === '++')
            input_args[name] += 1;
        else
            input_args[name] -= 1;
        return '<div>' + make_space(update_exp.loc.start.column) + name + op + ';</div>';
    }
    if(name in global_args){
        if(op === '++')
            global_args[name] += 1;
        else
            global_args[name] -= 1;
        return '<div>' + make_space(update_exp.loc.start.column) + name + op + ';</div>';
    }
    return '';
}

function compFuncDec(func_dec_exp){

    let input_string = create_input_arg_string();
    let func_dec_string = '<div>function ' + func_dec_exp.id.name + '(' + input_string + '){</div>';
    return func_dec_string +
        get_substituted_code(func_dec_exp.body) +
        '<div>}</div>';
}

function compExpStatement(exp_statement, in_condition_block){
    return get_substituted_code(exp_statement.expression, in_condition_block);
}

function generate_code_string(location){
    let rows = input_code.split('\n');
    return rows[location.start.line-1].substring(location.start.column, location.end.column);
}

export {get_substituted_code, perform_substitution, clear_memory};

function make_space(n){
    let space = '';
    for (let i = 0; i < n; i++) {
        space += ' ';
    }
    return space;
}