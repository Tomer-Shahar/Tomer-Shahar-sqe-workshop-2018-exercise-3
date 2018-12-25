import assert from 'assert';
import * as gc from '../src/js/graph_creator';

it('1 - Extracts function paramaters correctly', ()=> {
    assert.equal(JSON.stringify(funcParser.extract_arg_names('let a; let b,c; function foo(x,y, z){})')),
        JSON.stringify(['x','y','z'])
    );
});