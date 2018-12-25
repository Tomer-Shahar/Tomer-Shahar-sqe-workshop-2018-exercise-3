import * as esprima from 'esprima';
import * as flowchart from 'flowchart.js';
import * as funcParser from './function-parser';
import {extract_assignment} from './function-parser';

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
//let true_path = [];
let state_count = 1;
let in_true_path;

let cond_count = 1; //conditions
let op_count = 1; //operations
let dec_count = 1; //declare
let merge_count = 1; //merge states

let flow_code = '';

function create_flow_chart(user_input_code, user_input_args){
    //code_table = parseCode(user_input_code)[1];
    input_code = user_input_code;
    let args = funcParser.get_args(user_input_code, user_input_args);
    input_args = args[0];
    global_args = args[1];
    local_arg_dict = args[2];
    create_flowgraph_string(input_code);
    let chart = flowchart.parse(flow_code);
    let settings = get_settings();

    return [chart, settings];
}

function foo(){
    return 'e=>end: |||||||||||\n' +
        'dec=>operation: a = x + 1 \n b = a + x \n c = 0|truePath\n' +
        'ass1=>operation: c = c + 5\n' +
        'ass2=>operation: c = c + z + 5\n' +
        'ass3=>operation: c = c + x + 5|truePath\n' +
        'ret=>operation: return c|truePath\n' +
        'cond1=>condition: b < z|truePath\n' +
        'cond2=>condition: b < z * 2|truePath\n' +
        '\n' +
        'dec->cond1\n' +
        'cond1(yes)->ass1\n' +
        'cond1(no)->cond2\n' +
        'cond2(no)->ass2\n' +
        'ass2->e\n' +
        'ass1->e\n' +
        'cond2(yes, bottom)->ass3->e\n' +
        'e->ret\n' +
        'dec@>cond1({"stroke":"green"})@>cond2({"stroke":"green"})@>ass3({"stroke":"green"})@>e({"stroke":"green"})@>ret({"stroke":"green"})\n' +
        '\n';
}

function create_flowgraph_string(input_func){
    let parsed_code = esprima.parse(input_func, {loc: true});
    for (const [key] of Object.entries(local_arg_dict)) {
        local_arg_indices[key] = 0;
    }

    return  generate_chart(parsed_code);
}

function add_edge_to_flow_chart(prev_state, state_name) {
    if(prev_state)
        flow_code += prev_state + '->' + state_name +'\n';
}

function add_merge_edge(prev_state){
    flow_code += prev_state + '->e' + merge_count + '\n';
}

function compIfExp(if_exp, in_condition_block, args_to_decrement, prev_state){

    let condition = sub_equation(generate_code_string(if_exp.test.loc));
    let res = evaluate_expression(condition);
    let state_name = 'cond' + cond_count;
    cond_count++;
    if(!args_to_decrement)
        args_to_decrement = [];
    add_state_to_flow_chart(state_name, 'condition', generate_code_string(if_exp.test.loc));
    add_edge_to_flow_chart(prev_state, state_name);
    add_merge_to_flow_chart();

    in_true_path = in_true_path && res;
    let last_state = generate_chart(if_exp.consequent, true, args_to_decrement, state_name + '(yes)' ); // inner if block
    add_merge_edge(last_state);
    clear_inner_block_args(args_to_decrement);

    in_true_path = !res; //condition was false, we'll enter the else-if or else.
    if (if_exp.alternate.type==='IfStatement') // else_if
        compElseIfExp(if_exp.alternate, state_name + '(no)');
    else{ //else
        args_to_decrement = [];
        last_state = generate_chart(if_exp.alternate, true, args_to_decrement, state_name + '(no)');
        clear_inner_block_args(args_to_decrement);
        add_merge_edge(last_state);
    }
    merge_count++;
}

function compElseIfExp(else_if_exp, prev_state){
    let args_to_decrement = [];
    let condition = sub_equation(generate_code_string(else_if_exp.test.loc));
    let res = evaluate_expression(condition);
    let state_name = 'cond' + cond_count;
    cond_count++;
    add_state_to_flow_chart(state_name, 'condition', generate_code_string(else_if_exp.test.loc));
    add_edge_to_flow_chart(prev_state, state_name);

    in_true_path = in_true_path && res;
    let last_state = generate_chart(else_if_exp.consequent, true, args_to_decrement, state_name + '(yes)');
    add_merge_edge(last_state);
    clear_inner_block_args(args_to_decrement);

    in_true_path = !res; //condition was false, we'll enter the else-if or else.
    if (else_if_exp.alternate.type==='IfStatement') // else-if
        compElseIfExp(else_if_exp.alternate, state_name + '(no)');
    else { //else
        args_to_decrement = [];
        last_state = generate_chart(else_if_exp.alternate, true, args_to_decrement, state_name + '(no)');
        clear_inner_block_args(args_to_decrement);
        add_merge_edge(last_state);
    }
}

function compForExp(for_exp, in_condition_block, args_to_decrement, prev_state){
    let inner_statement = input_code.split('\n')[for_exp.loc.start.line-1]; // "let i=0; i < c+x; i = i+1"
    if(!args_to_decrement)
        args_to_decrement = [];
    inner_statement = inner_statement.substring(for_exp.init.loc.start.column, for_exp.update.loc.end.column);
    inner_statement = parse_for_inner_statement(inner_statement);
    let result = '<div>' + make_space(for_exp.loc.start.column) + 'for (' + inner_statement + '){</div>';
    result = result +
        generate_chart(for_exp.body, true, args_to_decrement) +
        '<div>' + make_space(for_exp.loc.start.column) + '}</div>';
    clear_inner_block_args();
    return result;
}

function compReturnExp(return_exp, in_condition_block, args_to_decrement, prev_state){
    flow_code += 'ret=>operation: (' + state_count + ')\n return ' + generate_code_string(return_exp.argument.loc) + '|truePath\n';
    add_edge_to_flow_chart(prev_state, 'ret');
    return 'ret';
}

function compWhileExp(while_exp, in_condition_block, args_to_decrement, prev_state){

    if(!args_to_decrement)
        args_to_decrement = [];
    let condition = sub_equation(generate_code_string(while_exp.test.loc));
    let result = '<div>' + make_space(while_exp.loc.start.column) + 'while (' + condition + '){</div>';
    let while_body = generate_chart(while_exp.body, true, args_to_decrement, prev_state);
    result =
        result +
        while_body +
        '<div>' + make_space(while_exp.loc.start.column) + '}</div>';

    clear_inner_block_args();
    return result;
}

function generate_chart(parsed_code, in_condition_block=false, args_to_decrement, prev_state){
    let comp_function = expression_to_function[parsed_code.type];
    return comp_function(parsed_code, in_condition_block, args_to_decrement, prev_state);
}

function compVarDeclaratorExp(var_dec, in_condition_block, args_to_decrement, prev_state){

    let result = '';
    if(var_dec.init) {
        get_updated_arg_value(var_dec.id.name, var_dec.init);
        result += var_dec.id.name + ' = ' + comp_binary_expression(var_dec.init).join(' ');
    }
    else{
        result += var_dec.id.name + ' = ' + 'null';
    }

    if (in_condition_block) { //Declared a variable for the first time in a new block..
        local_arg_indices[var_dec.id.name] = 0;
        args_to_decrement.push(var_dec.id.name);
    }

    return result;
}

function compAssignmentExp(assignment_exp, in_condition_block, args_to_decrement, prev_state){

    let arg_name = assignment_exp.left.name;
    let new_val = get_updated_arg_value(arg_name, assignment_exp.right);
    let state_name = 'op' + op_count;
    op_count ++;
    let state_body = comp_binary_expression(assignment_exp.right).join(' ');
    add_state_to_flow_chart(state_name, 'operation',  arg_name + ' = ' + state_body);
    add_edge_to_flow_chart(prev_state, state_name);

    if(arg_name in local_arg_dict){
        if(in_condition_block){
            local_arg_indices[arg_name] += 1;
            args_to_decrement.push(arg_name);
        }
        let index = local_arg_indices[arg_name];
        local_arg_dict[arg_name][index].value = new_val;
    }
    return state_name;
}

function add_state_to_flow_chart(state_name, state_type, state_body){
    if(in_true_path)
        flow_code += state_name + '=>' + state_type + ': (' + state_count + ')\n' + state_body + '|truePath\n';
    else
        flow_code += state_name + '=>' + state_type + ': (' + state_count + ')\n' + state_body + '\n';

    state_count++;
}

function add_merge_to_flow_chart(){
    if(in_true_path)
        flow_code += 'e' + merge_count + '=>end: |||||||||truePath\n';
    else
        flow_code += 'e' + merge_count + '=>end: ||||||||\n';
}

function compVarDeclarationExp(var_dec_exp, in_condition_block, args_to_decrement, prev_state){
    //let state_name = 'dec' + dec_count;
    let dec_state = 'dec' + dec_count + '=>operation: (' + state_count + ')\n';
    dec_count++;

    for(let i = 0; i < var_dec_exp.declarations.length; i++) {
        let v_code = var_dec_exp.declarations[i];

        dec_state += compVarDeclaratorExp(v_code, in_condition_block, args_to_decrement);
        if(i < var_dec_exp.declarations.length - 1){
            dec_state += '\n';
        }
    }
    if(in_true_path)
        dec_state += '|truePath\n';
    else
        dec_state += '\n';

    flow_code += dec_state;
}

function create_declarator_state(decs, in_condition_block, args_to_decrement, prev_state) {

    let state_name = 'dec' + dec_count;
    dec_count++;
    let state_body = '';
    for (let i = 0; i < decs.length; i++) {
        for (let j = 0; j < decs[i].declarations.length; j++) {
            let v_code = decs[i].declarations[j];
            state_body += compVarDeclaratorExp(v_code, in_condition_block, args_to_decrement);
            if(i < decs.length-1){
                state_body += '\n';
            }
        }
    }
    add_state_to_flow_chart(state_name, 'operation', state_body);
    add_edge_to_flow_chart(prev_state, state_name);
    return state_name;
}

function get_var_decs_in_block_exp(block_exp) {
    let decs = [];
    for (let i = 0; i < block_exp.body.length; i++) {
        let code = block_exp.body[i];
        if (code.type === 'VariableDeclaration') {
            decs.push(code);
        }
    }
    return decs;
}

function compBlockStatement(block_exp, in_condition_block, args_to_decrement, prev_state){
    let last_statement;
    let decs = get_var_decs_in_block_exp(block_exp);
    if(decs.length > 0)
        prev_state = create_declarator_state(decs, in_condition_block, args_to_decrement, prev_state);

    for(let i=0; i<block_exp.body.length; i++){
        let code = block_exp.body[i];
        if(code.type === 'VariableDeclaration')
            continue;
        last_statement = generate_chart(code, in_condition_block, args_to_decrement, prev_state);
        if(code.type === 'IfStatement'){ //We just left the if statement
            prev_state = 'e' + (merge_count-1);
        }
    }
    if(in_condition_block)
        return last_statement;
}

function get_settings(){
    return {
        'x': 100, 'y': 0,
        'line-width': 4, 'line-length': 70,
        'text-margin': 15,
        'font-size': 14, 'font-color': 'black',
        'line-color': 'black', 'element-color': 'black',
        'fill': '',
        'yes-text': 'T', 'no-text': 'F',
        'arrow-end': 'block', 'scale': 1.1,
        'symbols': { // style symbol types
            'start': { 'font-color': 'black', 'element-color': 'green', 'fill': 'white', 'font-size': '0' },
            'end': { 'class': 'end-element', 'fill': '#A8D18D', 'font-size': '20', 'font-color': '#A8D18D'}
        },
        'flowstate': { 'truePath': {'fill': '#A8D18D', 'font-size': 13} }
    };
}

function compExpStatement(exp_statement, in_condition_block, args_to_decrement, prev_state){
    return generate_chart(exp_statement.expression, in_condition_block, args_to_decrement, prev_state);
}

function compUpdateExpression(update_exp){
    let name = update_exp.argument.name;
    let op = update_exp.operator;
    if(name in input_args){
        if(op === '++')
            input_args[name] += 1;
        else
            input_args[name] -= 1;
    }
    if(name in global_args){
        if(op === '++')
            global_args[name] += 1;
        else
            global_args[name] -= 1;
    }
    flow_code += 'op' + op_count + '=>operation: ' + name + op + '\n';
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

function clear_inner_block_args(args_to_decrement){
    if(args_to_decrement)
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

function compFuncDec(func_dec_exp){
    in_true_path = true;
    return generate_chart(func_dec_exp.body);
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

function get_updated_arg_value(arg_name, init) {
    //Function that updates the value of the argument in the local/global dictionary to be only dependant on literal
    //values and/or function arguments (c : c+5 --> c : 5 or b : a + y --> b : x + 1 + y)
    init = comp_binary_expression(init);
    return sub_exp_to_array(init);
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

function compProgram(program, in_condition_block){
//function for computing program expression (the main object)

    let result = '';
    for(let i = 0; i < program.body.length; i++) {
        let exp = program.body[i];
        if(exp.type === 'FunctionDeclaration')
            result = result + generate_chart(exp, in_condition_block);
    }
    return result;
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

function evaluate_expression(condition){
    // Attaches the appropriate color if the condition is true or false.
    // "b + y + g[1] < (z) * (a[0])"

    condition = esprima.parse(condition).body[0].expression; //{type:binary expression ... }
    condition = comp_binary_expression(condition); // [b + y + 0 < (z) * (a)]
    condition = parse_condition(condition);
    condition = condition.join(' ');

    return eval(condition);

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

function generate_code_string(location){
    let rows = input_code.split('\n');
    return rows[location.start.line-1].substring(location.start.column, location.end.column);
}

function make_space(n){
    let space = '';
    for (let i = 0; i < n; i++) {
        space += ' ';
    }
    return space;
}

export{create_flow_chart};