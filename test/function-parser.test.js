import assert from 'assert';
import * as funcParser from '../src/js/function-parser';

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

it('5 - parses empty function correctly', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'function foo(){}', '')),
        JSON.stringify(
            "<div>function foo(){</div>" +
            "<div>}</div>"
        ))

});

it('6 - parses simple function correctly', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'function foo(x){\n' +
        '    let a = x + 2;\n' +
        '    return a;\n' +
        '}',
        '1')),
        JSON.stringify(
            "<div>function foo(x){</div>" +
            "<div>    return x + 2;</div>" +
            "<div>}</div>"
        ))

});

it('7 - parses function with harder substitution correctly', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'function foo(x, y){\n' +
        '    let a = x + 2;\n' +
        '    let b = y + 3;\n' +
        '    return a + b;\n' +
        '}',
        '1, 3')),
        JSON.stringify(
            "<div>function foo(x, y){</div>" +
            "<div>    return x + 2 + y + 3;</div>" +
            "<div>}</div>"
        ))

});

it('8 - parses function with while loop correctly', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'function foo(x, y){\n' +
        '    let a = x + 2;\n' +
        '    while(a + 3 < y){\n' +
        '        y = y - 1   \n' +
        '    } \n' +
        '    return a + b;\n' +
        '}',
        '1, 3')),
        JSON.stringify(
            "<div>function foo(x, y){</div>" +
            "<div>    while (x + 2 + 3 < y){</div>" +
            "<div>        y = y - 1</div>" +
            "<div>    }</div>" +
            "<div>    return x + 2 + b;</div>" +
            "<div>}</div>"
        ))

});

it('9 - parses function with if / else correctly', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'function foo(x, y, z){\n' +
        '    let a = x + 1;\n' +
        '    let b = a + y;\n' +
        '    let c = 0;\n' +
        '    \n' +
        '    if (b < z) {\n' +
        '        c = c + 5;\n' +
        '        return x + y + z + c;\n' +
        '    } else {\n' +
        '        c = c + z + 5;\n' +
        '        return x + y + z + c;\n' +
        '    }\n' +
        '}',
        '1, 2, 3')),
        JSON.stringify(
            "<div>function foo(x, y, z){</div>" +
            "<div>    <span class=false>if (x + 1 + y < z) {</span></div>" +
            "<div>        return x + y + z + 5;</div>" +
            "<div>    } else { </div>" +
            "<div>        return x + y + z + z + 5;</div>" +
            "<div>    }</div>" +
            "<div>}</div>"
        ))
});

it('10 - parses function with empty input field correctly', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'function foo(x, y, z){\n' +
        '    let a = x + 1;\n' +
        '    let b = a + y;\n' +
        '    let c = 0;\n' +
        '    \n' +
        '    if (b < z) {\n' +
        '        c = c + 5;\n' +
        '        return x + y + z + c;\n' +
        '    } else {\n' +
        '        c = c + z + 5;\n' +
        '        return x + y + z + c;\n' +
        '    }\n' +
        '}',
        '')),
        JSON.stringify(
            "<div>function foo(x, y, z){</div>" +
            "<div>    <span class=false>if (x + 1 + y < z) {</span></div>" +
            "<div>        return x + y + z + 5;</div>" +
            "<div>    } else { </div>" +
            "<div>        return x + y + z + z + 5;</div>" +
            "<div>    }</div>" +
            "<div>}</div>"
        ))
});

it('11 - parses function with global variables', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'let g1 = [3,10];\n' +
        'let g2 = 5;\n' +
        'function foo(x, y, z){\n' +
        '    let a = x + 1;\n' +
        '    let b = a + y;\n' +
        '    let c = 0;\n' +
        '    \n' +
        '    if (b < z) {\n' +
        '        c = c + 5;\n' +
        '        return x + y + z + c;\n' +
        '    } else {\n' +
        '        c = c + z + 5;\n' +
        '        return x + y + z + c;\n' +
        '    }\n' +
        '}\n',
        'let g3 = g1[1] - 5;\n' +
        'let g4 = [5];',
        '1, 2, 3')),
        JSON.stringify(
            '<div>function foo(x, y, z){</div>' +
            '<div>    <span class=false>if (x + 1 + y < z) {</span></div>' +
            '<div>        return x + y + z + 5;</div>' +
            '<div>    } else { </div>' +
            '<div>        return x + y + z + z + 5;</div>' +
            '<div>    }</div>' +
            '<div>}</div>'
        ))
});

it('12 - parses difficult function with global variables', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'let g1 = [3,10];\n' +
        'let g2 = 5;\n' +
        'let g3 = g1[1] - 5;\n' +
        'let g4 = [5];\n' +
        'function foo(x, y, z){\n' +
        '    let a = x + 1 + g1[1];\n' +
        '    let b = 3 + y + g3;\n' +
        '    let c = g3;\n' +
        '    \n' +
        '    if (b + y + g1[0] + g2 + g3 < z) {\n' +
        '        c = c + 5;\n' +
        '        return x + y + z + c;\n' +
        '    } else if (b < z * (2 + g1[1])) {\n' +
        '        c = c + x + 5;\n' +
        '        x = y - z + g4\n' +
        '        return x + y + z + c;\n' +
        '    } else {\n' +
        '        c = c + z + 5;\n' +
        '        g2 = c + g1[0];\n' +
        '        return x + y + z + g3;\n' +
        '    }\n' +
        '}\n',
        '0, 0, 1')),
        JSON.stringify(
            '<div>function foo(x, y, z){</div>' +
            '<div>    <span class=false>if (3 + y + g3 + y + g1[0] + g2 + g3 < z) {</span></div>' +
            '<div>        return x + y + z + g3 + 5;</div>' +
            '<div>    <span class=true>} else if (3 + y + g3 < z * (2 + g1[1])) {</span></div>' +
            '<div>        x = y - z + g4</div>' +
            '<div>        return x + y + z + g3 + x + 5;</div>' +
            '<div>    } else { </div>' +
            '<div>        g2 = g3 + z + 5 + g1[0]</div>' +
            '<div>        return x + y + z + g3;</div>' +
            '<div>    }</div>' +
            '<div>}</div>'
        ))
});