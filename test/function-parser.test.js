import assert from 'assert';
import * as funcParser from '../src/js/function-parser';
import * as esprima from 'esprima';
import {parseCode} from "../src/js/code-analyzer";

it('1 - Extracts function paramaters correctly', ()=> {
    assert.equal( JSON.stringify(funcParser.extract_arg_names('let a; let b,c; function foo(x,y, z){})')),
        JSON.stringify(['x','y','z'])
    );
});

it('2 - extract easy input values correctly', () => {
    assert.equal( JSON.stringify(funcParser.extract_arg_values('[2, 4, 5]')),
                  JSON.stringify(["[2,4,5]"])
    );
});

it('3 - extract harder input values correctly', () => {
    assert.equal( JSON.stringify(funcParser.extract_arg_values('[2, \'4\', [5]]')),
        JSON.stringify(["[2,'4',[5]]"])
    );
});

it('4 - extract even harder input values correctly', () => {
    assert.equal( JSON.stringify(funcParser.extract_arg_values('[2, \'4\', [5]], true, \'true\', 3.145924, 982, \'982\', false')),
        JSON.stringify(["[2,'4',[5]]","true","'true'","3.145924","982","'982'","false"])
    );
});

it('5 - extract global arguments', () => {
    let input_func = "let g1 = 5;\n" +
                     "let g2,g3;\n" +
                     "function foo(x, y, z){}\n" +
                     "g2 = 1;";
    let code_table = parseCode(input_func);
    assert.equal( JSON.stringify(funcParser.extract_global_arguments(code_table)),
        JSON.stringify({"g1" : "5",
                        "g2" : "1",
                        "g3" : "null"})
    );
});

it('6 - extract local arguments', () => {
    let input_func = "let g1 = 5\n" +
        "let g2,g3\n" +
        "function foo(x, y, z){\n" +
        "let a;\n" +
        "let b = a + x\n" +
        "if(a<b){a++}}";
    let code_table = parseCode(input_func);
    assert.equal( JSON.stringify(funcParser.create_local_arg_dict(code_table)),
        JSON.stringify({"a" : "null",
            "b" : "a + x"})
    );
});