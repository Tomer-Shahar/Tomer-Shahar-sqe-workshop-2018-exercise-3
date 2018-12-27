import $ from 'jquery';
import {create_flow_chart, get_settings} from './graph_creator';
import * as flowchart from 'flowchart.js';



$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let input_func = $('#codePlaceholder').val();
        let user_input_arguments = $('#inputArguments').val();

        input_func =
        'function foo(x, y, z){\n' +
            '    let a = x + 1;\n' +
            '    let b = a + y;\n' +
            '    let c = 0;\n' +
            '    \n' +
            '    if (b < z) {\n' +
            '        c = c + 5;\n' +
            '        for(let i=0; i < c; i++){\n' +
            '            a = a + 1;\n' +
            '       }\n' +
            '    } else if (b < z * 2) {\n' +
            '        c = c + x + 5;\n' +
            '    }\n' +
            ' \n' +
            '    return c;\n' +
            '}';

        $('#diagram').text('');

        user_input_arguments = '1,2,10';

        if(input_func !== ''){
            let chart = create_flow_chart(input_func, user_input_arguments);
            let settings = get_settings();
            let diagram = flowchart.parse(chart);
            diagram.drawSVG('diagram', settings);
        }


    });
});
