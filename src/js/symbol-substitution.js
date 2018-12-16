import * as esprima from 'esprima';

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
};

let input_code;
let input_args;
let global_args;
let local_arg_dict;
let local_arg_indices = {};
let args_to_decrement = [];
let code_table;

function perform_substitution(user_input_args, global_arguments, local_args, input_func, codeTable){
    input_code = input_func;
    input_args = user_input_args;
    //global_args = parse_global_args(global_arguments);
    global_args = global_arguments;
    local_arg_dict = local_args;
    code_table = codeTable;
    let parsed_code = esprima.parse(input_func, {loc: true});
    for (const [key, value] of Object.entries(local_arg_dict)) {
        local_arg_indices[key] = 0;
    }

    return get_substituted_code(parsed_code);
}

function compIfExp(if_exp, in_condition_block=false){

    //let condition = sub_exp_to_str(generate_code_string(if_exp.test.loc));
    let test_str = generate_code_string(if_exp.test.loc); // "b + y + 0 < (z) * (a)"
    let condition = sub_equation(test_str);
    let result = "if (" + condition + ") {";
    let space = make_space(if_exp.loc.start.column);
    result = "<div>" + space +  evaluate_expression(test_str, result) + "</div>";
    result = result + get_substituted_code(if_exp.consequent, true);
    clear_inner_block_args();

    if (if_exp.alternate == null) //No else or else-if (code just continues)
        return result + '<div>' + make_space(if_exp.loc.start.column) + '}</div>';
    if (if_exp.alternate.type==='IfStatement') // else_if
        return result + compElseIfExp(if_exp.alternate);
    else{ //else
        result += "<div>" + make_space(if_exp.loc.start.column) + "} else { </div>";
        result += get_substituted_code(if_exp.alternate, true);//Gets the <div> by itself
        result += "<div>" + make_space(if_exp.loc.start.column) + "}</div>";
        clear_inner_block_args();
        return result;
    }
}

function compElseIfExp(else_if_exp, in_condition_block=false){

    //let condition = sub_exp_to_str(generate_code_string(else_if_exp.test.loc));
    let condition = generate_code_string(else_if_exp.test.loc); // "b + y + 0 < (z) * (a)"
    condition = sub_equation(condition);
    let result = "} else if (" + condition + ") {";
    let space = make_space(else_if_exp.loc.start.column-7);
    result = "<div>" + space + evaluate_expression(condition, result) + "</div>";
    result = result + get_substituted_code(else_if_exp.consequent, true);
    clear_inner_block_args();

    if (else_if_exp.alternate == null)
        return result + '<div>' + make_space(else_if_exp.loc.start.column) + '}</div>';
    if (else_if_exp.alternate.type==='IfStatement') // else-if
        return result + compElseIfExp(else_if_exp.alternate);
    else { //else
        result += "<div>" + make_space(else_if_exp.loc.start.column - 7) + "} else { </div>";
        result += get_substituted_code(else_if_exp.alternate, true);//Gets the <div> by itself
        result += "<div>" + make_space(else_if_exp.loc.start.column - 7) + "}</div>";
        clear_inner_block_args();
        return result;
    }
}

function compForExp(for_exp, in_condition_block=false){
    let inner_statement = input_code.split('</br>')[for_exp.loc.start.line-1];
    inner_statement = inner_statement.substring(for_exp.init.loc.start.column, for_exp.update.loc.end.column);

    let result = "<div>" + make_space(for_exp.loc.start.column) + "for (" + inner_statement + "){</div>";
    result = result +
        get_substituted_code(for_exp.body, true) +
        "<div>" + make_space(for_exp.loc.start.column) + "}</div>";
    clear_inner_block_args();
    return result;
}

function compWhileExp(while_exp, in_condition_block=false){
    let condition = sub_equation(generate_code_string(while_exp.test.loc));
    let result = "<div>" + make_space(while_exp.loc.start.column) + "while (" + condition + "){</div>";
    let while_body = get_substituted_code(while_exp.body, true);
    result =
        result +
        while_body +
        "<div>" + make_space(while_exp.loc.start.column) + "}</div>";

    clear_inner_block_args();
    return result;
}

function get_substituted_code(parsed_code, in_condition_block=false) {

    let comp_function = expression_to_function[parsed_code.type];
    return "" + (comp_function(parsed_code, in_condition_block));
}

function clear_inner_block_args(){
    for (let i = 0; i < args_to_decrement.length; i++) {
        let arg_name = args_to_decrement[i];
        local_arg_dict[arg_name].splice(local_arg_indices[arg_name], 1);
        local_arg_indices[arg_name]--;
    }
    args_to_decrement = [];
}

function parse_condition(condition){
    //Receives an array and parses it to remove any variables and leaves only literal values.

    let result = [];
    let op_set = new Set(['+', '-', '*', '/', '(', ')', '<', '>',]);
    if(!condition.length)
        return [condition];
    for (let i = 0; i < condition.length; i++){
        if(condition[i] in global_args){
            let name = condition[i];
            let val = global_args[name];
            if(val.length > 1){ // binary expression [ 3, +, 5, *, 2]
                val = parse_condition(val);
            }
            else{ // [5] or [ [4] ] or [ "boop" ] or [ [2,4,5] ]
                val = val[0];
            }
            result = result.concat(val);
            continue;
        }
        else if(condition[i] in input_args){
            let val = input_args[condition[i]].value;
            result = result.concat(val);
            continue
        }
        else if(condition[i] in local_arg_dict){
            let index = local_arg_indices[condition[i]];
            let arg_value = local_arg_dict[condition[i]][index].value;
            arg_value = parse_condition(arg_value);
            result = result.concat(arg_value);
            continue;
        }
        else if (!op_set.has(condition[i])){ // Not an operator symbol
            let exp = esprima.parse(""+condition[i]).body[0].expression;
            if(exp.type === 'MemberExpression'){
                let name = exp.object.name;
                let idx = exp.property.value;
                let val = find_and_extract_array_val(name, idx); // 10
                result = result.concat(val);
                //result = result.concat(parse_condition(val));
                continue;
            }
        }
        result = result.concat(condition[i])
    }
    return result;
}

function evaluate_expression(condition, if_row){
    // Attaches the appropriate color if the condition is true or false.
    // "b + y + g[1] < (z) * (a[0])"

    condition = esprima.parse(condition).body[0].expression; //{type:binary expression ... }
    condition = comp_binary_expression(condition); // [b + y + 0 < (z) * (a)]
    condition = parse_condition(condition);
    condition = condition.join(' ');
    if(eval(condition)){
        if_row = "<span class=true>" + if_row + "</span>"
    }
    else{
        if_row = "<span class=false>" + if_row + "</span>"
    }

    return if_row
}

function sub_equation(equation) {
    //Receives an equation as a string and returns it after being properly parsed, as a string

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

function compVarDeclaratorExp(var_dec, in_condition_block=false){

    if(var_dec.init) {
        get_updated_arg_value(var_dec.id.name, var_dec.init);
    }

    if (in_condition_block) {
        local_arg_indices[var_dec.id.name] += 1;
        args_to_decrement.push(var_dec.id.name);
    }

    return "";
}

function compAssignmentExp(assignment_exp, in_condition_block=false){
    let arg_name = assignment_exp.left.name;
    let new_val = get_updated_arg_value(arg_name, assignment_exp.right);

    if(arg_name in local_arg_dict){
        if(in_condition_block){
            local_arg_indices[arg_name] += 1;
            args_to_decrement.push(arg_name);
        }
        let index = local_arg_indices[arg_name];
        local_arg_dict[arg_name][index].value = new_val;
        return "";
    }
    else{ //function or global argument. Return it!
        return "<div>" + make_space(assignment_exp.loc.start.column) +
            arg_name + " = " + sub_equation(new_val.join(' ')) + "</div>";
    }
}

function get_updated_arg_value(arg_name, init) {
    //Function that updates the value of the argument in the local/global dictionary to be only dependant on literal
    //values and/or function arguments (c : c+5 --> c : 5 or b : a + y --> b : x + 1 + y)
    init = comp_binary_expression(init);
    return sub_exp_to_array(init);
}

function compVarDeclarationExp(var_dec_exp, in_condition_block=false){
    let result = "";
    for(let i = 0; i < var_dec_exp.declarations.length; i++) {
        let v_code = var_dec_exp.declarations[i];

        result += compVarDeclaratorExp(v_code, in_condition_block);
    }
    return result;
}

function compBlockStatement(block_exp, in_condition_block=false){
    let result = "";

    for(let i=0; i<block_exp.body.length; i++){
        let code = block_exp.body[i];

        result = result + get_substituted_code(code, in_condition_block);
    }
    return result;
}

function remove_zeros_and_brackets_from_array(equation){
// input: [0 + x + ( 0 + 1) * ( y ) + 0 < ( 0 ) * ( 0 + x + 1 + 0)]
// output: [x + 1 * y < 0 * ( x + 1 )]

    let new_equation = [];
    let open_bracket_idx = 0, close_bracket_idx = 0;
    for (let i = 0; i < equation.length ; i++) {
        if(equation[i] === "0" || equation[i] === 0){
            if(equation.length === 1){
                new_equation = new_equation.concat(equation[i]);
            }
            else if(i === 0){
                i++;
            }
            //Look backward
            else if((equation[i-1] === "+" || equation[i-1] === "-") &&
                (i === equation.length-1 || (equation[i+1] !== "*" && equation[i+1] !== "/"))){
                new_equation.length = new_equation.length-1; //remove last item ?
            }
            else if(equation[i-1] === "(" && equation[i+1] !== "*" && equation[i+1] !== "/" && equation[i+1] !== ")"){
                i++;
            }
        }
        else if(equation[i] === '('){
            new_equation = new_equation.concat(equation[i]);
            open_bracket_idx = new_equation.length-1;
        }
        else if(equation[i] === ')'){
            close_bracket_idx = new_equation.length;
            if(close_bracket_idx - open_bracket_idx === 2){ //Only one parameter between the brackets. Bye-bye brackets
                new_equation.splice(open_bracket_idx, 1)
            }
            else{
                new_equation = new_equation.concat([equation[i]]);
            }
        }
        else{ //Its A-OK
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
        return local_arg_dict[name][local_idx][idx];
    }
}

function sub_exp_to_array(expression) {
// Receives an array such as ["a", "+", "y", "+", "g2"] and returns ["x", "+", "1", "+", "y", "+", "g2"]
    let result = [];
    if(!expression.length)
        return [expression];
    for (let i = 0; i < expression.length; i++){

        if(expression[i] in local_arg_dict){
            let index = local_arg_indices[expression[i]];
            let arg_value = local_arg_dict[expression[i]][index].value;
            arg_value = sub_exp_to_array(arg_value);
            result = result.concat(arg_value);
            continue;
        }
        result = result.concat(expression[i])
    }
    return remove_zeros_and_brackets_from_array(result);
}

function comp_binary_expression(expression){
    //recursively extract the values of a given expression. Returns an array

    switch(expression.type){
        case('VariableDeclaration'):
            return comp_binary_expression(expression.declarations[0]);
        case('Identifier'):
            return [expression.name];
        case('Literal'):
            return [expression.value];
        case('VariableDeclarator'):
            if(expression.init)
                return comp_binary_expression(expression.init);
            else
                return [null];
        case('BinaryExpression'):
            let left = comp_binary_expression(expression.left);
            let right = comp_binary_expression(expression.right);
            if(expression.operator === "*" || expression.operator === "/"){
                left = ["("].concat(left).concat(")");
                right = ["("].concat(right).concat(")");
                return left.concat([expression.operator]).concat(right);
            }
            else
                return left.concat([expression.operator]).concat(right);
        case('ArrayExpression'):
            let result = [];
            for (let i = 0; i < expression.elements.length; i++) {
                result.push(comp_binary_expression(expression.elements[i])[0])
            }
            return [result];
        case('MemberExpression'):
            return [expression.object.name + '[' + expression.property.value +']'];
    }
}

function create_input_arg_string() {
    let result = [];
    for (const [key, value] of Object.entries(input_args)) {
        result.push(key);
    }
    return result.join(", ");
}

function compReturnExp(return_exp, in_condition_block=false){
    return "<div>" + make_space(return_exp.loc.start.column) + "return " +
        sub_equation(generate_code_string(return_exp.argument.loc)) + ";</div>";
}

function compProgram(program, in_condition_block=false){
//function for computing program expression (the main object)

    let result = "";
    for(let i = 0; i < program.body.length; i++) {
        let exp = program.body[i];
        result = result + get_substituted_code(exp, in_condition_block);
    }
    return result;
}

function compFuncDec(func_dec_exp){

    let input_string = create_input_arg_string();
    let func_dec_string = "<div>function " + func_dec_exp.id.name + "(" + input_string + "){</div>";
    return func_dec_string +
        get_substituted_code(func_dec_exp.body) +
        "<div>}</div>";
}

function compExpStatement(exp_statement, in_condition_block=false){
    return get_substituted_code(exp_statement.expression, in_condition_block);
}

function generate_code_string(location){
    let rows = input_code.split('\n');
    return rows[location.start.line-1].substring(location.start.column, location.end.column);
}

export {get_substituted_code, perform_substitution};

function make_space(n){
    let space = "";
    for (let i = 0; i < n; i++) {
        space += " "
    }
    return space;
}