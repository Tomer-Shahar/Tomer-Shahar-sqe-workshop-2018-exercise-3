import * as esprima from 'esprima';
import * as parser from './function-parser'

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
let args_to_decrement = new Set();

function perform_substitution(user_input_args, global_arguments, local_args, input_func){
    input_code = input_func;
    input_args = user_input_args;
    global_args = global_arguments;
    local_arg_dict = local_args;
    let parsed_code = esprima.parse(input_func, {loc: true});
    for (const [key, value] of Object.entries(local_arg_dict)) {
        local_arg_indices[key] = 0;
    }
    //let function_table = parser.get_function_declaration(parsed_code)
    //let sub_code = get_substituted_code(function_table);
    let sub_code = get_substituted_code(parsed_code);
    return sub_code;
}

function make_space(n){
    let space = "";
    for (let i = 0; i < n; i++) {
        space += " "
    }
    return space;
}

function get_substituted_code(parsed_code, in_condition_block=false) {

    let comp_function = expression_to_function[parsed_code.type];
    return "" + (comp_function(parsed_code, in_condition_block));
}

//function for computing program expression (the main object)
function compProgram(program, in_condition_block=false){

    let result = "";
    for(let i = 0; i < program.body.length; i++) {
        let exp = program.body[i];
        result = result + get_substituted_code(exp, in_condition_block);
    }
    return result;
}

function substitute_expression(expression) {
    // Receives a condition such as b < z and translated it into x + y + 1 < z (or w/e)
    //Works for if and while
    expression = esprima.parse(expression).body[0].expression;
    expression = parser.extract_assignment(expression); //An array [b, <, z]
    let result = "";

    for (let i = 0; i < expression.length; i++){

        if(expression[i] in global_args){
            result += global_args[expression[i]].value.join(' ');
        }
        else if(expression[i] in local_arg_dict){
            let index = local_arg_indices[expression[i]];
            let arg_value = substitute_expression(local_arg_dict[expression[i]][index].value.join(' '));
            result += arg_value;
        }
        else{
            if((i > 0 && expression[i-1] === '(') || (expression[i] === ')'))
                result += expression[i]; //No space after '(' and no space before ')'
            else
                result += ' ' + expression[i]
        }
    }

    return result;
}

function compIfExp(if_exp, in_condition_block=false){

    let condition = substitute_expression(generate_code_string(if_exp.test.loc));
    let result = make_space(if_exp.loc.start.column) + "if(" + condition + ") {\n";
    result = result + get_substituted_code(if_exp.consequent, true);

    if (if_exp.alternate == null) //No else or else-if (code just continues)
        return result;
    if (if_exp.alternate.type==='IfStatement') // else_if
        return result + compElseIfExp(if_exp.alternate);
    else //else statement.
        return result + "} else{\n" + get_substituted_code(if_exp.alternate, true);
}

function compElseIfExp(else_if_exp, in_condition_block=false){

    let condition = substitute_expression(generate_code_string(else_if_exp.test.loc));
    let result = make_space(else_if_exp.loc.start.column-7) + "} else if(" + condition + ") {\n";
    result = result + get_substituted_code(else_if_exp.consequent, true);

    if (else_if_exp.alternate == null)
        return result;
    if (else_if_exp.alternate.type==='IfStatement')
        return result + compElseIfExp(else_if_exp.alternate);
    else
        return result + make_space(else_if_exp.loc.start.column-7) + "} else {\n" +
            get_substituted_code(else_if_exp.alternate, true) + make_space(else_if_exp.loc.start.column-7) + "}\n";
}

function compReturnExp(return_exp, in_condition_block=false){
    return make_space(return_exp.loc.start.column) + "return " + substitute_expression(generate_code_string(return_exp.argument.loc)) + ";\n";
}

function compForExp(for_exp, in_condition_block=false){
    let inner_statement = input_code.split('\n')[for_exp.loc.start.line-1];
    inner_statement = inner_statement.substring(for_exp.init.loc.start.column, for_exp.update.loc.end.column);

    let result = make_space(for_exp.loc.start.column) + "for(" + inner_statement + "){\n";
    result = result + get_substituted_code(for_exp.body);
    return result;
}

function compWhileExp(while_exp, in_condition_block=false){
    let result = make_space(while_exp.loc.start.column) + "while(" + generate_code_string(while_exp.test.loc) + "){\n";

    return result + get_substituted_code(while_exp.body);
}

function compAssignmentExp(assignment_exp, in_condition_block=false){
    if(in_condition_block){
        local_arg_indices[assignment_exp.name] += 1;
        args_to_decrement.add(assignment_exp.name);
    }
    return "";
}

function compVarDeclarationExp(var_dec_exp, in_condition_block=false){
    if(in_condition_block){
        local_arg_indices[var_dec_exp.name] += 1;
        args_to_decrement.add(var_dec_exp.name);
    }
    return "";
}

function compBlockStatement(block_exp, in_condition_block=false){

    let result = "";

    for(let i=0; i<block_exp.body.length; i++){
        let code = block_exp.body[i];

        result = result + get_substituted_code(code, in_condition_block);
    }

    return result;
}

function create_input_arg_string() {
    let result = [];
    for (const [key, value] of Object.entries(input_args)) {
        result.push(key);
    }
    return result.join(", ");
}

function compFuncDec(func_dec_exp){

    let input_string = create_input_arg_string();
    let func_dec_string = "function " + func_dec_exp.id.name + "(" + input_string + "){\n";
    return func_dec_string + get_substituted_code(func_dec_exp.body) + "}";
}

function compExpStatement(exp_statement, in_condition_block=false){
    return get_substituted_code(exp_statement.expression, in_condition_block);
}

function generate_code_string(location){
    let rows = input_code.split('\n');
    return rows[location.start.line-1].substring(location.start.column, location.end.column);
}

export {get_substituted_code, perform_substitution};
