import assert from 'assert';
import * as gc from '../src/js/graph_creator';
import * as esprima from 'esprima';

it('1 - adding a new edge', ()=> {
    gc.clear_memory();
    gc.add_edge_to_flow_chart('op1', 'cond1');
    let flow_code = gc.get_flow_code();
    assert.equal(
        flow_code,
        'op1->cond1\n'
    );
});

it('2 - adding a new merge edge', ()=> {
    gc.clear_memory();
    gc.add_merge_edge('op1');
    let flow_code = gc.get_flow_code();
    assert.equal(
        flow_code,
        'op1->e1\n'
    );
});

it('3 - evaluate true expression', ()=> {
    gc.clear_memory();
    gc.create_flow_chart('function foo(){}', '');
    assert.equal(
        gc.evaluate_expression('6 * 3 > 5'),
        true
    );
});

it('4 - evaluate false expression', ()=> {
    gc.clear_memory();
    gc.create_flow_chart('function foo(){}', '');
    assert.equal(
        gc.evaluate_expression('6 - 3 > 5'),
        false
    );
});

it('5 - parses binary expression good', ()=> {
    gc.clear_memory();
    let bin_exp = gc.comp_binary_expression(esprima.parse('x * 3 + 4 < 9').body[0].expression);
    assert.equal(
        JSON.stringify(bin_exp),
        JSON.stringify(['(', 'x', ')', '*', '(', '3', ')', '+', '4', '<', '9' ])
    );
});

it('6 - parses harder binary expression good', ()=> {
    gc.clear_memory();
    let bin_exp = gc.comp_binary_expression(esprima.parse('x * 3 + a * b < 9 / c - 6 ').body[0].expression);
    assert.equal(
        JSON.stringify(bin_exp),
        JSON.stringify(['(', 'x', ')', '*', '(', '3', ')', '+', '(', 'a', ')', '*', '(', 'b', ')', '<',
            '(', '9', ')', '/', '(', 'c', ')', '-', '6' ])
    );
});

it('7 - creates simple flow chart', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart('function foo(x){let a = 5; return a + x;}', '1');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op1=>operation: (1)\na = 5\nreturn a + x|truePath\n'
        )
    );
});

it('8 - create a harder flow chart', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(        'let g1 = [1];' +
        'let g2;' +
        'g2 = g1[0];' +
        'g2 = [1, 2, 3];' +
        'let g3 = g2[g1[0]];' +
        'let g4 = 9 + 2;' +
        'let g5 = 3;' +
        'g4 = 3 + g1[0] + g4 + g5;' +        'function foo(x, y){\n' +        '    let a, b = 4;\n' +        '    let c = 3;\n' +        '    a = b + c\n' +        '    if(a < x){\n' +        '        a = 10\n' +        '    }\n' +        '    return a;\n' +        '}', '2, [1, [2, [3], 2], false]');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(            'op3=>operation: (4)\n' +
            'return a|truePath\n' +            'op2=>operation: (3)\n' +
            'a = 10\n' +            '\n' +            'e1=>end: ------|truePath\n' +            'cond1=>condition: (2)\n' +            'a < x|truePath\n' +            'op1=>operation: (1)\n' +            'a = null\n' +            'b = 4\n' +            'c = 3\n' +            'a = b + c\n' +            '|truePath\n' +            'op1->cond1\n' +            'cond1(yes)->op2\n' +            'op2->e1\n' +            'cond1(no)->e1\n' +            'e1->op3\n'
        )
    );
});

it('9 - gitlab example flow chart', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'function foo(x, y, z){\n' +        '    let a = x + 1;\n' +        '    let b = a + y;\n' +        '    let c = 0;\n' +        '    \n' +        '    if (b < z) {\n' +        '        c = c + 5;\n' +        '    } else if (b < z * 2) {\n' +        '        c = c + x + 5;\n' +        '    } else {\n' +        '        c = c + z + 5;\n' +        '    }\n' +        '    \n' +        '    b = a + x;\n' +        '    return c;\n' +        '}\n', '1,2,3');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op5=>operation: (7)\n' +
            'b = a + x\n' +
            'return c|truePath\n' +
            'op4=>operation: (6)\n' +            'c = c + z + 5\n' +            '\n' +            'op3=>operation: (5)\n' +            'c = c + x + 5\n' +            '|truePath\n' +            'cond2=>condition: (4)\n' +
            'b < z * 2|truePath\n' +            'op2=>operation: (3)\n' +            'c = c + 5\n' +            '\n' +            'e1=>end: ------|truePath\n' +            'cond1=>condition: (2)\n' +            'b < z|truePath\n' +            'op1=>operation: (1)\n' +            'a = x + 1\n' +            'b = a + y\n' +            'c = 0\n' +            '|truePath\n' +            'op1->cond1\n' +            'cond1(yes)->op2\n' +            'op2->e1\n' +            'cond1(no)->cond2\n' +            'cond2(yes)->op3\n' +            'op3->e1\n' +            'cond2(no)->op4\n' +            'op4->e1\n' +            'e1->op5\n'        )
    );
});

it('10 - chart with while loop', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'function foo(x, y, z){\n' +
        '   let a = x + 1;\n' +
        '   let b = a + y;\n' +
        '   let c = 0;\n' +
        '   \n' +
        '   while (a < z) {\n' +
        '       c = a + b;\n' +
        '       z = c * 2;\n' +
        '       a++;\n' +
        '   }\n' +        '   \n' +        '   return z;\n' +
        '}\n', '10,2,3');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op4=>operation: (5)\n' +            'return z|truePath\n' +            'op3=>operation: (4)\n' +            'c = a + b\n' +            'z = c * 2\n' +            'a++\n' +            '\n' +            'cond1=>condition: (3)\n' +            'a < z|truePath\n' +            'op2=>operation: (2)\n' +            'NULL|truePath\n' +            'op1=>operation: (1)\n' +            'a = x + 1\n' +            'b = a + y\n' +            'c = 0\n' +            '|truePath\n' +            'op1->op2\n' +            'op2->cond1\n' +            'cond1(yes)->op3\n' +            'op3->op2\n' +            'cond1(no)->op4\n'        )
    );
});

it('11 - chart with loop inside if', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'function foo(x, y, z){\n' +
        '    let a = x + 1;\n' +
        '    let b = a + y;\n' +
        '    let c = 0;\n' +
        '    \n' +
        '    if (b < z) {\n' +
        '        c = c + 5;\n' +
        '        for(let i=0; i < c; i++){\n' +
        '            a = a + 1;\n' +        '       }\n' +        '    } else if (b < z * 2) {\n' +        '        c = c + x + 5;\n' +        '    }\n' +        ' \n' +        '    return c;\n' +        '}', '1,2,10');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op6=>operation: (9)\n' +            'return c|truePath\n' +            'op5=>operation: (8)\n' +            'c = c + x + 5\n' +            '\n' +            'cond3=>condition: (7)\n' +            'b < z * 2\n' +            'op4=>operation: (6)\n' +            'a = a + 1\n' +            '|truePath\n' +            'cond2=>condition: (5)\n' +            'let i=0; i < c; i++|truePath\n' +            'op3=>operation: (4)\n' +            'NULL|truePath\n' +            'op2=>operation: (3)\n' +            'c = c + 5\n' +            '|truePath\n' +            'e1=>end: ------|truePath\n' +            'cond1=>condition: (2)\n' +            'b < z|truePath\n' +            'op1=>operation: (1)\n' +            'a = x + 1\n' +            'b = a + y\n' +            'c = 0\n' +            '|truePath\n' +            'op1->cond1\n' +            'cond1(yes)->op2\n' +            'op2->op3\n' +            'op3->cond2\n' +            'cond2(yes)->op4\n' +            'op4->op3\n' +            'cond2(no)->e1\n' +            'cond1(no)->cond3\n' +            'cond3(yes)->op5\n' +            'op5->e1\n' +            'cond3(no)->e1\n' +            'e1->op6\n'
        )
    );
});

it('12.1 - chart with if inside if, outer and inner if are both true', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'function foo(x, y, z){\n' +
        '    let a = x;\n' +        '    let b = a + y;\n' +        '    let c = 0;\n' +        '    \n' +        '    if (b < z) {\n' +
        '        c = c + 5;\n' +
        '        if(a < b){\n' +        '               c = x;\n' +        '               a++;\n' +        '        }\n' +        '    } else if (b < z * 2) {\n' +        '        c = c + x + 5;\n' +        '    } else {\n' +         '        c = c + z + 5;\n' +        '    }\n' +        '    \n' +        '    return c;\n' +        '}'
        , '1, 3, 10');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op6=>operation: (9)\n' +            'return c|truePath\n' +            'op5=>operation: (8)\n' +            'c = c + z + 5\n' +            '\n' +            'op4=>operation: (7)\n' +            'c = c + x + 5\n' +            '\n' +            'cond3=>condition: (6)\n' +            'b < z * 2\n' +            'op3=>operation: (5)\n' +            'c = x\n' +            'a++\n' +            '|truePath\n' +            'e1=>end: ------|truePath\n' +            'cond2=>condition: (4)\n' +            'a < b|truePath\n' +            'op2=>operation: (3)\n' +
            'c = c + 5\n' +            '|truePath\n' +            'e1=>end: ------|truePath\n' +            'cond1=>condition: (2)\n' +            'b < z|truePath\n' +            'op1=>operation: (1)\n' +
            'a = x\n' +            'b = a + y\n' +            'c = 0\n' +            '|truePath\n' +            'op1->cond1\n' +
            'cond1(yes)->op2\n' +            'op2->cond2\n' +            'cond2(yes)->op3\n' +            'op3->e1\n' +
            'cond2(no)->e1\n' +            'e1->e1\n' +            'cond1(no)->cond3\n' +            'cond3(yes)->op4\n' +            'op4->e1\n' +            'cond3(no)->op5\n' +            'op5->e1\n' +            'e1->op6\n'
        ));
});

it('12.2 - chart with if inside if, outer if is true and inner is false', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'function foo(x, y, z){\n' +
        '    let a = x;\n' +
        '    let b = a + y;\n' +
        '    let c = 0;\n' +
        '    \n' +        '    if (b < z) {\n' +        '        c = c + 5;\n' +        '        if(a < b){\n' +        '               c = x;\n' +        '               a++;\n' +        '        }\n' +        '    } else if (b < z * 2) {\n' +        '        c = c + x + 5;\n' +
        '    } else {\n' +        '        c = c + z + 5;\n' +        '    }\n' +        '    \n' +        '    return c;\n' +        '}'
        , '1, -3, 10');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op6=>operation: (9)\n' +
            'return c|truePath\n' +
            'op5=>operation: (8)\n' +
            'c = c + z + 5\n' +            '\n' +            'op4=>operation: (7)\n' +            'c = c + x + 5\n' +            '\n' +            'cond3=>condition: (6)\n' +            'b < z * 2\n' +            'op3=>operation: (5)\n' +            'c = x\n' +            'a++\n' +            '\n' +
            'e1=>end: ------|truePath\n' +            'cond2=>condition: (4)\n' +            'a < b|truePath\n' +            'op2=>operation: (3)\n' +            'c = c + 5\n' +            '|truePath\n' +            'e1=>end: ------|truePath\n' +            'cond1=>condition: (2)\n' +            'b < z|truePath\n' +            'op1=>operation: (1)\n' +            'a = x\n' +            'b = a + y\n' +            'c = 0\n' +            '|truePath\n' +            'op1->cond1\n' +            'cond1(yes)->op2\n' +            'op2->cond2\n' +            'cond2(yes)->op3\n' +            'op3->e1\n' +            'cond2(no)->e1\n' +            'e1->e1\n' +            'cond1(no)->cond3\n' +            'cond3(yes)->op4\n' +            'op4->e1\n' +            'cond3(no)->op5\n' +            'op5->e1\n' +            'e1->op6\n' )
    );
});

it('13 - chart with if inside if, outer if is false, inner is true and else-if is true', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'function foo(x, y, z){\n' +
        '    let a = x;\n' +        '    let b = y;\n' +        '    let c = 0;\n' +        '    \n' +        '    if (b < z) {\n' +        '        c = c + 5;\n' +        '        if(a < b){\n' +        '               c = x;\n' +        '               a++;\n' +        '        }\n' +        '    } else if (b < 100) {\n' +        '        c = c + x + 5;\n' +        '    } else {\n' +        '        c = c + z + 5;\n' +        '    }\n' +        '    \n' +        '    return c;\n' +        '}'
        , '1, 3, -10');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op6=>operation: (9)\n' +            'return c|truePath\n' +            'op5=>operation: (8)\n' +            'c = c + z + 5\n' +
            '\n' +            'op4=>operation: (7)\n' +
            'c = c + x + 5\n' +            '|truePath\n' +
            'cond3=>condition: (6)\n' +            'b < 100|truePath\n' +            'op3=>operation: (5)\n' +            'c = x\n' +
            'a++\n' +            '\n' +            'e1=>end: ------\n' +            'cond2=>condition: (4)\n' +            'a < b\n' +
            'op2=>operation: (3)\n' +            'c = c + 5\n' +            '\n' +            'e1=>end: ------|truePath\n' +            'cond1=>condition: (2)\n' +            'b < z|truePath\n' +            'op1=>operation: (1)\n' +
            'a = x\n' +            'b = y\n' +            'c = 0\n' +            '|truePath\n' +            'op1->cond1\n' +            'cond1(yes)->op2\n' +            'op2->cond2\n' +            'cond2(yes)->op3\n' +            'op3->e1\n' +            'cond2(no)->e1\n' +            'e1->e1\n' +            'cond1(no)->cond3\n' +            'cond3(yes)->op4\n' +            'op4->e1\n' +            'cond3(no)->op5\n' +            'op5->e1\n' +            'e1->op6\n'
        )
    );
});

it('14 - chart with global increment', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'let g = 1;\n' +        'g++;\n' +        'g--;\n' +        'function foo(x, y, z){\n' +        '    let a = x + 1;\n' +        '    let b = a + y;\n' +        '    g++;\n' +        '    x--;\n' +        '    if (b < z + g) {\n' +        '        g--;\n' +        '        y++\n' +        '    }\n' +        '    \n' +        '    return x;\n' +        '}', '1, 3, 10');    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op3=>operation: (4)\n' +            'return x|truePath\n' +            'op2=>operation: (3)\n' +            'g--\n' +            'y++\n' +            '|truePath\n' +            'e1=>end: ------|truePath\n' +            'cond1=>condition: (2)\n' +            'b < z + g|truePath\n' +            'op1=>operation: (1)\n' +            'a = x + 1\n' +            'b = a + y\n' +            'g++\n' +            'x--\n' +            '|truePath\n' +            'op1->cond1\n' +            'cond1(yes)->op2\n' +            'op2->e1\n' +            'cond1(no)->e1\n' +            'e1->op3\n'
        )
    );
});

it('15 - chart with if/else and var dec in condition block', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'function foo(x, y, z){\n' +        '    let a = x + 1;\n' +        '    let b = a + y;\n' +
        '    x--;\n' +        '    if (b < z) {\n' +        '        y++\n' +        '    }else{' +        '        let c = 10 \n' +        '    }\n' +        '    \n' +        '    return x;\n' +        '}', '1, 2, 10');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op4=>operation: (5)\n' +
            'return x|truePath\n' +
            'op3=>operation: (4)\n' +
            'c = 10\n' +            '\n' +            'op2=>operation: (3)\n' +            'y++\n' +            '|truePath\n' +            'e1=>end: ------|truePath\n' +            'cond1=>condition: (2)\n' +            'b < z|truePath\n' +            'op1=>operation: (1)\n' +            'a = x + 1\n' +            'b = a + y\n' +            'x--\n' +            '|truePath\n' +            'op1->cond1\n' +            'cond1(yes)->op2\n' +            'op2->e1\n' +            'cond1(no)->op3\n' +            'op3->e1\n' +            'e1->op4\n'
        )
    );
});

it('16 - two ifs in a row and a vardec inside condition block', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'function foo(x, y, z, q){\n' +        '    if (1 < 2) {\n' +        '        let a = [1, [2,3,4], true];\n' +        '    }\n' +        '    let b = x;\n' +        '    if ( 5 < 2){\n' +        '        let a = 10;\n' +        '    }\n' +        '    return b;\n' +        '}',        '[1], "2", true, [1, [2,3,4], true]');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op4=>operation: (6)\n' +            'return b|truePath\n' +            'op3=>operation: (5)\n' +            'a = 10\n' +            '\n' +            'e2=>end: ------|truePath\n' +            'cond2=>condition: (4)\n' +            '5 < 2|truePath\n' +            'op2=>operation: (3)\n' +            'b = x\n' +            '|truePath\n' +            'op1=>operation: (2)\n' +            'a = [1, [2,3,4], true]\n' +            '|truePath\n' +            'e1=>end: ------|truePath\n' +            'cond1=>condition: (1)\n' +            '1 < 2|truePath\n' +            'cond1(yes)->op1\n' +            'op1->e1\n' +            'cond1(no)->e1\n' +            'e1->op2\n' +            'op2->cond2\n' +            'cond2(yes)->op3\n' +            'op3->e2\n' +            'cond2(no)->e2\n' +            'e2->op4\n'
        )
    );
});

it('17 - if inside else-if and some array games', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'let g = [1, 2, 3];' +        'function foo(x, y, z){\n' +        '    let a = x[0] + 1 + g[1];\n' +        '    let b = [a, y, 5];\n' +        '    let c = 0 \n' +        '    let c = b[2] + c + (5 * 3 * c) + c;\n' +        '    \n' +        '    if (1 < -2) {\n' +        '        c = c + 5;\n' +        '    } else if (4 < 3 * 2) {\n' +        '        c = c + x + 5;\n' +        '        if( 3 < 10){\n' +        '              a = 10;\n' +        '        }\n' +
        '    } else {\n' +        '        c = c + z + 5;\n' +        '    }\n' +        '    \n' +        '    return c;\n' +
        '}',
        '[1], 3, true');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op6=>operation: (9)\n' +            'return c|truePath\n' +            'op5=>operation: (8)\n' +          'c = c + z + 5\n' +
            '\n' +            'op4=>operation: (7)\n' +            'a = 10\n' +            '|truePath\n' +            'e1=>end: ------|truePath\n' +            'cond3=>condition: (6)\n' +            '3 < 10|truePath\n' +            'op3=>operation: (5)\n' +
            'c = c + x + 5\n' +            '|truePath\n' +
            'cond2=>condition: (4)\n' +            '4 < 3 * 2|truePath\n' +            'op2=>operation: (3)\n' +           'c = c + 5\n' +            '\n' +            'e1=>end: ------|truePath\n' +            'cond1=>condition: (2)\n' +            '1 < -2|truePath\n' +            'op1=>operation: (1)\n' +            'a = x[0] + 1 + g[1]\n' +            'b = [a, y, 5]\n' +           'c = 0\n' +            'c = b[2] + c + (5 * 3 * c) + c\n' +
            '|truePath\n' +           'op1->cond1\n' +            'cond1(yes)->op2\n' +            'op2->e1\n' +           'cond1(no)->cond2\n' +
            'cond2(yes)->op3\n' +            'op3->cond3\n' +            'cond3(yes)->op4\n' +            'op4->e1\n' +           'cond3(no)->e1\n' +
            'e1->e1\n' +            'cond2(no)->op5\n' +            'op5->e1\n' +            'e1->op6\n' )
    );
});

it('18 - chart with else if -> else if and more global and array games', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'let g = [1, 2, 3];' +        'let g1 = g[2] * 3;' +        'function foo(x, y, z){\n' +        '    let a = x;\n' +        '    let b = y;\n' +        '    let c = g[1]; \n' +        '    let d = 0; \n' +        '    if (1 + y[0] < c + g[0]) {\n' +        '        c = c + 5;\n' +        '    } else if (4 < d * 3 - g[0]) {\n' +        '        c = c + x + 5;\n' +        '    } else if( a > b){\n' +        '        c = c + z + 5;\n' +        '    }\n' +        '    \n' +        '    return c;\n' +
        '}',
        '1, [2], 3');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op5=>operation: (8)\n' +
            'return c|truePath\n' +
            'op4=>operation: (7)\n' +
            'c = c + z + 5\n' +            '\n' +            'cond3=>condition: (6)\n' +            'a > b|truePath\n' +            'op3=>operation: (5)\n' +            'c = c + x + 5\n' +            '\n' +            'cond2=>condition: (4)\n' +            '4 < d * 3 - g[0]|truePath\n' +            'op2=>operation: (3)\n' +            'c = c + 5\n' +            '\n' +            'e1=>end: ------|truePath\n' +            'cond1=>condition: (2)\n' +            '1 + y[0] < c + g[0]|truePath\n' +            'op1=>operation: (1)\n' +            'a = x\n' +            'b = y\n' +            'c = g[1]\n' +            'd = 0\n' +            '|truePath\n' +            'op1->cond1\n' +            'cond1(yes)->op2\n' +            'op2->e1\n' +            'cond1(no)->cond2\n' +            'cond2(yes)->op3\n' +            'op3->e1\n' +            'cond2(no)->cond3\n' +            'cond3(yes)->op4\n' +            'op4->e1\n' +            'cond3(no)->e1\n' +            'e1->op5\n'
        )
    );
});

it('19 - array games ', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'let g = 1 + 3;' +        'let g1 = g[2] * 3;' +        'function foo(x, y, z){\n' +        '    let a = x;\n' +        '    let b = y;\n' +        '    if (g < a) {\n' +        '        b = b + 5;\n' +        '    }\n' +        '    return c;\n' +
        '}',
        '1, [2], 3');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op3=>operation: (4)\n' +
            'return c|truePath\n' +
            'op2=>operation: (3)\n' +
            'b = b + 5\n' +
            '\n' +
            'e1=>end: ------|truePath\n' +            'cond1=>condition: (2)\n' +            'g < a|truePath\n' +            'op1=>operation: (1)\n' +            'a = x\n' +            'b = y\n' +            '|truePath\n' +            'op1->cond1\n' +            'cond1(yes)->op2\n' +            'op2->e1\n' +            'cond1(no)->e1\n' +            'e1->op3\n'
        )
    );
});

it('20 - monster func, while with if / else if/ else and then if/else if inside else', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'function foo(x,y,z){\n' +        '     let a= x + 1;\n' +        '     let b = a + y;\n' +        '     let c = 0;\n' +        '     while(c==0){\n' +        '           if (b>z){\n' +        '                 c = c +5;\n' +        '           }\n' +        '           else if(b>z*2){\n' +        '                c = c+x+5;\n' +        '           }\n' +        '           else{\n' +        '               c = c + z +5;\n' +        '               if(c==2){\n' +        '                     c=5;\n' +        '               }\n' +        '               else if(c==5){\n' +        '                       c=8;\n' +        '               }\n' +        '           }\n' +        '         z=c;\n' +        '    }\n' +        '    return c;\n' +        '}',
        '0,0,0');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'op9=>operation: (14)\n' +            'return c|truePath\n' +            'op8=>operation: (13)\n' +            'z = c\n' +            '\n' +            'op7=>operation: (12)\n' +            'c = 8\n' +            '|truePath\n' +            'cond5=>condition: (11)\n' +            'c==5|truePath\n' +            'op6=>operation: (10)\n' +            'c = 5\n' +            '\n' +            'e1=>end: ------\n' +            'cond4=>condition: (9)\n' +            'c==2\n' +            'op5=>operation: (8)\n' +            'c = c + z + 5\n' +            '\n' +            'op4=>operation: (7)\n' +            'c = c + x + 5\n' +            '\n' +            'cond3=>condition: (6)\n' +
            'b>z*2\n' +            'op3=>operation: (5)\n' +            'c = c + 5\n' +            '\n' +            'e1=>end: ------\n' +            'cond2=>condition: (4)\n' +            'b>z\n' +            'cond1=>condition: (3)\n' +            'c==0|truePath\n' +            'op2=>operation: (2)\n' +            'NULL|truePath\n' +            'op1=>operation: (1)\n' +            'a = x + 1\n' +            'b = a + y\n' +            'c = 0\n' +            '|truePath\n' +            'op1->op2\n' +            'op2->cond1\n' +            'cond1(yes)->cond2\n' +            'cond2(yes)->op3\n' +            'op3->e1\n' +            'cond2(no)->cond3\n' +            'cond3(yes)->op4\n' +            'op4->e1\n' +            'cond3(no)->op5\n' +            'op5->cond4\n' +            'cond4(yes)->op6\n' +            'op6->e1\n' +            'cond4(no)->cond5\n' +            'cond5(yes)->op7\n' +           'op7->e1\n' +            'cond5(no)->e1\n' +            'e1->e1\n' +            'e1->op8\n' +            'op8->op2\n' +            'cond1(no)->op9\n'
        )
    );
});