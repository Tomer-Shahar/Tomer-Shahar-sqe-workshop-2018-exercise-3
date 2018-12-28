import $ from 'jquery';
import {create_flow_chart} from './graph_creator';
import * as flowchart from 'flowchart.js';



$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let input_func = $('#codePlaceholder').val();
        let user_input_arguments = $('#inputArguments').val();

        input_func =
            'let g = 5;\n' +
            'function foo(x,y,z){\n' +
            '     let a = x;\n' +
            '     let b = y;\n' +
            '     g++;\n' +
            '     g--;\n' +
            '     if(a<b){\n' +
            '          x++;\n' +
            '          z--;\n' +
            '     } else{\n' +
            '            let c = a + b;\n' +
            '     }\n' +
            '     if( 2 < 1){\n' +
            '          a++;\n' +
            '     } else if(1 < 2){\n' +
            '           if(a < 100){\n' +
            '                a = a + 5;\n' +
            '           }\n' +
            '     }\n' +
            '     return a + c;\n' +
            '}';

        $('#diagram').text('');

        user_input_arguments = '1, 2, 10';

        if(input_func !== ''){
            let chart = create_flow_chart(input_func, user_input_arguments);
            let settings = get_settings();
            let diagram = flowchart.parse(chart);
            diagram.drawSVG('diagram', settings);
        }


    });
});

function get_settings(){
    return {
        'x': 100, 'y': 0,
        'line-width': 4, 'line-length': 70,
        'text-margin': 15,
        'font-size': 14, 'font-color': 'black',
        'line-color': 'black', 'element-color': 'black',
        'fill': '',
        'yes-text': 'T', 'no-text': 'F',
        'arrow-end': 'block', 'scale': 1.1,
        'symbols': { // style symbol types
            'start': { 'font-color': 'black', 'element-color': 'green', 'fill': 'white', 'font-size': '0' },
            'end': { 'class': 'end-element', 'fill': '#A8D18D', 'font-size': '20', 'font-color': '#A8D18D'}
        },
        'flowstate': { 'truePath': {'fill': '#A8D18D', 'font-size': 13} }
    };
}
