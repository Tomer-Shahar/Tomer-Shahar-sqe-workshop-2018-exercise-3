import assert from 'assert';
import * as gc from '../src/js/graph_creator';
import * as esprima from 'esprima';

it('1 - adding a new edge', ()=> {
    gc.clear_memory();
    gc.add_edge_to_flow_chart('dec', 'cond1');
    let flow_code = gc.get_flow_code();
    assert.equal(
        flow_code,
        'dec->cond1\n'
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
        JSON.stringify('dec1=>operation: (1)\na = 5|truePath\n' +
            'ret=>operation: (2)\nreturn a + x|truePath\n' +
            'dec1->ret\n'
        )
    );
});

it('8 - create a harder flow chart', ()=> {
    gc.clear_memory();
    let chart = gc.create_flow_chart(
        'function foo(x){\n' +
        '    let a, b = 4;\n' +
        '    let c = 3;\n' +
        '    a = b + c\n' +
        '    if(a < x){\n' +
        '        a = 10\n' +
        '    }\n' +
        '    return a;\n' +
        '}', '20');
    assert.equal(
        JSON.stringify(chart),
        JSON.stringify(
            'dec1=>operation: (1)\na = null\nb = 4\nc = 3\na = b + c|truePath\n' +
            'cond1=>condition: (2)\na < x|truePath\n'+
            'op1=>operation: (3)\na = 10|truePath\n' +
            'e1=>end: ------|truePath\n' +
            'ret=>operation: (4)\n' +
            'return a + x|truePath\n' +
            'dec1->ret\n'
        )
    );
});