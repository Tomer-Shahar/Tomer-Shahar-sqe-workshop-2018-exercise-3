import assert from 'assert';
import {parseCode} from '../src/js/code-analyzer';


it('1.1 - The javascript parser is parsing an empty function correctly', () => {
    assert.equal(
        JSON.stringify(parseCode('')[0]),
        '{"type":"Program","body":[],"sourceType":"script","loc":{"start":{"line":0,"column":0},"end":{"line":0,"column":0}}}'
    );
});

it('1.2 - The javascript parser is parsing a simple variable declaration correctly', () => {
    assert.equal(
        JSON.stringify(parseCode('let a=1;')[0]),
        '{"type":"Program","body":[{"type":"VariableDeclaration","declarations":[{"type":"VariableDeclarator","id":{"type":"Identifier","name":"a","loc":{"start":{"line":1,"column":4},"end":{"line":1,"column":5}}},"init":{"type":"Literal","value":1,"raw":"1","loc":{"start":{"line":1,"column":6},"end":{"line":1,"column":7}}},"loc":{"start":{"line":1,"column":4},"end":{"line":1,"column":7}}}],"kind":"let","loc":{"start":{"line":1,"column":0},"end":{"line":1,"column":8}}}],"sourceType":"script","loc":{"start":{"line":1,"column":0},"end":{"line":1,"column":8}}}');
});

it('2 - The generated table\' is producing an empty table correctly', () => {
    assert.equal(
        JSON.stringify(parseCode('')[1]),JSON.stringify([]));
});

it('3 - is parsing a simple variable declaration correctly', () => {
    assert.equal(
        JSON.stringify(parseCode('let a = 1;')[1]),JSON.stringify([{
            'Line':1,
            'Type': 'variable declaration',
            'Name': 'a',
            'Condition':'',
            'Value': '1'
        }])
    );
});

it('4 - The generated table is parsing a function declaration correctly', () => {
    assert.equal(
        JSON.stringify(parseCode('function binarySearch(X, V, n){}')[1]),JSON.stringify([
            { 'Line':1, 'Type': 'function declaration','Name': 'binarySearch', 'Condition':'', 'Value': ''},
            { 'Line':1, 'Type': 'variable declaration','Name': 'X', 'Condition':'', 'Value': ''},
            { 'Line':1, 'Type': 'variable declaration','Name': 'V', 'Condition':'', 'Value': ''},
            { 'Line':1, 'Type': 'variable declaration','Name': 'n', 'Condition':'', 'Value': ''}
        ])
    );
});

it('5 - The generated table is parsing variable declarations correctly', () => {
    assert.equal(
        JSON.stringify(parseCode('let low, high, mid;\n' +
                                 'low = 0;\n' +
                                 'high = n-1;')[1]),JSON.stringify([
            { 'Line':1, 'Type': 'variable declaration',  'Name': 'low',  'Condition':'', 'Value': 'null'},
            { 'Line':1, 'Type': 'variable declaration',  'Name': 'high', 'Condition':'', 'Value': 'null'},
            { 'Line':1, 'Type': 'variable declaration',  'Name': 'mid',  'Condition':'', 'Value': 'null'},
            { 'Line':2, 'Type': 'assignment expression', 'Name': 'low',  'Condition':'', 'Value': '0'},
            { 'Line':3, 'Type': 'assignment expression', 'Name': 'high', 'Condition':'', 'Value': 'n-1'}
        ])
    );
});

it('6 - The generated table is parsing a while loop correctly', () => {
    assert.equal(
        JSON.stringify(parseCode('while (low <= high){\n' +
                                 'mid = (low + high)/2;\n' +
                                 '}')[1]),JSON.stringify([
            { 'Line':1, 'Type': 'while statement',       'Name': '',    'Condition':'low <= high', 'Value': ''},
            { 'Line':2, 'Type': 'assignment expression', 'Name': 'mid', 'Condition':'',            'Value': '(low + high)/2'}
        ])
    );
});

it('7 - The generated table is parsing a if-else statement correctly', () => {
    assert.equal(
        JSON.stringify(parseCode('let x=5;\n' +
                                 'if(x>9)\n' +
                                 '   x--;\n' +
                                 'let y = x-1;')[1]),JSON.stringify([
            { 'Line':1, 'Type': 'variable declaration', 'Name': 'x', 'Condition':'',    'Value': '5'},
            { 'Line':2, 'Type': 'else if statement',    'Name': '',  'Condition':'x>9', 'Value': ''},
            { 'Line':3, 'Type': 'update statement',     'Name': 'x', 'Condition':'' ,   'Value': '--'},
            { 'Line':4, 'Type': 'variable declaration', 'Name': 'y', 'Condition':'' ,   'Value': 'x-1'}
        ])
    );
});

it('8 - The generated table is parsing a for loop correctly', () => {
    assert.equal(
        JSON.stringify(parseCode('function series(x){\n' +
                                 '   let y=0;\n' +
                                 '   for(let i=0; i < x; i++){\n' +
                                 '      y = y+i;\n' +
                                 '   }\n' +
                                 '   return y;}')[1]),JSON.stringify([
            { 'Line':1, 'Type': 'function declaration',  'Name': 'series', 'Condition':'',                  'Value': ''},
            { 'Line':1, 'Type': 'variable declaration',  'Name': 'x',      'Condition':'',                  'Value': ''},
            { 'Line':2, 'Type': 'variable declaration',  'Name': 'y',      'Condition':'',                  'Value': '0'},
            { 'Line':3, 'Type': 'ForStatement',          'Name': '',       'Condition':'let i=0; i < x; i++', 'Value': ''},
            { 'Line':4, 'Type': 'assignment expression', 'Name': 'y',      'Condition':'',                  'Value': 'y+i'},
            { 'Line':6, 'Type': 'return statement',      'Name': '',       'Condition':'',                  'Value': 'y'}
        ])
    );
});

it('9 - The generated table is parsing a more complex function correctly', () => {
    assert.equal(
        JSON.stringify(parseCode('function binarySearch(X, V, n){\n' + '    let low, high, mid;\n' + '    low = 0;\n' + '    high = n - 1;\n' + '    while (low <= high) {\n' + '        mid = (low + high)/2;\n' + '        if (X < V[mid])\n' +  '            high = mid - 1;\n' + '        else if (X > V[mid])\n' + '            low = mid + 1;\n' + '        else\n' +  '            return mid;\n' + '    }\n' + '    return -1;\n' + '}'
        )[1]),JSON.stringify([
            { 'Line':1,  'Type': 'function declaration',  'Name': 'binarySearch', 'Condition':'',            'Value': ''},  { 'Line':1,  'Type': 'variable declaration',  'Name': 'X',            'Condition':'',            'Value': ''},
            { 'Line':1,  'Type': 'variable declaration',  'Name': 'V',            'Condition':'',            'Value': ''}, { 'Line':1,  'Type': 'variable declaration',  'Name': 'n',            'Condition':'',            'Value': ''},
            { 'Line':2,  'Type': 'variable declaration',  'Name': 'low',          'Condition':'',            'Value': 'null'}, { 'Line':2,  'Type': 'variable declaration',  'Name': 'high',         'Condition':'',            'Value': 'null'},
            { 'Line':2,  'Type': 'variable declaration',  'Name': 'mid',          'Condition':'',            'Value': 'null'}, { 'Line':3,  'Type': 'assignment expression', 'Name': 'low',          'Condition':'',            'Value': '0'},
            { 'Line':4,  'Type': 'assignment expression', 'Name': 'high',         'Condition':'',            'Value': 'n - 1'},  { 'Line':5,  'Type': 'while statement',       'Name': '',             'Condition':'low <= high', 'Value': ''}, { 'Line':6,  'Type': 'assignment expression', 'Name': 'mid',          'Condition':'',            'Value': '(low + high)/2'},
            { 'Line':7,  'Type': 'else if statement',     'Name': '',             'Condition':'X < V[mid]',  'Value': ''},  { 'Line':8,  'Type': 'assignment expression', 'Name': 'high',         'Condition':'',            'Value': 'mid - 1'},
            { 'Line':9,  'Type': 'else if statement',     'Name': '',             'Condition':'X > V[mid]',  'Value': ''}, { 'Line':10, 'Type': 'assignment expression', 'Name': 'low',          'Condition':'',            'Value': 'mid + 1'},
            { 'Line':12, 'Type': 'return statement',      'Name': '',             'Condition':'',            'Value': 'mid'}, { 'Line':14, 'Type': 'return statement',      'Name': '',             'Condition':'',            'Value': '-1'}
        ])
    );
});

it('10  - The generated table is parsing a more complex function correctly', () => {
    assert.equal(
        JSON.stringify(parseCode('function map(f, a) {\n' +
            '  var result = [];\n' +
            '  var i;\n' +
            '  for (i = 0; i != a.length; i++)\n' +
            '    result[i] = f(a[i]);\n' +
            '  return result;\n' +
            '}')[1]),JSON.stringify([
            { 'Line':1,  'Type': 'function declaration',  'Name': 'map',       'Condition':'',                          'Value': ''},
            { 'Line':1,  'Type': 'variable declaration',  'Name': 'f',         'Condition':'',                          'Value': ''},
            { 'Line':1,  'Type': 'variable declaration',  'Name': 'a',         'Condition':'',                          'Value': ''},
            { 'Line':2,  'Type': 'variable declaration',  'Name': 'result',    'Condition':'',                          'Value': '[]'},
            { 'Line':3,  'Type': 'variable declaration',  'Name': 'i',         'Condition':'',                          'Value': 'null'},
            { 'Line':4,  'Type': 'ForStatement',          'Name': '',          'Condition':'i = 0; i != a.length; i++', 'Value': ''},
            { 'Line':5,  'Type': 'assignment expression', 'Name': 'result[i]', 'Condition':'',                          'Value': 'f(a[i])'},
            { 'Line':6,  'Type': 'return statement',      'Name': '',          'Condition':'',                          'Value': 'result'}
        ])
    );
});

it('11  - The code analyzer wont crash with expressions that dont have a function', () => {
    assert.equal(
        JSON.stringify(parseCode('try {\n' +
            '    adddlert("Welcome guest!");\n' +
            '}\n' +
            'catch(err) {\n' +
            '    document.getElementById("demo").innerHTML = err.message;\n' +
            '}')[1]),JSON.stringify([])
    );
});

it('11  - The code analyzer wont crash with expressions that dont have a function', () => {
    assert.equal(
        JSON.stringify(parseCode('try {\n' +
            '    adddlert("Welcome guest!");\n' +
            '}\n' +
            'catch(err) {\n' +
            '    document.getElementById("demo").innerHTML = err.message;\n' +
            '}')[1]),JSON.stringify([])
    );
});

it('11  - The code analyzer wont crash with expressions that dont have a function', () => {
    assert.equal(
        JSON.stringify(parseCode('try {\n' +
            '    adddlert("Welcome guest!");\n' +
            '}\n' +
            'catch(err) {\n' +
            '    document.getElementById("demo").innerHTML = err.message;\n' +
            '}')[1]),JSON.stringify([])
    );
});