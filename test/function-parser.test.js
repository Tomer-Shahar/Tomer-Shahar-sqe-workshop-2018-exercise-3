import assert from 'assert';
import * as funcParser from '../src/js/function-parser';
import * as symbolSub from '../src/js/symbol-substitution';

it('1 - Extracts function paramaters correctly', ()=> {
    assert.equal( JSON.stringify(funcParser.extract_arg_names('let a; let b,c; function foo(x,y, z){})')),
        JSON.stringify(['x','y','z'])
    );
});

it('2 - extract easy input values correctly', () => {
    assert.equal( JSON.stringify(funcParser.extract_arg_values('[2, 4, 5]')),
        JSON.stringify(['[2,4,5]'])
    );
});

it('3 - extract harder input values correctly', () => {
    assert.equal( JSON.stringify(funcParser.extract_arg_values('[2, \'4\', [5]]')),
        JSON.stringify(['[2,\'4\',[5]]'])
    );
});

it('4 - extract even harder input values correctly', () => {
    assert.equal( JSON.stringify(funcParser.extract_arg_values('[2, \'4\', [5]], true, \'true\', 3.145924, 982, \'982\', false')),
        JSON.stringify(['[2,\'4\',[5]]','true','\'true\'','3.145924','982','\'982\'','false'])
    );
});

it('5 - parses empty function correctly', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'function foo(){}', '')),
    JSON.stringify(
        '<div>function foo(){</div>' +
            '<div>}</div>'
    ));

});

it('6 - parses simple function correctly', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'function foo(x){\n' +
        '    let a = x + 2;\n' +
        '    let b,c;\n' +
        '    return a;\n' +
        '}',
        '1')),
    JSON.stringify(
        '<div>function foo(x){</div>' +
            '<div>    return x + 2;</div>' +
            '<div>}</div>'
    ));

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
        '<div>function foo(x, y){</div>' +
            '<div>    return x + 2 + y + 3;</div>' +
            '<div>}</div>'
    ));

});

it('8 - parses function with while loop correctly', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'function foo(x, y){\n' +
        '    let a = x + 2;\n' +
        '    while(a + 3 < y){\n' +
        '        y = y - 1;   \n' +
        '    } \n' +
        '    return a + b;\n' +
        '}',
        '1, 3')),
    JSON.stringify(
        '<div>function foo(x, y){</div>' +
            '<div>    while (x + 2 + 3 < y){</div>' +
            '<div>        y = y - 1;</div>' +
            '<div>    }</div>' +
            '<div>    return x + 2 + b;</div>' +
            '<div>}</div>'
    ));

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
        '    }\n' + '}',
        '1, 2, 3')),
    JSON.stringify(
        '<div>function foo(x, y, z){</div>' +
        '<div>    <span class=false>if (x + 1 + y < z) {</span></div>' +
        '<div>        return x + y + z + 5;</div>' +
        '<div>    } else { </div>' +
        '<div>        return x + y + z + z + 5;</div>' +
        '<div>    }</div>' +
        '<div>}</div>'
    ));
});

it('10 - parses function with empty input field correctly', () => {
    let code = JSON.stringify(funcParser.analyzed_code(
        'function foo(x, y, z){\n' +        '    let a = x + 1;\n' +        '    let b = a + y;\n' +        '    let c = 0;\n' +        '    \n' +        '    if (b < z) {\n' +        '        c = c + 5;\n' +        '        return x + y + z + c;\n' +        '    } else {\n' +        '        c = c + z + 5;\n' +        '        return x + y + z + c;\n' +        '    }\n' +        '}',
        ''));
    funcParser.clear_memory();
    symbolSub.clear_memory();
    assert.equal(code,
        JSON.stringify(
            '<div>function foo(x, y, z){</div>' +
            '<div>    <span class=false>if (x + 1 + y < z) {</span></div>' +
            '<div>        return x + y + z + 5;</div>' +
            '<div>    } else { </div>' +
            '<div>        return x + y + z + z + 5;</div>' +
            '<div>    }</div>' +
            '<div>}</div>'
        ));
});

it('11 - parses function with global variables', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'let g1 = [3,10];\n' +
        'let g2 = 5;\n' +
        'function foo(x, y, z){\n' +
        '    let a = x + 1;\n' +        '    let b = a + y;\n' +        '    let c = 0;\n' +        '    \n' +        '    if (b < z) {\n' +        '        c = c + 5;\n' +        '        return x + y + z + c;\n' +        '    } else {\n' +        '        c = c + z + 5;\n' +        '        return x + y + z + c;\n' +        '    }\n' +        '}\n',
        '')),
    JSON.stringify(
        '<div>function foo(x, y, z){</div>' +
            '<div>    <span class=false>if (x + 1 + y < z) {</span></div>' +
            '<div>        return x + y + z + 5;</div>' +
            '<div>    } else { </div>' +
            '<div>        return x + y + z + z + 5;</div>' +
            '<div>    }</div>' +
            '<div>}</div>'
    ));
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
        '        x = y - z + g4;\n' +
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
            '<div>        x = y - z + g4;</div>' +
            '<div>        return x + y + z + g3 + x + 5;</div>' +
            '<div>    } else { </div>' +
            '<div>        g2 = g3 + z + 5 + g1[0];</div>' +
            '<div>        return x + y + z + g3;</div>' +
            '<div>    }</div>' +
            '<div>}</div>'
    ));
});

it('13 - parses function with for loop', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'function foo(x, y, z){\n' +
        '    let a = x[0] + 1;\n' +
        '    let b = a + y;\n' +
        '    let c = 0;\n' +
        '    \n' +
        '    if (b < z) {\n' +
        '        c = c + 5;\n' +
        '        return x + y + z + c;\n' +
        '    } else {\n' +
        '        for(let i=0; i < c+x; i = i+1){\n' +
        '            y = y + 1;\n' +
        '        }\n' +
        '        return x + y + z + c;\n' +
        '    }\n' +
        '}',
        '[10,2], 1, 5')),
    JSON.stringify(
        '<div>function foo(x, y, z){</div>' +
            '<div>    <span class=true>if (x[0] + 1 + y < z) {</span></div>' +
            '<div>        return x + y + z + 5;</div>' +
            '<div>    } else { </div>' +
            '<div>        for (i = 0; i < x; i = i + 1){</div>' +
            '<div>            y = y + 1;</div>' +
            '<div>        }</div>' +
            '<div>        return x + y + z;</div>' +
            '<div>    }</div>' +
            '<div>}</div>'
    ));
});

it('14 - parses function with if - else', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'function foo(x, y, z){\n' +
        '    let a = x + 1;\n' +
        '    \n' +
        '    if(a < 5){\n' +
        '        x = x + 1;\n' +
        '    } else if(y < z) {\n' +
        '        z = z * 2;\n' +
        '    } else if(y > x) {\n' +
        '        a = a + 5;\n' +
        '        return a;\n' +
        '    }\n' +
        '\n' +
        '    if(a < 5){\n' +
        '        x = x + 1;\n' +
        '    } else if(y < z) {\n' +
        '        z = z * 2;\n' +
        '    } \n' +
        '    return z;\n' +
        '}',
        '')),
    JSON.stringify(
        '<div>function foo(x, y, z){</div>' +
        '<div>    <span class=true>if (x + 1 < 5) {</span></div>' +
        '<div>        x = x + 1;</div>' +
        '<div>    <span class=false>} else if (y < z) {</span></div>' +
        '<div>        z = z * 2;</div>' +
        '<div>    <span class=false>} else if (y > x) {</span></div>' +
        '<div>        return x + 1 + 5;</div>' +
        '<div>    }</div>' +
        '<div>    <span class=true>if (x + 1 < 5) {</span></div>' +
        '<div>        x = x + 1;</div>' +
        '<div>    <span class=false>} else if (y < z) {</span></div>' +
        '<div>        z = z * 2;</div>' +
        '<div>    }</div>' +
        '<div>    return z;</div>' +
        '<div>}</div>'
    ));
});

it('15 - parses function with string and bool paramaters', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'function foo(x, y, z){\n' +
        '    if(x) {\n' +
        '        z++;\n' +
        '        return 10;\n' +
        '    } else if(y === "sqe") {\n' +
        '        return 20;\n' +
        '    }\n' +
        '    return 50;\n' +
        '}',
        'false, "sqe", 0'))
    ,
    JSON.stringify(
        '<div>function foo(x, y, z){</div>' +
        '<div>    <span class=false>if (x) {</span></div>' +
        '<div>        z++;</div>' +
        '<div>        return 10;</div>' +
        '<div>    <span class=true>} else if (y === "sqe") {</span></div>' +
        '<div>        return 20;</div>' +
        '<div>    }</div>' +
        '<div>    return 50;</div>' +
        '<div>}</div>'
    ));
});

it('16 - parses function with if no consequence and a var declarator in a block', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'function foo(x, y){\n' +
        '    if(x) {\n' +
        '        y++;\n' +
        '        return 10;\n' +
        '    }\n' +
        '    return 50;\n' +
        '}',
        ''))
    ,
    JSON.stringify(
        '<div>function foo(x, y){</div>' +
            '<div>    <span class=false>if (x) {</span></div>' +
            '<div>        y++;</div>' +
            '<div>        return 10;</div>' +
            '<div>    }</div>' +
            '<div>    return 50;</div>' +
            '<div>}</div>'
    ));
});

it('17 - parses function with if no consequence and a var declarator in a block', () => {
    assert.equal(JSON.stringify(funcParser.analyzed_code(
        'let g = 1;\n' +
        'g = 4;\n' +
        'g++;\n' +
        'g--;\n' +
        'let g2;\n' +
        'g2 = g + 3;\n' +
        'let g3 = [2, 3 ,4];\n' +
        'g2 = g2 * (g3[1] + 1);\n' +
        'function foo(x, y, z){\n' +
        '    let a = x + 1;\n' +
        '    let b = [2, 4, true] ;\n' +
        '    if(b[2]){\n' +
        '        a = b[0];\n' +
        '        x = b[0];\n' +
        '    }\n' +
        '    g--;\n' +
        '    g++;\n' +
        '    a = a + 1;\n' +
        '    a++;\n' +
        '    x--;\n' +
        '    \n' +
        '    if(a < 5){\n' +
        '        x = x + 1;\n' +
        '        let c;\n' +
        '        c = b[1];\n' +
        '        return c;\n' +
        '    }\n' +
        '}',
        '0, 0, [2, [1, [0]], true]'))
    ,
    JSON.stringify(
        '<div>function foo(x, y, z){</div>' +
        '<div>    <span class=true>if (true) {</span></div>' +
        '<div>        x = 2;</div>' +
        '<div>    }</div>' +
        '<div>    g--;</div>' +
        '<div>    g++;</div>' +
        '<div>    x--;</div>' +
        '<div>    <span class=true>if (x + 1 + 1 < 5) {</span></div>' +
        '<div>        x = x + 1;</div>' +
        '<div>        return 4;</div>' +
        '<div>    }</div>' +
        '<div>}</div>'
    ));
});