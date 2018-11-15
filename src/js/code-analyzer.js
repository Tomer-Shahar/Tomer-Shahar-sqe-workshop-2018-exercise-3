import * as esprima from 'esprima';

// This json object will map between the different expressions of the original code.
// Each expression in the original code has a different type and needs a specific parse method.

let expression_to_function = {
    'IfStatement' : compIfExp,
    'ReturnStatement' : compReturnExp,
    'Program' : compProgram,
    'ForStatement' : compForExp,
    'WhileStatement' : compWhileExp,
    'AssignmentExpression' : compAssignmentExp,
    'VariableDeclaration' : compVarDeclarationExp,
    'BlockStatement' : compBlockStatement,
    'FunctionDeclaration' : compFuncDec,
    'ExpressionStatement' : compExpStatement
};

let input_code;

const parseCode = (codeToParse, table) => {

    let parsed_code = esprima.parseScript(codeToParse,{loc: true});
    input_code = codeToParse;
    table = generate_parsed_table(parsed_code);
    return parsed_code;
    // return table;

};

function generate_parsed_table(parsed_code) {
    let table = [];

    let comp_function = expression_to_function[parsed_code.type];

    if(!comp_function){ // The type doesn't exist
        return table;
    }

    return table.concat(comp_function(parsed_code));
}

//function for computing program expression (the main object)
function compProgram(program){

    return generate_parsed_table(program.body[0]);
}

function compIfExp(if_exp){
    let statements = [];
    let record_to_add = {
        'Type': 'else if statement',
        'Line': if_exp.loc.start.line,
        'Condition': generate_code_string(if_exp.test, if_exp.test.loc)
    };
    statements.push(record_to_add);
    statements = statements.concat(generate_parsed_table(if_exp.consequent));
    if (if_exp.alternate == null){
        return statements;
    }
    if (if_exp.alternate.type==='IfStatement'){
        return statements.concat(compIfExp(if_exp.alternate));
    }
    else{
        return statements.concat(generate_parsed_table(if_exp.alternate));
    }
}

function compReturnExp(return_exp){
    let record_to_add = {
        'Line': return_exp.loc.start.line,
        'Type': 'return statement',
        'Value': generate_code_string(return_exp.argument, return_exp.argument.loc)
    };
    return [record_to_add];
}

function compForExp(for_exp){
    let statements = [];
    let record_to_add = {
        'Condition': generate_code_string(for_exp.test, for_exp.test.loc),
        'Type': 'ForStatement',
        'Line': for_exp.loc.start.line
    };
    statements.push(record_to_add);
    statements = statements.concat(generate_parsed_table(for_exp.init));
    statements = statements.concat(generate_parsed_table(for_exp.update));
    statements = statements.concat(generate_parsed_table(for_exp.body));
    return statements;
}

function compWhileExp(while_exp){
    let record_to_add = {
        'Type': 'while statement',
        'Condition': generate_code_string(while_exp.test, while_exp.test.loc),
        'Line': while_exp.loc.start.line
    };

    return [record_to_add].concat(generate_parsed_table(while_exp.body));
}

function compAssignmentExp(assignment_exp){

    let record_to_add = {
        'Line': assignment_exp.left.loc.start.line,
        'Type': 'assignment expression',
        'Name': assignment_exp.left.name,
        'Value': generate_code_string(assignment_exp.right.raw, assignment_exp.right.loc)
    };

    return [record_to_add];
}

function compVarDeclarationExp(var_dec_exp){
    let result = [];
    for(let i = 0; i < var_dec_exp.declarations.length; i++) {
        let v_code = var_dec_exp.declarations[i];

        result = result.concat(compVarDeclaratorExp(v_code));
    }
    return result;
}

function compVarDeclaratorExp(var_dec_exp){

    let declarator_statement = {
        'Type': 'variable declaration',
        'Line': var_dec_exp.loc.start.line,
        'Name': var_dec_exp.id.name,
        'Value': null
    };
    if (var_dec_exp.init != null){
        declarator_statement.Value=var_dec_exp.init.raw;
    }
    return [declarator_statement];
}

function compBlockStatement(block_exp){

    let statements = [];

    for(let i=0; i<block_exp.body.length; i++){
        let code = block_exp.body[i];

        statements = statements.concat(generate_parsed_table(code));
    }

    return statements;
}

function compParamExp(param) {
    return {
        'Name': param.name,
        'Type': 'variable declaration',
        'Line': param.loc.start.line
    };
}

function compFuncDec(func_dec_exp){

    let result = [];
    let declaration = {
        'Name': func_dec_exp.id.name,
        'Type': 'function declaration',
        'Line': func_dec_exp.id.loc.start.line
    };
    result.push(declaration);

    for(let i = 0; i < func_dec_exp.params.length; i++) {
        let param = func_dec_exp.params[i];
        result.push(compParamExp(param));
    }

    return result.concat(generate_parsed_table(func_dec_exp.body));
}

function compExpStatement(exp_statement){
    return generate_parsed_table(exp_statement.expression);
}

function generate_code_string(code, location){
    let rows = input_code.split('\n');
    return rows[location.start.line-1].substring(location.start.column, location.end.column);
}

export {parseCode};
