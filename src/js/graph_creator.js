import * as esprima from 'esprima';
import * as flowchart from 'flowchart.js';


function create_flow_chart(input_code, user_input_args){

    let code =
        'e=>end: End\n' +

        'dec=>operation: a = x + 1 \n b = a + x \n c = 0|truePath\n' +
        'ass1=>operation: c = c + 5\n' +
        'ass2=>operation: c = c + z + 5\n' +
        'ass3=>operation: c = c + x + 5|truePath\n' +
        'ret=>operation: return c|truePath\n' +
        'cond1=>condition: b < z|truePath\n' +
        'cond2=>condition: b < z*2|truePath\n' +
        '\n' +
        'dec->cond1\n' +
        'cond1(yes, right)->ass1->e\n' +
        'cond1(no, down)->cond2\n' +
        'cond2(no)->ass2->e\n' +
        'cond2(yes, bottom)->ass3->e\n' +
        'e->ret\n' +
        '\n' +
        '\n' +
        '\n' +
        'dec@>cond1({"stroke":"Green")@>cond2({"stroke":"Green")@>ass3({"stroke":"Green")@>e({"stroke":"Green")@>ret({"stroke":"Green")' +
        '\n';

    let chart = flowchart.parse(code);
    let settings =
        {
            'x': 100,
            'y': 0,
            'line-width': 4,
            'line-length': 20,
            'text-margin': 15,
            'font-size': 14,
            'font-color': 'black',
            'line-color': 'black',
            'element-color': 'black',
            'fill': '',
            'yes-text': 'T',
            'no-text': 'N',
            'arrow-end': 'block',
            'scale': 1.1,
            // style symbol types
            'symbols': {
                'start': {
                    'font-color': 'black',
                    'element-color': 'green',
                    'fill': 'white',
                    'font-size': '0' //Makes the text disappear
                },
                'end': {
                    'class': 'end-element',
                    'fill': '#A8D18D',
                    'font-size': '0' //Makes the text disappear
                }
            },
            // even flowstate support ;-)
            'flowstate': {
                'past': {'fill': '#CCCCCC', 'font-size': 12},
                'truePath': {'fill': '#A8D18D', 'font-size': 13},
                'current': {'fill': 'yellow', 'font-color': 'red', 'font-weight': 'bold'},
                'approved': {'fill': '#58C4A3', 'font-size': 12, 'yes-text': 'APPROVED', 'no-text': 'REJECTED'},
            }
        };

    return [chart, settings];
}

export{create_flow_chart};