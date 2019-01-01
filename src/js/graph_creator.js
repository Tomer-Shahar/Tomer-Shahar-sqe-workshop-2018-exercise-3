import * as esprima from 'esprima';
import * as funcParser from './function-parser';

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
let state_count = 1;
let in_true_path;

let cond_count = 1; //conditions
let op_count = 1; //operations
let merge_count = 1; //merge states

let flow_code = '';

function create_flow_chart(user_input_code, user_input_args){
    clear_memory();
    input_code = user_input_code;
    let args = funcParser.get_args(user_input_code, user_input_args);
    input_args = args[0];
    global_args = args[1];
    local_arg_dict = args[2];
    create_flowgraph_string(input_code);

    return flow_code;
}

function clear_memory(){
    input_code = '';
    input_args = '';
    global_args = {};
    local_arg_dict = {};
    local_arg_indices = {};
    state_count = 1;
    in_true_path = false;

    cond_count = 1; //conditions
    op_count = 1; //operations
    merge_count = 1; //merge states

    flow_code = '';
}

function get_flow_code(){
    return flow_code;
}

function create_flowgraph_string(input_func){
    let parsed_code = esprima.parse(input_func, {loc: true});
    for (const [key] of Object.entries(local_arg_dict)) {
        local_arg_indices[key] = 0;
    }

    return  generate_chart(parsed_code);
}

function generate_chart(parsed_code, in_condition_block=false, args_to_decrement, prev_state){
    let comp_function = expression_to_function[parsed_code.type];
    return comp_function(parsed_code, in_condition_block, args_to_decrement, prev_state);
}

function add_edge_to_flow_chart(prev_state, state_name) {
    if(prev_state)
        flow_code += prev_state + '->' + state_name +'\n';
}

function add_merge_edge(prev_state){
    flow_code +=  prev_state + '->e' + merge_count + '\n';
}

function check_if_increment_merge_count(in_condition_block) {
    if (!in_condition_block)
        merge_count++;
}

function check_if_can_clear_inner_args(in_condition_block, args_to_decrement) {
    if (!in_condition_block)
        clear_inner_block_args(args_to_decrement);
}

function add_state_edge_and_merge(state_name, if_exp, prev_state) {
    add_state_to_flow_chart(state_name, 'condition', generate_code_string(if_exp.test.loc));
    add_edge_to_flow_chart(prev_state, state_name);
    add_merge_to_flow_chart();
}

function generate_else_body(res, args_to_decrement, last_state, if_exp, state_name) {
    in_true_path = !res; //condition was false, we'll enter the else-if or else.
    args_to_decrement = [];
    last_state = generate_chart(if_exp.alternate, true, args_to_decrement, state_name + '(no)'); //Should return a merge state
    clear_inner_block_args(args_to_decrement);
    add_merge_edge(last_state);
}

function compIfExp(if_exp, in_condition_block, args_to_decrement, prev_state){
    let condition = sub_equation(generate_code_string(if_exp.test.loc));
    let res = evaluate_expression(condition);    let state_name = 'cond' + cond_count;
    cond_count++;
    if(!args_to_decrement)
        args_to_decrement = [];
    add_state_edge_and_merge(state_name, if_exp, prev_state);    in_true_path = in_true_path && res;
    let last_state = generate_chart(if_exp.consequent, true, args_to_decrement, state_name + '(yes)' ); // inner if block
    let merge_edge = 'e' + merge_count;
    add_merge_edge(last_state);
    check_if_can_clear_inner_args(in_condition_block, args_to_decrement);
    if(if_exp.alternate === null) { //Code just continues
        add_merge_edge(state_name + '(no)');    }
    else if (if_exp.alternate.type === 'IfStatement') { // else_if
        in_true_path = !res; //condition was false, we'll enter the else-if or else.
        compElseIfExp(if_exp.alternate, state_name + '(no)');    }
    else {
        generate_else_body(res, args_to_decrement, last_state, if_exp, state_name);    }
    check_if_increment_merge_count(in_condition_block);    return merge_edge;
}

function compElseIfExp(else_if_exp, prev_state){
    let args_to_decrement = [];    let condition = sub_equation(generate_code_string(else_if_exp.test.loc));    let res = evaluate_expression(condition);
    let state_name = 'cond' + cond_count;    cond_count++;
    add_state_to_flow_chart(state_name, 'condition', generate_code_string(else_if_exp.test.loc));
    add_edge_to_flow_chart(prev_state, state_name);
    in_true_path = in_true_path && res;
    let last_state = generate_chart(else_if_exp.consequent, true, args_to_decrement, state_name + '(yes)');
    add_merge_edge(last_state);
    clear_inner_block_args(args_to_decrement);

    if(else_if_exp.alternate === null) { //Code just continues
        add_merge_edge(state_name + '(no)');
    }
    else if (else_if_exp.alternate.type === 'IfStatement') { // else_if
        in_true_path = !res; //condition was false, we'll enter the else-if or else.
        compElseIfExp(else_if_exp.alternate, state_name + '(no)');    }
    else {
        generate_else_body(res, args_to_decrement, last_state, else_if_exp, state_name);    }
    return state_name  + '(no)';
}

function compWhileExp(while_exp, in_condition_block, args_to_decrement, prev_state){

    let condition = sub_equation(generate_code_string(while_exp.test.loc));
    let res = evaluate_expression(condition);    let null_state = 'op' + op_count;
    op_count++;
    args_to_decrement = [];
    add_state_to_flow_chart(null_state, 'operation', 'NULL'); // add the NULL state
    add_edge_to_flow_chart(prev_state, null_state); //a = x +1 -> NULL
    let cond_state = 'cond' + cond_count;
    add_state_to_flow_chart(cond_state, 'condition', generate_code_string(while_exp.test.loc));
    add_edge_to_flow_chart(null_state, cond_state);
    cond_count++;
    in_true_path = in_true_path && res;
    let body_state = generate_chart(while_exp.body, true, args_to_decrement, cond_state + '(yes)');
    add_edge_to_flow_chart(body_state, null_state); // Should return z = c
    clear_inner_block_args();
    return cond_state + '(no)';
}

function not_condition_expression(type) {
    return type !== 'IfStatement' && type !== 'ForStatement' && type !== 'WhileStatement';
}

function flush_current_body(curr_state_body, curr_state_name, prev_state) {
    if (curr_state_body !== '') { // Flush state
        curr_state_name = 'op' + op_count;
        op_count++;
        add_state_to_flow_chart(curr_state_name, 'operation', curr_state_body);
        add_edge_to_flow_chart(prev_state, curr_state_name);
    }
    return curr_state_name;
}

function generate_loop_graph(curr_state_name, curr_state_body, prev_state, code, in_condition_block, args_to_decrement, was_true) {
    curr_state_name = 'op' + op_count;
    op_count++;
    add_state_to_flow_chart(curr_state_name, 'operation', curr_state_body);
    add_edge_to_flow_chart(prev_state, curr_state_name);
    curr_state_name = generate_chart(code, in_condition_block, args_to_decrement, curr_state_name);
    prev_state = curr_state_name;
    curr_state_body = '';
    in_true_path = was_true;
    return {curr_state_name, curr_state_body, prev_state};
}

function attach_curr_state_body(curr_state_body, curr_state_name, prev_state) {
    if (curr_state_body !== '') {
        curr_state_name = 'op' + op_count;
        op_count++;
        add_state_to_flow_chart(curr_state_name, 'operation', curr_state_body);
        add_edge_to_flow_chart(prev_state, curr_state_name);
        prev_state = curr_state_name;
    }
    return {curr_state_name, prev_state};
}

function in_block_and_last_statement(in_condition_block, i, block_exp) {
    return in_condition_block && i === block_exp.body.length - 1;
}

function compBlockStatement(block_exp, in_condition_block, args_to_decrement, prev_state){
    let curr_state_name='';    let curr_state_body = '';    let was_true = in_true_path;
    for(let i=0; i<block_exp.body.length; i++){
        let code = block_exp.body[i];
        if(not_condition_expression(code.type)){
            curr_state_body += generate_chart(code, in_condition_block, args_to_decrement, prev_state);        }
        else if(code.type === 'IfStatement'){ //condition block. Add new state to the chart
            const __ret = attach_curr_state_body(curr_state_body, curr_state_name, prev_state);
            curr_state_name = __ret.curr_state_name;            prev_state = __ret.prev_state;
            let last_state = generate_chart(code, in_condition_block, args_to_decrement, prev_state);
            curr_state_name = '';            prev_state = last_state;            in_true_path = was_true;            curr_state_body = '';
            if(in_block_and_last_statement(in_condition_block, i, block_exp))
                return last_state;
        }else{ //for or while
            const __ret = generate_loop_graph(curr_state_name, curr_state_body, prev_state, code, in_condition_block, args_to_decrement, was_true);
            curr_state_name = __ret.curr_state_name;            curr_state_body = __ret.curr_state_body;            prev_state = __ret.prev_state;        }
    }
    curr_state_name = flush_current_body(curr_state_body, curr_state_name, prev_state);
    return return_state_name_if_in_cond_block(in_condition_block, curr_state_name);
}

function return_state_name_if_in_cond_block(in_condition_block, curr_state_name){
    if(in_condition_block)
        return curr_state_name;
}

function compForExp(for_exp, in_condition_block, args_to_decrement, prev_state){
    let inner_statement = input_code.split('\n')[for_exp.loc.start.line-1]; // "let i=0; i < c+x; i = i+1"
    inner_statement = inner_statement.substring(for_exp.init.loc.start.column, for_exp.update.loc.end.column);
    let null_state = 'op' + op_count;
    op_count++;
    args_to_decrement = [];
    add_state_to_flow_chart(null_state, 'operation', 'NULL'); // add the NULL state
    add_edge_to_flow_chart(prev_state, null_state); //a = x +1 -> NULL
    let cond_state = 'cond' + cond_count;
    cond_count++;
    add_state_to_flow_chart(cond_state, 'condition', inner_statement);
    add_edge_to_flow_chart(null_state, cond_state);
    let body_state = generate_chart(for_exp.body, true, args_to_decrement, cond_state + '(yes)');
    add_edge_to_flow_chart(body_state, null_state);
    clear_inner_block_args();
    return cond_state + '(no)';
}

function compReturnExp(return_exp){
    let state_body = generate_code_string(return_exp.argument.loc);
    return 'return ' + state_body;
}

function compVarDeclaratorExp(var_dec, in_condition_block, args_to_decrement){

    let result = '';
    if(var_dec.init) {
        get_updated_arg_value(var_dec.id.name, var_dec.init);
        result += var_dec.id.name + ' = ' + generate_code_string(var_dec.init.loc); //comp_binary_expression(var_dec.init).join(' ');
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

function compAssignmentExp(assignment_exp, in_condition_block, args_to_decrement){

    let arg_name = assignment_exp.left.name;
    let new_val = get_updated_arg_value(arg_name, assignment_exp.right);
    let state_body = comp_binary_expression(assignment_exp.right);
    state_body = remove_zeros_and_brackets_from_array(state_body).join(' ');

    if(arg_name in local_arg_dict){
        if(in_condition_block){
            local_arg_indices[arg_name] += 1;
            args_to_decrement.push(arg_name);
        }
        let index = local_arg_indices[arg_name];
        local_arg_dict[arg_name][index].value = new_val;
    }
    return arg_name + ' = ' + state_body + '\n';
}

function add_state_to_flow_chart(state_name, state_type, state_body){
    if(in_true_path)
        flow_code = state_name + '=>' + state_type + ': (' + state_count + ')\n' + state_body + '|truePath\n' + flow_code;
    else
        flow_code = state_name + '=>' + state_type + ': (' + state_count + ')\n' + state_body + '\n' + flow_code;

    state_count++;
}


function add_merge_to_flow_chart(){
    if(in_true_path)
        flow_code = 'e' + merge_count + '=>end: ------|truePath\n' + flow_code;
    else
        flow_code = 'e' + merge_count + '=>end: ------\n' + flow_code;
}

function compVarDeclarationExp(var_dec_exp, in_condition_block, args_to_decrement){
    let dec_body = '';

    for(let i = 0; i < var_dec_exp.declarations.length; i++) {
        let v_code = var_dec_exp.declarations[i];

        dec_body += compVarDeclaratorExp(v_code, in_condition_block, args_to_decrement) + '\n';
    }
    return dec_body;
}

function compExpStatement(exp_statement, in_condition_block, args_to_decrement, prev_state){
    return generate_chart(exp_statement.expression, in_condition_block, args_to_decrement, prev_state);
}

function compUpdateExpression(update_exp){
    let name = update_exp.argument.name;
    let op = update_exp.operator;
    if(name in input_args){
        if(op === '++')
            input_args[name].value += 1;
        else
            input_args[name].value -= 1;
    }
    if(name in global_args){
        if(op === '++')
            global_args[name][0] = ['' + (parseInt(global_args[name][0]) + 1)];
        else
            global_args[name][0] = ['' + (parseInt(global_args[name][0]) - 1)];
    }
    return name + op + '\n';
}

function clear_inner_block_args(args_to_decrement){
    if(args_to_decrement)
        for (let i = 0; i < args_to_decrement.length; i++) {
            let arg_name = args_to_decrement[i];
            local_arg_dict[arg_name].splice(local_arg_indices[arg_name], 1);
            local_arg_indices[arg_name]--;
        }
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

function remove_zeroes(equation, new_equation, i) {
    if (equation.length === 1) { //equation: [ '0' ]
        new_equation = new_equation.concat(equation[i]);
    } else if (i === 0) { //Equation begins with a 0
        i++;
    }
    else if (after_plus_or_minus_and_is_last(equation, i)) {
        new_equation.length = new_equation.length - 1; //remove last item ?

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
        return  input_args[name].value[idx];
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
};

function extract_identifier(expression){
    return [expression.name];
}

function extract_literal(expression){
    return [expression.raw];
}

function extract_binary_exp(expression){
    let left,right;

    left = funcParser.extract_assignment(expression.left);
    right = funcParser.extract_assignment(expression.right);
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

/*function make_space(n){
    let space = '';
    for (let i = 0; i < n; i++) {
        space += ' ';
    }
    return space;
} */

export{create_flow_chart, add_edge_to_flow_chart, add_merge_edge, parse_condition, add_state_to_flow_chart,
    comp_binary_expression, compVarDeclaratorExp, sub_equation, check_member_expression,
    generate_code_string, compBlockStatement, concat_array_member_if_not_local,
    clear_inner_block_args, create_flowgraph_string, compIfExp, compElseIfExp, sub_exp_to_array, add_merge_to_flow_chart
    , compExpStatement, compWhileExp, get_flow_code, clear_memory, compAssignmentExp, compReturnExp,
    generate_chart, evaluate_expression};